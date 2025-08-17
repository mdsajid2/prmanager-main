# 🛠️ Admin Access & Usage Tab Troubleshooting Guide

## 🔑 **How to Access Admin Page**

### **Method 1: Direct URL Access**

1. **Login** with admin credentials:

   - Email: `mdsajid8636@gmail.com`
   - Password: `SahYan@2020`

2. **Navigate to Admin URL**:
   ```
   http://localhost:3001/admin
   ```
   Or in production:
   ```
   https://your-domain.com/admin
   ```

### **Method 2: Admin Button (New)**

1. **Login** with admin credentials
2. **Look for the purple "🛠️ Admin" button** in the dashboard header
3. **Click the Admin button** to access the admin panel

### **Method 3: Manual Navigation**

1. **Login** with admin credentials
2. **Manually change the URL** in your browser to `/admin`
3. **Press Enter** to navigate

---

## 🔍 **Admin Page Features**

### **User Management**

- View all registered users
- See usage statistics for each user
- Monitor referral activity
- Track bonus credits and multipliers

### **Admin Actions**

- **Reset User Usage**: Clear monthly API usage for any user
- **Add Bonus Credits**: Manually add credits to user accounts
- **Platform Analytics**: View total users, referrals, and usage stats

### **Real-Time Monitoring**

- Current usage vs limits for all users
- Referral system activity
- Platform growth metrics

---

## 📊 **API Usage Tab Not Showing - Troubleshooting**

### **Common Issues & Solutions**

#### **Issue 1: Authentication Required**

**Symptoms:**

- Usage tab shows "Authentication required" error
- API calls return 401 Unauthorized

**Solution:**

1. **Ensure you're logged in** with a valid account
2. **Check browser console** for authentication errors
3. **Try logging out and back in**

#### **Issue 2: Database Connection Issues**

**Symptoms:**

- Usage tab shows "Failed to load usage stats"
- Console shows database connection errors

**Solution:**

1. **Check server logs** for database errors
2. **Verify database is running**:
   ```bash
   curl http://localhost:3001/health
   ```
3. **Expected health response**:
   ```json
   {
     "status": "ok",
     "services": {
       "database": "ok",
       "server": "ok"
     }
   }
   ```

#### **Issue 3: Missing Migration**

**Symptoms:**

- Usage tab loads but shows no data
- Console shows "table does not exist" errors

**Solution:**

1. **Run database migrations**:
   ```bash
   cd database
   ./sync-databases.sh
   ```
2. **Verify tables exist**:
   ```bash
   node migration-manager.js status
   ```

#### **Issue 4: API Endpoint Not Found**

**Symptoms:**

- Usage tab shows "Not Found" error
- Network tab shows 404 errors for `/api/usage/stats`

**Solution:**

1. **Check server is running**:
   ```bash
   curl http://localhost:3001/api/usage/plans
   ```
2. **Restart the server**:
   ```bash
   cd server
   npm run dev
   ```

---

## 🔧 **Step-by-Step Debugging**

### **Step 1: Check Server Status**

```bash
# Test server health
curl http://localhost:3001/health

# Expected response:
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "status": "ok",
  "services": {
    "database": "ok",
    "server": "ok"
  }
}
```

### **Step 2: Test Usage API Endpoints**

```bash
# Test plans endpoint (no auth required)
curl http://localhost:3001/api/usage/plans

# Expected response:
{
  "plans": [
    {
      "name": "free",
      "analyzeLimit": 10,
      "price": 0
    }
  ]
}
```

### **Step 3: Check Authentication**

1. **Open browser developer tools** (F12)
2. **Go to Application/Storage tab**
3. **Check for `auth_token` in localStorage**
4. **If missing, log in again**

### **Step 4: Check Database Tables**

```bash
cd database
node migration-manager.js status

# Look for these tables:
# ✅ users: EXISTS
# ✅ api_usage: EXISTS
# ✅ monthly_usage_summary: EXISTS
# ✅ subscription_limits: EXISTS
# ✅ user_referrals: EXISTS
```

### **Step 5: Check Browser Console**

1. **Open developer tools** (F12)
2. **Go to Console tab**
3. **Look for error messages** when clicking Usage tab
4. **Common errors and solutions**:

```javascript
// Error: Failed to fetch usage stats: Not Found
// Solution: Check if server is running and routes are registered

// Error: Failed to fetch usage stats: Unauthorized
// Solution: Log out and log back in

// Error: Failed to load usage stats: Network error
// Solution: Check server is running on correct port
```

---

## 🚀 **Quick Fixes**

### **Fix 1: Restart Everything**

```bash
# Stop all processes
pkill -f "node.*server"

# Restart server
cd server
npm run dev

# In another terminal, rebuild frontend
cd web
npm run build
```

### **Fix 2: Clear Browser Cache**

1. **Open developer tools** (F12)
2. **Right-click refresh button**
3. **Select "Empty Cache and Hard Reload"**

### **Fix 3: Reset Database**

```bash
cd database
./sync-databases.sh
```

### **Fix 4: Check Environment Variables**

```bash
# Verify .env file has required variables
cat .env | grep -E "(DATABASE_URL|ADMIN_EMAIL|JWT_SECRET)"

# Should show:
# DATABASE_URL=postgresql://...
# ADMIN_EMAIL=mdsajid8636@gmail.com
# JWT_SECRET=...
```

---

## 📱 **Testing the Complete Flow**

### **Test Admin Access:**

1. **Login** with `mdsajid8636@gmail.com` / `SahYan@2020`
2. **Look for purple "🛠️ Admin" button** in header
3. **Click Admin button** or go to `/admin`
4. **Verify admin panel loads** with user list

### **Test Usage Tab:**

1. **Login** with any user account
2. **Analyze a PR** to generate some usage data
3. **Click on "📊 API Usage" tab** in results
4. **Verify usage stats display** with progress bars

### **Test Referral System:**

1. **Go to Usage tab**
2. **Click "🔗 Get Your Referral Link"**
3. **Copy referral link**
4. **Test link works** by opening in incognito window

---

## 🎯 **Expected Behavior**

### **Admin Panel Should Show:**

- List of all users with their stats
- Total platform statistics
- Admin action buttons (Reset Usage, Add Credits)
- Real-time usage monitoring

### **Usage Tab Should Show:**

- Current month's API usage (e.g., "8/10 analyses")
- Visual progress bar with color coding
- Referral system information
- Days until reset
- "Get Your Referral Link" button

---

## 🆘 **If Nothing Works**

### **Emergency Reset:**

```bash
# 1. Stop all processes
pkill -f node

# 2. Clean everything
cd web && rm -rf node_modules dist
cd ../server && rm -rf node_modules dist

# 3. Reinstall
cd .. && npm run install:all

# 4. Rebuild
cd server && npm run build
cd ../web && npm run build

# 5. Reset database
cd ../database && ./sync-databases.sh

# 6. Restart server
cd ../server && npm run dev
```

### **Contact Information:**

If you're still having issues:

1. **Check server logs** for specific error messages
2. **Check browser console** for frontend errors
3. **Verify database connectivity** with health endpoint
4. **Ensure all environment variables** are set correctly

---

## ✅ **Success Indicators**

### **Admin Access Working:**

- Purple "🛠️ Admin" button visible in dashboard
- `/admin` URL loads admin panel
- User list displays with statistics
- Admin actions work (reset usage, add credits)

### **Usage Tab Working:**

- "📊 API Usage" tab visible in results
- Usage statistics load and display
- Progress bars show correct percentages
- Referral system functions properly

**Your admin panel and usage tracking should now be fully functional!** 🎉
