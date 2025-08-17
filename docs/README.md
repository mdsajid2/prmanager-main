# 🚀 PR Manager - Enterprise AI-Powered Pull Request Analysis

A comprehensive web application that analyzes GitHub pull requests and diffs to provide explainable risk assessments, reviewer checklists, targeted questions for authors, missing test identification, and execution-ready test plans. Now with **enterprise-grade token encryption** and **comprehensive API usage tracking**.

## ✨ Key Features

### 🔍 **Smart PR Analysis**

- **Risk Assessment**: Automated scoring (0-100) with detailed explanations
- **Security Analysis**: Identifies auth, crypto, payment, and API changes
- **Test Planning**: Unit, integration, and manual test recommendations
- **Reviewer Checklists**: Blocking and non-blocking items tailored to each PR
- **GitHub Integration**: Fetch PR data and post review comments
- **One-Click Merge** _(Coming Soon)_: Merge PRs directly from PR Manager - no screen switching!
- **Offline Mode**: Analyze pasted diffs without GitHub access

### 🔐 **Enterprise Security**

- **AES-256-CBC Token Encryption**: Industry-standard encryption for all API keys
- **Multi-Token Support**: GitHub, OpenAI, Anthropic, and Gemini tokens
- **User Choice Storage**: Temporary (session) or persistent (encrypted database)
- **Audit Trail**: Complete token usage tracking and monitoring
- **Zero-Knowledge Architecture**: Tokens encrypted before database storage

### 📊 **API Usage Tracking**

- **Real-Time Monitoring**: Track every API call with detailed metadata
- **Subscription Management**: Three-tier plans (Free, Pro, Enterprise)
- **Usage Limits**: Automatic enforcement with graceful degradation
- **Visual Dashboard**: Progress bars, usage stats, and upgrade prompts
- **Analytics**: Response times, payload sizes, and usage patterns

### 🎨 **Modern User Experience**

- **Clean Interface**: Responsive design built with React and Tailwind
- **Real-Time Updates**: Live usage statistics and notifications
- **Dark/Light Themes**: Multiple theme options with user preferences
- **Mobile Responsive**: Works seamlessly on all devices
- **Accessibility**: WCAG compliant components and interactions

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend       │    │   Database      │
│   (React)       │    │   (Express)      │    │  (PostgreSQL)   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                        │
         │ HTTPS requests         │ Encrypted connection   │
         ├───────────────────────►│◄──────────────────────►│
         │                        │                        │
         │ • Token encryption     │ • AES-256-CBC          │
         │ • Usage tracking       │ • Usage monitoring     │
         │ • Real-time updates    │ • Limit enforcement    │
```

## 🚀 Quick Start

### 1. **Install Dependencies**

```bash
npm run install:all
```

### 2. **Set Up Environment**

```bash
cp .env.example .env
# Edit .env with your configuration
```

### 3. **Database Setup**

```bash
# Run database migrations
psql -d your_database -f database/add-encrypted-tokens.sql
psql -d your_database -f database/api-usage-tracking.sql
```

### 4. **Start Development Servers**

```bash
npm run dev
```

### 5. **Open Your Browser**

- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:3001

## ⚙️ Environment Configuration

### **Required Variables**

```bash
# Database (Required for token encryption & usage tracking)
DATABASE_URL=postgresql://user:pass@host:port/db?sslmode=require

# Encryption (Required for token storage)
ENCRYPTION_KEY=your_64_character_hex_string_for_aes_256

# JWT Authentication (Required)
JWT_SECRET=your_jwt_secret_key
```

### **Optional AI Provider Keys**

```bash
# System AI Keys (Optional - for server-side analysis)
OPENAI_API_KEY=sk-your_openai_key
ANTHROPIC_API_KEY=sk-ant-your_anthropic_key
GEMINI_API_KEY=your_gemini_key

