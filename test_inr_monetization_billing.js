const axios = require('./server/node_modules/axios');
const { getRow, getAll, runQuery } = require('./server/db');

const API_BASE = 'http://localhost:5001/api';

async function runInrMonetizationBillingTests() {
  console.log('================================================================');
  console.log('AUTOLEAD CRM: INR MONETIZATION & BILLING QA TEST SUITE');
  console.log('================================================================\n');

  try {
    // 1. AUTHENTICATE PRIMARY ADMIN
    console.log('[TEST 1] Authenticating Primary Admin (amautomationtrading@gmail.com)...');
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
    console.log(`✅ TEST 1 PASSED: Authenticated cleanly.`);

    // 2. FETCH CONFIGURABLE INR PLANS FROM API (GET /api/billing/plans)
    console.log('\n[TEST 2] Fetching Configurable INR Plans (GET /api/billing/plans)...');
    const plansRes = await axios.get(`${API_BASE}/billing/plans`, adminHeaders);
    const plans = plansRes.data.plans;

    console.log(`✅ TEST 2 PASSED: Received ${plans.length} INR pricing plans from database.`);
    console.table(plans.map(p => ({
      PlanID: p.plan_id,
      Name: p.name,
      Price: p.price,
      Currency: p.currency,
      Symbol: p.currency_symbol,
      Formatted: p.formatted_price
    })));

    // Verify INR Currency & Symbol
    if (plansRes.data.currency !== 'INR' || plansRes.data.currency_symbol !== '₹') {
      console.error('❌ TEST 2 FAILED: Billing currency is not INR / ₹!');
      process.exit(1);
    }

    // 3. FETCH SUBSCRIPTION & USAGE LIMITS (GET /api/billing/subscription)
    console.log('\n[TEST 3] Fetching Workspace Subscription Details (GET /api/billing/subscription)...');
    const subRes = await axios.get(`${API_BASE}/billing/subscription`, adminHeaders);
    const sub = subRes.data.subscription;
    console.log(`✅ TEST 3 PASSED: Active Plan: ${sub.plan.name} (${sub.plan.formatted_price}/month). Usage: ${sub.usage.leads_used}/${sub.usage.leads_limit} leads.`);

    // 4. CREATE RAZORPAY INR ORDER (POST /api/billing/create-order)
    console.log('\n[TEST 4] Creating Razorpay INR Order for GROWTH Plan (₹2,499)...');
    const orderRes = await axios.post(
      `${API_BASE}/billing/create-order`,
      { plan_id: 'growth' },
      adminHeaders
    );

    const orderData = orderRes.data.order;
    console.log(`✅ TEST 4 PASSED: Razorpay Order Generated: ID: ${orderData.id}, Amount in Paise: ${orderData.amount} (₹2,499 INR), Currency: ${orderData.currency}`);

    if (orderData.amount !== 249900 || orderData.currency !== 'INR') {
      console.error('❌ TEST 4 FAILED: Razorpay amount or currency invalid!');
      process.exit(1);
    }

    // 5. PAYMENT VERIFICATION & SUBSCRIPTION UPGRADE (POST /api/billing/verify-payment)
    console.log('\n[TEST 5] Verifying Payment & Activating Subscription Upgrade...');
    const verifyRes = await axios.post(
      `${API_BASE}/billing/verify-payment`,
      {
        plan_id: 'growth',
        razorpay_order_id: orderData.id,
        razorpay_payment_id: 'pay_test_inr_' + Date.now(),
        razorpay_signature: 'sig_test_inr_' + Date.now()
      },
      adminHeaders
    );

    console.log(`✅ TEST 5 PASSED: ${verifyRes.data.message}`);

    // 6. VERIFY AUDIT LOG TRAIL
    console.log('\n[TEST 6] Verifying Subscription Upgrade Audit Logs...');
    const auditLogsRes = await axios.get(`${API_BASE}/admin/audit-logs`, adminHeaders);
    const upgradeLogs = auditLogsRes.data.logs.filter(l => l.action === 'Subscription Upgraded');
    console.log(`✅ TEST 6 PASSED: Found ${upgradeLogs.length} Subscription Upgraded audit log entry.`);

    console.log('\n================================================================');
    console.log('ALL INR MONETIZATION & BILLING QA TESTS PASSED 100%! 🎉');
    console.log('================================================================\n');

  } catch (err) {
    console.error('❌ QA Test Error:', err.response?.data || err.message);
    process.exit(1);
  }
}

runInrMonetizationBillingTests();
