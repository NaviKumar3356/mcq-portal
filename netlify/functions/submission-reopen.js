const supabase = require('./utils/db');
const { requireRole, json } = require('./utils/auth');

function teacherCanAccessTest(auth, test) {
  if (auth.role !== 'teacher') return true;
  return (auth.classes || []).includes(test.class) && (auth.subjects || []).includes(test.subject);
}

// Reopens a test for exactly ONE student — clears their existing submission
// (if any, e.g. they submitted too early by mistake) and grants them a
// one-time pass back in even if the paper's overall closing time has
// already passed. No other student is affected.
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  const auth = requireRole(event, ['teacher', 'super_admin']);
  if (!auth) return json(401, { error: 'Not authorized' });

  try {
    const { test_id, student_id } = JSON.parse(event.body || '{}');
    if (!test_id || !student_id) return json(400, { error: 'test_id and student_id are required' });

    const { data: test } = await supabase.from('tests').select('class, subject').eq('id', test_id).maybeSingle();
    if (!test) return json(404, { error: 'Test not found' });
    if (!teacherCanAccessTest(auth, test)) return json(403, { error: 'You are not assigned to this class/subject' });

    // Clear any existing submission so the student gets a genuinely fresh attempt.
    const { data: existing } = await supabase
      .from('submissions')
      .select('id')
      .eq('test_id', test_id)
      .eq('student_id', student_id)
      .maybeSingle();
    if (existing) {
      const { error: delErr } = await supabase.from('submissions').delete().eq('id', existing.id);
      if (delErr) throw delErr;
    }

    const { error } = await supabase
      .from('test_reopens')
      .upsert(
        { test_id, student_id, reopened_by: auth.role === 'teacher' ? auth.teacher_id : null },
        { onConflict: 'test_id,student_id' }
      );
    if (error) throw error;

    return json(200, { ok: true });
  } catch (e) {
    return json(500, { error: e.message });
  }
};
