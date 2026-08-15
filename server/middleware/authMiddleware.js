const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'autolead_saas_jwt_secret_key_2026';

function authenticateToken(req, res, next) {
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
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: 'Session expired or invalid token. Please log in again.'
    });
  }
}

module.exports = {
  authenticateToken,
  JWT_SECRET
};
