const supabase = require('./utils/db');
const { requireRole, json } = require('./utils/auth');

function teacherCanAccessTest(auth, test) {
  if (auth.role !== 'teacher') return true;
  return (auth.classes || []).includes(test.class) && (auth.subjects || []).includes(test.subject);
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  const auth = requireRole(event, ['teacher', 'super_admin']);
  if (!auth) return json(401, { error: 'Not authorized' });

  try {
    const { submission_id, grades } = JSON.parse(event.body || '{}');
    // grades: [{ answer_id, marks_awarded, teacher_remark }] — teacher_remark is optional
    // for every question type, including MCQ (auto-scored answers can still get a remark).
    if (!submission_id || !Array.isArray(grades)) {
      return json(400, { error: 'submission_id and grades[] are required' });
    }

    const { data: submission } = await supabase
      .from('submissions')
      .select('id, tests(class, subject)')
      .eq('id', submission_id)
      .maybeSingle();
    if (!submission) return json(404, { error: 'Submission not found' });
    if (!teacherCanAccessTest(auth, submission.tests)) {
      return json(403, { error: 'You are not assigned to this class/subject' });
    }

    for (const g of grades) {
      const { error } = await supabase
        .from('answers')
        .update({ marks_awarded: g.marks_awarded, teacher_remark: g.teacher_remark || null })
        .eq('id', g.answer_id);
      if (error) throw error;
    }

    const { data: allAnswers, error: aErr } = await supabase
      .from('answers')
      .select('marks_awarded')
      .eq('submission_id', submission_id);
    if (aErr) throw aErr;

    const total = allAnswers.reduce((sum, a) => sum + Number(a.marks_awarded || 0), 0);

    const { error: sErr } = await supabase
      .from('submissions')
      .update({ status: 'graded', total_marks_awarded: total })
      .eq('id', submission_id);
    if (sErr) throw sErr;

    return json(200, { ok: true, total_marks_awarded: total });
  } catch (e) {
    return json(500, { error: e.message });
  }
};
