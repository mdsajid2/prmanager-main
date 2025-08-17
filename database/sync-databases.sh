#!/bin/bash

# Simple database synchronization script
# Run this from the database directory to sync both dev and production databases

echo "🚀 Synchronizing Development and Production Databases..."
echo ""

# Run the migration manager
node migration-manager.js sync

echo ""
echo "✅ Database synchronization completed!"
echo ""
echo "📊 Checking final status..."
node migration-manager.js status

echo ""
echo "🎉 Both databases are now synchronized and ready!"
echo ""
echo "📋 What's included:"
echo "  ✅ User authentication & sessions"
echo "  ✅ Encrypted token storage (AES-256-CBC)"
echo "  ✅ API usage tracking & limits"
echo "  ✅ Referral system with bonuses"
echo "  ✅ Admin panel functions"
echo "  ✅ Free platform model"
echo ""
echo "🔗 Admin Panel: Visit /admin with mdsajid8636@gmail.com"
echo "📊 Usage Tracking: Available in the Usage tab"
echo "🎁 Referral System: Users can invite friends for bonuses"