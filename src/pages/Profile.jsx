import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  api, getAuthInfo, setToken,
  uploadOwnStudentPhoto, uploadOwnTeacherPhoto, uploadOwnAdminPhoto, getPhotoUrl,
} from '../lib/api.js';
import PanelLayout from '../components/PanelLayout.jsx';
import SchoolLogo from '../components/SchoolLogo.jsx';
import { SCHOOL_NAME } from '../lib/constants.js';

const TEACHER_ITEMS = [
  { to: '/teacher', label: 'Papers', icon: '📄', end: true },
  { to: '/teacher/create', label: 'New paper', icon: '➕' },
  { to: '/teacher/students', label: 'Students', icon: '🎓' },
  { to: '/teacher/leaderboard', label: 'Leaderboard', icon: '🏆' },
  { to: '/teacher/profile', label: 'My profile', icon: '👤' },
];
const ADMIN_ITEMS = [
  { to: '/admin', label: 'Overview', icon: '🏠', end: true },
  { to: '/admin/teachers', label: 'Teachers', icon: '🖊️' },
  { to: '/admin/students', label: 'Students', icon: '🎓' },
  { to: '/admin/papers', label: 'All papers', icon: '📄' },
  { to: '/admin/leaderboard', label: 'Leaderboard', icon: '🏆' },
  { to: '/admin/profile', label: 'My profile', icon: '👤' },
];

function initials(name) {
  return (name || '?').trim().split(/\s+/).slice(0, 2).map((n) => n[0]?.toUpperCase() || '').join('');
}

function AvatarUpload({ photoPath, name, uploading, onFile }) {
  return (
    <label className="profile-avatar-upload">
      {uploading ? (
        <span className="avatar-fallback">…</span>
      ) : photoPath ? (
        <img src={getPhotoUrl(photoPath)} alt={name} />
      ) : (
        <span className="avatar-fallback">{initials(name)}</span>
      )}
      <input
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        disabled={uploading}
        onChange={(e) => e.target.files[0] && onFile(e.target.files[0])}
      />
    </label>
  );
}

// --- Student profile ------------------------------------------------------
function StudentProfile() {
  const auth = getAuthInfo();
  const [photoPath, setPhotoPath] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/student-self').then((d) => setPhotoPath(d.student?.photo_path || null)).catch(() => {});
  }, []);

  async function handleFile(file) {
    setUploading(true);
    setError('');
    try {
      const path = await uploadOwnStudentPhoto({ file });
      setPhotoPath(path);
    } catch (e) {
      setError('Could not upload photo: ' + e.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="container">
      <div className="card test-header-card">
        <div className="test-header-brand">
          <SchoolLogo size={40} />
          <div>
            <div className="test-header-school">{SCHOOL_NAME}</div>
            <h2 style={{ margin: 0 }}>My Profile</h2>
          </div>
        </div>
        <Link to="/student/dashboard"><button className="secondary">&larr; Back to tests</button></Link>
      </div>

      <div className="card profile-card">
        <AvatarUpload photoPath={photoPath} name={auth?.name} uploading={uploading} onFile={handleFile} />
        <h3 style={{ textAlign: 'center' }}>{auth?.name}</h3>
        <p className="meta" style={{ textAlign: 'center' }}>
          Roll {auth?.roll_number} · Class {auth?.class}
        </p>
        {error && <div className="error-box">{error}</div>}
        <p className="meta" style={{ textAlign: 'center', marginTop: 14 }}>
          Tap your photo to add or change it — this also appears on the school-wide Hall of Fame leaderboard
          if you make the top ranks. Other details (name, roll number, class, DOB) are managed by your
          teacher — ask them if anything needs correcting.
        </p>
      </div>
    </div>
  );
}

// --- Teacher profile --------------------------------------------------------
function TeacherProfile() {
  const [teacher, setTeacher] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [name, setName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  function load() {
    api('/teacher-profile').then((d) => { setTeacher(d.teacher); setName(d.teacher.name); }).catch((e) => setError(e.message));
  }
  useEffect(load, []);

  async function handleFile(file) {
    setUploading(true);
    setError('');
    try {
      const path = await uploadOwnTeacherPhoto({ file });
      setTeacher((t) => ({ ...t, photo_path: path }));
    } catch (e) {
      setError('Could not upload photo: ' + e.message);
    } finally {
      setUploading(false);
    }
  }

  async function saveProfile(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const body = { name };
      if (newPassword) {
        body.current_password = currentPassword;
        body.new_password = newPassword;
      }
      const d = await api('/teacher-profile', { method: 'PATCH', body });
      if (d.token) setToken(d.token);
      setTeacher(d.teacher);
      setCurrentPassword('');
      setNewPassword('');
      setSuccess('Profile updated.');
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (!teacher && !error) return <PanelLayout items={TEACHER_ITEMS}><p className="center-note">Loading…</p></PanelLayout>;

  return (
    <PanelLayout items={TEACHER_ITEMS}>
      <h2>My Profile</h2>
      {error && <div className="error-box">{error}</div>}
      {teacher && (
        <div className="card profile-card">
          <AvatarUpload photoPath={teacher.photo_path} name={teacher.name} uploading={uploading} onFile={handleFile} />
          <p className="meta" style={{ textAlign: 'center', marginBottom: 18 }}>@{teacher.username}</p>

          <form onSubmit={saveProfile}>
            <label>Full name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required />

            <label style={{ marginTop: 20 }}>Change password (optional)</label>
            <input
              type="password"
              placeholder="Current password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
            <input
              type="password"
              placeholder="New password (leave blank to keep current)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              style={{ marginTop: 8 }}
            />

            {success && <p style={{ color: 'var(--accent-dark)', fontWeight: 600, marginTop: 10 }}>{success}</p>}

            <button className="primary" type="submit" disabled={saving} style={{ marginTop: 16 }}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </form>

          <p className="meta" style={{ marginTop: 16 }}>
            Assigned classes: {(teacher.classes || []).join(', ') || '—'}<br />
            Assigned subjects: {(teacher.subjects || []).join(', ') || '—'}<br />
            <em>Classes/subjects are set by your Super Admin.</em>
          </p>
        </div>
      )}
    </PanelLayout>
  );
}

// --- Super admin profile ----------------------------------------------------
function AdminProfile() {
  const auth = getAuthInfo();
  const [photoPath, setPhotoPath] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  function load() {
    api('/admin-settings').then((d) => setPhotoPath(d.photo_path)).catch((e) => setError(e.message));
  }
  useEffect(load, []);

  async function handleFile(file) {
    setUploading(true);
    setError('');
    try {
      const path = await uploadOwnAdminPhoto({ file });
      setPhotoPath(path);
    } catch (e) {
      setError('Could not upload photo: ' + e.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <PanelLayout items={ADMIN_ITEMS}>
      <h2>My Profile</h2>
      {error && <div className="error-box">{error}</div>}
      <div className="card profile-card">
        <AvatarUpload photoPath={photoPath} name="Super Admin" uploading={uploading} onFile={handleFile} />
        <p className="meta" style={{ textAlign: 'center' }}>Super Admin</p>
        <p className="meta" style={{ textAlign: 'center', marginTop: 14 }}>
          Username and password for the Super Admin account are set via environment variables on the server,
          not editable here — ask whoever deployed the site to change them.
        </p>
      </div>
    </PanelLayout>
  );
}

export default function Profile() {
  const auth = getAuthInfo();
  if (auth?.role === 'student') return <StudentProfile />;
  if (auth?.role === 'teacher') return <TeacherProfile />;
  if (auth?.role === 'super_admin') return <AdminProfile />;
  return null;
}
