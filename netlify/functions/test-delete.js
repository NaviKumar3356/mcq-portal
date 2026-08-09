const supabase = require('./utils/db');
const { requireRole, json } = require('./utils/auth');

// Deletes a paper and (via ON DELETE CASCADE) all of its questions,
// submissions and answers/answer-copies. Used for the "delete class-wise /
// student-wise data" requirement at the paper level.
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  const auth = requireRole(event, ['teacher', 'super_admin']);
  if (!auth) return json(401, { error: 'Not authorized' });

  try {
    const { test_id } = JSON.parse(event.body || '{}');
    if (!test_id) return json(400, { error: 'test_id is required' });

    const { data: test } = await supabase.from('tests').select('class, subject').eq('id', test_id).maybeSingle();
    if (!test) return json(404, { error: 'Test not found' });
    if (auth.role === 'teacher' && (!(auth.classes || []).includes(test.class) || !(auth.subjects || []).includes(test.subject))) {
      return json(403, { error: 'You are not assigned to this class/subject' });
    }

    const { error } = await supabase.from('tests').delete().eq('id', test_id);
    if (error) throw error;

    return json(200, { ok: true });
  } catch (e) {
    return json(500, { error: e.message });
  }
};
