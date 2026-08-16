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

function HofAvatar({ student, size = 'normal' }) {
  if (student.photo_path) {
    return <img src={getPhotoUrl(student.photo_path)} alt={student.name} />;
  }
  return <span className={`hof-photo-fallback ${size === 'small' ? 'small' : ''}`}>{initials(student.name)}</span>;
}

// Public, unauthenticated "Hall of Fame" — top performers school-wide,
// ranked by average score across every published test. Meant to make
// students curious and a little competitive the moment they land on the
// portal, before they've even logged in.
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

  const podium = top ? top.slice(0, 3) : [];
  const rest = top ? top.slice(3) : [];
  const gold = podium.find((s) => s.rank === 1);
  const silver = podium.find((s) => s.rank === 2);
  const bronze = podium.find((s) => s.rank === 3);
  const ordered = [silver, gold, bronze].filter(Boolean);

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
          <div className="hof-podium">
            {ordered.map((s) => (
              <div key={s.student_id} className={`hof-podium-card rank-${s.rank}`}>
                {s.rank === 1 && (
                  <div className="confetti-burst">
                    <span>🎉</span><span>✨</span><span>🎊</span><span>✨</span><span>🎉</span>
                  </div>
                )}
                <div className="hof-medal">{s.rank === 1 ? '🥇' : s.rank === 2 ? '🥈' : '🥉'}</div>
                <div className="hof-photo">
                  <HofAvatar student={s} />
                </div>
                <div className="hof-name">{s.name}</div>
                <div className="hof-class">Class {s.class}</div>
                <div className="hof-score">{s.average_percent}%</div>
                {s.rank === 1 && <div className="hof-congrats">🎉 Congratulations!</div>}
                <div className="hof-pedestal">#{s.rank}</div>
              </div>
            ))}
          </div>

          {rest.length > 0 && (
            <div className="hof-list">
              {rest.map((s) => (
                <div className="hof-row" key={s.student_id}>
                  <span className="hof-row-rank">#{s.rank}</span>
                  <span className="hof-row-photo">
                    <HofAvatar student={s} size="small" />
                  </span>
                  <span className="hof-row-name">
                    {s.name} <span className="meta">· Class {s.class}</span>
                  </span>
                  <span className="hof-row-score">{s.average_percent}%</span>
                </div>
              ))}
            </div>
          )}

          <p className="meta" style={{ textAlign: 'center', marginTop: 14 }}>
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

        <div className="hero-visual">
          <div className="visual-glow" />
          <div className="laptop">
            <div className="screen">
              <div className="screen-bar" />
              <div className="screen-check">✓</div>
              <div className="screen-line long" />
              <div className="screen-line" />
              <div className="screen-line short" />
            </div>
            <div className="base" />
          </div>
          <div className="visual-books">
            <span /><span /><span />
          </div>
          <div className="graduation-cap">🎓</div>
          <div className="pencil-cup">✏️</div>
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
