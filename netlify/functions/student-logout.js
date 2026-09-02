const { getAuth, json } = require('./utils/auth');
const { releaseStudentSession } = require('./utils/student-session');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
  const auth = getAuth(event);
  if (!auth || auth.role !== 'student') return json(200, { ok: true });
  try {
    await releaseStudentSession(auth.student_id, auth.session_id);
    return json(200, { ok: true });
  } catch (e) {
    return json(500, { error: 'Could not end student session' });
  }
};
