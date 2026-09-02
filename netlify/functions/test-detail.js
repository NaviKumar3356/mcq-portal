const supabase = require('./utils/db');
const { getAuth, json } = require('./utils/auth');
const { requireStudentSession } = require('./utils/student-session');
const { seededShuffle } = require('./utils/shuffle');
const { getRosterRank, pickVariant } = require('./utils/practical');

exports.handler = async (event) => {
  const auth = await requireStudentSession(event);
  if (!auth) return json(401, { error: 'Your student session has expired or was signed out.' });

  const testId = event.queryStringParameters?.test_id;
  if (!testId) return json(400, { error: 'test_id is required' });

  try {
    const { data: test, error: tErr } = await supabase
      .from('tests')
      .select('*')
      .eq('id', testId)
      .single();
    if (tErr || !test) return json(404, { error: 'Test not found' });

    if (test.status === 'draft') return json(403, { error: 'This test is not published' });

    if (test.class !== auth.class) {
      return json(403, { error: 'This paper is not for your class' });
    }

    const now = new Date();
    if (test.start_at && now < new Date(test.start_at)) {
      return json(403, { error: 'This test has not opened yet' });
    }

    // A specific student may have been granted a one-time pass back in,
    // even though the paper's overall window is closed for everyone else.
    const { data: reopen } = await supabase
      .from('test_reopens')
      .select('id, reopened_at, reopen_minutes')
      .eq('test_id', testId)
      .eq('student_id', auth.student_id)
      .maybeSingle();

    // --- Reopen window fix -------------------------------------------
    // Previously the countdown always compared "now" against the paper's
    // ORIGINAL end_at — which, by definition, has usually already passed
    // for a reopen to make sense. That made the client-side timer read a
    // negative/zero remaining time the instant the test loaded, which
    // immediately fired the "time's up" auto-submit — looking exactly
    // like a false-positive proctoring warning, even though it was really
    // just a stale deadline.
    //
    // Fix: a reopened student gets a FRESH window starting from the
    // moment they were reopened, using either a custom duration the
    // teacher set for that reopen (reopen_minutes) or the paper's normal
    // duration_minutes as a fallback.
    let effectiveEndAt = test.end_at;
    if (reopen) {
      const minutes = Number(reopen.reopen_minutes) > 0
        ? Number(reopen.reopen_minutes)
        : (Number(test.duration_minutes) || 30);
      const freshEndMs = new Date(reopen.reopened_at).getTime() + minutes * 60000;
      effectiveEndAt = new Date(freshEndMs).toISOString();
    }

    if (!reopen && test.end_at && now > new Date(test.end_at)) {
      return json(403, { error: 'This test has closed' });
    }
    if (reopen && now > new Date(effectiveEndAt)) {
      return json(403, { error: 'Your reopened attempt window has expired. Ask your teacher to reopen it again.' });
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
      .select('id, order_index, type, question_text, options, marks, language, variants, resource_path, resource_name, resource_mime')
      .eq('test_id', testId)
      .order('order_index', { ascending: true });
    if (qErr) throw qErr;

    // --- Anti-cheating shuffle + practical-variant assignment -------------
    // Every student in the same "group" (a block of N consecutive roll
    // numbers within their class, N = shuffle_group_size) sees the same
    // shuffle order; the next group gets a different order. Practical
    // question variants are assigned per-student (not per-group) so every
    // student gets their own problem, round-robin over the variant pool.
    // Everything here is recomputed fresh from (test_id, roster rank)
    // every time, so no extra storage is needed and a page reload always
    // reproduces the exact same order/variant for that student.
    let orderedQuestions = questions;
    let rank = null;
    const hasPractical = questions.some((q) => q.type === 'practical');

    if (test.shuffle_questions || test.shuffle_options || hasPractical) {
      rank = await getRosterRank(supabase, test.class, auth.student_id);
    }

    if (test.shuffle_questions || test.shuffle_options) {
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

    // Assign each student their own variant of every practical question —
    // never send the full variant pool or which index was picked, just
    // the one problem they're solving.
    const withVariants = orderedQuestions.map((q) => {
      if (q.type !== 'practical') return q;
      const variant = pickVariant(q.variants, rank ?? 0);
      const { variants, ...rest } = q;
      return {
        ...rest,
        question_text: variant?.question_text || q.question_text || '',
        starter_code: variant?.starter_code || '',
      };
    });

    // Always normalize mcq options to {index, text} so the frontend has one
    // consistent shape whether or not shuffling is on. "index" is the
    // ORIGINAL option position — that's what gets submitted back, so
    // grading (which compares against correct_option) needs no changes.
    for (const q of withVariants) {
      if (q.resource_path) {
        const { data } = await supabase.storage.from('question-resources').createSignedUrl(q.resource_path, 3600);
        q.resource_url = data?.signedUrl || null;
      }
    }

    const finalQuestions = withVariants.map((q) => {
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
        end_at: effectiveEndAt,
        total_marks: test.total_marks,
        reopened: !!reopen,
      },
      questions: finalQuestions, // no correct_option included — safe to send to student
    });
  } catch (e) {
    return json(500, { error: e.message });
  }
};
