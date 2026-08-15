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

// 1. SIGNUP ENDPOINT
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

    const result = await runQuery(
      `INSERT INTO users (user_id, full_name, company_name, email, password_hash, last_login_at)
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [user_id, full_name.trim(), (company_name || '').trim(), emailClean, password_hash]
    );

    const newUser = await getRow(`SELECT * FROM users WHERE id = ?`, [result.lastID]);
    return sendAuthToken(newUser, res, 'Account created successfully!');
  } catch (err) {
    console.error('Signup Error:', err);
    res.status(500).json({ error: 'Failed to create account.' });
  }
});

// 2. LOGIN ENDPOINT
router.post('/login', async (req, res) => {
  try {
    const { email, password, remember } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const emailClean = email.trim().toLowerCase();
    const user = await getRow(`SELECT * FROM users WHERE email = ?`, [emailClean]);

    if (!user) {
      return res.status(401).json({ error: 'Email or password is incorrect.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Email or password is incorrect.' });
    }

    await runQuery(`UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?`, [user.id]);

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
