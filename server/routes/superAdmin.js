const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');
const { logAuditEvent } = require('../services/auditService');
const { runQuery, getRow, getAll } = require('../db');

// STRICT SECURITY: Only authenticated SUPER_ADMIN accounts can access these routes
router.use(authenticateToken);
router.use(requireRole('super_admin'));

// Helper to format INR
function formatINR(amount) {
  if (typeof amount !== 'number') return '₹' + amount;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
}

// 1. SUPER ADMIN DASHBOARD METRICS
router.get('/dashboard', async (req, res) => {
  try {
    const totalCustomersRow = await getRow(`SELECT COUNT(*) as cnt FROM users WHERE role = 'admin' OR role = 'ADMIN'`);
    const activeCustomersRow = await getRow(`SELECT COUNT(*) as cnt FROM users WHERE (role = 'admin' OR role = 'ADMIN') AND (status IS NULL OR status = 'active')`);
    const activeSubsRow = await getRow(`SELECT COUNT(*) as cnt FROM subscriptions WHERE status = 'active' OR status = 'EXEMPT'`);
    const exemptSubsRow = await getRow(`SELECT COUNT(*) as cnt FROM users WHERE subscription_exempt = 1 AND email != 'amautomationtrading@gmail.com'`);
    const totalWorkspacesRow = await getRow(`SELECT COUNT(DISTINCT workspace_id) as cnt FROM users WHERE workspace_id != ''`);
    const totalUsersRow = await getRow(`SELECT COUNT(*) as cnt FROM users WHERE status != 'deleted' OR status IS NULL`);
    const totalLeadsRow = await getRow(`SELECT COUNT(*) as cnt FROM leads`);
    const totalScansRow = await getRow(`SELECT COUNT(*) as cnt FROM website_scans`);
    const revenueRow = await getRow(`SELECT SUM(amount_paid) as total FROM subscriptions WHERE status = 'active'`);
    
    const recentLogs = await getAll(
      `SELECT id, user_name, user_email, user_role, workspace_id, action, target_type, target_id, details, created_at FROM audit_logs ORDER BY id DESC LIMIT 10`
    );

    res.json({
      success: true,
      stats: {
        totalCustomers: totalCustomersRow ? totalCustomersRow.cnt : 0,
        activeCustomers: activeCustomersRow ? activeCustomersRow.cnt : 0,
        activeSubscriptions: activeSubsRow ? activeSubsRow.cnt : 0,
        exemptSubscriptions: exemptSubsRow ? exemptSubsRow.cnt : 0,
        totalWorkspaces: totalWorkspacesRow ? totalWorkspacesRow.cnt : 0,
        totalUsers: totalUsersRow ? totalUsersRow.cnt : 0,
        totalLeads: totalLeadsRow ? totalLeadsRow.cnt : 0,
        totalScans: totalScansRow ? totalScansRow.cnt : 0,
        monthlyRevenue: formatINR(revenueRow && revenueRow.total ? revenueRow.total : 0),
        monthlyRevenueRaw: revenueRow && revenueRow.total ? revenueRow.total : 0
      },
      recentLogs
    });
  } catch (err) {
    console.error('Super Admin Dashboard Error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch platform metrics.' });
  }
});

