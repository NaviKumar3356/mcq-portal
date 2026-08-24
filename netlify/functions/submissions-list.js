const supabase = require('./utils/db');
const { requireRole, json } = require('./utils/auth');

function teacherCanAccessTest(auth, test) {
  if (auth.role !== 'teacher') return true;
  return (auth.classes || []).includes(test.class) && (auth.subjects || []).includes(test.subject);
}

exports.handler = async (event) => {
  const auth = requireRole(event, ['teacher', 'super_admin']);
  if (!auth) return json(401, { error: 'Not authorized' });

  const testId = event.queryStringParameters?.test_id;
  if (!testId) return json(400, { error: 'test_id is required' });

  try {
    const { data: test } = await supabase.from('tests').select('class, subject').eq('id', testId).maybeSingle();
    if (!test) return json(404, { error: 'Test not found' });
    if (!teacherCanAccessTest(auth, test)) {
      return json(403, { error: 'You are not assigned to this class/subject' });
    }

    const { data: submissions, error } = await supabase
      .from('submissions')
      .select('id, status, total_marks_awarded, submitted_at, tab_switch_count, flagged_reason, absence_reason, marked_absent_at, attempt_type, make_up_of_test_id, merged_from_test_id, students(id, name, roll_number, class)')
      .eq('test_id', testId)
      .order('submitted_at', { ascending: true });
    if (error) {
      const msg = String(error.message || error);
      // Keep submitted/graded attempts visible even if the attendance migration
      // has not yet been applied. This prevents a database schema issue from
      // making every roster student appear as "Not submitted".
      if (/absence_reason|marked_absent_at|attempt_type|make_up_of_test_id|merged_from_test_id|column .* does not exist/i.test(msg)) {
        const fallback = await supabase
          .from('submissions')
          .select('id, status, total_marks_awarded, submitted_at, tab_switch_count, flagged_reason, students(id, name, roll_number, class)')
          .eq('test_id', testId)
          .order('submitted_at', { ascending: true });
        if (fallback.error) throw fallback.error;
        return json(200, {
          submissions: fallback.data || [],
          attendanceMigrationRequired: true,
          warning: 'Attendance fields are not available yet. Run supabase/schema_v10_migration.sql to enable absent marking and absence reasons.'
        });
      }
      throw error;
    }

    return json(200, { submissions, attendanceMigrationRequired: false });
  } catch (e) {
    return json(500, { error: e.message });
  }
};
