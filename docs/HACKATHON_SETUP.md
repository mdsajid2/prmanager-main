# 🏆 PR Manager - Hackathon Setup Guide

Quick setup guide for hackathon participants and evaluators to get PR Manager running locally.

## 🚀 **Quick Start (5 minutes)**

### **Prerequisites**

- Node.js 18+ installed
- Git installed

### **1. Clone and Setup**

```bash
# Clone the repository
git clone https://github.com/mdsajid2/prmanager.git
cd prmanager

# Install all dependencies
npm run install:all
```

### **2. Environment Setup**

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your settings (optional - works with defaults)
nano .env
```

### **3. Start Development**

```bash
# Start both frontend and backend
npm run dev
```

### **4. Access the Application**

- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:3001
- **Health Check**: http://localhost:3001/health

## 🎯 **Core Features to Test**

### **1. PR Analysis**

1. **Paste a GitHub PR URL** (e.g., `https://github.com/owner/repo/pull/123`)
2. **Click "Analyze PR"**
3. **View comprehensive analysis** with:
   - Risk assessment (0-100 score)
   - Security analysis
   - Test recommendations
   - Reviewer checklist

### **2. Diff Analysis**

1. **Click "Analyze Diff"** tab
2. **Paste any git diff**
3. **Get instant analysis** without GitHub access

### **3. User Authentication**

1. **Sign up** for a new account
2. **Login** and see personalized dashboard
3. **Track API usage** in real-time

### **4. Settings & Tokens**

1. **Click Settings** (⚙️ button)
2. **Add GitHub token** for private repo access
3. **Choose storage option** (temporary vs persistent)

## 🔧 **Configuration Options**

### **Environment Variables**

```bash
# AI Provider (optional - uses mock AI if not set)
OPENAI_API_KEY=your_openai_key_here
KIRO_API_KEY=your_kiro_key_here

# GitHub Integration (optional - for private repos)
GITHUB_TOKEN=your_github_token_here

# Database (optional - uses SQLite if not set)
DATABASE_URL=postgresql://user:pass@host:port/db
```

### **Mock AI Mode**

- **No API keys needed** - works out of the box
- **Intelligent mock responses** based on code analysis
- **Perfect for demos** and testing

## 📊 **Demo Data & Examples**

### **Sample PRs to Test**

```
# Public PRs that work great for demos:
https://github.com/microsoft/vscode/pull/123456
https://github.com/facebook/react/pull/123456
https://github.com/nodejs/node/pull/123456
```

### **Sample Diff to Paste**

```diff
diff --git a/src/auth.js b/src/auth.js
index 1234567..abcdefg 100644
--- a/src/auth.js
+++ b/src/auth.js
@@ -10,7 +10,7 @@ function authenticateUser(username, password) {
   }

-  if (password === user.password) {
+  if (bcrypt.compare(password, user.hashedPassword)) {
     return generateToken(user);
   }

   return null;
 }
```

## 🎨 **UI Features to Showcase**

### **Modern Design**

- **Clean, professional interface**
- **Responsive design** (works on mobile)
- **Multiple themes** (blue, purple, green, etc.)
- **Smooth animations** and transitions

### **Real-Time Features**

- **Live usage tracking** with progress bars
- **Instant analysis results**
- **Real-time error handling**
- **Dynamic content updates**

### **User Experience**

- **Intuitive navigation**
- **Clear visual feedback**
- **Helpful error messages**
- **Accessibility features**

## 🔒 **Security Features**

### **Token Encryption**

- **AES-256-CBC encryption** for all stored tokens
- **User choice** between temporary and persistent storage
- **Visual security indicators**
- **Secure token management**

### **Authentication**

- **JWT-based authentication**
- **Secure password hashing**
- **Session management**
- **User isolation**

## 📈 **Usage Tracking**

### **Real-Time Monitoring**

- **API call tracking** with detailed metadata
- **Usage limits** and enforcement
- **Visual progress indicators**
- **Upgrade prompts** and notifications

### **Analytics Dashboard**

- **Usage statistics** and trends
- **Response time monitoring**
- **Error rate tracking**
- **User activity insights**

## 🚫 **Temporarily Disabled Features**

### **Admin Panel**

- **Status**: Disabled for hackathon
- **Reason**: Focus on core functionality
- **Timeline**: Will be re-enabled post-hackathon

### **GitHub App Integration**

- **Status**: Planned feature
- **Current**: Personal token integration only
- **Timeline**: Post-hackathon development

## 🐛 **Troubleshooting**

### **Common Issues**

**Port already in use:**

```bash
# Kill processes on ports 3001 and 5173
npx kill-port 3001 5173
npm run dev
```

**Database connection issues:**

```bash
# Use SQLite mode (no external database needed)
# Remove DATABASE_URL from .env or set to empty
DATABASE_URL=
```

**Build issues:**

```bash
# Clean install
rm -rf node_modules server/node_modules web/node_modules
npm run install:all
```

## 🎯 **Evaluation Criteria**

### **Technical Excellence**

- ✅ **Modern tech stack** (React, TypeScript, Express)
- ✅ **Clean architecture** with separation of concerns
- ✅ **Security best practices** (encryption, authentication)
- ✅ **Real-time features** and responsive design

### **Innovation**

- ✅ **AI-powered analysis** with explainable results
- ✅ **Intelligent mock AI** when API keys not available
- ✅ **Comprehensive security analysis** for code changes
- ✅ **User-centric design** with choice and flexibility

### **Practical Value**

- ✅ **Solves real problems** in code review process
- ✅ **Easy to use** with minimal setup required
- ✅ **Scalable architecture** for production deployment
- ✅ **Enterprise-ready** security and monitoring

## 📞 **Support**

- **GitHub Issues**: [Report bugs or ask questions](https://github.com/mdsajid2/prmanager/issues)
- **Documentation**: Comprehensive guides in [docs/](../docs/) folder
- **Live Demo**: Available at production URL

---

**🏆 Ready to revolutionize code reviews?** Get started in 5 minutes and see the power of AI-driven PR analysis!

[![Hackathon Ready](https://img.shields.io/badge/Hackathon-Ready-green?style=for-the-badge)](https://github.com/mdsajid2/prmanager)
