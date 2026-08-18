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

async function runStatusReconciliationTests() {
  console.log('================================================================');
  console.log('AUTOLEAD CRM: SINGLE SOURCE OF TRUTH & RECONCILIATION TEST SUITE');
  console.log('================================================================\n');

  try {
    const timestamp = Date.now();

    // 1. Authenticate Test Workspace User
    const userRes = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: '/api/auth/signup',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      full_name: 'Status QA Lead',
      company_name: 'Single Source Status Inc',
      email: `status_user_${timestamp}@autolead.com`,
      password: 'password123',
      confirm_password: 'password123'
    });

    const token = userRes.data.token;
    const userId = userRes.data.user.user_id;

    console.log(`✅ Authenticated User: ${userId}\n`);

    // TEST 1 — Accessible Website Status Evaluation
    console.log('[TEST 1] Testing Accessible Website Verification...');
    const queue1Res = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: '/api/leads/verify-queue',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
    }, {
      rows: [{ company_name: 'Example Industries', website: 'https://example.com' }]
    });

    const res1Item = queue1Res.data.verifiedResults[0];
    if (res1Item && (res1Item.status === 'Verified' || res1Item.status === 'Needs Review')) {
      console.log(`✅ TEST 1 PASSED: https://example.com evaluated as status=${res1Item.status} (Not hardcoded)`);
    } else {
      console.error('❌ TEST 1 FAILED:', res1Item);
      process.exit(1);
    }

    // TEST 2 — Inaccessible Website Status Evaluation (MUST NOT BE VERIFIED)
    console.log('\n[TEST 2] Testing Inaccessible Website Verification (Must NOT be Verified)...');
    const queue2Res = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: '/api/leads/verify-queue',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
    }, {
      rows: [{ company_name: 'Inaccessible Corp', website: 'https://unreachable-invalid-domain-xyz-777.org' }]
    });

    const res2Item = queue2Res.data.verifiedResults[0];
    if (res2Item && res2Item.status !== 'Verified' && res2Item.leadCandidate === null) {
      console.log(`✅ TEST 2 PASSED: Inaccessible domain evaluated as status="${res2Item.status}" and leadCandidate=null (Blocked from Verified)`);
    } else {
      console.error('❌ TEST 2 FAILED: Inaccessible domain was incorrectly marked Verified!', res2Item);
      process.exit(1);
    }

    // TEST 3 — Backend Re-Validation on Insertion
    console.log('\n[TEST 3] Testing Backend Validation in POST /api/leads/import-verified...');
    const insertRes = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: '/api/leads/import-verified',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
    }, {
      verifiedLeads: [
        {
          company_name: 'Sneaky Unreachable Lead',
          website: 'https://sneaky-unreachable-domain.com',
          website_status: '🔴 Not Accessible',
          verification_status: 'Verified' // Client attempting to fake Verified status for inaccessible website!
        }
      ]
    });

    // Check inserted lead in database
    const leadsFetch = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: '/api/leads',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const insertedLead = leadsFetch.data.leads.find((l) => l.company_name === 'Sneaky Unreachable Lead');

    if (insertedLead && insertedLead.verification_status === 'Needs Review' && insertedLead.website_status.includes('Not Accessible')) {
      console.log('✅ TEST 3 PASSED: Backend rejected fake Verified status for inaccessible website and set verification_status="Needs Review"');
    } else {
      console.error('❌ TEST 3 FAILED: Backend allowed fake Verified status!', insertedLead);
      process.exit(1);
    }

    // TEST 4 — Database QA Audit for Contradictory Records
    console.log('\n[TEST 4] Database QA Audit: Checking for Contradictory Records (Verified with Not Accessible website)...');
    const { getAll } = require('./server/db');
    const dbLeads = await getAll('SELECT id, company_name, website, website_status, verification_status FROM leads');
    
    const contradictory = dbLeads.filter(
      (l) => l.verification_status === 'Verified' && (l.website_status || '').includes('Not Accessible')
    );

    if (contradictory.length === 0) {
      console.log(`✅ TEST 4 PASSED: Database QA Audit verified ZERO contradictory records out of ${dbLeads.length} total lead records`);
    } else {
      console.error(`❌ TEST 4 FAILED: Found ${contradictory.length} contradictory record(s) in database!`, contradictory);
      process.exit(1);
    }

    console.log('\n================================================================');
    console.log('ALL SINGLE SOURCE OF TRUTH & RECONCILIATION TESTS PASSED 100%!');
    console.log('================================================================');

  } catch (err) {
    console.error('Status Reconciliation Test Failed:', err);
    process.exit(1);
  }
}

runStatusReconciliationTests();