// 2. GET ALL CUSTOMERS WITH FILTERING (STATUS: ALL, ACTIVE, DISABLED, DELETED, EXEMPT)
router.get('/customers', async (req, res) => {
  try {
    const { statusFilter, search } = req.query;

    let query = `SELECT id, user_id, workspace_id, full_name, company_name, email, phone, role, status, subscription_exempt, created_at FROM users WHERE role = 'admin' OR role = 'ADMIN'`;
    const params = [];

    if (statusFilter && statusFilter !== 'all') {
      if (statusFilter === 'exempt') {
        query += ` AND subscription_exempt = 1`;
      } else if (statusFilter === 'deleted') {
        query += ` AND status = 'deleted'`;
      } else if (statusFilter === 'disabled') {
        query += ` AND status = 'disabled'`;
      } else if (statusFilter === 'active') {
        query += ` AND (status IS NULL OR status = 'active') AND subscription_exempt = 0`;
      }
    }

    query += ` ORDER BY id DESC`;

    const customerUsers = await getAll(query, params);

    const customers = [];
    for (const cust of customerUsers) {
      const workspaceId = cust.workspace_id || cust.user_id;

      const sub = await getRow(
        `SELECT * FROM subscriptions WHERE workspace_id = ? ORDER BY id DESC LIMIT 1`,
        [workspaceId]
      );

      const planId = sub ? sub.plan_id : 'starter';
      const plan = await getRow(`SELECT * FROM plans WHERE plan_id = ?`, [planId]);

      const usersCountRow = await getRow(
        `SELECT COUNT(*) as cnt FROM users WHERE (workspace_id = ? OR created_by = ?) AND (status != 'deleted' OR status IS NULL)`,
        [workspaceId, cust.user_id]
      );
      const leadsCountRow = await getRow(
        `SELECT COUNT(*) as cnt FROM leads WHERE workspace_id = ?`,
        [workspaceId]
      );

      customers.push({
        id: cust.id,
        user_id: cust.user_id,
        workspace_id: workspaceId,
        full_name: cust.full_name,
        company_name: cust.company_name || 'Individual Customer',
        email: cust.email,
        phone: cust.phone || '',
        status: cust.status || 'active',
        subscription_type: cust.subscription_exempt ? 'EXEMPT' : 'PAID',
        subscription_exempt: cust.subscription_exempt === 1,
        plan: {
          plan_id: plan ? plan.plan_id : planId,
          name: plan ? plan.name : (planId === 'unlimited' ? 'Custom Unlimited' : 'Starter'),
          price: plan ? plan.price : 999,
          formatted_price: plan && plan.price > 0 ? formatINR(plan.price) : '₹0 (EXEMPT)',
          lead_limit: sub && sub.lead_limit_override ? sub.lead_limit_override : (plan ? plan.lead_limit : 1000),
          scan_limit: sub && sub.scan_limit_override ? sub.scan_limit_override : (plan ? plan.scan_limit : 1000),
          user_limit: sub && sub.user_limit_override ? sub.user_limit_override : (plan ? plan.user_limit : 2)
        },
        users_count: usersCountRow ? usersCountRow.cnt : 1,
        leads_count: leadsCountRow ? leadsCountRow.cnt : 0,
        created_at: cust.created_at
      });
    }

    res.json({ success: true, customers });
  } catch (err) {
    console.error('Super Admin Customers Error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch customer list.' });
  }
});

