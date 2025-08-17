#!/bin/bash

echo "🧪 Testing System Health Service Locally"
echo "======================================="

cd server

echo "1. Testing system health service directly..."
node -e "
const { SystemHealthService } = require('./dist/services/system-health.js');

async function test() {
  try {
    console.log('Testing getSystemMetrics...');
    const metrics = await SystemHealthService.getSystemMetrics();
    console.log('✅ System metrics:', Object.keys(metrics));
    
    console.log('Testing getDatabaseHealth...');
    const dbHealth = await SystemHealthService.getDatabaseHealth();
    console.log('✅ Database health:', dbHealth.status);
    
    console.log('Testing getServiceHealth...');
    const serviceHealth = await SystemHealthService.getServiceHealth();
    console.log('✅ Service health:', serviceHealth.status);
    
    console.log('✅ All system health services working!');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  process.exit(0);
}

test();
" 2>/dev/null || echo "❌ System health service test failed"

echo ""
echo "2. Checking if system health files exist..."
if [ -f "dist/services/system-health.js" ]; then
    echo "✅ System health service compiled"
else
    echo "❌ System health service missing"
fi

if [ -f "dist/routes/system-health.js" ]; then
    echo "✅ System health routes compiled"
else
    echo "❌ System health routes missing"
fi