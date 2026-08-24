const supabase = require('./utils/db');
const { requireRole, json } = require('./utils/auth');

function teacherCanAccessTest(auth, test) {
  if (auth.role !== 'teacher') return true;
  return (auth.classes || []).includes(test.class) && (auth.subjects || []).includes(test.subject);
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
  const auth = requireRole(event, ['teacher', 'super_admin']);
  if (!auth) return json(401, { error: 'Not authorized' });

  try {
    const { test_id, student_id, minutes, reason } = JSON.parse(event.body || '{}');
    if (!test_id || !student_id) return json(400, { error: 'test_id and student_id are required' });

    const { data: test } = await supabase.from('tests').select('id, class, subject, duration_minutes').eq('id', test_id).maybeSingle();
    if (!test) return json(404, { error: 'Test not found' });
    if (!teacherCanAccessTest(auth, test)) return json(403, { error: 'You are not assigned to this class/subject' });

    const { data: student } = await supabase.from('students').select('id, name, class').eq('id', student_id).maybeSingle();
    if (!student) return json(404, { error: 'Student not found' });
    if (student.class !== test.class) return json(400, { error: 'Student does not belong to this test class' });

    const { data: existing } = await supabase.from('submissions')
      .select('id, status, absence_reason')
      .eq('test_id', test_id).eq('student_id', student_id).maybeSingle();
    if (existing && existing.status !== 'absent') {
      return json(409, { error: 'This student already has a submitted attempt. Use Merge only for a separately-created make-up paper.' });
    }

    let reopen_minutes = null;
    if (minutes !== undefined && minutes !== null && minutes !== '') {
      const n = Number(minutes);
      if (!Number.isFinite(n) || n <= 0) return json(400, { error: 'minutes must be a positive number' });
      reopen_minutes = Math.round(n);
    }

    const absenceReason = existing?.status === 'absent' ? (existing.absence_reason || null) : null;
    if (existing?.status === 'absent') {
      const { error } = await supabase.from('submissions').delete().eq('id', existing.id);
      if (error) throw error;
    }

    const { error } = await supabase.from('test_reopens').upsert({
      test_id,
      student_id,
      reopened_by: auth.role === 'teacher' ? auth.teacher_id : null,
      reopened_at: new Date().toISOString(),
      reopen_minutes,
      attempt_type: 'make_up',
      absence_reason_snapshot: absenceReason || String(reason || '').trim().slice(0, 500) || null,
    }, { onConflict: 'test_id,student_id' });
    if (error) throw error;

    return json(200, { ok: true, attempt_type: 'make_up', student: student.name, previous_absence_reason: absenceReason });
  } catch (e) {
    return json(500, { error: e.message });
  }
};
