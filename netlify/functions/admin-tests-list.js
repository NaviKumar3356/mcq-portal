const supabase = require('./utils/db');
const { getAuth, json } = require('./utils/auth');

exports.handler = async (event) => {
  const auth = getAuth(event);
  if (!auth || auth.role !== 'admin') return json(401, { error: 'Not authorized' });

  try {
    const { data: tests, error } = await supabase
      .from('tests')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;

    return json(200, { tests });
  } catch (e) {
    return json(500, { error: e.message });
  }
};
