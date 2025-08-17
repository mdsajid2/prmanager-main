#!/bin/bash

echo "🚀 PR Manager AWS Deployment Script"
echo "===================================="

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is not installed. Please install it first."
    echo "   https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
    exit 1
fi

# Check if user is logged in to AWS
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ Not logged in to AWS. Please run 'aws configure' first."
    exit 1
fi

echo "✅ AWS CLI is configured"

# Menu for deployment options
echo ""
echo "Choose deployment option:"
echo "1) Frontend only (Amplify) + External backend"
echo "2) Full-stack (Amplify + Lambda)"
echo "3) Hybrid (Amplify + App Runner)"
echo "4) Just build and prepare files"

read -p "Enter your choice (1-4): " choice

case $choice in
    1)
        echo "🎯 Deploying frontend to AWS Amplify..."
        echo ""
        echo "Steps to complete manually:"
        echo "1. Go to AWS Amplify Console: https://console.aws.amazon.com/amplify/"
        echo "2. Click 'New app' → 'Host web app'"
        echo "3. Connect your GitHub repository"
        echo "4. Use this build configuration:"
        echo ""
        cat web/amplify.yml
        echo ""
        echo "5. Set environment variables:"
        echo "   VITE_API_URL=https://your-backend-url.com"
        echo ""
        echo "6. Deploy your backend separately (see AWS_DEPLOYMENT_GUIDE.md)"
        ;;
    2)
        echo "🎯 Setting up full-stack deployment..."
        if ! command -v amplify &> /dev/null; then
            echo "Installing Amplify CLI..."
            npm install -g @aws-amplify/cli
        fi
        
        echo "Run these commands:"
        echo "1. amplify init"
        echo "2. amplify add api"
        echo "3. amplify push"
        echo ""
        echo "See AWS_DEPLOYMENT_GUIDE.md for detailed instructions"
        ;;
    3)
        echo "🎯 Preparing hybrid deployment..."
        echo ""
        echo "Frontend: Deploy to Amplify (option 1)"
        echo "Backend: Deploy to App Runner"
        echo ""
        echo "App Runner deployment:"
        echo "1. Build Docker image: docker build -t pr-manager-api ./server"
        echo "2. Push to ECR or use source-based deployment"
        echo "3. Create App Runner service with apprunner.yaml"
        echo ""
        echo "See AWS_DEPLOYMENT_GUIDE.md for detailed instructions"
        ;;
    4)
        echo "🔨 Building and preparing deployment files..."
        
        # Build frontend
        echo "Building frontend..."
        cd web
        npm ci
        npm run build
        cd ..
        
        # Build backend
        echo "Building backend..."
        cd server
        npm ci
        npm run build
        cd ..
        
        echo "✅ Build completed!"
        echo "📁 Frontend build: web/dist/"
        echo "📁 Backend build: server/dist/"
        echo ""
        echo "Files ready for deployment!"
        ;;
    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "📚 For detailed instructions, see AWS_DEPLOYMENT_GUIDE.md"
echo "🔧 For configuration help, see the deployment guide"
echo ""
echo "🎉 Happy deploying!"