const supabase = require('./utils/db');
const { requireRole, json } = require('./utils/auth');
const { gradeHtml } = require('./utils/practical-grader');

function teacherCanAccessTest(auth, test) {
  if (auth.role !== 'teacher') return true;
  return (auth.classes || []).includes(test.class) && (auth.subjects || []).includes(test.subject);
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
  const auth = requireRole(event, ['teacher', 'super_admin']);
  if (!auth) return json(401, { error: 'Not authorized' });

  try {
    const { test_id, question_id, overwrite_remarks = false } = JSON.parse(event.body || '{}');
    if (!test_id || !question_id) return json(400, { error: 'test_id and question_id are required' });

    const { data: test, error: testErr } = await supabase.from('tests').select('id,class,subject').eq('id', test_id).maybeSingle();
    if (testErr) throw testErr;
    if (!test) return json(404, { error: 'Test not found' });
    if (!teacherCanAccessTest(auth, test)) return json(403, { error: 'Not authorized for this paper' });

    const { data: q, error: qErr } = await supabase
      .from('questions')
      .select('id,test_id,type,language,reference_answer,marks')
      .eq('id', question_id).eq('test_id', test_id).maybeSingle();
    if (qErr) throw qErr;
    if (!q) return json(404, { error: 'Question not found' });
    if (q.type !== 'practical' || String(q.language || '').toLowerCase() !== 'html') {
      return json(400, { error: 'Assisted auto-grading is currently available for HTML practical questions only.' });
    }
    if (!q.reference_answer?.trim()) return json(400, { error: 'Add a teacher reference answer before auto-grading.' });

    const { data: answers, error: aErr } = await supabase
      .from('answers')
      .select('id,submission_id,written_text,marks_awarded,teacher_remark')
      .eq('question_id', question_id);
    if (aErr) throw aErr;

    let updated = 0;
    let total = 0;
    for (const a of answers || []) {
      const result = gradeHtml(a.written_text || '', q.reference_answer, q.marks);
      const patch = { marks_awarded: result.marks_awarded };
      if (overwrite_remarks || !a.teacher_remark) {
        patch.teacher_remark = `Assisted HTML grading: ${result.matched}/${result.total} reference checks matched (${result.percent}%). Please review and adjust if needed.`;
      }
      const { error } = await supabase.from('answers').update(patch).eq('id', a.id);
      if (error) throw error;
      updated++;
      total += Number(result.marks_awarded || 0);
    }

    // Refresh submission totals where every answer now has a mark.
    const submissionIds = new Set((answers || []).map((a) => a.submission_id).filter(Boolean));
    for (const submissionId of submissionIds) {
      const { data: all } = await supabase.from('answers').select('marks_awarded').eq('submission_id', submissionId);
      if ((all || []).every((x) => x.marks_awarded !== null)) {
        const sum = (all || []).reduce((n, x) => n + Number(x.marks_awarded || 0), 0);
        await supabase.from('submissions').update({ status: 'graded', total_marks_awarded: sum }).eq('id', submissionId);
      }
    }

    return json(200, { ok: true, updated, total_marks_awarded_for_question: total });
  } catch (e) {
    return json(500, { error: e.message });
  }
};
