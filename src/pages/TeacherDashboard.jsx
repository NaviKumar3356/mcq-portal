import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, getAuthInfo } from '../lib/api.js';
import PanelLayout from '../components/PanelLayout.jsx';
import { CLASSES, SUBJECTS } from '../lib/constants.js';

const TEACHER_ITEMS = [
  { to: '/teacher', label: 'Papers', icon: '📄', end: true },
  { to: '/teacher/create', label: 'New paper', icon: '➕' },
  { to: '/teacher/students', label: 'Students', icon: '🎓' },
  { to: '/teacher/leaderboard', label: 'Leaderboard', icon: '🏆' },
];
const ADMIN_ITEMS = [
  { to: '/admin', label: 'Overview', icon: '🏠', end: true },
  { to: '/admin/teachers', label: 'Teachers', icon: '🖊️' },
  { to: '/admin/students', label: 'Students', icon: '🎓' },
  { to: '/admin/papers', label: 'All papers', icon: '📄' },
  { to: '/admin/leaderboard', label: 'Leaderboard', icon: '🏆' },
];

export default function TeacherDashboard() {
  const auth = getAuthInfo();
  const isAdmin = auth?.role === 'super_admin';
  const [tests, setTests] = useState(null);
  const [error, setError] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [search, setSearch] = useState('');

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

  async function deleteTest(id, title) {
    if (!window.confirm(`Delete "${title}" permanently? This removes all student submissions and copies for this paper too.`)) return;
    try {
      await api('/test-delete', { method: 'POST', body: { test_id: id } });
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  const filtered = useMemo(() => {
    if (!tests) return null;
    return tests.filter((t) => {
      if (classFilter && t.class !== classFilter) return false;
      if (subjectFilter && t.subject !== subjectFilter) return false;
      if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [tests, classFilter, subjectFilter, search]);

  return (
    <PanelLayout items={isAdmin ? ADMIN_ITEMS : TEACHER_ITEMS}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Papers</h2>
        <Link to={isAdmin ? '/admin/papers/create' : '/teacher/create'}><button className="primary">+ New paper</button></Link>
      </div>

      <div className="card filter-bar">
        <input type="text" placeholder="Search by title…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)}>
          <option value="">All classes</option>
          {CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)}>
          <option value="">All subjects</option>
          {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {error && <div className="error-box">{error}</div>}
      {!tests && <p className="center-note">Loading…</p>}
      {filtered && filtered.length === 0 && <div className="card center-note">No papers match.</div>}

      {filtered && filtered.map((t) => (
        <div className="card" key={t.id}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: 600 }}>{t.title} <span className="meta">({t.class} · {t.subject})</span></div>
              <div className="meta">{t.total_marks} marks · {t.duration_minutes} min</div>
            </div>
            <span className={`pill ${t.status === 'published' ? 'open' : t.status === 'closed' ? 'closed' : 'upcoming'}`}>
              {t.status}
            </span>
          </div>

          {!t.answer_key_set && (
            <div className="notice-strip">⚠ Answer key not finalized yet</div>
          )}

          <div style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {t.status === 'draft' && (
              <button className="secondary" onClick={() => updateTest(t.id, { status: 'published' })}>Publish to students</button>
            )}
            {t.status === 'published' && (
              <button className="secondary" onClick={() => updateTest(t.id, { status: 'closed' })}>Close now</button>
            )}
            <Link to={`${isAdmin ? '/admin' : '/teacher'}/test/${t.id}/edit`}><button className="secondary">Edit</button></Link>
            <Link to={`${isAdmin ? '/admin' : '/teacher'}/test/${t.id}/answer-key`}><button className="secondary">Answer key</button></Link>
            <Link to={`${isAdmin ? '/admin' : '/teacher'}/test/${t.id}/submissions`}><button className="secondary">Submissions</button></Link>
            {!t.results_published ? (
              <button className="primary" onClick={() => updateTest(t.id, { results_published: true })}>Publish result</button>
            ) : (
              <button className="secondary" onClick={() => updateTest(t.id, { results_published: false })}>Unpublish result</button>
            )}
            <button className="danger" onClick={() => deleteTest(t.id, t.title)}>Delete</button>
          </div>
        </div>
      ))}
    </PanelLayout>
  );
}
