import React from 'react';
import { Link } from 'react-router-dom';
import SchoolLogo from '../components/SchoolLogo.jsx';
import { SCHOOL_NAME, SCHOOL_PLACE } from '../lib/constants.js';

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
