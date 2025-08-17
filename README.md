# 🚀 PR Manager - Intelligent Pull Request Analysis

A comprehensive tool for analyzing GitHub pull requests with AI-powered insights, merge conflict detection, and intelligent recommendations.

## ✨ Features

- 🤖 **AI-Powered Analysis** - Intelligent code review and suggestions
- 🔍 **Merge Conflict Detection** - Advanced conflict analysis and resolution strategies
- 📊 **System Health Dashboard** - Real-time monitoring of application health
- 🔐 **Secure Token Storage** - Encrypted storage of GitHub and AI provider tokens
- 👥 **User Management** - Authentication, authorization, and usage tracking
- 📈 **Usage Analytics** - Comprehensive API usage monitoring and reporting
- 🎯 **Admin Panel** - Complete administrative control and user management

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database
- Git

### One-Command Deployment

```bash
# Clone the repository
git clone <repository-url>
cd prmanager

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Deploy safely with one command
./deploy.sh
```

### Interactive Deployment Menu

The `deploy.sh` script provides an interactive menu with options for:

1. **Full Safe Deployment** - Complete zero-downtime deployment
2. **Fix GitHub Token Storage** - Resolve token storage issues
3. **Fix System Health Dashboard** - Repair health monitoring
4. **Monitor Production Status** - Real-time system monitoring
5. **Emergency Rollback** - Automatic system restoration
6. **View Deployment Guide** - Comprehensive documentation
7. **Check System Health** - Detailed status information
8. **View Recent Logs** - Deployment and error logs

### Command Line Usage

```bash
# Quick deployments
./deploy.sh deploy          # Full deployment
./deploy.sh tokens          # Fix GitHub token storage
./deploy.sh health          # Fix system health dashboard
./deploy.sh monitor         # Check system status
./deploy.sh rollback        # Emergency rollback
./deploy.sh guide           # View deployment guide
./deploy.sh logs            # View recent logs
```

## 🛡️ Safety Features

### Zero-Downtime Deployment

- Starts new instance on alternate port
- Tests thoroughly before switching traffic
- Keeps old instance running until verification complete

### Automatic Rollback

- Creates comprehensive backups before changes
- Automatically restores on any failure
- Preserves working state at all times

### Comprehensive Testing

- Health checks on all critical endpoints
- Database connection verification
- Build integrity validation
- API functionality testing

## 📁 Project Structure

```
prmanager/
├── deploy.sh                        # Main deployment command center
├── DEPLOYMENT_GUIDE.md             # Comprehensive deployment guide
├── scripts/
│   ├── ultimate-safe-deploy.sh     # Master deployment script
│   ├── fix-github-token-storage.sh # Token storage fix
│   ├── final-system-health-fix.sh  # Health dashboard fix
│   ├── monitor-production.sh       # System monitoring
│   └── rollback-production.sh      # Emergency rollback
├── server/                         # Backend Node.js application
│   ├── src/
│   │   ├── routes/                 # API routes
│   │   ├── services/               # Business logic
│   │   └── index.ts               # Server entry point
│   └── package.json
├── web/                           # Frontend React application
│   ├── src/
│   │   ├── components/            # React components
│   │   ├── lib/                   # API clients
│   │   └── App.tsx               # Main app component
│   └── package.json
├── database/                      # Database migrations and setup
├── docs/                         # Additional documentation
├── .env                          # Environment configuration
└── .env.production.server        # Production configuration
```

## 🔧 Configuration

### Environment Variables (.env)

```bash
# Database
DATABASE_URL=postgresql://user:password@host:port/database

# Server
PORT=3001
NODE_ENV=development

# Security
JWT_SECRET=your-jwt-secret
ENCRYPTION_KEY=your-encryption-key

# AI Providers (Optional)
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key

# GitHub Integration (Optional)
GITHUB_TOKEN=your-github-token

# Admin Access
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=secure-password
```

### Production Configuration (.env.production.server)

```bash
NODE_ENV=production
PORT=8080
# ... other production-specific settings
```

## 🔗 API Endpoints

### Authentication

- `POST /api/auth/login` - User login
- `POST /api/auth/signup` - User registration
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Token Management

