import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import SchoolLogo from '../components/SchoolLogo.jsx';
import { SCHOOL_NAME, SCHOOL_PLACE, CLASSES } from '../lib/constants.js';
import { api } from '../lib/api.js';
import StudentAvatar from '../components/StudentAvatar.jsx';

const LIMIT = 10;
const MEDALS = { 1: '🥇', 2: '🥈', 3: '🥉' };

function Avatar({ student, large = false }) {
  return (
    <StudentAvatar
      student={student}
      className={`public-rank-avatar ${large ? 'large' : ''}`}
      alt={student?.name || 'Student'}
    />
  );
}
function RankingCard({ student, featured = false }) {
  return (
    <article className={`public-rank-card ${featured ? 'featured' : ''}`}>
      <div className="public-rank-number">#{student.rank}</div>
      {MEDALS[student.rank] && <div className="public-rank-medal">{MEDALS[student.rank]}</div>}
      <Avatar student={student} large={featured} />
      <h3>{student.name}</h3>
      <p>Class {student.class || '—'}</p>
      <strong>{student.average_percent}%</strong>
      <span>Average score · {student.tests_taken} test{student.tests_taken === 1 ? '' : 's'}</span>
    </article>
  );
}

export default function PublicLeaderboard() {
  const [klass, setKlass] = useState('ALL');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const classOptions = useMemo(() => Array.from(new Set(CLASSES || [])).filter(Boolean), []);

  async function load() {
    setError('');
    setData(null);
    try {
      const query = klass === 'ALL' ? `?limit=${LIMIT}` : `?limit=${LIMIT}&class=${encodeURIComponent(klass)}`;
      setData(await api(`/leaderboard-public${query}`));
    } catch (e) {
      setError(e?.message || 'Unable to load rankings');
    }
  }

  useEffect(() => { load(); }, [klass]);

  return (
    <div className="public-leaderboard-page">
      <header className="landing-header landing-header-v2 public-ranking-header">
        <Link to="/" className="landing-brand">
          <SchoolLogo size={58} />
          <div><strong>{SCHOOL_NAME}</strong><small>{SCHOOL_PLACE}</small></div>
        </Link>
        <nav className="landing-nav">
          <Link to="/rankings" className="active">Rankings</Link>
          <div className="portal-menu">
            <button className="portal-menu-trigger" type="button">Portals <span>⌄</span></button>
            <div className="portal-menu-dropdown">
              <Link to="/student/login"><span>🎓</span><div><b>Student</b><small>Student login</small></div></Link>
              <Link to="/teacher/login"><span>🖊️</span><div><b>Teacher</b><small>Teacher login</small></div></Link>
                  </div>
          </div>
        </nav>
      </header>

      <main>
        <section className="public-ranking-hero">
          <span className="hero-copy-kicker">SCHOOL-WIDE RANKINGS</span>
          <h1>Top performers. <em>Every class.</em></h1>
          <p>Celebrate the students who are leading the school leaderboard. Only published results are included, and private roll numbers are never shown here.</p>
        </section>

        <section className="public-ranking-content">
          <div className="public-ranking-toolbar">
            <div>
              <span className="section-kicker">🏆 HALL OF FAME</span>
              <h2>{klass === 'ALL' ? 'Top 10 students across the school' : `Top 10 students — Class ${klass}`}</h2>
            </div>
            <div className="class-filter" role="tablist" aria-label="Filter rankings by class">
              <button className={klass === 'ALL' ? 'active' : ''} onClick={() => setKlass('ALL')}>All classes</button>
              {classOptions.map((c) => <button key={c} className={klass === c ? 'active' : ''} onClick={() => setKlass(c)}>Class {c}</button>)}
            </div>
          </div>

          {error && <div className="public-ranking-error"><b>Rankings are temporarily unavailable.</b><span>{error}</span><button onClick={load}>Try again</button></div>}
          {!data && !error && <div className="public-ranking-loading">Loading the latest published results…</div>}
          {data && data.top?.length === 0 && <div className="public-ranking-empty">No published results are available for this selection yet.</div>}

          {data?.top?.length > 0 && (
            <>
              <div className="public-top-grid">
                {data.top.slice(0, 3).map((student) => <RankingCard key={student.student_id} student={student} featured />)}
              </div>
              <div className="public-ranking-list">
                {data.top.slice(3).map((student) => (
                  <div className="public-ranking-row" key={student.student_id}>
                    <div className="public-row-rank">#{student.rank}</div>
                    <Avatar student={student} />
                    <div className="public-row-student"><b>{student.name}</b><span>Class {student.class || '—'}</span></div>
                    <div className="public-row-score"><b>{student.average_percent}%</b><span>{student.tests_taken} test{student.tests_taken === 1 ? '' : 's'}</span></div>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      </main>

      <footer className="landing-footer public-ranking-footer">
        <div className="footer-school"><SchoolLogo size={52} /><div><strong>{SCHOOL_NAME}</strong><span>{SCHOOL_PLACE}</span><small>Online Test Portal</small></div></div>
        <Link to="/" className="nav-action-button public-back-home">← Back to home</Link>
      </footer>
    </div>
  );
}
