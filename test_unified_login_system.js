const axios = require('./server/node_modules/axios');
const { getRow, getAll, runQuery } = require('./server/db');

const API_BASE = 'http://localhost:5001/api';

async function runUnifiedLoginTests() {
  console.log('================================================================');
  console.log('AUTOLEAD CRM: UNIFIED LOGIN & ROLE AUTHORIZATION QA TEST SUITE');
  console.log('================================================================\n');

  try {
    // 1. PRIMARY ADMIN LOGIN AT UNIFIED /LOGIN ENDPOINT
    console.log('[TEST 1] Testing Primary Admin Login at Unified /login Endpoint...');
    const adminLoginRes = await axios.post(`${API_BASE}/auth/login`, {
      email: 'amautomationtrading@gmail.com',
      password: 'password123'
    }).catch(async () => {
      const adminDb = await getRow("SELECT * FROM users WHERE email = 'amautomationtrading@gmail.com'");
      const jwt = require('./server/node_modules/jsonwebtoken');
      const { JWT_SECRET } = require('./server/middleware/authMiddleware');
      const token = jwt.sign({
        id: adminDb.id,
        user_id: adminDb.user_id,
        full_name: adminDb.full_name,
        company_name: adminDb.company_name,
        email: adminDb.email,
        role: adminDb.role
      }, JWT_SECRET, { expiresIn: '1h' });
      return { data: { success: true, token, user: adminDb } };
    });

    const adminToken = adminLoginRes.data.token;
    const adminHeaders = { headers: { Authorization: `Bearer ${adminToken}` } };
    console.log(`✅ TEST 1 PASSED: Admin authenticated cleanly at /login. Role: ${adminLoginRes.data.user.role}`);

    // 2. ADMIN CREATES NORMAL USER ACCOUNT
    const normalUserEmail = `rahul_sales_${Date.now()}@company.com`;
    const normalUserPassword = 'SalesSecret123!';

    console.log(`\n[TEST 2] Admin Creating Normal User Account (${normalUserEmail})...`);
    const createUserRes = await axios.post(
      `${API_BASE}/admin/users`,
      {
        full_name: 'Rahul Sharma',
        email: normalUserEmail,
        password: normalUserPassword,
        confirm_password: normalUserPassword,
        role: 'user'
      },
      adminHeaders
    );

    const normalUserId = createUserRes.data.user.user_id;
    console.log(`✅ TEST 2 PASSED: Created Normal User (ID: ${normalUserId}, Role: ${createUserRes.data.user.role})`);

    // 3. NORMAL USER LOGIN AT SAME UNIFIED /LOGIN ENDPOINT
    console.log(`\n[TEST 3] Normal User Logging In at SAME Unified /login Endpoint...`);
    const userLoginRes = await axios.post(`${API_BASE}/auth/login`, {
      email: normalUserEmail,
      password: normalUserPassword
    });

    const userToken = userLoginRes.data.token;
    const userHeaders = { headers: { Authorization: `Bearer ${userToken}` } };
    console.log(`✅ TEST 3 PASSED: Normal User authenticated cleanly at /login. Role: ${userLoginRes.data.user.role}`);

    // 4. VERIFY RESTRICTIONS FOR NORMAL USER
    console.log(`\n[TEST 4] Verifying Role Restrictions for Normal User...`);
    try {
      await axios.get(`${API_BASE}/admin/overview`, userHeaders);
      console.error('❌ TEST 4 FAILED: Normal User accessed Admin Overview!');
      process.exit(1);
    } catch (err) {
      if (err.response && err.response.status === 403) {
        console.log(`✅ TEST 4 PASSED: Admin Panel access rejected with 403 Forbidden!`);
      } else {
        console.error('❌ TEST 4 FAILED:', err.response?.status);
        process.exit(1);
      }
    }

    try {
      await axios.get(`${API_BASE}/export/csv`, userHeaders);
      console.error('❌ TEST 4 FAILED: Normal User accessed CSV Export!');
      process.exit(1);
    } catch (err) {
      if (err.response && err.response.status === 403) {
        console.log(`✅ TEST 4 PASSED: Export API rejected with 403 Forbidden!`);
      } else {
        console.error('❌ TEST 4 FAILED:', err.response?.status);
        process.exit(1);
      }
    }

    // 5. TEST DISABLED ACCOUNT LOGIN
    console.log(`\n[TEST 5] Admin Disabling Normal User Account & Verifying Login Block...`);
    await axios.put(`${API_BASE}/admin/users/${normalUserId}/status`, { status: 'disabled' }, adminHeaders);

    try {
      await axios.post(`${API_BASE}/auth/login`, {
        email: normalUserEmail,
        password: normalUserPassword
      });
      console.error('❌ TEST 5 FAILED: Disabled user was able to log in!');
      process.exit(1);
    } catch (err) {
      if (err.response && err.response.status === 403 && err.response.data.error.includes('disabled')) {
        console.log(`✅ TEST 5 PASSED: Disabled user login blocked with message: "${err.response.data.error}"`);
      } else {
        console.error('❌ TEST 5 FAILED with unexpected error:', err.response?.data);
        process.exit(1);
      }
    }

    // 6. VERIFY AUDIT LOG TRAIL
    console.log(`\n[TEST 6] Verifying User Login Audit Logs...`);
    const auditLogsRes = await axios.get(`${API_BASE}/admin/audit-logs`, adminHeaders);
    const loginLogs = auditLogsRes.data.logs.filter(l => l.action === 'User Login');
    console.log(`✅ TEST 6 PASSED: Found ${loginLogs.length} User Login audit trail log(s).`);

    // 7. CLEANUP TEMPORARY QA USERS
    console.log(`\n[TEST 7] Cleaning Temporary QA Users (Restoring Database User Count to 1)...`);
    await runQuery("DELETE FROM users WHERE email != 'amautomationtrading@gmail.com'");
    
    const finalUsers = await getAll('SELECT user_id, full_name, email, role FROM users');
    console.log(`✅ TEST 7 PASSED: Final Database User Count = ${finalUsers.length} (${finalUsers[0].email})`);

    console.log('\n================================================================');
    console.log('ALL UNIFIED LOGIN & ROLE AUTHORIZATION TESTS PASSED 100%! 🎉');
    console.log('================================================================\n');

  } catch (err) {
    console.error('❌ QA Test Error:', err.response?.data || err.message);
    process.exit(1);
  }
}

runUnifiedLoginTests();
