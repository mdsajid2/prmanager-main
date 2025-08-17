# 🗄️ Database Migration System - Step-by-Step Usage Guide

## 📋 Overview

This guide provides complete step-by-step instructions for using the database migration system to keep your development and production databases synchronized.

## 🎯 What This System Does

- **Automatically syncs** development and production databases
- **Tracks applied migrations** to prevent duplicates
- **Ensures data consistency** across environments
- **Provides rollback safety** with transaction-based migrations
- **Maintains version control** of all database changes

## 📁 File Structure

```
database/
├── 001-initial-setup.sql          # User authentication & sessions
├── 002-token-encryption.sql       # Secure token storage
├── 003-api-usage-tracking.sql     # API monitoring & limits
├── 004-referral-system.sql        # Referral & growth system
├── migration-manager.js           # Core migration tool
├── sync-databases.sh              # Quick sync script
├── deploy-migrations.sh           # Full deployment script
└── MIGRATION_USAGE_GUIDE.md       # This guide
```

## 🚀 Quick Start (Most Common Use Case)

### **Step 1: Navigate to Database Directory**

```bash
cd database
```

### **Step 2: Run Quick Sync**

```bash
./sync-databases.sh
```

### **Step 3: Verify Success**

Look for the success message:

```
🎉 Both databases are now synchronized and ready!
```

**That's it!** Your databases are now synchronized.

---

## 📖 Detailed Step-by-Step Instructions

### **🔍 Scenario 1: Check Current Database Status**

**When to use:** Before making changes, or to verify current state

#### **Step 1: Navigate to Database Directory**

```bash
cd database
```

#### **Step 2: Check Status**

```bash
node migration-manager.js status
```

#### **Step 3: Review Output**

You'll see something like:

```
📊 Development Database Status:
✅ Connected at: [timestamp]
📦 Applied migrations: 4
📋 Key tables: api_usage, subscription_limits, user_referrals, users
👥 Total users: 6

📊 Production Database Status:
✅ Connected at: [timestamp]
📦 Applied migrations: 4
📋 Key tables: api_usage, subscription_limits, user_referrals, users
👥 Total users: 3
```

#### **What This Tells You:**

- ✅ **Connected**: Database is accessible
- **Applied migrations**: Number of migrations successfully applied
- **Key tables**: Important tables that exist
- **Total users**: Current user count

---

### **🔄 Scenario 2: Synchronize Databases (Quick Method)**

**When to use:** Regular sync, after pulling code changes, or initial setup

#### **Step 1: Navigate to Database Directory**

```bash
cd database
```

#### **Step 2: Run Quick Sync Script**

```bash
./sync-databases.sh
```

#### **Step 3: Monitor Output**

The script will:

1. Show sync progress for each database
2. Apply any missing migrations
3. Display final status
4. Show success confirmation

#### **Expected Output:**

```
🚀 Synchronizing Development and Production Databases...

🚀 Starting database synchronization...
🔧 Initializing migration tracking...
✅ Migration tracking initialized for Development
✅ Migration tracking initialized for Production
📁 Found 4 migration files

🔄 Syncing Development database...
✅ Migration 001-initial-setup.sql already applied and up to date
✅ Migration 002-token-encryption.sql already applied and up to date
✅ Migration 003-api-usage-tracking.sql already applied and up to date
✅ Migration 004-referral-system.sql already applied and up to date

🔄 Syncing Production database...
✅ Migration 001-initial-setup.sql already applied and up to date
✅ Migration 002-token-encryption.sql already applied and up to date
✅ Migration 003-api-usage-tracking.sql already applied and up to date
✅ Migration 004-referral-system.sql already applied and up to date

🎉 Database synchronization completed!
```

---

### **🔄 Scenario 3: Synchronize Databases (Manual Method)**

**When to use:** When you need more control or want to see detailed output

#### **Step 1: Navigate to Database Directory**

```bash
cd database
```

#### **Step 2: Run Migration Manager**

```bash
node migration-manager.js sync
```

#### **Step 3: Check Results**

```bash
node migration-manager.js status
```

---

### **🔄 Scenario 4: Full Deployment with Confirmation**

**When to use:** Production deployments or when you want confirmation prompts

#### **Step 1: Navigate to Database Directory**

```bash
cd database
```

#### **Step 2: Run Full Deployment Script**

```bash
./deploy-migrations.sh
```

#### **Step 3: Follow Prompts**

The script will:

1. Show current database status
2. Ask for confirmation: `Do you want to proceed with database synchronization? (y/N):`
3. Type `y` and press Enter to continue
4. Apply migrations
5. Show final verification

---

### **➕ Scenario 5: Adding New Database Changes**

**When to use:** Adding new features, tables, columns, or functions

#### **Step 1: Navigate to Database Directory**

```bash
cd database
```

#### **Step 2: Create New Migration File**

```bash
# Use the next sequential number (e.g., if last is 004, use 005)
touch 005-your-feature-name.sql
```

#### **Step 3: Edit the Migration File**

```bash
# Open in your preferred editor
nano 005-your-feature-name.sql
# or
code 005-your-feature-name.sql
```

#### **Step 4: Write Your SQL Changes**

```sql
-- 005-your-feature-name.sql
-- Description: Add new feature for [describe what it does]

-- Example: Add a new table
CREATE TABLE IF NOT EXISTS new_feature_table (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    feature_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Example: Add a new column
ALTER TABLE users ADD COLUMN IF NOT EXISTS new_field VARCHAR(100);

-- Example: Create an index
CREATE INDEX IF NOT EXISTS idx_new_feature_user_id ON new_feature_table(user_id);

-- Example: Create a function
CREATE OR REPLACE FUNCTION get_user_feature_data(p_user_id UUID)
RETURNS TABLE(feature_data JSONB) AS $$
BEGIN
    RETURN QUERY
    SELECT nft.feature_data
    FROM new_feature_table nft
    WHERE nft.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;
```

