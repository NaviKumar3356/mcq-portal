import React, { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import PanelLayout from '../components/PanelLayout.jsx';
import { CLASSES, SUBJECTS } from '../lib/constants.js';

const ADMIN_ITEMS = [
  { to: '/admin', label: 'Overview', icon: '🏠', end: true },
  { to: '/admin/teachers', label: 'Teachers', icon: '🖊️' },
  { to: '/admin/students', label: 'Students', icon: '🎓' },
  { to: '/admin/papers', label: 'All papers', icon: '📄' },
];

function MultiSelect({ options, selected, onChange }) {
  function toggle(opt) {
    onChange(selected.includes(opt) ? selected.filter((o) => o !== opt) : [...selected, opt]);
  }
  return (
    <div className="multiselect">
      {options.map((opt) => (
        <label key={opt} className={`chip ${selected.includes(opt) ? 'chip-on' : ''}`}>
          <input type="checkbox" checked={selected.includes(opt)} onChange={() => toggle(opt)} />
          {opt}
        </label>
      ))}
    </div>
  );
}

export default function ManageTeachers() {
  const [teachers, setTeachers] = useState(null);
  const [error, setError] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ username: '', password: '', name: '', classes: [], subjects: [] });

  function load() {
    api('/teachers-manage')
      .then((d) => setTeachers(d.teachers))
      .catch((e) => setError(e.message));
  }
  useEffect(load, []);

  async function addTeacher(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api('/teachers-manage', { method: 'POST', body: form });
      setForm({ username: '', password: '', name: '', classes: [], subjects: [] });
      setShowAdd(false);
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(t) {
    try {
      await api('/teachers-manage', { method: 'PATCH', body: { teacher_id: t.id, active: !t.active } });
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function removeTeacher(t) {
    if (!window.confirm(`Permanently remove ${t.name}'s account? Their papers stay, just unowned.`)) return;
    try {
      await api('/teachers-manage', { method: 'DELETE', body: { teacher_id: t.id } });
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <PanelLayout items={ADMIN_ITEMS}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Teachers</h2>
        <button className="primary" onClick={() => setShowAdd((v) => !v)}>
          {showAdd ? 'Cancel' : '+ Add teacher'}
        </button>
      </div>

      {showAdd && (
        <form className="card" onSubmit={addTeacher}>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label>Full name</label>
              <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
            </div>
            <div style={{ flex: 1 }}>
              <label>Username</label>
              <input value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} required />
            </div>
            <div style={{ flex: 1 }}>
              <label>Password</label>
              <input type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} required />
            </div>
          </div>

          <label>Assigned classes</label>
          <MultiSelect options={CLASSES} selected={form.classes} onChange={(v) => setForm((f) => ({ ...f, classes: v }))} />

          <label>Assigned subjects</label>
          <MultiSelect options={SUBJECTS} selected={form.subjects} onChange={(v) => setForm((f) => ({ ...f, subjects: v }))} />

          <button className="primary" type="submit" disabled={saving} style={{ marginTop: 14 }}>
            {saving ? 'Saving…' : 'Create teacher account'}
          </button>
        </form>
      )}

      {error && <div className="error-box">{error}</div>}
      {!teachers && !error && <p className="center-note">Loading…</p>}
      {teachers && teachers.length === 0 && <div className="card center-note">No teacher accounts yet — add one above.</div>}

      {teachers && teachers.map((t) => (
        <div className="card" key={t.id}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: 600 }}>{t.name} <span className="meta">@{t.username}</span></div>
              <div className="meta">Classes: {t.classes.join(', ') || '—'}</div>
              <div className="meta">Subjects: {t.subjects.join(', ') || '—'}</div>
            </div>
            <span className={`pill ${t.active ? 'open' : 'closed'}`}>{t.active ? 'active' : 'disabled'}</span>
          </div>
          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            <button className="secondary" onClick={() => toggleActive(t)}>{t.active ? 'Disable login' : 'Re-enable'}</button>
            <button className="danger" onClick={() => removeTeacher(t)}>Delete account</button>
          </div>
        </div>
      ))}
    </PanelLayout>
  );
}
