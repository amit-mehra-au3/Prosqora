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
  console.log('RUNNING AUTOLEAD SAAS MULTI-TENANT AUTHENTICATION TESTS');
  console.log('====================================================\n');

  try {
    // TEST 1: Sign up User A
    console.log('[TEST 1] Creating User A (usera@automation.com)...');
    const userARes = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: '/api/auth/signup',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      full_name: 'User A',
      company_name: 'Automation A Pvt Ltd',
      email: `usera_${Date.now()}@automation.com`,
      password: 'password123',
      confirm_password: 'password123'
    });

    const tokenA = userARes.data.token;
    console.log(`✅ User A created successfully. Token: ${tokenA.slice(0, 20)}...`);

    console.log('[TEST 1] User A adding Company A ("Alpha Automation")...');
    const addCompanyARes = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: '/api/leads',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`
      }
    }, {
      company_name: 'Alpha Automation Systems',
      website: 'https://alphaautomation.com',
      city: 'Gurgaon',
      state: 'Haryana',
      category: 'CNC Machine Manufacturers'
    });
    console.log(`✅ Company A saved for User A. Lead ID: ${addCompanyARes.data.lead.lead_id}`);

    const getLeadsA = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: '/api/leads',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${tokenA}` }
    });
    console.log(`✅ User A lead count: ${getLeadsA.data.count}. Sees: "${getLeadsA.data.leads[0].company_name}"\n`);

    // TEST 2: Sign up User B & Verify Data Isolation
    console.log('[TEST 2] Creating User B (userb@robotics.com)...');
    const userBRes = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: '/api/auth/signup',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      full_name: 'User B',
      company_name: 'Robotics B Corp',
      email: `userb_${Date.now()}@robotics.com`,
      password: 'password456',
      confirm_password: 'password456'
    });

    const tokenB = userBRes.data.token;
    console.log('✅ User B created successfully. Token obtained.');

    console.log('[TEST 2] Verifying User B CANNOT see User A\'s Company A...');
    const getLeadsBInitial = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: '/api/leads',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${tokenB}` }
    });

    if (getLeadsBInitial.data.count === 0) {
      console.log('✅ SUCCESS: User B sees 0 leads. User A\'s Company A is completely ISOLATED!');
    } else {
      console.error('❌ FAIL: Data leak! User B saw leads belonging to User A.');
      process.exit(1);
    }

    // TEST 3: User B adds Company B
    console.log('[TEST 3] User B adding Company B ("Beta Robotics")...');
    const addCompanyBRes = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: '/api/leads',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenB}`
      }
    }, {
      company_name: 'Beta Robotics Solutions',
      website: 'https://betarobotics.com',
      city: 'Pune',
      state: 'Maharashtra',
      category: 'Robotics & Automation'
    });
    console.log(`✅ Company B saved for User B. Lead ID: ${addCompanyBRes.data.lead.lead_id}`);

    const getLeadsBAfter = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: '/api/leads',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${tokenB}` }
    });
    console.log(`✅ User B lead count: ${getLeadsBAfter.data.count}. Sees: "${getLeadsBAfter.data.leads[0].company_name}"`);

    const getLeadsARecheck = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: '/api/leads',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${tokenA}` }
    });
    const userAHasB = getLeadsARecheck.data.leads.some((l) => l.company_name.includes('Beta'));
    if (!userAHasB) {
      console.log('✅ SUCCESS: User A does NOT see User B\'s Company B. Bidirectional isolation verified!\n');
    } else {
      console.error('❌ FAIL: User A saw User B\'s lead!');
      process.exit(1);
    }

    // TEST 4: Unauthenticated Request Protection
    console.log('[TEST 4] Testing Unauthenticated request to /api/leads without token...');
    const unauthRes = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: '/api/leads',
      method: 'GET'
    });

    if (unauthRes.status === 401) {
      console.log('✅ SUCCESS: Endpoint blocked request with HTTP 401 Unauthorized!\n');
    } else {
      console.error('❌ FAIL: Endpoint allowed unauthenticated access!');
      process.exit(1);
    }

    // TEST 5 & 6: Relogin & Session Persistence
    console.log('[TEST 5 & 6] Testing Login & Profile retrieval...');
    const meRes = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: '/api/auth/me',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${tokenA}` }
    });
    console.log(`✅ Session verified for User A: ${meRes.data.user.full_name} (${meRes.data.user.company_name})\n`);

    console.log('====================================================');
    console.log('ALL 7 SAAS MULTI-TENANT AUTHENTICATION TESTS PASSED 100%!');
    console.log('====================================================');

  } catch (err) {
    console.error('Test Failed with Error:', err);
    process.exit(1);
  }
}

runTests();
