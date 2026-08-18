const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { runQuery, getRow } = require('../db');
const { authenticateToken, JWT_SECRET } = require('../middleware/authMiddleware');

// Helper: Generate Token & Cookie
function sendAuthToken(user, res, message = 'Success') {
  const payload = {
    id: user.id,
    user_id: user.user_id,
    workspace_id: user.workspace_id || user.user_id,
    full_name: user.full_name,
    company_name: user.company_name,
    email: user.email,
    role: user.role || 'user'
  };

  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

  // Set HTTP-Only Cookie
  res.cookie('token', token, {
    httpOnly: true,
    secure: false, // Set true in production HTTPS
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });

  return res.json({
    success: true,
    message,
    token,
    user: payload
  });
}

// 1. PUBLIC CUSTOMER ADMIN REGISTRATION ENDPOINT
router.post('/register-admin', async (req, res) => {
  try {
    const { full_name, company_name, email, password, confirm_password, phone, gstin, plan_id } = req.body;

    if (!full_name || !company_name || !email || !password) {
      return res.status(400).json({ error: 'Full Name, Company Name, Email, and Password are required.' });
    }

    if (password !== confirm_password) {
      return res.status(400).json({ error: 'Passwords do not match.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    const emailClean = email.trim().toLowerCase();
    const existing = await getRow(`SELECT * FROM users WHERE email = ?`, [emailClean]);
    if (existing) {
      return res.status(400).json({ error: 'An account with this email address already exists.' });
    }

    // Require valid plan selection
    const targetPlanId = (plan_id || 'growth').toLowerCase();
    const plan = await getRow(`SELECT * FROM plans WHERE plan_id = ?`, [targetPlanId]);
    if (!plan) {
      return res.status(400).json({ error: 'Please choose a valid pricing plan.' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);
    const user_id = 'usr_' + crypto.randomBytes(8).toString('hex');
    const workspace_id = user_id; // Primary Customer Admin owns their workspace

    const result = await runQuery(
      `INSERT INTO users (user_id, workspace_id, full_name, company_name, email, password_hash, phone, gstin, role, status, created_by, last_login_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'admin', 'active', ?, CURRENT_TIMESTAMP)`,
      [user_id, workspace_id, full_name.trim(), company_name.trim(), emailClean, password_hash, (phone || '').trim(), (gstin || '').trim(), user_id]
    );

    const newUser = await getRow(`SELECT * FROM users WHERE id = ?`, [result.lastID]);

    // Create Initial Subscription for Workspace
    const orderId = 'order_inr_' + crypto.randomBytes(8).toString('hex');
    await runQuery(
      `INSERT INTO subscriptions (workspace_id, user_id, plan_id, status, razorpay_order_id, amount_paid, currency)
       VALUES (?, ?, ?, 'active', ?, ?, 'INR')`,
      [workspace_id, user_id, plan.plan_id, orderId, plan.price]
    );

    // Audit Log Admin Registration Event
    try {
      const { logAuditEvent } = require('../services/auditService');
      await logAuditEvent({
        userId: user_id,
        userName: full_name.trim(),
        userEmail: emailClean,
        userRole: 'admin',
        workspaceId: workspace_id,
        action: 'Customer Admin Registered',
        targetType: 'User',
        targetId: user_id,
        details: `Customer Admin registered for company "${company_name.trim()}" with ${plan.name} Plan (₹${plan.price}/mo INR).`
      });
    } catch (e) {}

    return sendAuthToken(newUser, res, `Welcome to Prosqora! Your workspace is activated on ${plan.name} Plan.`);
  } catch (err) {
    console.error('Customer Admin Registration Error:', err);
    res.status(500).json({ error: 'Failed to create Customer Admin account.' });
  }
});

// 2. SIGNUP ENDPOINT (LEGACY FALLBACK)
router.post('/signup', async (req, res) => {
  try {
    const { full_name, company_name, email, password, confirm_password } = req.body;

    if (!full_name || !email || !password) {
      return res.status(400).json({ error: 'Full Name, Email, and Password are required.' });
    }

    if (password !== confirm_password) {
      return res.status(400).json({ error: 'Passwords do not match.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Please choose a stronger password (at least 6 characters).' });
    }

    const emailClean = email.trim().toLowerCase();
    const existing = await getRow(`SELECT * FROM users WHERE email = ?`, [emailClean]);
    if (existing) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);
    const user_id = 'usr_' + crypto.randomBytes(8).toString('hex');

    const adminCountRow = await getRow(`SELECT COUNT(*) as count FROM users WHERE role = 'admin' OR role = 'ADMIN'`);
    const isFirstUser = !adminCountRow || adminCountRow.count === 0;
    const userRole = isFirstUser ? 'admin' : (req.body.role === 'user' ? 'user' : 'admin');

    const result = await runQuery(
      `INSERT INTO users (user_id, full_name, company_name, email, password_hash, role, status, last_login_at)
       VALUES (?, ?, ?, ?, ?, ?, 'active', CURRENT_TIMESTAMP)`,
      [user_id, full_name.trim(), (company_name || '').trim(), emailClean, password_hash, userRole]
    );

    const newUser = await getRow(`SELECT * FROM users WHERE id = ?`, [result.lastID]);
    return sendAuthToken(newUser, res, 'Account created successfully!');
  } catch (err) {
    console.error('Signup Error:', err);
    res.status(500).json({ error: 'Failed to create account.' });
  }
});

// 2. UNIFIED LOGIN ENDPOINT (ADMIN & NORMAL USER)
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Please enter both email and password.' });
    }

    const emailClean = email.trim().toLowerCase();
    const user = await getRow(`SELECT * FROM users WHERE email = ?`, [emailClean]);

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    if (user.status === 'disabled' || user.status === 'deleted') {
      return res.status(403).json({ error: 'Your account or workspace is no longer active. Please contact support.' });
    }

    const workspaceOwnerId = user.workspace_id || user.user_id;
    if (workspaceOwnerId !== user.user_id) {
      const owner = await getRow(`SELECT status FROM users WHERE user_id = ?`, [workspaceOwnerId]);
      if (owner && (owner.status === 'disabled' || owner.status === 'deleted')) {
        return res.status(403).json({ error: 'Your workspace is no longer active. Please contact support.' });
      }
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    await runQuery(`UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?`, [user.id]);

    // Audit Log Login Event
    try {
      const { logAuditEvent } = require('../services/auditService');
      await logAuditEvent({
        userId: user.user_id,
        userName: user.full_name,
        userEmail: user.email,
        userRole: user.role || 'user',
        workspaceId: user.user_id,
        action: 'User Login',
        targetType: 'User',
        targetId: user.user_id,
        details: `User logged in: ${user.full_name} (${user.email})`
      });
    } catch (e) {}

    return sendAuthToken(user, res, 'Welcome back!');
  } catch (err) {
    console.error('Login Error:', err);
    res.status(500).json({ error: 'Failed to authenticate user.' });
  }
});

// 3. LOGOUT ENDPOINT
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ success: true, message: 'Logged out successfully' });
});

