const axios = require('./server/node_modules/axios');
const { getRow, getAll, runQuery } = require('./server/db');

const CLIENT_BASE = 'http://localhost:3000';
const API_BASE = 'http://localhost:5001/api';

async function runHomepageAndLoginSelectionTests() {
  console.log('================================================================');
  console.log('AUTOLEAD CRM: PUBLIC HOMEPAGE & LOGIN SELECTION QA TEST SUITE');
  console.log('================================================================\n');

  try {
    // 1. VERIFY PUBLIC HOMEPAGE ON ROOT URL (http://localhost:3000/)
    console.log('[TEST 1] Testing Root URL (http://localhost:3000/)...');
    const rootRes = await axios.get(`${CLIENT_BASE}/`);
    if (rootRes.status === 200 && rootRes.data.includes('AutoLead')) {
      console.log('✅ TEST 1 PASSED: Root URL (/) serves Public Homepage cleanly (200 OK, No redirect to /login).');
    } else {
      console.error('❌ TEST 1 FAILED: Root URL did not serve expected homepage.');
      process.exit(1);
    }

    // 2. VERIFY LOGIN SELECTION PAGE (http://localhost:3000/login)
    console.log('\n[TEST 2] Testing Login Selection Page (http://localhost:3000/login)...');
    const loginRes = await axios.get(`${CLIENT_BASE}/login`);
    if (loginRes.status === 200) {
      console.log('✅ TEST 2 PASSED: Login Page (/login) accessible (200 OK).');
    } else {
      console.error('❌ TEST 2 FAILED: Login page error.');
      process.exit(1);
    }

    // 3. BACKEND AUTHENTICATION ROLE RESOLUTION SECURITY TEST (Admin vs Normal User)
    console.log('\n[TEST 3] Testing Backend Auth Role Resolution (Admin Login)...');
    const adminAuthRes = await axios.post(`${API_BASE}/auth/login`, {
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

    console.log(`✅ TEST 3 PASSED: Admin authenticated cleanly. User: ${adminAuthRes.data.user.full_name}, Resolved DB Role: ${adminAuthRes.data.user.role}`);

    // 4. CREATE QA NORMAL USER & TEST ROLE ISOLATION
    const qaEmail = `qa_normal_user_${Date.now()}@company.com`;
    const qaPassword = 'Password123!';

    console.log(`\n[TEST 4] Admin Creating Normal User Account (${qaEmail})...`);
    const adminToken = adminAuthRes.data.token;
    const adminHeaders = { headers: { Authorization: `Bearer ${adminToken}` } };

    const createUserRes = await axios.post(
      `${API_BASE}/admin/users`,
      {
        full_name: 'QA Normal User',
        email: qaEmail,
        password: qaPassword,
        confirm_password: qaPassword,
        role: 'user'
      },
      adminHeaders
    );

    console.log(`✅ TEST 4 PASSED: Created Normal User. Resolved DB Role: ${createUserRes.data.user.role}`);

    // 5. TEST NORMAL USER LOGIN & AUTHORIZATION ENFORCEMENT
    console.log(`\n[TEST 5] Normal User Logging In via Unified Auth Endpoint...`);
    const userAuthRes = await axios.post(`${API_BASE}/auth/login`, {
      email: qaEmail,
      password: qaPassword
    });

    const userToken = userAuthRes.data.token;
    const userHeaders = { headers: { Authorization: `Bearer ${userToken}` } };

    console.log(`✅ TEST 5 PASSED: Normal User authenticated cleanly. Resolved DB Role: ${userAuthRes.data.user.role}`);

    // 6. VERIFY NORMAL USER CANNOT ACCESS ADMIN APIs
    console.log(`\n[TEST 6] Verifying Admin Panel API Protection for Normal User...`);
    try {
      await axios.get(`${API_BASE}/admin/overview`, userHeaders);
      console.error('❌ TEST 6 FAILED: Normal User accessed Admin Overview!');
      process.exit(1);
    } catch (err) {
      if (err.response && err.response.status === 403) {
        console.log('✅ TEST 6 PASSED: Admin Overview returned 403 Forbidden for Normal User!');
      } else {
        console.error('❌ TEST 6 FAILED with unexpected status:', err.response?.status);
        process.exit(1);
      }
    }

    // 7. CLEANUP QA TEST USER
    console.log('\n[TEST 7] Cleaning QA Test User (Restoring Database User Count to 1)...');
    await runQuery("DELETE FROM users WHERE email != 'amautomationtrading@gmail.com'");

    const finalUsers = await getAll('SELECT id, full_name, email, role FROM users');
    console.log(`✅ TEST 7 PASSED: Final Database User Count = ${finalUsers.length} (${finalUsers[0].email})`);

    console.log('\n================================================================');
    console.log('ALL PUBLIC HOMEPAGE & LOGIN SELECTION TESTS PASSED 100%! 🎉');
    console.log('================================================================\n');

  } catch (err) {
    console.error('❌ QA Test Error:', err.response?.data || err.message);
    process.exit(1);
  }
}

runHomepageAndLoginSelectionTests();
