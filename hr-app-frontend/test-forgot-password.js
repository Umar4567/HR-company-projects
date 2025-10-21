const https = require('https');

const data = JSON.stringify({
  email: 'umar@gmail.com'
});

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/auth/forgot-password',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = https.request(options, (res) => {
  console.log(`Status Code: ${res.statusCode}`);
  
  let responseData = '';
  
  res.on('data', (chunk) => {
    responseData += chunk;
  });
  
  res.on('end', () => {
    console.log('Response:', JSON.parse(responseData));
  });
});

req.on('error', (error) => {
  console.error('Error:', error);
});

req.write(data);
req.end();