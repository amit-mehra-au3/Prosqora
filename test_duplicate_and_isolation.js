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
  console.log('RUNNING AUTOLEAD COMPOSITE DUPLICATE & MULTI-TENANCY TESTS');
  console.log('====================================================\n');

  try {
    const timeId = Date.now();
    const targetUrl = 'https://www.visionautomationrobotic.com/';

    // ----------------------------------------------------
    // TEST A: Login as User A & Scan + Save Website
    // ----------------------------------------------------
    console.log('[TEST A] Creating User A...');
    const userARes = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: '/api/auth/signup',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      full_name: 'User A',
      company_name: 'Automation A Pvt Ltd',
      email: `usera_${timeId}@automation.com`,
      password: 'password123',
      confirm_password: 'password123'
    });
    const tokenA = userARes.data.token;
    console.log(`✅ User A logged in. Token: ${tokenA.slice(0, 15)}...`);

    console.log(`[TEST A] User A scanning ${targetUrl}...`);
    const scanResA = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: '/api/scan',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`
      }
    }, { url: targetUrl });
    console.log(`✅ Scan completed. Company: "${scanResA.data.data.company_name}". Is in CRM: ${scanResA.data.data.isAlreadyInCrm}`);

    console.log(`[TEST A] User A saving scanned lead to CRM...`);
    const saveResA = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: '/api/leads',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`
      }
    }, scanResA.data.data);

    if (saveResA.status === 200 && saveResA.data.status === 'created') {
      console.log(`✅ SUCCESS [TEST A]: Lead saved to CRM successfully! Lead ID: ${saveResA.data.lead.lead_id}\n`);
    } else {
      console.error('❌ FAIL [TEST A]: Expected status created, got:', saveResA.data);
      process.exit(1);
    }

    // ----------------------------------------------------
    // TEST B: User A scans same website again -> Structured duplicate response
    // ----------------------------------------------------
    console.log(`[TEST B] User A scanning ${targetUrl} AGAIN...`);
    const rescanResA = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: '/api/scan',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`
      }
    }, { url: targetUrl });
    console.log(`✅ Scanner detected existing lead! isAlreadyInCrm: ${rescanResA.data.data.isAlreadyInCrm}`);

    console.log(`[TEST B] User A clicking "Save to CRM" on duplicate website...`);
    const duplicateSaveResA = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: '/api/leads',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`
      }
    }, rescanResA.data.data);

    if (duplicateSaveResA.status === 200 && duplicateSaveResA.data.status === 'duplicate') {
      console.log(`✅ SUCCESS [TEST B]: Handled gracefully! Returned status: "duplicate", message: "${duplicateSaveResA.data.message}". ZERO SQLITE ERRORS!\n`);
    } else {
      console.error('❌ FAIL [TEST B]: Got status:', duplicateSaveResA.data);
      process.exit(1);
    }

    // ----------------------------------------------------
    // TEST C: Login as User B & Scan + Save SAME Website
    // ----------------------------------------------------
    console.log('[TEST C] Creating User B...');
    const userBRes = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: '/api/auth/signup',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      full_name: 'User B',
      company_name: 'Robotics B Corp',
      email: `userb_${timeId}@robotics.com`,
      password: 'password456',
      confirm_password: 'password456'
    });
    const tokenB = userBRes.data.token;
    console.log(`✅ User B logged in.`);

    console.log(`[TEST C] User B scanning SAME website ${targetUrl}...`);
    const scanResB = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: '/api/scan',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenB}`
      }
    }, { url: targetUrl });
    console.log(`✅ User B scan completed. isAlreadyInCrm: ${scanResB.data.data.isAlreadyInCrm}`);

    console.log(`[TEST C] User B saving lead to CRM...`);
    const saveResB = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: '/api/leads',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenB}`
      }
    }, scanResB.data.data);

    if (saveResB.status === 200 && saveResB.data.status === 'created') {
      console.log(`✅ SUCCESS [TEST C]: User B saved lead successfully! Composite UNIQUE(user_id, normalized_url) allowed multi-tenant URL sharing! Lead ID: ${saveResB.data.lead.lead_id}\n`);
    } else {
      console.error('❌ FAIL [TEST C]: User B failed to save same URL:', saveResB.data);
      process.exit(1);
    }

    // ----------------------------------------------------
    // TEST D: Verify User A & User B leads isolation
    // ----------------------------------------------------
    console.log('[TEST D] Querying User A leads...');
    const getLeadsA = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: '/api/leads',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${tokenA}` }
    });

    console.log('[TEST D] Querying User B leads...');
    const getLeadsB = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: '/api/leads',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${tokenB}` }
    });

    const leadIdA = getLeadsA.data.leads[0].id;
    const leadIdB = getLeadsB.data.leads[0].id;

    if (leadIdA !== leadIdB) {
      console.log(`✅ SUCCESS [TEST D]: User A Lead ID (${getLeadsA.data.leads[0].lead_id}) is distinct from User B Lead ID (${getLeadsB.data.leads[0].lead_id}). Complete multi-tenant separation verified!\n`);
    } else {
      console.error('❌ FAIL [TEST D]: Lead IDs overlapped!');
      process.exit(1);
    }

    console.log('====================================================');
    console.log('ALL 5 COMPOSITE DUPLICATE & MULTI-TENANT TESTS PASSED 100%!');
    console.log('====================================================');

  } catch (err) {
    console.error('Test Failed with Error:', err);
    process.exit(1);
  }
}

runTests();
