import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, getAuthInfo } from '../lib/api.js';
import PanelLayout from '../components/PanelLayout.jsx';

const TEACHER_ITEMS = [
  { to: '/teacher', label: 'Papers', icon: '📄', end: true },
  { to: '/teacher/create', label: 'New paper', icon: '➕' },
  { to: '/teacher/students', label: 'Students', icon: '🎓' },
];
const ADMIN_ITEMS = [
  { to: '/admin', label: 'Overview', icon: '🏠', end: true },
  { to: '/admin/teachers', label: 'Teachers', icon: '🖊️' },
  { to: '/admin/students', label: 'Students', icon: '🎓' },
  { to: '/admin/papers', label: 'All papers', icon: '📄' },
];

export default function GradeSubmissions() {
  const { testId } = useParams();
  const auth = getAuthInfo();
  const isAdmin = auth?.role === 'super_admin';
  const [subs, setSubs] = useState(null);
  const [error, setError] = useState('');

  function load() {
    api(`/submissions-list?test_id=${testId}`)
      .then((d) => setSubs(d.submissions))
      .catch((e) => setError(e.message));
  }
  useEffect(load, [testId]);

  async function removeSubmission(id, name) {
    if (!window.confirm(`Delete ${name}'s submission and answer copy? This cannot be undone.`)) return;
    try {
      await api('/submission-delete', { method: 'POST', body: { submission_id: id } });
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <PanelLayout items={isAdmin ? ADMIN_ITEMS : TEACHER_ITEMS}>
      <Link to={isAdmin ? '/admin/papers' : '/teacher'}>&larr; Back to papers</Link>
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
                <div style={{ marginTop: 8, display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                  <Link to={`${isAdmin ? '/admin' : '/teacher'}/submission/${s.id}`}>
                    <button className="secondary">
                      {s.status === 'graded' ? `Review (${s.total_marks_awarded})` : 'Grade'}
                    </button>
                  </Link>
                  <button className="danger small" onClick={() => removeSubmission(s.id, s.students?.name)}>Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </PanelLayout>
  );
}
