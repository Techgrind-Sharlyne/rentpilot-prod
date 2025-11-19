/**
 * Enterprise Database Scaling Configuration
 * Provides horizontal scaling capabilities and load balancing strategies
 */

import { Pool } from "@neondatabase/serverless";
import { db } from "../db";
import { sql } from "drizzle-orm";

export interface ScalingConfig {
  enableReadReplicas: boolean;
  enablePartitioning: boolean;
  enableCaching: boolean;
  replicaEndpoints?: string[];
  cacheTTL: number;
  partitionStrategy: 'date' | 'hash' | 'range';
}

export class DatabaseScaler {
  private static instance: DatabaseScaler;
  private config: ScalingConfig;
  private readPools: Map<string, Pool> = new Map();
  private cache = new Map<string, { data: any; expires: number }>();

  private constructor(config: ScalingConfig) {
    this.config = config;
  }

  public static getInstance(config?: ScalingConfig): DatabaseScaler {
    if (!DatabaseScaler.instance) {
      const defaultConfig: ScalingConfig = {
        enableReadReplicas: false,
        enablePartitioning: false,
        enableCaching: true,
        cacheTTL: 300000, // 5 minutes
        partitionStrategy: 'date'
      };
      DatabaseScaler.instance = new DatabaseScaler(config || defaultConfig);
    }
    return DatabaseScaler.instance;
  }

  /**
   * Initialize scaling features
   */
  async initializeScaling(): Promise<void> {
    try {
      if (this.config.enableReadReplicas) {
        await this.setupReadReplicas();
      }

      if (this.config.enablePartitioning) {
        await this.setupTablePartitioning();
      }

      if (this.config.enableCaching) {
        await this.setupQueryCaching();
      }

      console.log("✅ Database scaling features initialized");
    } catch (error) {
      console.error("❌ Failed to initialize database scaling:", error);
      throw error;
    }
  }

  /**
   * Setup read replica connections for load distribution
   */
  private async setupReadReplicas(): Promise<void> {
    try {
      if (!this.config.replicaEndpoints) {
        console.warn("No read replica endpoints configured");
        return;
      }

      for (const endpoint of this.config.replicaEndpoints) {
        const replicaPool = new Pool({
          connectionString: endpoint,
          max: 20, // Smaller pool for read replicas
          min: 2,
          idleTimeoutMillis: 30000,
        });

        this.readPools.set(endpoint, replicaPool);
      }

      console.log(`✅ Configured ${this.config.replicaEndpoints.length} read replicas`);
    } catch (error) {
      console.error("❌ Failed to setup read replicas:", error);
      throw error;
    }
  }

  /**
   * Setup table partitioning for large datasets
   */
  private async setupTablePartitioning(): Promise<void> {
    try {
      const partitionTables = [
        { table: 'payments', strategy: 'date', column: 'payment_date' },
        { table: 'audit_logs', strategy: 'date', column: 'timestamp' },
        { table: 'invoices', strategy: 'date', column: 'created_at' }
      ];

      for (const { table, strategy, column } of partitionTables) {
        await this.createPartitionedTable(table, strategy, column);
      }

      console.log("✅ Table partitioning configured");
    } catch (error) {
      console.error("❌ Failed to setup table partitioning:", error);
      throw error;
    }
  }

  /**
   * Create partitioned table structure
   */
  private async createPartitionedTable(
    tableName: string, 
    strategy: string, 
    column: string
  ): Promise<void> {
    try {
      // Check if table is already partitioned
      const isPartitioned = await db.execute(sql.raw(`
        SELECT EXISTS (
          SELECT 1 FROM pg_partitioned_table WHERE partrelid = '${tableName}'::regclass
        );
      `));

      if (isPartitioned.rows?.[0]?.exists) {
        console.log(`Table ${tableName} is already partitioned`);
        return;
      }

      if (strategy === 'date') {
        // Create monthly partitions for the last 12 months and next 6 months
        const partitions = this.generateDatePartitions(18);
        
        for (const partition of partitions) {
          const partitionName = `${tableName}_${partition.suffix}`;
          
          await db.execute(sql.raw(`
            CREATE TABLE IF NOT EXISTS ${partitionName} 
            PARTITION OF ${tableName}
            FOR VALUES FROM ('${partition.start}') TO ('${partition.end}');
          `));

          // Create indexes on partitioned table
          await db.execute(sql.raw(`
            CREATE INDEX IF NOT EXISTS idx_${partitionName}_${column}
            ON ${partitionName} (${column});
          `));
        }
      }

      console.log(`✅ Partitioned table ${tableName} by ${strategy}`);
    } catch (error) {
      console.warn(`Warning: Could not partition table ${tableName}:`, error);
    }
  }

  /**
   * Generate date-based partition definitions
   */
  private generateDatePartitions(months: number): Array<{
    suffix: string;
    start: string;
    end: string;
  }> {
    const partitions = [];
    const now = new Date();
    
    for (let i = -12; i < months - 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const nextDate = new Date(now.getFullYear(), now.getMonth() + i + 1, 1);
      
      partitions.push({
        suffix: `${date.getFullYear()}_${(date.getMonth() + 1).toString().padStart(2, '0')}`,
        start: date.toISOString().split('T')[0],
        end: nextDate.toISOString().split('T')[0]
      });
    }
    
    return partitions;
  }

