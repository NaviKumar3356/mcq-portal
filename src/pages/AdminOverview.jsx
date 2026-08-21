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

  useEffect(() => {
    Promise.all([
      api('/teachers-manage').catch(() => ({ teachers: [] })),
      api('/students-list').catch(() => ({ students: [] })),
      api('/admin-tests-list').catch(() => ({ tests: [] })),
    ]).then(([t, s, p]) => {
      setStats({ teachers: t.teachers.length, students: s.students.length, papers: p.tests.length, activeTeachers: t.teachers.filter((x) => x.active).length });
    });
  }, []);

  return (
    <PanelLayout items={ADMIN_ITEMS}>
      <h2>Overview</h2>
      <div className="stat-grid">
        <div className="card stat-card">
          <div className="stat-num">{stats?.teachers ?? '—'}</div>
          <div className="stat-label">Teacher accounts</div>
          <Link to="/admin/teachers"><button className="secondary">Manage</button></Link>
        </div>
        <div className="card stat-card">
          <div className="stat-num">{stats?.students ?? '—'}</div>
          <div className="stat-label">Students</div>
          <Link to="/admin/students"><button className="secondary">Manage</button></Link>
        </div>
        <div className="card stat-card">
          <div className="stat-num">{stats?.activeTeachers ?? '—'}</div>
          <div className="stat-label">Active teachers</div>
          <Link to="/admin/teachers"><button className="secondary">Review</button></Link>
        </div>
        <div className="card stat-card">
          <div className="stat-num">{stats?.papers ?? '—'}</div>
          <div className="stat-label">Papers set</div>
          <Link to="/admin/papers"><button className="secondary">View</button></Link>
        </div>
      </div>

      <div className="card">
        <div className="card-section-title">🎛️ Administration control centre</div>
        <p className="meta">Manage the school identity, public branding, logo, landing media and theme without editing the source code.</p>
        <div style={{display:'flex', gap:8, flexWrap:'wrap', marginTop:10}}>
          <Link to="/admin/settings"><button className="primary">Open school settings</button></Link>
          <Link to="/admin/teachers"><button className="secondary">Manage teachers</button></Link>
          <Link to="/admin/students"><button className="secondary">Manage students</button></Link>
          <Link to="/admin/papers"><button className="secondary">Manage papers</button></Link>
        </div>
      </div>

      <div className="card">
        <div className="card-section-title">🏆 Class leaderboards</div>
        <p className="meta">See how students in any class are ranking once results are published.</p>
        <Link to="/admin/leaderboard"><button className="secondary">Open leaderboard</button></Link>
      </div>
    </PanelLayout>
  );
}
