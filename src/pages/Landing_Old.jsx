import React from 'react';
import { Link } from 'react-router-dom';
import SchoolLogo from '../components/SchoolLogo.jsx';
import { SCHOOL_NAME, SCHOOL_PLACE } from '../lib/constants.js';

export default function Landing() {
  return (
    <div className="login-wrap">
      <div style={{ width: '100%', maxWidth: 640 }}>
        <div style={{ textAlign: 'center', marginBottom: 30 }}>
          <SchoolLogo size={84} />
          <h1 style={{ marginTop: 16, marginBottom: 2 }}>{SCHOOL_NAME}</h1>
          <p style={{ color: 'var(--muted)', margin: 0 }}>{SCHOOL_PLACE}</p>
          <div className="eyebrow" style={{ marginTop: 14 }}>Online Test Portal</div>
        </div>

        <div className="role-grid">
          <Link to="/student/login" className="role-card">
            <div className="role-icon">🎓</div>
            <div className="role-title">Student</div>
            <div className="role-sub">Take tests &amp; view results</div>
          </Link>
          <Link to="/teacher/login" className="role-card">
            <div className="role-icon">🖊️</div>
            <div className="role-title">Teacher</div>
            <div className="role-sub">Set papers, grade &amp; publish</div>
          </Link>
          <Link to="/school-admin-console-7f3c/login" className="role-card">
            <div className="role-icon">🛡️</div>
            <div className="role-title">Super Admin</div>
            <div className="role-sub">Manage teachers &amp; school data</div>
          </Link>
        </div>
      </div>
    </div>
  );
}
