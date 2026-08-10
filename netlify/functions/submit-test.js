const supabase = require('./utils/db');
const { getAuth, json } = require('./utils/auth');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  const auth = getAuth(event);
  if (!auth || auth.role !== 'student') return json(401, { error: 'Not logged in' });

  try {
    const { test_id, answers } = JSON.parse(event.body || '{}');
    if (!test_id || !Array.isArray(answers)) {
      return json(400, { error: 'test_id and answers[] are required' });
    }

    const { data: already } = await supabase
      .from('submissions')
      .select('id')
      .eq('test_id', test_id)
      .eq('student_id', auth.student_id)
      .maybeSingle();
    if (already) return json(403, { error: 'You have already submitted this test' });

    const { data: questions, error: qErr } = await supabase
      .from('questions')
      .select('id, type, correct_option, marks')
      .eq('test_id', test_id);
    if (qErr) throw qErr;
    const qMap = Object.fromEntries(questions.map((q) => [q.id, q]));

    const { data: submission, error: sErr } = await supabase
      .from('submissions')
      .insert({ test_id, student_id: auth.student_id, status: 'submitted' })
      .select()
      .single();
    if (sErr) throw sErr;

    let autoTotal = 0;
    let hasUngraded = false;

    const rows = answers.map((a) => {
      const q = qMap[a.question_id];
      let marks_awarded = null;

      if (q && q.type === 'mcq') {
        marks_awarded = a.mcq_selected === q.correct_option ? q.marks : 0;
        autoTotal += marks_awarded;
      } else {
        hasUngraded = true; // written / upload need manual grading
      }

      return {
        submission_id: submission.id,
        question_id: a.question_id,
        mcq_selected: a.mcq_selected ?? null,
        written_text: a.written_text ?? null,
        file_path: a.file_path ?? null,
        marks_awarded,
      };
    });

    const { error: aErr } = await supabase.from('answers').insert(rows);
    if (aErr) throw aErr;

    // If every question was MCQ, we can mark the submission fully graded now.
    await supabase
      .from('submissions')
      .update({
        status: hasUngraded ? 'submitted' : 'graded',
        total_marks_awarded: hasUngraded ? null : autoTotal,
      })
      .eq('id', submission.id);

    // Clear a one-time reopen pass, if this submission was made under one —
    // otherwise the student would appear "still open" on their dashboard.
    await supabase.from('test_reopens').delete().eq('test_id', test_id).eq('student_id', auth.student_id);

    return json(200, { submission_id: submission.id, ok: true });
  } catch (e) {
    return json(500, { error: e.message });
  }
};
