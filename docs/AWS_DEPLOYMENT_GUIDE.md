# AWS Amplify Deployment Guide for PR Manager

## 🚀 Deployment Options

Your PR Manager can be deployed on AWS using multiple approaches:

### **Option 1: Frontend-Only Deployment (Recommended for MVP)**

Deploy just the React frontend to Amplify and use external API services.

### **Option 2: Full-Stack Deployment**

Deploy both frontend and backend using AWS Amplify + Lambda functions.

### **Option 3: Hybrid Deployment**

Frontend on Amplify + Backend on AWS App Runner or ECS.

---

## 📋 Option 1: Frontend-Only Deployment (Easiest)

This approach deploys only the React frontend and uses external APIs for the backend functionality.

### **Step 1: Prepare Frontend for Static Deployment**

Update the API configuration to work with external services:

```typescript
// web/src/lib/api.ts - Update for production
const API_BASE =
  process.env.NODE_ENV === "production"
    ? "https://your-backend-api.com/api" // Your deployed backend
    : "/api";
```

### **Step 2: Create Amplify App**

1. **Go to AWS Amplify Console**

   - Open [AWS Amplify Console](https://console.aws.amazon.com/amplify/)
   - Click "New app" → "Host web app"

2. **Connect Repository**

   - Choose your Git provider (GitHub, GitLab, etc.)
   - Select your PR Manager repository
   - Choose the main branch

3. **Configure Build Settings**

   ```yaml
   version: 1
   frontend:
     phases:
       preBuild:
         commands:
           - cd web
           - npm ci
       build:
         commands:
           - npm run build
     artifacts:
       baseDirectory: web/dist
       files:
         - "**/*"
     cache:
       paths:
         - web/node_modules/**/*
   ```

4. **Environment Variables**
   Add these in Amplify Console → App Settings → Environment Variables:
   ```
   NODE_ENV=production
   VITE_API_URL=https://your-backend-url.com
   ```

### **Step 3: Deploy Backend Separately**

Deploy your backend to:

- **Vercel**: `cd server && vercel`
- **Railway**: `railway deploy`
- **Heroku**: `git subtree push --prefix server heroku main`
- **AWS App Runner**: Use the backend deployment guide below

---

## 📋 Option 2: Full-Stack Amplify Deployment

Deploy both frontend and backend using AWS Amplify with Lambda functions.

### **Step 1: Install Amplify CLI**

```bash
npm install -g @aws-amplify/cli
amplify configure
```

### **Step 2: Initialize Amplify Project**

```bash
amplify init
```

Configuration:

- Project name: `pr-manager`
- Environment: `prod`
- Default editor: `Visual Studio Code`
- App type: `javascript`
- Framework: `react`
- Source directory: `web/src`
- Build directory: `web/dist`
- Build command: `npm run build`
- Start command: `npm run dev`

### **Step 3: Add API (Lambda + API Gateway)**

```bash
amplify add api
```

Configuration:

- Service: `REST`
- API name: `prmanagerapi`
- Path: `/api`
- Lambda source: `Create a new Lambda function`
- Function name: `prmanagerfunction`
- Runtime: `NodeJS`
- Template: `Express function`

### **Step 4: Configure Lambda Function**

Replace the generated Lambda function with your server code:

```bash
# Copy your server code to the Lambda function
cp -r server/src/* amplify/backend/function/prmanagerfunction/src/
```

Update `amplify/backend/function/prmanagerfunction/src/package.json`:

```json
{
  "name": "prmanagerfunction",
  "version": "2.0.0",
  "description": "",
  "main": "index.js",
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "zod": "^3.22.4",
    "axios": "^1.6.2",
    "lru-cache": "^10.1.0",
    "dotenv": "^16.3.1"
  }
}
```

### **Step 5: Add Environment Variables**

```bash
amplify add storage
```

Or manually add environment variables in the Lambda function:

```javascript
// amplify/backend/function/prmanagerfunction/src/index.js
process.env.OPENAI_API_KEY = "your-key-here";
process.env.GITHUB_TOKEN = "your-token-here";
```

### **Step 6: Deploy**

```bash
amplify push
```

---

## 📋 Option 3: Hybrid Deployment (Recommended for Production)

### **Frontend: AWS Amplify**

- Fast global CDN
- Automatic HTTPS
- Easy custom domains
- Git-based deployments

### **Backend: AWS App Runner**

- Fully managed containers
- Auto-scaling
- Easy environment variables
- Direct Docker deployment

### **Step 1: Deploy Frontend to Amplify**

Use the build configuration from Option 1.

### **Step 2: Deploy Backend to App Runner**

Create `Dockerfile` for the backend:

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY server/package*.json ./
RUN npm ci --only=production

# Copy source code
COPY server/src ./src
COPY server/tsconfig.json ./

# Install TypeScript and build
RUN npm install -g typescript
RUN npm run build

EXPOSE 3001

CMD ["node", "dist/index.js"]
```

Create `apprunner.yaml`:

```yaml
version: 1.0
runtime: docker
build:
  commands:
    build:
      - echo "Building PR Manager API..."
run:
  runtime-version: latest
  command: node dist/index.js
  network:
    port: 3001
    env: PORT
  env:
    - name: NODE_ENV
      value: production
    - name: OPENAI_API_KEY
      value: your-openai-key
    - name: GITHUB_TOKEN
      value: your-github-token
```

---

## 🔧 Configuration Files

### **For Amplify Frontend Deployment**

Create `web/.env.production`:

```env
VITE_API_URL=https://your-backend-url.com
NODE_ENV=production
```

### **For Full-Stack Amplify**

Create `amplify/team-provider-info.json`:

```json
{
  "prod": {
    "awscloudformation": {
      "AuthRoleName": "amplify-prmanager-prod-authRole",
      "UnauthRoleName": "amplify-prmanager-prod-unauthRole",
      "AuthRoleArn": "arn:aws:iam::your-account:role/amplify-prmanager-prod-authRole",
      "UnauthRoleArn": "arn:aws:iam::your-account:role/amplify-prmanager-prod-unauthRole",
      "Region": "us-east-1"
    }
  }
}
```

---

## 💰 Cost Estimation

### **Option 1: Frontend-Only**

- **Amplify Hosting**: ~$1-5/month
- **Backend elsewhere**: $5-20/month
- **Total**: ~$6-25/month

### **Option 2: Full-Stack Amplify**

- **Amplify Hosting**: ~$1-5/month
- **Lambda Functions**: ~$0-10/month (depending on usage)
- **API Gateway**: ~$1-5/month
- **Total**: ~$2-20/month

### **Option 3: Hybrid**

- **Amplify Frontend**: ~$1-5/month
- **App Runner Backend**: ~$10-30/month
- **Total**: ~$11-35/month

---

## 🚀 Quick Start Commands

### **Option 1: Frontend-Only**

```bash
# 1. Update API configuration
# 2. Deploy to Amplify Console
# 3. Deploy backend separately
```

### **Option 2: Full-Stack**

```bash
npm install -g @aws-amplify/cli
amplify init
amplify add api
amplify push
```

### **Option 3: Hybrid**

```bash
# Frontend: Use Amplify Console
# Backend: Use App Runner with Docker
```

---

## 🔒 Security Considerations

1. **Environment Variables**: Store API keys in AWS Systems Manager Parameter Store
2. **CORS**: Configure proper CORS settings for your domain
3. **Rate Limiting**: Implement rate limiting in Lambda or App Runner
4. **Authentication**: Consider adding AWS Cognito for user management

---

## 📊 Monitoring & Analytics

- **CloudWatch**: Monitor Lambda functions and API Gateway
- **Amplify Analytics**: Track frontend usage
- **X-Ray**: Trace API requests
- **CloudWatch Alarms**: Set up alerts for errors

---

## 🎯 Recommended Approach

For your PR Manager, I recommend **Option 3 (Hybrid)**:

1. **Frontend on Amplify**: Fast, reliable, easy custom domains
2. **Backend on App Runner**: Better for Node.js APIs, easier environment management
3. **Database**: Add RDS or DynamoDB if needed later
4. **Caching**: Use ElastiCache for Redis if scaling up

This gives you the best of both worlds: fast frontend delivery and flexible backend scaling.

Would you like me to help you set up any of these deployment options?
