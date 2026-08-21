import React, { useEffect, useRef, useState } from 'react';
import Papa from 'papaparse';
import { api, getAuthInfo, uploadStudentPhoto, getPhotoUrl } from '../lib/api.js';
import PanelLayout from '../components/PanelLayout.jsx';
import { CLASSES } from '../lib/constants.js';

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
  { to: '/admin/settings', label: 'School & branding', icon: '🎨' },
];

function initials(name) {
  return (name || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() || '')
    .join('');
}

export default function ManageStudents() {
  const auth = getAuthInfo();
  const isAdmin = auth?.role === 'super_admin';
  const allowedClasses = isAdmin ? CLASSES : (auth?.classes || []);

  const [students, setStudents] = useState(null);
  const [error, setError] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ roll_number: '', name: '', class: allowedClasses[0] || '', dob: '' });
  const [saving, setSaving] = useState(false);
  const [photoUploadingId, setPhotoUploadingId] = useState(null);

  // Inline edit (Update — completes Create/Read/Update/Delete for students).
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');

  const [showCsv, setShowCsv] = useState(false);
  const [csvReport, setCsvReport] = useState(null);
  const [csvUploading, setCsvUploading] = useState(false);
  const fileInputRef = useRef(null);

  function load() {
    const params = new URLSearchParams();
    if (classFilter) params.set('class', classFilter);
    if (search) params.set('q', search);
    api(`/students-list?${params.toString()}`)
      .then((d) => setStudents(d.students))
      .catch((e) => setError(e.message));
  }
  useEffect(load, [classFilter, search]);

  async function addStudent(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api('/student-create', { method: 'POST', body: form });
      setForm({ roll_number: '', name: '', class: allowedClasses[0] || '', dob: '' });
      setShowAdd(false);
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteStudent(id, name) {
    if (!window.confirm(`Remove ${name}? This also deletes all their submissions and answer copies.`)) return;
    try {
      await api('/student-delete', { method: 'POST', body: { student_id: id } });
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function handlePhoto(studentId, file) {
    setPhotoUploadingId(studentId);
    setError('');
    try {
      await uploadStudentPhoto({ student_id: studentId, file });
      load();
    } catch (e) {
      setError('Could not upload photo: ' + e.message);
    } finally {
      setPhotoUploadingId(null);
    }
  }

  function startEdit(s) {
    setEditingId(s.id);
    setEditForm({ roll_number: s.roll_number, name: s.name, class: s.class, dob: s.dob });
    setEditError('');
  }
  function cancelEdit() {
    setEditingId(null);
    setEditForm(null);
    setEditError('');
  }
  async function saveEdit(id) {
    setEditSaving(true);
    setEditError('');
    try {
      await api('/student-update', { method: 'POST', body: { student_id: id, ...editForm } });
      cancelEdit();
      load();
    } catch (e) {
      setEditError(e.message);
    } finally {
      setEditSaving(false);
    }
  }

  function onCsvSelected(e) {
    const file = e.target.files[0];
    if (!file) return;
    setCsvReport(null);
    setError('');
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase(),
      complete: async (results) => {
        const rows = results.data.map((r) => ({
          roll_number: r.roll_number,
          name: r.name,
          class: r.class,
          dob: r.dob,
        }));
        setCsvUploading(true);
        try {
          const report = await api('/students-bulk-upload', { method: 'POST', body: { rows } });
          setCsvReport(report);
          load();
        } catch (err) {
          setError(err.message);
        } finally {
          setCsvUploading(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      },
    });
  }

  function Avatar({ s }) {
    return (
      <label className="avatar-upload" title="Click to add/change photo">
        {photoUploadingId === s.id ? (
          <span className="avatar-fallback">…</span>
        ) : s.photo_path ? (
          <img src={getPhotoUrl(s.photo_path)} alt={s.name} className="avatar-img" />
        ) : (
          <span className="avatar-fallback">{initials(s.name)}</span>
        )}
        <span className="avatar-upload-caption">{s.photo_path ? 'Change photo' : 'Upload photo'}</span>
        <input
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          disabled={photoUploadingId === s.id}
          onChange={(e) => e.target.files[0] && handlePhoto(s.id, e.target.files[0])}
        />
      </label>
    );
  }

  return (
    <PanelLayout items={isAdmin ? ADMIN_ITEMS : TEACHER_ITEMS}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <h2>Students</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="secondary" onClick={() => setShowCsv((v) => !v)}>
            {showCsv ? 'Cancel' : '⇪ Upload CSV'}
          </button>
          <button className="primary" onClick={() => setShowAdd((v) => !v)}>
            {showAdd ? 'Cancel' : '+ Add student'}
          </button>
        </div>
      </div>

      {showCsv && (
        <div className="card">
          <p className="meta">
            CSV needs columns <code>roll_number, name, class, dob</code> (dob as <code>YYYY-MM-DD</code>).
            One file can include students from several classes at once — each row's own <code>class</code>{' '}
            column decides where it goes. Existing students (same roll number + class) get updated instead
            of duplicated. Photos aren't part of CSV import — add them per student from the table below.
          </p>
          <input ref={fileInputRef} type="file" accept=".csv" onChange={onCsvSelected} />
          {csvUploading && <p className="meta">Uploading…</p>}

          {csvReport && (
            <div style={{ marginTop: 14 }}>
              <p style={{ fontWeight: 600 }}>
                {csvReport.succeeded} row{csvReport.succeeded === 1 ? '' : 's'} saved
                {csvReport.failed > 0 && `, ${csvReport.failed} failed`}
              </p>
              {csvReport.failed > 0 && (
                <table className="grade-table">
                  <thead><tr><th>Row</th><th>Problem</th></tr></thead>
                  <tbody>
                    {csvReport.results.filter((r) => !r.ok).map((r) => (
                      <tr key={r.row}><td>{r.row}</td><td>{r.error}</td></tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      )}

      {showAdd && (
        <form className="card" onSubmit={addStudent}>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label>Roll number</label>
              <input value={form.roll_number} onChange={(e) => setForm((f) => ({ ...f, roll_number: e.target.value }))} required />
            </div>
            <div style={{ flex: 2 }}>
              <label>Name</label>
              <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label>Class</label>
              <select value={form.class} onChange={(e) => setForm((f) => ({ ...f, class: e.target.value }))} required>
                <option value="" disabled>Select class</option>
                {allowedClasses.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label>Date of birth</label>
              <input type="date" value={form.dob} onChange={(e) => setForm((f) => ({ ...f, dob: e.target.value }))} required />
            </div>
          </div>
          <button className="primary" type="submit" disabled={saving} style={{ marginTop: 10 }}>
            {saving ? 'Saving…' : 'Add student'}
          </button>
          <p className="meta" style={{ marginTop: 8 }}>You can add a photo once the student is saved, from the table below.</p>
        </form>
      )}

      <div className="card filter-bar">
        <input type="text" placeholder="Search by name or roll number…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)}>
          <option value="">All assigned classes</option>
          {allowedClasses.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {error && <div className="error-box">{error}</div>}
      {!students && <p className="center-note">Loading…</p>}
      {students && students.length === 0 && <div className="card center-note">No students found.</div>}

      {students && students.length > 0 && (
        <div className="card">
          <p className="meta" style={{ marginTop: -4, marginBottom: 12 }}>
            Click a student's photo to add or change it — photos of students who make the school-wide Hall of
            Fame leaderboard are shown on the public landing page, so pick something appropriate.
          </p>
          {editError && <div className="error-box">{editError}</div>}
          <table className="grade-table">
            <thead><tr><th></th><th>Roll</th><th>Name</th><th>Class</th><th>DOB</th><th></th></tr></thead>
            <tbody>
              {students.map((s) => (
                editingId === s.id ? (
                  <tr key={s.id}>
                    <td><Avatar s={s} /></td>
                    <td>
                      <input
                        type="text"
                        value={editForm.roll_number}
                        onChange={(e) => setEditForm((f) => ({ ...f, roll_number: e.target.value }))}
                        style={{ width: 72 }}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                      />
                    </td>
                    <td>
                      <select value={editForm.class} onChange={(e) => setEditForm((f) => ({ ...f, class: e.target.value }))}>
                        {allowedClasses.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </td>
                    <td>
                      <input
                        type="date"
                        value={editForm.dob}
                        onChange={(e) => setEditForm((f) => ({ ...f, dob: e.target.value }))}
                      />
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button className="secondary small" onClick={() => saveEdit(s.id)} disabled={editSaving}>
                        {editSaving ? 'Saving…' : 'Save'}
                      </button>{' '}
                      <button className="secondary small" onClick={cancelEdit} disabled={editSaving}>Cancel</button>
                    </td>
                  </tr>
                ) : (
                  <tr key={s.id}>
                    <td><Avatar s={s} /></td>
                    <td>{s.roll_number}</td>
                    <td>{s.name}</td>
                    <td>{s.class}</td>
                    <td>{s.dob}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button className="secondary small" onClick={() => startEdit(s)}>Edit</button>{' '}
                      <button className="danger small" onClick={() => deleteStudent(s.id, s.name)}>Remove</button>
                    </td>
                  </tr>
                )
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PanelLayout>
  );
}
