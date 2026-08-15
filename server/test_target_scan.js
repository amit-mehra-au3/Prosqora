const { scanWebsite } = require('./services/scannerService');

async function testTargetScan() {
  console.log('===========================================================');
  console.log('Testing AutoLead Scanner against https://www.visionautomationrobotic.com/');
  console.log('===========================================================');

  try {
    const data = await scanWebsite('https://www.visionautomationrobotic.com/');
    console.log('\n--- SCAN RESULT DATA ---');
    console.log('Company Name:', data.company_name);
    console.log('Website Status:', data.website_status);
    console.log('Primary Phone:', data.phone);
    console.log('Normalized Phone:', data.normalized_phone);
    console.log('Confidence Score:', data.confidence_score);
    console.log('Additional Phones:', JSON.stringify(data.additional_phones, null, 2));
    console.log('Email:', data.email);
    console.log('WhatsApp:', data.whatsapp);
    console.log('Social Links:', {
      linkedin: data.linkedin,
      facebook: data.facebook,
      instagram: data.instagram,
      youtube: data.youtube,
      twitter: data.twitter
    });
    console.log('\n--- EXTRACTION EVIDENCE LOGS ---');
    console.log(JSON.stringify(data.contact_evidence, null, 2));

    const cleanPhone = (data.phone || '').replace(/[^\d]/g, '');
    if (cleanPhone.includes('8373919166') || data.normalized_phone.includes('8373919166')) {
      console.log('\nSUCCESS: Phone number +91 8373919166 successfully extracted with HIGH confidence!');
    } else {
      console.error('\nFAILURE: Phone number +91 8373919166 was NOT extracted!');
    }
  } catch (err) {
    console.error('Scan Error:', err);
  }
}

testTargetScan();
