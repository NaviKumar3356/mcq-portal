const supabase = require('./utils/db');
const { requireRole, json } = require('./utils/auth');

function canAccess(auth, test) {
  if (auth.role !== 'teacher') return true;
  return (auth.classes || []).includes(test.class) && (auth.subjects || []).includes(test.subject);
}
function normalizeQuestion(q) {
  return JSON.stringify({
    type: q.type,
    text: String(q.question_text || '').trim(),
    marks: Number(q.marks || 0),
    options: q.type === 'mcq' ? (q.options || []) : null,
  });
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
  const auth = requireRole(event, ['teacher', 'super_admin']);
  if (!auth) return json(401, { error: 'Not authorized' });

  try {
    const { submission_id, destination_test_id } = JSON.parse(event.body || '{}');
    if (!submission_id || !destination_test_id) return json(400, { error: 'submission_id and destination_test_id are required' });

    const { data: sourceSub } = await supabase.from('submissions')
      .select('id, test_id, student_id, status, attempt_type').eq('id', submission_id).maybeSingle();
    if (!sourceSub) return json(404, { error: 'Submission not found' });
    if (sourceSub.test_id === destination_test_id) return json(400, { error: 'Source and destination tests are the same' });
    if (sourceSub.status === 'absent') return json(400, { error: 'An absent record cannot be merged. Assign a make-up attempt instead.' });

    const [{ data: sourceTest }, { data: destTest }] = await Promise.all([
      supabase.from('tests').select('id, title, class, subject, total_marks').eq('id', sourceSub.test_id).maybeSingle(),
      supabase.from('tests').select('id, title, class, subject, total_marks').eq('id', destination_test_id).maybeSingle(),
    ]);
    if (!sourceTest || !destTest) return json(404, { error: 'Source or destination test not found' });
    if (!canAccess(auth, sourceTest) || !canAccess(auth, destTest)) return json(403, { error: 'You are not assigned to one of these tests' });
    if (sourceTest.class !== destTest.class || sourceTest.subject !== destTest.subject) return json(400, { error: 'Tests must belong to the same class and subject' });

    const { data: existingDest } = await supabase.from('submissions').select('id, status').eq('test_id', destination_test_id).eq('student_id', sourceSub.student_id).maybeSingle();
    if (existingDest) return json(409, { error: 'This student already has an attempt in the destination test' });

    const [{ data: sourceQs }, { data: destQs }] = await Promise.all([
      supabase.from('questions').select('id, order_index, type, question_text, options, marks').eq('test_id', sourceSub.test_id).order('order_index'),
      supabase.from('questions').select('id, order_index, type, question_text, options, marks').eq('test_id', destination_test_id).order('order_index'),
    ]);
    if ((sourceQs || []).length !== (destQs || []).length) return json(400, { error: 'The two papers do not have the same number of questions, so they cannot be safely merged.' });
    for (let i = 0; i < sourceQs.length; i++) {
      if (normalizeQuestion(sourceQs[i]) !== normalizeQuestion(destQs[i])) {
        return json(400, { error: `Question ${i + 1} is different between the two papers. Only matching paper copies can be merged.` });
      }
    }

    const { data: answers, error: aErr } = await supabase.from('answers').select('id, question_id').eq('submission_id', submission_id);
    if (aErr) throw aErr;
    const map = new Map(sourceQs.map((q, i) => [q.id, destQs[i].id]));
    for (const a of answers || []) {
      const newQuestionId = map.get(a.question_id);
      if (!newQuestionId) return json(400, { error: 'An answer does not match the destination paper question set.' });
      const { error } = await supabase.from('answers').update({ question_id: newQuestionId }).eq('id', a.id);
      if (error) throw error;
    }

    const { error: updateErr } = await supabase.from('submissions').update({
      test_id: destination_test_id,
      attempt_type: 'make_up',
      // The destination is now the canonical test. Keep the source test id
      // only as audit history so the original separate make-up paper can be traced.
      make_up_of_test_id: destination_test_id,
      merged_from_test_id: sourceSub.test_id,
    }).eq('id', submission_id);
    if (updateErr) throw updateErr;

    return json(200, { ok: true, source_test: sourceTest.title, destination_test: destTest.title });
  } catch (e) {
    return json(500, { error: e.message });
  }
};