# GitHub Integration (Optional)
GITHUB_CLIENT_ID=your_github_oauth_client_id
GITHUB_CLIENT_SECRET=your_github_oauth_client_secret
```

### **Server Configuration**

```bash
# Server Settings
PORT=3001
NODE_ENV=production
CORS_ORIGIN=https://your-domain.com
```

## 🔐 Security Implementation

### **Token Encryption System**

#### **🛡️ AES-256-CBC Encryption**

- **Algorithm**: Advanced Encryption Standard with 256-bit keys
- **Mode**: Cipher Block Chaining with unique IVs
- **Key Management**: Environment-based secure key storage
- **User Isolation**: Per-user encrypted token storage

#### **🔑 Supported Token Types**

1. **GitHub Personal Access Tokens**
   - Classic tokens (`ghp_...`)
   - Fine-grained tokens (`github_pat_...`)
2. **AI Provider API Keys**
   - OpenAI (`sk-...`)
   - Anthropic (`sk-ant-...`)
   - Google Gemini (`AIza...`)

#### **📊 Token Storage Options**

- **Temporary**: Session-only storage (cleared on logout)
- **Persistent**: Encrypted database storage with AES-256-CBC
- **User Choice**: Clear UI for storage preference selection

### **API Security Features**

- **JWT Authentication**: Secure user session management
- **Rate Limiting**: Usage-based request throttling
- **Input Validation**: Comprehensive request sanitization
- **SQL Injection Prevention**: Parameterized queries only
- **CORS Protection**: Configurable origin restrictions

## 📊 Subscription Plans & Usage Tracking

### **Subscription Tiers**

| Plan           | Monthly API Limit | Analyze Limit | Price        | Features                                              |
| -------------- | ----------------- | ------------- | ------------ | ----------------------------------------------------- |
| **Free**       | 50 calls          | 10 analyses   | $0/month     | Basic PR analysis, Community support                  |
| **Pro**        | 500 calls         | 100 analyses  | $9.99/month  | Advanced analysis, Priority support, Custom templates |
| **Enterprise** | 5000 calls        | 1000 analyses | $49.99/month | Enterprise features, Dedicated support, SSO           |

### **Usage Tracking Features**

- **Real-Time Monitoring**: Live usage statistics on dashboard
- **Visual Progress Bars**: Color-coded usage indicators (green/orange/red)
- **Automatic Limit Enforcement**: Graceful 429 responses when limits exceeded
- **Usage Analytics**: Response times, payload sizes, endpoint usage
- **Monthly Reset**: Automatic usage reset on 1st of each month

### **Upgrade Experience**

- **One-Click Upgrades**: Instant plan activation
- **Plan Comparison**: Feature matrix with pricing
- **Usage Warnings**: Proactive notifications at 80% usage
- **Seamless Billing**: Integrated subscription management

## 🎯 AI Provider Options

### **Option 1: OpenAI GPT-4 (Recommended)**

- **Cost**: ~$0.01-0.03 per analysis
- **Quality**: Excellent for code analysis and security detection
- **Setup**: Get API key from [OpenAI Platform](https://platform.openai.com/api-keys)
- **Features**: Advanced reasoning, security pattern detection

### **Option 2: Anthropic Claude**

- **Cost**: ~$0.01-0.02 per analysis
- **Quality**: Great for detailed analysis and explanations
- **Setup**: Get API key from [Anthropic Console](https://console.anthropic.com/)
- **Features**: Long context, detailed reasoning

### **Option 3: Google Gemini**

- **Cost**: Free tier available, then ~$0.001-0.01 per analysis
- **Quality**: Good for basic analysis and cost optimization
- **Setup**: Get API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
- **Features**: Multimodal capabilities, cost-effective

### **Option 4: System Keys (Default)**

- **Cost**: Included in subscription
- **Quality**: Consistent, optimized analysis
- **Setup**: No user API key needed
- **Features**: Managed service, no key management required

## 📱 Usage Guide

### **Getting Started**

1. **Sign Up**: Create account with email/password or GitHub OAuth
2. **Choose Storage**: Select temporary or persistent token storage
3. **Add Tokens**: Store GitHub and AI provider tokens securely
4. **Start Analyzing**: Paste PR URLs or diffs for analysis

### **Analyzing GitHub PRs**

1. **Paste PR URL**: `https://github.com/owner/repo/pull/123`
2. **Authentication**: Uses your stored GitHub token automatically
3. **Analysis**: AI-powered risk assessment and recommendations
4. **Results**: Risk score, checklist, tests, and ready-to-post comments

### **Analyzing Diffs**

