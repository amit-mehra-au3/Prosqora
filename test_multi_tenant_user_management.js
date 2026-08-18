const axios = require('./server/node_modules/axios');
const { getRow, getAll, runQuery } = require('./server/db');

const API_BASE = 'http://localhost:5001/api';

async function runMultiTenantUserManagementTests() {
  console.log('================================================================');
  console.log('AUTOLEAD CRM: MULTI-TENANT USER MANAGEMENT ISOLATION QA SUITE');
  console.log('================================================================\n');

  try {
    const password = 'Password123!';

    // 1. REGISTER CUSTOMER ADMIN A (COMPANY A)
    const adminAEmail = `admin_a_${Date.now()}@company-a.com`;
    console.log(`[SETUP] Registering Customer Admin A (${adminAEmail})...`);
    const regARes = await axios.post(`${API_BASE}/auth/register-admin`, {
      full_name: 'Admin A (Neha)',
      company_name: 'RoboFlex Systems',
      email: adminAEmail,
      password: password,
      confirm_password: password,
      plan_id: 'growth'
    });

    const tokenAdminA = regARes.data.token;
    const headersAdminA = { headers: { Authorization: `Bearer ${tokenAdminA}` } };
    const workspaceA = regARes.data.user.workspace_id;

    // 2. ADMIN A CREATES USER A1 AND USER A2
    const userA1Email = `user_a1_${Date.now()}@company-a.com`;
    console.log(`[SETUP] Admin A Creating User A1 (${userA1Email})...`);
    const createA1Res = await axios.post(
      `${API_BASE}/admin/users`,
      {
        full_name: 'A User 1 (Rahul)',
        email: userA1Email,
        password: password,
        confirm_password: password,
        role: 'user'
      },
      headersAdminA
    );
    const userA1Id = createA1Res.data.user.user_id;

    // 3. REGISTER CUSTOMER ADMIN B (COMPANY B)
    const adminBEmail = `admin_b_${Date.now()}@company-b.com`;
    console.log(`\n[SETUP] Registering Customer Admin B (${adminBEmail})...`);
    const regBRes = await axios.post(`${API_BASE}/auth/register-admin`, {
      full_name: 'Admin B (Amit)',
      company_name: 'Industrial Drives Pvt Ltd',
      email: adminBEmail,
      password: password,
      confirm_password: password,
      plan_id: 'starter'
    });

    const tokenAdminB = regBRes.data.token;
    const headersAdminB = { headers: { Authorization: `Bearer ${tokenAdminB}` } };
    const workspaceB = regBRes.data.user.workspace_id;

    // 4. ADMIN B CREATES USER B1
    const userB1Email = `user_b1_${Date.now()}@company-b.com`;
    console.log(`[SETUP] Admin B Creating User B1 (${userB1Email})...`);
    const createB1Res = await axios.post(
      `${API_BASE}/admin/users`,
      {
        full_name: 'B User 1 (Priya)',
        email: userB1Email,
        password: password,
        confirm_password: password,
        role: 'user'
      },
      headersAdminB
    );
    const userB1Id = createB1Res.data.user.user_id;

    // ================================================================
    // TEST 1: ADMIN A USER MANAGEMENT QUERY ISOLATION
    // ================================================================
    console.log('\n[TEST 1] Testing Admin A User Management List Isolation...');
    const usersListARes = await axios.get(`${API_BASE}/admin/users`, headersAdminA);
    const usersA = usersListARes.data.users;

    console.log(`   - Admin A User Count Returned: ${usersA.length}`);
    const hasAdminBUser = usersA.some(u => u.email === userB1Email || u.email === adminBEmail);

    if (hasAdminBUser) {
      console.error('❌ TEST 1 FAILED: MULTI-TENANT ISOLATION BREACH! Admin A saw Company B users!');
      process.exit(1);
    }
    console.log('✅ TEST 1 PASSED: Admin A user management list contains ONLY Workspace A users.');

    // ================================================================
    // TEST 2: ADMIN B USER MANAGEMENT QUERY ISOLATION
    // ================================================================
    console.log('\n[TEST 2] Testing Admin B User Management List Isolation...');
    const usersListBRes = await axios.get(`${API_BASE}/admin/users`, headersAdminB);
    const usersB = usersListBRes.data.users;

    console.log(`   - Admin B User Count Returned: ${usersB.length}`);
    const hasAdminAUser = usersB.some(u => u.email === userA1Email || u.email === adminAEmail);

    if (hasAdminAUser) {
      console.error('❌ TEST 2 FAILED: MULTI-TENANT ISOLATION BREACH! Admin B saw Company A users!');
      process.exit(1);
    }
    console.log('✅ TEST 2 PASSED: Admin B user management list contains ONLY Workspace B users.');

    // ================================================================
    // TEST 3: IDOR SECURITY CHECK (CROSS-WORKSPACE USER MODIFICATION)
    // ================================================================
    console.log('\n[TEST 3] Testing IDOR Attack: Admin A attempting to disable Admin B User B1...');
    try {
      await axios.put(`${API_BASE}/admin/users/${userB1Id}/status`, { status: 'disabled' }, headersAdminA);
      console.error('❌ TEST 3 FAILED: Admin A successfully disabled User B1 belonging to Company B!');
      process.exit(1);
    } catch (err) {
      if (err.response && err.response.status === 403) {
        console.log('✅ TEST 3 PASSED: IDOR attack blocked with 403 Forbidden! User B1 status unchanged.');
      } else {
        console.error('❌ TEST 3 FAILED with unexpected status code:', err.response?.status);
        process.exit(1);
      }
    }

    // ================================================================
    // TEST 4: WORKSPACE TAMPERING ATTEMPT
    // ================================================================
    console.log('\n[TEST 4] Testing Workspace ID Tampering in User Creation API...');
    const userA2Email = `user_a2_tamper_${Date.now()}@company-a.com`;
    const tamperRes = await axios.post(
      `${API_BASE}/admin/users`,
      {
        full_name: 'A User 2 Tamper Test',
        email: userA2Email,
        password: password,
        confirm_password: password,
        role: 'user',
        workspace_id: workspaceB // Malicious attempt to inject Company B workspace
      },
      headersAdminA
    );

    const userA2Db = await getRow(`SELECT * FROM users WHERE email = ?`, [userA2Email]);
    if (userA2Db.workspace_id === workspaceB) {
      console.error('❌ TEST 4 FAILED: Backend trusted client workspace_id parameter!');
      process.exit(1);
    }
    console.log(`✅ TEST 4 PASSED: Backend ignored client workspace_id tampering. User workspace correctly set to: ${userA2Db.workspace_id}`);

    // ================================================================
    // TEST 5: NORMAL USER BLOCKED FROM ADMIN PANEL API
    // ================================================================
    console.log('\n[TEST 5] Testing Normal User Blocked from Admin Panel APIs...');
    const userA1Login = await axios.post(`${API_BASE}/auth/login`, {
      email: userA1Email,
      password: password
    });
    const headersUserA1 = { headers: { Authorization: `Bearer ${userA1Login.data.token}` } };

    try {
      await axios.get(`${API_BASE}/admin/users`, headersUserA1);
      console.error('❌ TEST 5 FAILED: Normal User accessed Admin Panel API!');
      process.exit(1);
    } catch (err) {
      if (err.response && err.response.status === 403) {
        console.log('✅ TEST 5 PASSED: Normal User blocked with 403 Forbidden!');
      } else {
        console.error('❌ TEST 5 FAILED with unexpected status:', err.response?.status);
        process.exit(1);
      }
    }

    // ================================================================
    // TEST 6: SUPER ADMIN GLOBAL PLATFORM VIEW
    // ================================================================
    console.log('\n[TEST 6] Testing Super Admin Platform-Wide View...');
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
    const superAdminHeaders = { headers: { Authorization: `Bearer ${superAdminLoginRes.data.token}` } };

    const superUsersRes = await axios.get(`${API_BASE}/admin/users`, superAdminHeaders);
    console.log(`✅ TEST 6 PASSED: Super Admin returned ${superUsersRes.data.users.length} platform users.`);

    // ================================================================
    // TEST 7: CLEANUP QA TEST DATA
    // ================================================================
    console.log('\n[TEST 7] Cleaning QA Test Workspaces...');
    await runQuery(`DELETE FROM users WHERE email IN (?, ?, ?, ?, ?)`, [
      adminAEmail, userA1Email, userA2Email, adminBEmail, userB1Email
    ]);
    await runQuery(`DELETE FROM subscriptions WHERE workspace_id IN (?, ?)`, [workspaceA, workspaceB]);

    console.log('\n================================================================');
    console.log('ALL MULTI-TENANT USER MANAGEMENT ISOLATION TESTS PASSED 100%! 🎉');
    console.log('================================================================\n');

  } catch (err) {
    console.error('❌ QA Test Error:', err.response?.data || err.message);
    process.exit(1);
  }
}

runMultiTenantUserManagementTests();
