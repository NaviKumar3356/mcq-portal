const supabase = require('./utils/db');
const { json } = require('./utils/auth');

// Public, UNAUTHENTICATED endpoint — powers the "Hall of Fame" section on
// the landing page, visible to anyone before they log in. Deliberately
// returns the minimum needed to display a leaderboard: first/last name,
// class, average score, and an optional photo. It never returns roll
// number, date of birth, or anything else a student wouldn't want an
// anonymous visitor to see.
//
// Ranking is school-wide (pooled across every class), by average
// percentage score across every test whose result has been published —
// the same normalization the per-class leaderboard uses, so a paper out
// of 20 and a paper out of 100 contribute fairly.
exports.handler = async (event) => {
  try {
    const limit = Math.min(10, Math.max(1, Number(event.queryStringParameters?.limit) || 5));

    const { data: tests, error: tErr } = await supabase
      .from('tests')
      .select('id, total_marks')
      .eq('results_published', true);
    if (tErr) throw tErr;

    if (!tests || tests.length === 0) {
      return json(200, { top: [] });
    }

    const testIds = tests.map((t) => t.id);
    const totalMarksByTest = Object.fromEntries(tests.map((t) => [t.id, Number(t.total_marks) || 0]));

    const { data: submissions, error: sErr } = await supabase
      .from('submissions')
      .select('student_id, test_id, total_marks_awarded, students(name, class, photo_path)')
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
          class: s.students.class,
          photo_path: s.students.photo_path || null,
          totalPct: 0,
          count: 0,
        };
      }
      byStudent[s.student_id].totalPct += pct;
      byStudent[s.student_id].count += 1;
    }

    const top = Object.values(byStudent)
      .map((s) => ({
        student_id: s.student_id,
        name: s.name,
        class: s.class,
        photo_path: s.photo_path,
        tests_taken: s.count,
        average_percent: Math.round((s.totalPct / s.count) * 10) / 10,
      }))
      .sort((a, b) => b.average_percent - a.average_percent || b.tests_taken - a.tests_taken)
      .slice(0, limit)
      .map((s, i) => ({ ...s, rank: i + 1 }));

    return json(200, { top });
  } catch (e) {
    return json(500, { error: e.message });
  }
};
