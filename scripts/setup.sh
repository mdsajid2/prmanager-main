#!/bin/bash

echo "🚀 Setting up PR Manager..."

# Install root dependencies
echo "📦 Installing root dependencies..."
npm install

# Install server dependencies
echo "📦 Installing server dependencies..."
cd server && npm install && cd ..

# Install web dependencies
echo "📦 Installing web dependencies..."
cd web && npm install && cd ..

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
    echo "⚠️  Please edit .env file with your API keys before starting the server"
else
    echo "✅ .env file already exists"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env file with your KIRO_API_KEY"
echo "2. Run 'npm run dev' to start both frontend and backend"
echo "3. Open http://localhost:5173 in your browser"
echo ""
echo "Available commands:"
echo "  npm run dev          - Start both frontend and backend"
echo "  npm run server:dev   - Start backend only"
echo "  npm run web:dev      - Start frontend only"
echo "  npm run server:build - Build backend"
echo "  npm run web:build    - Build frontend"