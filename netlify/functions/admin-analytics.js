const supabase = require('./utils/db');
const { requireRole, json } = require('./utils/auth');
const { IDLE_MINUTES } = require('./utils/student-session');

// Deeper administration analytics: live session activity, flagged/audit
// trail for tab-switch and reopened attempts, and an examination-timing
// breakdown. Read-only aggregation over existing tables — no new storage.
//
// Each section is fetched independently and defensively: a school database
// that has not yet run a later migration (see supabase/schema_v*.sql) simply
// loses that one section instead of breaking the whole dashboard.

function isMissingColumnOrTable(error) {
  return /column .* does not exist|relation .* does not exist|function .* does not exist/i.test(String(error?.message || ''));
}

async function loadSessions() {
  const { data, error } = await supabase
    .from('student_active_sessions')
    .select('student_id, last_seen_at')
    .order('last_seen_at', { ascending: false });
  if (error) {
    if (isMissingColumnOrTable(error)) return { active: 0, list: [], notice: 'Student session tracking is not set up yet. Run supabase/schema_v15_migration.sql and schema_v16_migration.sql.' };
    throw error;
  }

  const cutoff = Date.now() - IDLE_MINUTES * 60 * 1000;
  const active = (data || []).filter((row) => new Date(row.last_seen_at).getTime() > cutoff);

  const studentIds = [...new Set(active.map((row) => row.student_id).filter(Boolean))];
  const { data: students } = studentIds.length
    ? await supabase.from('students').select('id, name, roll_number, class').in('id', studentIds)
    : { data: [] };
  const studentById = Object.fromEntries((students || []).map((s) => [s.id, s]));

  const list = active.slice(0, 20).map((row) => {
    const student = studentById[row.student_id];
    return {
      student_name: student?.name || 'Unknown student',
      roll_number: student?.roll_number || null,
      class: student?.class || null,
      last_seen_at: row.last_seen_at,
      idle_seconds: Math.max(0, Math.round((Date.now() - new Date(row.last_seen_at).getTime()) / 1000)),
    };
  });

  return { active: active.length, list, notice: null };
}

async function loadSubmissions() {
  const { data, error } = await supabase
    .from('submissions')
    .select('id, test_id, student_id, status, attempt_type, flagged_reason, tab_switch_count, marked_absent_at, submitted_at')
    .order('submitted_at', { ascending: false });

  if (error) {
    if (!isMissingColumnOrTable(error)) throw error;
    // Fall back to the columns guaranteed by the original schema only.
    const fallback = await supabase
      .from('submissions')
      .select('id, test_id, student_id, status, submitted_at')
      .order('submitted_at', { ascending: false });
    if (fallback.error) throw fallback.error;
    return {
      rows: (fallback.data || []).map((r) => ({ ...r, attempt_type: 'original', flagged_reason: null, tab_switch_count: 0, marked_absent_at: null })),
      notice: 'Attempt-type, tab-switch and attendance fields are not available yet. Run the later supabase/schema_v*.sql migrations to see full audit detail.',
    };
  }
  return { rows: data || [], notice: null };
}

async function loadReopens() {
  const { data, error } = await supabase
    .from('test_reopens')
    .select('id, test_id, student_id, reopened_by, reopened_at, attempt_type, reopen_minutes')
    .order('reopened_at', { ascending: false })
    .limit(10);
  if (error) {
    if (isMissingColumnOrTable(error)) return { list: [], notice: 'Reattempt/make-up tracking is not set up yet. Run supabase/schema_v4_migration.sql.' };
    throw error;
  }
  return { list: data || [], notice: null };
}

