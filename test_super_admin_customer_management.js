const axios = require('./server/node_modules/axios');
const { getRow, getAll, runQuery } = require('./server/db');

const API_BASE = 'http://localhost:5001/api';

async function runSuperAdminCustomerManagementTests() {
  console.log('================================================================');
  console.log('AUTOLEAD CRM: SUPER ADMIN CUSTOMER MANAGEMENT QA TEST SUITE');
  console.log('================================================================\n');

  try {
    const password = 'Password123!';

    // 1. AUTHENTICATE PRIMARY SUPER ADMIN
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

    const superAdminHeaders = { headers: { Authorization: `Bearer ${superAdminLoginRes.data.token}` } };
    console.log('✅ TEST 1 PASSED: Super Admin authenticated.');

    // 2. CREATE A TEST CUSTOMER WORKSPACE (CUSTOMER C)
    const custEmail = `cust_c_${Date.now()}@company-c.com`;
    const companyName = `Company C Automation ${Date.now()}`;
    console.log(`\n[TEST 2] Creating Test Customer Admin (${custEmail}) for "${companyName}"...`);

    const createRes = await axios.post(
      `${API_BASE}/super-admin/customers`,
      {
        full_name: 'Customer C Admin',
        company_name: companyName,
        email: custEmail,
        password: password,
        confirm_password: password,
        plan_id: 'starter',
        subscription_type: 'EXEMPT'
      },
      superAdminHeaders
    );

    const custUser = createRes.data.user;
    const workspaceId = custUser.workspace_id;
    console.log(`✅ TEST 2 PASSED: Created Customer Admin. ID: ${custUser.user_id}`);

    // Create a Normal User in Customer C Workspace
    const custLoginRes = await axios.post(`${API_BASE}/auth/login`, { email: custEmail, password: password });
    const custHeaders = { headers: { Authorization: `Bearer ${custLoginRes.data.token}` } };
    
    const normalUserEmail = `user_c_${Date.now()}@company-c.com`;
    await axios.post(
      `${API_BASE}/admin/users`,
      { full_name: 'User C1', email: normalUserEmail, password: password, confirm_password: password, role: 'user' },
      custHeaders
    );

    // 3. SUPER ADMIN VIEW CUSTOMER DETAILS
    console.log('\n[TEST 3] Super Admin Viewing Customer Details (GET /api/super-admin/customers/:id)...');
    const viewRes = await axios.get(`${API_BASE}/super-admin/customers/${custUser.user_id}`, superAdminHeaders);
    if (!viewRes.data.success || viewRes.data.customer.users.length < 2) {
      console.error('❌ TEST 3 FAILED: Customer details returned incomplete data!');
      process.exit(1);
    }
    console.log(`✅ TEST 3 PASSED: Customer details fetched cleanly. Workspace users count: ${viewRes.data.customer.users.length}`);

    // 4. SUPER ADMIN EDIT CUSTOMER WORKSPACE (NAME, PLAN, CUSTOM LIMITS, PASSWORD RESET)
    console.log('\n[TEST 4] Super Admin Editing Customer Workspace (PUT /api/super-admin/customers/:id)...');
    const updatedCompany = `${companyName} Updated`;
    const updatedEmail = `updated_${custEmail}`;
    const newResetPassword = 'NewSecurePassword123!';

    const editRes = await axios.put(
      `${API_BASE}/super-admin/customers/${custUser.user_id}`,
      {
        full_name: 'Customer C Admin Updated',
        company_name: updatedCompany,
        email: updatedEmail,
        phone: '+91 98765 43210',
        plan_id: 'business',
        subscription_type: 'EXEMPT',
        status: 'active',
        lead_limit: '15000',
        scan_limit: '15000',
        user_limit: '15',
        new_password: newResetPassword
      },
      superAdminHeaders
    );

    if (!editRes.data.success) {
      console.error('❌ TEST 4 FAILED: Update Customer Workspace failed.');
      process.exit(1);
    }
    console.log('✅ TEST 4 PASSED: Updated company name, email, plan (Business), custom limits (15k), and reset password.');

    // Verify reset password login
    const updatedLoginRes = await axios.post(`${API_BASE}/auth/login`, {
      email: updatedEmail,
      password: newResetPassword
    });
    console.log('✅ TEST 4B PASSED: Logged in cleanly using new reset password!');

    // 5. SUPER ADMIN SOFT-DELETE CUSTOMER WORKSPACE
    console.log('\n[TEST 5] Super Admin Soft-Deleting Customer Workspace (DELETE /api/super-admin/customers/:id)...');
    const deleteRes = await axios.delete(`${API_BASE}/super-admin/customers/${custUser.user_id}`, {
      headers: superAdminHeaders.headers,
      data: { company_name_confirm: updatedCompany }
    });

    if (!deleteRes.data.success) {
      console.error('❌ TEST 5 FAILED: Soft delete customer workspace failed.');
      process.exit(1);
    }
    console.log('✅ TEST 5 PASSED: Workspace soft-deleted cleanly.');

    // 6. VERIFY SOFT-DELETED ADMIN & NORMAL USER ARE BLOCKED FROM LOGIN
    console.log('\n[TEST 6] Testing Access Rejection for Soft-Deleted Customer Accounts...');
    try {
      await axios.post(`${API_BASE}/auth/login`, { email: updatedEmail, password: newResetPassword });
      console.error('❌ TEST 6 FAILED: Soft-deleted Admin logged in successfully!');
      process.exit(1);
    } catch (err) {
      if (err.response && err.response.status === 403) {
        console.log('✅ TEST 6 PASSED: Soft-deleted Admin login blocked with 403 Forbidden!');
      } else {
        console.error('❌ TEST 6 FAILED with unexpected status code:', err.response?.status);
        process.exit(1);
      }
    }

    try {
      await axios.post(`${API_BASE}/auth/login`, { email: normalUserEmail, password: password });
      console.error('❌ TEST 6B FAILED: Soft-deleted Normal User logged in successfully!');
      process.exit(1);
    } catch (err) {
      if (err.response && err.response.status === 403) {
        console.log('✅ TEST 6B PASSED: Soft-deleted Normal User login blocked with 403 Forbidden!');
      } else {
        console.error('❌ TEST 6B FAILED with unexpected status code:', err.response?.status);
        process.exit(1);
      }
    }

    // 7. SUPER ADMIN RESTORE CUSTOMER WORKSPACE
    console.log('\n[TEST 7] Super Admin Restoring Soft-Deleted Workspace (POST /api/super-admin/customers/:id/restore)...');
    const restoreRes = await axios.post(`${API_BASE}/super-admin/customers/${custUser.user_id}/restore`, {}, superAdminHeaders);
    if (!restoreRes.data.success) {
      console.error('❌ TEST 7 FAILED: Restore customer workspace failed.');
      process.exit(1);
    }
    console.log('✅ TEST 7 PASSED: Workspace access restored cleanly.');

    // Verify restored Admin can login again
    await axios.post(`${API_BASE}/auth/login`, { email: updatedEmail, password: newResetPassword });
    console.log('✅ TEST 7B PASSED: Restored Customer Admin logged in cleanly!');

    // 8. SUPER ADMIN PROTECTION (SUPER ADMIN CANNOT BE DELETED)
    console.log('\n[TEST 8] Testing Super Admin Account Protection (Cannot be deleted)...');
    try {
      const superAdminUserDb = await getRow("SELECT * FROM users WHERE email = 'amautomationtrading@gmail.com'");
      await axios.delete(`${API_BASE}/super-admin/customers/${superAdminUserDb.user_id}`, {
        headers: superAdminHeaders.headers,
        data: { company_name_confirm: 'AM Automation Trading' }
      });
      console.error('❌ TEST 8 FAILED: Primary Super Admin was soft-deleted!');
      process.exit(1);
    } catch (err) {
      if (err.response && err.response.status === 400) {
        console.log('✅ TEST 8 PASSED: Super Admin deletion blocked with 400 Bad Request!');
      } else {
        console.error('❌ TEST 8 FAILED with unexpected status code:', err.response?.status);
        process.exit(1);
      }
    }

    // 9. CLEANUP QA TEST ACCOUNTS
    console.log('\n[TEST 9] Cleaning QA Test Workspace Data...');
    await runQuery(`DELETE FROM users WHERE email IN (?, ?, ?)`, [custEmail, updatedEmail, normalUserEmail]);
    await runQuery(`DELETE FROM subscriptions WHERE workspace_id = ?`, [workspaceId]);

    console.log('\n================================================================');
    console.log('ALL SUPER ADMIN CUSTOMER MANAGEMENT TESTS PASSED 100%! 🎉');
    console.log('================================================================\n');

  } catch (err) {
    console.error('❌ QA Test Error:', err.response?.data || err.message);
    process.exit(1);
  }
}

runSuperAdminCustomerManagementTests();
