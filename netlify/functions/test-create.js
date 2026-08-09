const supabase = require('./utils/db');
const { requireRole, json } = require('./utils/auth');
const { CLASSES, SUBJECTS } = require('./utils/constants');

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
    if (!CLASSES.includes(className)) return json(400, { error: 'Invalid class' });
    if (!SUBJECTS.includes(subject)) return json(400, { error: 'Invalid subject' });

    if (auth.role === 'teacher') {
      if (!(auth.classes || []).includes(className) || !(auth.subjects || []).includes(subject)) {
        return json(403, { error: 'You are not assigned to that class/subject' });
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
