const { runQuery, getAll, getRow } = require('../db');

/**
 * Audit Logging Service for AutoLead CRM
 * Records immutable activity logs for user actions, lead updates, website scans, and admin operations.
 */
async function logAuditEvent({
  userId,
  userName = 'System',
  userEmail = '',
  userRole = 'user',
  workspaceId = '',
  action,
  targetType = '',
  targetId = '',
  details = '',
  changes = {}
}) {
  try {
    const changesJson = typeof changes === 'string' ? changes : JSON.stringify(changes || {});
    await runQuery(
      `INSERT INTO audit_logs (
        user_id, user_name, user_email, user_role, workspace_id, action, target_type, target_id, details, changes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId || 'system',
        userName || 'System',
        userEmail || '',
        userRole || 'user',
        workspaceId || userId || 'default',
        action,
        targetType,
        targetId,
        details,
        changesJson
      ]
    );
  } catch (err) {
    console.error('[AUDIT LOG ERROR]', err.message);
  }
}

/**
 * Get Audit Logs with filtering and pagination
 */
async function getAuditLogs({ workspaceId, user, action, search, limit = 100 }) {
  try {
    let sql = `SELECT * FROM audit_logs WHERE 1=1`;
    const params = [];

    if (workspaceId) {
      sql += ` AND workspace_id = ?`;
      params.push(workspaceId);
    }

    if (user) {
      sql += ` AND (user_name LIKE ? OR user_email LIKE ? OR user_id = ?)`;
      const uPattern = `%${user}%`;
      params.push(uPattern, uPattern, user);
    }

    if (action && action !== 'All') {
      sql += ` AND action = ?`;
      params.push(action);
    }

    if (search) {
      sql += ` AND (details LIKE ? OR target_id LIKE ? OR user_name LIKE ?)`;
      const sPattern = `%${search}%`;
      params.push(sPattern, sPattern, sPattern);
    }

    sql += ` ORDER BY id DESC LIMIT ?`;
    params.push(limit);

    return await getAll(sql, params);
  } catch (err) {
    console.error('[FETCH AUDIT LOGS ERROR]', err.message);
    return [];
  }
}

/**
 * Get Activity History for a specific lead
 */
async function getLeadActivity(leadId, workspaceId) {
  try {
    const sql = `
      SELECT * FROM audit_logs 
      WHERE (target_id = ? OR details LIKE ?)
      ORDER BY id DESC LIMIT 50
    `;
    const pattern = `%${leadId}%`;
    return await getAll(sql, [leadId, pattern]);
  } catch (err) {
    console.error('[FETCH LEAD ACTIVITY ERROR]', err.message);
    return [];
  }
}

module.exports = {
  logAuditEvent,
  getAuditLogs,
  getLeadActivity
};
