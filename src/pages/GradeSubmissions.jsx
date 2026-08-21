import React, { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, getAuthInfo } from '../lib/api.js';
import PanelLayout from '../components/PanelLayout.jsx';
import { drawWatermarkAndHeader, addFooter } from '../lib/reportExport.js';
import { SCHOOL_NAME } from '../lib/constants.js';

const TEACHER_ITEMS = [
  { to: '/teacher', label: 'Papers', icon: '📄', end: true },
  { to: '/teacher/create', label: 'New paper', icon: '➕' },
  { to: '/teacher/students', label: 'Students', icon: '🎓' },
  { to: '/teacher/leaderboard', label: 'Leaderboard', icon: '🏆' },
];
const ADMIN_ITEMS = [
  { to: '/admin', label: 'Overview', icon: '🏠', end: true },
  { to: '/admin/teachers', label: 'Teachers', icon: '🖊️' },
  { to: '/admin/students', label: 'Students', icon: '🎓' },
  { to: '/admin/papers', label: 'All papers', icon: '📄' },
  { to: '/admin/leaderboard', label: 'Leaderboard', icon: '🏆' },
];

export default function GradeSubmissions() {
  const { testId } = useParams();
  const auth = getAuthInfo();
  const isAdmin = auth?.role === 'super_admin';
  const [subs, setSubs] = useState(null);
  const [subsLoaded, setSubsLoaded] = useState(false);
  const [testMeta, setTestMeta] = useState({});
  const [roster, setRoster] = useState(null);
  const [showMissing, setShowMissing] = useState(false);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [flagFilter, setFlagFilter] = useState('all');
  const [absenceReasons, setAbsenceReasons] = useState({});
  const [attendanceMigrationRequired, setAttendanceMigrationRequired] = useState(false);
  // Optional custom reopen duration (minutes) keyed by student id. Empty
  // string / unset means "use the paper's normal duration_minutes".
  const [reopenMinutes, setReopenMinutes] = useState({});
  const resultsRef = useRef(null);

  function load() {
    setError('');
    setSubsLoaded(false);
    api(`/submissions-list?test_id=${testId}`)
      .then((d) => { setSubs(d.submissions || []); setAttendanceMigrationRequired(!!d.attendanceMigrationRequired); setSubsLoaded(true); })
      .catch((e) => { setSubs([]); setSubsLoaded(false); setError(e.message); });
  }
  useEffect(load, [testId]);

  // Needed so we can offer "reopen" for students who never submitted at all
  // (e.g. they missed the window) — not just ones who submitted early. Also
  // doubles as the source of the paper's title/class/total marks for exports.
  useEffect(() => {
    api(`/test-edit?test_id=${testId}`)
      .then((d) => setTestMeta({
        title: d.test.title,
        class: d.test.class,
        total_marks: d.test.total_marks,
        duration_minutes: d.test.duration_minutes,
      }))
      .catch(() => {});
  }, [testId]);
  useEffect(() => {
    if (!testMeta.class) return;
    api(`/students-list?class=${encodeURIComponent(testMeta.class)}`).then((d) => setRoster(d.students)).catch(() => {});
  }, [testMeta.class]);

  const submittedIds = new Set((subs || []).map((s) => s.students?.id));
  // Only derive 'not submitted' students after the submissions request has
  // successfully loaded. If the API fails (for example because a required
  // migration has not been applied), treating every roster student as missing
  // would incorrectly show submitted students as 'Not submitted'.
  const missing = subsLoaded ? (roster || []).filter((s) => !submittedIds.has(s.id)) : [];
  const flaggedCount = (subs || []).filter((s) => s.flagged_reason).length;
  const absentCount = (subs || []).filter((s) => s.status === 'absent').length;
  const notSubmittedCount = missing.length;
  const gradedCount = (subs || []).filter((s) => s.status === 'graded').length;
  const pendingCount = (subs || []).filter((s) => s.status === 'submitted').length;
  const totalStudents = subsLoaded ? Math.max((roster || []).length, (subs || []).length) : ((subs || []).length || (roster || []).length);

  const allEntries = [
    ...(subs || []).map((s) => ({ ...s, attendanceStatus: s.status === 'absent' ? 'absent' : s.status === 'graded' ? 'graded' : 'submitted' })),
    ...missing.map((student) => ({
      id: `missing-${student.id}`,
      students: student,
      status: 'not_submitted',
      attendanceStatus: 'not_submitted',
      total_marks_awarded: null,
      flagged_reason: null,
    })),
  ];

  const filteredSubs = allEntries.filter((s) => {
    const haystack = `${s.students?.name || ''} ${s.students?.roll_number || ''} ${s.students?.class || ''}`.toLowerCase();
    const matchesSearch = !search || haystack.includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || s.attendanceStatus === statusFilter;
    const matchesFlag = flagFilter === 'all' || (flagFilter === 'flagged' ? !!s.flagged_reason : !s.flagged_reason);
    return matchesSearch && matchesStatus && matchesFlag;
  });

  async function setAbsent(studentId, name, reason) {
    if (attendanceMigrationRequired) {
      setError('Attendance is not enabled yet. Run supabase/schema_v10_migration.sql in Supabase, then reload this page.');
      return;
    }
    if (!reason?.trim()) {
      setError(`Please enter a reason for ${name}'s absence.`);
      return;
    }
    if (!window.confirm(`Mark ${name} as absent for this test?`)) return;
    try {
      await api('/submission-absence', { method: 'POST', body: { test_id: testId, student_id: studentId, action: 'mark', reason: reason.trim() } });
      setAbsenceReasons((current) => ({ ...current, [studentId]: '' }));
      load();
    } catch (e) { setError(e.message); }
  }

  async function unmarkAbsent(studentId, name) {
    if (!window.confirm(`Remove the absent mark for ${name}? They will return to “Not submitted”.`)) return;
    try {
      await api('/submission-absence', { method: 'POST', body: { test_id: testId, student_id: studentId, action: 'unmark' } });
      setAbsenceReasons((current) => ({ ...current, [studentId]: '' }));
      load();
    } catch (e) { setError(e.message); }
  }

  async function removeSubmission(id, name) {
    if (!window.confirm(`Delete ${name}'s submission and answer copy? This cannot be undone.`)) return;
    try {
      await api('/submission-delete', { method: 'POST', body: { submission_id: id } });
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function reopenFor(studentId, name) {
    const customMinutes = reopenMinutes[studentId];
    const usingCustom = customMinutes !== undefined && customMinutes !== '';
    const confirmMsg = usingCustom
      ? `Reopen this test for ${name} with a ${customMinutes}-minute window starting now? Any existing submission of theirs will be cleared — no one else is affected.`
      : `Reopen this test for ${name}? They'll get the paper's normal ${testMeta.duration_minutes || 30}-minute duration starting now. Any existing submission of theirs will be cleared — no one else is affected.`;
    if (!window.confirm(confirmMsg)) return;
    try {
      await api('/submission-reopen', {
        method: 'POST',
        body: { test_id: testId, student_id: studentId, minutes: usingCustom ? customMinutes : undefined },
      });
      setReopenMinutes((m) => ({ ...m, [studentId]: '' }));
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  function ReopenControls({ studentId, name }) {
    return (
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <input
          type="text"
          inputMode="numeric"
          placeholder={`${testMeta.duration_minutes || 30} min`}
          title="Custom minutes for this reopened attempt (leave blank for the paper's normal duration)"
          value={reopenMinutes[studentId] ?? ''}
          onChange={(e) => setReopenMinutes((m) => ({ ...m, [studentId]: e.target.value.replace(/[^0-9]/g, '') }))}
          style={{ width: 64, padding: '6px 8px', fontSize: '0.78rem' }}
        />
        <button className="secondary small" onClick={() => reopenFor(studentId, name)}>
          🔓 Reopen
        </button>
      </div>
    );
  }

  const fileBase = (testMeta.title || 'results').replace(/[^a-z0-9]+/gi, '-').toLowerCase();

  async function exportExcel() {
    if (!allEntries || allEntries.length === 0) return;
    setExporting('xlsx');
    try {
      const XLSX = await import('xlsx');
      const header = [
        [SCHOOL_NAME],
        [`${testMeta.title || ''} — Class ${testMeta.class || ''} — Out of ${testMeta.total_marks ?? ''}`],
        [],
        ['Roll', 'Name', 'Class', 'Score', 'Out of', 'Percent', 'Status', 'Flagged'],
      ];
      const rows = allEntries.map((s) => {
        const pct = s.total_marks_awarded != null && testMeta.total_marks
          ? Math.round((s.total_marks_awarded / testMeta.total_marks) * 1000) / 10
          : '';
        return [
          s.students?.roll_number ?? '',
          s.students?.name ?? '',
          s.students?.class ?? '',
          s.total_marks_awarded ?? '',
          testMeta.total_marks ?? '',
          pct === '' ? '' : `${pct}%`,
          s.attendanceStatus === 'not_submitted' ? 'Not submitted' : s.status,
          s.absence_reason ? `Absent: ${s.absence_reason}` : (s.flagged_reason ? `Yes (${s.tab_switch_count} tab switches)` : 'No'),
        ];
      });
      const ws = XLSX.utils.aoa_to_sheet([...header, ...rows]);
      ws['!cols'] = [8, 24, 8, 8, 8, 9, 10, 22].map((wch) => ({ wch }));
      ws['!merges'] = [0, 1].map((r) => ({ s: { r, c: 0 }, e: { r, c: 7 } }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Results');
      XLSX.writeFile(wb, `${fileBase}.xlsx`);
    } catch (e) {
      setError('Could not generate the Excel file: ' + e.message);
    } finally {
      setExporting('');
    }
  }

  async function exportPDF() {
    if (!allEntries || allEntries.length === 0) return;
    setExporting('pdf');
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      let y = await drawWatermarkAndHeader(doc, {
        title: `${testMeta.title || 'Test results'} — Report`,
        subtitle: `Class ${testMeta.class || ''} · Total marks ${testMeta.total_marks ?? ''}`,
      });

      doc.setFont(undefined, 'bold');
      doc.setFontSize(10);
      doc.text('Roll', 14, y);
      doc.text('Name', 38, y);
      doc.text('Score', 128, y);
      doc.text('%', 153, y);
      doc.text('Status', 172, y);
      doc.setDrawColor(220);
      doc.line(14, y + 2, 196, y + 2);
      doc.setFont(undefined, 'normal');
      y += 8;

      allEntries.forEach((s) => {
        if (y > 275) {
          doc.addPage();
          y = 20;
        }
        const pct = s.total_marks_awarded != null && testMeta.total_marks
          ? `${Math.round((s.total_marks_awarded / testMeta.total_marks) * 1000) / 10}%`
          : '-';
        doc.text(String(s.students?.roll_number ?? ''), 14, y);
        doc.text(String(s.students?.name ?? '').slice(0, 40), 38, y);
        doc.text(`${s.total_marks_awarded ?? '-'} / ${testMeta.total_marks ?? '-'}`, 128, y);
        doc.text(pct, 153, y);
        doc.text(s.attendanceStatus === 'not_submitted' ? 'Not submitted' : s.status === 'absent' ? 'Absent' : (s.flagged_reason ? 'Flagged' : s.status), 172, y);
        y += 7;
      });

      addFooter(doc);
      doc.save(`${fileBase}.pdf`);
    } catch (e) {
      setError('Could not generate the PDF: ' + e.message);
    } finally {
      setExporting('');
    }
  }

  async function exportImage() {
    if (!resultsRef.current) return;
    setExporting('jpg');
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(resultsRef.current, { backgroundColor: '#ffffff', scale: 2 });
      const link = document.createElement('a');
      link.download = `${fileBase}.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 0.95);
      link.click();
    } catch (e) {
      setError('Could not generate the image: ' + e.message);
    } finally {
      setExporting('');
    }
  }

  return (
    <PanelLayout items={isAdmin ? ADMIN_ITEMS : TEACHER_ITEMS}>
      <Link to={isAdmin ? '/admin/papers' : '/teacher'}>&larr; Back to papers</Link>
      <div className="submission-page-head">
        <div>
          <Link to={isAdmin ? '/admin/papers' : '/teacher'}>&larr; Back to papers</Link>
          <div className="eyebrow" style={{marginTop: 14}}>Assessment operations</div>
          <h2>Submissions{testMeta.title ? ` — ${testMeta.title}` : ''}</h2>
          <p className="meta">Track every student, grade submitted papers, and record attendance.</p>
        </div>
        <div className="submission-head-badge">📋 {testMeta.class || 'Class'}</div>
      </div>
      {error && <div className="error-box">{error}</div>}
      {!subsLoaded && !error && <p className="center-note">Loading submissions…</p>}
      {attendanceMigrationRequired && (
        <div className="notice-strip notice-warning" style={{ display: 'block', marginBottom: 14 }}>
          <strong>Attendance setup required.</strong> Submitted and graded attempts are shown correctly, but absent marking is disabled until <code>supabase/schema_v10_migration.sql</code> is run in Supabase.
        </div>
      )}

      {flaggedCount > 0 && (
        <div className="notice-strip notice-danger" style={{ display: 'block', marginBottom: 14 }}>
          ⚠ {flaggedCount} submission{flaggedCount === 1 ? '' : 's'} flagged for repeated tab/window
          switching — review the ⚠ Flagged badge below before publishing results.
        </div>
      )}

      {(subs || roster) && (
        <>
        <div className="grade-review-stats">
          <div className="grade-stat-card"><span className="grade-stat-icon">👥</span><strong>{totalStudents}</strong><small>Students</small></div>
          <div className="grade-stat-card success"><span className="grade-stat-icon">✓</span><strong>{gradedCount}</strong><small>Graded</small></div>
          <div className="grade-stat-card warning"><span className="grade-stat-icon">⏳</span><strong>{pendingCount}</strong><small>Pending grading</small></div>
          <div className="grade-stat-card danger"><span className="grade-stat-icon">✕</span><strong>{absentCount}</strong><small>Absent</small></div>
          <div className="grade-stat-card neutral"><span className="grade-stat-icon">◌</span><strong>{notSubmittedCount}</strong><small>Not submitted</small></div>
          <div className="grade-stat-card flag"><span className="grade-stat-icon">⚠</span><strong>{flaggedCount}</strong><small>Flagged</small></div>
        </div>
        <div className="grade-review-toolbar">
          <div>
            <strong>Submission & attendance management</strong>
            <div className="meta">{filteredSubs.length} of {allEntries.length} shown · mark absent, record a reason, reopen or review submissions</div>
          </div>
          <div className="grade-review-filters">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search student or roll…" aria-label="Search submissions" />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All students</option>
              <option value="submitted">Pending grading</option>
              <option value="graded">Graded</option>
              <option value="absent">Absent</option>
              <option value="not_submitted">Not submitted</option>
            </select>
            <select value={flagFilter} onChange={(e) => setFlagFilter(e.target.value)}>
              <option value="all">All attempts</option>
              <option value="flagged">Flagged only</option>
              <option value="clear">Not flagged</option>
            </select>
            <button className="secondary small" onClick={() => { setSearch(''); setStatusFilter('all'); setFlagFilter('all'); }}>Reset</button>
          </div>
        </div>
        <div className="export-bar">
          <span className="meta">Download results as:</span>
          <button className="secondary small" onClick={exportExcel} disabled={!!exporting}>
            {exporting === 'xlsx' ? 'Preparing…' : '⬇ Excel'}
          </button>
          <button className="secondary small" onClick={exportPDF} disabled={!!exporting}>
            {exporting === 'pdf' ? 'Preparing…' : '⬇ PDF report'}
          </button>
          <button className="secondary small" onClick={exportImage} disabled={!!exporting}>
            {exporting === 'jpg' ? 'Preparing…' : '🖼 Image (JPEG)'}
          </button>
        </div>
        </>
      )}

      {subs && subs.length === 0 && <div className="card center-note">No submissions yet.</div>}

      {allEntries.length > 0 && (
        <div ref={resultsRef}>
          {filteredSubs.map((s) => {
            const isAbsent = s.attendanceStatus === 'absent';
            const isMissing = s.attendanceStatus === 'not_submitted';
            return (
              <div className={`grade-submission-card ${isAbsent ? 'is-absent' : ''} ${isMissing ? 'is-missing' : ''}`} key={s.id}>
                <div>
                  <div className="grade-submission-name">{s.students?.name}</div>
                  <div className="grade-submission-meta">Roll {s.students?.roll_number} · {s.students?.class}</div>
                  {isAbsent && <div className="absence-reason-display"><strong>Absence reason:</strong> {s.absence_reason || 'No reason recorded'}</div>}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className={`pill ${s.attendanceStatus === 'graded' ? 'graded' : s.attendanceStatus === 'absent' ? 'danger' : s.attendanceStatus === 'not_submitted' ? 'pending' : 'pending'}`}>
                    {isAbsent ? 'Absent' : isMissing ? 'Not submitted' : s.status === 'submitted' ? 'Pending grading' : s.status === 'graded' ? 'Graded' : s.status}
                  </span>
                  {s.flagged_reason && <span className="pill danger" style={{ marginLeft: 6 }}>⚠ Flagged</span>}
                  {isAbsent || isMissing ? (
                    <div className="absence-controls">
                      <input
                        value={absenceReasons[s.students?.id] ?? (isAbsent ? (s.absence_reason || '') : '')}
                        onChange={(e) => setAbsenceReasons((current) => ({ ...current, [s.students?.id]: e.target.value }))}
                        placeholder={isAbsent ? 'Update reason…' : 'Reason for absence…'}
                        aria-label={`Absence reason for ${s.students?.name}`}
                      />
                      <button className="secondary small" disabled={attendanceMigrationRequired} onClick={() => isAbsent ? setAbsent(s.students.id, s.students.name, absenceReasons[s.students.id] ?? s.absence_reason) : setAbsent(s.students.id, s.students.name, absenceReasons[s.students.id])}>
                        {isAbsent ? 'Save reason' : attendanceMigrationRequired ? 'Migration required' : 'Mark absent'}
                      </button>
                      {isAbsent && <button className="ghost small" onClick={() => unmarkAbsent(s.students.id, s.students.name)}>Unmark</button>}
                      {isMissing && <ReopenControls studentId={s.students?.id} name={s.students?.name} />}
                    </div>
                  ) : (
                    <div className="grade-submission-actions">
                      <Link to={`${isAdmin ? '/admin' : '/teacher'}/submission/${s.id}`}>
                        <button className="secondary">{s.status === 'graded' ? `Review · ${s.total_marks_awarded ?? 0}` : 'Open grading'}</button>
                      </Link>
                      <ReopenControls studentId={s.students?.id} name={s.students?.name} />
                      <button className="danger small" onClick={() => removeSubmission(s.id, s.students?.name)}>Delete</button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {filteredSubs.length === 0 && <div className="card center-note">No students match these filters.</div>}
        </div>
      )}

      {subs && subs.length === 0 && !roster && <div className="card center-note">No submissions yet.</div>}

    </PanelLayout>
  );
}
