/**
 * Enterprise Database Optimization Configuration
 * Provides advanced database performance, security, and scalability features
 */

import { Pool } from "@neondatabase/serverless";
import { db, pool } from "../db";
import { sql } from "drizzle-orm";

export class DatabaseOptimizer {
  private static instance: DatabaseOptimizer;
  private performanceStats = {
    queryCount: 0,
    slowQueryCount: 0,
    avgQueryTime: 0,
    lastOptimizationRun: null as Date | null
  };

  private constructor() {}

  public static getInstance(): DatabaseOptimizer {
    if (!DatabaseOptimizer.instance) {
      DatabaseOptimizer.instance = new DatabaseOptimizer();
    }
    return DatabaseOptimizer.instance;
  }

  /**
   * Initialize database optimization settings
   */
  async initialize() {
    try {
      await this.setOptimalConnectionSettings();
      await this.createCustomIndexes();
      await this.setupQueryPerformanceMonitoring();
      await this.enableAuditLogging();
      await this.setupSecurityPolicies();
      
      console.log("✅ Database optimization initialized successfully");
    } catch (error) {
      console.error("❌ Database optimization initialization failed:", error);
      throw error;
    }
  }

  /**
   * Set optimal PostgreSQL connection and performance settings
   */
  private async setOptimalConnectionSettings() {
    const optimizationQueries = [
      // Performance tuning
      "SET shared_preload_libraries = 'pg_stat_statements'",
      "SET work_mem = '256MB'",
      "SET maintenance_work_mem = '512MB'",
      "SET effective_cache_size = '4GB'",
      "SET random_page_cost = 1.1",
      "SET checkpoint_completion_target = 0.7",
      "SET wal_buffers = '16MB'",
      "SET default_statistics_target = 100",
      
      // Connection optimization
      "SET max_connections = 200",
      "SET shared_buffers = '1GB'",
      
      // Query optimization
      "SET enable_seqscan = on",
      "SET enable_indexscan = on",
      "SET enable_bitmapscan = on",
      "SET enable_hashjoin = on",
      "SET enable_mergejoin = on",
      "SET enable_nestloop = on",
    ];

    for (const query of optimizationQueries) {
      try {
        await db.execute(sql.raw(query));
      } catch (error) {
        // Some settings might not be available on all PostgreSQL instances
        console.warn(`Warning: Could not set ${query}:`, error);
      }
    }
  }

