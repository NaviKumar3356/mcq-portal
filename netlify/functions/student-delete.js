const supabase = require('./utils/db');
const { requireRole, json } = require('./utils/auth');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  const auth = requireRole(event, ['teacher', 'super_admin']);
  if (!auth) return json(401, { error: 'Not authorized' });

  try {
    const { student_id } = JSON.parse(event.body || '{}');
    if (!student_id) return json(400, { error: 'student_id is required' });

    if (auth.role === 'teacher') {
      const { data: student } = await supabase.from('students').select('class').eq('id', student_id).maybeSingle();
      if (!student) return json(404, { error: 'Student not found' });
      if (!(auth.classes || []).includes(student.class)) {
        return json(403, { error: 'You are not assigned to that class' });
      }
    }

    // Cascades to their submissions/answers automatically (foreign keys use ON DELETE CASCADE).
    const { error } = await supabase.from('students').delete().eq('id', student_id);
    if (error) throw error;

    return json(200, { ok: true });
  } catch (e) {
    return json(500, { error: e.message });
  }
};
