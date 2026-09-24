const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET;

function sign(payload, expiresIn = '12h') {
  return jwt.sign(payload, SECRET, { expiresIn });
}

function verify(token) {
  try {
    const auth = jwt.verify(token, SECRET);
    if (auth?.e2e && process.env.CONTEXT === 'production') return null;
    return auth;
  } catch (e) {
    return null;
  }
}

function getAuth(event) {
  const header = event.headers.authorization || event.headers.Authorization;
  if (!header) return null;
  const token = header.replace(/^Bearer\s+/i, '');
  return verify(token);
}

function json(statusCode, body) {
  const safeBody = statusCode >= 500 && (process.env.NODE_ENV === 'production' || process.env.CONTEXT === 'production')
    ? { error: 'Internal server error' }
    : body;
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'private, no-store' },
    body: JSON.stringify(safeBody),
  };
}

function requireRole(event, roles) {
  const auth = getAuth(event);
  if (!auth || !roles.includes(auth.role)) return null;
  return auth;
}

module.exports = { sign, verify, getAuth, json, requireRole };
