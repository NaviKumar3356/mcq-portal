import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { api, clearToken, getAuthInfo, getPhotoUrl } from '../lib/api.js';
import SchoolLogo from './SchoolLogo.jsx';
import { SCHOOL_SHORT } from '../lib/constants.js';

function initials(name) {
  return (name || '?').trim().split(/\s+/).slice(0, 2).map((n) => n[0]?.toUpperCase() || '').join('');
}

// Renders every panel's sidebar. Appends a "My profile" link and shows the
// logged-in person's own avatar automatically, so every teacher/admin page
// gets this without having to add it to each page's own nav-items array.
export default function PanelLayout({ items, children }) {
  const nav = useNavigate();
  const auth = getAuthInfo();
  const [photoPath, setPhotoPath] = useState(null);

  useEffect(() => {
    if (auth?.role === 'teacher') {
      api('/teacher-profile').then((d) => setPhotoPath(d.teacher?.photo_path || null)).catch(() => {});
    } else if (auth?.role === 'super_admin') {
      api('/admin-settings').then((d) => setPhotoPath(d.photo_path || null)).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth?.role]);

  const profileLink = { to: auth?.role === 'super_admin' ? '/admin/profile' : '/teacher/profile', label: 'My profile', icon: '👤' };
  const hasProfileLink = items.some((it) => it.label === 'My profile');
  const navItems = hasProfileLink ? items : [...items, profileLink];

  return (
    <div className={`panel-shell panel-shell-${auth?.role === 'super_admin' ? 'admin' : 'teacher'}`}>
      <div className="mobile-panel-header">
        <div className="mobile-panel-brand"><SchoolLogo size={34} /><div><strong>{SCHOOL_SHORT}</strong><span>{auth?.role === 'super_admin' ? 'Administration' : 'Teacher portal'}</span></div></div>
        <button className="mobile-panel-menu" type="button" onClick={() => document.querySelector('.sidebar')?.classList.toggle('mobile-open')} aria-label="Open navigation">☰</button>
      </div>
      <aside className="sidebar" onClick={(e) => { if (e.target.closest('.sidebar-link')) e.currentTarget.classList.remove('mobile-open'); }}>
        <div className="sidebar-brand">
          <SchoolLogo size={42} />
          <span>{SCHOOL_SHORT}</span>
        </div>

        <div className="sidebar-who">
          {photoPath ? (
            <img className="sidebar-avatar" src={getPhotoUrl(photoPath)} alt={auth?.name || 'avatar'} />
          ) : (
            <span className="sidebar-avatar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.14)', fontWeight: 700, fontSize: '0.8rem' }}>
              {initials(auth?.name || auth?.role)}
            </span>
          )}
          <div>
            <div className="sidebar-role">{auth?.role === 'super_admin' ? 'Super Admin' : 'Teacher'}</div>
            <div className="sidebar-name">{auth?.name || auth?.role}</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              end={it.end}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              <span className="sidebar-link-icon">{it.icon}</span> {it.label}
            </NavLink>
          ))}
        </nav>

        <button
          className="sidebar-logout"
          onClick={() => {
            clearToken();
            nav('/');
          }}
        >
          &larr; Log out
        </button>
      </aside>

      <main className="panel-content">{children}</main>
    </div>
  );
}