  /**
   * Create additional performance-optimized indexes
   */
  private async createCustomIndexes() {
    const indexQueries = [
      // Advanced composite indexes for complex queries
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_revenue_analytics 
       ON payments (payment_date, status, amount) 
       WHERE status IN ('paid', 'pending')`,
      
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leases_occupancy_report 
       ON leases (unit_id, status, start_date, end_date) 
       WHERE status = 'active'`,
      
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_tenant_lookup 
       ON users (role, is_active, is_approved) 
       WHERE role = 'tenant'`,
      
      // Partial indexes for common filtered queries
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_units_available 
       ON units (property_id, monthly_rent, bedrooms) 
       WHERE status = 'vacant'`,
      
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_overdue 
       ON payments (tenant_id, due_date, amount) 
       WHERE status IN ('pending', 'overdue') AND due_date < CURRENT_DATE`,
      
      // Full-text search indexes
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_properties_fulltext 
       ON properties USING gin(to_tsvector('english', name || ' ' || description))`,
      
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_fulltext 
       ON users USING gin(to_tsvector('english', first_name || ' ' || last_name || ' ' || COALESCE(email, '')))`,
      
      // Time-series indexes for reporting
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_monthly_reports 
       ON payments (date_trunc('month', payment_date), status, payment_method)`,
      
      // Covering indexes for frequently accessed data
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_units_with_rent 
       ON units (property_id, status) 
       INCLUDE (unit_number, monthly_rent, bedrooms, bathrooms)`,
    ];

    for (const query of indexQueries) {
      try {
        await db.execute(sql.raw(query));
      } catch (error) {
        console.warn(`Warning: Could not create index: ${query}`, error);
      }
    }
  }

  /**
   * Setup comprehensive query performance monitoring
   */
  private async setupQueryPerformanceMonitoring() {
    try {
      // Enable pg_stat_statements if available
      await db.execute(sql.raw("CREATE EXTENSION IF NOT EXISTS pg_stat_statements"));
      
      // Create performance monitoring view
      await db.execute(sql.raw(`
        CREATE OR REPLACE VIEW query_performance_stats AS
        SELECT 
          query,
          calls,
          total_time,
          mean_time,
          rows,
          100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
        FROM pg_stat_statements
        ORDER BY total_time DESC;
      `));

      console.log("✅ Query performance monitoring enabled");
    } catch (error) {
      console.warn("Warning: Could not setup query performance monitoring:", error);
    }
  }

  /**
   * Enable comprehensive audit logging
   */
  private async enableAuditLogging() {
    try {
      // Create audit log table
      await db.execute(sql.raw(`
        CREATE TABLE IF NOT EXISTS audit_logs (
          id SERIAL PRIMARY KEY,
          table_name VARCHAR(50) NOT NULL,
          operation VARCHAR(10) NOT NULL,
          old_values JSONB,
          new_values JSONB,
          user_id UUID,
          user_role VARCHAR(20),
          client_ip INET,
          user_agent TEXT,
          timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          session_id VARCHAR(255)
        );
      `));

      // Create indexes for audit log performance
      await db.execute(sql.raw(`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_timestamp 
        ON audit_logs (timestamp DESC);
      `));
      
      await db.execute(sql.raw(`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_user 
        ON audit_logs (user_id, timestamp DESC);
      `));
      
      await db.execute(sql.raw(`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_table 
        ON audit_logs (table_name, operation, timestamp DESC);
      `));

      // Create audit trigger function
      await db.execute(sql.raw(`
        CREATE OR REPLACE FUNCTION audit_trigger_function()
        RETURNS TRIGGER AS $$
        BEGIN
          IF TG_OP = 'DELETE' THEN
            INSERT INTO audit_logs (table_name, operation, old_values)
            VALUES (TG_TABLE_NAME, TG_OP, row_to_json(OLD));
            RETURN OLD;
          ELSIF TG_OP = 'UPDATE' THEN
            INSERT INTO audit_logs (table_name, operation, old_values, new_values)
            VALUES (TG_TABLE_NAME, TG_OP, row_to_json(OLD), row_to_json(NEW));
            RETURN NEW;
          ELSIF TG_OP = 'INSERT' THEN
            INSERT INTO audit_logs (table_name, operation, new_values)
            VALUES (TG_TABLE_NAME, TG_OP, row_to_json(NEW));
            RETURN NEW;
          END IF;
          RETURN NULL;
        END;
        $$ LANGUAGE plpgsql;
      `));

      console.log("✅ Audit logging system enabled");
    } catch (error) {
      console.warn("Warning: Could not setup audit logging:", error);
    }
  }

  /**
   * Setup database security policies and constraints
   */
  private async setupSecurityPolicies() {
    try {
      // Enable Row Level Security on sensitive tables
      const sensitiveTables = [
        'users', 'payments', 'leases', 'tenant_deposits', 
        'tenant_documents', 'maintenance_requests'
      ];

      for (const table of sensitiveTables) {
        await db.execute(sql.raw(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`));
      }

      // Create data validation constraints
      await db.execute(sql.raw(`
        ALTER TABLE users 
        ADD CONSTRAINT chk_email_format 
        CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
      `));

      await db.execute(sql.raw(`
        ALTER TABLE users 
        ADD CONSTRAINT chk_phone_format 
        CHECK (phone ~* '^(\+?254|0)[0-9]{9}$' OR phone IS NULL);
      `));

      await db.execute(sql.raw(`
        ALTER TABLE payments 
        ADD CONSTRAINT chk_payment_amount_positive 
        CHECK (amount > 0);
      `));

      await db.execute(sql.raw(`
        ALTER TABLE units 
        ADD CONSTRAINT chk_monthly_rent_positive 
        CHECK (monthly_rent > 0);
      `));

      await db.execute(sql.raw(`
        ALTER TABLE leases 
        ADD CONSTRAINT chk_lease_dates_valid 
        CHECK (start_date <= COALESCE(end_date, start_date) AND move_in_date >= start_date);
      `));

      console.log("✅ Database security policies enabled");
    } catch (error) {
      console.warn("Warning: Could not setup all security policies:", error);
    }
  }

  /**
   * Analyze database performance and suggest optimizations
   */
  async analyzePerformance(): Promise<{
    slowQueries: any[];
    indexUsage: any[];
    tableStats: any[];
    recommendations: string[];
  }> {
    try {
      // Get slow queries
      const slowQueries = await db.execute(sql.raw(`
        SELECT query, calls, total_time, mean_time, rows
        FROM pg_stat_statements 
        WHERE mean_time > 100 
        ORDER BY total_time DESC 
        LIMIT 10;
      `));

      // Get index usage statistics
      const indexUsage = await db.execute(sql.raw(`
        SELECT 
          schemaname,
          tablename,
          indexname,
          idx_tup_read,
          idx_tup_fetch,
          idx_blks_read,
          idx_blks_hit
        FROM pg_stat_user_indexes
        WHERE idx_tup_read > 0
        ORDER BY idx_tup_read DESC;
      `));

      // Get table statistics
      const tableStats = await db.execute(sql.raw(`
        SELECT 
          schemaname,
          tablename,
          n_tup_ins,
          n_tup_upd,
          n_tup_del,
          n_live_tup,
          n_dead_tup,
          last_vacuum,
          last_autovacuum,
          last_analyze,
          last_autoanalyze
        FROM pg_stat_user_tables
        ORDER BY n_live_tup DESC;
      `));

      const recommendations = this.generateOptimizationRecommendations(
        slowQueries.rows || [], 
        indexUsage.rows || [], 
        tableStats.rows || []
      );

      return {
        slowQueries: slowQueries.rows || [],
        indexUsage: indexUsage.rows || [],
        tableStats: tableStats.rows || [],
        recommendations
      };
    } catch (error) {
      console.error("Error analyzing database performance:", error);
      return { slowQueries: [], indexUsage: [], tableStats: [], recommendations: [] };
    }
  }

  /**
   * Generate optimization recommendations based on performance analysis
   */
  private generateOptimizationRecommendations(
    slowQueries: any[], 
    indexUsage: any[], 
    tableStats: any[]
  ): string[] {
    const recommendations: string[] = [];

    // Analyze slow queries
    if (slowQueries.length > 0) {
      recommendations.push(`Found ${slowQueries.length} slow queries. Consider optimizing queries with mean time > 100ms.`);
    }

    // Analyze index usage
    const unusedIndexes = indexUsage.filter(idx => idx.idx_tup_read === 0);
    if (unusedIndexes.length > 0) {
      recommendations.push(`Found ${unusedIndexes.length} unused indexes that can be dropped to improve write performance.`);
    }

    // Analyze table maintenance
    const needsVacuum = tableStats.filter(table => 
      table.n_dead_tup > table.n_live_tup * 0.1
    );
    if (needsVacuum.length > 0) {
      recommendations.push(`${needsVacuum.length} tables need VACUUM due to high dead tuple ratio.`);
    }

    // Analyze table size and growth
    const largeTables = tableStats.filter(table => table.n_live_tup > 100000);
    if (largeTables.length > 0) {
      recommendations.push(`Consider partitioning large tables (${largeTables.length} tables with >100k rows) for better performance.`);
    }

    return recommendations;
  }

  /**
   * Perform automated database maintenance
   */
  async performMaintenance() {
    try {
      console.log("🔧 Starting database maintenance...");
      
      // Update table statistics
      await db.execute(sql.raw("ANALYZE;"));
      
      // Vacuum and analyze high-activity tables
      const highActivityTables = ['payments', 'audit_logs', 'sessions'];
      for (const table of highActivityTables) {
        await db.execute(sql.raw(`VACUUM ANALYZE ${table};`));
      }
      
      // Clean up old audit logs (keep last 90 days)
      await db.execute(sql.raw(`
        DELETE FROM audit_logs 
        WHERE timestamp < CURRENT_DATE - INTERVAL '90 days';
      `));
      
      // Clean up expired sessions
      await db.execute(sql.raw(`
        DELETE FROM sessions 
        WHERE expire < CURRENT_TIMESTAMP;
      `));
      
      this.performanceStats.lastOptimizationRun = new Date();
      console.log("✅ Database maintenance completed successfully");
      
    } catch (error) {
      console.error("❌ Database maintenance failed:", error);
      throw error;
    }
  }

  /**
   * Get current performance statistics
   */
  getPerformanceStats() {
    return { ...this.performanceStats };
  }

  /**
   * Setup connection pool with optimal settings for enterprise usage
   */
  static configureConnectionPool(): Pool {
    return new Pool({
      connectionString: process.env.DATABASE_URL,
      // Optimal connection pool settings for enterprise usage
      max: 50, // Maximum connections in pool
      min: 5,  // Minimum connections to maintain
      idleTimeoutMillis: 30000, // Close idle connections after 30s
      connectionTimeoutMillis: 10000, // Timeout after 10s trying to connect
      maxUses: 7500, // Close connection after 7500 uses
      // Advanced settings for performance
      allowExitOnIdle: true,
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000
    });
  }
}

