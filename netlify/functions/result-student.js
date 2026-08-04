const supabase = require('./utils/db');
const { getAuth, json } = require('./utils/auth');

exports.handler = async (event) => {
  const auth = getAuth(event);
  if (!auth || auth.role !== 'student') return json(401, { error: 'Not logged in' });

  const testId = event.queryStringParameters?.test_id;
  if (!testId) return json(400, { error: 'test_id is required' });

  try {
    const { data: test } = await supabase
      .from('tests')
      .select('id, title, total_marks, results_published')
      .eq('id', testId)
      .single();

    if (!test || !test.results_published) {
      return json(403, { error: 'Result has not been published yet' });
    }

    const { data: submission } = await supabase
      .from('submissions')
      .select('id, status, total_marks_awarded, submitted_at')
      .eq('test_id', testId)
      .eq('student_id', auth.student_id)
      .maybeSingle();

    if (!submission) return json(404, { error: 'No submission found for this test' });

    const { data: answers } = await supabase
      .from('answers')
      .select('question_id, marks_awarded, teacher_remark, questions(question_text, marks, type)')
      .eq('submission_id', submission.id);

    return json(200, {
      test_title: test.title,
      total_marks: test.total_marks,
      total_marks_awarded: submission.total_marks_awarded,
      submitted_at: submission.submitted_at,
      breakdown: answers,
    });
  } catch (e) {
    return json(500, { error: e.message });
  }
};
