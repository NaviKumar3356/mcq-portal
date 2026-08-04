const supabase = require('./utils/db');
const { getAuth, json } = require('./utils/auth');

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

    return json(200, {
      test: {
        id: test.id,
        title: test.title,
        subject: test.subject,
        duration_minutes: test.duration_minutes,
        end_at: test.end_at,
        total_marks: test.total_marks,
      },
      questions, // no correct_option included — safe to send to student
    });
  } catch (e) {
    return json(500, { error: e.message });
  }
};
