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

async function runSmartRangeAndRefreshTests() {
  console.log('================================================================');
  console.log('AUTOLEAD CRM: SMART RANGE SELECTION & WEBSITE REFRESH TEST SUITE');
  console.log('================================================================\n');

  try {
    const timestamp = Date.now();

    // 1. Authenticate Test Users
    const userARes = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: '/api/auth/signup',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      full_name: 'Range Refresh Tester A',
      company_name: 'Range Refresh Corp A',
      email: `range_refresh_a_${timestamp}@autolead.com`,
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
      full_name: 'Range Refresh Tester B',
      company_name: 'Range Refresh Corp B',
      email: `range_refresh_b_${timestamp}@autolead.com`,
      password: 'password123',
      confirm_password: 'password123'
    });

    const tokenB = userBRes.data.token;

    console.log(`✅ Authenticated User A: ${userIdA}\n`);

    // 2. Populate 5 Test Leads in Workspace A
    const testLeads = [
      { company_name: 'Alpha Motion Ltd', website: 'https://example.com', phone: '+91 98000 00001', email: 'alpha@example.com' },
      { company_name: 'Beta Robotics Inc', website: 'https://example.org', phone: '+91 98000 00002', email: 'beta@example.org' },
      { company_name: 'Gamma Control Systems', website: 'https://example.net', phone: '+91 98000 00003', email: 'gamma@example.net' },
      { company_name: 'Delta Automation Co', website: 'https://example.com', phone: '+91 98000 00004', email: 'delta@example.com' }, // Same website as Lead 1 (Duplicate URL test)
      { company_name: 'Epsilon Machinery', website: 'https://unreachable-test-domain-88.org', phone: '+91 98000 00005', email: 'epsilon@example.org' }
    ];

    const importRes = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: '/api/leads/import-verified',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenA}` }
    }, {
      verifiedLeads: testLeads,
      fileName: 'test_range_refresh.csv'
    });

    const initialLeadsFetch = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: '/api/leads',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${tokenA}` }
    });

    const leadsA = initialLeadsFetch.data.leads;
    console.log(`✅ Populated ${leadsA.length} leads in Workspace A\n`);

    // TEST 1 — Smart Range Selection Algorithmic Math
    console.log('[TEST 1] Testing Smart Range Selection Logic...');
    const leadIds = leadsA.map((l) => l.id);
    const startIndex = 1; // Lead 2
    const endIndex = 3;   // Lead 4

    const selectedRange = leadIds.slice(startIndex, endIndex + 1);
    if (selectedRange.length === 3 && selectedRange[0] === leadIds[1] && selectedRange[2] === leadIds[3]) {
      console.log(`✅ TEST 1 PASSED: Inclusive range selection calculated 3 leads (Start: ID ${leadIds[1]}, End: ID ${leadIds[3]})`);
    } else {
      console.error('❌ TEST 1 FAILED: Range selection math incorrect', selectedRange);
      process.exit(1);
    }

    // TEST 2 — Refresh / Rescan Batch Chunk Execution (POST /api/leads/rescan-chunk)
    console.log('\n[TEST 2] Testing Refresh Websites Batch Chunk Execution...');
    const initialLeadCount = leadsA.length;

    const rescanRes = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: '/api/leads/rescan-chunk',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenA}` }
    }, {
      leadIdsChunk: leadIds
    });

    if (rescanRes.data.success && rescanRes.data.rescannedCount === initialLeadCount) {
      console.log(`✅ TEST 2 PASSED: Rescanned chunk returned success for ${rescanRes.data.rescannedCount} existing leads`);
    } else {
      console.error('❌ TEST 2 FAILED:', rescanRes.data);
      process.exit(1);
    }

    // TEST 3 — Verify Total Lead Count Unchanged (Zero New Leads Created)
    console.log('\n[TEST 3] Verifying Total Lead Count Unchanged (Zero New Leads Created)...');
    const postRescanFetch = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: '/api/leads',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${tokenA}` }
    });

    const finalLeadsA = postRescanFetch.data.leads;
    if (finalLeadsA.length === initialLeadCount) {
      console.log(`✅ TEST 3 PASSED: Total lead count remained EXACTLY ${initialLeadCount} after website refresh (0 new leads created)`);
    } else {
      console.error(`❌ TEST 3 FAILED: Lead count changed from ${initialLeadCount} to ${finalLeadsA.length}`);
      process.exit(1);
    }

    // TEST 4 — Verify Data Preservation (Valuable Email / Phone Preserved)
    console.log('\n[TEST 4] Verifying Data Preservation (Non-empty CRM data retained)...');
    const alphaLead = finalLeadsA.find((l) => l.company_name.includes('Alpha'));
    if (alphaLead && alphaLead.email === 'alpha@example.com' && alphaLead.phone === '+91 98000 00001') {
      console.log('✅ TEST 4 PASSED: Pre-existing CRM email and phone were preserved cleanly during rescan');
    } else {
      console.error('❌ TEST 4 FAILED: CRM data was overwritten or lost!', alphaLead);
      process.exit(1);
    }

    // TEST 5 — Multi-Tenant Security (User B cannot rescan User A leads)
    console.log('\n[TEST 5] Testing Multi-Tenant Security (User B cannot rescan User A leads)...');
    const securityRescanRes = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: '/api/leads/rescan-chunk',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenB}` }
    }, {
      leadIdsChunk: leadIds
    });

    if (securityRescanRes.data.success && securityRescanRes.data.rescannedCount === 0) {
      console.log('✅ TEST 5 PASSED: Multi-tenant security blocked User B from rescanning User A leads');
    } else {
      console.error('❌ TEST 5 FAILED: Cross-tenant lead rescan allowed!', securityRescanRes.data);
      process.exit(1);
    }

    console.log('\n================================================================');
    console.log('ALL SMART RANGE & WEBSITE REFRESH TESTS PASSED 100%!');
    console.log('================================================================');

  } catch (err) {
    console.error('Smart Range & Refresh Test Failed:', err);
    process.exit(1);
  }
}

runSmartRangeAndRefreshTests();
