const http = require('http');

function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: body, headers: res.headers });
        }
      });
    });

    req.on('error', (err) => reject(err));

    if (postData) {
      req.write(JSON.stringify(postData));
    }
    req.end();
  });
}

async function runDiagnostics() {
  console.log('====================================================');
  console.log('AUTOLEAD GMAIL OAUTH DIAGNOSTIC INSPECTION');
  console.log('====================================================\n');

  try {
    const timeId = Date.now();

    // 1. Authenticate User
    const userRes = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: '/api/auth/signup',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      full_name: 'Amit Mehra',
      company_name: 'AM Automation Trading',
      email: `diagnostics_tester_${timeId}@autolead.com`,
      password: 'password123',
      confirm_password: 'password123'
    });

    const token = userRes.data.token;

    // 2. Fetch Diagnostics Endpoint
    const diagRes = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: '/api/gmail/diagnostics',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    console.log('Runtime Environment Diagnostics Result:');
    console.log(JSON.stringify(diagRes.data, null, 2));

  } catch (err) {
    console.error('Diagnostics Execution Error:', err);
    process.exit(1);
  }
}

runDiagnostics();