// Database health monitoring utilities
export class DatabaseHealthMonitor {
  /**
   * Check overall database health
   */
  static async checkHealth(): Promise<{
    status: 'healthy' | 'warning' | 'critical';
    checks: Array<{
      name: string;
      status: 'pass' | 'fail' | 'warning';
      message: string;
      value?: any;
    }>;
  }> {
    const checks = [];
    let overallStatus: 'healthy' | 'warning' | 'critical' = 'healthy';

    try {
      // Connection test
      const connectionStart = Date.now();
      await db.execute(sql.raw("SELECT 1"));
      const connectionTime = Date.now() - connectionStart;
      
      checks.push({
        name: 'Database Connection',
        status: connectionTime < 100 ? 'pass' : connectionTime < 1000 ? 'warning' : 'fail',
        message: `Connection established in ${connectionTime}ms`,
        value: connectionTime
      });

      // Check active connections
      const connectionResult = await db.execute(sql.raw(`
        SELECT count(*) as active_connections 
        FROM pg_stat_activity 
        WHERE state = 'active';
      `));
      
      const activeConnections = connectionResult.rows?.[0]?.active_connections || 0;
      checks.push({
        name: 'Active Connections',
        status: activeConnections < 80 ? 'pass' : activeConnections < 150 ? 'warning' : 'fail',
        message: `${activeConnections} active connections`,
        value: activeConnections
      });

      // Check database size
      const sizeResult = await db.execute(sql.raw(`
        SELECT pg_size_pretty(pg_database_size(current_database())) as db_size;
      `));
      
      const dbSize = sizeResult.rows?.[0]?.db_size || 'Unknown';
      checks.push({
        name: 'Database Size',
        status: 'pass',
        message: `Database size: ${dbSize}`,
        value: dbSize
      });

      // Check for long-running queries
      const longQueriesResult = await db.execute(sql.raw(`
        SELECT count(*) as long_queries 
        FROM pg_stat_activity 
        WHERE state = 'active' 
        AND query_start < now() - interval '5 minutes';
      `));
      
      const longQueries = longQueriesResult.rows?.[0]?.long_queries || 0;
      checks.push({
        name: 'Long Running Queries',
        status: longQueries === 0 ? 'pass' : longQueries < 5 ? 'warning' : 'fail',
        message: `${longQueries} queries running >5 minutes`,
        value: longQueries
      });

      // Determine overall status
      const failedChecks = checks.filter(check => check.status === 'fail');
      const warningChecks = checks.filter(check => check.status === 'warning');
      
      if (failedChecks.length > 0) {
        overallStatus = 'critical';
      } else if (warningChecks.length > 0) {
        overallStatus = 'warning';
      }

    } catch (error) {
      checks.push({
        name: 'Database Health Check',
        status: 'fail',
        message: `Health check failed: ${error.message}`
      });
      overallStatus = 'critical';
    }

    return { status: overallStatus, checks };
  }
}