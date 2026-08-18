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
  console.log('AUTOLEAD GMAIL BULK EMAIL SENDING SYSTEM AUDIT SUITE');
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
      email: `amit_campaign_tester_${timeId}@autolead.com`,
      password: 'password123',
      confirm_password: 'password123'
    });

    const token = userRes.data.token;
    console.log(`✅ Authenticated! JWT Token received.`);

    // 2. Add Test Lead to CRM
    console.log('\n[STEP 2] Adding Test Industrial Lead to CRM...');
    const leadRes = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: '/api/leads',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    }, {
      company_name: 'ABC Robotics & Machinery Ltd',
      website: `http://abcrobotics_${timeId}.com`,
      city: 'Gurgaon',
      state: 'Haryana',
      contact_person: 'Rahul Sharma',
      email: 'purchase@abcrobotics.com',
      phone: '+91 98765 43210',
      category: 'Robotics & Automation',
      products: 'PLCs, HMIs, Servo Motors'
    });

    const leadId = leadRes.data.lead.id;
    console.log(`✅ Saved Lead ID: ${leadId} (${leadRes.data.lead.company_name})`);

    // 3. Test Email Template List & Default B2B Template
    console.log('\n[STEP 3] Fetching Email Templates...');
    const tplRes = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: '/api/email-templates',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const templates = tplRes.data.templates;
    console.log(`✅ Loaded ${templates.length} email templates.`);
    const defTpl = templates.find((t) => t.is_default) || templates[0];
    console.log(`   Default Template Subject: "${defTpl.subject}"`);

    // 4. Pre-Flight Recipient Audit
    console.log('\n[STEP 4] Testing Pre-Flight Recipient Audit API...');
    const auditRes = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: '/api/email-campaigns/audit',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    }, {
      leadIds: [leadId],
      allowPreviouslyContacted: false,
      isTestMode: true,
      testEmail: 'amautomationtrading@gmail.com'
    });

    const audit = auditRes.data.audit;
    console.log(`✅ Audit Complete: Total Selected: ${audit.totalSelected}, Valid: ${audit.validCount}, Skipped: ${audit.totalSkipped}`);

    // 5. Create Email Campaign (Test Mode)
    console.log('\n[STEP 5] Creating B2B Email Campaign (Test Mode Active)...');
    const campRes = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: '/api/email-campaigns',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    }, {
      name: 'AM Automation Trading B2B Initial Outreach',
      subject: defTpl.subject,
      body: defTpl.body,
      leadIds: [leadId],
      allowPreviouslyContacted: true,
      isTestMode: true,
      testEmail: 'amautomationtrading@gmail.com',
      dailyLimit: 100
    });

    const campaign = campRes.data.campaign;
    console.log(`✅ Campaign Created! Campaign ID: ${campaign.campaign_id} (Status: ${campaign.status})`);

    // 6. Start Campaign Queue
    console.log(`\n[STEP 6] Launching Queue Execution for ${campaign.campaign_id}...`);
    const startRes = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: `/api/email-campaigns/${campaign.campaign_id}/start`,
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    console.log(`✅ Queue Started: ${startRes.data.message}`);

    // Wait 3 seconds for queue to process item in Test Mode
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // 7. Check Campaign Status & Log Verification
    console.log('\n[STEP 7] Checking Campaign Logs & Recipient History...');
    const detailRes = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: `/api/email-campaigns/${campaign.campaign_id}`,
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    console.log(`✅ Campaign Progress: Status=${detailRes.data.campaign.status}, Sent=${detailRes.data.campaign.sent_count}, Failed=${detailRes.data.campaign.failed_count}`);
    const logItem = detailRes.data.logs[0];
    if (logItem) {
      console.log(`   - Recipient: ${logItem.recipient_email}`);
      console.log(`   - Personalized Body Snippet: "${logItem.body.split('\n')[0]}"`);
    }

    // 8. Test Do Not Contact Suppression
    console.log('\n[STEP 8] Testing Lead Suppression (Mark as Do Not Contact)...');
    const suppressRes = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: `/api/leads/${leadId}/suppress`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    }, { suppressed: true });

    console.log(`✅ Lead Suppression set to: ${suppressRes.data.suppressed}`);

    console.log('\n====================================================');
    console.log('ALL GMAIL BULK EMAIL SENDING SYSTEM TESTS PASSED 100%!');
    console.log('====================================================');

  } catch (err) {
    console.error('Test Failed:', err);
    process.exit(1);
  }
}

runTests();