1. **Switch Mode**: Toggle to "Paste Diff" mode
2. **Paste Content**: Any unified diff (git diff output)
3. **Offline Analysis**: Works without GitHub API access
4. **Full Results**: Same comprehensive analysis as PR mode

### **Managing Usage**

1. **Dashboard**: View current usage with visual progress bars
2. **Limits**: See remaining analyses and API calls
3. **Upgrades**: One-click plan upgrades when approaching limits
4. **History**: Track usage patterns and trends

## 🛠️ API Endpoints

### **Analysis Endpoints**

- `POST /api/analyze` - Analyze PR or diff with usage tracking
- `POST /api/comment` - Post review comment to GitHub
- `GET /health` - System health check

### **Authentication Endpoints**

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login with JWT
- `POST /api/auth/logout` - Secure logout
- `GET /api/auth/me` - Get current user info

### **Token Management Endpoints**

- `POST /api/tokens` - Store encrypted token
- `GET /api/tokens` - List user's stored tokens
- `DELETE /api/tokens/:id` - Delete stored token

### **Usage Tracking Endpoints**

- `GET /api/usage/stats` - Current usage statistics
- `GET /api/usage/plans` - Available subscription plans
- `POST /api/usage/upgrade` - Upgrade subscription plan
- `GET /api/usage/history` - Usage history and analytics

## 🏗️ Development

### **Project Structure**

```
pr-manager/
├── server/                 # Backend API (Express + TypeScript)
│   ├── src/
│   │   ├── routes/        # API endpoints
│   │   ├── services/      # Business logic
│   │   ├── middleware/    # Usage tracking, auth
│   │   └── schemas.ts     # Validation schemas
├── web/                   # Frontend (React + TypeScript)
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── lib/          # API clients
│   │   └── contexts/     # React contexts
├── database/              # SQL migration scripts
├── shared/               # Shared TypeScript types
└── docs/                # Documentation
```

### **Available Scripts**

```bash
# Development
npm run dev              # Start both frontend and backend
npm run server:dev       # Start backend only
npm run web:dev         # Start frontend only

# Building
npm run build           # Build both frontend and backend
npm run server:build    # Build backend only
npm run web:build      # Build frontend only

# Database
npm run db:migrate     # Run database migrations
npm run db:seed       # Seed with sample data

# Testing
npm run test          # Run all tests
npm run test:server   # Run backend tests
npm run test:web     # Run frontend tests
```

### **Key Technologies**

#### **Backend Stack**

- **Express.js**: Fast, unopinionated web framework
- **TypeScript**: Type-safe JavaScript development
- **PostgreSQL**: Robust relational database
- **Zod**: Runtime type validation
- **JWT**: Secure authentication tokens
- **Node.js Crypto**: Built-in encryption capabilities

#### **Frontend Stack**

- **React 18**: Modern UI library with hooks
- **TypeScript**: Type-safe component development
- **Vite**: Fast build tool and dev server
- **Tailwind CSS**: Utility-first CSS framework
- **Axios**: Promise-based HTTP client
- **React Router**: Client-side routing

## 📊 Risk Assessment Engine

### **Analysis Dimensions**

- **Size Impact**: Line count, file count, complexity
- **Security Risk**: Auth, crypto, payment-related changes
- **Database Changes**: Schema migrations, data modifications
- **API Surface**: Public interface modifications
- **Dependencies**: Major version bumps, new packages
- **Test Coverage**: Missing tests, test quality

### **Risk Levels**

- **Low (0-29)**: Minor changes, well-tested
- **Medium (30-59)**: Moderate impact, some risk
- **High (60-100)**: Major changes, significant risk

### **Smart Detection**

- **Security Patterns**: Authentication, authorization, encryption
- **Payment Processing**: Stripe, PayPal, billing logic
- **Database Operations**: Migrations, data access patterns
- **API Changes**: Breaking changes, new endpoints
- **Performance Impact**: N+1 queries, large data operations

## 🔍 Monitoring & Analytics

### **Usage Metrics**

- **API Call Volume**: Requests per day/month
- **Response Times**: Average and 95th percentile
- **Error Rates**: Failed requests and reasons
- **User Activity**: Active users, retention rates
- **Conversion Metrics**: Free to paid upgrades

### **Security Monitoring**

