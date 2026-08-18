const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { runQuery, getRow, getAll } = require('../db');
const { authenticateToken, requireRole } = require('../middleware/authMiddleware');
const { logAuditEvent, getAuditLogs } = require('../services/auditService');

// Protect ALL Admin Panel routes: Must be authenticated AND have role='admin' or 'super_admin'
router.use(authenticateToken);
router.use(requireRole('admin'));

const getWorkspaceId = (req) => req.user.workspace_id || req.user.user_id;

// 1. ADMIN DASHBOARD OVERVIEW STATS (TENANT SCOPED)
router.get('/overview', async (req, res) => {
  try {
    const userId = req.user.user_id;
    const workspaceId = getWorkspaceId(req);
    const isSuperAdmin = (req.user.role || '').toLowerCase() === 'super_admin';

    let totalUsersRow, activeUsersRow, disabledUsersRow, totalLeadsRow;

    if (isSuperAdmin) {
      totalUsersRow = await getRow(`SELECT COUNT(*) as count FROM users WHERE status != 'deleted' OR status IS NULL`);
      activeUsersRow = await getRow(`SELECT COUNT(*) as count FROM users WHERE (status = 'active' OR status IS NULL OR status = '') AND role != 'super_admin'`);
      disabledUsersRow = await getRow(`SELECT COUNT(*) as count FROM users WHERE status = 'disabled'`);
      totalLeadsRow = await getRow(`SELECT COUNT(*) as count FROM leads`);
    } else {
      totalUsersRow = await getRow(
        `SELECT COUNT(*) as count FROM users WHERE (workspace_id = ? OR (workspace_id = '' AND created_by = ?) OR user_id = ?) AND (status != 'deleted' OR status IS NULL)`,
        [workspaceId, userId, userId]
      );
      activeUsersRow = await getRow(
        `SELECT COUNT(*) as count FROM users WHERE (status = 'active' OR status IS NULL OR status = '') AND (workspace_id = ? OR (workspace_id = '' AND created_by = ?) OR user_id = ?)`,
        [workspaceId, userId, userId]
      );
      disabledUsersRow = await getRow(
        `SELECT COUNT(*) as count FROM users WHERE status = 'disabled' AND (workspace_id = ? OR (workspace_id = '' AND created_by = ?) OR user_id = ?)`,
        [workspaceId, userId, userId]
      );
      totalLeadsRow = await getRow(
        `SELECT COUNT(*) as count FROM leads WHERE workspace_id = ? OR (workspace_id = '' AND user_id = ?)`,
        [workspaceId, userId]
      );
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayIso = todayStart.toISOString();

    const auditParams = isSuperAdmin ? [todayIso] : [workspaceId, todayIso];
    const auditWhere = isSuperAdmin ? `created_at >= ?` : `workspace_id = ? AND created_at >= ?`;

    const createdTodayRow = await getRow(
      `SELECT COUNT(*) as count FROM audit_logs WHERE action = 'Lead Created' AND ${auditWhere}`,
      auditParams
    );
    const updatedTodayRow = await getRow(
      `SELECT COUNT(*) as count FROM audit_logs WHERE action = 'Lead Updated' AND ${auditWhere}`,
      auditParams
    );
    const deletedTodayRow = await getRow(
      `SELECT COUNT(*) as count FROM audit_logs WHERE (action = 'Lead Deleted' OR action = 'Bulk Lead Deleted') AND ${auditWhere}`,
      auditParams
    );
    const scansTodayRow = await getRow(
      `SELECT COUNT(*) as count FROM audit_logs WHERE (action = 'Website Scan' OR action = 'Website Refresh') AND ${auditWhere}`,
      auditParams
    );
    const csvImportsTodayRow = await getRow(
      `SELECT COUNT(*) as count FROM audit_logs WHERE action = 'CSV Import' AND ${auditWhere}`,
      auditParams
    );

    res.json({
      success: true,
      stats: {
        totalUsers: totalUsersRow?.count || 0,
        activeUsers: activeUsersRow?.count || 0,
        disabledUsers: disabledUsersRow?.count || 0,
        totalLeads: totalLeadsRow?.count || 0,
        leadsCreatedToday: createdTodayRow?.count || 0,
        leadsUpdatedToday: updatedTodayRow?.count || 0,
        leadsDeletedToday: deletedTodayRow?.count || 0,
        websiteScansToday: scansTodayRow?.count || 0,
        csvImportsToday: csvImportsTodayRow?.count || 0
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. USER MANAGEMENT LIST (STRICT SERVER-SIDE STATUS & SEARCH FILTERING)
router.get('/users', async (req, res) => {
  try {
    const userId = req.user.user_id;
    const workspaceId = getWorkspaceId(req);
    const isSuperAdmin = (req.user.role || '').toLowerCase() === 'super_admin';
    const statusFilter = (req.query.status || 'all').toLowerCase();
    const searchFilter = (req.query.search || '').trim().toLowerCase();

    let whereClause = '';
    let params = [];

    if (isSuperAdmin) {
      whereClause = `WHERE (status != 'deleted' OR status IS NULL)`;
    } else {
      whereClause = `WHERE (workspace_id = ? OR (workspace_id = '' AND created_by = ?) OR user_id = ?) AND (status != 'deleted' OR status IS NULL)`;
      params = [workspaceId, userId, userId];
    }

    if (statusFilter === 'active') {
      whereClause += ` AND (status = 'active' OR status IS NULL OR status = '')`;
    } else if (statusFilter === 'disabled') {
      whereClause += ` AND status = 'disabled'`;
    }

    if (searchFilter) {
      whereClause += ` AND (LOWER(full_name) LIKE ? OR LOWER(email) LIKE ? OR LOWER(company_name) LIKE ?)`;
      const pattern = `%${searchFilter}%`;
      params.push(pattern, pattern, pattern);
    }

    const query = `SELECT id, user_id, workspace_id, full_name, company_name, email, role, COALESCE(status, 'active') as status, last_login_at, created_at, created_by FROM users ${whereClause} ORDER BY id DESC`;
    const users = await getAll(query, params);

    res.json({
      success: true,
      users
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. CREATE NEW USER ACCOUNT (AUTOMATICALLY ASSIGNS AUTHENTICATED WORKSPACE)
router.post('/users', async (req, res) => {
  try {
    const { full_name, email, password, confirm_password, role } = req.body;
    const userId = req.user.user_id;
    const workspaceId = getWorkspaceId(req);

    if (!full_name || !email || !password) {
      return res.status(400).json({ error: 'Full Name, Email, and Password are required.' });
    }

    if (password !== confirm_password) {
      return res.status(400).json({ error: 'Passwords do not match.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    const emailClean = email.trim().toLowerCase();
    const existing = await getRow(`SELECT id FROM users WHERE email = ?`, [emailClean]);
    if (existing) {
      return res.status(400).json({ error: 'A user with this email address already exists.' });
    }

    // Customer Admin cannot create SUPER_ADMIN role
    const targetRole = role === 'admin' ? 'admin' : 'user';
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);
    const new_user_id = 'usr_' + crypto.randomBytes(8).toString('hex');

    await runQuery(
      `INSERT INTO users (user_id, workspace_id, full_name, company_name, email, password_hash, role, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?)`,
      [new_user_id, workspaceId, full_name.trim(), req.user.company_name || 'CRM Workspace', emailClean, password_hash, targetRole, userId]
    );

    // Audit Log Creation Event
    await logAuditEvent({
      userId: userId,
      userName: req.user.full_name,
      userEmail: req.user.email,
      userRole: req.user.role,
      workspaceId: workspaceId,
      action: 'User Created',
      targetType: 'User',
      targetId: new_user_id,
      details: `Created new user account: ${full_name.trim()} (${emailClean}) with role ${targetRole === 'admin' ? 'Admin' : 'Normal User'}`
    });

    res.json({
      success: true,
      message: `User ${full_name.trim()} created successfully.`,
      user: {
        user_id: new_user_id,
        workspace_id: workspaceId,
        full_name: full_name.trim(),
        email: emailClean,
        role: targetRole,
        status: 'active'
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. DISABLE / ENABLE USER ACCOUNT (STRICT WORKSPACE AUTHORIZATION)
router.put('/users/:userId/status', async (req, res) => {
  try {
    const targetUserId = req.params.userId;
    const { status } = req.body;
    const userId = req.user.user_id;
    const workspaceId = getWorkspaceId(req);
    const isSuperAdmin = (req.user.role || '').toLowerCase() === 'super_admin';

    if (!['active', 'disabled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status parameter.' });
    }

    const targetUser = await getRow(`SELECT * FROM users WHERE user_id = ? OR id = ?`, [targetUserId, targetUserId]);
    if (!targetUser) {
      return res.status(404).json({ error: 'User account not found.' });
    }

    // IDOR Security Check: Customer Admin can ONLY modify users within their own workspace!
    const targetWorkspace = targetUser.workspace_id || targetUser.user_id;
    if (!isSuperAdmin && targetWorkspace !== workspaceId && targetUser.created_by !== userId && targetUser.user_id !== userId) {
      return res.status(403).json({ error: 'Access Denied: You cannot modify users outside your workspace.' });
    }

    // Protect Super Admin Account
    if (targetUser.email === 'amautomationtrading@gmail.com' || (targetUser.role || '').toLowerCase() === 'super_admin') {
      return res.status(400).json({ error: 'Primary Super Admin account cannot be disabled.' });
    }

    // Protect Last Admin in Workspace
    if (status === 'disabled' && (targetUser.role || '').toLowerCase() === 'admin') {
      const activeAdmins = await getAll(
        `SELECT id FROM users WHERE LOWER(role) = 'admin' AND (status = 'active' OR status IS NULL OR status = '') AND (workspace_id = ? OR user_id = ?)`,
        [workspaceId, userId]
      );
      if (activeAdmins.length <= 1) {
        return res.status(400).json({ error: 'At least one active Admin account is required in your workspace.' });
      }
    }

    await runQuery(`UPDATE users SET status = ? WHERE id = ?`, [status, targetUser.id]);

    const actionText = status === 'disabled' ? 'User Disabled' : 'User Enabled';
    await logAuditEvent({
      userId: userId,
      userName: req.user.full_name,
      userEmail: req.user.email,
      userRole: req.user.role,
      workspaceId: workspaceId,
      action: actionText,
      targetType: 'User',
      targetId: targetUser.user_id,
      details: `${actionText}: ${targetUser.full_name} (${targetUser.email})`
    });

    res.json({
      success: true,
      message: `User status updated to ${status}.`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. PERMANENTLY DELETE USER ACCOUNT (SUPER ADMIN ONLY)
router.delete('/users/:userId/permanent', async (req, res) => {
  try {
    const targetUserId = req.params.userId;
    const { email_confirm } = req.body;
    const userId = req.user.user_id;
    const isSuperAdmin = (req.user.role || '').toLowerCase() === 'super_admin';

    // Strict Authorization: ONLY SUPER_ADMIN can permanently delete user accounts
    if (!isSuperAdmin) {
      return res.status(403).json({ error: 'Access Denied: Only Super Admin platform owner can permanently delete user accounts.' });
    }

    const targetUser = await getRow(`SELECT * FROM users WHERE user_id = ? OR id = ?`, [targetUserId, targetUserId]);
    if (!targetUser) {
      return res.status(404).json({ error: 'User account not found.' });
    }

    // Protect Super Admin Account
    if (targetUser.email === 'amautomationtrading@gmail.com' || (targetUser.role || '').toLowerCase() === 'super_admin') {
      return res.status(403).json({ error: 'Super Admin platform owner account cannot be permanently deleted.' });
    }

    // Email Confirmation Validation
    if (email_confirm && email_confirm.trim().toLowerCase() !== targetUser.email.toLowerCase()) {
      return res.status(400).json({ error: `Please type exact email "${targetUser.email}" to confirm permanent deletion.` });
    }

    const targetWorkspaceId = targetUser.workspace_id || targetUser.user_id;

    // Execute Physical SQL Deletion
    await runQuery(`DELETE FROM users WHERE id = ? AND email != 'amautomationtrading@gmail.com'`, [targetUser.id]);

    // Audit Event Logging
    await logAuditEvent({
      userId: userId,
      userName: req.user.full_name,
      userEmail: req.user.email,
      userRole: req.user.role,
      workspaceId: targetWorkspaceId,
      action: 'USER_PERMANENTLY_DELETED',
      targetType: 'User',
      targetId: targetUser.user_id,
      details: `Super Admin PERMANENTLY DELETED user account "${targetUser.full_name}" (${targetUser.email}) from workspace ${targetWorkspaceId}.`
    });

    res.json({
      success: true,
      message: `User account "${targetUser.full_name}" (${targetUser.email}) permanently deleted from database.`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. UPDATE USER ROLE (STRICT WORKSPACE AUTHORIZATION)
router.put('/users/:userId/role', async (req, res) => {
  try {
    const targetUserId = req.params.userId;
    const { role } = req.body;
    const userId = req.user.user_id;
    const workspaceId = getWorkspaceId(req);
    const isSuperAdmin = (req.user.role || '').toLowerCase() === 'super_admin';

    const newRole = role === 'admin' ? 'admin' : 'user';
    const targetUser = await getRow(`SELECT * FROM users WHERE user_id = ? OR id = ?`, [targetUserId, targetUserId]);
    if (!targetUser) {
      return res.status(404).json({ error: 'User account not found.' });
    }

    // IDOR Security Check
    const targetWorkspace = targetUser.workspace_id || targetUser.user_id;
    if (!isSuperAdmin && targetWorkspace !== workspaceId && targetUser.created_by !== userId && targetUser.user_id !== userId) {
      return res.status(403).json({ error: 'Access Denied: You cannot modify users outside your workspace.' });
    }

    // Protect Last Admin Account
    if (newRole === 'user' && (targetUser.role === 'admin' || targetUser.role === 'ADMIN')) {
      const activeAdmins = await getAll(
        `SELECT id FROM users WHERE (role = 'admin' OR role = 'ADMIN') AND (status = 'active' OR status IS NULL) AND (workspace_id = ? OR user_id = ?)`,
        [workspaceId, userId]
      );
      if (activeAdmins.length <= 1) {
        return res.status(400).json({ error: 'At least one active Admin account is required in your workspace.' });
      }
    }

    await runQuery(`UPDATE users SET role = ? WHERE id = ?`, [newRole, targetUser.id]);

    await logAuditEvent({
      userId: userId,
      userName: req.user.full_name,
      userEmail: req.user.email,
      userRole: req.user.role,
      workspaceId: workspaceId,
      action: 'Role Changed',
      targetType: 'User',
      targetId: targetUser.user_id,
      details: `Role changed from ${targetUser.role} to ${newRole} for ${targetUser.full_name} (${targetUser.email})`
    });

    res.json({
      success: true,
      message: `User role updated to ${newRole === 'admin' ? 'Admin' : 'Normal User'}.`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. GET AUDIT LOGS TABLE (TENANT SCOPED)
router.get('/audit-logs', async (req, res) => {
  try {
    const { user, action, search, limit } = req.query;
    const workspaceId = getWorkspaceId(req);
    const isSuperAdmin = (req.user.role || '').toLowerCase() === 'super_admin';

    const logs = await getAuditLogs({
      workspaceId: isSuperAdmin ? null : workspaceId,
      user,
      action,
      search,
      limit: parseInt(limit) || 150
    });

    res.json({
      success: true,
      logs
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