// 4. GET CURRENT USER PROFILE
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await getRow(`SELECT id, user_id, full_name, company_name, email, phone, avatar_url, role, created_at FROM users WHERE user_id = ?`, [req.user.user_id]);
    if (!user) {
      return res.status(404).json({ error: 'User profile not found.' });
    }
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. UPDATE USER PROFILE
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { full_name, company_name, phone } = req.body;

    await runQuery(
      `UPDATE users SET full_name = ?, company_name = ?, phone = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?`,
      [full_name, company_name, phone, req.user.user_id]
    );

    const updated = await getRow(`SELECT id, user_id, full_name, company_name, email, phone, avatar_url, role FROM users WHERE user_id = ?`, [req.user.user_id]);
    res.json({ success: true, user: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. FORGOT PASSWORD
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required.' });

    const emailClean = email.trim().toLowerCase();
    const user = await getRow(`SELECT * FROM users WHERE email = ?`, [emailClean]);

    if (user) {
      const resetToken = crypto.randomBytes(20).toString('hex');
      const expires = new Date(Date.now() + 3600000).toISOString(); // 1 hour

      await runQuery(`UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?`, [resetToken, expires, user.id]);
    }

    // Always return generic success message to prevent user enumeration attacks
    res.json({
      success: true,
      message: 'If an account exists for this email, a password reset instruction has been generated.'
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to process forgot password request.' });
  }
});

// 7. RESET PASSWORD
router.post('/reset-password', async (req, res) => {
  try {
    const { token, new_password, confirm_password } = req.body;

    if (!token || !new_password) {
      return res.status(400).json({ error: 'Token and new password are required.' });
    }

    if (new_password !== confirm_password) {
      return res.status(400).json({ error: 'Passwords do not match.' });
    }

    const user = await getRow(`SELECT * FROM users WHERE reset_token = ? AND reset_token_expires > CURRENT_TIMESTAMP`, [token]);
    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired password reset token.' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(new_password, salt);

    await runQuery(`UPDATE users SET password_hash = ?, reset_token = '', reset_token_expires = NULL WHERE id = ?`, [password_hash, user.id]);

    res.json({ success: true, message: 'Password reset successfully. You can now login.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reset password.' });
  }
});

module.exports = router;
