import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  api, getAuthInfo, setToken,
  uploadOwnStudentPhoto, uploadOwnTeacherPhoto, uploadOwnAdminPhoto, getPhotoUrl,
} from '../lib/api.js';
import PanelLayout from '../components/PanelLayout.jsx';
import SchoolLogo from '../components/SchoolLogo.jsx';
import StudentAvatar from '../components/StudentAvatar.jsx';
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
  { to: '/admin/settings', label: 'School & branding', icon: '🎨' },
];


function AvatarUpload({ photoPath, name, uploading, onFile, useStudentDefault = false }) {
  return (
    <label className="profile-avatar-upload" title="Click to add/change photo">
      {uploading ? (
        <span className="avatar-fallback">…</span>
      ) : useStudentDefault ? (
        <StudentAvatar student={{ name, photo_path: photoPath }} alt={name} />
      ) : (
        <img src={photoPath ? getPhotoUrl(photoPath) : '/default-student-avatar.svg'} alt={name} />
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

// Shared header block: avatar + display name + optional handle + role pill.
// Keeping this in one place means the student / teacher / admin profile
// cards all get the exact same polished layout instead of three
// slightly-different hand-rolled ones.
function ProfileHead({ photoPath, name, uploading, onFile, roleLabel, roleClass, handle, useStudentDefault = false }) {
  return (
    <div className="profile-card-head">
      <AvatarUpload photoPath={photoPath} name={name} uploading={uploading} onFile={onFile} useStudentDefault={useStudentDefault} />
      <div className="profile-card-name">{name}</div>
      {handle && <div className="profile-card-handle">@{handle}</div>}
      {roleLabel && <span className={`profile-role-pill ${roleClass || ''}`}>{roleLabel}</span>}
    </div>
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
        <Link className="nav-action-button secondary" to="/student/dashboard">← Back to my tests</Link>
      </div>

      <div className="card profile-card">
        <ProfileHead
          photoPath={photoPath}
          name={auth?.name}
          uploading={uploading}
          onFile={handleFile}
          roleLabel={`Roll ${auth?.roll_number} · Class ${auth?.class}`}
          useStudentDefault
        />
        {error && <div className="error-box">{error}</div>}
        <div className="assigned-box" style={{ textAlign: 'center' }}>
          Tap your photo to add or change it — this also appears on the school-wide Hall of Fame leaderboard
          if you make the top ranks. Other details (name, roll number, class, DOB) are managed by your
          teacher — ask them if anything needs correcting.
        </div>
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
          <ProfileHead
            photoPath={teacher.photo_path}
            name={teacher.name}
            uploading={uploading}
            onFile={handleFile}
            handle={teacher.username}
            roleLabel="Teacher"
          />

          <form onSubmit={saveProfile}>
            <label htmlFor="teacher-full-name">Full name</label>
            <div className="profile-input-wrap">
              <span className="profile-input-icon">✦</span>
              <input id="teacher-full-name" type="text" value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" />
            </div>
            <label className="profile-password-heading">Change password (optional)</label>
            <input
              className="profile-form-input"
              type="password"
              placeholder="Current password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
            <input
              className="profile-form-input"
              type="password"
              placeholder="New password (leave blank to keep current)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />

            {success && <p style={{ color: 'var(--accent-dark)', fontWeight: 600, marginTop: 10 }}>{success}</p>}

            <button className="primary" type="submit" disabled={saving} style={{ marginTop: 16, width: '100%' }}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </form>

          <div className="assigned-box">
            <strong>Assigned classes:</strong> {(teacher.classes || []).join(', ') || '—'}<br />
            <strong>Assigned subjects:</strong> {(teacher.subjects || []).join(', ') || '—'}<br />
            <em>Classes/subjects are set by your Super Admin.</em>
          </div>
        </div>
      )}
    </PanelLayout>
  );
}

// --- Super admin profile ----------------------------------------------------
function AdminProfile() {
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
        <ProfileHead
          photoPath={photoPath}
          name="Super Admin"
          uploading={uploading}
          onFile={handleFile}
          roleLabel="Super Admin"
          roleClass="role-admin"
        />
        <div className="assigned-box" style={{ textAlign: 'center' }}>
          Username and password for the Super Admin account are set via environment variables on the server,
          not editable here — ask whoever deployed the site to change them.
        </div>
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
