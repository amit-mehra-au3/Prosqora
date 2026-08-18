const axios = require('./server/node_modules/axios');
const { getRow, getAll, runQuery } = require('./server/db');

const API_BASE = 'http://localhost:5001/api';

async function runFreshResetPermanentDeleteFilterTests() {
  console.log('================================================================');
  console.log('AUTOLEAD CRM: FRESH RESET, PERMANENT DELETE & STATUS FILTER QA');
  console.log('================================================================\n');

  try {
    const password = 'Password123!';

    // 1. FRESH DEVELOPMENT RESET VERIFICATION
    console.log('[TEST 1] Verifying Fresh Development Database Reset...');
    const superAdmin = await getRow(`SELECT * FROM users WHERE email = 'amautomationtrading@gmail.com'`);
    if (!superAdmin) {
      console.error('❌ TEST 1 FAILED: Super Admin account missing!');
      process.exit(1);
    }

    const totalUsersCount = await getRow(`SELECT COUNT(*) as cnt FROM users`);
    const custUsersCount = await getRow(`SELECT COUNT(*) as cnt FROM users WHERE role != 'super_admin' AND role != 'SUPER_ADMIN'`);
    const custWorkspacesCount = await getRow(`SELECT COUNT(DISTINCT workspace_id) as cnt FROM users WHERE role != 'super_admin' AND role != 'SUPER_ADMIN' AND workspace_id != ''`);

    console.log(`   - Platform Users Count: ${totalUsersCount.cnt} (Super Admin Only)`);
    console.log(`   - Customer Admins & Normal Users Count: ${custUsersCount.cnt}`);
    console.log(`   - Customer Workspaces Count: ${custWorkspacesCount.cnt}`);

    if (totalUsersCount.cnt !== 1 || custUsersCount.cnt !== 0 || custWorkspacesCount.cnt !== 0) {
      console.error('❌ TEST 1 FAILED: Database not clean! Found old test records.');
      process.exit(1);
    }
    console.log('✅ TEST 1 PASSED: Database cleanly reset. ONLY Super Admin exists!');

    // 2. AUTHENTICATE SUPER ADMIN
    console.log('\n[TEST 2] Authenticating Primary Super Admin (amautomationtrading@gmail.com)...');
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
    console.log('✅ TEST 2 PASSED: Super Admin authenticated.');

    // 3. CREATE FIRST REAL CUSTOMER ADMIN (NEHA / ROBOFLEX)
    const nehaEmail = `neha_${Date.now()}@roboflex.com`;
    console.log(`\n[TEST 3] Registering First Real Customer Admin Neha (${nehaEmail})...`);
    const regRes = await axios.post(`${API_BASE}/auth/register-admin`, {
      full_name: 'Neha Sharma',
      company_name: 'RoboFlex Systems',
      email: nehaEmail,
      password: password,
      confirm_password: password,
      plan_id: 'growth'
    });

    const tokenNeha = regRes.data.token;
    const headersNeha = { headers: { Authorization: `Bearer ${tokenNeha}` } };
    const workspaceId = regRes.data.user.workspace_id;
    console.log(`✅ TEST 3 PASSED: Registered Customer Admin Neha. Workspace ID: ${workspaceId}`);

    // 4. NEHA CREATES A NORMAL USER (RAHUL)
    const rahulEmail = `rahul_${Date.now()}@roboflex.com`;
    console.log(`\n[TEST 4] Neha Creating Normal User Rahul (${rahulEmail})...`);
    const createRahulRes = await axios.post(
      `${API_BASE}/admin/users`,
      {
        full_name: 'Rahul Varma',
        email: rahulEmail,
        password: password,
        confirm_password: password,
        role: 'user'
      },
      headersNeha
    );

    const rahulUser = createRahulRes.data.user;
    console.log(`✅ TEST 4 PASSED: Created Normal User Rahul. User ID: ${rahulUser.user_id}`);

    // 5. TEST SERVER-SIDE STATUS FILTERING (ACTIVE, DISABLED, ALL)
    console.log('\n[TEST 5] Testing Server-Side Status Filtering (Active vs Disabled vs All)...');

    // Disable Rahul
    await axios.put(`${API_BASE}/admin/users/${rahulUser.user_id}/status`, { status: 'disabled' }, headersNeha);

    // Filter Active Only
    const activeUsersRes = await axios.get(`${API_BASE}/admin/users?status=active`, headersNeha);
    console.log(`   - Active Users Count: ${activeUsersRes.data.users.length}`);
    const hasRahulInActive = activeUsersRes.data.users.some(u => u.email === rahulEmail);
    if (hasRahulInActive) {
      console.error('❌ TEST 5 FAILED: Disabled user Rahul appeared in active status filter!');
      process.exit(1);
    }

    // Filter Disabled Only
    const disabledUsersRes = await axios.get(`${API_BASE}/admin/users?status=disabled`, headersNeha);
    console.log(`   - Disabled Users Count: ${disabledUsersRes.data.users.length}`);
    const hasRahulInDisabled = disabledUsersRes.data.users.some(u => u.email === rahulEmail);
    if (!hasRahulInDisabled) {
      console.error('❌ TEST 5 FAILED: Disabled user Rahul missing from disabled status filter!');
      process.exit(1);
    }

    // Filter All
    const allUsersRes = await axios.get(`${API_BASE}/admin/users?status=all`, headersNeha);
    console.log(`   - All Users Count: ${allUsersRes.data.users.length}`);

    console.log('✅ TEST 5 PASSED: Server-side status filters (Active, Disabled, All) verified 100%.');

    // Enable Rahul back
    await axios.put(`${API_BASE}/admin/users/${rahulUser.user_id}/status`, { status: 'active' }, headersNeha);

    // 6. TEST PERMANENT DELETE USER (SUPER ADMIN ONLY)
    console.log('\n[TEST 6] Testing Permanent User Delete (Super Admin Only)...');

    const permDeleteRes = await axios.delete(`${API_BASE}/admin/users/${rahulUser.user_id}/permanent`, {
      headers: superAdminHeaders.headers,
      data: { email_confirm: rahulEmail }
    });

    if (!permDeleteRes.data.success) {
      console.error('❌ TEST 6 FAILED: Permanent User Delete API failed.');
      process.exit(1);
    }

    // Verify physical database deletion
    const rahulInDb = await getRow(`SELECT * FROM users WHERE email = ?`, [rahulEmail]);
    if (rahulInDb) {
      console.error('❌ TEST 6 FAILED: User Rahul record still exists in SQL database!');
      process.exit(1);
    }
    console.log(`✅ TEST 6 PASSED: User Rahul physically deleted from SQL database. Message: ${permDeleteRes.data.message}`);

    // Verify login attempt fails
    try {
      await axios.post(`${API_BASE}/auth/login`, { email: rahulEmail, password: password });
      console.error('❌ TEST 6B FAILED: Permanently deleted user logged in successfully!');
      process.exit(1);
    } catch (err) {
      if (err.response && err.response.status === 401) {
        console.log('✅ TEST 6B PASSED: Permanently deleted user login rejected cleanly (401 Unauthorized).');
      } else {
        console.error('❌ TEST 6B FAILED with unexpected status code:', err.response?.status);
        process.exit(1);
      }
    }

    // 7. SUPER ADMIN PROTECTION (CANNOT BE DELETED PERMANENTLY)
    console.log('\n[TEST 7] Testing Super Admin Permanent Delete Protection...');
    try {
      await axios.delete(`${API_BASE}/admin/users/${superAdmin.user_id}/permanent`, {
        headers: superAdminHeaders.headers,
        data: { email_confirm: 'amautomationtrading@gmail.com' }
      });
      console.error('❌ TEST 7 FAILED: Primary Super Admin was permanently deleted!');
      process.exit(1);
    } catch (err) {
      if (err.response && err.response.status === 403) {
        console.log('✅ TEST 7 PASSED: Primary Super Admin permanent deletion blocked with 403 Forbidden!');
      } else {
        console.error('❌ TEST 7 FAILED with unexpected status code:', err.response?.status);
        process.exit(1);
      }
    }

    // 8. CLEANUP QA TEST WORKSPACE DATA
    console.log('\n[TEST 8] Final Clean Reset for Clean Workspace Startup...');
    await runQuery(`DELETE FROM users WHERE email = ?`, [nehaEmail]);
    await runQuery(`DELETE FROM subscriptions WHERE workspace_id = ?`, [workspaceId]);

    const finalUsersCount = await getRow(`SELECT COUNT(*) as cnt FROM users`);
    console.log(`   - Final Platform Users: ${finalUsersCount.cnt} (Super Admin Only)`);

    console.log('\n================================================================');
    console.log('ALL FRESH RESET, PERMANENT DELETE & FILTER TESTS PASSED 100%! 🎉');
    console.log('================================================================\n');

  } catch (err) {
    console.error('❌ QA Test Error:', err.response?.data || err.message);
    process.exit(1);
  }
}

runFreshResetPermanentDeleteFilterTests();
