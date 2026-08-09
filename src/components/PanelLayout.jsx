import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { clearToken, getAuthInfo } from '../lib/api.js';
import SchoolLogo from './SchoolLogo.jsx';
import { SCHOOL_SHORT } from '../lib/constants.js';

export default function PanelLayout({ items, children }) {
  const nav = useNavigate();
  const auth = getAuthInfo();

  return (
    <div className="panel-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <SchoolLogo size={30} light />
          <span>{SCHOOL_SHORT}</span>
        </div>

        <div className="sidebar-who">
          <div className="sidebar-role">{auth?.role === 'super_admin' ? 'Super Admin' : 'Teacher'}</div>
          <div className="sidebar-name">{auth?.name || auth?.role}</div>
        </div>

        <nav className="sidebar-nav">
          {items.map((it) => (
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
