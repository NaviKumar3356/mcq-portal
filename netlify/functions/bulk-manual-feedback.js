const supabase = require('./utils/db');
const { requireRole, json } = require('./utils/auth');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
  const auth = requireRole(event, ['teacher', 'super_admin']);
  if (!auth) return json(401, { error: 'Not authorized' });
  try {
    const { test_id, question_id, teacher_remark, overwrite = false } = JSON.parse(event.body || '{}');
    if (!test_id || !question_id) return json(400, { error: 'test_id and question_id are required' });
    const { data: test } = await supabase.from('tests').select('id,class,subject').eq('id', test_id).maybeSingle();
    if (!test) return json(404, { error: 'Test not found' });
    if (auth.role === 'teacher' && (!(auth.classes || []).includes(test.class) || !(auth.subjects || []).includes(test.subject))) return json(403, { error: 'Not authorized for this paper' });
    const { data: q } = await supabase.from('questions').select('id,test_id,type').eq('id', question_id).eq('test_id', test_id).maybeSingle();
    if (!q) return json(404, { error: 'Question not found' });
    if (q.type === 'mcq') return json(400, { error: 'Bulk feedback is intended for manual questions only' });
    const remark = String(teacher_remark || '').trim();
    if (!remark) return json(400, { error: 'Enter the correct/reference answer first' });
    let query = supabase.from('answers').update({ teacher_remark: remark }).eq('question_id', question_id);
    if (!overwrite) query = query.is('teacher_remark', null);
    const { data, error } = await query.select('id');
    if (error) throw error;
    return json(200, { ok: true, updated: data?.length || 0, overwrite: !!overwrite });
  } catch (e) { return json(500, { error: e.message }); }
};
