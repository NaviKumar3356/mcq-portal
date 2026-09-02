const supabase = require('./utils/db');
const { requireRole, json } = require('./utils/auth');

function teacherCanAccessTest(auth, test) {
  if (auth.role !== 'teacher') return true;
  return (auth.classes || []).includes(test.class) && (auth.subjects || []).includes(test.subject);
}

exports.handler = async (event) => {
  const auth = requireRole(event, ['teacher', 'super_admin']);
  if (!auth) return json(401, { error: 'Not authorized' });

  const submissionId = event.queryStringParameters?.submission_id;
  if (!submissionId) return json(400, { error: 'submission_id is required' });

  try {
    const { data: submission, error: sErr } = await supabase
      .from('submissions')
      .select(
        'id, status, total_marks_awarded, submitted_at, tab_switch_count, flagged_reason, proctor_log, ' +
        'students(name, roll_number, class), test_id, attempt_type, make_up_of_test_id, merged_from_test_id'
      )
      .eq('id', submissionId)
      .single();
    if (sErr) throw sErr;

    const { data: test, error: testErr } = await supabase
      .from('tests')
      .select('id, class, subject, title')
      .eq('id', submission.test_id)
      .maybeSingle();
    if (testErr) throw testErr;
    if (!test) return json(404, { error: 'Test not found' });

    if (!teacherCanAccessTest(auth, test)) {
      return json(403, { error: 'You are not assigned to this class/subject' });
    }
    submission.tests = { class: test.class, subject: test.subject, title: test.title };

    const { data: answers, error: aErr } = await supabase
      .from('answers')
      .select(
        'id, question_id, mcq_selected, written_text, file_path, marks_awarded, teacher_remark, variant_snapshot, ' +
        'questions(question_text, type, options, correct_option, marks, order_index, language, variants, reference_answer, resource_path, resource_name, resource_mime)'
      )
      .eq('submission_id', submissionId)
      .order('questions(order_index)', { ascending: true });
    if (aErr) throw aErr;

    for (const a of answers) {
      if (a.questions?.resource_path) {
        const { data } = await supabase.storage.from('question-resources').createSignedUrl(a.questions.resource_path, 3600);
        a.questions.resource_url = data?.signedUrl || null;
      }
      if (a.file_path) {
        const { data } = await supabase.storage.from('answer-sheets').createSignedUrl(a.file_path, 3600);
        a.file_url = data?.signedUrl || null;
      }
    }

    return json(200, { submission, answers });
  } catch (e) {
    return json(500, { error: e.message });
  }
};
