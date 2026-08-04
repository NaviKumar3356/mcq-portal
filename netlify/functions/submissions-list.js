const supabase = require('./utils/db');
const { getAuth, json } = require('./utils/auth');

exports.handler = async (event) => {
  const auth = getAuth(event);
  if (!auth || auth.role !== 'admin') return json(401, { error: 'Not authorized' });

  const testId = event.queryStringParameters?.test_id;
  if (!testId) return json(400, { error: 'test_id is required' });

  try {
    const { data: submissions, error } = await supabase
      .from('submissions')
      .select('id, status, total_marks_awarded, submitted_at, students(id, name, roll_number, class)')
      .eq('test_id', testId)
      .order('submitted_at', { ascending: true });
    if (error) throw error;

    return json(200, { submissions });
  } catch (e) {
    return json(500, { error: e.message });
  }
};
