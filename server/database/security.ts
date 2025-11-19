/**
 * Enterprise Database Security Module
 * Implements comprehensive security measures for database protection
 */

import { db } from "../db";
import { sql } from "drizzle-orm";
import { randomBytes, createHash, timingSafeEqual } from "crypto";
import { Request } from "express";

export interface SecurityConfig {
  enableRowLevelSecurity: boolean;
  enableAuditLogging: boolean;
  enableQueryRestrictions: boolean;
  enableDataEncryption: boolean;
  maxQueryComplexity: number;
  rateLimitConfig: {
    windowMs: number;
    maxRequests: number;
  };
}

export class DatabaseSecurity {
  private static instance: DatabaseSecurity;
  private config: SecurityConfig;
  private queryStats = new Map<string, { count: number; lastReset: number }>();

  private constructor(config: SecurityConfig) {
    this.config = config;
  }

  public static getInstance(config?: SecurityConfig): DatabaseSecurity {
    if (!DatabaseSecurity.instance) {
      const defaultConfig: SecurityConfig = {
        enableRowLevelSecurity: true,
        enableAuditLogging: true,
        enableQueryRestrictions: true,
        enableDataEncryption: true,
        maxQueryComplexity: 1000,
        rateLimitConfig: {
          windowMs: 60000, // 1 minute
          maxRequests: 100
        }
      };
      DatabaseSecurity.instance = new DatabaseSecurity(config || defaultConfig);
    }
    return DatabaseSecurity.instance;
  }

  /**
   * Initialize security policies
   */
  async initializeSecurity(): Promise<void> {
    try {
      if (this.config.enableRowLevelSecurity) {
        await this.setupRowLevelSecurity();
      }
      
      if (this.config.enableAuditLogging) {
        await this.setupAuditTriggers();
      }
      
      if (this.config.enableDataEncryption) {
        await this.setupDataEncryption();
      }
      
      await this.setupSecurityConstraints();
      await this.setupSecurityFunctions();
      
      console.log("✅ Database security initialized successfully");
    } catch (error) {
      console.error("❌ Failed to initialize database security:", error);
      throw error;
    }
  }

  /**
   * Setup Row Level Security (RLS) policies
   */
  private async setupRowLevelSecurity(): Promise<void> {
    try {
      // Enable RLS on sensitive tables
      const sensitiveTablePolicies = [
        {
          table: 'users',
          policies: [
            {
              name: 'users_own_data',
              type: 'ALL',
              condition: `id = current_setting('app.current_user_id')::uuid OR 
                         current_setting('app.user_role') IN ('super_admin', 'landlord')`
            },
            {
              name: 'users_view_tenants',
              type: 'SELECT',
              condition: `role = 'tenant' AND current_setting('app.user_role') IN ('landlord', 'property_manager', 'agent')`
            }
          ]
        },
        {
          table: 'payments',
          policies: [
            {
              name: 'payments_tenant_access',
              type: 'ALL',
              condition: `tenant_id = current_setting('app.current_user_id')::uuid`
            },
            {
              name: 'payments_landlord_access',
              type: 'ALL',
              condition: `current_setting('app.user_role') IN ('super_admin', 'landlord', 'property_manager')`
            }
          ]
        },
        {
          table: 'leases',
          policies: [
            {
              name: 'leases_tenant_access',
              type: 'ALL',
              condition: `tenant_id = current_setting('app.current_user_id')::uuid`
            },
            {
              name: 'leases_management_access',
              type: 'ALL',
              condition: `current_setting('app.user_role') IN ('super_admin', 'landlord', 'property_manager', 'agent')`
            }
          ]
        },
        {
          table: 'tenant_documents',
          policies: [
            {
              name: 'documents_owner_access',
              type: 'ALL',
              condition: `tenant_id = current_setting('app.current_user_id')::uuid OR 
                         current_setting('app.user_role') IN ('super_admin', 'landlord', 'property_manager')`
            }
          ]
        },
        {
          table: 'maintenance_requests',
          policies: [
            {
              name: 'maintenance_tenant_access',
              type: 'ALL',
              condition: `tenant_id = current_setting('app.current_user_id')::uuid`
            },
            {
              name: 'maintenance_staff_access',
              type: 'ALL',
              condition: `current_setting('app.user_role') IN ('super_admin', 'landlord', 'property_manager', 'agent') OR 
                         assigned_to = current_setting('app.current_user_id')::uuid`
            }
          ]
        }
      ];

      for (const tablePolicy of sensitiveTablePolicies) {
        // Enable RLS
        await db.execute(sql.raw(`ALTER TABLE ${tablePolicy.table} ENABLE ROW LEVEL SECURITY;`));
        
        // Drop existing policies to avoid conflicts
        try {
          const existingPolicies = await db.execute(sql.raw(`
            SELECT policyname FROM pg_policies WHERE tablename = '${tablePolicy.table}';
          `));
          
          for (const policy of (existingPolicies.rows || [])) {
            await db.execute(sql.raw(`DROP POLICY IF EXISTS ${policy.policyname} ON ${tablePolicy.table};`));
          }
        } catch (e) {
          // Ignore errors when dropping non-existent policies
        }

        // Create new policies
        for (const policy of tablePolicy.policies) {
          await db.execute(sql.raw(`
            CREATE POLICY ${policy.name} ON ${tablePolicy.table}
            FOR ${policy.type} 
            USING (${policy.condition});
          `));
        }
      }

      console.log("✅ Row Level Security policies configured");
    } catch (error) {
      console.error("❌ Failed to setup Row Level Security:", error);
      throw error;
    }
  }

