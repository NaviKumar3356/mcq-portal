const supabase = require('./utils/db');
const { getAuth, json } = require('./utils/auth');

exports.handler = async (event) => {
  const auth = getAuth(event);
  if (!auth || auth.role !== 'student') return json(401, { error: 'Not logged in' });

  try {
    const { data: myStudent } = await supabase
      .from('students')
      .select('class')
      .eq('id', auth.student_id)
      .single();

    const { data: allTests, error: e2 } = await supabase
      .from('tests')
      .select('id, title, subject, class, duration_minutes, start_at, end_at, status, results_published, total_marks')
      .eq('class', myStudent.class)
      .neq('status', 'draft')
      .order('start_at', { ascending: false });
    if (e2) throw e2;

    const { data: mySubs } = await supabase
      .from('submissions')
      .select('test_id, status, total_marks_awarded')
      .eq('student_id', auth.student_id);

    const subMap = Object.fromEntries((mySubs || []).map((s) => [s.test_id, s]));

    const now = new Date();
    const result = allTests.map((t) => {
      const submission = subMap[t.id];
      let window = 'upcoming';
      if (t.start_at && now < new Date(t.start_at)) window = 'upcoming';
      else if (t.end_at && now > new Date(t.end_at)) window = 'closed';
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
