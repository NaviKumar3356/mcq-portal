import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import SchoolLogo from '../components/SchoolLogo.jsx';
import { SCHOOL_NAME, SCHOOL_PLACE } from '../lib/constants.js';
import { api, getPhotoUrl } from '../lib/api.js';

function initials(name) {
  return (name || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() || '')
    .join('');
}

// One ribbon-medal rank row — reused by the landing page's Hall of Fame
// and by /leaderboard, so ranking always looks the same everywhere.
// rankClass falls back to "rank-other" for anything past 5th.
export function RankRow({ s, highlightId }) {
  const rankClass = s.rank <= 5 ? `rank-${s.rank}` : 'rank-other';
  const isMe = s.student_id === highlightId;
  return (
    <div className={`rank-row ${rankClass} ${isMe ? 'rank-me' : ''}`}>
      <div className="rank-medal">{s.rank}</div>
      <div className="rank-row-photo">
        {s.photo_path ? <img src={getPhotoUrl(s.photo_path)} alt={s.name} /> : initials(s.name)}
      </div>
      <div className="rank-row-info">
        <div className="rank-row-name">{s.name}{isMe ? ' (you)' : ''}</div>
        <div className="rank-row-class">Class {s.class}{s.roll_number ? ` · Roll ${s.roll_number}` : ''}</div>
      </div>
      <div className="rank-row-score">{s.average_percent}%</div>
    </div>
  );
}

// Public, unauthenticated "Hall of Fame" — top 5 performers school-wide,
// ranked by average score across every published test, shown as ribbon
// badges (matching the school's printed PTM rank-holder posters) so it
// reads as a real award board rather than a generic table.
function HallOfFame() {
  const [top, setTop] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    api('/leaderboard-public?limit=5')
      .then((d) => setTop(d.top))
      .catch(() => setFailed(true));
  }, []);

  if (failed) return null; // fail silently on a public marketing page
  if (top && top.length === 0) return null; // nothing published yet — don't show an empty section

  return (
    <section className="hof-section">
      <div className="section-heading">
        <span />
        <div>
          <h2>🏆 Hall of Fame</h2>
          <p>This school's top performers — inspire, compete, and climb the board</p>
        </div>
        <span />
      </div>

      {!top && <p className="center-note">Loading leaderboard…</p>}

      {top && top.length > 0 && (
        <>
          <div className="rank-board">
            {top.map((s) => <RankRow s={s} key={s.student_id} />)}
          </div>

          <p className="meta" style={{ textAlign: 'center', marginTop: 16 }}>
            Ranked by average score across every published test, school-wide. Log in to see your own class's
            leaderboard too.
          </p>
        </>
      )}
    </section>
  );
}

export default function Landing() {
  return (
    <div className="landing-page">
      <header className="landing-header">
        <div className="landing-brand">
          <SchoolLogo size={64} />
          <div>
            <strong>{SCHOOL_NAME}</strong>
            <small>{SCHOOL_PLACE}</small>
          </div>
        </div>
        <div className="trust-badge">
          <span>🔒</span>Secure test portal<i>•</i>Free for the school
        </div>
      </header>

      <section className="landing-hero">
        <div className="hero-copy">
          <div className="hero-eyebrow">ONLINE ASSESSMENT PORTAL</div>
          <h1>Tests, made simple.</h1>
          <p>
            MCQs, written answers, and scanned answer sheets — one portal for {SCHOOL_NAME} to set papers,
            grade fairly, and share results the moment they're ready.
          </p>
          <div className="hero-points">
            <div>
              <span>📝</span>
              <div>
                <b>Every question type</b>
                <br />
                <em>MCQ, written &amp; upload</em>
              </div>
            </div>
            <div>
              <span>🛡️</span>
              <div>
                <b>Anti-cheating built in</b>
                <br />
                <em>Shuffled papers, tab tracking</em>
              </div>
            </div>
            <div>
              <span>🏆</span>
              <div>
                <b>Instant results</b>
                <br />
                <em>Auto-graded &amp; leaderboards</em>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="portal-section">
        <div className="section-heading">
          <span />
          <div>
            <h2>Choose your portal</h2>
            <p>Pick your role to continue</p>
          </div>
          <span />
        </div>

        <div className="portal-grid">
          <Link to="/student/login" className="portal-card student-card">
            <div className="portal-icon">🎓</div>
            <div className="portal-content">
              <h3>Student</h3>
              <p>Take tests, track your progress, and see where you rank in your class.</p>
              <span className="portal-button">Student login <b>→</b></span>
            </div>
          </Link>

          <Link to="/teacher/login" className="portal-card teacher-card">
            <div className="portal-icon">🖊️</div>
            <div className="portal-content">
              <h3>Teacher</h3>
              <p>Set papers, grade submissions, and publish results for your classes.</p>
              <span className="portal-button">Teacher login <b>→</b></span>
            </div>
          </Link>

          <Link to="/admin/login" className="portal-card admin-card">
            <div className="portal-icon">🛡️</div>
            <div className="portal-content">
              <h3>Super Admin</h3>
              <p>Manage teachers, students, and every paper across the whole school.</p>
              <span className="portal-button">Admin login <b>→</b></span>
            </div>
          </Link>
        </div>
      </section>

      <HallOfFame />

      <div style={{ padding: '0 clamp(20px, 6vw, 76px) 8px' }}>
        <div className="feature-strip">
          <div>
            <span>🔀</span>
            <div>
              <b>Anti-cheating shuffle</b>
              <small>Unique question &amp; option order per student</small>
            </div>
          </div>
          <div>
            <span>🛡️</span>
            <div>
              <b>Tab-switch detection</b>
              <small>Repeated switches auto-flag for teacher review</small>
            </div>
          </div>
          <div>
            <span>🏆</span>
            <div>
              <b>Class leaderboard</b>
              <small>Students see how they rank once results publish</small>
            </div>
          </div>
          <div>
            <span>💾</span>
            <div>
              <b>Refresh-safe</b>
              <small>An in-progress test is never lost to a reload</small>
            </div>
          </div>
        </div>
      </div>

      <footer className="landing-footer">
        <div className="footer-school">
          <SchoolLogo size={56} />
          <div>
            <strong>{SCHOOL_NAME}</strong>
            <span>{SCHOOL_PLACE}</span>
            <small>Online Test Portal</small>
          </div>
        </div>
        <div className="footer-motto">
          <span>"</span>
          <p>Vidya Dadati Vinayam</p>
        </div>
        <div className="footer-follow">
          <b>Need help?</b>
          <div style={{ marginTop: 12, fontSize: '0.8rem', opacity: 0.85 }}>
            Contact the school office for portal support.
          </div>
        </div>
      </footer>
    </div>
  );
}
