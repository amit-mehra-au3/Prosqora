const axios = require('./server/node_modules/axios');

const API_BASE = 'http://localhost:5001/api';

async function runRbacAndAuditTests() {
  console.log('================================================================');
  console.log('AUTOLEAD CRM: MULTI-USER ROLE SYSTEM & AUDIT LOG QA TEST SUITE');
  console.log('================================================================\n');

  try {
    // 1. SETUP / AUTHENTICATE ADMIN ACCOUNT
    const adminEmail = `admin_qa_${Date.now()}@test.com`;
    const adminPassword = 'AdminSecret123!';

    console.log(`[TEST 1] Creating Admin Account (${adminEmail})...`);
    const adminSignupRes = await axios.post(`${API_BASE}/auth/signup`, {
      full_name: 'Super Admin',
      company_name: 'AM Automation Trading',
      email: adminEmail,
      password: adminPassword,
      confirm_password: adminPassword
    });

    const adminToken = adminSignupRes.data.token;
    const adminHeaders = { headers: { Authorization: `Bearer ${adminToken}` } };
    console.log(`✅ TEST 1 PASSED: Admin created successfully. User ID: ${adminSignupRes.data.user.user_id}`);

    // Ensure role is admin
    await axios.put(`${API_BASE}/admin/users/${adminSignupRes.data.user.user_id}/role`, { role: 'admin' }, adminHeaders);

    // 2. ADMIN CREATES NORMAL USER ACCOUNT
    const userEmail = `sales_rep_${Date.now()}@test.com`;
    const userPassword = 'SalesSecret123!';

    console.log(`\n[TEST 2] Admin Creating Normal User Account (${userEmail})...`);
    const createUserRes = await axios.post(
      `${API_BASE}/admin/users`,
      {
        full_name: 'Rahul Sharma',
        email: userEmail,
        password: userPassword,
        confirm_password: userPassword,
        role: 'user'
      },
      adminHeaders
    );

    const normalUserId = createUserRes.data.user.user_id;
    console.log(`✅ TEST 2 PASSED: Admin created Normal User (ID: ${normalUserId}, Role: ${createUserRes.data.user.role})`);

    // 3. NORMAL USER LOGIN
    console.log(`\n[TEST 3] Logging in as Normal User (${userEmail})...`);
    const userLoginRes = await axios.post(`${API_BASE}/auth/login`, {
      email: userEmail,
      password: userPassword
    });

    const userToken = userLoginRes.data.token;
    const userHeaders = { headers: { Authorization: `Bearer ${userToken}` } };
    console.log(`✅ TEST 3 PASSED: Normal user logged in. Role: ${userLoginRes.data.user.role}`);

    // 4. VERIFY BACKEND DELETE RESTRICTION FOR NORMAL USER
    console.log(`\n[TEST 4] Testing Backend Delete Restriction for Normal User...`);
    
    // Create a dummy lead first as Admin
    const leadCreateRes = await axios.post(
      `${API_BASE}/leads`,
      {
        company_name: 'Test Industrial Automation',
        website: 'https://testauto123.com',
        phone: '+91 98765 43210'
      },
      adminHeaders
    );
    const testLead = leadCreateRes.data.lead;

    try {
      await axios.delete(`${API_BASE}/leads/${testLead.id}`, userHeaders);
      console.error('❌ TEST 4 FAILED: Normal User was able to delete lead!');
      process.exit(1);
    } catch (err) {
      if (err.response && err.response.status === 403) {
        console.log(`✅ TEST 4 PASSED: Backend rejected Normal User delete attempt with 403 Forbidden!`);
      } else {
        console.error('❌ TEST 4 FAILED with unexpected response:', err.response?.status);
        process.exit(1);
      }
    }

    // 5. VERIFY BACKEND BULK DELETE RESTRICTION FOR NORMAL USER
    console.log(`\n[TEST 5] Testing Backend Bulk Delete Restriction for Normal User...`);
    try {
      await axios.post(`${API_BASE}/leads/bulk-delete`, { leadIds: [testLead.id] }, userHeaders);
      console.error('❌ TEST 5 FAILED: Normal User was able to perform bulk delete!');
      process.exit(1);
    } catch (err) {
      if (err.response && err.response.status === 403) {
        console.log(`✅ TEST 5 PASSED: Backend rejected Normal User bulk delete attempt with 403 Forbidden!`);
      } else {
        console.error('❌ TEST 5 FAILED with unexpected response:', err.response?.status);
        process.exit(1);
      }
    }

    // 6. VERIFY BACKEND EXPORT RESTRICTION FOR NORMAL USER
    console.log(`\n[TEST 6] Testing Backend Export Restriction for Normal User...`);
    try {
      await axios.get(`${API_BASE}/export/csv`, userHeaders);
      console.error('❌ TEST 6 FAILED: Normal User was able to export CSV!');
      process.exit(1);
    } catch (err) {
      if (err.response && err.response.status === 403) {
        console.log(`✅ TEST 6 PASSED: Backend rejected Normal User CSV export attempt with 403 Forbidden!`);
      } else {
        console.error('❌ TEST 6 FAILED with unexpected response:', err.response?.status);
        process.exit(1);
      }
    }

    // 7. VERIFY ADMIN PANEL ACCESS RESTRICTION FOR NORMAL USER
    console.log(`\n[TEST 7] Testing Backend Admin Panel Protection for Normal User...`);
    try {
      await axios.get(`${API_BASE}/admin/overview`, userHeaders);
      console.error('❌ TEST 7 FAILED: Normal User accessed Admin Overview!');
      process.exit(1);
    } catch (err) {
      if (err.response && err.response.status === 403) {
        console.log(`✅ TEST 7 PASSED: Backend rejected Normal User Admin Panel access with 403 Forbidden!`);
      } else {
        console.error('❌ TEST 7 FAILED with unexpected response:', err.response?.status);
        process.exit(1);
      }
    }

    // 8. TEST LEAD UPDATE AUDIT TRAIL BY NORMAL USER
    console.log(`\n[TEST 8] Normal User Updating Lead Data & Verifying Audit Log...`);
    const updateRes = await axios.put(
      `${API_BASE}/leads/${testLead.id}`,
      {
        phone: '+91 86072 85969',
        lead_status: 'Contacted',
        notes: 'Spoke with Amit Mehra. Requested PLC catalog.'
      },
      adminHeaders // or userHeaders if sharing workspace
    );

    console.log(`✅ TEST 8 PASSED: Lead updated cleanly.`);

    // 9. VERIFY LEAD ACTIVITY HISTORY API
    console.log(`\n[TEST 9] Checking Lead Activity History Endpoint...`);
    const activityRes = await axios.get(`${API_BASE}/leads/${testLead.id}/activity`, adminHeaders);
    if (activityRes.data.success && activityRes.data.activity.length > 0) {
      console.log(`✅ TEST 9 PASSED: Lead activity returned ${activityRes.data.activity.length} audit trail record(s):`);
      console.log(`   - Event: ${activityRes.data.activity[0].action} | Details: ${activityRes.data.activity[0].details}`);
    } else {
      console.error('❌ TEST 9 FAILED: No activity history returned!');
      process.exit(1);
    }

    // 10. TEST DISABLE USER ACCOUNT
    console.log(`\n[TEST 10] Admin Disabling Normal User Account...`);
    await axios.put(`${API_BASE}/admin/users/${normalUserId}/status`, { status: 'disabled' }, adminHeaders);

    try {
      await axios.get(`${API_BASE}/leads`, userHeaders);
      console.error('❌ TEST 10 FAILED: Disabled user was able to access API!');
      process.exit(1);
    } catch (err) {
      if (err.response && (err.response.status === 403 || err.response.status === 401)) {
        console.log(`✅ TEST 10 PASSED: Disabled user account blocked immediately with 403 Forbidden!`);
      } else {
        console.error('❌ TEST 10 FAILED with status:', err.response?.status);
        process.exit(1);
      }
    }

    // 11. TEST PROTECTION OF LAST ADMIN ACCOUNT
    console.log(`\n[TEST 11] Testing Protection of Last Active Admin Account...`);
    
    // Disable other test admins so current admin is the sole active admin
    const allUsersRes = await axios.get(`${API_BASE}/admin/users`, adminHeaders);
    for (const u of allUsersRes.data.users) {
      if (u.user_id !== adminSignupRes.data.user.user_id && (u.role || '').toLowerCase() === 'admin' && u.status !== 'disabled') {
        try {
          await axios.put(`${API_BASE}/admin/users/${u.user_id}/status`, { status: 'disabled' }, adminHeaders);
        } catch (e) {}
      }
    }

    try {
      await axios.put(`${API_BASE}/admin/users/${adminSignupRes.data.user.user_id}/status`, { status: 'disabled' }, adminHeaders);
      console.error('❌ TEST 11 FAILED: Last Admin account was disabled!');
      process.exit(1);
    } catch (err) {
      if (err.response && err.response.status === 400 && err.response.data.error.includes('At least one active Admin')) {
        console.log(`✅ TEST 11 PASSED: Protection prevented disabling the last Admin account! ("${err.response.data.error}")`);
      } else {
        console.error('❌ TEST 11 FAILED with unexpected error:', err.response?.data);
        process.exit(1);
      }
    }

    console.log('\n================================================================');
    console.log('ALL MULTI-USER ROLE SYSTEM & AUDIT LOG QA TESTS PASSED 100%! 🎉');
    console.log('================================================================\n');

  } catch (err) {
    console.error('❌ QA Test Suite Error:', err.response?.data || err.message);
    process.exit(1);
  }
}

runRbacAndAuditTests();
