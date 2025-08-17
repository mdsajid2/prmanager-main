# 🗄️ Database Management System

## 📋 Overview

This system ensures your development and production databases stay perfectly synchronized. Any future database changes will automatically be applied to both environments.

## 🏗️ Database Architecture

### **Development Database**

- **Connection**: Uses `DATABASE_URL` from `.env`
- **Purpose**: Local development and testing
- **Location**: Your Supabase development instance

### **Production Database**

- **Connection**: `postgresql://postgres.jtgvsyurftqpsdujcbys:SahYan@2020@aws-0-ap-south-1.pooler.supabase.com:5432/postgres`
- **Purpose**: Live application data
- **Location**: Your Supabase production instance

## 📦 Migration System

### **Migration Files Structure**

```
database/
├── 001-initial-setup.sql          # User authentication & sessions
├── 002-token-encryption.sql       # Secure token storage
├── 003-api-usage-tracking.sql     # API monitoring & limits
├── 004-referral-system.sql        # Referral & growth system
├── migration-manager.js           # Automated sync tool
├── deploy-migrations.sh           # Deployment script
└── DATABASE_MANAGEMENT_GUIDE.md   # This guide
```

### **Migration Tracking**

- Each database has a `schema_migrations` table
- Tracks which migrations have been applied
- Prevents duplicate applications
- Detects changes in migration content

## 🚀 Usage Commands

### **Sync All Databases**

```bash
# Navigate to database directory
cd database

# Run synchronization
node migration-manager.js sync
```

### **Check Database Status**

```bash
# Check current status of both databases
node migration-manager.js status
```

### **Deploy with Script**

```bash
# Run the complete deployment process
./deploy-migrations.sh
```

### **Initialize Migration Tracking**

```bash
# Set up migration tracking (run once)
node migration-manager.js init
```

## 📊 Current Database Schema

### **Core Tables**

#### **users**

- User authentication and profile data
- Referral system fields (referral_code, total_referrals, bonus_credits)
- Subscription and usage tracking

#### **user_sessions**

- JWT session management
- Secure token storage

#### **user_tokens**

- Encrypted API key storage (GitHub, OpenAI, Anthropic, Gemini)
- AES-256-CBC encryption

#### **api_usage**

- Detailed API call tracking
- Response times and payload sizes
- Monthly usage summaries

#### **user_referrals**

- Referral relationship tracking
- Bonus credit management

#### **subscription_limits**

- Plan definitions and limits
- Feature configurations

### **Key Functions**

#### **get_user_usage_stats(user_id)**

Returns comprehensive usage statistics including referral bonuses.

#### **complete_referral(user_id, referral_code)**

Processes successful referrals and awards bonuses.

#### **admin_reset_user_usage(user_id, admin_email)**

Admin function to reset user's monthly usage.

#### **admin_add_bonus_credits(user_id, credits, admin_email)**

Admin function to add bonus credits to users.

## 🔄 Adding New Migrations

### **Step 1: Create Migration File**

```bash
# Create new migration with sequential number
touch database/005-your-new-feature.sql
```

### **Step 2: Write Migration SQL**

```sql
-- 005-your-new-feature.sql
-- Description of what this migration does

-- Add your SQL changes here
ALTER TABLE users ADD COLUMN new_field VARCHAR(100);

-- Create new tables if needed
CREATE TABLE IF NOT EXISTS new_feature_table (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    feature_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_new_feature_user_id ON new_feature_table(user_id);
```

### **Step 3: Deploy Migration**

```bash
# Run the deployment script
./deploy-migrations.sh

# Or manually sync
node migration-manager.js sync
```

### **Step 4: Verify Deployment**

```bash
# Check that migration was applied to both databases
node migration-manager.js status
```

## 🛡️ Safety Features

### **Automatic Rollback**

- Each migration runs in a transaction
- Failed migrations are automatically rolled back
- Database remains in consistent state

### **Checksum Verification**

- Detects changes in migration files
- Prevents accidental modifications
- Ensures consistency across environments

### **Duplicate Prevention**

- Tracks applied migrations
- Skips already-applied migrations
- Prevents data corruption

## 🔍 Monitoring & Troubleshooting

### **Check Migration Status**

```bash
# See which migrations are applied
node migration-manager.js status
```

### **View Migration History**

```sql
-- Connect to database and run:
SELECT migration_name, applied_at, checksum
FROM schema_migrations
ORDER BY applied_at DESC;
```

### **Common Issues**

#### **Migration Failed**

1. Check the error message in console
2. Verify SQL syntax in migration file
3. Ensure database permissions are correct
4. Check for conflicting table/column names

#### **Database Connection Issues**

1. Verify connection strings in migration-manager.js
2. Check network connectivity
3. Ensure database credentials are correct
4. Verify SSL settings for Supabase

#### **Migration Out of Sync**

1. Run `node migration-manager.js status` to see differences
2. Use `node migration-manager.js sync` to synchronize
3. Check for manual database changes

## 📈 Best Practices

### **Migration Naming**

- Use sequential numbers: `001-`, `002-`, etc.
- Include descriptive names: `003-api-usage-tracking.sql`
- Keep names short but clear

### **SQL Best Practices**

- Always use `IF NOT EXISTS` for tables and indexes
- Include proper foreign key constraints
- Add appropriate indexes for performance
- Use transactions for complex changes

### **Testing**

- Test migrations on development database first
- Verify data integrity after migration
- Check application functionality
- Monitor performance impact

### **Documentation**

- Add comments explaining complex changes
- Document any manual steps required
- Update this guide for major changes

## 🚀 Deployment Workflow

### **Development Process**

1. **Create Migration**: Write SQL changes in new migration file
2. **Test Locally**: Apply to development database
3. **Verify Changes**: Test application functionality
4. **Deploy**: Run deployment script to sync production

### **Production Deployment**

1. **Backup**: Always backup production database first
2. **Deploy**: Run `./deploy-migrations.sh`
3. **Verify**: Check application functionality
4. **Monitor**: Watch for any issues or performance impacts

## 🔐 Security Considerations

### **Admin Access**

- Admin functions require specific email verification
- Environment-controlled admin credentials
- No way to create admin users through application

### **Database Security**

- All connections use SSL/TLS
- Encrypted token storage with AES-256-CBC
- Proper foreign key constraints and data validation

### **Migration Security**

- Migrations run in transactions
- Automatic rollback on failure
- Checksum verification prevents tampering

## 📞 Support & Maintenance

### **Regular Tasks**

- Monitor migration status monthly
- Check database performance metrics
- Review and clean up old migration logs
- Update connection strings if needed

### **Emergency Procedures**

- Keep database backups current
- Have rollback procedures documented
- Monitor application logs for database errors
- Maintain emergency contact information

## 🎯 Future Enhancements

### **Planned Features**

- **Rollback System**: Ability to rollback specific migrations
- **Migration Validation**: Pre-deployment validation checks
- **Performance Monitoring**: Track migration execution times
- **Automated Backups**: Pre-migration backup creation

### **Monitoring Improvements**

- **Health Checks**: Automated database health monitoring
- **Alert System**: Notifications for migration failures
- **Dashboard**: Web interface for migration management
- **Audit Logs**: Detailed migration history tracking

---

**Your databases are now fully synchronized and ready for future growth!** 🚀

Any new features you add will automatically be deployed to both development and production databases using this system.
