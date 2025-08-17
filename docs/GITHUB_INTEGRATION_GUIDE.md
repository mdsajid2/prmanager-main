# 🔗 GitHub Integration Guide

This guide explains how to integrate PR Manager with GitHub for advanced features like posting comments and merging PRs directly from the application.

## 🎯 **Current Features**

### **✅ Available Now**

- **PR Analysis**: Analyze any public GitHub PR by URL
- **Risk Assessment**: AI-powered security and quality analysis
- **Test Recommendations**: Automated test plan generation
- **Reviewer Checklists**: Tailored review guidelines

### **🚀 Planned Features (Post-Hackathon)**

- **Direct PR Comments**: Post analysis results as PR comments
- **Auto-Merge**: Merge PRs directly from the application
- **Status Checks**: Set PR status based on analysis results
- **Webhook Integration**: Automatic analysis on PR creation/updates

## 🔑 **GitHub Token Permissions**

To enable different levels of GitHub integration, you'll need different token permissions:

### **1. Basic Analysis (Current)**

**Token Type**: Personal Access Token (Classic) or Fine-grained  
**Permissions**:

- `public_repo` (for public repositories)
- `repo` (for private repositories)

**What it enables**:

- ✅ Read PR details and diff
- ✅ Access public and private repositories
- ✅ Analyze PR content and files

### **2. Comment Posting (Planned)**

**Token Type**: Personal Access Token (Classic) or Fine-grained  
**Permissions**:

- `repo` (full repository access)
- `pull_requests:write` (for fine-grained tokens)

**What it enables**:

- ✅ All basic analysis features
- ✅ Post analysis results as PR comments
- ✅ Update existing comments with new analysis

### **3. PR Management (Planned)**

**Token Type**: Personal Access Token (Classic) or Fine-grained  
**Permissions**:

- `repo` (full repository access)
- `pull_requests:write` (for fine-grained tokens)
- `contents:write` (for fine-grained tokens)
- `metadata:read` (for fine-grained tokens)

**What it enables**:

- ✅ All comment posting features
- ✅ Merge PRs directly from the application
- ✅ Set PR status checks
- ✅ Request changes or approve PRs

### **4. Organization/Team Integration (Planned)**

**Token Type**: GitHub App or Organization Token  
**Permissions**:

- `repo` (full repository access)
- `pull_requests:write`
- `contents:write`
- `checks:write` (for status checks)
- `actions:read` (for CI/CD integration)

**What it enables**:

- ✅ All PR management features
- ✅ Organization-wide deployment
- ✅ Team-based access control
- ✅ Webhook automation
- ✅ CI/CD pipeline integration

## 🔀 **One-Click Merge Feature (Coming Soon)**

### **🎯 The Vision: Complete PR Workflow**

Imagine this workflow:

1. **Analyze PR** in PR Manager
2. **Review results** - risk score, security analysis, test recommendations
3. **Make decision** - approve, request changes, or merge
4. **Click "Merge PR"** - merge directly without leaving PR Manager
5. **Done!** - No screen switching, no GitHub login required

### **🔧 How to Enable Merge Feature (When Available)**

#### **Step 1: GitHub Token Permissions**

Your GitHub token will need these permissions:

- `repo` (full repository access)
- `pull_requests:write` (merge PRs)
- `contents:write` (modify repository content)

#### **Step 2: Repository Settings**

- **Branch Protection**: Configure branch protection rules
- **Merge Settings**: Enable desired merge types (merge, squash, rebase)
- **Status Checks**: Set up required status checks

#### **Step 3: PR Manager Configuration**

- **Enable Merge Feature** in Settings
- **Set Merge Preferences** (default merge strategy)
- **Configure Auto-Merge Rules** (optional)

### **🎨 Planned UI/UX**

```
┌─────────────────────────────────────────┐
│ 📊 PR Analysis Results                  │
│ Risk Score: 25/100 (Low Risk) ✅       │
│ Security: No issues found              │
│ Tests: 3 recommendations               │
├─────────────────────────────────────────┤
│ 🔀 Merge Actions                       │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐   │
│ │ Approve │ │ Request │ │  Merge  │   │
│ │   PR    │ │ Changes │ │   PR    │   │
│ └─────────┘ └─────────┘ └─────────┘   │
│                                        │
│ Merge Strategy: [Squash ▼]            │
│ ☑ Delete branch after merge           │
│ ☑ Include analysis in commit message  │
└─────────────────────────────────────────┘
```

## 🛠️ **How to Set Up GitHub Integration**

### **Step 1: Create a GitHub Token**

#### **For Personal Use (Recommended for now)**:

1. Go to GitHub → Settings → Developer settings → Personal access tokens
2. Click "Generate new token (classic)"
3. Select scopes based on your needs:
   - **Basic Analysis**: `public_repo` or `repo`
   - **Comment Posting**: `repo`
   - **PR Management**: `repo`

#### **For Fine-grained Tokens (Beta)**:

1. Go to GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens
2. Click "Generate new token"
3. Select repository access and permissions based on your needs

### **Step 2: Configure PR Manager**

1. **Login to PR Manager**
2. **Go to Settings** (⚙️ button)
3. **Add your GitHub token**:
   - Choose "Store Securely" for persistent access
   - Or use "Temporary" for session-only access

