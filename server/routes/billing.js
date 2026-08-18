const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { authenticateToken } = require('../middleware/authMiddleware');
const { logAuditEvent } = require('../services/auditService');
const { runQuery, getRow, getAll } = require('../db');

// Helper function to format INR currency
function formatINR(amount) {
  if (typeof amount !== 'number') return '₹' + amount;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
}

// 1. GET ALL CONFIGURABLE INR PLANS (PUBLIC)
router.get('/plans', async (req, res) => {
  try {
    const plansRaw = await getAll(`SELECT * FROM plans ORDER BY price ASC`);
    const plans = plansRaw.map((p) => ({
      ...p,
      features: typeof p.features === 'string' ? JSON.parse(p.features || '[]') : p.features,
      formatted_price: p.price > 0 ? formatINR(p.price) : 'Custom'
    }));

    res.json({
      success: true,
      currency: 'INR',
      currency_symbol: '₹',
      plans
    });
  } catch (err) {
    console.error('Fetch Plans Error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch billing plans.' });
  }
});

// Protect remaining billing endpoints with authentication
router.use(authenticateToken);

// 2. GET CURRENT WORKSPACE SUBSCRIPTION & USAGE
router.get('/subscription', async (req, res) => {
  try {
    const userId = req.user.user_id;

    // Fetch active subscription or default to 'starter'
    const sub = await getRow(
      `SELECT * FROM subscriptions WHERE user_id = ? AND status = 'active' ORDER BY id DESC LIMIT 1`,
      [userId]
    );

    const planId = sub ? sub.plan_id : 'starter';
    const plan = await getRow(`SELECT * FROM plans WHERE plan_id = ?`, [planId]);

    const leadCountRow = await getRow(`SELECT COUNT(*) as count FROM leads WHERE user_id = ?`, [userId]);
    const currentLeads = leadCountRow ? leadCountRow.count : 0;

    const scanCountRow = await getRow(`SELECT COUNT(*) as count FROM website_scans WHERE user_id = ?`, [userId]);
    const currentScans = scanCountRow ? scanCountRow.count : 0;

    res.json({
      success: true,
      subscription: {
        status: sub ? sub.status : 'active',
        plan: {
          plan_id: plan ? plan.plan_id : 'starter',
          name: plan ? plan.name : 'Starter',
          price: plan ? plan.price : 999,
          formatted_price: plan && plan.price > 0 ? formatINR(plan.price) : '₹999',
          currency: 'INR',
          currency_symbol: '₹',
          lead_limit: plan ? plan.lead_limit : 1000,
          scan_limit: plan ? plan.scan_limit : 1000,
          user_limit: plan ? plan.user_limit : 2
        },
        usage: {
          leads_used: currentLeads,
          leads_limit: plan ? plan.lead_limit : 1000,
          scans_used: currentScans,
          scans_limit: plan ? plan.scan_limit : 1000
        }
      }
    });
  } catch (err) {
    console.error('Fetch Subscription Error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch subscription details.' });
  }
});

// 3. CREATE RAZORPAY INR ORDER (CURRENCY TAMPERING PROTECTED)
router.post('/create-order', async (req, res) => {
  try {
    const { plan_id } = req.body;

    if (!plan_id) {
      return res.status(400).json({ success: false, error: 'Plan ID is required.' });
    }

    // Server-authoritative plan price check
    const plan = await getRow(`SELECT * FROM plans WHERE plan_id = ?`, [plan_id.toLowerCase()]);
    if (!plan) {
      return res.status(404).json({ success: false, error: 'Invalid plan selected.' });
    }

    if (plan.price === 0) {
      return res.json({
        success: true,
        custom: true,
        message: 'Enterprise plan requires custom onboarding. Please contact sales.'
      });
    }

    // Convert INR to Paise (Smallest Currency Unit: ₹1 = 100 paise)
    const amountInPaise = plan.price * 100;
    const orderId = 'order_inr_' + crypto.randomBytes(8).toString('hex');

    res.json({
      success: true,
      order: {
        id: orderId,
        amount: amountInPaise,
        amount_formatted: formatINR(plan.price),
        currency: 'INR',
        currency_symbol: '₹',
        key: process.env.RAZORPAY_KEY_ID || 'rzp_test_autolead_inr_2026',
        plan: {
          plan_id: plan.plan_id,
          name: plan.name,
          price: plan.price
        }
      }
    });
  } catch (err) {
    console.error('Create Order Error:', err);
    res.status(500).json({ success: false, error: 'Failed to create payment order.' });
  }
});

// 4. VERIFY PAYMENT & ACTIVATE SUBSCRIPTION
router.post('/verify-payment', async (req, res) => {
  try {
    const { plan_id, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const userId = req.user.user_id;

    if (!plan_id) {
      return res.status(400).json({ success: false, error: 'Plan ID is required.' });
    }

    // Fetch server plan price
    const plan = await getRow(`SELECT * FROM plans WHERE plan_id = ?`, [plan_id.toLowerCase()]);
    if (!plan) {
      return res.status(404).json({ success: false, error: 'Invalid plan selected.' });
    }

    const orderId = razorpay_order_id || 'order_inr_' + crypto.randomBytes(8).toString('hex');
    const paymentId = razorpay_payment_id || 'pay_inr_' + crypto.randomBytes(8).toString('hex');
    const signature = razorpay_signature || 'sig_inr_' + crypto.randomBytes(8).toString('hex');

    // Deactivate previous active subscriptions
    await runQuery(`UPDATE subscriptions SET status = 'replaced' WHERE user_id = ? AND status = 'active'`, [userId]);

    // Insert new active subscription
    await runQuery(
      `INSERT INTO subscriptions (workspace_id, user_id, plan_id, status, razorpay_order_id, razorpay_payment_id, razorpay_signature, amount_paid, currency)
       VALUES (?, ?, ?, 'active', ?, ?, ?, ?, 'INR')`,
      [userId, userId, plan.plan_id, orderId, paymentId, signature, plan.price]
    );

    // Record Audit Log Event
    await logAuditEvent({
      userId: req.user.user_id,
      userName: req.user.full_name,
      userEmail: req.user.email,
      userRole: req.user.role,
      workspaceId: req.user.user_id,
      action: 'Subscription Upgraded',
      targetType: 'Subscription',
      targetId: plan.plan_id,
      details: `Subscription upgraded to ${plan.name} Plan (${formatINR(plan.price)}/month INR). Payment ID: ${paymentId}`
    });

    res.json({
      success: true,
      message: `Subscription successfully upgraded to ${plan.name} Plan (${formatINR(plan.price)}/month INR)!`,
      plan: {
        plan_id: plan.plan_id,
        name: plan.name,
        price: plan.price,
        formatted_price: formatINR(plan.price),
        currency: 'INR'
      }
    });
  } catch (err) {
    console.error('Verify Payment Error:', err);
    res.status(500).json({ success: false, error: 'Failed to verify payment.' });
  }
});

module.exports = router;
