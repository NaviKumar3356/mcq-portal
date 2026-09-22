import React, { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import PanelLayout from '../components/PanelLayout.jsx';

const ADMIN_ITEMS = [
  { to: '/admin', label: 'Overview', icon: '🏠', end: true },
  { to: '/admin/teachers', label: 'Teachers', icon: '🖊️' },
  { to: '/admin/students', label: 'Students', icon: '🎓' },
  { to: '/admin/papers', label: 'All papers', icon: '📄' },
  { to: '/admin/analytics', label: 'Analytics', icon: '📊' },
  { to: '/admin/leaderboard', label: 'Leaderboard', icon: '🏆' },
  { to: '/admin/settings', label: 'School & branding', icon: '🎨' },
];

const ATTEMPT_LABELS = { original: 'Original attempt', reopen: 'Reopened', make_up: 'Make-up' };
const ATTEMPT_TONES = { original: 'blue', reopen: 'gold', make_up: 'plum' };

function fmtDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });
}

function fmtIdle(seconds) {
  if (seconds == null) return '—';
  if (seconds < 60) return 'just now';
  const mins = Math.round(seconds / 60);
  return `${mins}m idle`;
}

function Bar({ label, value, total, tone }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="analytics-bar-row">
      <div className="analytics-bar-label"><span>{label}</span><strong>{value}</strong></div>
      <div className="analytics-bar-track">
        <div className={`analytics-bar-fill tone-${tone}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function AdminAnalytics() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/admin-analytics').then(setData).catch((e) => setError(e.message));
  }, []);

  const attemptTotal = data ? Object.values(data.submissions.byAttemptType).reduce((a, b) => a + b, 0) : 0;

  return (
    <PanelLayout items={ADMIN_ITEMS}>
      <div className="admin-dash-hero">
        <div>
          <span className="section-kicker">ADMINISTRATION</span>
          <h2>Analytics &amp; audit trail</h2>
          <p className="meta">Live session activity, flagged attempts and reattempt history across the portal.</p>
        </div>
      </div>

      {error && <div className="error-box">{error}</div>}
      {data?.notices?.map((n) => (
        <div className="notice-strip notice-warning" style={{ display: 'block', marginBottom: 10 }} key={n}>{n}</div>
      ))}

      <div className="grade-review-stats">
        <div className="grade-stat-card"><span className="grade-stat-icon">🟢</span><strong>{data ? data.sessions.active : '—'}</strong><small>Signed in now</small></div>
        <div className="grade-stat-card success"><span className="grade-stat-icon">✓</span><strong>{data ? data.submissions.graded : '—'}</strong><small>Graded</small></div>
        <div className="grade-stat-card warning"><span className="grade-stat-icon">⏳</span><strong>{data ? data.submissions.submitted : '—'}</strong><small>Pending grading</small></div>
        <div className="grade-stat-card danger"><span className="grade-stat-icon">✕</span><strong>{data ? data.submissions.absent : '—'}</strong><small>Marked absent</small></div>
        <div className="grade-stat-card flag"><span className="grade-stat-icon">⚠</span><strong>{data ? data.submissions.flagged : '—'}</strong><small>Flagged attempts</small></div>
        <div className="grade-stat-card neutral"><span className="grade-stat-icon">🗓</span><strong>{data ? data.tests.liveNow : '—'}</strong><small>Papers live now</small></div>
      </div>

      <div className="admin-config-overview-grid">
        <div className="card admin-panel-card">
          <div className="admin-panel-card-head"><span className="admin-panel-icon">🧮</span><div><h3>Attempt breakdown</h3><span>Original vs reopened vs make-up</span></div></div>
          {data && attemptTotal > 0 ? (
            Object.entries(data.submissions.byAttemptType).map(([type, count]) => (
              <Bar key={type} label={ATTEMPT_LABELS[type] || type} value={count} total={attemptTotal} tone={ATTEMPT_TONES[type] || 'blue'} />
            ))
          ) : (
            <p className="meta">No submissions recorded yet.</p>
          )}
        </div>

        <div className="card admin-panel-card">
          <div className="admin-panel-card-head"><span className="admin-panel-icon">🗓</span><div><h3>Examination timing</h3><span>Across every paper</span></div></div>
          <div className="admin-config-counts">
            <div><strong>{data?.tests.liveNow ?? '—'}</strong><span>Live now</span></div>
            <div><strong>{data?.tests.upcoming ?? '—'}</strong><span>Upcoming</span></div>
            <div><strong>{data?.tests.draft ?? '—'}</strong><span>Draft</span></div>
            <div><strong>{data?.tests.closed ?? '—'}</strong><span>Closed</span></div>
          </div>
          <p className="meta">Timing is server-controlled per the paper's scheduled start/deadline, not a student's login time.</p>
        </div>
      </div>

      <div className="card admin-panel-card">
        <div className="admin-panel-card-head"><span className="admin-panel-icon">🟢</span><div><h3>Students currently signed in</h3><span>One active device per student account</span></div></div>
        {data && data.sessions.list.length === 0 && <p className="meta">Nobody is currently signed in.</p>}
        {data && data.sessions.list.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table className="grade-table">
              <thead><tr><th>Student</th><th>Roll no.</th><th>Class</th><th>Activity</th></tr></thead>
              <tbody>
                {data.sessions.list.map((s, i) => (
                  <tr key={i}>
                    <td>{s.student_name}</td>
                    <td>{s.roll_number || '—'}</td>
                    <td>{s.class || '—'}</td>
                    <td>{fmtIdle(s.idle_seconds)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card admin-panel-card">
        <div className="admin-panel-card-head"><span className="admin-panel-icon">⚠</span><div><h3>Flagged attempts</h3><span>Auto-submitted for repeated tab/window switching</span></div></div>
        {data && data.flaggedSubmissions.length === 0 && <p className="meta">No flagged attempts.</p>}
        {data && data.flaggedSubmissions.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table className="grade-table">
              <thead><tr><th>Paper</th><th>Student</th><th>Class</th><th>Switch count</th><th>Submitted</th></tr></thead>
              <tbody>
                {data.flaggedSubmissions.map((f) => (
                  <tr key={f.id}>
                    <td>{f.test_title}</td>
                    <td>{f.student_name}{f.roll_number ? ` (${f.roll_number})` : ''}</td>
                    <td>{f.class || '—'}</td>
                    <td>{f.tab_switch_count}</td>
                    <td>{fmtDateTime(f.submitted_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card admin-panel-card">
        <div className="admin-panel-card-head"><span className="admin-panel-icon">🧾</span><div><h3>Recent activity</h3><span>Latest submitted/graded attempts</span></div></div>
        {data && data.recentActivity.length === 0 && <p className="meta">No submissions yet.</p>}
        {data && data.recentActivity.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table className="grade-table">
              <thead><tr><th>Paper</th><th>Student</th><th>Class</th><th>Type</th><th>Status</th><th>When</th></tr></thead>
              <tbody>
                {data.recentActivity.map((a) => (
                  <tr key={a.id}>
                    <td>{a.test_title}</td>
                    <td>{a.student_name}</td>
                    <td>{a.class || '—'}</td>
                    <td>{ATTEMPT_LABELS[a.attempt_type] || a.attempt_type}</td>
                    <td>
                      {a.status === 'graded' ? '✓ Graded' : '⏳ Pending'}
                      {a.flagged ? ' · ⚠ Flagged' : ''}
                      {a.absent ? ' · ✕ Absent' : ''}
                    </td>
                    <td>{fmtDateTime(a.submitted_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card admin-panel-card">
        <div className="admin-panel-card-head"><span className="admin-panel-icon">↻</span><div><h3>Reattempt &amp; make-up audit trail</h3><span>Who reopened which attempt, and for how long</span></div></div>
        {data && data.recentReopens.length === 0 && <p className="meta">No reattempts or make-ups have been granted yet.</p>}
        {data && data.recentReopens.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table className="grade-table">
              <thead><tr><th>Paper</th><th>Student</th><th>Type</th><th>Duration</th><th>Granted by</th><th>When</th></tr></thead>
              <tbody>
                {data.recentReopens.map((r) => (
                  <tr key={r.id}>
                    <td>{r.test_title}</td>
                    <td>{r.student_name}</td>
                    <td>{ATTEMPT_LABELS[r.attempt_type] || r.attempt_type}</td>
                    <td>{r.reopen_minutes ? `${r.reopen_minutes} min` : 'Paper default'}</td>
                    <td>{r.reopened_by_name || '—'}</td>
                    <td>{fmtDateTime(r.reopened_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PanelLayout>
  );
}