- `POST /api/tokens` - Store encrypted token
- `GET /api/tokens` - List user's stored tokens
- `DELETE /api/tokens/:id` - Delete stored token

### Analysis

- `POST /api/analyze` - Analyze pull request
- `GET /api/analyze/:id` - Get analysis results

### System Health

- `GET /health` - Basic server health
- `GET /api/system-health` - Comprehensive system health

### Admin

- `GET /api/admin/users` - List all users
- `GET /api/admin/usage` - Usage statistics
- `POST /api/admin/users/:id/update` - Update user

## 🎯 Usage Examples

### Analyzing a Pull Request

```javascript
// Using the web interface
1. Navigate to the dashboard
2. Enter GitHub repository URL
3. Select pull request
4. Click "Analyze"
5. Review AI-powered insights

// Using the API
const response = await fetch('/api/analyze', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    repoUrl: 'https://github.com/user/repo',
    prNumber: 123
  })
});
```

### Storing GitHub Token

```javascript
// Secure token storage
const response = await fetch("/api/tokens", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${authToken}`,
  },
  body: JSON.stringify({
    tokenType: "github",
    token: "ghp_your_token_here",
    tokenName: "My GitHub Token",
  }),
});
```

## 🚨 Troubleshooting

### Common Issues

#### Connection Refused Errors

```bash
# Check system status
./deploy.sh monitor

# Fix with full deployment
./deploy.sh deploy
```

#### GitHub Token Storage Fails

```bash
./deploy.sh tokens
```

#### System Health Shows "Database: UNHEALTHY"

```bash
./deploy.sh health
```

#### Build Failures

```bash
# Clean and rebuild
rm -rf node_modules server/node_modules web/node_modules
./deploy.sh deploy
```

### Emergency Recovery

```bash
# Complete system rollback
./deploy.sh rollback

# View recent logs for debugging
./deploy.sh logs
```

## 📊 Monitoring

### Health Check Endpoints

- `GET /health` - Basic server health (200 OK)
- `GET /api/auth/health` - Authentication service (200 OK)
- `GET /api/system-health` - Full system status (200 OK)
- `GET /api/tokens` - Token service (401 Unauthorized - requires auth)

### Log Files

- Deployment logs: `/tmp/deployment-YYYYMMDD-HHMMSS.log`
- Server logs: `server.log`, `server-8080.log`
- Error logs: Check console output and log files

### System Status

```bash
# Quick status check
./deploy.sh monitor

# Detailed health information
./deploy.sh 7  # Option 7 in interactive menu
```

## 🔐 Security

### Token Security

- All tokens encrypted using AES-256
- Stored securely in PostgreSQL database
- Never logged or exposed in API responses
- Automatic cleanup of expired tokens

### Authentication

- JWT-based authentication
- Secure password hashing with bcrypt
- Session management and timeout
- Role-based access control

### API Security

- Rate limiting on all endpoints
- Input validation and sanitization
- SQL injection prevention
- XSS protection

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Test thoroughly with `./deploy.sh deploy`
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Documentation

- [Deployment Guide](DEPLOYMENT_GUIDE.md) - Comprehensive deployment instructions
- [System Health Feature](SYSTEM_HEALTH_FEATURE.md) - Health monitoring details
- [Merge Strategies Guide](docs/MERGE_STRATEGIES_GUIDE.md) - Conflict resolution strategies

### Getting Help

1. Check the [Deployment Guide](DEPLOYMENT_GUIDE.md) for common solutions
2. Use `./deploy.sh guide` for interactive help
3. View logs with `./deploy.sh logs`
4. Check system status with `./deploy.sh monitor`

### Quick Commands Reference

```bash
./deploy.sh                    # Interactive deployment menu
./deploy.sh deploy            # Full safe deployment
./deploy.sh tokens            # Fix GitHub token storage
./deploy.sh health            # Fix system health dashboard
./deploy.sh monitor           # Check system status
./deploy.sh rollback          # Emergency rollback
./deploy.sh guide             # View deployment guide
./deploy.sh logs              # View recent logs
```

---

**Built with ❤️ for developers who want intelligent PR analysis with zero-downtime deployments and bulletproof reliability.**
