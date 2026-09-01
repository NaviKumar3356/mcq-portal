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
  const [catalog, setCatalog] = useState(null);

  useEffect(() => {
    Promise.all([
      api('/teachers-manage').catch(() => ({ teachers: [] })),
      api('/students-list').catch(() => ({ students: [] })),
      api('/admin-tests-list').catch(() => ({ tests: [] })),
      api('/admin-catalog').catch(() => ({ classes: [], subjects: [], sections: [] })),
    ]).then(([t, s, p]) => {
      setStats({ teachers: t.teachers.length, students: s.students.length, papers: p.tests.length, activeTeachers: t.teachers.filter((x) => x.active).length });
      setCatalog({ classes: c.classes?.length || 0, subjects: c.subjects?.length || 0, sections: c.sections?.length || 0 });
    });
  }, []);

  return (
    <PanelLayout items={ADMIN_ITEMS}>
      <h2>Overview</h2>
      <div className="stat-grid">
        <div className="card stat-card">
          <div className="stat-num">{stats?.teachers ?? '—'}</div>
          <div className="stat-label">Teacher accounts</div>
          <Link className="nav-action-button" to="/admin/teachers">Manage</Link>
        </div>
        <div className="card stat-card">
          <div className="stat-num">{stats?.students ?? '—'}</div>
          <div className="stat-label">Students</div>
          <Link className="nav-action-button" to="/admin/students">Manage</Link>
        </div>
        <div className="card stat-card">
          <div className="stat-num">{stats?.activeTeachers ?? '—'}</div>
          <div className="stat-label">Active teachers</div>
          <Link className="nav-action-button" to="/admin/teachers">Review</Link>
        </div>
        <div className="card stat-card">
          <div className="stat-num">{stats?.papers ?? '—'}</div>
          <div className="stat-label">Papers set</div>
          <Link className="nav-action-button" to="/admin/papers">View</Link>
        </div>
      </div>

      <div className="stat-grid admin-mini-stat-grid">
        <div className="card stat-card"><div className="stat-num">{catalog?.classes ?? '—'}</div><div className="stat-label">Configured classes</div></div>
        <div className="card stat-card"><div className="stat-num">{catalog?.sections ?? '—'}</div><div className="stat-label">Sections</div></div>
        <div className="card stat-card"><div className="stat-num">{catalog?.subjects ?? '—'}</div><div className="stat-label">Subjects</div></div>
      </div>

      <div className="card">
        <div className="card-section-title">🎛️ Administration control centre</div>
        <p className="meta">Manage the school identity, public branding, logo, landing media and theme without editing the source code.</p>
        <div style={{display:'flex', gap:8, flexWrap:'wrap', marginTop:10}}>
          <Link className="nav-action-button nav-action-primary" to="/admin/settings">Open school settings</Link>
          <Link className="nav-action-button" to="/admin/teachers">Manage teachers</Link>
          <Link className="nav-action-button" to="/admin/students">Manage students</Link>
          <Link className="nav-action-button" to="/admin/papers">Manage papers</Link>
        </div>
      </div>

      <div className="card">
        <div className="card-section-title">🏆 Class leaderboards</div>
        <p className="meta">See how students in any class are ranking once results are published.</p>
        <Link className="nav-action-button" to="/admin/leaderboard">Open leaderboard</Link>
      </div>
    </PanelLayout>
  );
}
