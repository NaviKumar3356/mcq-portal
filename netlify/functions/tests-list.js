const supabase = require('./utils/db');
const { getAuth, json } = require('./utils/auth');
const { requireStudentSession } = require('./utils/student-session');

exports.handler = async (event) => {
  const auth = await requireStudentSession(event);
  if (!auth) return json(401, { error: 'Your student session has expired or was signed out.' });

  try {
    // The signed student JWT already contains the class. Avoid an extra
    // students lookup on every dashboard refresh. Run the three independent
    // reads concurrently to reduce wall-clock latency on the free tier.
    const [testsResult, subsResult, reopensResult] = await Promise.all([
      supabase
        .from('tests')
        .select('id, title, subject, class, duration_minutes, start_at, end_at, status, results_published, total_marks')
        .eq('class', auth.class)
        .neq('status', 'draft')
        .order('start_at', { ascending: false }),
      supabase
        .from('submissions')
        .select('test_id, status, total_marks_awarded')
        .eq('student_id', auth.student_id),
      supabase
        .from('test_reopens')
        .select('test_id')
        .eq('student_id', auth.student_id),
    ]);
    if (testsResult.error) throw testsResult.error;
    if (subsResult.error) throw subsResult.error;
    if (reopensResult.error) throw reopensResult.error;
    const allTests = testsResult.data || [];
    const mySubs = subsResult.data || [];
    const reopens = reopensResult.data || [];
    const subMap = Object.fromEntries(mySubs.map((s) => [s.test_id, s]));
    const reopenedSet = new Set((reopens || []).map((r) => r.test_id));

    const now = new Date();
    const result = allTests.map((t) => {
      const submission = subMap[t.id];
      let window = 'upcoming';
      if (t.start_at && now < new Date(t.start_at)) window = 'upcoming';
      else if (t.end_at && now > new Date(t.end_at)) window = reopenedSet.has(t.id) ? 'open' : 'closed';
      else window = 'open';

      return {
        ...t,
        window,
        submitted: !!submission,
        my_score: t.results_published ? submission?.total_marks_awarded ?? null : null,
      };
    });

    return json(200, { tests: result });
  } catch (e) {
    return json(500, { error: e.message });
  }
};
