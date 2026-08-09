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

export default function AnswerKey() {
  const { testId } = useParams();
  const nav = useNavigate();
  const auth = getAuthInfo();
  const isAdmin = auth?.role === 'super_admin';

  const [test, setTest] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api(`/answer-key?test_id=${testId}`)
      .then((d) => { setTest(d.test); setQuestions(d.questions); })
      .catch((e) => setError(e.message));
  }, [testId]);

  function updateQ(i, patch) {
    setQuestions((qs) => qs.map((q, idx) => (idx === i ? { ...q, ...patch } : q)));
  }

  async function save() {
    setSaving(true);
    setError('');
    try {
      await api('/answer-key', {
        method: 'POST',
        body: {
          test_id: testId,
          questions: questions.map((q) => ({ id: q.id, type: q.type, marks: q.marks, correct_option: q.correct_option })),
        },
      });
      nav(isAdmin ? '/admin/papers' : '/teacher');
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <PanelLayout items={isAdmin ? ADMIN_ITEMS : TEACHER_ITEMS}>
      <Link to={isAdmin ? '/admin/papers' : '/teacher'}>&larr; Back to papers</Link>
      <h2>Answer key {test && <span className="meta">— {test.title}</span>}</h2>
      {error && <div className="error-box">{error}</div>}
      {!test && !error && <p className="center-note">Loading…</p>}

      {questions.map((q, i) => (
        <div className="card" key={q.id}>
          <div className="eyebrow">Question {i + 1} — {q.type}</div>
          <div style={{ fontWeight: 600, marginBottom: 10 }}>{q.question_text}</div>

          {q.type === 'mcq' ? (
            <div>
              <label>Correct option</label>
              {(q.options || []).map((opt, oi) => (
                <div key={oi} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                  <input
                    type="radio"
                    checked={q.correct_option === oi}
                    onChange={() => updateQ(i, { correct_option: oi })}
                  />
                  <span>{opt}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="meta">Graded manually after submission — no fixed answer key for this type.</p>
          )}

          <div style={{ width: 120, marginTop: 10 }}>
            <label>Marks</label>
            <input
              type="text"
              inputMode="numeric"
              value={q.marks}
              onChange={(e) => updateQ(i, { marks: e.target.value })}
            />
          </div>
        </div>
      ))}

      {questions.length > 0 && (
        <button className="primary" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save answer key'}
        </button>
      )}
    </PanelLayout>
  );
}
