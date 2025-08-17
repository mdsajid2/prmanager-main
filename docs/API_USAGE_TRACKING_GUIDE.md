# 📊 API Usage Tracking System - Complete Implementation Guide

## 🎯 Overview

PR Manager now includes a comprehensive API usage tracking system that monitors user activity, enforces subscription limits, and provides real-time usage statistics. This system helps manage costs, prevent abuse, and encourage plan upgrades.

## 🏗️ System Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐    ┌──────────────────┐
│   Frontend      │    │    Backend       │    │   Database      │    │   Middleware     │
│   (React)       │    │   (Express)      │    │  (PostgreSQL)   │    │  (Tracking)      │
└─────────────────┘    └──────────────────┘    └─────────────────┘    └──────────────────┘
         │                        │                        │                        │
         │ 1. User makes request  │                        │                        │
         ├───────────────────────►│                        │                        │
         │                        │ 2. Check usage limits  │                        │
         │                        ├────────────────────────────────────────────────►│
         │                        │                        │ 3. Query usage stats   │
         │                        │                        │◄───────────────────────┤
         │                        │◄───────────────────────┤                        │
         │                        │ 4. Allow/Deny request  │                        │
         │                        │ 5. Process request     │                        │
         │                        │ 6. Track API call      │                        │
         │                        ├────────────────────────────────────────────────►│
         │                        │                        │ 7. Store usage data    │
         │                        │                        │◄───────────────────────┤
         │ 8. Response + headers  │                        │                        │
         │◄───────────────────────┤                        │                        │
