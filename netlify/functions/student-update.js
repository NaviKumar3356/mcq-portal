const supabase = require('./utils/db');
const { requireRole, json } = require('./utils/auth');

// Completes Create/Read/Update/Delete for students — previously there was
// student-create.js and student-delete.js but no way to fix a typo'd name,
// wrong roll number, or wrong DOB without deleting and re-adding.
//
// A teacher can only edit students who are (a) currently in one of their
// assigned classes, and (b) being moved to one of their assigned classes
// if the class is changing — this stops a teacher from using "edit" to
// move a student in or out of a class they don't manage.
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  const auth = requireRole(event, ['teacher', 'super_admin']);
  if (!auth) return json(401, { error: 'Not authorized' });

  try {
    const { student_id, roll_number, name, class: klass, dob } = JSON.parse(event.body || '{}');
    if (!student_id || !roll_number || !name || !klass || !dob) {
      return json(400, { error: 'student_id, roll_number, name, class and dob are all required' });
    }

    const { data: existing } = await supabase.from('students').select('class').eq('id', student_id).maybeSingle();
    if (!existing) return json(404, { error: 'Student not found' });

    if (auth.role === 'teacher') {
      const allowed = auth.classes || [];
      if (!allowed.includes(existing.class)) {
        return json(403, { error: 'You are not assigned to that class' });
      }
      if (!allowed.includes(klass)) {
        return json(403, { error: 'You are not assigned to the target class' });
      }
    }

    const { error } = await supabase
      .from('students')
      .update({ roll_number: roll_number.trim(), name, class: klass, dob })
      .eq('id', student_id);
    if (error) throw error;

    return json(200, { ok: true });
  } catch (e) {
    if (e.code === '23505') return json(409, { error: 'That roll number already exists in this class' });
    return json(500, { error: e.message });
  }
};
