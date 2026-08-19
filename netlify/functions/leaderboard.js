const supabase = require('./utils/db');
const { getAuth, json } = require('./utils/auth');

// Ranks students in a class by their average percentage score across every
// test in that class whose result has been published. Percentage (not raw
// marks) is what's averaged, so a paper out of 20 and a paper out of 100
// contribute fairly to the same ranking.
exports.handler = async (event) => {
  const auth = getAuth(event);
  if (!auth) return json(401, { error: 'Not logged in' });

  const klass = event.queryStringParameters?.class || auth.class;
  if (!klass) return json(400, { error: 'class is required' });

  if (auth.role === 'student' && klass !== auth.class) {
    return json(403, { error: 'You can only view your own class leaderboard' });
  }
  if (auth.role === 'teacher' && !(auth.classes || []).includes(klass)) {
    return json(403, { error: 'You are not assigned to that class' });
  }

  try {
    const { data: tests, error: tErr } = await supabase
      .from('tests')
      .select('id, total_marks')
      .eq('class', klass)
      .eq('results_published', true);
    if (tErr) throw tErr;

    if (!tests || tests.length === 0) {
      return json(200, { leaderboard: [], tests_counted: 0 });
    }

    const testIds = tests.map((t) => t.id);
    const totalMarksByTest = Object.fromEntries(tests.map((t) => [t.id, Number(t.total_marks) || 0]));

    const { data: submissions, error: sErr } = await supabase
      .from('submissions')
      .select('student_id, test_id, total_marks_awarded, students(name, roll_number, photo_path)')
      .in('test_id', testIds)
      .not('total_marks_awarded', 'is', null);
    if (sErr) throw sErr;

    const byStudent = {};
    for (const s of submissions || []) {
      if (!s.students) continue;
      const max = totalMarksByTest[s.test_id];
      if (!max) continue;
      const pct = (Number(s.total_marks_awarded) / max) * 100;
      if (!byStudent[s.student_id]) {
        byStudent[s.student_id] = {
          student_id: s.student_id,
          name: s.students.name,
          roll_number: s.students.roll_number,
          photo_path: s.students.photo_path || null,
          totalPct: 0,
          count: 0,
        };
      }
      byStudent[s.student_id].totalPct += pct;
      byStudent[s.student_id].count += 1;
    }

    const leaderboard = Object.values(byStudent)
      .map((s) => ({
        student_id: s.student_id,
        name: s.name,
        roll_number: s.roll_number,
        photo_path: s.photo_path,
        tests_taken: s.count,
        average_percent: Math.round((s.totalPct / s.count) * 10) / 10,
      }))
      .sort((a, b) =>
        b.average_percent - a.average_percent ||
        Number(a.roll_number) - Number(b.roll_number)
      )
      .map((s, i) => ({ ...s, rank: i + 1 }));

    return json(200, { leaderboard, tests_counted: tests.length });
  } catch (e) {
    return json(500, { error: e.message });
  }
};
