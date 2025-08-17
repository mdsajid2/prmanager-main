# 📁 PR Manager - Project Structure

## 🏗️ Clean & Organized Directory Structure

```
pr-manager/
├── 📁 server/                    # Backend API (Express + TypeScript)
│   ├── src/
│   │   ├── routes/              # API endpoints
│   │   │   ├── auth.ts          # Authentication (login, signup, sessions)
│   │   │   ├── usage.ts         # API usage tracking & stats
│   │   │   ├── admin.ts         # Admin panel functionality
│   │   │   ├── tokens.ts        # Encrypted token management
│   │   │   ├── analyze.ts       # PR analysis engine
│   │   │   └── health.ts        # System health monitoring
│   │   ├── services/            # Business logic
│   │   │   ├── auth.ts          # User authentication service
│   │   │   ├── encryption.ts    # AES-256-CBC token encryption
│   │   │   ├── usage-tracker.ts # API usage monitoring
│   │   │   ├── github.ts        # GitHub API integration
│   │   │   ├── ai.ts           # AI provider integrations
│   │   │   └── heuristics.ts   # Risk assessment algorithms
│   │   ├── middleware/          # Express middleware
│   │   │   └── usage-tracking.ts # API usage tracking middleware
│   │   ├── utils/              # Utility functions
│   │   │   └── database.ts     # Database connection utilities
│   │   └── schemas.ts          # Zod validation schemas
│   ├── migration-manager.js    # Database migration tool
│   └── package.json           # Server dependencies
│
├── 📁 web/                      # Frontend (React + TypeScript)
│   ├── src/
│   │   ├── components/         # React components
│   │   │   ├── Dashboard.tsx   # Main dashboard with usage stats
│   │   │   ├── AdminPanel.tsx  # Admin management interface
│   │   │   ├── UsageTab.tsx    # API usage & referral system
│   │   │   ├── SettingsModal.tsx # User settings & token storage
│   │   │   ├── ResultsTabs.tsx # PR analysis results display
│   │   │   └── [other components]
│   │   ├── lib/               # API clients
│   │   │   ├── auth-api.ts    # Authentication API client
│   │   │   ├── usage-api.ts   # Usage tracking API client
│   │   │   ├── tokens-api.ts  # Token management API client
│   │   │   └── api.ts         # Main analysis API client
│   │   ├── contexts/          # React contexts
│   │   │   └── AuthContext.tsx # Authentication state management
│   │   └── styles.css         # Global styles
│   ├── dist/                  # Built frontend files
│   └── package.json          # Frontend dependencies
│
├── 📁 database/                 # Database migrations & management
│   ├── 001-initial-setup.sql   # User authentication & sessions
│   ├── 002-token-encryption.sql # Secure token storage
│   ├── 003-api-usage-tracking.sql # API monitoring & limits
│   ├── 004-referral-system.sql # Referral & growth system
│   ├── migration-manager.js    # Automated migration tool
│   ├── sync-databases.sh      # Quick database sync script
│   └── MIGRATION_USAGE_GUIDE.md # Migration system documentation
│
├── 📁 docs/                     # Documentation
│   ├── README.md               # Main project documentation
│   ├── API_USAGE_TRACKING_GUIDE.md # Usage tracking system guide
│   ├── DATABASE_MANAGEMENT_GUIDE.md # Database management guide
│   ├── ADMIN_ACCESS_GUIDE.md   # Admin panel access guide
│   ├── CORS_TROUBLESHOOTING.md # CORS issue troubleshooting
│   ├── AWS_DEPLOYMENT_GUIDE.md # AWS deployment instructions
│   ├── EC2_DEPLOYMENT_GUIDE.md # EC2 deployment instructions
│   ├── PRODUCTION_DEPLOYMENT.md # Production deployment guide
│   ├── CONVERSATION_SUMMARY.md # Implementation conversation log
│   └── [other documentation files]
│
├── 📁 scripts/                  # Deployment & utility scripts
│   ├── deploy.sh              # Main deployment script
│   ├── build-and-deploy.sh    # Build and deploy in one command
│   ├── health-check.sh        # System health verification
│   ├── setup-cloudfront.sh    # CloudFront CDN setup
│   ├── generate-keys.sh       # Encryption key generation
│   ├── docker-compose.yml     # Docker container configuration
│   ├── Dockerfile            # Docker image definition
│   ├── serverless.yml        # Serverless deployment config
│   └── [other deployment scripts]
│
├── 📁 shared/                   # Shared TypeScript types
│   └── types.ts               # Common interfaces and types
│
├── 📄 .env                      # Environment variables (development)
├── 📄 .env.production          # Production environment variables
├── 📄 .gitignore              # Git ignore rules
├── 📄 package.json            # Root package with workspace scripts
└── 📄 package-lock.json       # Dependency lock file
```

## 🎯 **Key Directories Explained**

### **📁 `/server` - Backend API**

- **Express.js server** with TypeScript
- **PostgreSQL database** integration with Supabase
- **JWT authentication** and session management
- **AES-256-CBC encryption** for token storage
- **API usage tracking** and limit enforcement
- **Admin panel** functionality

### **📁 `/web` - Frontend Application**

- **React 18** with TypeScript and Vite
- **Tailwind CSS** for styling
- **Real-time usage tracking** and referral system
- **Secure token management** with user choice storage
- **Admin panel** for platform management

### **📁 `/database` - Database Management**

- **Migration system** for dev/prod synchronization
- **SQL migration files** with sequential numbering
- **Automated deployment** tools
- **Database utilities** and management scripts

### **📁 `/docs` - Documentation**

- **Complete guides** for all system features
- **Troubleshooting documentation** for common issues
- **Deployment instructions** for various platforms
- **API documentation** and usage examples

### **📁 `/scripts` - Automation Scripts**

- **Deployment scripts** for AWS, EC2, and other platforms
- **Health check utilities** for monitoring
- **Database management** tools
- **Development utilities** and test scripts

## 🚀 **Benefits of This Organization**

### **✅ Clean Root Directory**

- Only essential files in root (package.json, .env, .gitignore)
- Easy to navigate and understand project structure
- Professional appearance for open source projects

### **✅ Logical Grouping**

- All documentation in one place (`/docs`)
- All scripts organized by purpose (`/scripts`)
- Clear separation of concerns
- Easy to find specific files

### **✅ Scalable Structure**

- Easy to add new documentation
- Simple to add new deployment scripts
- Clear patterns for new developers
- Maintainable long-term

### **✅ Professional Standards**

- Follows industry best practices
- Clear naming conventions
- Organized for team collaboration
- Ready for open source contributions

## 📋 **Quick Navigation**

### **📖 Documentation**

```bash
ls docs/                    # View all documentation
cat docs/README.md         # Main project documentation
cat docs/ADMIN_ACCESS_GUIDE.md # Admin panel guide
```

### **🚀 Deployment**

```bash
ls scripts/                # View all scripts
./scripts/deploy.sh        # Deploy to production
./scripts/health-check.sh  # Check system health
```

### **🗄️ Database**

```bash
cd database               # Database management
./sync-databases.sh       # Sync dev/prod databases
node migration-manager.js status # Check migration status
```

---

**🎉 Your project structure is now clean, organized, and professional!**

The root directory only contains essential files, while all documentation and scripts are properly organized in their respective folders.