// 3. GET SINGLE CUSTOMER DETAILS VIEW
router.get('/customers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const targetUser = await getRow(`SELECT * FROM users WHERE id = ? OR user_id = ?`, [id, id]);

    if (!targetUser) {
      return res.status(404).json({ success: false, error: 'Customer account not found.' });
    }

    const workspaceId = targetUser.workspace_id || targetUser.user_id;

    const sub = await getRow(
      `SELECT * FROM subscriptions WHERE workspace_id = ? ORDER BY id DESC LIMIT 1`,
      [workspaceId]
    );

    const planId = sub ? sub.plan_id : 'starter';
    const plan = await getRow(`SELECT * FROM plans WHERE plan_id = ?`, [planId]);

    const workspaceUsers = await getAll(
      `SELECT id, user_id, full_name, email, role, COALESCE(status, 'active') as status, created_at, last_login_at FROM users WHERE workspace_id = ? OR created_by = ?`,
      [workspaceId, targetUser.user_id]
    );

    const leadsCountRow = await getRow(`SELECT COUNT(*) as cnt FROM leads WHERE workspace_id = ?`, [workspaceId]);
    const scansCountRow = await getRow(`SELECT COUNT(*) as cnt FROM website_scans WHERE user_id = ?`, [targetUser.user_id]);

    const auditLogs = await getAll(
      `SELECT * FROM audit_logs WHERE workspace_id = ? ORDER BY id DESC LIMIT 20`,
      [workspaceId]
    );

    res.json({
      success: true,
      customer: {
        id: targetUser.id,
        user_id: targetUser.user_id,
        workspace_id: workspaceId,
        full_name: targetUser.full_name,
        company_name: targetUser.company_name,
        email: targetUser.email,
        phone: targetUser.phone || '',
        status: targetUser.status || 'active',
        subscription_exempt: targetUser.subscription_exempt === 1,
        subscription_type: targetUser.subscription_exempt ? 'EXEMPT' : 'PAID',
        created_at: targetUser.created_at,
        last_login_at: targetUser.last_login_at,
        plan: {
          plan_id: plan ? plan.plan_id : planId,
          name: plan ? plan.name : (planId === 'unlimited' ? 'Custom Unlimited' : 'Starter'),
          price: plan ? plan.price : 999,
          formatted_price: plan && plan.price > 0 ? formatINR(plan.price) : '₹0 (EXEMPT)',
          default_lead_limit: plan ? plan.lead_limit : 1000,
          default_scan_limit: plan ? plan.scan_limit : 1000,
          default_user_limit: plan ? plan.user_limit : 2,
          lead_limit: sub && sub.lead_limit_override ? sub.lead_limit_override : (plan ? plan.lead_limit : 1000),
          scan_limit: sub && sub.scan_limit_override ? sub.scan_limit_override : (plan ? plan.scan_limit : 1000),
          user_limit: sub && sub.user_limit_override ? sub.user_limit_override : (plan ? plan.user_limit : 2)
        },
        users: workspaceUsers,
        leads_count: leadsCountRow ? leadsCountRow.cnt : 0,
        scans_count: scansCountRow ? scansCountRow.cnt : 0,
        recent_activity: auditLogs
      }
    });
  } catch (err) {
    console.error('Fetch Customer Details Error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch customer details.' });
  }
});

// 4. CREATE EXEMPT CUSTOMER ADMIN
router.post('/customers', async (req, res) => {
  try {
    const { full_name, company_name, email, password, confirm_password, phone, plan_id, subscription_type } = req.body;

    if (!full_name || !company_name || !email || !password) {
      return res.status(400).json({ success: false, error: 'Full Name, Company Name, Email, and Password are required.' });
    }

    if (password !== confirm_password) {
      return res.status(400).json({ success: false, error: 'Passwords do not match.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters long.' });
    }

    const emailClean = email.trim().toLowerCase();
    const existing = await getRow(`SELECT id FROM users WHERE email = ?`, [emailClean]);
    if (existing) {
      return res.status(400).json({ success: false, error: 'An account with this email address already exists.' });
    }

    const isExempt = subscription_type === 'EXEMPT' || subscription_type === 'exempt' || req.body.subscription_exempt === true;
    const targetPlanId = (plan_id || 'growth').toLowerCase();
    let plan = await getRow(`SELECT * FROM plans WHERE plan_id = ?`, [targetPlanId]);

    if (!plan && targetPlanId === 'unlimited') {
      plan = {
        plan_id: 'unlimited',
        name: 'Custom Unlimited',
        price: 0,
        lead_limit: 999999,
        scan_limit: 999999,
        user_limit: 999
      };
    } else if (!plan) {
      plan = {
        plan_id: 'growth',
        name: 'Growth',
        price: 2499,
        lead_limit: 5000,
        scan_limit: 5000,
        user_limit: 5
      };
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);
    const new_user_id = 'usr_' + crypto.randomBytes(8).toString('hex');
    const new_workspace_id = new_user_id;

    // Create Customer Admin
    await runQuery(
      `INSERT INTO users (user_id, workspace_id, full_name, company_name, email, password_hash, phone, role, status, subscription_exempt, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'admin', 'active', ?, ?)`,
      [new_user_id, new_workspace_id, full_name.trim(), company_name.trim(), emailClean, password_hash, (phone || '').trim(), isExempt ? 1 : 0, req.user.user_id]
    );

    // Create Active Subscription Record
    const orderId = isExempt ? 'order_exempt_superadmin' : 'order_paid_superadmin';
    await runQuery(
      `INSERT INTO subscriptions (workspace_id, user_id, plan_id, status, razorpay_order_id, amount_paid, currency)
       VALUES (?, ?, ?, ?, ?, ?, 'INR')`,
      [new_workspace_id, new_user_id, plan.plan_id, isExempt ? 'EXEMPT' : 'active', orderId, isExempt ? 0 : plan.price]
    );

    // Audit Log Exemption Creation Event
    await logAuditEvent({
      userId: req.user.user_id,
      userName: req.user.full_name,
      userEmail: req.user.email,
      userRole: 'super_admin',
      workspaceId: new_workspace_id,
      action: 'CUSTOMER_CREATED',
      targetType: 'User',
      targetId: new_user_id,
      details: `Super Admin created ${isExempt ? 'EXEMPT ' : ''}Customer Admin "${full_name.trim()}" (${emailClean}) for company "${company_name.trim()}" on ${plan.name} Plan.`
    });

    res.json({
      success: true,
      message: `Customer Admin ${full_name.trim()} created successfully${isExempt ? ' (EXEMPT — No Payment Required)' : ''}!`,
      user: {
        user_id: new_user_id,
        workspace_id: new_workspace_id,
        full_name: full_name.trim(),
        company_name: company_name.trim(),
        email: emailClean,
        role: 'admin',
        subscription_type: isExempt ? 'EXEMPT' : 'PAID',
        subscription_exempt: isExempt,
        plan: plan.name
      }
    });
  } catch (err) {
    console.error('Super Admin Create Customer Error:', err);
    res.status(500).json({ success: false, error: 'Failed to create Customer Admin.' });
  }
});

