import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, getAuthInfo } from '../lib/api.js';
import PanelLayout from '../components/PanelLayout.jsx';
import SchoolLogo from '../components/SchoolLogo.jsx';
import { CLASSES, SCHOOL_NAME } from '../lib/constants.js';

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

  useEffect(() => {
    if (!klass) return;
    setData(null);
    setError('');
    api(`/leaderboard?class=${encodeURIComponent(klass)}`)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [klass]);

  const description = (
    <p className="meta" style={{ marginTop: -6, marginBottom: 16 }}>
      Ranked by average score across every test whose result has been published for this class.
    </p>
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
          <Link to="/student/dashboard"><button className="secondary">&larr; Back to tests</button></Link>
        </div>

        {description}
        {error && <div className="error-box">{error}</div>}
        {!data && !error && <p className="center-note">Loading…</p>}
        {data && <LeaderboardTable rows={data.leaderboard} highlightId={auth?.student_id} testsCounted={data.tests_counted} />}
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
    </PanelLayout>
  );
}
