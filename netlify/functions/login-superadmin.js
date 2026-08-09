const { sign, json } = require('./utils/auth');

// The one super admin account. Credentials live only in Netlify env vars —
// never in the database or the repo. The super admin creates every teacher
// account from the Manage Teachers screen after logging in.
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  try {
    const { username, password } = JSON.parse(event.body || '{}');

    if (
      username === process.env.SUPER_ADMIN_USERNAME &&
      password === process.env.SUPER_ADMIN_PASSWORD
    ) {
      const token = sign({ role: 'super_admin' });
      return json(200, { token });
    }

    return json(401, { error: 'Invalid username or password' });
  } catch (e) {
    return json(500, { error: e.message });
  }
};
