const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET;

function sign(payload, expiresIn = '12h') {
  return jwt.sign(payload, SECRET, { expiresIn });
}

function verify(token) {
  try {
    return jwt.verify(token, SECRET);
  } catch (e) {
    return null;
  }
}

// Pulls "Authorization: Bearer <token>" out of a Netlify function event
// and returns the decoded payload, or null if missing/invalid/expired.
function getAuth(event) {
  const header = event.headers.authorization || event.headers.Authorization;
  if (!header) return null;
  const token = header.replace(/^Bearer\s+/i, '');
  return verify(token);
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

module.exports = { sign, verify, getAuth, json };
