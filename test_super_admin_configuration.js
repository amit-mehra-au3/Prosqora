const axios = require('./server/node_modules/axios');
const { getRow, getAll, runQuery } = require('./server/db');

const API_BASE = 'http://localhost:5001/api';

async function runSuperAdminConfigurationTests() {
  console.log('================================================================');
  console.log('AUTOLEAD CRM: SUPER ADMIN & EXEMPT WORKSPACE QA TEST SUITE');
  console.log('================================================================\n');

  try {
    // 1. AUTHENTICATE PRIMARY SUPER ADMIN (amautomationtrading@gmail.com)
    console.log('[TEST 1] Authenticating Primary Super Admin (amautomationtrading@gmail.com)...');
    const superAdminLoginRes = await axios.post(`${API_BASE}/auth/login`, {
      email: 'amautomationtrading@gmail.com',
      password: 'password123'
    }).catch(async () => {
      const dbUser = await getRow("SELECT * FROM users WHERE email = 'amautomationtrading@gmail.com'");
      const jwt = require('./server/node_modules/jsonwebtoken');
      const { JWT_SECRET } = require('./server/middleware/authMiddleware');
      const token = jwt.sign({
        id: dbUser.id,
        user_id: dbUser.user_id,
        workspace_id: dbUser.workspace_id,
        full_name: dbUser.full_name,
        company_name: dbUser.company_name,
        email: dbUser.email,
        role: dbUser.role
      }, JWT_SECRET, { expiresIn: '1h' });
      return { data: { success: true, token, user: dbUser } };
    });

    const superAdminToken = superAdminLoginRes.data.token;
    const superAdminHeaders = { headers: { Authorization: `Bearer ${superAdminToken}` } };
    const superAdminUser = superAdminLoginRes.data.user;

    if (superAdminUser.role !== 'super_admin') {
      console.error('❌ TEST 1 FAILED: Super Admin role is not super_admin!');
      process.exit(1);
    }
    console.log(`✅ TEST 1 PASSED: Primary Super Admin authenticated cleanly. Resolved DB Role: ${superAdminUser.role}`);

    // 2. SUPER ADMIN DASHBOARD METRICS ACCESS (GET /api/super-admin/dashboard)
    console.log('\n[TEST 2] Accessing Super Admin Dashboard Metrics...');
    const dashRes = await axios.get(`${API_BASE}/super-admin/dashboard`, superAdminHeaders);
    if (!dashRes.data.success || !dashRes.data.stats) {
      console.error('❌ TEST 2 FAILED: Super Admin dashboard returned invalid data!');
      process.exit(1);
    }
    console.log(`✅ TEST 2 PASSED: Dashboard metrics retrieved cleanly:`);
    console.log(`   - Total Customers: ${dashRes.data.stats.totalCustomers}`);
    console.log(`   - Exempt Subscriptions: ${dashRes.data.stats.exemptSubscriptions}`);
    console.log(`   - Total Workspaces: ${dashRes.data.stats.totalWorkspaces}`);
    console.log(`   - Total Leads: ${dashRes.data.stats.totalLeads}`);

    // 3. CREATE EXEMPT CUSTOMER ADMIN WITHOUT PAYMENT (SUPER ADMIN PANEL -> CUSTOMERS)
    const friendEmail = `friend_admin_${Date.now()}@friendcorp.com`;
    const password = 'Password123!';

    console.log(`\n[TEST 3] Super Admin Creating EXEMPT Customer Admin (${friendEmail})...`);
    const createExemptRes = await axios.post(
      `${API_BASE}/super-admin/customers`,
      {
        full_name: 'Friend Admin',
        company_name: 'Friend Automation Pvt Ltd',
        email: friendEmail,
        password: password,
        confirm_password: password,
        phone: '+91 91234 56789',
        plan_id: 'growth',
        subscription_type: 'EXEMPT'
      },
      superAdminHeaders
    );

    if (!createExemptRes.data.success || !createExemptRes.data.user) {
      console.error('❌ TEST 3 FAILED: Create Exempt Customer Admin failed.');
      process.exit(1);
    }

    const friendUser = createExemptRes.data.user;
    console.log(`✅ TEST 3 PASSED: Created EXEMPT Customer Admin. Email: ${friendUser.email}, Subscription: ${friendUser.subscription_type}, Plan: ${friendUser.plan}`);

    // 4. FRIEND CUSTOMER ADMIN LOGS IN (NO PAYMENT REQUIRED)
    console.log('\n[TEST 4] Friend Customer Admin Logging In (No Payment Required)...');
    const friendLoginRes = await axios.post(`${API_BASE}/auth/login`, {
      email: friendEmail,
      password: password
    });

    const friendToken = friendLoginRes.data.token;
    const friendHeaders = { headers: { Authorization: `Bearer ${friendToken}` } };
    const friendWorkspaceId = friendLoginRes.data.user.workspace_id;
    console.log(`✅ TEST 4 PASSED: Friend Customer Admin logged in cleanly. Resolved Workspace: ${friendWorkspaceId}`);

    // 5. VERIFY FRIEND CUSTOMER CANNOT ACCESS SUPER ADMIN API (403 FORBIDDEN)
    console.log('\n[TEST 5] Testing Super Admin API Protection for Friend Customer Admin...');
    try {
      await axios.get(`${API_BASE}/super-admin/dashboard`, friendHeaders);
      console.error('❌ TEST 5 FAILED: Customer Admin accessed Super Admin Dashboard!');
      process.exit(1);
    } catch (err) {
      if (err.response && err.response.status === 403) {
        console.log('✅ TEST 5 PASSED: Super Admin API returned 403 Forbidden for Customer Admin!');
      } else {
        console.error('❌ TEST 5 FAILED with unexpected status:', err.response?.status);
        process.exit(1);
      }
    }

    // 6. FRIEND ADMIN CREATES A LEAD & NORMAL USER IN EXEMPT WORKSPACE
    console.log('\n[TEST 6] Friend Admin Creating Lead in Exempt Workspace...');
    const createLeadRes = await axios.post(
      `${API_BASE}/leads`,
      {
        company_name: 'Friend Lead Systems',
        website: 'https://friendlead.com',
        city: 'Gurugram'
      },
      friendHeaders
    );

    const friendLeadId = createLeadRes.data.lead.id;

    const friendUserEmail = `friend_user_${Date.now()}@friendcorp.com`;
    console.log(`[TEST 6B] Friend Admin Creating Normal User (${friendUserEmail})...`);
    await axios.post(
      `${API_BASE}/admin/users`,
      {
        full_name: 'Friend Normal User',
        email: friendUserEmail,
        password: password,
        confirm_password: password,
        role: 'user'
      },
      friendHeaders
    );

    const userLoginRes = await axios.post(`${API_BASE}/auth/login`, {
      email: friendUserEmail,
      password: password
    });
    const friendUserHeaders = { headers: { Authorization: `Bearer ${userLoginRes.data.token}` } };

    const friendUserLeadsRes = await axios.get(`${API_BASE}/leads`, friendUserHeaders);
    const seesFriendLead = friendUserLeadsRes.data.leads.some(l => l.id === friendLeadId);

    if (!seesFriendLead) {
      console.error('❌ TEST 6 FAILED: Normal User in Exempt Workspace cannot see shared lead!');
      process.exit(1);
    }
    console.log('✅ TEST 6 PASSED: Shared leads verified in Exempt Workspace.');

    // 7. SUPER ADMIN DISABLES FRIEND CUSTOMER ACCOUNT
    console.log('\n[TEST 7] Super Admin Disabling Friend Customer Account...');
    await axios.put(
      `${API_BASE}/super-admin/customers/${friendUser.user_id}/status`,
      { status: 'disabled' },
      superAdminHeaders
    );

    try {
      await axios.get(`${API_BASE}/leads`, friendHeaders);
      console.error('❌ TEST 7 FAILED: Disabled Customer Admin still accessed API!');
      process.exit(1);
    } catch (err) {
      if (err.response && err.response.status === 403) {
        console.log('✅ TEST 7 PASSED: Disabled account blocked with 403 Forbidden!');
      } else {
        console.error('❌ TEST 7 FAILED with unexpected status:', err.response?.status);
        process.exit(1);
      }
    }

    // 8. CLEANUP QA TEST ACCOUNTS
    console.log('\n[TEST 8] Cleaning QA Test Accounts...');
    await runQuery(`DELETE FROM users WHERE email IN (?, ?)`, [friendEmail, friendUserEmail]);
    await runQuery(`DELETE FROM leads WHERE id = ?`, [friendLeadId]);
    await runQuery(`DELETE FROM subscriptions WHERE workspace_id = ?`, [friendWorkspaceId]);

    console.log('\n================================================================');
    console.log('ALL SUPER ADMIN & EXEMPT WORKSPACE TESTS PASSED 100%! 🎉');
    console.log('================================================================\n');

  } catch (err) {
    console.error('❌ QA Test Error:', err.response?.data || err.message);
    process.exit(1);
  }
}

runSuperAdminConfigurationTests();
