const supabase = require('./utils/db');
const { getAuth, json } = require('./utils/auth');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  const auth = getAuth(event);
  if (!auth || auth.role !== 'admin') return json(401, { error: 'Not authorized' });

  try {
    const { submission_id, grades } = JSON.parse(event.body || '{}');
    // grades: [{ answer_id, marks_awarded, teacher_remark }]
    if (!submission_id || !Array.isArray(grades)) {
      return json(400, { error: 'submission_id and grades[] are required' });
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
