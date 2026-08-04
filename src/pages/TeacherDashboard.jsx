import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';

export default function TeacherDashboard() {
  const [tests, setTests] = useState(null);
  const [error, setError] = useState('');

  function load() {
    api('/admin-tests-list')
      .then((d) => setTests(d.tests))
      .catch((e) => setError(e.message));
  }

  useEffect(load, []);

  async function updateTest(id, patch) {
    try {
      await api('/test-update', { method: 'POST', body: { test_id: id, ...patch } });
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Papers</h2>
        <Link to="/teacher/create"><button className="primary">+ New paper</button></Link>
      </div>

      {error && <div className="error-box">{error}</div>}
      {!tests && <p className="center-note">Loading…</p>}
      {tests && tests.length === 0 && <div className="card center-note">No papers created yet.</div>}

      {tests && tests.map((t) => (
        <div className="card" key={t.id}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: 600 }}>{t.title} <span className="meta">({t.class})</span></div>
              <div className="meta">{t.subject || 'General'} · {t.total_marks} marks · {t.duration_minutes} min</div>
            </div>
            <span className={`pill ${t.status === 'published' ? 'open' : t.status === 'closed' ? 'closed' : 'upcoming'}`}>
              {t.status}
            </span>
          </div>

          <div style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {t.status === 'draft' && (
              <button className="secondary" onClick={() => updateTest(t.id, { status: 'published' })}>Publish to students</button>
            )}
            {t.status === 'published' && (
              <button className="secondary" onClick={() => updateTest(t.id, { status: 'closed' })}>Close now</button>
            )}
            <Link to={`/teacher/test/${t.id}/submissions`}><button className="secondary">View submissions</button></Link>
            {!t.results_published ? (
              <button className="primary" onClick={() => updateTest(t.id, { results_published: true })}>Publish result</button>
            ) : (
              <button className="secondary" onClick={() => updateTest(t.id, { results_published: false })}>Unpublish result</button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