// 5. UPDATE FULL CUSTOMER (NAME, EMAIL, COMPANY, PHONE, PLAN, EXEMPTION, STATUS, CUSTOM LIMITS, PASSWORD RESET)
router.put('/customers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      full_name,
      email,
      company_name,
      phone,
      plan_id,
      subscription_type,
      status,
      lead_limit,
      scan_limit,
      user_limit,
      new_password
    } = req.body;

    const targetUser = await getRow(`SELECT * FROM users WHERE id = ? OR user_id = ?`, [id, id]);
    if (!targetUser) {
      return res.status(404).json({ success: false, error: 'Customer account not found.' });
    }

    const workspaceId = targetUser.workspace_id || targetUser.user_id;

    // Protection of Primary Super Admin Account
    if (targetUser.email === 'amautomationtrading@gmail.com') {
      if (email && email.trim().toLowerCase() !== 'amautomationtrading@gmail.com') {
        return res.status(400).json({ success: false, error: 'Primary Super Admin email address cannot be modified.' });
      }
      if (status && status !== 'active') {
        return res.status(400).json({ success: false, error: 'Primary Super Admin account status cannot be modified.' });
      }
    }

    // Email Uniqueness Verification if email is being changed
    let updatedEmail = targetUser.email;
    if (email && email.trim().toLowerCase() !== targetUser.email) {
      const emailClean = email.trim().toLowerCase();
      if (emailClean === 'amautomationtrading@gmail.com') {
        return res.status(400).json({ success: false, error: 'Cannot assign Primary Super Admin email to customer account.' });
      }
      const existing = await getRow(`SELECT id FROM users WHERE email = ? AND id != ?`, [emailClean, targetUser.id]);
      if (existing) {
        return res.status(400).json({ success: false, error: 'An account with this email address already exists.' });
      }
      updatedEmail = emailClean;
    }

    // Optional Password Reset
    let passwordHash = targetUser.password_hash;
    if (new_password && new_password.trim() !== '') {
      if (new_password.length < 6) {
        return res.status(400).json({ success: false, error: 'New password must be at least 6 characters long.' });
      }
      const salt = await bcrypt.genSalt(10);
      passwordHash = await bcrypt.hash(new_password, salt);
    }

    const isExempt = subscription_type === 'EXEMPT' || req.body.subscription_exempt === true;
    const newStatus = status || targetUser.status || 'active';

    // Update Customer Admin Account
    await runQuery(
      `UPDATE users 
       SET full_name = ?, email = ?, company_name = ?, phone = ?, password_hash = ?, status = ?, subscription_exempt = ?
       WHERE id = ?`,
      [
        full_name ? full_name.trim() : targetUser.full_name,
        updatedEmail,
        company_name ? company_name.trim() : targetUser.company_name,
        phone !== undefined ? phone.trim() : targetUser.phone,
        passwordHash,
        newStatus,
        isExempt ? 1 : 0,
        targetUser.id
      ]
    );

    // Update Subscription & Custom Limits
    const targetPlanId = (plan_id || 'growth').toLowerCase();
    const plan = await getRow(`SELECT * FROM plans WHERE plan_id = ?`, [targetPlanId]);

    const parsedLeadLimit = lead_limit ? parseInt(lead_limit) : null;
    const parsedScanLimit = scan_limit ? parseInt(scan_limit) : null;
    const parsedUserLimit = user_limit ? parseInt(user_limit) : null;

    await runQuery(`UPDATE subscriptions SET status = 'replaced' WHERE workspace_id = ? AND status = 'active'`, [workspaceId]);
    await runQuery(
      `INSERT INTO subscriptions (workspace_id, user_id, plan_id, status, razorpay_order_id, amount_paid, currency, lead_limit_override, scan_limit_override, user_limit_override)
       VALUES (?, ?, ?, ?, 'order_superadmin_edit', ?, 'INR', ?, ?, ?)`,
      [
        workspaceId,
        targetUser.user_id,
        plan ? plan.plan_id : targetPlanId,
        isExempt ? 'EXEMPT' : 'active',
        isExempt ? 0 : (plan ? plan.price : 0),
        parsedLeadLimit,
        parsedScanLimit,
        parsedUserLimit
      ]
    );

    // Audit Log Edit Event
    await logAuditEvent({
      userId: req.user.user_id,
      userName: req.user.full_name,
      userEmail: req.user.email,
      userRole: 'super_admin',
      workspaceId: workspaceId,
      action: 'CUSTOMER_UPDATED',
      targetType: 'User',
      targetId: targetUser.user_id,
      details: `Super Admin updated Customer Workspace "${company_name || targetUser.company_name}" (${updatedEmail}) — Plan: ${plan ? plan.name : targetPlanId}, Exemption: ${isExempt ? 'EXEMPT' : 'PAID'}, Status: ${newStatus.toUpperCase()}`
    });

    res.json({
      success: true,
      message: `Customer workspace "${company_name || targetUser.company_name}" updated successfully.`
    });
  } catch (err) {
    console.error('Update Customer Error:', err);
    res.status(500).json({ success: false, error: 'Failed to update customer workspace.' });
  }
});

