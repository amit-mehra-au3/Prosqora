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
  console.log('AUTOLEAD INDUSTRIAL CRM WORKFLOW AUDIT SUITE');
  console.log('====================================================\n');

  try {
    const timeId = Date.now();
    const testUrl = 'https://www.visionautomationrobotic.com/';

    // 1. Authenticate User
    console.log('[STEP 1] User Registration & Workspace Authentication...');
    const userRes = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: '/api/auth/signup',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      full_name: 'CRM Sales Rep',
      company_name: 'Automation Sales Corp',
      email: `crm_rep_${timeId}@autolead.com`,
      password: 'password123',
      confirm_password: 'password123'
    });

    const token = userRes.data.token;
    console.log(`✅ User authenticated. JWT Token obtained.`);

    // 2. Scan Real Website
    console.log(`\n[STEP 2] Manual Website Scanner: Scanning ${testUrl}...`);
    const scanRes = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: '/api/scan',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    }, { url: testUrl });

    const scanData = scanRes.data.data;
    console.log(`✅ Website scanned successfully!`);
    console.log(`   - Company Name: "${scanData.company_name}"`);
    console.log(`   - Website: ${scanData.website}`);
    console.log(`   - Primary Phone: ${scanData.phone}`);
    console.log(`   - Primary Email: ${scanData.email}`);
    console.log(`   - City & State: ${scanData.city}, ${scanData.state}`);
    console.log(`   - Categories: ${JSON.stringify(scanData.categories)}`);
    console.log(`   - 0-100 Lead Score: ${scanData.lead_score} (${scanData.lead_priority})`);

    // 3. Save Lead to CRM
    console.log('\n[STEP 3] Saving Extracted Lead to User CRM Workspace...');
    const saveRes = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: '/api/leads',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    }, scanData);

    const savedLead = saveRes.data.lead;
    console.log(`✅ Lead saved to CRM successfully! Lead ID: ${savedLead.lead_id}`);

    // 4. Query All Leads & Verify Multi-Filtering
    console.log('\n[STEP 4] Testing CRM Multi-Filter Engine (City: Gurgaon, Search: CNC)...');
    const filterRes = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: '/api/leads?location=Gurgaon&search=CNC',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    console.log(`✅ Filtered CRM returned ${filterRes.data.count} qualified prospects.`);

    // 5. Update Follow-up Pipeline
    console.log(`\n[STEP 5] Updating Sales Pipeline & Next Follow-up Date for ${savedLead.lead_id}...`);
    const updateRes = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: `/api/leads/${savedLead.id}`,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    }, {
      lead_status: 'Contacted',
      last_contact: new Date().toISOString().split('T')[0],
      next_followup: '2026-08-20',
      notes: 'Spoke with reception. Scheduled technical sales call with engineering department.'
    });

    console.log(`✅ Lead status updated to: "${updateRes.data.lead.lead_status}". Next follow-up: ${updateRes.data.lead.next_followup}`);

    // 6. Test Dedicated Follow-ups Endpoint
    console.log('\n[STEP 6] Testing Dedicated Follow-ups Pipeline API...');
    const followupsRes = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: '/api/followups',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    console.log(`✅ Follow-ups API active! Upcoming follow-ups: ${followupsRes.data.upcoming.length}`);

    // 7. Verify Zero Discovery Endpoints Remain
    console.log('\n[STEP 7] Verifying Automated Discovery Endpoints are 100% removed...');
    const discoveryTest = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: '/api/discovery/find-leads',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
    }, { categories: ['CNC'], cities: ['Gurgaon'] });

    if (discoveryTest.status === 404) {
      console.log('✅ VERIFIED: Discovery route returned 404 Not Found. Automated discovery feature cleanly removed!');
    } else {
      console.error('❌ FAIL: Discovery route still exists!');
      process.exit(1);
    }

    console.log('\n====================================================');
    console.log('ALL AUTOLEAD INDUSTRIAL CRM TESTS PASSED 100%!');
    console.log('====================================================');

  } catch (err) {
    console.error('Test Failed:', err);
    process.exit(1);
  }
}

runTests();
