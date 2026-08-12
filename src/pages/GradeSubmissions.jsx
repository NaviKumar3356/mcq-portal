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
  const [testMeta, setTestMeta] = useState({});
  const [roster, setRoster] = useState(null);
  const [showMissing, setShowMissing] = useState(false);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState('');
  // Optional custom reopen duration (minutes) keyed by student id. Empty
  // string / unset means "use the paper's normal duration_minutes".
  const [reopenMinutes, setReopenMinutes] = useState({});
  const resultsRef = useRef(null);

  function load() {
    api(`/submissions-list?test_id=${testId}`)
      .then((d) => setSubs(d.submissions))
      .catch((e) => setError(e.message));
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
  const missing = (roster || []).filter((s) => !submittedIds.has(s.id));
  const flaggedCount = (subs || []).filter((s) => s.flagged_reason).length;

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
    if (!subs || subs.length === 0) return;
    setExporting('xlsx');
    try {
      const XLSX = await import('xlsx');
      const header = [
        [SCHOOL_NAME],
        [`${testMeta.title || ''} — Class ${testMeta.class || ''} — Out of ${testMeta.total_marks ?? ''}`],
        [],
        ['Roll', 'Name', 'Class', 'Score', 'Out of', 'Percent', 'Status', 'Flagged'],
      ];
      const rows = subs.map((s) => {
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
          s.status,
          s.flagged_reason ? `Yes (${s.tab_switch_count} tab switches)` : 'No',
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
    if (!subs || subs.length === 0) return;
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

      subs.forEach((s) => {
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
        doc.text(s.flagged_reason ? 'Flagged' : s.status, 172, y);
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
      <h2>Submissions{testMeta.title ? ` — ${testMeta.title}` : ''}</h2>
      {error && <div className="error-box">{error}</div>}
      {!subs && !error && <p className="center-note">Loading…</p>}

      {flaggedCount > 0 && (
        <div className="notice-strip notice-danger" style={{ display: 'block', marginBottom: 14 }}>
          ⚠ {flaggedCount} submission{flaggedCount === 1 ? '' : 's'} flagged for repeated tab/window
          switching — review the ⚠ Flagged badge below before publishing results.
        </div>
      )}

      {subs && subs.length > 0 && (
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
      )}

      {subs && subs.length === 0 && <div className="card center-note">No submissions yet.</div>}

      {subs && subs.length > 0 && (
        <div className="card" ref={resultsRef}>
          {subs.map((s) => (
            <div className="test-row" key={s.id}>
              <div>
                <div style={{ fontWeight: 600 }}>{s.students?.name}</div>
                <div className="meta">Roll {s.students?.roll_number} · {s.students?.class}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span className={`pill ${s.status === 'graded' ? 'graded' : 'pending'}`}>{s.status}</span>
                {s.flagged_reason && (
                  <span
                    className="pill danger"
                    style={{ marginLeft: 6 }}
                    title={`Switched tabs/left the test window ${s.tab_switch_count} time${s.tab_switch_count === 1 ? '' : 's'} — auto-submitted`}
                  >
                    ⚠ Flagged
                  </span>
                )}
                <div style={{ marginTop: 8, display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap', alignItems: 'center' }}>
                  <Link to={`${isAdmin ? '/admin' : '/teacher'}/submission/${s.id}`}>
                    <button className="secondary">
                      {s.status === 'graded' ? `Review (${s.total_marks_awarded})` : 'Grade'}
                    </button>
                  </Link>
                  <ReopenControls studentId={s.students?.id} name={s.students?.name} />
                  <button className="danger small" onClick={() => removeSubmission(s.id, s.students?.name)}>Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="card-section-title" style={{ marginBottom: 0 }}>
            🔓 Grant access to students who haven't submitted
          </div>
          <button className="secondary small" onClick={() => setShowMissing((v) => !v)}>
            {showMissing ? 'Hide' : `Show (${missing.length})`}
          </button>
        </div>
        {showMissing && (
          missing.length === 0 ? (
            <p className="meta" style={{ marginTop: 10 }}>Every student in this class has a submission.</p>
          ) : (
            <div style={{ marginTop: 10 }}>
              <p className="meta">
                Leave the minutes box blank to give the paper's normal {testMeta.duration_minutes || 30}-minute
                duration, or enter a custom number of minutes for just this student's attempt.
              </p>
              {missing.map((st) => (
                <div className="test-row" key={st.id}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{st.name}</div>
                    <div className="meta">Roll {st.roll_number} · {st.class}</div>
                  </div>
                  <ReopenControls studentId={st.id} name={st.name} />
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </PanelLayout>
  );
}
