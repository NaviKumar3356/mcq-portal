const { getAuth, json } = require('./utils/auth');
const { touchStudentSession } = require('./utils/student-session');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
  const auth = getAuth(event);
  if (!auth || auth.role !== 'student') return json(401, { error: 'Student session required' });

  try {
    const ok = await touchStudentSession(auth.student_id, auth.session_id);
    if (!ok) return json(401, { error: 'Your student session has expired or was signed out. Please log in again.' });
    return json(200, { ok: true });
  } catch (e) {
    return json(500, { error: 'Could not refresh student session' });
  }
};
