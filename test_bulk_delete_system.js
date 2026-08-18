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

async function runBulkDeleteTests() {
  console.log('================================================================');
  console.log('AUTOLEAD CRM: BULK LEAD SELECTION & DELETE TEST SUITE');
  console.log('================================================================\n');

  try {
    const timestamp = Date.now();

    // 1. Authenticate Test Workspace User A & User B
    const userARes = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: '/api/auth/signup',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      full_name: 'Bulk Tester A',
      company_name: 'Bulk Delete Workspace A',
      email: `bulk_user_a_${timestamp}@autolead.com`,
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
      full_name: 'Bulk Tester B',
      company_name: 'Bulk Delete Workspace B',
      email: `bulk_user_b_${timestamp}@autolead.com`,
      password: 'password123',
      confirm_password: 'password123'
    });

    const tokenB = userBRes.data.token;
    const userIdB = userBRes.data.user.user_id;

    console.log(`✅ Workspace A: ${userIdA}, Workspace B: ${userIdB}\n`);

    // Seed 15 test leads in Workspace A
    const seedLeadsA = [];
    for (let i = 1; i <= 15; i++) {
      seedLeadsA.push({
        company_name: `Bulk Test Lead A${i}`,
        website: `bulk-test-a-${timestamp}-${i}.com`,
        email: `contact@bulk-a-${i}.com`,
        phone: `+91 91000 ${10000 + i}`
      });
    }

    const seedResA = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: '/api/leads/import-verified',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenA}` }
    }, { verifiedLeads: seedLeadsA });

    // Seed 2 test leads in Workspace B
    const seedResB = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: '/api/leads/import-verified',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenB}` }
    }, {
      verifiedLeads: [
        { company_name: 'Tenant B Secret Lead 1', website: `secret-b-1-${timestamp}.com` },
        { company_name: 'Tenant B Secret Lead 2', website: `secret-b-2-${timestamp}.com` }
      ]
    });

    // Fetch leads for Workspace A
    const leadsARes = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: '/api/leads',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${tokenA}` }
    });
    const leadsA = leadsARes.data.leads;

    // Fetch leads for Workspace B
    const leadsBRes = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: '/api/leads',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${tokenB}` }
    });
    const leadsB = leadsBRes.data.leads;

    console.log(`Fetched Workspace A: ${leadsA.length} leads, Workspace B: ${leadsB.length} leads`);

    // TEST 1 — Delete Single Selected Lead
    console.log('\n[TEST 1] Testing Delete Single Lead via Bulk Endpoint...');
    const singleLeadId = leadsA[0].id;
    const delete1Res = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: '/api/leads/bulk-delete',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenA}` }
    }, { leadIds: [singleLeadId] });

    if (delete1Res.data.success && delete1Res.data.deletedCount === 1) {
      console.log('✅ TEST 1 PASSED: Single lead deleted successfully');
    } else {
      console.error('❌ TEST 1 FAILED:', delete1Res.data);
      process.exit(1);
    }

    // TEST 2 — Delete Multiple Selected Leads (10 Leads)
    console.log('\n[TEST 2] Testing Bulk Delete 10 Selected Leads...');
    const tenLeadIds = leadsA.slice(1, 11).map((l) => l.id);
    const delete10Res = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: '/api/leads/bulk-delete',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenA}` }
    }, { leadIds: tenLeadIds });

    if (delete10Res.data.success && delete10Res.data.deletedCount === 10) {
      console.log('✅ TEST 2 PASSED: 10 selected leads deleted in a single bulk transaction');
    } else {
      console.error('❌ TEST 2 FAILED:', delete10Res.data);
      process.exit(1);
    }

    // TEST 3 — Multi-Tenant Security & Cross-Workspace Deletion Protection
    console.log('\n[TEST 3] Testing Multi-Tenant Security (User A trying to bulk delete User B leads)...');
    const userBLeadId = leadsB[0].id;

    // User A sends User B's lead ID
    const hackRes = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: '/api/leads/bulk-delete',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenA}` }
    }, { leadIds: [userBLeadId] });

    // Verify User B's lead is still intact in Database
    const checkBRes = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: '/api/leads',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${tokenB}` }
    });

    const stillExistsInB = checkBRes.data.leads.some((l) => l.id === userBLeadId);

    if (hackRes.data.deletedCount === 0 && stillExistsInB) {
      console.log('✅ TEST 3 PASSED: Cross-workspace bulk deletion blocked (User B lead preserved intact)');
    } else {
      console.error('❌ TEST 3 FAILED: Cross-workspace protection broken!', hackRes.data);
      process.exit(1);
    }

    // TEST 4 — Invalid / Already-Deleted Lead IDs Handling
    console.log('\n[TEST 4] Testing Invalid & Already-Deleted Lead IDs Handling...');
    const invalidRes = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: '/api/leads/bulk-delete',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenA}` }
    }, { leadIds: [singleLeadId, 999999, -50] });

    if (invalidRes.data.success && invalidRes.data.deletedCount === 0 && invalidRes.data.failedCount === 2) {
      console.log('✅ TEST 4 PASSED: Invalid/already-deleted IDs handled safely without throwing database exception');
    } else {
      console.error('❌ TEST 4 FAILED:', invalidRes.data);
      process.exit(1);
    }

    // TEST 5 — Final Database Count Verification
    console.log('\n[TEST 5] Verifying Final CRM Database Counts...');
    const finalARes = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: '/api/leads',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${tokenA}` }
    });

    const remainingA = finalARes.data.leads.length;
    // Originally 15 -> deleted 1 -> deleted 10 -> 4 remaining
    if (remainingA === 4) {
      console.log(`✅ TEST 5 PASSED: Workspace A final lead count is exactly 4 remaining leads`);
    } else {
      console.error(`❌ TEST 5 FAILED: Expected 4 remaining leads, found ${remainingA}`);
      process.exit(1);
    }

    console.log('\n================================================================');
    console.log('ALL BULK DELETE TEST SCENARIOS PASSED 100%!');
    console.log('================================================================');

  } catch (err) {
    console.error('Bulk Delete Test Suite Failed:', err);
    process.exit(1);
  }
}

runBulkDeleteTests();