// 6. DISABLE / ENABLE CUSTOMER ACCOUNT
router.put('/customers/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'active' | 'disabled'

    const targetUser = await getRow(`SELECT * FROM users WHERE id = ? OR user_id = ?`, [id, id]);
    if (!targetUser) {
      return res.status(404).json({ success: false, error: 'Customer account not found.' });
    }

    if (targetUser.email === 'amautomationtrading@gmail.com') {
      return res.status(400).json({ success: false, error: 'Primary Super Admin account cannot be disabled.' });
    }

    const newStatus = status === 'disabled' ? 'disabled' : 'active';
    await runQuery(`UPDATE users SET status = ? WHERE id = ?`, [newStatus, targetUser.id]);

    await logAuditEvent({
      userId: req.user.user_id,
      userName: req.user.full_name,
      userEmail: req.user.email,
      userRole: 'super_admin',
      workspaceId: targetUser.workspace_id || targetUser.user_id,
      action: newStatus === 'disabled' ? 'CUSTOMER_DISABLED' : 'CUSTOMER_ENABLED',
      targetType: 'User',
      targetId: targetUser.user_id,
      details: `Super Admin set account status of "${targetUser.full_name}" (${targetUser.email}) to ${newStatus.toUpperCase()}.`
    });

    res.json({
      success: true,
      message: `Account status for ${targetUser.full_name} updated to ${newStatus}.`
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update customer status.' });
  }
});

