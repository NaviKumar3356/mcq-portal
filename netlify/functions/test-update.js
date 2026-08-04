const supabase = require('./utils/db');
const { getAuth, json } = require('./utils/auth');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  const auth = getAuth(event);
  if (!auth || auth.role !== 'admin') return json(401, { error: 'Not authorized' });

  try {
    const { test_id, status, results_published } = JSON.parse(event.body || '{}');
    if (!test_id) return json(400, { error: 'test_id is required' });

    const patch = {};
    if (status) patch.status = status; // 'draft' | 'published' | 'closed'
    if (typeof results_published === 'boolean') patch.results_published = results_published;

    const { error } = await supabase.from('tests').update(patch).eq('id', test_id);
    if (error) throw error;

    return json(200, { ok: true });
  } catch (e) {
    return json(500, { error: e.message });
  }
};
