const jwt = require('jsonwebtoken');
const User = require('../models/User');

const parseCookies = (cookieHeader) => {
  const cookies = {};
  if (!cookieHeader) return cookies;
  cookieHeader.split(';').forEach((pair) => {
    const idx = pair.indexOf('=');
    if (idx > -1) {
      const key = pair.slice(0, idx).trim();
      const val = decodeURIComponent(pair.slice(idx + 1).trim());
      cookies[key] = val;
    }
  });
  return cookies;
};

const extractCandidateTokens = (req) => {
  const tokens = [];
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    const bearer = req.headers.authorization.split(' ')[1];
    if (bearer && bearer !== 'null' && bearer !== 'undefined') {
      tokens.push(bearer);
    }
  }
  const cookies = parseCookies(req.headers.cookie);
  if (cookies.cr_token && !tokens.includes(cookies.cr_token)) {
    tokens.push(cookies.cr_token);
  }
  return tokens;
};

const extractToken = (req) => {
  const tokens = extractCandidateTokens(req);
  return tokens[0] || null;
};

// Protect routes - verify JWT token from Authorization header or HttpOnly cookie
const protect = async (req, res, next) => {
  const candidates = extractCandidateTokens(req);

  if (candidates.length === 0) {
    return res.status(401).json({ message: 'Not authorized, authentication required' });
  }

  let lastErrorStatus = 401;
  let lastErrorMessage = 'Not authorized, invalid or expired token';

  for (const token of candidates) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password').populate('department', 'name code');

      if (!user) {
        lastErrorStatus = 401;
        lastErrorMessage = 'Not authorized, user not found';
        continue;
      }

      if (user.isActive === false) {
        lastErrorStatus = 403;
        lastErrorMessage = 'Account is deactivated';
        continue;
      }

      if (decoded.tokenVersion !== undefined && decoded.tokenVersion !== (user.tokenVersion || 0)) {
        lastErrorStatus = 401;
        lastErrorMessage = 'Session expired or logged out. Please sign in again.';
        continue;
      }

      user.role = User.normalizeRole(user.role);
      req.user = user;
      return next();
    } catch (error) {
      lastErrorStatus = 401;
      lastErrorMessage = 'Not authorized, invalid or expired token';
    }
  }

  return res.status(lastErrorStatus).json({ message: lastErrorMessage });
};

// Role-based authorization with canonical normalization
const authorize = (...roles) => {
  const expandedRoles = new Set();
  roles.forEach((r) => {
    const norm = User.normalizeRole(r);
    expandedRoles.add(norm);
    // Super Admin can access System Admin routes
    if (norm === 'SYSTEM_ADMIN') {
      expandedRoles.add('SUPER_ADMIN');
    }
  });

  return (req, res, next) => {
    const userRole = User.normalizeRole(req.user?.role);
    if (!req.user || !expandedRoles.has(userRole)) {
      return res.status(403).json({
        message: `Role '${userRole}' is not authorized to access this resource`
      });
    }
    next();
  };
};

module.exports = { protect, authorize, extractToken, extractCandidateTokens, parseCookies };
