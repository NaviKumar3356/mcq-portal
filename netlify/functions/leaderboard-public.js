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
    const limit = Math.min(10, Math.max(1, Number(event.queryStringParameters?.limit) || 10));
    const requestedClass = String(event.queryStringParameters?.class || '').trim();

    let testsQuery = supabase
      .from('tests')
      .select('id, total_marks')
      .eq('results_published', true);
    if (requestedClass) testsQuery = testsQuery.eq('class', requestedClass);
    const { data: tests, error: tErr } = await testsQuery;
    if (tErr) throw tErr;

    if (!tests || tests.length === 0) {
      return json(200, { top: [] });
    }

    const testIds = tests.map((t) => t.id);
    const totalMarksByTest = Object.fromEntries(tests.map((t) => [t.id, Number(t.total_marks) || 0]));

    // Resolve students in a second query rather than embedding them. This
    // keeps the public ranking endpoint stable even if the database has
    // multiple foreign-key relationships involving submissions/students.
    const { data: submissions, error: sErr } = await supabase
      .from('submissions')
      .select('student_id, test_id, total_marks_awarded')
      .in('test_id', testIds)
      .not('total_marks_awarded', 'is', null);
    if (sErr) throw sErr;

    const studentIds = [...new Set((submissions || []).map((s) => s.student_id).filter(Boolean))];
    const { data: students, error: stErr } = studentIds.length
      ? await supabase.from('students').select('id, name, class, photo_path').in('id', studentIds)
      : { data: [], error: null };
    if (stErr) throw stErr;
    const studentById = Object.fromEntries((students || []).map((s) => [s.id, s]));

    const byStudent = {};
    for (const s of submissions || []) {
      const student = studentById[s.student_id];
      if (!student) continue;
      if (requestedClass && String(student.class || '') !== requestedClass) continue;
      const max = totalMarksByTest[s.test_id];
      if (!max) continue;
      const pct = (Number(s.total_marks_awarded) / max) * 100;
      if (!byStudent[s.student_id]) {
        byStudent[s.student_id] = {
          student_id: s.student_id,
          name: student.name,
          class: student.class,
          photo_path: student.photo_path || null,
          totalPct: 0,
          count: 0,
        };
      }
      byStudent[s.student_id].totalPct += pct;
      byStudent[s.student_id].count += 1;
    }

    const ranked = Object.values(byStudent)
      .map((s) => ({
        name: s.name,
        class: s.class,
        photo_path: s.photo_path,
        tests_taken: s.count,
        // Keep the unrounded value for ranking so students are tied only
        // when their actual average percentage is equal. The rounded value
        // is what we display publicly.
        average_percent_exact: s.totalPct / s.count,
        average_percent: Math.round((s.totalPct / s.count) * 10) / 10,
      }))
      .sort((a, b) => b.average_percent_exact - a.average_percent_exact || b.tests_taken - a.tests_taken || a.name.localeCompare(b.name));

    // Competition ranking: equal scores receive the same rank and the next
    // rank skips accordingly (1, 1, 3). The secondary sort never changes
    // the rank of a tied score.
    let lastScore = null;
    let lastRank = 0;
    const top = ranked
      .slice(0, limit)
      .map((s, i) => {
        const rank = lastScore !== null && s.average_percent_exact === lastScore ? lastRank : i + 1;
        lastScore = s.average_percent_exact;
        lastRank = rank;
        const { average_percent_exact, student_id, ...publicStudent } = s;
        return { ...publicStudent, rank };
      });

    return json(200, { top, class: requestedClass || null });
  } catch (e) {
    return json(500, { error: e.message });
  }
};
