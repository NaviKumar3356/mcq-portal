const supabase = require('./utils/db');
const { getAuth, json } = require('./utils/auth');

// Once a result is published, a student can now review their FULL paper —
// their answer next to the correct one for every MCQ, and their own
// submitted text/file/code for written/upload/practical questions — so
// they can actually learn from mistakes before the next test. Before this,
// only marks + remark were shown, with no way to see what went wrong.
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
      .select(
        'question_id, mcq_selected, written_text, file_path, marks_awarded, teacher_remark, ' +
        'questions(question_text, marks, type, options, correct_option, order_index)'
      )
      .eq('submission_id', submission.id)
      .order('questions(order_index)', { ascending: true });

    for (const a of answers || []) {
      if (a.file_path) {
        const { data } = await supabase.storage.from('answer-sheets').createSignedUrl(a.file_path, 3600);
        a.file_url = data?.signedUrl || null;
      }
    }

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
