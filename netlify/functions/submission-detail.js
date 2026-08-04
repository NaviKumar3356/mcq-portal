const supabase = require('./utils/db');
const { getAuth, json } = require('./utils/auth');

exports.handler = async (event) => {
  const auth = getAuth(event);
  if (!auth || auth.role !== 'admin') return json(401, { error: 'Not authorized' });

  const submissionId = event.queryStringParameters?.submission_id;
  if (!submissionId) return json(400, { error: 'submission_id is required' });

  try {
    const { data: submission, error: sErr } = await supabase
      .from('submissions')
      .select('id, status, total_marks_awarded, submitted_at, students(name, roll_number, class), test_id')
      .eq('id', submissionId)
      .single();
    if (sErr) throw sErr;

    const { data: answers, error: aErr } = await supabase
      .from('answers')
      .select('id, question_id, mcq_selected, written_text, file_path, marks_awarded, teacher_remark, questions(question_text, type, options, correct_option, marks, order_index)')
      .eq('submission_id', submissionId)
      .order('questions(order_index)', { ascending: true });
    if (aErr) throw aErr;

    // Turn stored file_path into a temporary signed view URL (valid 1 hour)
    for (const a of answers) {
      if (a.file_path) {
        const { data } = await supabase.storage
          .from('answer-sheets')
          .createSignedUrl(a.file_path, 3600);
        a.file_url = data?.signedUrl || null;
      }
    }

    return json(200, { submission, answers });
  } catch (e) {
    return json(500, { error: e.message });
  }
};
