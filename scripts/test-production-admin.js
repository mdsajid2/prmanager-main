const fetch = require('node-fetch');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function testProductionAdmin() {
  try {
    const baseUrl = process.env.PRODUCTION_URL || 'https://prmanagerai.com';
    
    console.log('🔍 Testing production admin access...');
    console.log('🌐 Base URL:', baseUrl);
    console.log('📧 Admin email:', process.env.ADMIN_EMAIL);
    
    // Step 1: Login as admin
    console.log('\n1️⃣ Testing admin login...');
    
    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: process.env.ADMIN_EMAIL,
        password: process.env.ADMIN_PASSWORD
      })
    });
    
    if (!loginResponse.ok) {
      const errorText = await loginResponse.text();
      console.error('❌ Login failed:', loginResponse.status, errorText);
      return;
    }
    
    const loginData = await loginResponse.json();
    console.log('✅ Login successful for:', loginData.user.email);
    
    // Step 2: Test admin users endpoint
    console.log('\n2️⃣ Testing admin users endpoint...');
    
    const adminResponse = await fetch(`${baseUrl}/api/admin/users`, {
      headers: {
        'Authorization': `Bearer ${loginData.token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!adminResponse.ok) {
      const errorText = await adminResponse.text();
      console.error('❌ Admin access failed:', adminResponse.status, errorText);
      return;
    }
    
    const adminData = await adminResponse.json();
    console.log('✅ Admin access successful!');
    console.log('👥 Users found:', adminData.users.length);
    
    // Step 3: Test admin stats endpoint
    console.log('\n3️⃣ Testing admin stats endpoint...');
    
    const statsResponse = await fetch(`${baseUrl}/api/admin/stats`, {
      headers: {
        'Authorization': `Bearer ${loginData.token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (statsResponse.ok) {
      const statsData = await statsResponse.json();
      console.log('✅ Admin stats successful!');
      console.log('📊 Platform stats:', statsData.platform);
    } else {
      console.log('⚠️ Admin stats failed:', statsResponse.status);
    }
    
    console.log('\n🎉 Production admin test complete!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testProductionAdmin();