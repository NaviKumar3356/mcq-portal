const supabase = require('./utils/db');
const { getAuth, json } = require('./utils/auth');
const { seededShuffle } = require('./utils/shuffle');

exports.handler = async (event) => {
  const auth = getAuth(event);
  if (!auth || auth.role !== 'student') return json(401, { error: 'Not logged in' });

  const testId = event.queryStringParameters?.test_id;
  if (!testId) return json(400, { error: 'test_id is required' });

  try {
    const { data: test, error: tErr } = await supabase
      .from('tests')
      .select('*')
      .eq('id', testId)
      .single();
    if (tErr || !test) return json(404, { error: 'Test not found' });

    if (test.class !== auth.class) {
      return json(403, { error: 'This paper is not for your class' });
    }

    const now = new Date();
    if (test.start_at && now < new Date(test.start_at)) {
      return json(403, { error: 'This test has not opened yet' });
    }
    if (test.end_at && now > new Date(test.end_at)) {
      return json(403, { error: 'This test has closed' });
    }

    const { data: existing } = await supabase
      .from('submissions')
      .select('id')
      .eq('test_id', testId)
      .eq('student_id', auth.student_id)
      .maybeSingle();
    if (existing) return json(403, { error: 'You have already submitted this test' });

    const { data: questions, error: qErr } = await supabase
      .from('questions')
      .select('id, order_index, type, question_text, options, marks')
      .eq('test_id', testId)
      .order('order_index', { ascending: true });
    if (qErr) throw qErr;

    // --- Anti-cheating shuffle -------------------------------------------
    // Every student in the same "group" (a block of N consecutive roll
    // numbers within their class, N = shuffle_group_size) sees the same
    // order; the next group gets a different order. Recomputed fresh from
    // (test_id, group_index) every time, so no extra storage is needed and
    // a page reload always reproduces the exact same order for that student.
    let orderedQuestions = questions;
    if (test.shuffle_questions || test.shuffle_options) {
      const { data: roster } = await supabase
        .from('students')
        .select('id')
        .eq('class', test.class)
        .order('roll_number', { ascending: true });

      const rank = Math.max(0, (roster || []).findIndex((s) => s.id === auth.student_id));
      const groupSize = Math.max(1, test.shuffle_group_size || 1);
      const groupIndex = Math.floor(rank / groupSize);
      const baseSeed = `${test.id}:${groupIndex}`;

      if (test.shuffle_questions) {
        orderedQuestions = seededShuffle(questions, baseSeed);
      }

      if (test.shuffle_options) {
        orderedQuestions = orderedQuestions.map((q) => {
          if (q.type !== 'mcq' || !Array.isArray(q.options)) return q;
          const withIndex = q.options.map((text, index) => ({ index, text }));
          return { ...q, options: seededShuffle(withIndex, `${baseSeed}:${q.id}`) };
        });
      }
    }

    // Always normalize mcq options to {index, text} so the frontend has one
    // consistent shape whether or not shuffling is on. "index" is the
    // ORIGINAL option position — that's what gets submitted back, so
    // grading (which compares against correct_option) needs no changes.
    const finalQuestions = orderedQuestions.map((q) => {
      if (q.type !== 'mcq' || !Array.isArray(q.options)) return q;
      const alreadyShaped = q.options.length > 0 && typeof q.options[0] === 'object';
      const options = alreadyShaped ? q.options : q.options.map((text, index) => ({ index, text }));
      return { ...q, options };
    });

    return json(200, {
      test: {
        id: test.id,
        title: test.title,
        subject: test.subject,
        duration_minutes: test.duration_minutes,
        end_at: test.end_at,
        total_marks: test.total_marks,
      },
      questions: finalQuestions, // no correct_option included — safe to send to student
    });
  } catch (e) {
    return json(500, { error: e.message });
  }
};