- **Token Usage**: Frequency and patterns
- **Failed Authentication**: Invalid attempts
- **Encryption Performance**: Operation timing
- **Database Security**: Query patterns, access logs

### **Business Intelligence**

- **Subscription Analytics**: Plan distribution, churn rates
- **Feature Usage**: Most used analysis features
- **Performance Optimization**: Slow queries, bottlenecks
- **User Feedback**: Support tickets, feature requests

## 🚀 Production Deployment

### **Recommended Architecture**

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   CloudFront    │    │      EC2         │    │   Supabase      │
│   (CDN/SSL)     │    │   (Backend)      │    │  (Database)     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                        │
         │ Static Assets          │ API Requests           │
         │ React App              │ Token Encryption       │
         │ SSL Termination        │ Usage Tracking         │
```

### **Deployment Scripts**

- `./deploy.sh` - Complete deployment script
- `./build-and-deploy.sh` - Build and deploy in one command
- `./health-check.sh` - Post-deployment health verification

### **Environment Setup**

- **SSL/TLS**: Automatic HTTPS with Let's Encrypt
- **Database**: Managed PostgreSQL with Supabase
- **CDN**: CloudFront for global asset delivery
- **Monitoring**: CloudWatch for logs and metrics

## 🔒 Security Best Practices

### **For Users**

- **Token Permissions**: Create tokens with minimal required scopes
- **Regular Rotation**: Rotate API keys every 3-6 months
- **Monitor Usage**: Check token usage in provider dashboards
- **Secure Storage**: Choose persistent storage for convenience

### **For Administrators**

- **Key Rotation**: Rotate encryption keys annually
- **Access Monitoring**: Monitor database access patterns
- **Backup Security**: Ensure backups are encrypted
- **Audit Logs**: Regular security audits and reviews

### **System Security**

- **Encryption at Rest**: All tokens encrypted in database
- **Encryption in Transit**: HTTPS/TLS for all communications
- **Input Validation**: Comprehensive request sanitization
- **Rate Limiting**: Prevent abuse and DoS attacks

## 📈 Performance Optimization

### **Caching Strategy**

- **LRU Cache**: In-memory caching for frequent requests
- **Database Indexing**: Optimized queries for usage tracking
- **CDN Caching**: Static asset delivery optimization
- **API Response Caching**: Reduce redundant AI API calls

### **Database Optimization**

- **Connection Pooling**: Efficient database connections
- **Query Optimization**: Indexed queries for fast lookups
- **Batch Operations**: Efficient bulk data operations
- **Monitoring**: Query performance tracking

## 🤝 Contributing

### **Development Setup**

1. **Fork Repository**: Create your own fork
2. **Clone Locally**: `git clone your-fork-url`
3. **Install Dependencies**: `npm run install:all`
4. **Set Up Database**: Run migration scripts
5. **Configure Environment**: Copy and edit `.env`
6. **Start Development**: `npm run dev`

### **Contribution Guidelines**

- **Code Style**: Follow TypeScript and React best practices
- **Testing**: Add tests for new features
- **Documentation**: Update docs for API changes
- **Security**: Follow security best practices
- **Performance**: Consider performance impact

### **Pull Request Process**

1. **Create Feature Branch**: `git checkout -b feature/your-feature`
2. **Make Changes**: Implement your feature
3. **Add Tests**: Ensure good test coverage
4. **Update Docs**: Document new features
5. **Submit PR**: Create pull request with description

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🆘 Support

### **Documentation**

- **API Documentation**: `/docs/api.md`
- **Deployment Guide**: `/docs/deployment.md`
- **Security Guide**: `/docs/security.md`
- **Troubleshooting**: `/docs/troubleshooting.md`

### **Community**

- **GitHub Issues**: Bug reports and feature requests
- **Discussions**: Community Q&A and ideas
- **Discord**: Real-time community support
- **Email**: support@prmanager.com

### **Enterprise Support**

- **Dedicated Support**: Priority email and phone support
- **Custom Deployment**: On-premises and private cloud options
- **Training**: Team training and onboarding
- **SLA**: 99.9% uptime guarantee

---

**Built with ❤️ for developers who care about code quality and security.**

🚀 **Ready to transform your PR review process?** [Get started now!](https://prmanager.com)
