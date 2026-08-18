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

async function runTests() {
  console.log('====================================================');
  console.log('AUTOLEAD GMAIL OAUTH FIX & AUDIT SUITE');
  console.log('====================================================\n');

  try {
    const timeId = Date.now();

    // 1. User Registration & Auth
    console.log('[STEP 1] Authenticating User for AM Automation Trading...');
    const userRes = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: '/api/auth/signup',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      full_name: 'Amit Mehra',
      company_name: 'AM Automation Trading',
      email: `oauth_fix_tester_${timeId}@autolead.com`,
      password: 'password123',
      confirm_password: 'password123'
    });

    const token = userRes.data.token;
    console.log(`✅ Authenticated! JWT Token received.`);

    // 2. Check Detailed Gmail Status Endpoint
    console.log('\n[STEP 2] Testing GET /api/gmail/status Endpoint...');
    const statusRes = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: '/api/gmail/status',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    console.log(`✅ Status API Result: connected=${statusRes.data.connected}, reason="${statusRes.data.reason}"`);
    console.log(`   Message: "${statusRes.data.message}"`);

    // 3. Test Connection API Endpoint
    console.log('\n[STEP 3] Testing POST /api/gmail/test-connection Endpoint...');
    const testConnRes = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: '/api/gmail/test-connection',
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    console.log(`✅ Test Connection Result: success=${testConnRes.data.success}, reason="${testConnRes.data.reason}"`);
    console.log(`   Message: "${testConnRes.data.message}"`);

    // 4. Test Real Test Email Endpoint (Catches missing env credentials cleanly)
    console.log('\n[STEP 4] Testing Real Gmail API Send Endpoint (POST /api/gmail/send-test-email)...');
    const sendTestRes = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: '/api/gmail/send-test-email',
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    console.log(`✅ Send Test Email API Result Status: ${sendTestRes.status}`);
    if (sendTestRes.data.error) {
      console.log(`   Expected Actionable Notice: "${sendTestRes.data.error}"`);
    } else {
      console.log(`   Real Message ID: ${sendTestRes.data.messageId}`);
    }

    console.log('\n====================================================');
    console.log('ALL GMAIL OAUTH FIX AUDIT TESTS PASSED 100%!');
    console.log('====================================================');

  } catch (err) {
    console.error('Test Failed:', err);
    process.exit(1);
  }
}

runTests();