  /**
   * Setup comprehensive audit triggers for all sensitive operations
   */
  private async setupAuditTriggers(): Promise<void> {
    try {
      // Create audit trigger for sensitive tables
      const auditTables = [
        'users', 'properties', 'units', 'leases', 'payments', 
        'tenant_deposits', 'tenant_documents', 'maintenance_requests'
      ];

      for (const tableName of auditTables) {
        // Drop existing trigger if it exists
        await db.execute(sql.raw(`
          DROP TRIGGER IF EXISTS ${tableName}_audit_trigger ON ${tableName};
        `));

        // Create audit trigger
        await db.execute(sql.raw(`
          CREATE TRIGGER ${tableName}_audit_trigger
          AFTER INSERT OR UPDATE OR DELETE ON ${tableName}
          FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
        `));
      }

      console.log("✅ Audit triggers configured for sensitive tables");
    } catch (error) {
      console.error("❌ Failed to setup audit triggers:", error);
      throw error;
    }
  }

  /**
   * Setup data encryption for sensitive fields
   */
  private async setupDataEncryption(): Promise<void> {
    try {
      // Create encryption functions
      await db.execute(sql.raw(`
        CREATE EXTENSION IF NOT EXISTS pgcrypto;
      `));

      // Create encrypted data functions
      await db.execute(sql.raw(`
        CREATE OR REPLACE FUNCTION encrypt_sensitive_data(data TEXT, key TEXT DEFAULT 'default_encryption_key')
        RETURNS TEXT AS $$
        BEGIN
          RETURN encode(encrypt(data::bytea, key::bytea, 'aes'), 'base64');
        END;
        $$ LANGUAGE plpgsql;
      `));

      await db.execute(sql.raw(`
        CREATE OR REPLACE FUNCTION decrypt_sensitive_data(encrypted_data TEXT, key TEXT DEFAULT 'default_encryption_key')
        RETURNS TEXT AS $$
        BEGIN
          RETURN convert_from(decrypt(decode(encrypted_data, 'base64'), key::bytea, 'aes'), 'UTF8');
        END;
        $$ LANGUAGE plpgsql;
      `));

      console.log("✅ Data encryption functions configured");
    } catch (error) {
      console.error("❌ Failed to setup data encryption:", error);
      throw error;
    }
  }

  /**
   * Setup additional security constraints
   */
  private async setupSecurityConstraints(): Promise<void> {
    try {
      // Add data validation constraints if they don't exist
      const constraints = [
        {
          table: 'users',
          constraint: 'chk_password_strength',
          condition: `LENGTH(password_hash) >= 60` // bcrypt hash length
        },
        {
          table: 'payments',
          constraint: 'chk_payment_amount_range',
          condition: `amount > 0 AND amount <= 10000000` // Reasonable upper limit
        },
        {
          table: 'leases',
          constraint: 'chk_lease_duration',
          condition: `start_date < COALESCE(end_date, start_date + INTERVAL '10 years')`
        }
      ];

      for (const { table, constraint, condition } of constraints) {
        try {
          await db.execute(sql.raw(`
            ALTER TABLE ${table} DROP CONSTRAINT IF EXISTS ${constraint};
          `));
          await db.execute(sql.raw(`
            ALTER TABLE ${table} ADD CONSTRAINT ${constraint} CHECK (${condition});
          `));
        } catch (e) {
          console.warn(`Warning: Could not add constraint ${constraint} to ${table}`);
        }
      }

      console.log("✅ Security constraints configured");
    } catch (error) {
      console.error("❌ Failed to setup security constraints:", error);
      throw error;
    }
  }