// 7. SOFT-DELETE CUSTOMER WORKSPACE
router.delete('/customers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { company_name_confirm } = req.body;

    const targetUser = await getRow(`SELECT * FROM users WHERE id = ? OR user_id = ?`, [id, id]);
    if (!targetUser) {
      return res.status(404).json({ success: false, error: 'Customer account not found.' });
    }

    if (targetUser.email === 'amautomationtrading@gmail.com') {
      return res.status(400).json({ success: false, error: 'Primary Super Admin workspace cannot be deleted.' });
    }

    const companyName = targetUser.company_name || 'Individual Customer';
    if (company_name_confirm && company_name_confirm.trim() !== companyName.trim()) {
      return res.status(400).json({ success: false, error: 'Company name confirmation does not match exact company name.' });
    }

    const workspaceId = targetUser.workspace_id || targetUser.user_id;

    // Soft delete Customer Admin & all Normal Users in workspace
    await runQuery(`UPDATE users SET status = 'deleted' WHERE workspace_id = ? OR user_id = ? OR id = ?`, [workspaceId, targetUser.user_id, targetUser.id]);

    // Mark subscription as deleted
    await runQuery(`UPDATE subscriptions SET status = 'deleted' WHERE workspace_id = ?`, [workspaceId]);

    await logAuditEvent({
      userId: req.user.user_id,
      userName: req.user.full_name,
      userEmail: req.user.email,
      userRole: 'super_admin',
      workspaceId: workspaceId,
      action: 'CUSTOMER_DELETED',
      targetType: 'User',
      targetId: targetUser.user_id,
      details: `Super Admin SOFT-DELETED Customer Workspace "${companyName}" (${targetUser.email}). Access revoked for all workspace users.`
    });

    res.json({
      success: true,
      message: `Customer Workspace "${companyName}" soft-deleted successfully.`
    });
  } catch (err) {
    console.error('Delete Customer Error:', err);
    res.status(500).json({ success: false, error: 'Failed to delete customer workspace.' });
  }
});

// 8. RESTORE SOFT-DELETED CUSTOMER WORKSPACE
router.post('/customers/:id/restore', async (req, res) => {
  try {
    const { id } = req.params;

    const targetUser = await getRow(`SELECT * FROM users WHERE id = ? OR user_id = ?`, [id, id]);
    if (!targetUser) {
      return res.status(404).json({ success: false, error: 'Customer account not found.' });
    }

    const workspaceId = targetUser.workspace_id || targetUser.user_id;

    // Restore Customer Admin & Normal Users in workspace
    await runQuery(`UPDATE users SET status = 'active' WHERE workspace_id = ? OR user_id = ? OR id = ?`, [workspaceId, targetUser.user_id, targetUser.id]);

    // Restore subscription status
    const isExempt = targetUser.subscription_exempt === 1;
    await runQuery(`UPDATE subscriptions SET status = ? WHERE workspace_id = ?`, [isExempt ? 'EXEMPT' : 'active', workspaceId]);

    await logAuditEvent({
      userId: req.user.user_id,
      userName: req.user.full_name,
      userEmail: req.user.email,
      userRole: 'super_admin',
      workspaceId: workspaceId,
      action: 'CUSTOMER_RESTORED',
      targetType: 'User',
      targetId: targetUser.user_id,
      details: `Super Admin RESTORED Customer Workspace "${targetUser.company_name}" (${targetUser.email}). Access re-activated.`
    });

    res.json({
      success: true,
      message: `Customer Workspace "${targetUser.company_name}" restored successfully.`
    });
  } catch (err) {
    console.error('Restore Customer Error:', err);
    res.status(500).json({ success: false, error: 'Failed to restore customer workspace.' });
  }
});

module.exports = router;
