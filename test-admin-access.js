// Quick test to check admin access
const fetch = require('node-fetch');

async function testAdminAccess() {
  try {
    // First, let's try to login as admin
    console.log('🔐 Testing admin login...');
    
    const loginResponse = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'mdsajid8636@gmail.com',
        password: 'SahYan@2020'
      })
    });
    
    if (!loginResponse.ok) {
      console.error('❌ Login failed:', await loginResponse.text());
      return;
    }
    
    const loginData = await loginResponse.json();
    console.log('✅ Login successful:', loginData.user.email);
    
    // Now test admin endpoint
    console.log('🛠️ Testing admin users endpoint...');
    
    const adminResponse = await fetch('http://localhost:3001/api/admin/users', {
      headers: {
        'Authorization': `Bearer ${loginData.token}`
      }
    });
    
    if (!adminResponse.ok) {
      console.error('❌ Admin access failed:', await adminResponse.text());
      return;
    }
    
    const adminData = await adminResponse.json();
    console.log('✅ Admin access successful, users count:', adminData.users.length);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testAdminAccess();