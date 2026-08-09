const bcrypt = require('bcryptjs');
const supabase = require('./utils/db');
const { sign, json } = require('./utils/auth');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  try {
    const { username, password } = JSON.parse(event.body || '{}');
    if (!username || !password) return json(400, { error: 'Username and password are required' });

    const { data: teacher, error } = await supabase
      .from('teachers')
      .select('*')
      .eq('username', username.trim())
      .eq('active', true)
      .maybeSingle();

    if (error) throw error;
    if (!teacher) return json(401, { error: 'Invalid username or password' });

    const ok = await bcrypt.compare(password, teacher.password_hash);
    if (!ok) return json(401, { error: 'Invalid username or password' });

    const token = sign({
      role: 'teacher',
      teacher_id: teacher.id,
      name: teacher.name,
      classes: teacher.classes,
      subjects: teacher.subjects,
    });

    return json(200, {
      token,
      teacher: { id: teacher.id, name: teacher.name, classes: teacher.classes, subjects: teacher.subjects },
    });
  } catch (e) {
    return json(500, { error: e.message });
  }
};
