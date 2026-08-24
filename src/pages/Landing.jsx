import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import SchoolLogo from '../components/SchoolLogo.jsx';
import { SCHOOL_NAME, SCHOOL_PLACE } from '../lib/constants.js';
import { api } from '../lib/api.js';
import StudentAvatar from '../components/StudentAvatar.jsx';

const HERO_RANK_LIMIT = 10;

function StudentAvatarCard({ student, large = false }) {
  return (
    <StudentAvatar
      student={student}
      className={large ? 'rank-avatar large' : 'rank-avatar'}
      alt={student?.name || 'Student'}
    />
  );
}
function RankingSlider() {
  const [students, setStudents] = useState(null);
  const [active, setActive] = useState(0);
  const [error, setError] = useState('');

  const loadRankings = async () => {
    setError('');
    setStudents(null);
    try {
      const data = await api(`/leaderboard-public?limit=${HERO_RANK_LIMIT}`);
      const top = Array.isArray(data?.top) ? data.top : [];
      setStudents(top);
      setActive(0);
    } catch (e) {
      setStudents([]);
      setError(e?.message || 'Unable to load rankings');
    }
  };

  useEffect(() => { loadRankings(); }, []);

  useEffect(() => {
    if (!students?.length) return undefined;
    const timer = setInterval(() => setActive((i) => (i + 1) % students.length), 4200);
    return () => clearInterval(timer);
  }, [students]);

  const visible = useMemo(() => {
    if (!students?.length) return [];
    // Never wrap the side cards. Rank #10 must not appear beside rank #1.
    // The carousel itself wraps only when moving from #10 to #1.
    const items = [];
    if (active > 0) items.push({ student: students[active - 1], offset: -1 });
    items.push({ student: students[active], offset: 0 });
    if (active < students.length - 1) items.push({ student: students[active + 1], offset: 1 });
    return items;
  }, [students, active]);

  return (
    <div className="hero-ranking-panel">
      <div className="hero-ranking-header">
        <div>
          <span className="hero-ranking-kicker">🏆 TOP PERFORMERS</span>
          <h2>Our students are making their mark.</h2>
        </div>
        <Link to="/leaderboard" className="hero-ranking-link">View all →</Link>
      </div>

      {!students && (
        <div className="hero-ranking-state">
          <div className="hero-ranking-spinner" />
          <span>Loading the latest school rankings…</span>
        </div>
      )}

      {students?.length === 0 && !error && (
        <div className="hero-ranking-state">
          <span>Rankings will appear here once results are published.</span>
        </div>
      )}

      {error && (
        <div className="hero-ranking-state error">
          <strong>Rankings are temporarily unavailable.</strong>
          <small>{error}</small>
          <button onClick={loadRankings}>Try again</button>
        </div>
      )}

      {students?.length > 0 && (
        <>
          <div className="hero-ranking-track">
            {visible.map(({ student, offset }) => (
              <button
                key={`${student.student_id}-${offset}`}
                className={`hero-ranking-card rank-offset-${offset}`}
                onClick={() => setActive((active + offset + students.length) % students.length)}
                aria-label={`View rank ${student.rank}, ${student.name}`}
              >
                <div className="hero-rank-badge">#{student.rank}</div>
                <StudentAvatar student={student} className="rank-avatar" large={offset === 0} />
                {student.rank <= 3 && <div className="hero-rank-medal">{student.rank === 1 ? '🥇' : student.rank === 2 ? '🥈' : '🥉'}</div>}
                <strong>{student.name}</strong>
                <span>Class {student.class || '—'}</span>
                <b>{student.average_percent}% <small>average</small></b>
              </button>
            ))}
          </div>
          <div className="hero-ranking-controls">
            <button onClick={() => setActive((active - 1 + students.length) % students.length)} aria-label="Previous ranked student">←</button>
            <div className="hero-ranking-dots">
              {students.map((student, index) => (
                <button key={student.student_id} className={index === active ? 'active' : ''} onClick={() => setActive(index)} aria-label={`Show rank ${student.rank}`} />
              ))}
            </div>
            <button onClick={() => setActive((active + 1) % students.length)} aria-label="Next ranked student">→</button>
          </div>
        </>
      )}
    </div>
  );
}

function PortalMenu() {
  return (
    <div className="portal-menu">
      <button className="portal-menu-trigger" type="button">Portals <span>⌄</span></button>
      <div className="portal-menu-dropdown">
        <Link to="/student/login"><span>🎓</span><div><b>Student</b><small>Student login</small></div></Link>
        <Link to="/teacher/login"><span>🖊️</span><div><b>Teacher</b><small>Teacher login</small></div></Link>
      </div>
    </div>
  );
}

export default function Landing() {
  return (
    <div className="landing-page landing-v2">
      <header className="landing-header landing-header-v2">
        <Link to="/" className="landing-brand">
          <SchoolLogo size={58} />
          <div><strong>{SCHOOL_NAME}</strong><small>{SCHOOL_PLACE}</small></div>
        </Link>
        <nav className="landing-nav">
          <Link to="/rankings">Rankings</Link>
          <PortalMenu />
        </nav>
      </header>

      <main className="landing-hero-combined">
        <div className="hero-copy-column">
          <span className="hero-copy-kicker">ONLINE ASSESSMENT PORTAL</span>
          <h1>Learn. Compete.<br /><em>Achieve your best.</em></h1>
          <p>A modern assessment experience for {SCHOOL_NAME} — secure tests, meaningful results and a school-wide leaderboard that turns every achievement into motivation.</p>
          <div className="hero-actions">
            <Link to="/student/login" className="landing-primary-btn">🎓 Student Login <b>→</b></Link>
            <Link to="/rankings" className="landing-secondary-btn">🏆 View Rankings</Link>
          </div>
        </div>

        <div className="hero-right-column">
          <div className="hero-feature-points">
            <div><span>📝</span><b>Every question type</b><small>MCQ, written &amp; practical</small></div>
            <div><span>🛡️</span><b>Secure assessment</b><small>Shuffling &amp; tab tracking</small></div>
            <div><span>🏆</span><b>Instant progress</b><small>Results &amp; leaderboards</small></div>
          </div>
          <RankingSlider />
        </div>
      </main>

      <section className="landing-security-note">
        <div><span>🔐</span><div><b>Separate secure portals</b><small>Student, Teacher and Administration access is kept behind login. Public pages only show published ranking information.</small></div></div>
        <Link to="/rankings">Explore the Top 10 →</Link>
      </section>

      <footer className="landing-footer"><div className="footer-school"><SchoolLogo size={52} /><div><strong>{SCHOOL_NAME}</strong><span>{SCHOOL_PLACE}</span><small>Online Test Portal</small></div></div><div className="footer-motto"><span>“</span><p>Vidya Dadati Vinayam</p></div></footer>
    </div>
  );
}
