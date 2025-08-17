// Quick test script for authentication
const bcrypt = require('bcrypt');

async function testAuth() {
    const password = 'admin123';
    const hash = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj3QJgusgqHu';
    
    console.log('Testing password verification...');
    console.log('Password:', password);
    console.log('Hash:', hash);
    
    const isValid = await bcrypt.compare(password, hash);
    console.log('Is valid:', isValid);
    
    if (!isValid) {
        console.log('Generating new hash...');
        const newHash = await bcrypt.hash(password, 12);
        console.log('New hash:', newHash);
    }
}

testAuth().catch(console.error);