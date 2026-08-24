import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, getAuthInfo } from '../lib/api.js';
import StudentAvatar from '../components/StudentAvatar.jsx';
import { SCHOOL_NAME } from '../lib/constants.js';

export default function StudentDashboard() {
  const auth = getAuthInfo();
  const [tests, setTests] = useState(null);
  const [error, setError] = useState('');
  const [photoPath, setPhotoPath] = useState(null);

  useEffect(() => {
    api('/tests-list')
      .then((d) => setTests(d.tests))
      .catch((e) => setError(e.message));
    api('/student-self').then((d) => setPhotoPath(d.student?.photo_path || null)).catch(() => {});
  }, []);

  return (
    <div className="container">
      <div className="card test-header-card student-dashboard-header">
        <div className="test-header-brand">
          <StudentAvatar student={{ name: auth?.name, photo_path: photoPath }} className="student-dashboard-avatar" alt={auth?.name || 'Student'} />
          <div>
            <div className="test-header-school">{SCHOOL_NAME}</div>
            <h2 style={{ margin: 0 }}>Hi, {auth?.name || 'there'}</h2>
            <div className="meta">Roll {auth?.roll_number} · Class {auth?.class}</div>
          </div>
        </div>
        <div className="student-quick-actions" aria-label="Student self-service">
          <Link className="nav-action-button secondary" to="/student/profile">👤 My profile</Link>
          <Link className="nav-action-button secondary" to="/student/leaderboard">🏆 My ranking</Link>
        </div>
      </div>

      <div className="student-self-service card">
        <div>
          <div className="eyebrow">STUDENT SELF-SERVICE</div>
          <h3>Manage your own learning record</h3>
          <p className="meta">Safely update your profile photo, review published results, download report cards and view your class ranking. Personal marks, class, roll number and tests remain protected from student editing.</p>
        </div>
        <div className="student-service-grid">
          <Link to="/student/profile" className="student-service-card"><span>📸</span><strong>Profile & photo</strong><small>Update your own photo</small></Link>
          <Link to="/student/leaderboard" className="student-service-card"><span>🏆</span><strong>My ranking</strong><small>See class leaderboard</small></Link>
          <a href="#my-tests" className="student-service-card"><span>📚</span><strong>My tests</strong><small>Open active assessments</small></a>
        </div>
      </div>

      {error && <div className="error-box">{error}</div>}
      {!tests && !error && <p className="center-note">Loading…</p>}

      {tests && tests.length === 0 && (
        <div className="card center-note">No tests have been assigned to your class yet.</div>
      )}

      {tests && tests.length > 0 && (
        <div id="my-tests" className="card">
          {tests.map((t) => (
            <div className="test-row" key={t.id}>
              <div>
                <div style={{ fontWeight: 600 }}>{t.title}</div>
                <div className="meta">
                  {t.subject || 'General'} · {t.duration_minutes} min · Total {t.total_marks} marks
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span className={`pill ${t.window}`}>{t.window}</span>
                <div style={{ marginTop: 8 }}>
                  {!t.submitted && t.window === 'open' && (
                    <Link to={`/student/test/${t.id}`}>
                      <button className="primary">Start test</button>
                    </Link>
                  )}
                  {t.submitted && !t.results_published && (
                    <span className="pill pending">Submitted — awaiting result</span>
                  )}
                  {t.submitted && t.results_published && (
                    <Link to={`/student/result/${t.id}`}>
                      <button className="secondary">View result ({t.my_score ?? '—'} / {t.total_marks})</button>
                    </Link>
                  )}
                  {!t.submitted && t.window === 'closed' && <span className="pill closed">Missed</span>}
                  {!t.submitted && t.window === 'upcoming' && <span className="pill upcoming">Not open yet</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
