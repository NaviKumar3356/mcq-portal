const bcrypt = require('bcryptjs');
const supabase = require('./utils/db');
const { requireRole, json } = require('./utils/auth');

exports.handler = async (event) => {
  const auth = requireRole(event, ['super_admin']);
  if (!auth) return json(401, { error: 'Not authorized' });

  try {
    if (event.httpMethod === 'GET') {
      const { data: teachers, error } = await supabase
        .from('teachers')
        .select('id, username, name, classes, subjects, active, created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return json(200, { teachers });
    }

    if (event.httpMethod === 'POST') {
      const { username, password, name, classes, subjects } = JSON.parse(event.body || '{}');
      if (!username || !password || !name) {
        return json(400, { error: 'username, password and name are required' });
      }
      const password_hash = await bcrypt.hash(password, 10);
      const { error } = await supabase.from('teachers').insert({
        username: username.trim(),
        password_hash,
        name,
        classes: classes || [],
        subjects: subjects || [],
      });
      if (error) throw error;
      return json(200, { ok: true });
    }

    if (event.httpMethod === 'PATCH') {
      // Handles three kinds of edits, any combination in one call:
      // - profile fields (name / username / classes / subjects)
      // - toggling active/disabled
      // - resetting the password (only if `password` is provided — used
      //   when a teacher forgets theirs and needs the admin to set a new
      //   one; leaving it out never touches the existing password)
      const { teacher_id, active, classes, subjects, name, username, password } = JSON.parse(event.body || '{}');
      if (!teacher_id) return json(400, { error: 'teacher_id is required' });

      const patch = {};
      if (typeof active === 'boolean') patch.active = active;
      if (classes) patch.classes = classes;
      if (subjects) patch.subjects = subjects;
      if (name) patch.name = name;
      if (username) patch.username = username.trim();
      if (password) {
        if (password.length < 6) return json(400, { error: 'New password must be at least 6 characters' });
        patch.password_hash = await bcrypt.hash(password, 10);
      }

      if (Object.keys(patch).length === 0) {
        return json(400, { error: 'Nothing to update' });
      }

      const { error } = await supabase.from('teachers').update(patch).eq('id', teacher_id);
      if (error) throw error;
      return json(200, { ok: true });
    }

    if (event.httpMethod === 'DELETE') {
      const { teacher_id } = JSON.parse(event.body || '{}');
      if (!teacher_id) return json(400, { error: 'teacher_id is required' });
      const { error } = await supabase.from('teachers').delete().eq('id', teacher_id);
      if (error) throw error;
      return json(200, { ok: true });
    }

    return json(405, { error: 'Method not allowed' });
  } catch (e) {
    if (e.code === '23505') return json(409, { error: 'That username is already taken' });
    return json(500, { error: e.message });
  }
};
