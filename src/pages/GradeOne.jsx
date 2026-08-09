import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api, getAuthInfo } from '../lib/api.js';
import PanelLayout from '../components/PanelLayout.jsx';

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
];

export default function GradeOne() {
  const { submissionId } = useParams();
  const nav = useNavigate();
  const auth = getAuthInfo();
  const isAdmin = auth?.role === 'super_admin';

  const [data, setData] = useState(null);
  const [marks, setMarks] = useState({});
  const [remarks, setRemarks] = useState({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api(`/submission-detail?submission_id=${submissionId}`).then((d) => {
      setData(d);
      const m = {}, r = {};
      d.answers.forEach((a) => {
        m[a.id] = a.marks_awarded ?? '';
        r[a.id] = a.teacher_remark ?? '';
      });
      setMarks(m);
      setRemarks(r);
    }).catch((e) => setError(e.message));
  }, [submissionId]);

  async function save() {
    setSaving(true);
    setError('');
    try {
      const grades = data.answers.map((a) => ({
        answer_id: a.id,
        marks_awarded: Number(marks[a.id] || 0),
        teacher_remark: remarks[a.id],
      }));
      await api('/grade-submission', { method: 'POST', body: { submission_id: submissionId, grades } });
      nav(-1);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (error && !data) {
    return (
      <PanelLayout items={isAdmin ? ADMIN_ITEMS : TEACHER_ITEMS}>
        <div className="error-box">{error}</div>
      </PanelLayout>
    );
  }
  if (!data) {
    return (
      <PanelLayout items={isAdmin ? ADMIN_ITEMS : TEACHER_ITEMS}>
        <p className="center-note">Loading…</p>
      </PanelLayout>
    );
  }

  return (
    <PanelLayout items={isAdmin ? ADMIN_ITEMS : TEACHER_ITEMS}>
      <Link to="#" onClick={(e) => { e.preventDefault(); nav(-1); }}>&larr; Back</Link>
      <div className="card">
        <h2>{data.submission.students?.name}</h2>
        <p className="meta">Roll {data.submission.students?.roll_number} · {data.submission.students?.class}</p>
      </div>

      {error && <div className="error-box">{error}</div>}

      {data.answers.map((a, i) => (
        <div className="card" key={a.id}>
          <div className="eyebrow">Question {i + 1} — {a.questions.type} — {a.questions.marks} marks</div>
          <div style={{ fontWeight: 600, marginBottom: 10 }}>{a.questions.question_text}</div>

          {a.questions.type === 'mcq' && (
            <p>
              Answer: <strong>{a.questions.options?.[a.mcq_selected] ?? 'Not answered'}</strong>
              {' — '}Correct: <strong>{a.questions.options?.[a.questions.correct_option]}</strong>
              {' — '}Auto-scored: <strong>{a.marks_awarded ?? 0}</strong>
            </p>
          )}

          {a.questions.type === 'written' && (
            <div className="card" style={{ background: 'var(--paper)' }}>
              {a.written_text || <em>No answer submitted</em>}
            </div>
          )}

          {a.questions.type === 'upload' && (
            <div className="file-thumb">
              {a.file_url ? <img src={a.file_url} alt="Uploaded answer" /> : <em>No file uploaded</em>}
            </div>
          )}

          {a.questions.type !== 'mcq' && (
            <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
              <div style={{ width: 120 }}>
                <label>Marks (/{a.questions.marks})</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={marks[a.id]}
                  onChange={(e) => setMarks((m) => ({ ...m, [a.id]: e.target.value }))}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label>Remark (optional)</label>
                <input
                  type="text"
                  value={remarks[a.id]}
                  onChange={(e) => setRemarks((r) => ({ ...r, [a.id]: e.target.value }))}
                />
              </div>
            </div>
          )}

          {a.questions.type === 'mcq' && (
            <div style={{ marginTop: 12 }}>
              <label>Remark (optional — not required for MCQ, but available)</label>
              <input
                type="text"
                placeholder="e.g. Good, but check the sign next time"
                value={remarks[a.id]}
                onChange={(e) => setRemarks((r) => ({ ...r, [a.id]: e.target.value }))}
              />
            </div>
          )}
        </div>
      ))}

      <button className="primary" onClick={save} disabled={saving}>
        {saving ? 'Saving…' : 'Save grades'}
      </button>
    </PanelLayout>
  );
}
