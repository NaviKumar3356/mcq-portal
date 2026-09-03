import React, { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import PanelLayout from '../components/PanelLayout.jsx';
import { CLASSES, SUBJECTS } from '../lib/constants.js';
import { getPhotoUrl } from '../lib/api.js';

const ADMIN_ITEMS = [
  { to: '/admin', label: 'Overview', icon: '🏠', end: true },
  { to: '/admin/teachers', label: 'Teachers', icon: '🖊️' },
  { to: '/admin/students', label: 'Students', icon: '🎓' },
  { to: '/admin/papers', label: 'All papers', icon: '📄' },
  { to: '/admin/settings', label: 'School & branding', icon: '🎨' },
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

function blankEditForm(t) {
  return {
    name: t.name,
    username: t.username,
    classes: t.classes || [],
    subjects: t.subjects || [],
    password: '', // blank = leave their current password unchanged
  };
}

export default function ManageTeachers() {
  const [teachers, setTeachers] = useState(null);
  const [error, setError] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ username: '', password: '', name: '', classes: [], subjects: [] });

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const [catalog, setCatalog] = useState({ classes: CLASSES, subjects: SUBJECTS });

  function load() {
    api('/teachers-manage')
      .then((d) => setTeachers(d.teachers))
      .catch((e) => setError(e.message));
  }
  useEffect(() => {
    load();
    api('/admin-catalog').then(d => setCatalog({ classes: d.classes || CLASSES, subjects: d.subjects || SUBJECTS })).catch(() => {});
  }, []);

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

  function startEdit(t) {
    setEditingId(t.id);
    setEditForm(blankEditForm(t));
    setEditError('');
  }
  function cancelEdit() {
    setEditingId(null);
    setEditForm(null);
    setEditError('');
  }

  async function saveEdit(t) {
    if (editForm.password && editForm.password.length < 6) {
      setEditError('New password must be at least 6 characters');
      return;
    }
    setEditSaving(true);
    setEditError('');
    try {
      const body = {
        teacher_id: t.id,
        name: editForm.name,
        username: editForm.username,
        classes: editForm.classes,
        subjects: editForm.subjects,
      };
      if (editForm.password) body.password = editForm.password;
      await api('/teachers-manage', { method: 'PATCH', body });
      cancelEdit();
      load();
    } catch (e) {
      setEditError(e.message);
    } finally {
      setEditSaving(false);
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
        <form className="card admin-form-card teacher-form-card" onSubmit={addTeacher}>
          <div className="admin-form-grid admin-form-grid-3">
            <div className="admin-field">
              <label>Full name</label>
              <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
            </div>
            <div className="admin-field">
              <label>Username</label>
              <input value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} required />
            </div>
            <div className="admin-field">
              <label>Password</label>
              <input type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} required />
            </div>
          </div>

          <div className="admin-field-block"><label>Assigned classes</label>
          <MultiSelect options={catalog.classes} selected={form.classes} onChange={(v) => setForm((f) => ({ ...f, classes: v }))} />

          </div><div className="admin-field-block"><label>Assigned subjects</label>
          <MultiSelect options={catalog.subjects} selected={form.subjects} onChange={(v) => setForm((f) => ({ ...f, subjects: v }))} />

          </div><button className="primary admin-submit-button" type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Create teacher account'}
          </button>
        </form>
      )}

      {error && <div className="error-box">{error}</div>}
      {!teachers && !error && <p className="center-note">Loading…</p>}
      {teachers && teachers.length === 0 && <div className="card center-note">No teacher accounts yet — add one above.</div>}

      {teachers && teachers.map((t) => (
        <div className="card" key={t.id}>
          {editingId === t.id ? (
            <div className="admin-edit-form">
              <div className="card-section-title">✏️ Edit teacher</div>
              {editError && <div className="error-box">{editError}</div>}

              <div className="admin-form-grid admin-form-grid-2">
                <div className="admin-field">
                  <label>Full name</label>
                  <input value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} required />
                </div>
                <div className="admin-field">
                  <label>Username</label>
                  <input value={editForm.username} onChange={(e) => setEditForm((f) => ({ ...f, username: e.target.value }))} required />
                </div>
              </div>

              <div className="admin-field-block"><label>Assigned classes</label>
              <MultiSelect options={catalog.classes} selected={editForm.classes} onChange={(v) => setEditForm((f) => ({ ...f, classes: v }))} />

              </div><div className="admin-field-block"><label>Assigned subjects</label>
              <MultiSelect options={catalog.subjects} selected={editForm.subjects} onChange={(v) => setEditForm((f) => ({ ...f, subjects: v }))} />

              </div><div className="admin-field-block"><label>Reset password (optional)</label>
              <input
                type="password"
                placeholder="Leave blank to keep their current password"
                value={editForm.password}
                onChange={(e) => setEditForm((f) => ({ ...f, password: e.target.value }))}
              />
              <p className="meta">Only fill this in if the teacher needs a new password — e.g. they forgot theirs.</p></div>

              <div className="admin-form-actions">
                <button className="primary" onClick={() => saveEdit(t)} disabled={editSaving}>
                  {editSaving ? 'Saving…' : 'Save changes'}
                </button>
                <button className="secondary" onClick={cancelEdit} disabled={editSaving}>Cancel</button>
              </div>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <div className="teacher-admin-summary">{t.photo_path ? <img className="teacher-admin-avatar" src={getPhotoUrl(t.photo_path)} alt="" onError={(e) => { e.currentTarget.style.visibility='hidden'; }} /> : <div className="teacher-admin-avatar teacher-admin-avatar-fallback">{(t.name || '?').split(/\s+/).slice(0,2).map(x => x[0]).join('').toUpperCase()}</div>}<div><div style={{ fontWeight: 700 }}>{t.name} <span className="meta">@{t.username}</span></div>
                  <div className="meta">Classes: {t.classes.join(', ') || '—'}</div>
                  <div className="meta">Subjects: {t.subjects.join(', ') || '—'}</div></div></div></div>
                <span className={`pill ${t.active ? 'open' : 'closed'}`}>{t.active ? 'active' : 'disabled'}</span>
              </div>
              <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button className="secondary" onClick={() => startEdit(t)}>✏️ Edit / Reset password</button>
                <button className="secondary" onClick={() => toggleActive(t)}>{t.active ? 'Disable login' : 'Re-enable'}</button>
                <button className="danger" onClick={() => removeTeacher(t)}>Delete account</button>
              </div>
            </>
          )}
        </div>
      ))}
    </PanelLayout>
  );
}
