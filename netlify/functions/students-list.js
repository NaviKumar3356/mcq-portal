const supabase = require('./utils/db');
const { requireRole, json } = require('./utils/auth');

exports.handler = async (event) => {
  const auth = requireRole(event, ['teacher', 'super_admin']);
  if (!auth) return json(401, { error: 'Not authorized' });

  try {
    const { class: klass, q } = event.queryStringParameters || {};

    let query = supabase
      .from('students')
      .select('id, srno, roll_number, name, class, section, dob, photo_path, created_at')
      .order('class', { ascending: true })
      .order('srno', { ascending: true, nullsFirst: false })
      .order('roll_number', { ascending: true });

    if (auth.role === 'teacher') {
      const allowed = auth.classes || [];
      if (allowed.length === 0) return json(200, { students: [] });
      query = query.in('class', allowed);
    }
    if (klass) query = query.eq('class', klass);
    if (q) {
      const safeQ = String(q).replace(/[\\,%()*]/g, '\\$&');
      query = query.or(`name.ilike.%${safeQ}%,roll_number.ilike.%${safeQ}%`);
    }

    const { data: students, error } = await query;
    if (error) throw error;

    return json(200, { students });
  } catch (e) {
    return json(500, { error: e.message });
  }
};