```

## 📋 Features Implemented

### **1. Real-Time Usage Tracking**

- ✅ Track every API call with detailed metadata
- ✅ Monitor response times and payload sizes
- ✅ Store IP addresses and user agents for security
- ✅ Automatic monthly usage summaries

### **2. Subscription Management**

- ✅ Three-tier subscription system (Free, Pro, Enterprise)
- ✅ Configurable limits per plan
- ✅ Automatic limit enforcement
- ✅ Upgrade/downgrade functionality

### **3. Usage Limit Enforcement**

- ✅ Pre-request limit checking
- ✅ Graceful limit exceeded responses
- ✅ Specific limits for analyze endpoint
- ✅ Fail-open design for reliability

### **4. Dashboard Integration**

- ✅ Prominent usage display on dashboard
- ✅ Real-time usage statistics
- ✅ Visual progress bars and indicators
- ✅ Upgrade prompts and modals

### **5. Settings Integration**

- ✅ Compact usage stats in settings modal
- ✅ Plan comparison and upgrade options
- ✅ Usage history and analytics

## 🗄️ Database Schema

### **Core Tables**

#### **api_usage**

```sql
CREATE TABLE api_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    endpoint VARCHAR(100) NOT NULL,
    method VARCHAR(10) NOT NULL,
    status_code INTEGER NOT NULL,
    response_time_ms INTEGER,
    ip_address INET,
    user_agent TEXT,
    request_size INTEGER,
    response_size INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    month_year VARCHAR(7) NOT NULL DEFAULT TO_CHAR(CURRENT_DATE, 'YYYY-MM')
);
```

#### **monthly_usage_summary**

```sql
CREATE TABLE monthly_usage_summary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    month_year VARCHAR(7) NOT NULL,
    total_calls INTEGER DEFAULT 0,
    analyze_calls INTEGER DEFAULT 0,
    auth_calls INTEGER DEFAULT 0,
    other_calls INTEGER DEFAULT 0,
    total_response_time_ms BIGINT DEFAULT 0,
    avg_response_time_ms INTEGER DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, month_year)
);
```

#### **subscription_limits**

```sql
CREATE TABLE subscription_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_name VARCHAR(50) UNIQUE NOT NULL,
    monthly_api_limit INTEGER NOT NULL,
    analyze_limit INTEGER NOT NULL,
    features JSONB,
    price_monthly DECIMAL(10,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### **Default Subscription Plans**

| Plan           | Monthly API Limit | Analyze Limit | Price  | Features                                              |
| -------------- | ----------------- | ------------- | ------ | ----------------------------------------------------- |
| **Free**       | 50                | 10            | $0     | Basic PR analysis, Community support                  |
| **Pro**        | 500               | 100           | $9.99  | Advanced analysis, Priority support, Custom templates |
| **Enterprise** | 5000              | 1000          | $49.99 | Enterprise features, Dedicated support, SSO           |

## 🔧 Backend Implementation

### **1. Usage Tracking Service**

```typescript
// server/src/services/usage-tracker.ts
export class UsageTracker {
  static async trackApiCall(record: ApiUsageRecord): Promise<void>;
  static async getUserUsageStats(userId: string): Promise<UsageStats | null>;
  static async checkUsageLimit(
    userId: string,
    endpoint: string
  ): Promise<LimitCheck>;
  static async updateSubscriptionPlan(
    userId: string,
    planName: string
  ): Promise<boolean>;
  static async getSubscriptionPlans(): Promise<SubscriptionPlan[]>;
  static async resetMonthlyUsage(userId: string): Promise<boolean>;
}
```

### **2. Usage Tracking Middleware**

```typescript
// server/src/middleware/usage-tracking.ts
export const trackApiUsage = () => {
  /* Track all API calls */
};
export const checkUsageLimit = () => {
  /* Enforce usage limits */
};
export const addUsageHeaders = () => {
  /* Add usage info to headers */
};
```

### **3. Usage API Routes**

```typescript
// server/src/routes/usage.ts
GET / api / usage / stats; // Get current user's usage statistics
GET / api / usage / plans; // Get available subscription plans
POST / api / usage / upgrade; // Upgrade user's subscription plan
GET / api / usage / history; // Get usage history (last 6 months)
POST / api / usage / reset; // Reset monthly usage (dev/admin only)
```

## 🎨 Frontend Implementation

### **1. Usage API Service**

```typescript
// web/src/lib/usage-api.ts
export class UsageAPI {
  async getUsageStats(): Promise<UsageStats>;
  async getSubscriptionPlans(): Promise<SubscriptionPlan[]>;
  async upgradeSubscription(planName: string): Promise<UpgradeResult>;
  async getUsageHistory(): Promise<UsageHistory[]>;
  async resetUsage(): Promise<ResetResult>;
}
```

### **2. Usage Stats Component**

```typescript
// web/src/components/UsageStats.tsx
export const UsageStats: React.FC<UsageStatsProps> = ({
  className,
  showUpgradeButton,
  compact,
}) => {
  // Real-time usage display with progress bars
  // Upgrade modal with plan comparison
  // Usage status messages and warnings
};
```

### **3. Dashboard Integration**

- Prominent usage stats display
- Visual progress indicators
- Upgrade prompts when approaching limits
- Real-time updates

### **4. Settings Modal Integration**

- Compact usage overview
- Plan comparison modal
- Upgrade functionality
- Usage history access

## 📊 Usage Statistics Interface

### **UsageStats Object**

```typescript
interface UsageStats {
  currentMonthCalls: number; // Total API calls this month
  currentMonthAnalyzeCalls: number; // Analyze calls this month
  subscriptionPlan: string; // Current plan name
  monthlyLimit: number; // Total monthly API limit
  analyzeLimit: number; // Monthly analyze limit
  callsRemaining: number; // Remaining API calls
  analyzeRemaining: number; // Remaining analyze calls
  usagePercentage: number; // Usage percentage (0-100)
  daysUntilReset: number; // Days until monthly reset
  isNearLimit: boolean; // True if usage >= 80%
  isOverLimit: boolean; // True if usage >= 100%
  canUpgrade: boolean; // True if user can upgrade
  resetDate: string; // Next reset date (ISO string)
  currentMonth: string; // Current month (YYYY-MM)
  lastUpdated: string; // Last update timestamp
}
```

## 🚀 API Endpoints

### **GET /api/usage/stats**

Get current user's usage statistics.

**Response:**

```json
{
  \"currentMonthCalls\": 25,
  \"currentMonthAnalyzeCalls\": 8,
  \"subscriptionPlan\": \"free\",
  \"monthlyLimit\": 50,
  \"analyzeLimit\": 10,
  \"callsRemaining\": 25,
  \"analyzeRemaining\": 2,
  \"usagePercentage\": 80.0,
  \"daysUntilReset\": 15,
  \"isNearLimit\": true,
  \"isOverLimit\": false,
  \"canUpgrade\": true,
  \"resetDate\": \"2024-02-01T00:00:00.000Z\",
  \"currentMonth\": \"2024-01\",
  \"lastUpdated\": \"2024-01-15T10:30:00.000Z\"
}
```

### **GET /api/usage/plans**

Get available subscription plans.

**Response:**

```json
{
  \"plans\": [
    {
      \"id\": \"plan-uuid-1\",
      \"name\": \"free\",
      \"monthlyLimit\": 50,
      \"analyzeLimit\": 10,
      \"price\": 0,
      \"features\": [\"Basic PR analysis\", \"10 analyses/month\", \"Community support\"],
      \"isPopular\": false,
      \"isEnterprise\": false
    },
    {
      \"id\": \"plan-uuid-2\",
      \"name\": \"pro\",
      \"monthlyLimit\": 500,
      \"analyzeLimit\": 100,
      \"price\": 9.99,
      \"features\": [\"Advanced PR analysis\", \"100 analyses/month\", \"Priority support\"],
      \"isPopular\": true,
      \"isEnterprise\": false
    }
  ]
}
```

### **POST /api/usage/upgrade**

Upgrade user's subscription plan.

**Request:**

```json
{
  \"planName\": \"pro\"
}
```

**Response:**

```json
{
  \"message\": \"Subscription updated successfully\",
  \"newPlan\": \"pro\",
  \"stats\": { /* Updated usage stats */ }
}
```

## 🛡️ Security & Rate Limiting

### **Usage Limit Enforcement**

```typescript
// Middleware checks limits before processing expensive operations
if (stats.currentMonthAnalyzeCalls >= stats.analyzeLimit) {
  return res.status(429).json({
    error: "Usage limit exceeded",
    message:
      "Monthly analysis limit exceeded (10 analyses). Upgrade your plan for more analyses.",
    stats: stats,
    upgradeUrl: "/pricing",
  });
}
```

### **Response Headers**

```
X-Usage-Current: 8
X-Usage-Limit: 10
X-Usage-Remaining: 2
X-Usage-Percentage: 80.0
X-Usage-Reset-Days: 15
```

## 📈 Analytics & Monitoring

### **Database Functions**

#### **get_user_usage_stats(user_id)**

Returns comprehensive usage statistics for a user.

#### **user_usage_overview**

View for monitoring all users' usage patterns.

### **Usage Tracking**

- Every API call is tracked with metadata
- Automatic monthly summaries via database triggers
- Real-time usage calculations
- Performance metrics (response times, payload sizes)

### **Admin Monitoring**

```sql
-- Find users approaching limits
SELECT * FROM user_usage_overview
WHERE usage_percentage >= 80
ORDER BY usage_percentage DESC;

-- Monthly usage trends
SELECT month_year, AVG(usage_percentage) as avg_usage
FROM monthly_usage_summary
GROUP BY month_year
ORDER BY month_year DESC;
```

## 🔄 Monthly Reset Process

### **Automatic Reset**

- Usage resets automatically on the 1st of each month
- Database triggers maintain monthly summaries
- Users see countdown to next reset

### **Manual Reset (Development)**

```typescript
// POST /api/usage/reset (dev/admin only)
await usageAPI.resetUsage();
```

## 🎯 User Experience Flow

### **1. New User (Free Plan)**

1. User signs up → Automatically assigned \"free\" plan
2. Gets 10 analyses per month
3. Dashboard shows usage: \"2/10 analyses used\"
4. Settings show upgrade options

### **2. Approaching Limit**

1. User reaches 8/10 analyses
2. Dashboard shows orange warning: \"80% used\"
3. Prominent \"Upgrade Plan\" button appears
4. Settings modal shows upgrade options

### **3. Limit Exceeded**

1. User tries 11th analysis
2. Gets 429 error with upgrade message
3. Dashboard shows red \"Limit Exceeded\" message
4. All analyze requests blocked until upgrade or reset

### **4. Plan Upgrade**

1. User clicks \"Upgrade to Pro\"
2. Plan comparison modal opens
3. User selects Pro plan → Instant upgrade
4. New limits take effect immediately
5. Success message: \"Upgraded to Pro! 100 analyses/month\"

## 🚀 Deployment Steps

### **1. Database Setup**

```sql
-- Run the API usage tracking SQL script
\\i database/api-usage-tracking.sql
```

### **2. Environment Variables**

```bash
# Add to .env
DATABASE_URL=your_postgresql_connection_string
ENCRYPTION_KEY=your_32_byte_hex_key
```

### **3. Server Deployment**

```bash
cd server
npm run build
npm start
```

### **4. Frontend Deployment**

```bash
cd web
npm run build
# Deploy dist/ folder to your hosting service
```

## 📊 Monitoring Dashboard

### **Key Metrics to Track**

- **Daily Active Users**: Users making API calls
- **Usage Distribution**: Free vs Pro vs Enterprise usage
- **Conversion Rate**: Free → Pro upgrade rate
- **API Performance**: Average response times
- **Limit Violations**: Users hitting limits

### **Alerts to Set Up**

- High error rates (429 responses)
- Unusual usage spikes
- Database connection issues
- Failed upgrade attempts

## 🎉 Success Metrics

### **Business Metrics**

- **Conversion Rate**: % of free users upgrading
- **Revenue Growth**: Monthly recurring revenue
- **User Retention**: Users staying within limits
- **Support Reduction**: Fewer \"why was I blocked\" tickets

### **Technical Metrics**

- **API Reliability**: 99.9% uptime
- **Response Times**: <200ms average
- **Database Performance**: Query times <50ms
- **Error Rates**: <0.1% failed requests

## 🔮 Future Enhancements

### **Planned Features**

- **Usage Analytics Dashboard**: Detailed charts and trends
- **Custom Plan Creation**: Admin-defined plans
- **Usage Alerts**: Email notifications at 80% usage
- **API Key Management**: Per-key usage tracking
- **Webhook Integration**: Usage events to external systems

### **Advanced Features**

- **Usage Forecasting**: Predict when users will hit limits
- **Smart Upgrade Prompts**: ML-based upgrade timing
- **Team Plans**: Shared usage pools
- **Usage Credits**: Rollover unused analyses

## 📝 Summary

The API Usage Tracking System provides:

✅ **Complete Usage Monitoring** - Track every API call with detailed metadata  
✅ **Flexible Subscription Management** - Three-tier plans with configurable limits  
✅ **Real-Time Enforcement** - Prevent abuse with pre-request limit checking  
✅ **Excellent User Experience** - Clear usage display and upgrade prompts  
✅ **Comprehensive Analytics** - Database functions for monitoring and reporting  
✅ **Production Ready** - Robust error handling and fail-open design

**Your API usage tracking system is now live and ready to drive subscription growth!** 🚀📊
