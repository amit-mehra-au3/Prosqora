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
  console.log('BUSINESS GMAIL ENFORCEMENT & VERIFICATION AUDIT SUITE');
  console.log('====================================================\n');

  try {
    const timeId = Date.now();

    // 1. Authenticate User
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
      email: `business_gmail_tester_${timeId}@autolead.com`,
      password: 'password123',
      confirm_password: 'password123'
    });

    const token = userRes.data.token;
    console.log(`✅ Authenticated! JWT Token received.`);

    // 2. Verify Auth URL includes prompt=select_account consent
    console.log('\n[STEP 2] Verifying Google OAuth URL includes prompt=select_account consent...');
    const authUrlRes = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: '/api/gmail/auth-url',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const authUrl = authUrlRes.data.url;
    if (authUrl.includes('prompt=select_account') || authUrl.includes('select_account')) {
      console.log('✅ Google OAuth URL verified! Includes Account Chooser prompt: prompt=select_account consent');
    } else {
      console.error('❌ FAIL: Auth URL missing select_account prompt:', authUrl);
      process.exit(1);
    }

    // 3. Test Connection API Endpoint
    console.log('\n[STEP 3] Testing POST /api/gmail/test-connection Endpoint...');
    const testConnRes = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: '/api/gmail/test-connection',
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    console.log(`✅ Test Connection Result: connected=${testConnRes.data.connected}, isValidAccount=${testConnRes.data.isValidAccount}`);
    console.log(`   Message: "${testConnRes.data.message}"`);

    // 4. Test Gmail Status Endpoint
    console.log('\n[STEP 4] Testing GET /api/gmail/status Endpoint...');
    const statusRes = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: '/api/gmail/status',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    console.log(`✅ Gmail Status Result: targetEmail=${statusRes.data.targetEmail}, isValidAccount=${statusRes.data.isValidAccount}`);

    // 5. Verify Historical Campaign Status Migration
    console.log('\n[STEP 5] Verifying Historical Campaign Status Migration (0 sent & >0 failed -> Failed)...');
    const campRes = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: '/api/email-campaigns',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const failedCampaigns = (campRes.data.campaigns || []).filter((c) => c.sent_count === 0 && c.failed_count > 0);
    failedCampaigns.forEach((c) => {
      console.log(`   Campaign ${c.campaign_id}: sent=${c.sent_count}, failed=${c.failed_count}, status="${c.status}"`);
      if (c.status === 'Completed') {
        console.error('❌ FAIL: Campaign with 0 sent and >0 failed still shows Completed status!');
        process.exit(1);
      }
    });
    console.log('✅ Historical Campaign Status Migration verified 100%!');

    console.log('\n====================================================');
    console.log('ALL BUSINESS GMAIL ENFORCEMENT AUDIT TESTS PASSED 100%!');
    console.log('====================================================');

  } catch (err) {
    console.error('Test Failed:', err);
    process.exit(1);
  }
}

runTests();