  /**
   * Setup security utility functions
   */
  private async setupSecurityFunctions(): Promise<void> {
    try {
      // Function to validate user permissions
      await db.execute(sql.raw(`
        CREATE OR REPLACE FUNCTION check_user_permission(user_id UUID, required_role TEXT)
        RETURNS BOOLEAN AS $$
        DECLARE
          user_role TEXT;
        BEGIN
          SELECT role INTO user_role FROM users WHERE id = user_id AND is_active = true;
          
          IF user_role IS NULL THEN
            RETURN FALSE;
          END IF;
          
          -- Role hierarchy: super_admin > landlord > property_manager > agent > tenant
          CASE required_role
            WHEN 'tenant' THEN
              RETURN user_role IN ('tenant', 'agent', 'property_manager', 'landlord', 'super_admin');
            WHEN 'agent' THEN
              RETURN user_role IN ('agent', 'property_manager', 'landlord', 'super_admin');
            WHEN 'property_manager' THEN
              RETURN user_role IN ('property_manager', 'landlord', 'super_admin');
            WHEN 'landlord' THEN
              RETURN user_role IN ('landlord', 'super_admin');
            WHEN 'super_admin' THEN
              RETURN user_role = 'super_admin';
            ELSE
              RETURN FALSE;
          END CASE;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
      `));

      // Function to log security events
      await db.execute(sql.raw(`
        CREATE OR REPLACE FUNCTION log_security_event(
          event_type TEXT,
          user_id UUID,
          details JSONB,
          ip_address INET DEFAULT NULL
        )
        RETURNS VOID AS $$
        BEGIN
          INSERT INTO audit_logs (
            table_name, 
            operation, 
            new_values, 
            user_id, 
            client_ip,
            timestamp
          ) VALUES (
            'security_events',
            event_type,
            details,
            user_id,
            ip_address,
            CURRENT_TIMESTAMP
          );
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
      `));

      console.log("✅ Security functions configured");
    } catch (error) {
      console.error("❌ Failed to setup security functions:", error);
      throw error;
    }
  }

  /**
   * Validate query security before execution
   */
  validateQuerySecurity(query: string, userId?: string): { 
    isValid: boolean; 
    risks: string[]; 
    complexity: number; 
  } {
    const risks: string[] = [];
    let complexity = 0;

    // Check for potentially dangerous operations
    const dangerousPatterns = [
      { pattern: /DROP\s+(TABLE|DATABASE|SCHEMA)/i, risk: "Dangerous DROP operation detected" },
      { pattern: /DELETE\s+FROM\s+\w+\s*(?!WHERE)/i, risk: "DELETE without WHERE clause" },
      { pattern: /UPDATE\s+\w+\s+SET\s+.*(?!WHERE)/i, risk: "UPDATE without WHERE clause" },
      { pattern: /TRUNCATE/i, risk: "TRUNCATE operation detected" },
      { pattern: /ALTER\s+TABLE/i, risk: "Schema modification detected" },
      { pattern: /CREATE\s+OR\s+REPLACE\s+FUNCTION/i, risk: "Function modification detected" },
      { pattern: /COPY.*FROM/i, risk: "File system access detected" },
      { pattern: /pg_read_file|pg_ls_dir/i, risk: "File system function usage" }
    ];

    for (const { pattern, risk } of dangerousPatterns) {
      if (pattern.test(query)) {
        risks.push(risk);
        complexity += 100;
      }
    }

    // Calculate query complexity
    complexity += (query.match(/JOIN/gi) || []).length * 10;
    complexity += (query.match(/UNION/gi) || []).length * 15;
    complexity += (query.match(/GROUP BY/gi) || []).length * 20;
    complexity += (query.match(/ORDER BY/gi) || []).length * 10;
    complexity += (query.match(/HAVING/gi) || []).length * 25;
    complexity += (query.match(/CASE\s+WHEN/gi) || []).length * 15;
    complexity += Math.max(0, query.length - 1000) / 100; // Penalize very long queries

    // Check complexity limits
    if (complexity > this.config.maxQueryComplexity) {
      risks.push(`Query complexity (${complexity}) exceeds limit (${this.config.maxQueryComplexity})`);
    }

    return {
      isValid: risks.length === 0,
      risks,
      complexity
    };
  }

