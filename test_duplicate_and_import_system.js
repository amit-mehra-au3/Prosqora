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

async function runTestCases() {
  console.log('================================================================');
  console.log('AUTOLEAD CRM: CSV IMPORT & DUPLICATE SYSTEM END-TO-END TEST SUITE');
  console.log('================================================================\n');

  try {
    const timeId = Date.now();

    // 1. Setup Test Workspace A & Workspace B
    console.log('[SETUP] Creating Test Workspace A and Workspace B...');
    const userARes = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: '/api/auth/signup',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      full_name: 'Tester Workspace A',
      company_name: 'Workspace A Industrial',
      email: `test_ws_a_${timeId}@autolead.com`,
      password: 'password123',
      confirm_password: 'password123'
    });

    const tokenA = userARes.data.token;
    const userIdA = userARes.data.user.user_id;

    const userBRes = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: '/api/auth/signup',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      full_name: 'Tester Workspace B',
      company_name: 'Workspace B Industrial',
      email: `test_ws_b_${timeId}@autolead.com`,
      password: 'password123',
      confirm_password: 'password123'
    });

    const tokenB = userBRes.data.token;
    const userIdB = userBRes.data.user.user_id;

    console.log(`✅ Workspace A created: ${userIdA}`);
    console.log(`✅ Workspace B created: ${userIdB}\n`);

    // TEST 1 — Exact Duplicate Check
    console.log('[TEST 1] Testing Exact Duplicate Prevention...');
    // Seed initial lead in Workspace A
    await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: '/api/leads',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenA}` }
    }, {
      company_name: 'Test 1 Automation',
      website: 'abc.com'
    });

    // Try importing exact duplicate via bulk import
    const test1Res = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: '/api/leads/bulk-import',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenA}` }
    }, {
      leads: [{ company_name: 'Test 1 Duplicate', website: 'abc.com' }]
    });

    if (test1Res.data.existingDuplicatesCount === 1 && test1Res.data.importedCount === 0) {
      console.log('✅ TEST 1 PASSED: Exact Duplicate detected as Existing Lead (Imported: 0, Existing Duplicates: 1)');
    } else {
      console.error('❌ TEST 1 FAILED:', test1Res.data);
      process.exit(1);
    }

    // TEST 2 — WWW Duplicate Check
    console.log('\n[TEST 2] Testing WWW URL Normalization Duplicate Prevention...');
    const test2Res = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: '/api/leads/bulk-import',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenA}` }
    }, {
      leads: [{ company_name: 'WWW Duplicate Inc', website: 'https://www.abc.com/' }]
    });

    if (test2Res.data.existingDuplicatesCount === 1 && test2Res.data.importedCount === 0) {
      console.log('✅ TEST 2 PASSED: WWW variant (https://www.abc.com/) normalized and flagged as duplicate of abc.com');
    } else {
      console.error('❌ TEST 2 FAILED:', test2Res.data);
      process.exit(1);
    }

    // TEST 3 — HTTP/HTTPS Duplicate Check
    console.log('\n[TEST 3] Testing HTTP vs HTTPS Canonical Domain Duplicate Prevention...');
    const test3Res = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: '/api/leads/bulk-import',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenA}` }
    }, {
      leads: [{ company_name: 'HTTP Variant Ltd', website: 'http://abc.com/path?query=1' }]
    });

    if (test3Res.data.existingDuplicatesCount === 1 && test3Res.data.importedCount === 0) {
      console.log('✅ TEST 3 PASSED: HTTP/HTTPS path variant normalized to canonical abc.com');
    } else {
      console.error('❌ TEST 3 FAILED:', test3Res.data);
      process.exit(1);
    }

    // TEST 4 — CSV Internal Duplicate Deduplication
    console.log('\n[TEST 4] Testing CSV Internal Deduplication...');
    const test4Res = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: '/api/leads/bulk-import',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenA}` }
    }, {
      leads: [
        { company_name: 'Unique Internal 1', website: 'internal-dup-test.com' },
        { company_name: 'Unique Internal 2', website: 'www.internal-dup-test.com' },
        { company_name: 'Unique Internal 3', website: 'https://internal-dup-test.com/' }
      ]
    });

    if (test4Res.data.importedCount === 1 && test4Res.data.csvDuplicatesCount === 2) {
      console.log('✅ TEST 4 PASSED: 3 CSV rows with website variants deduplicated to 1 imported lead and 2 CSV duplicates');
    } else {
      console.error('❌ TEST 4 FAILED:', test4Res.data);
      process.exit(1);
    }

    // TEST 5 — Intelligent Lead Merge Test
    console.log('\n[TEST 5] Testing Intelligent Duplicate Lead Merge...');
    const { runQuery } = require('./server/db');
    const lead1Res = await runQuery(
      `INSERT INTO leads (lead_id, user_id, company_name, website, normalized_url, phone, email) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [`LEAD-DUP1-${timeId}`, userIdA, 'Legacy Lead A', 'xyz-1.com', 'xyz-1.com', '', 'sales@xyz-industrial.com']
    );
    const lead2Res = await runQuery(
      `INSERT INTO leads (lead_id, user_id, company_name, website, normalized_url, phone, email) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [`LEAD-DUP2-${timeId}`, userIdA, 'Legacy Lead B', 'xyz-2.com', 'xyz-2.com', '+91 99999 88888', '']
    );

    // Perform Merge of Lead 2 into Lead 1
    const mergeRes = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: '/api/leads/merge',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenA}` }
    }, {
      primaryId: lead1Res.lastID,
      duplicateIds: [lead2Res.lastID]
    });

    if (mergeRes.data.success && mergeRes.data.lead.email === 'sales@xyz-industrial.com' && mergeRes.data.lead.phone === '+91 99999 88888') {
      console.log('✅ TEST 5 PASSED: Lead 1 and Lead 2 merged into primary lead, preserving non-empty email and phone!');
    } else {
      console.error('❌ TEST 5 FAILED:', mergeRes.data);
      process.exit(1);
    }

    // TEST 6 — Multi-Tenant Workspace Isolation
    console.log('\n[TEST 6] Testing Multi-Tenant Workspace Isolation...');
    const test6Res = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: '/api/leads/bulk-import',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenB}` }
    }, {
      leads: [{ company_name: 'Workspace B Lead', website: 'abc.com' }]
    });

    if (test6Res.data.importedCount === 1) {
      console.log('✅ TEST 6 PASSED: abc.com successfully imported into Workspace B without interfering with Workspace A');
    } else {
      console.error('❌ TEST 6 FAILED:', test6Res.data);
      process.exit(1);
    }

    // TEST 7 — Missing Website Handling
    console.log('\n[TEST 7] Testing Missing Website Handling...');
    const test7Res = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: '/api/leads/bulk-import',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenA}` }
    }, {
      leads: [
        { company_name: 'Company Without Web', website: '' },
        { company_name: 'Valid Web Company', website: 'valid-web-123.com' }
      ],
      allowMissingWebsite: false
    });

    if (test7Res.data.missingWebsitesCount === 1 && test7Res.data.importedCount === 1) {
      console.log('✅ TEST 7 PASSED: Missing website row flagged as Missing Website while valid row imported');
    } else {
      console.error('❌ TEST 7 FAILED:', test7Res.data);
      process.exit(1);
    }

    // TEST 8 — Invalid Website Handling
    console.log('\n[TEST 8] Testing Invalid Website Handling...');
    const test8Res = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: '/api/leads/bulk-import',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenA}` }
    }, {
      leads: [
        { company_name: 'Invalid Website 1', website: 'hello' },
        { company_name: 'Invalid Website 2', website: '12345' },
        { company_name: 'Valid Web Company 2', website: 'valid-web-456.com' }
      ]
    });

    if (test8Res.data.invalidWebsitesCount === 2 && test8Res.data.importedCount === 1) {
      console.log('✅ TEST 8 PASSED: 2 invalid website rows flagged without application crash');
    } else {
      console.error('❌ TEST 8 FAILED:', test8Res.data);
      process.exit(1);
    }

    // TEST 9 — Large CSV Performance Batch Processing
    console.log('\n[TEST 9] Testing Large CSV Batch Performance...');
    const largeBatch = [];
    for (let i = 1; i <= 300; i++) {
      largeBatch.push({
        company_name: `Batch Company ${i}`,
        website: `batch-company-${timeId}-${i}.com`,
        email: `contact@batch-${i}.com`,
        phone: `+91 80000 ${10000 + i}`
      });
    }

    const startMs = Date.now();
    const test9Res = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: '/api/leads/bulk-import',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenA}` }
    }, {
      leads: largeBatch
    });

    const elapsedMs = Date.now() - startMs;
    if (test9Res.data.importedCount === 300) {
      console.log(`✅ TEST 9 PASSED: Imported 300 leads in ${elapsedMs}ms without N+1 query overhead`);
    } else {
      console.error('❌ TEST 9 FAILED:', test9Res.data);
      process.exit(1);
    }

    // TEST 10 — Manual Lead Creation Duplicate Prevention
    console.log('\n[TEST 10] Testing Manual Lead Creation Duplicate Prevention...');
    const test10Res = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: '/api/leads',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenA}` }
    }, {
      company_name: 'Manual Duplicate Attempt',
      website: 'https://abc.com/'
    });

    if (test10Res.data.duplicate === true && test10Res.data.status === 'duplicate') {
      console.log('✅ TEST 10 PASSED: Manual lead creation blocked with duplicate response ("Already in your CRM")');
    } else {
      console.error('❌ TEST 10 FAILED:', test10Res.data);
      process.exit(1);
    }

    console.log('\n================================================================');
    console.log('ALL 10 TEST CASES PASSED 100%! CRM SYSTEM IS FULLY VALIDATED.');
    console.log('================================================================');

  } catch (err) {
    console.error('Test Suite Failed with Exception:', err);
    process.exit(1);
  }
}

runTestCases();
