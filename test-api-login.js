const http = require('http');

const loginData = JSON.stringify({
  email: 'admin@fulexo.com',
  password: 'demo123'
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': loginData.length
  }
};

console.log('=== LOGIN TEST ===');
console.log('Request:', loginData);

const req = http.request(options, (res) => {
  let data = '';
  
  console.log(`Status Code: ${res.statusCode}`);
  console.log(`Headers:`, JSON.stringify(res.headers, null, 2));
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const jsonData = JSON.parse(data);
      console.log('\nResponse:', JSON.stringify(jsonData, null, 2));
      
      if (res.statusCode === 200 || res.statusCode === 201) {
        console.log('\n✓ LOGIN BASARILI!');
        const cookies = res.headers['set-cookie'];
        console.log('Cookies:', cookies);
      } else {
        console.log('\n✗ LOGIN BASARISIZ!');
      }
    } catch (e) {
      console.log('Raw Response:', data);
      console.log('Parse Error:', e.message);
    }
  });
});

req.on('error', (error) => {
  console.error('Request Error:', error);
});

req.write(loginData);
req.end();

