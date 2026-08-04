const { sign, json } = require('./utils/auth');

// Simple single-admin login. Credentials live only in Netlify env vars
// (ADMIN_USERNAME / ADMIN_PASSWORD) — never in the code or the repo.
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  try {
    const { username, password } = JSON.parse(event.body || '{}');

    if (
      username === process.env.ADMIN_USERNAME &&
      password === process.env.ADMIN_PASSWORD
    ) {
      const token = sign({ role: 'admin' });
      return json(200, { token });
    }

    return json(401, { error: 'Invalid username or password' });
  } catch (e) {
    return json(500, { error: e.message });
  }
};
