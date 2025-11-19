/**
 * Enterprise Database Migration System
 * Provides safe, versioned database migrations with rollback capabilities
 */

import { db } from "../db";
import { sql } from "drizzle-orm";
import { readdir, readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";

export interface Migration {
  id: string;
  name: string;
  version: string;
  up: string;
  down?: string;
  checksum: string;
  appliedAt?: Date;
  executionTime?: number;
}

export class MigrationManager {
  private migrationsPath = join(process.cwd(), "migrations");
  
  constructor() {
    this.ensureMigrationsTable();
  }

  /**
   * Ensure migrations tracking table exists
   */
  private async ensureMigrationsTable() {
    try {
      await db.execute(sql.raw(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          version VARCHAR(50) NOT NULL,
          checksum VARCHAR(64) NOT NULL,
          applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          execution_time INTEGER,
          rollback_sql TEXT,
          UNIQUE(version)
        );
      `));

      await db.execute(sql.raw(`
        CREATE INDEX IF NOT EXISTS idx_schema_migrations_version 
        ON schema_migrations (version);
      `));

      await db.execute(sql.raw(`
        CREATE INDEX IF NOT EXISTS idx_schema_migrations_applied_at 
        ON schema_migrations (applied_at);
      `));

    } catch (error) {
      console.error("Failed to create schema_migrations table:", error);
    }
  }

  /**
   * Generate a new migration file
   */
  async generateMigration(name: string, upSql: string, downSql?: string): Promise<string> {
    try {
      // Ensure migrations directory exists
      await mkdir(this.migrationsPath, { recursive: true });

      const timestamp = new Date().toISOString().replace(/[-:.]/g, '').replace('T', '_').slice(0, 15);
      const version = `${timestamp}_${name.toLowerCase().replace(/\s+/g, '_')}`;
      const fileName = `${version}.sql`;
      const filePath = join(this.migrationsPath, fileName);

      const checksum = this.generateChecksum(upSql);
      
      const migrationContent = `-- Migration: ${name}
-- Version: ${version}
-- Generated: ${new Date().toISOString()}
-- Checksum: ${checksum}

-- Up Migration
${upSql}

${downSql ? `-- Down Migration (Rollback)
-- DOWN:
${downSql}` : '-- No rollback defined'}
`;

      await writeFile(filePath, migrationContent);
      console.log(`✅ Migration generated: ${fileName}`);
      
      return filePath;
    } catch (error) {
      console.error("Failed to generate migration:", error);
      throw error;
    }
  }

  /**
   * Run pending migrations
   */
  async runMigrations(): Promise<{ applied: Migration[]; skipped: Migration[] }> {
    try {
      const pendingMigrations = await this.getPendingMigrations();
      const applied: Migration[] = [];
      const skipped: Migration[] = [];

      console.log(`Found ${pendingMigrations.length} pending migrations`);

      for (const migration of pendingMigrations) {
        try {
          const startTime = Date.now();
          
          // Start transaction for migration
          await db.execute(sql.raw("BEGIN"));
          
          // Execute migration SQL
          const migrationSql = this.extractUpSql(migration.up);
          if (migrationSql.trim()) {
            await db.execute(sql.raw(migrationSql));
          }
          
          const executionTime = Date.now() - startTime;
          
          // Record successful migration
          await db.execute(sql.raw(`
            INSERT INTO schema_migrations (id, name, version, checksum, execution_time, rollback_sql)
            VALUES ($1, $2, $3, $4, $5, $6)
          `), [
            migration.id,
            migration.name,
            migration.version,
            migration.checksum,
            executionTime,
            this.extractDownSql(migration.down)
          ]);
          
          await db.execute(sql.raw("COMMIT"));
          
          migration.appliedAt = new Date();
          migration.executionTime = executionTime;
          applied.push(migration);
          
          console.log(`✅ Applied migration: ${migration.version} (${executionTime}ms)`);
          
        } catch (error) {
          await db.execute(sql.raw("ROLLBACK"));
          console.error(`❌ Failed to apply migration ${migration.version}:`, error);
          throw error;
        }
      }

      if (applied.length > 0) {
        console.log(`🎉 Successfully applied ${applied.length} migrations`);
      } else {
        console.log("ℹ️  No pending migrations to apply");
      }

      return { applied, skipped };
    } catch (error) {
      console.error("Migration execution failed:", error);
      throw error;
    }
  }

  /**
   * Rollback the last N migrations
   */
  async rollback(steps: number = 1): Promise<Migration[]> {
    try {
      const appliedMigrations = await this.getAppliedMigrations();
      const toRollback = appliedMigrations.slice(0, steps);
      const rolledBack: Migration[] = [];

      console.log(`Rolling back ${toRollback.length} migrations`);

      for (const migration of toRollback) {
        try {
          await db.execute(sql.raw("BEGIN"));

          // Execute rollback SQL if available
          if (migration.down) {
            const rollbackSql = this.extractDownSql(migration.down);
            if (rollbackSql.trim()) {
              await db.execute(sql.raw(rollbackSql));
            }
          } else {
            console.warn(`⚠️  No rollback defined for migration ${migration.version}`);
          }

          // Remove from migrations table
          await db.execute(sql.raw(`
            DELETE FROM schema_migrations WHERE version = $1
          `), [migration.version]);

          await db.execute(sql.raw("COMMIT"));
          rolledBack.push(migration);
          
          console.log(`↩️  Rolled back migration: ${migration.version}`);
          
        } catch (error) {
          await db.execute(sql.raw("ROLLBACK"));
          console.error(`❌ Failed to rollback migration ${migration.version}:`, error);
          throw error;
        }
      }

      return rolledBack;
    } catch (error) {
      console.error("Migration rollback failed:", error);
      throw error;
    }
  }

  /**
   * Get migration status
   */
  async getStatus(): Promise<{
    applied: Migration[];
    pending: Migration[];
    total: number;
  }> {
    const applied = await this.getAppliedMigrations();
    const pending = await this.getPendingMigrations();
    
    return {
      applied,
      pending,
      total: applied.length + pending.length
    };
  }

  /**
   * Get pending migrations
   */
  private async getPendingMigrations(): Promise<Migration[]> {
    try {
      const appliedVersions = new Set(
        (await this.getAppliedMigrations()).map(m => m.version)
      );
      
      const allMigrations = await this.loadMigrationsFromDisk();
      return allMigrations.filter(m => !appliedVersions.has(m.version));
    } catch (error) {
      console.error("Failed to get pending migrations:", error);
      return [];
    }
  }

  /**
   * Get applied migrations (most recent first)
   */
  private async getAppliedMigrations(): Promise<Migration[]> {
    try {
      const result = await db.execute(sql.raw(`
        SELECT id, name, version, checksum, applied_at, execution_time, rollback_sql
        FROM schema_migrations
        ORDER BY applied_at DESC
      `));

      return (result.rows || []).map(row => ({
        id: row.id,
        name: row.name,
        version: row.version,
        checksum: row.checksum,
        appliedAt: row.applied_at,
        executionTime: row.execution_time,
        up: '', // Not stored in DB
        down: row.rollback_sql
      }));
    } catch (error) {
      console.error("Failed to get applied migrations:", error);
      return [];
    }
  }

  /**
   * Load migrations from disk
   */
  private async loadMigrationsFromDisk(): Promise<Migration[]> {
    try {
      const files = await readdir(this.migrationsPath);
      const migrationFiles = files.filter(f => f.endsWith('.sql')).sort();
      
      const migrations: Migration[] = [];
      
      for (const file of migrationFiles) {
        const filePath = join(this.migrationsPath, file);
        const content = await readFile(filePath, 'utf-8');
        const migration = this.parseMigrationFile(file, content);
        if (migration) {
          migrations.push(migration);
        }
      }
      
      return migrations;
    } catch (error) {
      console.error("Failed to load migrations from disk:", error);
      return [];
    }
  }

  /**
   * Parse migration file content
   */
  private parseMigrationFile(fileName: string, content: string): Migration | null {
    try {
      const lines = content.split('\n');
      
      let name = '';
      let version = '';
      let checksum = '';
      
      // Extract metadata from comments
      for (const line of lines) {
        if (line.startsWith('-- Migration:')) {
          name = line.replace('-- Migration:', '').trim();
        }
        if (line.startsWith('-- Version:')) {
          version = line.replace('-- Version:', '').trim();
        }
        if (line.startsWith('-- Checksum:')) {
          checksum = line.replace('-- Checksum:', '').trim();
        }
      }
      
      // If metadata not found, derive from filename
      if (!version) {
        version = fileName.replace('.sql', '');
      }
      if (!name) {
        name = version.split('_').slice(1).join(' ');
      }
      
      return {
        id: version,
        name,
        version,
        up: content,
        down: this.extractDownSql(content),
        checksum: checksum || this.generateChecksum(content)
      };
    } catch (error) {
      console.error(`Failed to parse migration file ${fileName}:`, error);
      return null;
    }
  }

  /**
   * Extract UP SQL from migration content
   */
  private extractUpSql(content: string): string {
    const lines = content.split('\n');
    const upStart = lines.findIndex(line => line.includes('-- Up Migration'));
    const downStart = lines.findIndex(line => line.includes('-- DOWN:'));
    
    if (upStart === -1) return content; // Assume entire content is UP
    
    const endIndex = downStart === -1 ? lines.length : downStart;
    return lines.slice(upStart + 1, endIndex)
      .filter(line => !line.startsWith('--'))
      .join('\n')
      .trim();
  }

  /**
   * Extract DOWN SQL from migration content
   */
  private extractDownSql(content: string | undefined): string | undefined {
    if (!content) return undefined;
    
    const lines = content.split('\n');
    const downStart = lines.findIndex(line => line.includes('-- DOWN:'));
    
    if (downStart === -1) return undefined;
    
    return lines.slice(downStart + 1)
      .filter(line => !line.startsWith('--'))
      .join('\n')
      .trim() || undefined;
  }

  /**
   * Generate checksum for migration content
   */
  private generateChecksum(content: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(content).digest('hex').substring(0, 16);
  }

  /**
   * Create a database backup before running migrations
   */
  async createBackup(backupName?: string): Promise<string> {
    try {
      const timestamp = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15);
      const name = backupName || `backup_${timestamp}`;
      
      // In a production environment, you would use pg_dump or similar
      // For now, we'll create a logical backup of the schema
      await db.execute(sql.raw(`
        CREATE TABLE IF NOT EXISTS schema_backups (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          schema_dump TEXT NOT NULL
        );
      `));
      
      // Store current schema state
      const schemaDump = await this.generateSchemaDump();
      
      await db.execute(sql.raw(`
        INSERT INTO schema_backups (id, name, schema_dump)
        VALUES ($1, $2, $3)
      `), [timestamp, name, schemaDump]);
      
      console.log(`✅ Database backup created: ${name}`);
      return name;
    } catch (error) {
      console.error("Failed to create database backup:", error);
      throw error;
    }
  }

  /**
   * Generate schema dump for backup
   */
  private async generateSchemaDump(): Promise<string> {
    try {
      const result = await db.execute(sql.raw(`
        SELECT table_name, column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public'
        ORDER BY table_name, ordinal_position;
      `));
      
      return JSON.stringify(result.rows || []);
    } catch (error) {
      console.error("Failed to generate schema dump:", error);
      return JSON.stringify([]);
    }
  }
}

// CLI-like interface for migrations
export class MigrationCLI {
  private manager = new MigrationManager();

  async run(command: string, ...args: string[]): Promise<void> {
    try {
      switch (command) {
        case 'status':
          await this.showStatus();
          break;
        case 'up':
          await this.runMigrations();
          break;
        case 'down':
          const steps = parseInt(args[0]) || 1;
          await this.rollbackMigrations(steps);
          break;
        case 'generate':
          const name = args[0];
          if (!name) {
            console.error("Migration name is required");
            return;
          }
          await this.generateMigration(name);
          break;
        case 'backup':
          const backupName = args[0];
          await this.createBackup(backupName);
          break;
        default:
          this.showHelp();
      }
    } catch (error) {
      console.error(`Migration command failed:`, error);
      process.exit(1);
    }
  }

  private async showStatus(): Promise<void> {
    const status = await this.manager.getStatus();
    
    console.log('\n📊 Migration Status:');
    console.log(`   Applied: ${status.applied.length}`);
    console.log(`   Pending: ${status.pending.length}`);
    console.log(`   Total: ${status.total}\n`);

    if (status.pending.length > 0) {
      console.log('⏳ Pending Migrations:');
      status.pending.forEach(m => {
        console.log(`   - ${m.version}: ${m.name}`);
      });
      console.log('');
    }

    if (status.applied.length > 0) {
      console.log('✅ Recent Applied Migrations:');
      status.applied.slice(0, 5).forEach(m => {
        const time = m.appliedAt ? m.appliedAt.toISOString().split('T')[0] : 'Unknown';
        console.log(`   - ${m.version}: ${m.name} (${time})`);
      });
    }
  }

  private async runMigrations(): Promise<void> {
    console.log('🚀 Running migrations...\n');
    const result = await this.manager.runMigrations();
    
    if (result.applied.length > 0) {
      console.log(`\n✅ Successfully applied ${result.applied.length} migrations`);
    } else {
      console.log('\nℹ️  Database is up to date');
    }
  }

  private async rollbackMigrations(steps: number): Promise<void> {
    console.log(`↩️  Rolling back ${steps} migration(s)...\n`);
    const rolledBack = await this.manager.rollback(steps);
    console.log(`\n✅ Successfully rolled back ${rolledBack.length} migrations`);
  }

  private async generateMigration(name: string): Promise<void> {
    const upSql = `-- Add your migration SQL here
-- Example:
-- CREATE TABLE example (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   name VARCHAR(255) NOT NULL,
--   created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
-- );`;

    const downSql = `-- Add your rollback SQL here
-- Example:
-- DROP TABLE IF EXISTS example;`;

    await this.manager.generateMigration(name, upSql, downSql);
  }

  private async createBackup(name?: string): Promise<void> {
    console.log('💾 Creating database backup...');
    const backupName = await this.manager.createBackup(name);
    console.log(`✅ Backup created: ${backupName}`);
  }

  private showHelp(): void {
    console.log(`
🗃️  Database Migration CLI

Usage: migration <command> [options]

Commands:
  status              Show migration status
  up                  Run pending migrations
  down [steps]        Rollback migrations (default: 1 step)
  generate <name>     Generate new migration file
  backup [name]       Create database backup
  
Examples:
  migration status
  migration up
  migration down 2
  migration generate add_user_preferences
  migration backup before_deployment
`);
  }
}