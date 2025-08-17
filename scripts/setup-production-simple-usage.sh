#!/bin/bash

echo "🔧 Setting up Simple Usage Database on Production"
echo "================================================"

cd /home/ec2-user/prmanager/server

echo "[INFO] Running database setup..."
node setup-simple-usage.js

if [ $? -eq 0 ]; then
    echo "✅ Simple usage database setup complete!"
    echo ""
    echo "📊 Table created: daily_usage"
    echo "🔄 Ready for usage tracking"
else
    echo "❌ Database setup failed"
    exit 1
fi