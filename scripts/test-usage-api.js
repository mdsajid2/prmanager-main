// Simple test to check usage API
const fetch = require('node-fetch');

async function testUsageAPI() {
  try {
    console.log('🔍 Testing usage API...');
    
    // Test without authentication first
    const response = await fetch('http://localhost:3001/api/usage/plans');
    console.log('📊 Plans endpoint status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Plans data:', JSON.stringify(data, null, 2));
    } else {
      const error = await response.text();
      console.log('❌ Plans error:', error);
    }
    
    // Test health endpoint
    const healthResponse = await fetch('http://localhost:3001/health');
    console.log('🏥 Health endpoint status:', healthResponse.status);
    
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log('✅ Health data:', JSON.stringify(healthData, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testUsageAPI();