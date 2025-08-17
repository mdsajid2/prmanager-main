const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Database configurations
const databases = {
  development: {
    name: 'Development',
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('supabase.com') ? { rejectUnauthorized: false } : false
  },
  production: {
    name: 'Production',
    connectionString: 'postgresql://postgres.jtgvsyurftqpsdujcbys:SahYan@2020@aws-0-ap-south-1.pooler.supabase.com:5432/postgres',
    ssl: { rejectUnauthorized: false }
  }
};

// Migration tracking table
const MIGRATION_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS schema_migrations (
    id SERIAL PRIMARY KEY,
    migration_name VARCHAR(255) UNIQUE NOT NULL,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    checksum VARCHAR(64) NOT NULL
  );
`;

class MigrationManager {
  constructor() {
    this.pools = {};
    this.migrationDir = path.resolve(__dirname, '../database');
    
    // Initialize database pools
    for (const [env, config] of Object.entries(databases)) {
      this.pools[env] = new Pool({
        connectionString: config.connectionString,
        ssl: config.ssl
      });
    }
  }

  async initializeMigrationTracking() {
    console.log('🔧 Initializing migration tracking...');
    
    for (const [env, pool] of Object.entries(this.pools)) {
      const client = await pool.connect();
      try {
        await client.query(MIGRATION_TABLE_SQL);
        console.log(`✅ Migration tracking initialized for ${databases[env].name}`);
      } catch (error) {
        console.error(`❌ Failed to initialize migration tracking for ${databases[env].name}:`, error.message);
      } finally {
        client.release();
      }
    }
  }

  async getMigrationFiles() {
    const files = fs.readdirSync(this.migrationDir)
      .filter(file => file.endsWith('.sql') && file.match(/^\d{3}-/))
      .sort();
    
    return files.map(file => ({
      name: file,
      path: path.join(this.migrationDir, file),
      content: fs.readFileSync(path.join(this.migrationDir, file), 'utf8')
    }));
  }

  generateChecksum(content) {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  async getAppliedMigrations(env) {
    const client = await this.pools[env].connect();
    try {
      const result = await client.query('SELECT migration_name, checksum FROM schema_migrations ORDER BY applied_at');
      return result.rows;
    } catch (error) {
      console.error(`Error getting applied migrations for ${databases[env].name}:`, error.message);
      return [];
    } finally {
      client.release();
    }
  }

  async applyMigration(env, migration) {
    const client = await this.pools[env].connect();
    try {
      await client.query('BEGIN');
      
      // Apply the migration
      await client.query(migration.content);
      
      // Record the migration
      const checksum = this.generateChecksum(migration.content);
      await client.query(
        'INSERT INTO schema_migrations (migration_name, checksum) VALUES ($1, $2) ON CONFLICT (migration_name) DO UPDATE SET checksum = $2, applied_at = CURRENT_TIMESTAMP',
        [migration.name, checksum]
      );
      
      await client.query('COMMIT');
      console.log(`✅ Applied migration ${migration.name} to ${databases[env].name}`);
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`❌ Failed to apply migration ${migration.name} to ${databases[env].name}:`, error.message);
      return false;
    } finally {
      client.release();
    }
  }

  async syncDatabases() {
    console.log('🚀 Starting database synchronization...');
    
    await this.initializeMigrationTracking();
    
    const migrations = await this.getMigrationFiles();
    console.log(`📁 Found ${migrations.length} migration files`);
    
    for (const [env, pool] of Object.entries(this.pools)) {
      console.log(`\n🔄 Syncing ${databases[env].name} database...`);
      
      const appliedMigrations = await this.getAppliedMigrations(env);
      const appliedNames = appliedMigrations.map(m => m.migration_name);
      
      for (const migration of migrations) {
        const currentChecksum = this.generateChecksum(migration.content);
        const appliedMigration = appliedMigrations.find(m => m.migration_name === migration.name);
        
        if (!appliedMigration) {
          // New migration
          console.log(`📦 Applying new migration: ${migration.name}`);
          await this.applyMigration(env, migration);
        } else if (appliedMigration.checksum !== currentChecksum) {
          // Migration content changed
          console.log(`🔄 Updating changed migration: ${migration.name}`);
          await this.applyMigration(env, migration);
        } else {
          console.log(`✅ Migration ${migration.name} already applied and up to date`);
        }
      }
    }
    
    console.log('\n🎉 Database synchronization completed!');
  }

  async checkDatabaseStatus() {
    console.log('🔍 Checking database status...');
    
    for (const [env, pool] of Object.entries(this.pools)) {
      const client = await pool.connect();
      try {
        console.log(`\n📊 ${databases[env].name} Database Status:`);
        
        // Test connection
        const timeResult = await client.query('SELECT NOW()');
        console.log(`✅ Connected at: ${timeResult.rows[0].now}`);
        
        // Check applied migrations
        const migrations = await client.query('SELECT COUNT(*) FROM schema_migrations');
        console.log(`📦 Applied migrations: ${migrations.rows[0].count}`);
        
        // Check key tables
        const tables = await client.query(`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name IN ('users', 'user_referrals', 'api_usage', 'subscription_limits')
          ORDER BY table_name
        `);
        console.log(`📋 Key tables: ${tables.rows.map(t => t.table_name).join(', ')}`);
        
        // Check user count
        const userCount = await client.query('SELECT COUNT(*) FROM users');
        console.log(`👥 Total users: ${userCount.rows[0].count}`);
        
        // Check referral system
        try {
          const referralCount = await client.query('SELECT COUNT(*) FROM users WHERE total_referrals > 0');
          console.log(`🔗 Users with referrals: ${referralCount.rows[0].count}`);
        } catch (error) {
          console.log(`❌ Referral system not ready: ${error.message}`);
        }
        
      } catch (error) {
        console.error(`❌ Error checking ${databases[env].name}:`, error.message);
      } finally {
        client.release();
      }
    }
  }

  async closeConnections() {
    for (const [env, pool] of Object.entries(this.pools)) {
      await pool.end();
    }
  }
}

// CLI interface
async function main() {
  const manager = new MigrationManager();
  const command = process.argv[2] || 'sync';
  
  try {
    switch (command) {
      case 'sync':
        await manager.syncDatabases();
        break;
      case 'status':
        await manager.checkDatabaseStatus();
        break;
      case 'init':
        await manager.initializeMigrationTracking();
        break;
      default:
        console.log('Usage: node migration-manager.js [sync|status|init]');
        console.log('  sync   - Synchronize all databases with migration files');
        console.log('  status - Check status of all databases');
        console.log('  init   - Initialize migration tracking tables');
    }
  } catch (error) {
    console.error('❌ Migration manager error:', error);
  } finally {
    await manager.closeConnections();
  }
}

if (require.main === module) {
  main();
}

module.exports = MigrationManager;