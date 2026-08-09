const supabase = require('./utils/db');
const { requireRole, json } = require('./utils/auth');

exports.handler = async (event) => {
  const auth = requireRole(event, ['teacher', 'super_admin']);
  if (!auth) return json(401, { error: 'Not authorized' });

  try {
    let query = supabase.from('tests').select('*').order('created_at', { ascending: false });

    if (auth.role === 'teacher') {
      const classes = auth.classes || [];
      const subjects = auth.subjects || [];
      if (classes.length === 0 || subjects.length === 0) return json(200, { tests: [] });
      query = query.in('class', classes).in('subject', subjects);
    }

    const { data: tests, error } = await query;
    if (error) throw error;

    return json(200, { tests });
  } catch (e) {
    return json(500, { error: e.message });
  }
};
