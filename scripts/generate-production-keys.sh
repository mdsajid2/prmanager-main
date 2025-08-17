#!/bin/bash

# Generate Production Keys Script
# This script generates secure JWT_SECRET and ENCRYPTION_KEY for production use

echo "🔐 Generating Production Security Keys"
echo "======================================"

# Generate a secure JWT secret (64 characters)
JWT_SECRET=$(openssl rand -hex 32)

# Generate a secure encryption key (64 characters for AES-256)
ENCRYPTION_KEY=$(openssl rand -hex 32)

echo ""
echo "✅ Generated new production keys:"
echo ""
echo "JWT_SECRET=$JWT_SECRET"
echo "ENCRYPTION_KEY=$ENCRYPTION_KEY"
echo ""
echo "📋 Copy these values to your production .env file"
echo ""
echo "⚠️  IMPORTANT SECURITY NOTES:"
echo "   - These keys are different from your development keys"
echo "   - Keep these keys secure and never commit them to version control"
echo "   - Changing these keys will invalidate existing JWT tokens and encrypted data"
echo "   - Store these keys safely - you cannot recover encrypted data if you lose the ENCRYPTION_KEY"
echo ""
echo "🔄 After updating your production .env file, restart your application"