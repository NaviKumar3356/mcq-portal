import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../lib/api.js';

export default function GradeSubmissions() {
  const { testId } = useParams();
  const [subs, setSubs] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api(`/submissions-list?test_id=${testId}`)
      .then((d) => setSubs(d.submissions))
      .catch((e) => setError(e.message));
  }, [testId]);

  return (
    <div className="container">
      <Link to="/teacher">&larr; Back to papers</Link>
      <h2>Submissions</h2>
      {error && <div className="error-box">{error}</div>}
      {!subs && !error && <p className="center-note">Loading…</p>}
      {subs && subs.length === 0 && <div className="card center-note">No submissions yet.</div>}

      {subs && subs.length > 0 && (
        <div className="card">
          {subs.map((s) => (
            <div className="test-row" key={s.id}>
              <div>
                <div style={{ fontWeight: 600 }}>{s.students?.name}</div>
                <div className="meta">Roll {s.students?.roll_number} · {s.students?.class}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span className={`pill ${s.status === 'graded' ? 'graded' : 'pending'}`}>{s.status}</span>
                <div style={{ marginTop: 8 }}>
                  <Link to={`/teacher/submission/${s.id}`}>
                    <button className="secondary">
                      {s.status === 'graded' ? `Review (${s.total_marks_awarded})` : 'Grade'}
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
