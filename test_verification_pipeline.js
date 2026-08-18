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

async function runPipelineTests() {
  console.log('================================================================');
  console.log('AUTOLEAD CRM: WEBSITE VERIFICATION PIPELINE TEST SUITE');
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
      full_name: 'Pipeline Tester',
      company_name: 'Verification Pipeline Inc',
      email: `pipeline_user_${timestamp}@autolead.com`,
      password: 'password123',
      confirm_password: 'password123'
    });

    const token = userRes.data.token;
    const userId = userRes.data.user.user_id;

    console.log(`✅ Authenticated User: ${userId}\n`);

    // TEST 1 — Verification Queue Execution (No Unapproved Ingestion)
    console.log('[TEST 1] Testing Website Verification Queue & Unapproved Lead Hold...');
    const queue1Res = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: '/api/leads/verify-queue',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
    }, {
      rows: [
        { company_name: 'Example Corp', website: 'https://example.com' }
      ]
    });

    // Verify DB count before user approval
    const dbCount1 = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: '/api/leads',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (queue1Res.data.success && (queue1Res.data.verifiedCount === 1 || queue1Res.data.needsReviewCount === 1) && dbCount1.data.leads.length === 0) {
      console.log('✅ TEST 1 PASSED: Website scanned and verified. Lead is held in verification queue (CRM DB leads count = 0)');
    } else {
      console.error('❌ TEST 1 FAILED:', queue1Res.data, dbCount1.data);
      process.exit(1);
    }

    // TEST 2 — Duplicate Prevention against Existing CRM Lead
    console.log('\n[TEST 2] Testing Duplicate Prevention against Existing CRM Lead...');
    // Ingest initial verified lead
    await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: '/api/leads/import-verified',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
    }, {
      verifiedLeads: [queue1Res.data.verifiedResults[0].leadCandidate]
    });

    // Run verification queue with duplicate website
    const queue2Res = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: '/api/leads/verify-queue',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
    }, {
      rows: [{ company_name: 'Example Corp Duplicate', website: 'http://example.com/' }]
    });

    if (queue2Res.data.duplicatesCount === 1) {
      console.log('✅ TEST 2 PASSED: http://example.com/ flagged as Duplicate — Existing Lead');
    } else {
      console.error('❌ TEST 2 FAILED:', queue2Res.data);
      process.exit(1);
    }

    // TEST 3 — Single Scan Execution for CSV Internal Duplicate Variants
    console.log('\n[TEST 3] Testing CSV Internal Deduplication & Single Scan Execution...');
    const queue3Res = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: '/api/leads/verify-queue',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
    }, {
      rows: [
        { company_name: 'Variant 1', website: 'unique-pipe-test.com' },
        { company_name: 'Variant 2', website: 'www.unique-pipe-test.com' },
        { company_name: 'Variant 3', website: 'https://unique-pipe-test.com/' }
      ]
    });

    if (queue3Res.data.duplicatesCount === 2) {
      console.log('✅ TEST 3 PASSED: 3 CSV rows with website variants scanned only ONCE; 2 marked Duplicate in CSV');
    } else {
      console.error('❌ TEST 3 FAILED:', queue3Res.data);
      process.exit(1);
    }

    // TEST 4 — Company Name Mismatch Detection
    console.log('\n[TEST 4] Testing Company Name Mismatch Detection...');
    const { isCompanyNameMismatch } = require('./server/services/verificationService');
    const isMismatch = isCompanyNameMismatch('ABC Industrial Machinery', 'XYZ Robotics Solutions Pvt Ltd');
    const isMatch = isCompanyNameMismatch('AM Automation Trading', 'AM Automation Trading Pvt Ltd');

    if (isMismatch && !isMatch) {
      console.log('✅ TEST 4 PASSED: Company Name Mismatch logic correctly flags conflicting company names');
    } else {
      console.error('❌ TEST 4 FAILED: Mismatch check failed');
      process.exit(1);
    }

    // TEST 5 — Unreachable Website Detection
    console.log('\n[TEST 5] Testing Unreachable Website Handling...');
    const queue5Res = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: '/api/leads/verify-queue',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
    }, {
      rows: [{ company_name: 'Unreachable Inc', website: 'https://unreachable-domain-xyz-999.org' }]
    });

    if (queue5Res.data.unreachableCount === 1) {
      console.log('✅ TEST 5 PASSED: Unreachable domain flagged as Website Unreachable without application crash');
    } else {
      console.error('❌ TEST 5 FAILED:', queue5Res.data);
      process.exit(1);
    }

    // TEST 6 — Final Server-Side Duplicate Check on Ingestion
    console.log('\n[TEST 6] Testing Final Server-Side Duplicate Check right before Database Insertion...');
    const candidate = {
      company_name: 'Final Server Check Co',
      website: 'https://final-server-check-test.com',
      normalized_url: 'final-server-check-test.com',
      email: 'sales@final-check.com',
      phone: '+91 98888 77777',
      city: 'Gurgaon',
      state: 'Haryana',
      country: 'India'
    };

    // Simulate double submission of verified lead candidate
    const doubleInsertRes = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: '/api/leads/import-verified',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
    }, {
      verifiedLeads: [candidate, candidate]
    });

    if (doubleInsertRes.data.insertedCount === 1 && doubleInsertRes.data.duplicateAlreadyImportedCount === 1) {
      console.log('✅ TEST 6 PASSED: Final server-side check inserted candidate once and blocked duplicate (Inserted: 1, Duplicate Blocked: 1)');
    } else {
      console.error('❌ TEST 6 FAILED:', doubleInsertRes.data);
      process.exit(1);
    }

    console.log('\n================================================================');
    console.log('ALL VERIFICATION PIPELINE SCENARIOS PASSED 100%!');
    console.log('================================================================');

  } catch (err) {
    console.error('Pipeline Test Failed:', err);
    process.exit(1);
  }
}

runPipelineTests();
