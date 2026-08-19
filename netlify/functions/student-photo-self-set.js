const supabase = require('./utils/db');
const { getAuth, json } = require('./utils/auth');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  const auth = getAuth(event);
  if (!auth || auth.role !== 'student') return json(401, { error: 'Not logged in' });

  try {
    const { photo_path } = JSON.parse(event.body || '{}');
    if (!photo_path) return json(400, { error: 'photo_path is required' });

    const { error } = await supabase.from('students').update({ photo_path }).eq('id', auth.student_id);
    if (error) throw error;

    return json(200, { ok: true });
  } catch (e) {
    return json(500, { error: e.message });
  }
};
