import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';

export default function StudentDashboard() {
  const [tests, setTests] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/tests-list')
      .then((d) => setTests(d.tests))
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div className="container">
      <h2>Your tests</h2>
      {error && <div className="error-box">{error}</div>}
      {!tests && !error && <p className="center-note">Loading…</p>}

      {tests && tests.length === 0 && (
        <div className="card center-note">No tests have been assigned to your class yet.</div>
      )}

      {tests && tests.length > 0 && (
        <div className="card">
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
                    <Link to={`/test/${t.id}`}>
                      <button className="primary">Start test</button>
                    </Link>
                  )}
                  {t.submitted && !t.results_published && (
                    <span className="pill pending">Submitted — awaiting result</span>
                  )}
                  {t.submitted && t.results_published && (
                    <Link to={`/result/${t.id}`}>
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
