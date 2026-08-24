import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, getAuthInfo } from '../lib/api.js';
import StudentAvatar from '../components/StudentAvatar.jsx';
import PanelLayout from '../components/PanelLayout.jsx';
import SchoolLogo from '../components/SchoolLogo.jsx';
import { CLASSES, SCHOOL_NAME } from '../lib/constants.js';
import { drawWatermarkAndHeader, addFooter } from '../lib/reportExport.js';

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

const MEDAL = { 1: '🥇', 2: '🥈', 3: '🥉' };

function initials(name) {
  return (name || '?').trim().split(/\s+/).slice(0, 2).map((n) => n[0]?.toUpperCase() || '').join('');
}

// Top-3 podium with photos that gently auto-rotates its emphasis (a light
// "slider" feel) between rank 1/2/3 every few seconds, so the leaderboard
// page has some life to it instead of sitting static. Clicking a dot jumps
// straight to that rank. Falls back to nothing if there are no rows yet.
function Podium({ rows, highlightId }) {
  const top3 = rows.slice(0, 3);
  const [focusIdx, setFocusIdx] = useState(0);

  useEffect(() => {
    if (top3.length <= 1) return;
    const id = setInterval(() => setFocusIdx((i) => (i + 1) % top3.length), 3500);
    return () => clearInterval(id);
  }, [top3.length]);

  if (top3.length === 0) return null;

  return (
    <>
      <div className="lb-podium">
        {top3.map((r, i) => (
          <div
            key={r.student_id}
            className={`lb-podium-card rank-${r.rank} ${r.student_id === highlightId ? 'leaderboard-me' : ''}`}
            style={{ opacity: i === focusIdx ? 1 : 0.72, transition: 'opacity 0.4s ease, transform 0.4s ease' }}
          >
            <div className="lb-podium-medal">{MEDAL[r.rank]}</div>
            <div className="lb-podium-photo">
              <StudentAvatar student={r} className="lb-podium-student-avatar" alt={r.name} />
            </div>
            <div className="lb-podium-name">{r.name}{r.student_id === highlightId ? ' (you)' : ''}</div>
            <div className="lb-podium-score">{r.average_percent}%</div>
          </div>
        ))}
      </div>
      {top3.length > 1 && (
        <div className="lb-slider-wrap">
          {top3.map((r, i) => (
            <span
              key={r.student_id}
              className={`lb-slider-dot ${i === focusIdx ? 'active' : ''}`}
              onClick={() => setFocusIdx(i)}
            />
          ))}
        </div>
      )}
    </>
  );
}

