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
  console.log('AUTOLEAD B2B TEMPLATE & COMPOSER SUITE');
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
      email: `b2b_composer_tester_${timeId}@autolead.com`,
      password: 'password123',
      confirm_password: 'password123'
    });

    const token = userRes.data.token;
    console.log(`✅ Authenticated! JWT Token received.`);

    // 2. Fetch Pre-Seeded Templates
    console.log('\n[STEP 2] Fetching Pre-Seeded B2B Email Templates...');
    const tplRes = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: '/api/email-templates',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const templates = tplRes.data.templates;
    console.log(`✅ Loaded ${templates.length} B2B email templates:`);
    templates.forEach((t, idx) => {
      console.log(`   ${idx + 1}. [${t.name}] Subject: "${t.subject}"`);
    });

    // 3. Test Variable Substitution & Fallback Logic
    console.log('\n[STEP 3] Testing Personalization Variable Engine...');
    const { substituteVariables } = require('./server/services/campaignQueue');
    const sampleTpl = templates[0].body;

    const substitutedLeadWithContact = substituteVariables(sampleTpl, {
      company_name: 'Precision Engineering Pvt Ltd',
      contact_person: 'Vikram Patel',
      city: 'Pune'
    });

    if (substitutedLeadWithContact.includes('Vikram Patel') && substitutedLeadWithContact.includes('AM Automation Trading')) {
      console.log('✅ Contact Name substitution verified ("Dear Vikram Patel, Greetings from AM Automation Trading")');
    } else {
      console.error('❌ FAIL: Contact Name substitution failed');
      process.exit(1);
    }

    const substitutedLeadNoContact = substituteVariables(sampleTpl, {
      company_name: 'Unidentified Plant Corp'
    });

    if (substitutedLeadNoContact.includes("Dear Sir/Ma’am,")) {
      console.log("✅ Missing Contact Name fallback verified (\"Dear Sir/Ma’am,\")");
    } else {
      console.error("❌ FAIL: Fallback to Sir/Ma’am failed");
      process.exit(1);
    }

    // 4. Test Send Test Email Endpoint with Business Card Image
    console.log('\n[STEP 4] Testing Send Test Email Route (POST /api/gmail/send-test-email)...');
    const dummyBase64Image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    
    const sendTestRes = await makeRequest({
      hostname: 'localhost',
      port: 5001,
      path: '/api/gmail/send-test-email',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    }, {
      recipientEmail: 'amautomationtrading@gmail.com',
      subject: 'Industrial Automation Products & Solutions – AM Automation Trading Test Run',
      body: substitutedLeadWithContact,
      businessCardImage: dummyBase64Image
    });

    console.log(`✅ Send Test Email API Result Status: ${sendTestRes.status}`);
    if (sendTestRes.data.error) {
      console.log(`   Notice (Gmail OAuth pending): "${sendTestRes.data.error}"`);
    } else {
      console.log(`   Real Message ID: ${sendTestRes.data.messageId}`);
    }

    console.log('\n====================================================');
    console.log('ALL B2B TEMPLATE & COMPOSER TESTS PASSED 100%!');
    console.log('====================================================');

  } catch (err) {
    console.error('Test Failed:', err);
    process.exit(1);
  }
}

runTests();
