const supabase = require('./utils/db');
const { requireRole, json } = require('./utils/auth');

function teacherCanAccessTest(auth, test) {
  if (auth.role !== 'teacher') return true;
  return (auth.classes || []).includes(test.class) && (auth.subjects || []).includes(test.subject);
}

// GET: fetch a paper's questions (with current correct answers) so the
// teacher can review/finalize the answer key.
// POST: save correct_option + marks per question and mark the key finalized.
exports.handler = async (event) => {
  const auth = requireRole(event, ['teacher', 'super_admin']);
  if (!auth) return json(401, { error: 'Not authorized' });

  try {
    if (event.httpMethod === 'GET') {
      const testId = event.queryStringParameters?.test_id;
      if (!testId) return json(400, { error: 'test_id is required' });

      const { data: test, error: tErr } = await supabase.from('tests').select('*').eq('id', testId).single();
      if (tErr || !test) return json(404, { error: 'Test not found' });
      if (!teacherCanAccessTest(auth, test)) return json(403, { error: 'This paper is outside your assigned class/subject' });

      const { data: questions, error: qErr } = await supabase
        .from('questions')
        .select('*')
        .eq('test_id', testId)
        .order('order_index', { ascending: true });
      if (qErr) throw qErr;

      return json(200, { test, questions });
    }

    if (event.httpMethod === 'POST') {
      const { test_id, questions } = JSON.parse(event.body || '{}');
      if (!test_id || !Array.isArray(questions)) {
        return json(400, { error: 'test_id and questions[] are required' });
      }

      const { data: test } = await supabase.from('tests').select('class, subject').eq('id', test_id).maybeSingle();
      if (!test) return json(404, { error: 'Test not found' });
      if (!teacherCanAccessTest(auth, test)) return json(403, { error: 'This paper is outside your assigned class/subject' });

      for (const q of questions) {
        const patch = { marks: q.marks };
        if (q.type === 'mcq') patch.correct_option = q.correct_option;
        const { error } = await supabase.from('questions').update(patch).eq('id', q.id);
        if (error) throw error;
      }

      const total_marks = questions.reduce((sum, q) => sum + Number(q.marks || 0), 0);
      await supabase.from('tests').update({ total_marks, answer_key_set: true }).eq('id', test_id);

      return json(200, { ok: true });
    }

    return json(405, { error: 'Method not allowed' });
  } catch (e) {
    return json(500, { error: e.message });
  }
};
