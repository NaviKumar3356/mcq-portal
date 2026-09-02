const supabase = require('./utils/db');
const { getAuth, json } = require('./utils/auth');
const { requireStudentSession } = require('./utils/student-session');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  const auth = await requireStudentSession(event);
  if (!auth) return json(401, { error: 'Your student session has expired or was signed out.' });

  try {
    const { photo_path } = JSON.parse(event.body || '{}');
    if (!photo_path) return json(400, { error: 'photo_path is required' });
    if (!String(photo_path).startsWith(`${auth.student_id}-`)) return json(403, { error: 'Invalid student photo path' });

    const { error } = await supabase.from('students').update({ photo_path }).eq('id', auth.student_id);
    if (error) throw error;

    return json(200, { ok: true });
  } catch (e) {
    return json(500, { error: e.message });
  }
};
