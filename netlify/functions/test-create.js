const supabase = require('./utils/db');
const { getAuth, json } = require('./utils/auth');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  const auth = getAuth(event);
  if (!auth || auth.role !== 'admin') return json(401, { error: 'Not authorized' });

  try {
    const {
      title, subject, class: className, duration_minutes,
      start_at, end_at, questions, status,
    } = JSON.parse(event.body || '{}');

    if (!title || !className || !Array.isArray(questions) || questions.length === 0) {
      return json(400, { error: 'title, class, and at least one question are required' });
    }

    const total_marks = questions.reduce((sum, q) => sum + Number(q.marks || 0), 0);

    const { data: test, error: tErr } = await supabase
      .from('tests')
      .insert({
        title,
        subject,
        class: className,
        duration_minutes: duration_minutes || 30,
        start_at: start_at || null,
        end_at: end_at || null,
        total_marks,
        status: status || 'draft',
      })
      .select()
      .single();
    if (tErr) throw tErr;

    const qRows = questions.map((q, i) => ({
      test_id: test.id,
      order_index: i,
      type: q.type, // 'mcq' | 'written' | 'upload'
      question_text: q.question_text,
      options: q.type === 'mcq' ? q.options : null,
      correct_option: q.type === 'mcq' ? q.correct_option : null,
      marks: q.marks || 1,
    }));

    const { error: qErr } = await supabase.from('questions').insert(qRows);
    if (qErr) throw qErr;

    return json(200, { test_id: test.id, ok: true });
  } catch (e) {
    return json(500, { error: e.message });
  }
};
