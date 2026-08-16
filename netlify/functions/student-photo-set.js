const supabase = require('./utils/db');
const { requireRole, json } = require('./utils/auth');

// Persists the photo_path onto the student's row once the browser has
// finished uploading directly to Storage using the signed URL from
// student-photo-upload-url.js. Kept as a separate step (rather than
// writing photo_path up front) so a failed/abandoned upload never leaves
// a student pointing at a file that doesn't exist.
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  const auth = requireRole(event, ['teacher', 'super_admin']);
  if (!auth) return json(401, { error: 'Not authorized' });

  try {
    const { student_id, photo_path } = JSON.parse(event.body || '{}');
    if (!student_id || !photo_path) return json(400, { error: 'student_id and photo_path are required' });

    if (auth.role === 'teacher') {
      const { data: student } = await supabase.from('students').select('class').eq('id', student_id).maybeSingle();
      if (!student) return json(404, { error: 'Student not found' });
      if (!(auth.classes || []).includes(student.class)) {
        return json(403, { error: 'You are not assigned to that class' });
      }
    }

    const { error } = await supabase.from('students').update({ photo_path }).eq('id', student_id);
    if (error) throw error;

    return json(200, { ok: true });
  } catch (e) {
    return json(500, { error: e.message });
  }
};