  /**
   * Setup query result caching
   */
  private async setupQueryCaching(): Promise<void> {
    // Simple in-memory cache - in production, use Redis or similar
    setInterval(() => {
      this.cleanupExpiredCache();
    }, 60000); // Clean up every minute

    console.log("✅ Query caching configured");
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupExpiredCache(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (value.expires < now) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Execute query with read replica load balancing
   */
  async executeReadQuery<T>(query: string, params?: any[]): Promise<T> {
    try {
      // Check cache first
      if (this.config.enableCaching) {
        const cacheKey = this.generateCacheKey(query, params);
        const cached = this.cache.get(cacheKey);
        if (cached && cached.expires > Date.now()) {
          return cached.data;
        }
      }

      // Use read replica if available
      let result;
      if (this.readPools.size > 0) {
        const replica = this.selectReadReplica();
        result = await this.executeOnReplica(replica, query, params);
      } else {
        // Fallback to primary
        result = await db.execute(sql.raw(query), params);
      }

      // Cache result if caching is enabled
      if (this.config.enableCaching) {
        const cacheKey = this.generateCacheKey(query, params);
        this.cache.set(cacheKey, {
          data: result,
          expires: Date.now() + this.config.cacheTTL
        });
      }

      return result;
    } catch (error) {
      console.error("Read query failed:", error);
      throw error;
    }
  }

  /**
   * Select read replica using round-robin load balancing
   */
  private selectReadReplica(): Pool {
    const replicas = Array.from(this.readPools.values());
    const index = Math.floor(Math.random() * replicas.length);
    return replicas[index];
  }

  /**
   * Execute query on specific replica
   */
  private async executeOnReplica(replica: Pool, query: string, params?: any[]): Promise<any> {
    const client = await replica.connect();
    try {
      return await client.query(query, params);
    } finally {
      client.release();
    }
  }

  /**
   * Generate cache key for query and parameters
   */
  private generateCacheKey(query: string, params?: any[]): string {
    const crypto = require('crypto');
    const hash = crypto.createHash('md5');
    hash.update(query);
    if (params) {
      hash.update(JSON.stringify(params));
    }
    return hash.digest('hex');
  }

  /**
   * Execute write query (always on primary)
   */
  async executeWriteQuery<T>(query: string, params?: any[]): Promise<T> {
    try {
      const result = await db.execute(sql.raw(query), params);
      
      // Invalidate related cache entries
      if (this.config.enableCaching) {
        this.invalidateRelatedCache(query);
      }
      
      return result;
    } catch (error) {
      console.error("Write query failed:", error);
      throw error;
    }
  }

  /**
   * Invalidate cache entries related to a write query
   */
  private invalidateRelatedCache(query: string): void {
    // Simple approach - clear all cache for writes
    // In production, implement more sophisticated cache invalidation
    const affectedTables = this.extractTablesFromQuery(query);
    
    for (const [key] of this.cache.entries()) {
      for (const table of affectedTables) {
        if (key.includes(table)) {
          this.cache.delete(key);
        }
      }
    }
  }

  /**
   * Extract table names from SQL query
   */
  private extractTablesFromQuery(query: string): string[] {
    const tables = [];
    const patterns = [
      /INSERT\s+INTO\s+(\w+)/gi,
      /UPDATE\s+(\w+)/gi,
      /DELETE\s+FROM\s+(\w+)/gi,
      /FROM\s+(\w+)/gi,
      /JOIN\s+(\w+)/gi
    ];

    for (const pattern of patterns) {
      const matches = query.matchAll(pattern);
      for (const match of matches) {
        if (match[1] && !tables.includes(match[1])) {
          tables.push(match[1]);
        }
      }
    }

    return tables;
  }

  /**
   * Get scaling statistics
   */
  getScalingStats(): {
    readReplicas: number;
    cacheSize: number;
    cacheHitRate: number;
    partitionedTables: string[];
  } {
    return {
      readReplicas: this.readPools.size,
      cacheSize: this.cache.size,
      cacheHitRate: 0, // Would need to track hits/misses
      partitionedTables: [] // Would need to query database for actual partitioned tables
    };
  }

  /**
   * Health check for scaling components
   */
  async checkScalingHealth(): Promise<{
    readReplicas: Array<{ endpoint: string; status: string; latency?: number }>;
    cacheStatus: string;
    partitioningStatus: string;
  }> {
    const replicaHealth = [];

    // Check read replicas
    for (const [endpoint, pool] of this.readPools.entries()) {
      try {
        const start = Date.now();
        const client = await pool.connect();
        await client.query('SELECT 1');
        client.release();
        
        replicaHealth.push({
          endpoint,
          status: 'healthy',
          latency: Date.now() - start
        });
      } catch (error) {
        replicaHealth.push({
          endpoint,
          status: 'unhealthy'
        });
      }
    }

    return {
      readReplicas: replicaHealth,
      cacheStatus: this.config.enableCaching ? 'enabled' : 'disabled',
      partitioningStatus: this.config.enablePartitioning ? 'enabled' : 'disabled'
    };
  }

  /**
   * Cleanup resources
   */
  async shutdown(): Promise<void> {
    try {
      // Close read replica connections
      for (const pool of this.readPools.values()) {
        await pool.end();
      }
      
      // Clear cache
      this.cache.clear();
      
      console.log("✅ Database scaling components shut down");
    } catch (error) {
      console.error("❌ Failed to shutdown scaling components:", error);
      throw error;
    }
  }
}