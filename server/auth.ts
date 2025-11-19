import bcrypt from "bcryptjs";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";
import type { User } from "@shared/schema";

// Session configuration
export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  
  return session({
    secret: process.env.SESSION_SECRET || "dev-session-secret-change-in-production",
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: sessionTtl,
    },
  });
}

// Password hashing utilities
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Authentication middleware
export const isAuthenticated: RequestHandler = async (req, res, next) => {
  if (!req.session?.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const user = await storage.getUser(req.session.userId);
    if (!user || !user.isActive || !user.isApproved) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    console.error("Error in authentication middleware:", error);
    return res.status(401).json({ message: "Unauthorized" });
  }
};

// Role-based authorization middleware
export function requireRole(...allowedRoles: Array<"super_admin" | "landlord" | "property_manager" | "agent" | "tenant">): RequestHandler {
  return (req, res, next) => {
    const user = req.user as User;
    
    if (!user || !allowedRoles.includes(user.role)) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }
    
    next();
  };
}

// Setup authentication routes
export function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());

  // Login endpoint
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }

      // Find user by username or email
      const user = await storage.getUserByUsernameOrEmail(username);
      
      if (!user || !user.passwordHash) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Check if user is approved
      if (!user.isApproved) {
        return res.status(401).json({ message: "Account pending approval" });
      }

      // Check if user is active
      if (!user.isActive) {
        return res.status(401).json({ message: "Account is inactive" });
      }

      // Verify password
      const isValidPassword = await verifyPassword(password, user.passwordHash);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Set session
      req.session.userId = user.id;
      
      // Return user data (without password hash)
      const { passwordHash, ...userData } = user;
      res.json(userData);
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Logout endpoint for frontend (POST)
  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err: any) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ message: "Failed to logout" });
      }
      res.clearCookie("connect.sid");
      res.json({ message: "Logged out successfully" });
    });
  });

  // Logout endpoint for direct browser access (GET) - redirects to login
  app.get("/api/logout", (req, res) => {
    req.session.destroy((err: any) => {
      if (err) {
        console.error("Logout error:", err);
        return res.redirect("/?error=logout_failed");
      }
      res.clearCookie("connect.sid");
      res.redirect("/");
    });
  });

  // Get current user endpoint
  app.get("/api/auth/user", isAuthenticated, (req, res) => {
    const user = req.user as User;
    const { passwordHash, ...userData } = user;
    res.json(userData);
  });

  // Submit access request (for onboarding)
  app.post("/api/auth/request-access", async (req, res) => {
    try {
      const { email, firstName, lastName, phone, requestedRole, reason } = req.body;

      if (!email || !firstName || !lastName || !requestedRole) {
        return res.status(400).json({ 
          message: "Email, first name, last name, and requested role are required" 
        });
      }

      // Check if email already exists or has pending request
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "User with this email already exists" });
      }

      const existingRequest = await storage.getAccessRequestByEmail(email);
      if (existingRequest && existingRequest.status === "pending") {
        return res.status(400).json({ message: "Access request already pending for this email" });
      }

      // Create access request
      const accessRequest = await storage.createAccessRequest({
        email,
        firstName,
        lastName,
        phone,
        requestedRole,
        reason,
        status: "pending",
      });

      res.status(201).json({ 
        message: "Access request submitted successfully", 
        requestId: accessRequest.id 
      });
    } catch (error) {
      console.error("Access request error:", error);
      res.status(500).json({ message: "Failed to submit access request" });
    }
  });

  // Get pending access requests (admin only)
  app.get("/api/auth/access-requests", isAuthenticated, requireRole("super_admin", "landlord"), async (req, res) => {
    try {
      const requests = await storage.getPendingAccessRequests();
      res.json(requests);
    } catch (error) {
      console.error("Error fetching access requests:", error);
      res.status(500).json({ message: "Failed to fetch access requests" });
    }
  });

  // Approve/reject access request (admin only)
  app.post("/api/auth/access-requests/:id/review", isAuthenticated, requireRole("super_admin", "landlord"), async (req, res) => {
    try {
      const { id } = req.params;
      const { action, reviewNotes } = req.body; // action: 'approve' | 'reject'
      const reviewer = req.user as User;

      if (!action || !["approve", "reject"].includes(action)) {
        return res.status(400).json({ message: "Invalid action" });
      }

      const accessRequest = await storage.getAccessRequest(id);
      if (!accessRequest) {
        return res.status(404).json({ message: "Access request not found" });
      }

      if (accessRequest.status !== "pending") {
        return res.status(400).json({ message: "Access request already reviewed" });
      }

      if (action === "approve") {
        // Create user account
        const temporaryPassword = Math.random().toString(36).slice(-12);
        const passwordHash = await hashPassword(temporaryPassword);
        
        const newUser = await storage.createUser({
          username: accessRequest.email.split('@')[0], // Use email prefix as default username
          email: accessRequest.email,
          passwordHash,
          firstName: accessRequest.firstName,
          lastName: accessRequest.lastName,
          phone: accessRequest.phone,
          role: accessRequest.requestedRole,
          isActive: true,
          isApproved: true,
          approvedBy: reviewer.id,
          approvedAt: new Date(),
        });

        // Update access request
        await storage.updateAccessRequest(id, {
          status: "approved",
          reviewedBy: reviewer.id,
          reviewedAt: new Date(),
          reviewNotes,
        });

        res.json({ 
          message: "Access request approved and user created",
          userId: newUser.id,
          temporaryPassword // In production, this should be sent via email
        });
      } else {
        // Reject request
        await storage.updateAccessRequest(id, {
          status: "rejected",
          reviewedBy: reviewer.id,
          reviewedAt: new Date(),
          reviewNotes,
        });

        res.json({ message: "Access request rejected" });
      }
    } catch (error) {
      console.error("Error reviewing access request:", error);
      res.status(500).json({ message: "Failed to review access request" });
    }
  });
}

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
    interface Session {
      userId?: string;
    }
  }
}