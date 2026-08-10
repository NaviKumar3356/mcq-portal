import React from 'react';
import { Link } from 'react-router-dom';
import SchoolLogo from '../components/SchoolLogo.jsx';
import { SCHOOL_NAME, SCHOOL_PLACE } from '../lib/constants.js';

export default function Landing() {
  return (
    <main className="landing-page">

      {/* ================= HEADER ================= */}
      <header className="landing-header">
        <Link to="/" className="landing-brand">
          <SchoolLogo size={64} />

          <span>
            <strong>{SCHOOL_NAME}</strong>
            <small>Online Assessment Portal</small>
          </span>
        </Link>

        <div className="trust-badge">
          <span>✓</span>
          Secure
          <i>•</i>
          Reliable
          <i>•</i>
          School-ready
        </div>
      </header>


      {/* ================= HERO ================= */}
      <section className="landing-hero">

        <div className="hero-copy">

          <div className="hero-eyebrow">
            WELCOME TO SNSVM
          </div>

          <h1>
            Online Assessment
            <br />
            Portal
          </h1>

          <p>
            A smart and secure platform for students to take tests,
            teachers to manage assessments, and administrators to
            oversee everything seamlessly.
          </p>

          <div className="hero-points">

            <div>
              <span>♟</span>

              <b>
                Empowering
                <br />
                <em>Students</em>
              </b>
            </div>

            <div>
              <span>✓</span>

              <b>
                Ensuring
                <br />
                <em>Integrity</em>
              </b>
            </div>

          </div>

        </div>


        {/* ================= HERO VISUAL ================= */}
        <div
          className="hero-visual"
          aria-hidden="true"
        >

          <div className="visual-glow" />

          <div className="visual-books">
            <span />
            <span />
            <span />
          </div>

          <div className="laptop">

            <div className="screen">

              <div className="screen-bar" />

              <div className="screen-line long" />

              <div className="screen-line" />

              <div className="screen-check">
                ✓
              </div>

              <div className="screen-line short" />

              <div className="screen-check">
                ✓
              </div>

              <div className="screen-line" />

            </div>

            <div className="base" />

          </div>

          <div className="graduation-cap">
            ◆
          </div>

          <div className="pencil-cup">
            ✎
          </div>

        </div>

      </section>


      {/* ================= PORTAL SELECTION ================= */}
      <section className="portal-section">

        <div className="section-heading">

          <span />

          <div>
            <h2>Select Your Portal</h2>

            <p>
              Choose your role to get started
            </p>
          </div>

          <span />

        </div>


        <div className="portal-grid">


          {/* STUDENT */}
          <Link
            to="/student/login"
            className="portal-card student-card"
          >

            <div className="portal-icon">
              ♟
            </div>

            <div className="portal-content">

              <h3>
                Student
              </h3>

              <p>
                Take tests, view results and
                track your progress.
              </p>

              <span className="portal-button">
                Student Login
                <b>→</b>
              </span>

            </div>

          </Link>


          {/* TEACHER */}
          <Link
            to="/teacher/login"
            className="portal-card teacher-card"
          >

            <div className="portal-icon">
              ✎
            </div>

            <div className="portal-content">

              <h3>
                Teacher
              </h3>

              <p>
                Create tests, manage questions
                and analyze performance.
              </p>

              <span className="portal-button">
                Teacher Login
                <b>→</b>
              </span>

            </div>

          </Link>


          {/* ADMIN */}
          <Link
            to="/admin/login"
            className="portal-card admin-card"
          >

            <div className="portal-icon">
              ★
            </div>

            <div className="portal-content">

              <h3>
                Super Admin
              </h3>

              <p>
                Manage users, school data
                and overall operations.
              </p>

              <span className="portal-button">
                Admin Login
                <b>→</b>
              </span>

            </div>

          </Link>

        </div>

      </section>


      {/* ================= FEATURES ================= */}
      <section className="feature-strip">

        <div>
          <span>🔒</span>

          <b>
            Secure &amp; Safe
          </b>

          <small>
            Protected school data
          </small>
        </div>


        <div>
          <span>ϟ</span>

          <b>
            Fast &amp; Reliable
          </b>

          <small>
            Smooth test experience
          </small>
        </div>


        <div>
          <span>▮▮▮</span>

          <b>
            Insightful Reports
          </b>

          <small>
            Better performance decisions
          </small>
        </div>


        <div>
          <span>▣</span>

          <b>
            Anytime, Anywhere
          </b>

          <small>
            Access from any device
          </small>
        </div>

      </section>


      {/* ================= FOOTER ================= */}
      <footer className="landing-footer">

        <div className="footer-school">

          <SchoolLogo size={52} />

          <div>

            <strong>
              {SCHOOL_NAME}
            </strong>

            <span>
              Online Assessment Portal
            </span>

            <small>
              © 2026 All Rights Reserved.
            </small>

          </div>

        </div>


        <div className="footer-motto">

          <span>
            “
          </span>

          <p>
            Empowering Education,
            <br />
            Inspiring Excellence
          </p>

        </div>


        <div className="footer-follow">

          <b>
            Follow Us
          </b>

          <div>
            <span>f</span>
            <span>◎</span>
            <span>▶</span>
          </div>

        </div>

      </footer>


      {/* Hidden location value keeps the imported constant useful */}
      <div className="landing-location">
        {SCHOOL_PLACE}
      </div>

    </main>
  );
}