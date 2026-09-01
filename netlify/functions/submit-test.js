const supabase = require('./utils/db');
const { getAuth, json } = require('./utils/auth');
const { getRosterRank, pickVariant } = require('./utils/practical');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  const auth = getAuth(event);
  if (!auth || auth.role !== 'student') return json(401, { error: 'Not logged in' });

  try {
    const {
      test_id, answers,
      tab_switch_count, flagged_reason, proctor_log,
    } = JSON.parse(event.body || '{}');
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

    const { data: test } = await supabase.from('tests').select('class').eq('id', test_id).maybeSingle();

    const { data: questions, error: qErr } = await supabase
      .from('questions')
      .select('id, type, correct_option, marks, language, variants')
      .eq('test_id', test_id);
    if (qErr) throw qErr;
    const qMap = Object.fromEntries(questions.map((q) => [q.id, q]));

    // Practical questions need the same roster-rank used at test-detail
    // time so the snapshot we save matches exactly what the student saw.
    let rank = null;
    if (test && questions.some((q) => q.type === 'practical')) {
      rank = await getRosterRank(supabase, test.class, auth.student_id);
    }

    // tab_switch_count / flagged_reason / proctor_log come from the
    // client's anti-cheating tab-switch tracker (see TakeTest.jsx). A
    // flagged_reason of 'tab_switching' means the student crossed the
    // switch limit and this submission was auto-submitted — it still
    // gets graded normally, but the teacher sees a warning before
    // publishing results.
    const { data: reopen } = await supabase
      .from('test_reopens')
      .select('attempt_type, absence_reason_snapshot')
      .eq('test_id', test_id)
      .eq('student_id', auth.student_id)
      .maybeSingle();

    const { data: submission, error: sErr } = await supabase
      .from('submissions')
      .insert({
        test_id,
        student_id: auth.student_id,
        status: 'submitted',
        attempt_type: reopen?.attempt_type === 'make_up' ? 'make_up' : 'original',
        make_up_of_test_id: reopen?.attempt_type === 'make_up' ? test_id : null,
        tab_switch_count: Number(tab_switch_count) || 0,
        flagged_reason: flagged_reason || null,
        proctor_log: Array.isArray(proctor_log) ? proctor_log : [],
      })
      .select()
      .single();
    if (sErr) throw sErr;

    let autoTotal = 0;
    let hasUngraded = false;

    const rows = answers.map((a) => {
      const q = qMap[a.question_id];
      let marks_awarded = null;
      let variant_snapshot = null;

      if (q && q.type === 'mcq') {
        marks_awarded = a.mcq_selected === q.correct_option ? q.marks : 0;
        autoTotal += marks_awarded;
      } else if (q && q.type === 'practical') {
        hasUngraded = true; // needs manual grading
        const variant = pickVariant(q.variants, rank ?? 0);
        variant_snapshot = variant
          ? { language: q.language, question_text: variant.question_text, starter_code: variant.starter_code }
          : null;
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
        variant_snapshot,
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

    return json(200, { submission_id: submission.id, ok: true, flagged_reason: flagged_reason || null });
  } catch (e) {
    if (e.code === '23505') return json(403, { error: 'You have already submitted this test' });
    return json(500, { error: e.message });
  }
};
