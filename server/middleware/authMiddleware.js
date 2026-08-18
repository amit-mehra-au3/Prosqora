const jwt = require('jsonwebtoken');
const { getRow } = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'autolead_saas_jwt_secret_key_2026';

async function authenticateToken(req, res, next) {
  let token = null;

  // 1. Check Cookies
  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  // 2. Check Authorization Header
  if (!token && req.headers.authorization) {
    const parts = req.headers.authorization.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      token = parts[1];
    }
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. Please login to access your CRM workspace.'
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // Live Database Disabled Check & Fresh Role Resolution
    if (decoded.user_id) {
      const dbUser = await getRow(`SELECT role, status, workspace_id, company_name FROM users WHERE user_id = ?`, [decoded.user_id]);
      if (dbUser) {
        if (dbUser.status === 'disabled' || dbUser.status === 'deleted') {
          return res.status(403).json({
            success: false,
            error: 'Your account or workspace is no longer active. Access revoked.'
          });
        }

        const workspaceOwnerId = dbUser.workspace_id || dbUser.user_id;
        if (workspaceOwnerId !== dbUser.user_id) {
          const owner = await getRow(`SELECT status FROM users WHERE user_id = ?`, [workspaceOwnerId]);
          if (owner && (owner.status === 'disabled' || owner.status === 'deleted')) {
            return res.status(403).json({
              success: false,
              error: 'Your workspace is no longer active. Access revoked.'
            });
          }
        }

        decoded.role = dbUser.role || decoded.role || 'user';
        decoded.status = dbUser.status || 'active';
        decoded.workspace_id = workspaceOwnerId;
        decoded.company_name = dbUser.company_name || decoded.company_name || '';
      }
    }

    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: 'Session expired or invalid token. Please log in again.'
    });
  }
}

/**
 * Reusable Role Authorization Helper
 * Conceptually: requireRole('admin')
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }

    const userRole = (req.user.role || 'user').toLowerCase();
    const normalizedAllowed = allowedRoles.map((r) => r.toLowerCase());

    // Super Admin inherits admin rights, but for super_admin-only routes, userRole must be super_admin
    if (userRole === 'super_admin' || normalizedAllowed.includes(userRole)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      error: 'Forbidden: You do not have permission to perform this action or access this resource.'
    });
  };
}

module.exports = {
  authenticateToken,
  requireRole,
  JWT_SECRET
};
