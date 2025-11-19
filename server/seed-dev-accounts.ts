import bcrypt from "bcryptjs";
import { db } from "./db";
import { users } from "@shared/schema";

async function createDevAccounts() {
  const password = "password123"; // All accounts use this password for development
  const hashedPassword = await bcrypt.hash(password, 12);

  const devAccounts = [
    {
      username: "admin",
      email: "admin@rentflow.com",
      passwordHash: hashedPassword,
      firstName: "System",
      lastName: "Administrator",
      role: "super_admin" as const,
      isActive: true,
      isApproved: true,
    },
    {
      username: "landlord",
      email: "landlord@rentflow.com",
      passwordHash: hashedPassword,
      firstName: "John",
      lastName: "Landlord",
      role: "landlord" as const,
      isActive: true,
      isApproved: true,
    },
    {
      username: "agent",
      email: "agent@rentflow.com",
      passwordHash: hashedPassword,
      firstName: "Jane",
      lastName: "Agent",
      role: "agent" as const,
      isActive: true,
      isApproved: true,
    },
    {
      username: "tenant",
      email: "tenant@rentflow.com",
      passwordHash: hashedPassword,
      firstName: "Bob",
      lastName: "Tenant",
      role: "tenant" as const,
      isActive: true,
      isApproved: true,
    },
  ];

  try {
    for (const account of devAccounts) {
      try {
        await db.insert(users).values(account);
        console.log(`✓ Created dev account: ${account.username} (${account.role})`);
      } catch (error: any) {
        if (error.code === "23505") { // unique constraint violation
          console.log(`  Account ${account.username} already exists, skipping...`);
        } else {
          throw error;
        }
      }
    }
    
    console.log("\n🚀 Development accounts setup complete!");
    console.log("Password for all accounts: password123");
    console.log("\nAvailable accounts:");
    devAccounts.forEach(account => {
      console.log(`  - ${account.username} (${account.role})`);
    });
  } catch (error) {
    console.error("Error creating dev accounts:", error);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  createDevAccounts().then(() => process.exit(0));
}

export { createDevAccounts };