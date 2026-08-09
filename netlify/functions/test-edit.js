const supabase = require('./utils/db');
const { requireRole, json } = require('./utils/auth');
const { CLASSES, SUBJECTS } = require('./utils/constants');

function teacherCanAccess(auth, test) {
  if (auth.role !== 'teacher') return true;
  return (auth.classes || []).includes(test.class) && (auth.subjects || []).includes(test.subject);
}

exports.handler = async (event) => {
  const auth = requireRole(event, ['teacher', 'super_admin']);
  if (!auth) return json(401, { error: 'Not authorized' });

  try {
    if (event.httpMethod === 'GET') {
      const testId = event.queryStringParameters?.test_id;
      if (!testId) return json(400, { error: 'test_id is required' });

      const { data: test, error: tErr } = await supabase.from('tests').select('*').eq('id', testId).single();
      if (tErr || !test) return json(404, { error: 'Test not found' });
      if (!teacherCanAccess(auth, test)) return json(403, { error: 'You are not assigned to this class/subject' });

      const { data: questions, error: qErr } = await supabase
        .from('questions')
        .select('*')
        .eq('test_id', testId)
        .order('order_index', { ascending: true });
      if (qErr) throw qErr;

      const { count: submissionsCount } = await supabase
        .from('submissions')
        .select('id', { count: 'exact', head: true })
        .eq('test_id', testId);

      return json(200, { test, questions, submissions_count: submissionsCount || 0 });
    }

    if (event.httpMethod === 'POST') {
      const {
        test_id, title, subject, class: className, duration_minutes,
        start_at, end_at, questions,
        shuffle_questions, shuffle_options, shuffle_group_size,
      } = JSON.parse(event.body || '{}');

      if (!test_id || !title || !className || !subject || !Array.isArray(questions) || questions.length === 0) {
        return json(400, { error: 'test_id, title, class, subject, and at least one question are required' });
      }
      if (!CLASSES.includes(className)) return json(400, { error: 'Invalid class' });
      if (!SUBJECTS.includes(subject)) return json(400, { error: 'Invalid subject' });

      const { data: existingTest } = await supabase.from('tests').select('*').eq('id', test_id).maybeSingle();
      if (!existingTest) return json(404, { error: 'Test not found' });
      if (!teacherCanAccess(auth, existingTest)) return json(403, { error: 'You are not assigned to this class/subject' });
      if (auth.role === 'teacher' && (!(auth.classes || []).includes(className) || !(auth.subjects || []).includes(subject))) {
        return json(403, { error: 'You are not assigned to that class/subject' });
      }

      const { count: submissionsCount } = await supabase
        .from('submissions')
        .select('id', { count: 'exact', head: true })
        .eq('test_id', test_id);
      const hasSubmissions = (submissionsCount || 0) > 0;

      const { data: existingQuestions } = await supabase.from('questions').select('*').eq('test_id', test_id);
      const existingById = Object.fromEntries((existingQuestions || []).map((q) => [q.id, q]));

      const incomingIds = new Set(questions.filter((q) => q.id).map((q) => q.id));
      const toDelete = (existingQuestions || []).filter((q) => !incomingIds.has(q.id));
      const toAdd = questions.filter((q) => !q.id);

      if (hasSubmissions && (toDelete.length > 0 || toAdd.length > 0)) {
        return json(409, {
          error: 'Students have already submitted this paper, so questions can\'t be added or removed. ' +
                 'You can still fix wording, marks, or the answer key on existing questions — or create a new paper for a different question set.',
        });
      }

      // Update existing questions in place (safe even with submissions).
      for (const q of questions.filter((q) => q.id)) {
        const before = existingById[q.id];
        const patch = {
          question_text: q.question_text,
          marks: q.marks,
          order_index: q.order_index,
        };
        if (q.type === 'mcq') {
          patch.options = q.options;
          patch.correct_option = q.correct_option;
        }
        const { error } = await supabase.from('questions').update(patch).eq('id', q.id);
        if (error) throw error;

        // If the answer key changed for an MCQ that already has submitted
        // answers, recompute those answers' marks so grades stay correct.
        if (hasSubmissions && before && before.type === 'mcq' && before.correct_option !== q.correct_option) {
          const { data: answers } = await supabase
            .from('answers')
            .select('id, submission_id, mcq_selected')
            .eq('question_id', q.id);

          const affectedSubmissions = new Set();
          for (const a of answers || []) {
            const newMarks = a.mcq_selected === q.correct_option ? Number(q.marks) : 0;
            await supabase.from('answers').update({ marks_awarded: newMarks }).eq('id', a.id);
            affectedSubmissions.add(a.submission_id);
          }
          for (const subId of affectedSubmissions) {
            const { data: subAnswers } = await supabase.from('answers').select('marks_awarded').eq('submission_id', subId);
            const allGraded = (subAnswers || []).every((x) => x.marks_awarded !== null);
            if (allGraded) {
              const total = subAnswers.reduce((sum, x) => sum + Number(x.marks_awarded || 0), 0);
              await supabase.from('submissions').update({ total_marks_awarded: total }).eq('id', subId);
            }
          }
        }
      }

      // Only reachable when there are no submissions yet.
      if (toDelete.length > 0) {
        const { error } = await supabase.from('questions').delete().in('id', toDelete.map((q) => q.id));
        if (error) throw error;
      }
      if (toAdd.length > 0) {
        const startIndex = questions.length - toAdd.length;
        const rows = toAdd.map((q, i) => ({
          test_id,
          order_index: startIndex + i,
          type: q.type,
          question_text: q.question_text,
          options: q.type === 'mcq' ? q.options : null,
          correct_option: q.type === 'mcq' ? q.correct_option : null,
          marks: q.marks || 1,
        }));
        const { error } = await supabase.from('questions').insert(rows);
        if (error) throw error;
      }

      const total_marks = questions.reduce((sum, q) => sum + Number(q.marks || 0), 0);
      const allMcqHaveAnswers = questions.every(
        (q) => q.type !== 'mcq' || (q.correct_option !== undefined && q.correct_option !== null)
      );

      const { error: updErr } = await supabase
        .from('tests')
        .update({
          title,
          subject,
          class: className,
          duration_minutes: duration_minutes || 30,
          start_at: start_at || null,
          end_at: end_at || null,
          total_marks,
          answer_key_set: allMcqHaveAnswers,
          shuffle_questions: !!shuffle_questions,
          shuffle_options: !!shuffle_options,
          shuffle_group_size: Math.max(1, Number(shuffle_group_size) || 1),
        })
        .eq('id', test_id);
      if (updErr) throw updErr;

      return json(200, { ok: true });
    }

    return json(405, { error: 'Method not allowed' });
  } catch (e) {
    return json(500, { error: e.message });
  }
};
