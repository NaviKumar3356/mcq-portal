const supabase = require('./utils/db');
const { requireRole, json } = require('./utils/auth');
const { getCatalog } = require('./utils/catalog');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  const auth = requireRole(event, ['teacher', 'super_admin']);
  if (!auth) return json(401, { error: 'Not authorized' });

  try {
    const {
      title, subject, class: className, duration_minutes,
      start_at, end_at, questions, status,
      shuffle_questions, shuffle_options, shuffle_group_size,
    } = JSON.parse(event.body || '{}');

    if (!title || !className || !subject || !Array.isArray(questions) || questions.length === 0) {
      return json(400, { error: 'title, class, subject, and at least one question are required' });
    }
    const catalog = await getCatalog();
    if (!catalog.classes.includes(className)) return json(400, { error: 'Invalid class' });
    if (!catalog.subjects.includes(subject)) return json(400, { error: 'Invalid subject' });

    if (auth.role === 'teacher') {
      if (!(auth.classes || []).includes(className) || !(auth.subjects || []).includes(subject)) {
        return json(403, { error: 'You are not assigned to that class/subject' });
      }
    }

    for (const q of questions) {
      if (q.type === 'practical' && (!Array.isArray(q.variants) || q.variants.length === 0 || !q.variants[0].question_text)) {
        return json(400, { error: 'Every practical question needs at least one variant with a problem statement' });
      }
    }

    const total_marks = questions.reduce((sum, q) => sum + Number(q.marks || 0), 0);
    const allMcqHaveAnswers = questions.every(
      (q) => q.type !== 'mcq' || (q.correct_option !== undefined && q.correct_option !== null)
    );

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
        created_by: auth.role === 'teacher' ? auth.teacher_id : null,
        answer_key_set: allMcqHaveAnswers,
        shuffle_questions: !!shuffle_questions,
        shuffle_options: !!shuffle_options,
        shuffle_group_size: Math.max(1, Number(shuffle_group_size) || 1),
      })
      .select()
      .single();
    if (tErr) throw tErr;

    const qRows = questions.map((q, i) => ({
      test_id: test.id,
      order_index: i,
      type: q.type, // 'mcq' | 'written' | 'upload' | 'practical'
      question_text: q.question_text,
      options: q.type === 'mcq' ? q.options : null,
      correct_option: q.type === 'mcq' ? q.correct_option : null,
      marks: q.marks || 1,
      language: q.type === 'practical' ? q.language : null,
      variants: q.type === 'practical' ? q.variants : null,
      reference_answer: q.reference_answer || null,
      resource_path: q.resource_path || null,
      resource_name: q.resource_name || null,
      resource_mime: q.resource_mime || null,
    }));

    const { error: qErr } = await supabase.from('questions').insert(qRows);
    if (qErr) throw qErr;

    return json(200, { test_id: test.id, ok: true });
  } catch (e) {
    return json(500, { error: e.message });
  }
};
