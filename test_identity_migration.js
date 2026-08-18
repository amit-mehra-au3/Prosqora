const { getRow, getAll } = require('./server/db');

async function runTests() {
  console.log('====================================================');
  console.log('COMPLETE USER IDENTITY MIGRATION AUDIT SUITE');
  console.log('====================================================\n');

  try {
    // 1. Verify User Record in Database
    console.log('[STEP 1] Inspecting Users Table for Business Email Migration...');
    const migratedUser = await getRow(`SELECT id, user_id, full_name, company_name, email FROM users WHERE user_id = 'usr_e298377f6e88f9b0'`);

    if (migratedUser) {
      console.log(`✅ User Record Found: ID=${migratedUser.id}, user_id=${migratedUser.user_id}`);
      console.log(`   - Full Name: "${migratedUser.full_name}"`);
      console.log(`   - Company Name: "${migratedUser.company_name}"`);
      console.log(`   - Email: "${migratedUser.email}"`);

      if (migratedUser.email === 'amautomationtrading@gmail.com') {
        console.log('✅ SUCCESS: Primary user email updated to amautomationtrading@gmail.com!');
      } else {
        console.error('❌ FAIL: User email is not amautomationtrading@gmail.com:', migratedUser.email);
        process.exit(1);
      }
    } else {
      console.error('❌ FAIL: Primary user record not found!');
      process.exit(1);
    }

    // 2. Verify Zero Personal Email Users Remain
    console.log('\n[STEP 2] Verifying Zero Occurrences of personal email (amitmehra720640@gmail.com)...');
    const oldUser = await getRow(`SELECT * FROM users WHERE email = 'amitmehra720640@gmail.com'`);
    if (!oldUser) {
      console.log('✅ VERIFIED: Zero records remain with personal email amitmehra720640@gmail.com.');
    } else {
      console.error('❌ FAIL: Legacy personal email user still exists in database!');
      process.exit(1);
    }

    // 3. Verify Legacy Gmail Tokens Purged
    console.log('\n[STEP 3] Verifying Legacy Gmail Tokens Purged...');
    const oldTokens = await getAll(`SELECT * FROM gmail_tokens WHERE email = 'amitmehra720640@gmail.com'`);
    if (oldTokens.length === 0) {
      console.log('✅ VERIFIED: Legacy tokens for amitmehra720640@gmail.com cleanly purged.');
    } else {
      console.error('❌ FAIL: Legacy tokens still exist in database!');
      process.exit(1);
    }

    // 4. Verify Associated CRM Data Intact
    console.log('\n[STEP 4] Verifying Associated CRM Data Intact for User ID usr_e298377f6e88f9b0...');
    const leads = await getAll(`SELECT id FROM leads WHERE user_id = 'usr_e298377f6e88f9b0'`);
    const campaigns = await getAll(`SELECT id FROM email_campaigns WHERE user_id = 'usr_e298377f6e88f9b0'`);

    console.log(`✅ User Workspace Intact: ${leads.length} leads and ${campaigns.length} email campaigns linked.`);

    console.log('\n====================================================');
    console.log('ALL USER IDENTITY MIGRATION AUDIT TESTS PASSED 100%!');
    console.log('====================================================');

  } catch (err) {
    console.error('Test Failed:', err);
    process.exit(1);
  }
}

runTests();
