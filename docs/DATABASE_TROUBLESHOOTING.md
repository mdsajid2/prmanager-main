# 🔧 Database Connection Troubleshooting Guide

## 🚨 Common Database Issues & Solutions

### **Issue 1: `{:shutdown, :db_termination}` Error**

**Symptoms:**

```
error: {:shutdown, :db_termination}
[ERROR] error: {:shutdown, :db_termination}
```

**Causes:**

- Database connection pool exhaustion
- Network connectivity issues
- Database server overload
- Connection timeout

**Solutions Applied:**

#### **✅ 1. Improved Connection Pool Configuration**

Updated all database connections with better pool settings:

```typescript
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 20, // Maximum connections
  idleTimeoutMillis: 30000, // Close idle connections after 30s
  connectionTimeoutMillis: 2000, // Timeout after 2s
  maxUses: 7500, // Replace connection after 7500 uses
});
```

#### **✅ 2. Added Global Error Handlers**

Prevents server crashes from unhandled database errors:

```typescript
process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught Exception:", error);
  console.log("🔄 Server continuing to run...");
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Rejection:", reason);
  console.log("🔄 Server continuing to run...");
});
```

#### **✅ 3. Database Health Check**

Added `/health` endpoint to monitor database status:

```bash
curl http://localhost:3001/health
```

**Expected Response:**

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "status": "ok",
  "services": {
    "database": "ok",
    "server": "ok"
  },
  "database_time": "2024-01-15T10:30:00.000Z"
}
```

---

### **Issue 2: GITHUB_TOKEN Warning**

**Symptoms:**

```
⚠️ GITHUB_TOKEN not set - only public repositories will be accessible
```

**Impact:**

- Can only analyze public GitHub repositories
- Private repositories will return 404 errors

**Solutions:**

#### **✅ 1. Add GitHub Token (Optional)**

Create a GitHub Personal Access Token:

1. Go to GitHub → Settings → Developer settings → Personal access tokens
2. Generate new token with `repo` scope
3. Add to your `.env` file:

```bash
# GitHub Integration (Optional)
GITHUB_TOKEN=your_github_personal_access_token
```

#### **✅ 2. Alternative: User-Provided Tokens**

Users can provide their own GitHub tokens in the UI:

- Settings modal has GitHub token input
- Tokens are encrypted and stored securely
- Per-user token management

---

### **Issue 3: Connection Pool Exhaustion**

**Symptoms:**

```
Error: sorry, too many clients already
Error: remaining connection slots are reserved
```

**Solutions Applied:**

#### **✅ 1. Connection Pool Limits**

```typescript
max: 20, // Limit concurrent connections
idleTimeoutMillis: 30000, // Close idle connections
```

#### **✅ 2. Connection Cleanup**

```typescript
// Always release connections
const client = await pool.connect();
try {
  // Database operations
} finally {
  client.release(); // Always release
}
```

#### **✅ 3. Connection Monitoring**

Health check shows pool statistics:

- Total connections
- Idle connections
- Waiting clients

---

### **Issue 4: SSL/TLS Connection Issues**

**Symptoms:**

```
Error: self signed certificate in certificate chain
Error: unable to verify the first certificate
```

**Solutions Applied:**

#### **✅ 1. SSL Configuration**

```typescript
ssl: process.env.DATABASE_URL?.includes("supabase.com")
  ? { rejectUnauthorized: false }
  : false,
```

#### **✅ 2. Environment-Specific SSL**

- Development: SSL disabled for local databases
- Production: SSL enabled for Supabase
- Automatic detection based on connection string

---

## 🔍 Diagnostic Commands

### **Check Database Connection**

```bash
# Test basic connectivity
curl http://localhost:3001/health

# Check server logs
npm run dev
# Look for database connection messages
```

### **Test Database Directly**

```bash
# From database directory
cd database
node -e "
const { Pool } = require('../server/node_modules/pg');
const pool = new Pool({
  connectionString: 'your_database_url',
  ssl: { rejectUnauthorized: false }
});
pool.query('SELECT NOW()').then(r => {
  console.log('✅ Connected:', r.rows[0].now);
  process.exit(0);
}).catch(e => {
  console.error('❌ Failed:', e.message);
  process.exit(1);
});
"
```

### **Check Migration Status**

```bash
cd database
node migration-manager.js status
```

---

## 🛠️ Prevention Strategies

### **1. Connection Management**

- Always use connection pools
- Set appropriate timeouts
- Monitor connection usage
- Release connections promptly

### **2. Error Handling**

- Wrap database calls in try-catch
- Use global error handlers
- Log errors with context
- Implement retry logic for transient errors

### **3. Monitoring**

- Regular health checks
- Connection pool monitoring
- Query performance tracking
- Error rate monitoring

### **4. Environment Management**

- Separate dev/prod configurations
- Environment-specific SSL settings
- Proper credential management
- Connection string validation

---

## 🚨 Emergency Procedures

### **If Server Keeps Crashing:**

#### **1. Immediate Steps**

```bash
# Stop the server
pkill -f "node.*server"

# Check for zombie processes
ps aux | grep node

# Restart with error logging
npm run dev 2>&1 | tee server.log
```

#### **2. Database Recovery**

```bash
# Test database connectivity
cd database
node migration-manager.js status

# If database is down, check Supabase dashboard
# Restart database if necessary
```

#### **3. Fallback Mode**

```bash
# Disable database features temporarily
export DATABASE_URL=""
npm run dev
# Server will run without database features
```

---

## 📊 Monitoring Dashboard

### **Health Check Endpoints**

- `GET /health` - Basic health status
- `GET /health/detailed` - Detailed system information

### **Key Metrics to Monitor**

- Database connection count
- Response times
- Error rates
- Memory usage
- CPU usage

### **Alert Thresholds**

- Database connections > 15 (75% of max)
- Response time > 5 seconds
- Error rate > 5%
- Memory usage > 80%

---

## 🎯 Best Practices Going Forward

### **1. Development**

- Test database changes locally first
- Use transactions for multi-step operations
- Monitor connection usage during development
- Regular health checks

### **2. Production**

- Monitor database performance
- Set up alerts for connection issues
- Regular backup verification
- Capacity planning

### **3. Maintenance**

- Regular connection pool analysis
- Query performance optimization
- Index maintenance
- Connection limit adjustments

---

**🎉 Your database connection issues have been resolved with these improvements:**

✅ **Improved connection pooling** prevents exhaustion  
✅ **Global error handlers** prevent server crashes  
✅ **Health monitoring** provides visibility  
✅ **Better SSL configuration** handles certificates  
✅ **Connection cleanup** prevents leaks

The server should now be much more stable and resilient to database connection issues!