### **Step 3: Test Integration**

1. **Analyze a PR** from your repository
2. **Verify access** - you should see detailed PR information
3. **Check permissions** - ensure the token has required access

## 📊 **Permission Levels Comparison**

| Feature             | Public Repo | Private Repo | Comment | Merge | Status Checks | Webhooks |
| ------------------- | ----------- | ------------ | ------- | ----- | ------------- | -------- |
| **Basic Analysis**  | ✅          | ❌           | ❌      | ❌    | ❌            | ❌       |
| **Private Access**  | ✅          | ✅           | ❌      | ❌    | ❌            | ❌       |
| **Comment Posting** | ✅          | ✅           | ✅      | ❌    | ❌            | ❌       |
| **PR Management**   | ✅          | ✅           | ✅      | ✅    | ✅            | ❌       |
| **Organization**    | ✅          | ✅           | ✅      | ✅    | ✅            | ✅       |

## 🔒 **Security Best Practices**

### **Token Security**

- ✅ Use fine-grained tokens when possible
- ✅ Set expiration dates on tokens
- ✅ Regularly rotate tokens
- ✅ Use minimum required permissions
- ✅ Store tokens securely (PR Manager encrypts all tokens)

### **Repository Access**

- ✅ Only grant access to repositories you need
- ✅ Use organization tokens for team access
- ✅ Monitor token usage and access logs
- ✅ Revoke unused tokens immediately

### **Application Security**

- ✅ PR Manager encrypts all tokens with AES-256-CBC
- ✅ Tokens are never stored in plaintext
- ✅ User-specific encryption keys
- ✅ Secure database storage

## 🚀 **Roadmap: Planned GitHub Features**

### **Phase 1: Comment Integration (Q1 2025)**

- **Auto-comment analysis results** on PRs
- **Customizable comment templates**
- **Update comments** when analysis changes
- **Comment threading** for discussions

### **Phase 2: One-Click PR Merge (Q2 2025)** 🎯

**🚀 Complete Workflow Integration - No Screen Switching Required!**

- **Smart Merge Button** - Merge directly from PR Manager after review
- **Merge Strategy Selection** - Choose merge, squash, or rebase
- **Pre-merge Validation** - Ensure all checks pass before merge
- **Risk-Based Merge** - Auto-merge based on risk score thresholds
- **Merge Confirmation** - Review changes one final time before merge
- **Status Integration** - Set PR status checks based on analysis
- **Custom Merge Messages** - Include analysis summary in merge commit

### **Phase 3: Organization Features (Q3 2025)**

- **GitHub App** for organization-wide deployment
- **Team-based access control**
- **Webhook automation** for real-time analysis
- **CI/CD pipeline integration**

### **Phase 4: Advanced Automation (Q4 2025)**

- **Auto-merge safe PRs** based on criteria
- **Scheduled analysis** for open PRs
- **Integration with GitHub Actions**
- **Custom analysis rules** per repository

## 💡 **Use Cases by Permission Level**

### **Individual Developer**

**Recommended**: Personal Access Token with `repo` scope

- Analyze your own PRs
- Get detailed security and quality insights
- Improve code quality before reviews

### **Team Lead/Reviewer**

**Recommended**: Personal Access Token with `repo` scope + comment permissions

- Analyze team PRs
- Post standardized review comments
- Ensure consistent review quality

### **Organization Admin**

**Recommended**: GitHub App or Organization Token

- Deploy across multiple repositories
- Enforce organization-wide quality standards
- Automate PR workflows
- Integrate with existing CI/CD

## 🔀 **Want One-Click Merge Feature?**

**📖 Detailed Guide**: See [MERGE_FEATURE_GUIDE.md](./MERGE_FEATURE_GUIDE.md) for complete documentation on the planned merge functionality.

**🎯 Merge Strategies**: See [MERGE_STRATEGIES_GUIDE.md](./MERGE_STRATEGIES_GUIDE.md) to understand the differences between squash, merge, and rebase options.

**🎯 Key Benefits**:

- No screen switching between PR Manager and GitHub
- Risk-aware merge decisions with validation
- Complete workflow integration
- Smart commit messages with analysis summary

## 📞 **Support & Questions**

- **Documentation**: Check the [docs/](../docs/) folder for detailed guides
- **Merge Feature**: [MERGE_FEATURE_GUIDE.md](./MERGE_FEATURE_GUIDE.md) for merge functionality
- **Issues**: [GitHub Issues](https://github.com/mdsajid2/prmanager/issues)
- **Discussions**: [GitHub Discussions](https://github.com/mdsajid2/prmanager/discussions)

## 🎉 **Getting Started**

1. **Start with basic analysis** using a simple GitHub token
2. **Test with your repositories** to ensure everything works
3. **Upgrade permissions** as you need more features
4. **Stay tuned** for advanced features post-hackathon!

---

**🔗 Ready to supercharge your PR reviews?** Start with basic GitHub integration and expand as your needs grow!

[![GitHub Integration](https://img.shields.io/badge/GitHub-Integration-blue?logo=github)](https://github.com/mdsajid2/prmanager)