async function loadTests() {
  const { data, error } = await supabase
    .from('tests')
    .select('id, title, class, subject, status, start_at, end_at');
  if (error) throw error;
  return data || [];
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') return json(405, { error: 'Method not allowed' });
  if (!requireRole(event, ['super_admin'])) return json(401, { error: 'Not authorized' });

  try {
    const [sessions, submissionsResult, reopensResult, tests] = await Promise.all([
      loadSessions(),
      loadSubmissions(),
      loadReopens(),
      loadTests(),
    ]);

    const submissions = submissionsResult.rows;
    const testIds = [...new Set(submissions.map((s) => s.test_id).concat(reopensResult.list.map((r) => r.test_id)).filter(Boolean))];
    const studentIds = [...new Set(submissions.map((s) => s.student_id).concat(reopensResult.list.map((r) => r.student_id)).filter(Boolean))];
    const teacherIds = [...new Set(reopensResult.list.map((r) => r.reopened_by).filter(Boolean))];

    const [{ data: testRows }, { data: studentRows }, { data: teacherRows }] = await Promise.all([
      testIds.length ? supabase.from('tests').select('id, title').in('id', testIds) : Promise.resolve({ data: [] }),
      studentIds.length ? supabase.from('students').select('id, name, roll_number, class').in('id', studentIds) : Promise.resolve({ data: [] }),
      teacherIds.length ? supabase.from('teachers').select('id, name').in('id', teacherIds) : Promise.resolve({ data: [] }),
    ]);
    const testById = Object.fromEntries((testRows || []).map((t) => [t.id, t]));
    const studentById = Object.fromEntries((studentRows || []).map((s) => [s.id, s]));
    const teacherById = Object.fromEntries((teacherRows || []).map((t) => [t.id, t]));

    const byAttemptType = { original: 0, reopen: 0, make_up: 0 };
    let graded = 0;
    let absent = 0;
    let flagged = 0;
    for (const s of submissions) {
      const type = s.attempt_type || 'original';
      byAttemptType[type] = (byAttemptType[type] || 0) + 1;
      if (s.status === 'graded') graded += 1;
      if (s.marked_absent_at) absent += 1;
      if (s.flagged_reason) flagged += 1;
    }

    const flaggedSubmissions = submissions
      .filter((s) => s.flagged_reason)
      .slice(0, 10)
      .map((s) => ({
        id: s.id,
        test_title: testById[s.test_id]?.title || 'Unknown paper',
        student_name: studentById[s.student_id]?.name || 'Unknown student',
        roll_number: studentById[s.student_id]?.roll_number || null,
        class: studentById[s.student_id]?.class || null,
        tab_switch_count: s.tab_switch_count || 0,
        flagged_reason: s.flagged_reason,
        submitted_at: s.submitted_at,
      }));

    const recentActivity = submissions.slice(0, 15).map((s) => ({
      id: s.id,
      test_title: testById[s.test_id]?.title || 'Unknown paper',
      student_name: studentById[s.student_id]?.name || 'Unknown student',
      class: studentById[s.student_id]?.class || null,
      attempt_type: s.attempt_type || 'original',
      status: s.status,
      flagged: !!s.flagged_reason,
      absent: !!s.marked_absent_at,
      submitted_at: s.submitted_at,
    }));

    const recentReopens = reopensResult.list.map((r) => ({
      id: r.id,
      test_title: testById[r.test_id]?.title || 'Unknown paper',
      student_name: studentById[r.student_id]?.name || 'Unknown student',
      reopened_by_name: teacherById[r.reopened_by]?.name || null,
      attempt_type: r.attempt_type || 'reopen',
      reopen_minutes: r.reopen_minutes ?? null,
      reopened_at: r.reopened_at,
    }));

    const now = Date.now();
    const testTiming = { draft: 0, published: 0, closed: 0, liveNow: 0, upcoming: 0 };
    for (const t of tests) {
      if (t.status === 'draft') testTiming.draft += 1;
      else if (t.status === 'closed') testTiming.closed += 1;
      else testTiming.published += 1;

      const startsAt = t.start_at ? new Date(t.start_at).getTime() : null;
      const endsAt = t.end_at ? new Date(t.end_at).getTime() : null;
      if (t.status === 'published' && startsAt && endsAt) {
        if (now >= startsAt && now <= endsAt) testTiming.liveNow += 1;
        else if (now < startsAt) testTiming.upcoming += 1;
      }
    }

    const notices = [sessions.notice, submissionsResult.notice, reopensResult.notice].filter(Boolean);

    return json(200, {
      sessions: { active: sessions.active, list: sessions.list },
      submissions: {
        total: submissions.length,
        submitted: submissions.length - graded,
        graded,
        absent,
        flagged,
        byAttemptType,
      },
      tests: testTiming,
      flaggedSubmissions,
      recentActivity,
      recentReopens,
      notices,
    });
  } catch (e) {
    return json(500, { error: e.message || 'Could not load administration analytics' });
  }
};
