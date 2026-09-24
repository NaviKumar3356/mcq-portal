const crypto = require('crypto');
const supabase = require('./utils/db');
const { sign, json } = require('./utils/auth');
const { acquireStudentSession } = require('./utils/student-session');

function isE2ELoginAllowed(event, student) {
  // E2E bypass is available only on non-production deploy contexts and only
  // for the explicitly configured existing student account.
  if (process.env.CONTEXT === 'production') return false;

  const expected = process.env.E2E_TEST_SECRET || '';
  const provided =
    event.headers?.['x-e2e-test-key'] ||
    event.headers?.['X-E2E-Test-Key'] || '';
  if (!expected || !provided) return false;

  const a = Buffer.from(expected);
  const b = Buffer.from(String(provided));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;

  return (
    String(process.env.E2E_TEST_STUDENT_CLASS || '').trim() === String(student.class).trim() &&
    String(process.env.E2E_TEST_STUDENT_ROLL || '').trim() === String(student.roll_number).trim()
  );
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  try {
    const { roll_number, class: klass, dob } = JSON.parse(event.body || '{}');
    if (!roll_number || !klass || !dob) {
      return json(400, { error: 'Class, roll number and date of birth are all required' });
    }

    const { data: student, error } = await supabase
      .from('students')
      .select('id, roll_number, name, class, dob')
      .eq('roll_number', roll_number.trim())
      .eq('class', klass)
      .eq('dob', dob)
      .maybeSingle();

    if (error) throw error;
    if (!student) return json(401, { error: 'Class, roll number or date of birth is incorrect' });

    const e2eLogin = isE2ELoginAllowed(event, student);
    let sessionId;

    if (e2eLogin) {
      // Stateless E2E session: do not touch student_active_sessions at all.
      // This means the real student's browser session is never displaced.
      sessionId = `e2e-${crypto.randomUUID()}`;
    } else {
      let session;
      try {
        session = await acquireStudentSession(student.id);
      } catch (sessionError) {
        console.error('Student session lock error:', sessionError);
        return json(503, { error: 'Student session protection is not available. Please ask the administrator to run schema_v15_migration.sql and schema_v16_migration.sql in Supabase.' });
      }
      if (!session.ok) {
        return json(409, { error: 'This student account is already signed in on another device or browser. Log out there first, or wait about 3 minutes for the inactive session to expire.' });
      }
      sessionId = session.sessionId;
    }

    const token = sign({
      role: 'student',
      e2e: e2eLogin || undefined,
      session_id: sessionId,
      student_id: student.id,
      name: student.name,
      class: student.class,
      roll_number: student.roll_number,
    });

    return json(200, {
      token,
      student: {
        id: student.id,
        roll_number: student.roll_number,
        name: student.name,
        class: student.class,
      },
    });
  } catch (e) {
    return json(500, { error: e.message });
  }
};
