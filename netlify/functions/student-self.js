const supabase = require('./utils/db');
const { getAuth, json } = require('./utils/auth');

// A student reading their OWN record (currently just used to show their
// own photo on the Profile page) — students-list.js is teacher/admin only.
exports.handler = async (event) => {
  const auth = getAuth(event);
  if (!auth || auth.role !== 'student') return json(401, { error: 'Not logged in' });

  try {
    const { data: student, error } = await supabase
      .from('students')
      .select('id, name, roll_number, class, photo_path')
      .eq('id', auth.student_id)
      .single();
    if (error) throw error;
    return json(200, { student });
  } catch (e) {
    return json(500, { error: e.message });
  }
};
