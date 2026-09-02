const supabase = require('./utils/db');
const { requireRole, json } = require('./utils/auth');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  const auth = requireRole(event, ['teacher', 'super_admin']);
  if (!auth) return json(401, { error: 'Not authorized' });

  try {
    const {
      test_id, status, results_published,
      shuffle_questions, shuffle_options, shuffle_group_size,
    } = JSON.parse(event.body || '{}');
    if (!test_id) return json(400, { error: 'test_id is required' });

    const { data: test } = await supabase.from('tests').select('class, subject').eq('id', test_id).maybeSingle();
    if (!test) return json(404, { error: 'Test not found' });
    if (auth.role === 'teacher' && (!(auth.classes || []).includes(test.class) || !(auth.subjects || []).includes(test.subject))) {
      return json(403, { error: 'You are not assigned to this class/subject' });
    }

    const patch = {};
    if (status) {
      if (!['draft','published','closed'].includes(status)) return json(400, { error: 'Invalid test status' });
      patch.status = status;
    }
    if (typeof results_published === 'boolean') patch.results_published = results_published;
    if (typeof shuffle_questions === 'boolean') patch.shuffle_questions = shuffle_questions;
    if (typeof shuffle_options === 'boolean') patch.shuffle_options = shuffle_options;
    if (shuffle_group_size !== undefined) patch.shuffle_group_size = Math.max(1, Number(shuffle_group_size) || 1);

    const { error } = await supabase.from('tests').update(patch).eq('id', test_id);
    if (error) throw error;

    return json(200, { ok: true });
  } catch (e) {
    return json(500, { error: e.message });
  }
};
