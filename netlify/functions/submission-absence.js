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
    const { test_id, student_id, action = 'mark', reason = '' } = JSON.parse(event.body || '{}');
    if (!test_id || !student_id) return json(400, { error: 'test_id and student_id are required' });

    const { data: test } = await supabase.from('tests').select('class, subject').eq('id', test_id).maybeSingle();
    if (!test) return json(404, { error: 'Test not found' });
    if (!teacherCanAccessTest(auth, test)) return json(403, { error: 'You are not assigned to this class/subject' });

    const { data: student } = await supabase.from('students').select('id, name, class').eq('id', student_id).maybeSingle();
    if (!student) return json(404, { error: 'Student not found' });
    if (student.class !== test.class) return json(400, { error: 'Student does not belong to this test class' });

    const { data: existing } = await supabase.from('submissions')
      .select('id, status')
      .eq('test_id', test_id)
      .eq('student_id', student_id)
      .maybeSingle();

    if (action === 'unmark') {
      if (existing?.status === 'absent') {
        const { error } = await supabase.from('submissions').delete().eq('id', existing.id);
        if (error) throw error;
      }
      return json(200, { ok: true, status: 'not_submitted' });
    }

    if (existing && existing.status !== 'absent') {
      return json(409, { error: 'This student already has a submitted attempt. A submitted attempt cannot be marked absent.' });
    }

    const cleanReason = String(reason || '').trim().slice(0, 500);
    if (!cleanReason) return json(400, { error: 'Please provide a reason for the absence.' });

    if (existing?.status === 'absent') {
      const { error } = await supabase.from('submissions').update({
        status: 'absent',
        absence_reason: cleanReason,
        submitted_at: null,
        marked_absent_at: new Date().toISOString(),
      }).eq('id', existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('submissions').insert({
        test_id,
        student_id,
        status: 'absent',
        submitted_at: null,
        absence_reason: cleanReason,
        marked_absent_at: new Date().toISOString(),
      });
      if (error) throw error;
    }

    return json(200, { ok: true, status: 'absent', absence_reason: cleanReason });
  } catch (e) {
    return json(500, { error: e.message });
  }
};
