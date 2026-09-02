import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import PanelLayout from '../components/PanelLayout.jsx';

const ADMIN_ITEMS = [
  { to: '/admin', label: 'Overview', icon: '🏠', end: true },
  { to: '/admin/teachers', label: 'Teachers', icon: '🖊️' },
  { to: '/admin/students', label: 'Students', icon: '🎓' },
  { to: '/admin/papers', label: 'All papers', icon: '📄' },
  { to: '/admin/leaderboard', label: 'Leaderboard', icon: '🏆' },
  { to: '/admin/settings', label: 'School & branding', icon: '🎨' },
];

export default function AdminOverview() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/admin-overview-stats')
      .then((d) => setStats(d.stats))
      .catch((e) => setError(e.message));
  }, []);

  const statCards = [
    { label: 'Teacher accounts', value: stats?.teachers, icon: '🧑‍🏫', to: '/admin/teachers', action: 'Manage teachers' },
    { label: 'Students', value: stats?.students, icon: '🎓', to: '/admin/students', action: 'Manage students' },
    { label: 'Active teachers', value: stats?.activeTeachers, icon: '✓', to: '/admin/teachers', action: 'Review accounts' },
    { label: 'Papers set', value: stats?.papers, icon: '📄', to: '/admin/papers', action: 'View papers' },
  ];

  return (
    <PanelLayout items={ADMIN_ITEMS}>
      <div className="admin-dash-hero">
        <div>
          <span className="section-kicker">ADMINISTRATION</span>
          <h2>School portal overview</h2>
          <p className="meta">A quick view of accounts, assessments and academic configuration.</p>
        </div>
        <Link className="primary nav-action-button" to="/admin/settings">⚙ School settings</Link>
      </div>

      {error && <div className="error-box">{error}</div>}

      <div className="admin-stat-grid">
        {statCards.map((card, index) => (
          <Link key={card.label} to={card.to} className={`admin-stat-card tone-${['plum','green','blue','gold'][index]}`}>
            <div className="admin-stat-icon">{card.icon}</div>
            <div className="admin-stat-body">
              <div className="admin-stat-num">{stats ? card.value : '—'}</div>
              <div className="admin-stat-label">{card.label}</div>
            </div>
            <span className="admin-stat-cta">{card.action} →</span>
          </Link>
        ))}
      </div>

      <div className="admin-config-overview-grid">
        <div className="card admin-panel-card">
          <div className="admin-panel-card-head"><span className="admin-panel-icon">⚙</span><div><h3>Academic configuration</h3><span>Used throughout the portal</span></div></div>
          <div className="admin-config-counts">
            <div><strong>{stats?.classes ?? '—'}</strong><span>Classes</span></div>
            <div><strong>{stats?.sections ?? '—'}</strong><span>Sections</span></div>
            <div><strong>{stats?.subjects ?? '—'}</strong><span>Subjects</span></div>
          </div>
          <p className="meta">Add or remove classes, sections and subjects using simple controls — no list formatting required.</p>
          <Link className="nav-action-button nav-action-primary" to="/admin/settings">Configure academics</Link>
        </div>

        <div className="card admin-panel-card">
          <div className="admin-panel-card-head"><span className="admin-panel-icon">🛡</span><div><h3>Administration centre</h3><span>Daily management</span></div></div>
          <div className="admin-quick-links">
            <Link className="nav-action-button" to="/admin/teachers">Teachers</Link>
            <Link className="nav-action-button" to="/admin/students">Students</Link>
            <Link className="nav-action-button" to="/admin/papers">Papers</Link>
            <Link className="nav-action-button" to="/admin/leaderboard">Leaderboard</Link>
          </div>
          <p className="meta">Role permissions remain enforced on the server; this dashboard only provides navigation.</p>
        </div>
      </div>
    </PanelLayout>
  );
}
