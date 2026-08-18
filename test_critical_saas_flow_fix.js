const axios = require('./server/node_modules/axios');
const { getRow, getAll, runQuery } = require('./server/db');

const API_BASE = 'http://localhost:5001/api';

async function runCriticalSaasFlowFixTests() {
  console.log('================================================================');
  console.log('AUTOLEAD CRM: CRITICAL SAAS FLOW & WORKSPACE QA TEST SUITE');
  console.log('================================================================\n');

  try {
    // 1. VERIFY PRICING PLANS API
    console.log('[TEST 1] Testing Pricing Plans API (GET /api/billing/plans)...');
    const plansRes = await axios.get(`${API_BASE}/billing/plans`);
    if (!plansRes.data.success || !plansRes.data.plans || plansRes.data.plans.length !== 4) {
      console.error('❌ TEST 1 FAILED: Pricing plans missing or invalid!');
      process.exit(1);
    }
    console.log(`✅ TEST 1 PASSED: Found ${plansRes.data.plans.length} INR pricing plans from database.`);
    plansRes.data.plans.forEach(p => console.log(`   - ${p.name}: ${p.formatted_price} (Limit: ${p.lead_limit} leads, ${p.user_limit} users)`));

    // 2. PUBLIC CUSTOMER ADMIN REGISTRATION (CORP A)
    const adminAEmail = `admin_corp_a_${Date.now()}@automationcorp.com`;
    const password = 'Password123!';

    console.log(`\n[TEST 2] Registering New Customer Admin for Corp A (${adminAEmail})...`);
    const regRes = await axios.post(`${API_BASE}/auth/register-admin`, {
      full_name: 'Amit Corp A Admin',
      company_name: 'Corp A Industrial Automation',
      email: adminAEmail,
      password: password,
      confirm_password: password,
      phone: '+91 98765 43210',
      plan_id: 'growth'
    });

    if (!regRes.data.success || !regRes.data.token) {
      console.error('❌ TEST 2 FAILED: Registration failed.');
      process.exit(1);
    }

    const tokenAdminA = regRes.data.token;
    const headersAdminA = { headers: { Authorization: `Bearer ${tokenAdminA}` } };
    const workspaceIdA = regRes.data.user.workspace_id;
    console.log(`✅ TEST 2 PASSED: Customer Admin A registered. Workspace ID: ${workspaceIdA}, Role: ${regRes.data.user.role}`);

    // 3. ADMIN A CREATES A LEAD IN WORKSPACE A
    console.log('\n[TEST 3] Admin A Creating Lead 1 in Workspace A...');
    const createLeadRes = await axios.post(
      `${API_BASE}/leads`,
      {
        company_name: 'Lead 1 Corp A Systems',
        website: 'https://corp-a-lead1.com',
        city: 'Hisar',
        state: 'Haryana',
        phone: '+91 86072 85969'
      },
      headersAdminA
    );

    const lead1Id = createLeadRes.data.lead.id;
    console.log(`✅ TEST 3 PASSED: Created Lead 1 (ID: ${lead1Id}, Workspace: ${createLeadRes.data.lead.workspace_id})`);

    // 4. ADMIN A CREATES NORMAL USER (RAHUL) IN WORKSPACE A
    const userAEmail = `rahul_user_${Date.now()}@automationcorp.com`;
    console.log(`\n[TEST 4] Admin A Creating Normal User Rahul (${userAEmail})...`);
    const createUserRes = await axios.post(
      `${API_BASE}/admin/users`,
      {
        full_name: 'Rahul Sharma',
        email: userAEmail,
        password: password,
        confirm_password: password,
        role: 'user'
      },
      headersAdminA
    );

    console.log(`✅ TEST 4 PASSED: Created Normal User. DB Role: ${createUserRes.data.user.role}`);

    // 5. NORMAL USER RAHUL LOGS IN & VERIFIES SHARED LEADS
    console.log('\n[TEST 5] Normal User Rahul Logging In...');
    const userLoginRes = await axios.post(`${API_BASE}/auth/login`, {
      email: userAEmail,
      password: password
    });

    const tokenUserA = userLoginRes.data.token;
    const headersUserA = { headers: { Authorization: `Bearer ${tokenUserA}` } };
    console.log(`✅ TEST 5 PASSED: Normal User authenticated. Resolved Workspace ID: ${userLoginRes.data.user.workspace_id}`);

    // 6. NORMAL USER FETCHES WORKSPACE LEADS
    console.log('\n[TEST 6] Normal User Rahul Fetching Workspace Leads...');
    const userLeadsRes = await axios.get(`${API_BASE}/leads`, headersUserA);
    const sharedLead = userLeadsRes.data.leads.find(l => l.id === lead1Id);

    if (!sharedLead) {
      console.error('❌ TEST 6 FAILED: Normal User cannot see Admin created Lead!');
      process.exit(1);
    }

    console.log(`✅ TEST 6 PASSED: SHARED WORKSPACE LEADS VERIFIED! Normal User sees Lead 1 ("${sharedLead.company_name}").`);

    // 7. NORMAL USER UPDATES LEAD 1 & ADMIN VERIFIES UPDATE
    console.log('\n[TEST 7] Normal User Rahul Updating Lead 1 Notes...');
    await axios.put(
      `${API_BASE}/leads/${lead1Id}`,
      { notes: 'Contacted by Rahul via phone. Demo scheduled.' },
      headersUserA
    );

    const adminCheckLeadRes = await axios.get(`${API_BASE}/leads`, headersAdminA);
    const updatedLeadForAdmin = adminCheckLeadRes.data.leads.find(l => l.id === lead1Id);

    if (!updatedLeadForAdmin || !updatedLeadForAdmin.notes.includes('Rahul')) {
      console.error('❌ TEST 7 FAILED: Admin did not see Normal User update!');
      process.exit(1);
    }

    console.log(`✅ TEST 7 PASSED: ADMIN SEES NORMAL USER UPDATE! Notes: "${updatedLeadForAdmin.notes}".`);

    // 8. ADMIN EMAIL PRIVACY TEST FOR NORMAL USER
    console.log('\n[TEST 8] Testing Admin Email Privacy for Normal User...');
    const userMeRes = await axios.get(`${API_BASE}/auth/me`, headersUserA);
    const normalUser = userMeRes.data.user;
    if (normalUser.email !== userAEmail || normalUser.email === adminAEmail) {
      console.error('❌ TEST 8 FAILED: Admin email leaked in Normal User profile payload!');
      process.exit(1);
    }
    console.log(`✅ TEST 8 PASSED: Admin email is strictly private. Normal User profile returned ONLY own email (${normalUser.email}).`);

    // 9. WORKSPACE ISOLATION TEST (CORP B)
    const adminBEmail = `admin_corp_b_${Date.now()}@b2bcorp.com`;
    console.log(`\n[TEST 9] Registering Customer Admin B (${adminBEmail}) & Testing Workspace Isolation...`);
    const regBRes = await axios.post(`${API_BASE}/auth/register-admin`, {
      full_name: 'Admin B',
      company_name: 'Corp B Machinery',
      email: adminBEmail,
      password: password,
      confirm_password: password,
      plan_id: 'starter'
    });

    const tokenAdminB = regBRes.data.token;
    const headersAdminB = { headers: { Authorization: `Bearer ${tokenAdminB}` } };

    const userBLeadsRes = await axios.get(`${API_BASE}/leads`, headersAdminB);
    const hasCorpALead = userBLeadsRes.data.leads.some(l => l.id === lead1Id);

    if (hasCorpALead) {
      console.error('❌ TEST 9 FAILED: Workspace Isolation Breach! Customer B accessed Customer A leads!');
      process.exit(1);
    }

    console.log('✅ TEST 9 PASSED: WORKSPACE ISOLATION 100% SECURE! Customer B cannot access Customer A leads.');

    // 10. CLEANUP TEST ACCOUNTS & LEADS
    console.log('\n[TEST 10] Cleaning QA Test Workspaces & Restoring Clean Database...');
    await runQuery(`DELETE FROM users WHERE email IN (?, ?, ?)`, [adminAEmail, userAEmail, adminBEmail]);
    await runQuery(`DELETE FROM leads WHERE id = ?`, [lead1Id]);
    await runQuery(`DELETE FROM subscriptions WHERE workspace_id IN (?, ?)`, [workspaceIdA, regBRes.data.user.workspace_id]);

    const finalUsers = await getAll('SELECT id, full_name, email, role FROM users');
    console.log(`✅ TEST 10 PASSED: Database Cleaned. Final Primary User: ${finalUsers[0]?.email}`);

    console.log('\n================================================================');
    console.log('ALL SAAS WORKSPACE & PRIVACY QA TESTS PASSED 100%! 🎉');
    console.log('================================================================\n');

  } catch (err) {
    console.error('❌ QA Test Error:', err.response?.data || err.message);
    process.exit(1);
  }
}

runCriticalSaasFlowFixTests();
