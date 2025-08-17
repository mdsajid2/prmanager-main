# 🔍 System Health Monitoring Feature

## Overview

Added comprehensive system health monitoring to the Admin dashboard, providing real-time insights into system performance, database health, and service status.

## 🎯 Features

### **Real-time System Metrics**

- **CPU Usage**: Live CPU utilization with load averages
- **Memory Usage**: RAM consumption with available/used breakdown
- **Disk Usage**: Storage utilization with free space monitoring
- **Service Status**: PM2 process health, uptime, and restart count

### **Database Health Monitoring**

- **Connection Status**: Database connectivity and response times
- **Active Connections**: Current vs maximum connection usage
- **Database Size**: Total database storage consumption
- **Table Statistics**: Individual table sizes and operation counts
- **Error Tracking**: Recent database errors and issues

### **Application Health Checks**

- **Feature Status**: Enabled/disabled features and their configuration
- **Endpoint Testing**: Automated health checks for critical API endpoints
- **Version Information**: Application version and environment details
- **Service Uptime**: Process uptime and restart history

### **Visual Dashboard**

- **Status Indicators**: Color-coded health status (healthy/degraded/unhealthy)
- **Progress Bars**: Visual representation of resource usage
- **Real-time Updates**: Auto-refresh every 30 seconds
- **Interactive Controls**: Manual refresh and auto-refresh toggle

## 🏗️ Technical Implementation

### **Backend Components**

#### **SystemHealthService** (`server/src/services/system-health.ts`)

```typescript
// Key methods:
- getSystemMetrics(): SystemMetrics
- getDatabaseHealth(): DatabaseHealth
- getServiceHealth(): ServiceHealth
- getApplicationHealth(): ApplicationHealth
- getCompleteHealthReport(): HealthReport
```

#### **System Health API** (`server/src/routes/system-health.ts`)

```typescript
// Endpoints:
GET / api / admin / system - health; // Complete health report
GET / api / admin / system - health / metrics; // System metrics only
GET / api / admin / system - health / database; // Database health only
GET / api / admin / system - health / service; // Service health only
GET / api / admin / system - health / application; // App health only
```

### **Frontend Components**

#### **SystemHealthDashboard** (`web/src/components/SystemHealthDashboard.tsx`)

- Real-time monitoring dashboard
- Interactive charts and progress bars
- Auto-refresh functionality
- Error handling and loading states

#### **Enhanced AdminPanel** (`web/src/components/AdminPanel.tsx`)

- Added tabbed interface
- System Health tab integration
- Maintains existing user management functionality

## 📊 Monitoring Capabilities

### **System Resources**

- CPU usage percentage and load averages
- Memory usage (total, used, free, percentage)
- Disk space utilization and available storage
- System uptime and platform information

### **Database Performance**

- Connection response times
- Active vs maximum connections
- Database size and growth tracking
- Table-level statistics and operations
- Error detection and reporting

### **Service Health**

- PM2 process status (online/offline/error)
- Service uptime and restart count
- Memory and CPU usage by service
- Last restart timestamp

### **Application Status**

- Feature availability (Database, AI, GitHub, Auth, Referrals)
- Endpoint response testing
- Version and environment information
- Configuration validation

## 🚨 Health Status Levels

### **Healthy** ✅

- All systems operational
- Response times < 1000ms
- Resource usage < 75%
- No recent errors

### **Degraded** ⚠️

- Some performance issues
- Response times 1000-5000ms
- Resource usage 75-90%
- Minor issues detected

### **Unhealthy** ❌

- Critical issues present
- Response times > 5000ms
- Resource usage > 90%
- Service offline or errors

## 🔐 Security & Access

### **Admin-Only Access**

- Requires admin email authentication
- Protected API endpoints
- Secure token validation
- No sensitive data exposure

### **Safe Monitoring**

- Read-only operations
- No system modification capabilities
- Secure database queries
- Error handling prevents crashes

## 📈 Usage Examples

### **Accessing System Health**

1. Login as admin user
2. Navigate to Admin Panel
3. Click "System Health" tab
4. View real-time metrics and status

### **Monitoring Alerts**

- Red indicators for critical issues
- Yellow warnings for performance degradation
- Green status for healthy systems
- Automatic refresh for live monitoring

### **Troubleshooting**

- Check service status for restart issues
- Monitor database connections for performance
- Review endpoint health for API problems
- Track resource usage for capacity planning

## 🔧 Configuration

### **Environment Variables**

```bash
# Required for full functionality
DATABASE_URL=postgresql://...     # Database monitoring
ADMIN_EMAIL=admin@example.com     # Admin access control
JWT_SECRET=your-secret            # Authentication
```

### **Dependencies**

- Node.js `os` module for system metrics
- PostgreSQL client for database health
- PM2 for service monitoring
- Fetch API for endpoint testing

## 🚀 Deployment

The system health feature is included in the main deployment script:

```bash
# Deploy with system health monitoring
sudo ./scripts/deploy-production.sh
```

### **Verification**

After deployment, verify the feature works:

1. Login as admin
2. Access Admin Panel → System Health tab
3. Confirm all metrics are displaying
4. Test auto-refresh functionality

## 📋 Maintenance

### **Regular Monitoring**

- Check system health daily
- Monitor resource trends
- Review database performance
- Track service restart patterns

### **Capacity Planning**

- Monitor disk usage growth
- Track memory consumption trends
- Plan for database scaling
- Optimize resource allocation

## 🎯 Benefits

### **For Administrators**

- **Proactive Monitoring**: Identify issues before they impact users
- **Performance Insights**: Understand system resource utilization
- **Troubleshooting**: Quick diagnosis of system problems
- **Capacity Planning**: Data-driven infrastructure decisions

### **For Operations**

- **Real-time Visibility**: Live system status and metrics
- **Automated Alerts**: Visual indicators for system health
- **Historical Tracking**: Monitor trends and patterns
- **Centralized Dashboard**: Single view of system status

### **For Users**

- **Better Uptime**: Proactive issue detection and resolution
- **Improved Performance**: Optimized resource allocation
- **Reliable Service**: Monitoring prevents service degradation
- **Transparent Status**: Clear system health visibility

## 🔮 Future Enhancements

### **Potential Additions**

- Historical metrics storage and trending
- Email/SMS alerts for critical issues
- Custom threshold configuration
- Performance benchmarking
- Log aggregation and analysis
- Integration with external monitoring tools

### **Scalability**

- Multi-server monitoring support
- Load balancer health checks
- Container orchestration metrics
- Cloud provider integration
- Microservices monitoring

---

**The system health monitoring feature provides comprehensive visibility into your PR Manager deployment, enabling proactive maintenance and optimal performance.** 🚀
