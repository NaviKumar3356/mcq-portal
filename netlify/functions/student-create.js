const supabase = require('./utils/db');
const { requireRole, json } = require('./utils/auth');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  const auth = requireRole(event, ['teacher', 'super_admin']);
  if (!auth) return json(401, { error: 'Not authorized' });

  try {
    const { roll_number, name, class: klass, dob } = JSON.parse(event.body || '{}');
    if (!roll_number || !name || !klass || !dob) {
      return json(400, { error: 'roll_number, name, class and dob are all required' });
    }

    if (auth.role === 'teacher' && !(auth.classes || []).includes(klass)) {
      return json(403, { error: 'You are not assigned to that class' });
    }

    const { error } = await supabase.from('students').insert({
      roll_number: roll_number.trim(),
      name,
      class: klass,
      dob,
      added_by: auth.role === 'teacher' ? auth.teacher_id : null,
    });
    if (error) throw error;

    return json(200, { ok: true });
  } catch (e) {
    if (e.code === '23505') return json(409, { error: 'That roll number already exists in this class' });
    return json(500, { error: e.message });
  }
};