  /**
   * Rate limiting for database queries per user/IP
   */
  checkRateLimit(identifier: string): { allowed: boolean; resetTime?: number } {
    const now = Date.now();
    const windowMs = this.config.rateLimitConfig.windowMs;
    const maxRequests = this.config.rateLimitConfig.maxRequests;

    const stats = this.queryStats.get(identifier) || { count: 0, lastReset: now };

    // Reset counter if window has passed
    if (now - stats.lastReset > windowMs) {
      stats.count = 0;
      stats.lastReset = now;
    }

    stats.count++;
    this.queryStats.set(identifier, stats);

    if (stats.count > maxRequests) {
      return {
        allowed: false,
        resetTime: stats.lastReset + windowMs
      };
    }

    return { allowed: true };
  }

  /**
   * Extract user context for security validation
   */
  extractUserContext(req: Request): {
    userId?: string;
    userRole?: string;
    ipAddress?: string;
    userAgent?: string;
  } {
    return {
      userId: (req.user as any)?.id,
      userRole: (req.user as any)?.role,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent')
    };
  }

  /**
   * Set database session variables for RLS
   */
  async setSessionContext(userId: string, userRole: string): Promise<void> {
    try {
      await db.execute(sql.raw(`SELECT set_config('app.current_user_id', $1, true)`), [userId]);
      await db.execute(sql.raw(`SELECT set_config('app.user_role', $1, true)`), [userRole]);
    } catch (error) {
      console.error("Failed to set session context:", error);
      throw error;
    }
  }

  /**
   * Clear database session context
   */
  async clearSessionContext(): Promise<void> {
    try {
      await db.execute(sql.raw(`SELECT set_config('app.current_user_id', '', true)`));
      await db.execute(sql.raw(`SELECT set_config('app.user_role', '', true)`));
    } catch (error) {
      console.error("Failed to clear session context:", error);
    }
  }

  /**
   * Generate secure hash for data integrity
   */
  generateDataHash(data: string, salt?: string): string {
    const actualSalt = salt || randomBytes(16).toString('hex');
    const hash = createHash('sha256');
    hash.update(data + actualSalt);
    return hash.digest('hex') + ':' + actualSalt;
  }

  /**
   * Verify data integrity hash
   */
  verifyDataHash(data: string, hash: string): boolean {
    try {
      const [expectedHash, salt] = hash.split(':');
      const actualHash = this.generateDataHash(data, salt).split(':')[0];
      
      // Use timing-safe comparison to prevent timing attacks
      return timingSafeEqual(
        Buffer.from(expectedHash, 'hex'),
        Buffer.from(actualHash, 'hex')
      );
    } catch (error) {
      return false;
    }
  }

  /**
   * Get security configuration
   */
  getConfig(): SecurityConfig {
    return { ...this.config };
  }

  /**
   * Update security configuration
   */
  updateConfig(newConfig: Partial<SecurityConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current security stats
   */
  getSecurityStats(): {
    rateLimitStats: Array<{ identifier: string; requests: number; lastReset: Date }>;
    totalQueries: number;
  } {
    const rateLimitStats = Array.from(this.queryStats.entries()).map(([identifier, stats]) => ({
      identifier,
      requests: stats.count,
      lastReset: new Date(stats.lastReset)
    }));

    return {
      rateLimitStats,
      totalQueries: rateLimitStats.reduce((sum, stat) => sum + stat.requests, 0)
    };
  }
}

// Security middleware factory
export function createSecurityMiddleware(security: DatabaseSecurity) {
  return {
    // Middleware to set session context
    setSessionContext: (req: any, res: any, next: any) => {
      if (req.user && req.user.id && req.user.role) {
        security.setSessionContext(req.user.id, req.user.role)
          .then(() => next())
          .catch(next);
      } else {
        next();
      }
    },

    // Middleware to clear session context
    clearSessionContext: (req: any, res: any, next: any) => {
      security.clearSessionContext()
        .then(() => next())
        .catch(() => next()); // Don't fail request if context clearing fails
    },

    // Middleware to check rate limits
    rateLimitCheck: (req: any, res: any, next: any) => {
      const context = security.extractUserContext(req);
      const identifier = context.userId || context.ipAddress || 'anonymous';
      
      const rateLimitResult = security.checkRateLimit(identifier);
      
      if (!rateLimitResult.allowed) {
        return res.status(429).json({
          error: 'Rate limit exceeded',
          resetTime: rateLimitResult.resetTime
        });
      }
      
      next();
    }
  };
}