function LeaderboardTable({ rows, highlightId, testsCounted }) {
  if (testsCounted === 0) {
    return (
      <div className="card center-note">
        No published results yet for this class — the leaderboard fills in as soon as a teacher publishes a
        result.
      </div>
    );
  }
  if (rows.length === 0) {
    return <div className="card center-note">No graded, published submissions yet for this class.</div>;
  }
  return (
    <>
      <Podium rows={rows} highlightId={highlightId} />
      <div className="card">
        <table className="grade-table">
          <thead>
            <tr><th>Rank</th><th>Student</th><th>Roll</th><th>Avg. score</th><th>Tests</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.student_id} className={r.student_id === highlightId ? 'leaderboard-me' : ''}>
                <td>{MEDAL[r.rank] || `#${r.rank}`}</td>
                <td>{r.name}{r.student_id === highlightId ? ' (you)' : ''}</td>
                <td>{r.roll_number}</td>
                <td>{r.average_percent}%</td>
                <td>{r.tests_taken}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default function Leaderboard() {
  const auth = getAuthInfo();
  const isStudent = auth?.role === 'student';
  const isAdmin = auth?.role === 'super_admin';
  const classOptions = isAdmin ? CLASSES : (auth?.classes || []);

  const [klass, setKlass] = useState(isStudent ? auth?.class : (classOptions[0] || ''));
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState('');

  useEffect(() => {
    if (!klass) return;
    setData(null);
    setError('');
    api(`/leaderboard?class=${encodeURIComponent(klass)}`)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [klass]);

  const fileBase = `leaderboard-class-${String(klass || 'class').toLowerCase()}`;

  async function exportExcel() {
    if (!data || data.leaderboard.length === 0) return;
    setExporting('xlsx');
    try {
      const XLSX = await import('xlsx');
      const header = [
        [SCHOOL_NAME],
        [`Class ${klass} Leaderboard — ranked by average score across every published test`],
        [],
        ['Rank', 'Name', 'Roll', 'Average %', 'Tests taken'],
      ];
      const rows = data.leaderboard.map((r) => [r.rank, r.name, r.roll_number, `${r.average_percent}%`, r.tests_taken]);
      const ws = XLSX.utils.aoa_to_sheet([...header, ...rows]);
      ws['!merges'] = [0, 1].map((r) => ({ s: { r, c: 0 }, e: { r, c: 4 } }));
      ws['!cols'] = [8, 24, 8, 12, 12].map((wch) => ({ wch }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Leaderboard');
      XLSX.writeFile(wb, `${fileBase}.xlsx`);
    } catch (e) {
      setError('Could not generate the Excel file: ' + e.message);
    } finally {
      setExporting('');
    }
  }

  async function exportPDF() {
    if (!data || data.leaderboard.length === 0) return;
    setExporting('pdf');
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      let y = await drawWatermarkAndHeader(doc, {
        title: `Class ${klass} Leaderboard`,
        subtitle: 'Ranked by average score across every published test',
      });

      doc.setFont(undefined, 'bold');
      doc.setFontSize(10);
      doc.text('Rank', 14, y);
      doc.text('Name', 38, y);
      doc.text('Roll', 120, y);
      doc.text('Avg %', 145, y);
      doc.text('Tests', 175, y);
      doc.setDrawColor(220);
      doc.line(14, y + 2, 196, y + 2);
      doc.setFont(undefined, 'normal');
      y += 8;

      data.leaderboard.forEach((r) => {
        if (y > 275) {
          doc.addPage();
          y = 20;
        }
        doc.text(String(r.rank), 14, y);
        doc.text(String(r.name).slice(0, 40), 38, y);
        doc.text(String(r.roll_number), 120, y);
        doc.text(`${r.average_percent}%`, 145, y);
        doc.text(String(r.tests_taken), 175, y);
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

  const description = (
    <p className="meta" style={{ marginTop: -6, marginBottom: 16 }}>
      Ranked by average score across every test whose result has been published for this class.
    </p>
  );

  const exportBar = data && data.leaderboard.length > 0 && (
    <div className="export-bar">
      <span className="meta">Download leaderboard as:</span>
      <button className="secondary small" onClick={exportExcel} disabled={!!exporting}>
        {exporting === 'xlsx' ? 'Preparing…' : '⬇ Excel'}
      </button>
      <button className="secondary small" onClick={exportPDF} disabled={!!exporting}>
        {exporting === 'pdf' ? 'Preparing…' : '⬇ PDF report'}
      </button>
    </div>
  );

  if (isStudent) {
    return (
      <div className="container">
        <div className="card test-header-card">
          <div className="test-header-brand">
            <SchoolLogo size={40} />
            <div>
              <div className="test-header-school">{SCHOOL_NAME}</div>
              <h2 style={{ margin: 0 }}>🏆 Class Leaderboard</h2>
            </div>
          </div>
          <Link className="nav-action-button" to="/student/dashboard">← Back to tests</Link>
        </div>

        {description}
        {error && <div className="error-box">{error}</div>}
        {!data && !error && <p className="center-note">Loading…</p>}
        {data && <LeaderboardTable rows={data.leaderboard} highlightId={auth?.student_id} testsCounted={data.tests_counted} />}
        {exportBar}
      </div>
    );
  }

  return (
    <PanelLayout items={isAdmin ? ADMIN_ITEMS : TEACHER_ITEMS}>
      <h2>🏆 Class Leaderboard{klass ? ` — ${klass}` : ''}</h2>
      {description}

      <div className="card filter-bar" style={{ maxWidth: 260 }}>
        <select value={klass} onChange={(e) => setKlass(e.target.value)}>
          {classOptions.length === 0 && <option value="">No class assigned</option>}
          {classOptions.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {error && <div className="error-box">{error}</div>}
      {!data && !error && klass && <p className="center-note">Loading…</p>}
      {data && <LeaderboardTable rows={data.leaderboard} highlightId={auth?.student_id} testsCounted={data.tests_counted} />}
      {exportBar}
    </PanelLayout>
  );
}
