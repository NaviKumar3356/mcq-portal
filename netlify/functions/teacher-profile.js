const bcrypt = require('bcryptjs');
const supabase = require('./utils/db');
const { getAuth, sign, json } = require('./utils/auth');

// A teacher managing THEIR OWN account (name + password + photo) — as
// opposed to teachers-manage.js, which is the super admin managing
// OTHER teachers' accounts.
exports.handler = async (event) => {
  const auth = getAuth(event);
  if (!auth || auth.role !== 'teacher') return json(401, { error: 'Not authorized' });

  try {
    if (event.httpMethod === 'GET') {
      const { data: teacher, error } = await supabase
        .from('teachers')
        .select('id, username, name, classes, subjects, photo_path')
        .eq('id', auth.teacher_id)
        .single();
      if (error) throw error;
      return json(200, { teacher });
    }

    if (event.httpMethod === 'PATCH') {
      const { name, current_password, new_password } = JSON.parse(event.body || '{}');
      const patch = {};
      if (name && name.trim()) patch.name = name.trim();

      if (new_password) {
        if (new_password.length < 6) return json(400, { error: 'New password must be at least 6 characters' });
        const { data: teacher } = await supabase.from('teachers').select('password_hash').eq('id', auth.teacher_id).single();
        const ok = current_password && (await bcrypt.compare(current_password, teacher.password_hash));
        if (!ok) return json(401, { error: 'Current password is incorrect' });
        patch.password_hash = await bcrypt.hash(new_password, 10);
      }

      if (Object.keys(patch).length === 0) return json(400, { error: 'Nothing to update' });

      const { data: updated, error } = await supabase
        .from('teachers')
        .update(patch)
        .eq('id', auth.teacher_id)
        .select('id, username, name, classes, subjects, photo_path')
        .single();
      if (error) throw error;

      // Re-sign the token so a changed name shows up immediately without
      // forcing a re-login.
      const token = sign({
        role: 'teacher',
        teacher_id: updated.id,
        name: updated.name,
        classes: updated.classes,
        subjects: updated.subjects,
      });

      return json(200, { ok: true, teacher: updated, token });
    }

    return json(405, { error: 'Method not allowed' });
  } catch (e) {
    return json(500, { error: e.message });
  }
};