#### **Step 5: Apply the Migration**

```bash
./sync-databases.sh
```

#### **Step 6: Verify the Changes**

```bash
node migration-manager.js status
```

You should see the migration count increased by 1 for both databases.

---

### **🔧 Scenario 6: Initialize Migration Tracking (One-Time Setup)**

**When to use:** Setting up the system for the first time on new databases

#### **Step 1: Navigate to Database Directory**

```bash
cd database
```

#### **Step 2: Initialize Migration Tracking**

```bash
node migration-manager.js init
```

#### **Step 3: Verify Initialization**

```bash
node migration-manager.js status
```

---

## ⚠️ Important Safety Guidelines

### **Before Making Changes:**

1. **Always backup** your production database
2. **Test migrations** on development first
3. **Review SQL carefully** for syntax errors
4. **Use transactions** for complex changes

### **Migration File Best Practices:**

1. **Use sequential numbering**: 001, 002, 003, etc.
2. **Include descriptive names**: `005-add-user-preferences.sql`
3. **Add comments**: Explain what the migration does
4. **Use IF NOT EXISTS**: Prevents errors on re-runs
5. **Include rollback notes**: Document how to undo changes if needed

### **SQL Safety Rules:**

```sql
-- ✅ GOOD: Safe patterns
CREATE TABLE IF NOT EXISTS new_table (...);
ALTER TABLE users ADD COLUMN IF NOT EXISTS new_field VARCHAR(100);
CREATE INDEX IF NOT EXISTS idx_name ON table(column);

-- ❌ AVOID: Unsafe patterns
CREATE TABLE new_table (...);  -- Will fail if exists
DROP TABLE old_table;          -- Permanent data loss
ALTER TABLE users DROP COLUMN old_field;  -- Data loss
```

---

## 🐛 Troubleshooting

### **Problem: Migration Failed**

```
❌ Failed to apply migration 005-new-feature.sql to Development: syntax error
```

**Solution:**

1. Check the SQL syntax in your migration file
2. Test the SQL manually in a database client
3. Fix the syntax error
4. Run the sync again

### **Problem: Database Connection Failed**

```
❌ Error checking Development: connection refused
```

**Solution:**

1. Check your `.env` file has correct `DATABASE_URL`
2. Verify database is running and accessible
3. Check network connectivity
4. Verify credentials are correct

### **Problem: Permission Denied**

```
❌ Failed to apply migration: permission denied for table users
```

**Solution:**

1. Verify database user has necessary permissions
2. Check if you're using the correct database credentials
3. Ensure the database user can CREATE, ALTER, and INSERT

### **Problem: Migration Already Applied**

```
✅ Migration 005-new-feature.sql already applied and up to date
```

**This is normal!** The system automatically skips already-applied migrations.

### **Problem: Function Already Exists**

```
❌ Failed to apply migration: function already exists
```

**Solution:**
Use `CREATE OR REPLACE FUNCTION` instead of `CREATE FUNCTION`:

```sql
-- ✅ GOOD
CREATE OR REPLACE FUNCTION my_function() ...

-- ❌ AVOID
CREATE FUNCTION my_function() ...
```

---

## 📊 Understanding the Output

### **Migration Status Symbols:**

- ✅ **Success**: Operation completed successfully
- ❌ **Error**: Operation failed (check error message)
- 📦 **New**: Applying a new migration
- 🔄 **Update**: Updating a changed migration
- 📊 **Status**: Showing database information

### **Database Information:**

- **Connected at**: Confirms database is accessible
- **Applied migrations**: Number of successful migrations
- **Key tables**: Important tables that exist
- **Total users**: Current user count
- **Users with referrals**: Referral system activity

---

## 🎯 Common Use Cases

### **Daily Development:**

```bash
cd database && ./sync-databases.sh
```

### **After Pulling Code:**

```bash
cd database && ./sync-databases.sh
```

### **Before Production Deploy:**

```bash
cd database && ./deploy-migrations.sh
```

### **Adding New Feature:**

```bash
cd database
touch 005-new-feature.sql
# Edit the file with your changes
./sync-databases.sh
```

### **Checking System Health:**

```bash
cd database && node migration-manager.js status
```

---

## 📞 Quick Reference Commands

| Command                            | Purpose                      | When to Use                           |
| ---------------------------------- | ---------------------------- | ------------------------------------- |
| `./sync-databases.sh`              | Quick sync both databases    | Daily development, after code changes |
| `node migration-manager.js status` | Check database status        | Before changes, troubleshooting       |
| `node migration-manager.js sync`   | Manual sync                  | When you need detailed output         |
| `./deploy-migrations.sh`           | Full deployment with prompts | Production deployments                |
| `node migration-manager.js init`   | Initialize tracking          | First-time setup only                 |

---

## 🎉 Success Indicators

### **Successful Sync:**

```
🎉 Database synchronization completed!
✅ Both databases are now synchronized and ready!
```

### **Healthy Database Status:**

```
✅ Connected at: [recent timestamp]
📦 Applied migrations: [expected number]
📋 Key tables: api_usage, subscription_limits, user_referrals, users
```

### **New Migration Applied:**

```
📦 Applying new migration: 005-new-feature.sql
✅ Applied migration 005-new-feature.sql to Development
✅ Applied migration 005-new-feature.sql to Production
```

---

**🎯 Remember:** This system ensures your development and production databases stay perfectly synchronized. Any changes you make will be automatically applied to both environments, maintaining consistency and reliability across your entire platform.

**Need help?** Check the troubleshooting section above or review the error messages for specific guidance.
