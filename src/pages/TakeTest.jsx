import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, uploadAnswerFile, getAuthInfo } from '../lib/api.js';
import SchoolLogo from '../components/SchoolLogo.jsx';
import { SCHOOL_NAME } from '../lib/constants.js';

function useCountdown(endAt, onExpire) {
  const [remaining, setRemaining] = useState(null);
  const fired = useRef(false);

  useEffect(() => {
    if (!endAt) return;
    const tick = () => {
      const ms = new Date(endAt).getTime() - Date.now();
      setRemaining(Math.max(0, ms));
      if (ms <= 0 && !fired.current) {
        fired.current = true;
        onExpire?.();
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endAt]);

  return remaining;
}

function formatMs(ms) {
  if (ms == null) return '--:--';
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60).toString().padStart(2, '0');
  const s = (total % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function TakeTest() {
  const { testId } = useParams();
  const nav = useNavigate();
  const auth = getAuthInfo();
  const draftKey = `draft:${testId}:${auth?.student_id || 'anon'}`;

  const [test, setTest] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(draftKey) || '{}');
    } catch {
      return {};
    }
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [uploadingFor, setUploadingFor] = useState(null);
  const submittedRef = useRef(false);

  useEffect(() => {
    api(`/test-detail?test_id=${testId}`)
      .then((d) => {
        setTest(d.test);
        setQuestions(d.questions);
      })
      .catch((e) => setError(e.message));
  }, [testId]);

  // Save a local draft on every change so a page refresh never loses progress —
  // it's only cleared once the test is actually submitted.
  useEffect(() => {
    localStorage.setItem(draftKey, JSON.stringify(answers));
  }, [answers, draftKey]);

  const remaining = useCountdown(test?.end_at, () => handleSubmit(true));

  function setAnswer(qId, patch) {
    setAnswers((prev) => ({ ...prev, [qId]: { ...prev[qId], ...patch } }));
  }

  async function handleFile(qId, file) {
    setUploadingFor(qId);
    try {
      const path = await uploadAnswerFile({ test_id: testId, question_id: qId, file });
      setAnswer(qId, { file_path: path, file_name: file.name });
    } catch (e) {
      setError(e.message);
    } finally {
      setUploadingFor(null);
    }
  }

  async function handleSubmit(auto = false) {
    if (submittedRef.current) return;
    if (!auto && !window.confirm('Submit the test now? You cannot change answers after this.')) return;
    submittedRef.current = true;
    setSubmitting(true);
    setError('');
    try {
      const payload = questions.map((q) => ({
        question_id: q.id,
        mcq_selected: answers[q.id]?.mcq_selected ?? null,
        written_text: answers[q.id]?.written_text ?? null,
        file_path: answers[q.id]?.file_path ?? null,
      }));
      await api('/submit-test', { method: 'POST', body: { test_id: testId, answers: payload } });
      localStorage.removeItem(draftKey);
      nav('/student/dashboard');
    } catch (e) {
      submittedRef.current = false;
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (error && !test) return <div className="container"><div className="error-box">{error}</div></div>;
  if (!test) return <div className="container center-note">Loading test…</div>;

  return (
    <div className="container">
      <div className="card test-header-card">
        <div className="test-header-brand">
          <SchoolLogo size={40} />
          <div>
            <div className="test-header-school">{SCHOOL_NAME}</div>
            <h2 style={{ margin: 0 }}>{test.title}</h2>
            <div className="meta">{test.subject} · {test.total_marks} marks</div>
          </div>
        </div>
        {test.end_at && <div className="timer">⏱ {formatMs(remaining)}</div>}
      </div>

      {error && <div className="error-box">{error}</div>}

      <div className="card">
        {questions.map((q, idx) => (
          <div className="question-block" key={q.id}>
            <span className="q-marks">{q.marks} mark{q.marks === 1 ? '' : 's'}</span>
            <div style={{ fontWeight: 600, marginBottom: 10 }}>
              {idx + 1}. {q.question_text}
            </div>

            {q.type === 'mcq' && (
              <div>
                {(q.options || []).map((opt) => (
                  <div
                    key={opt.index}
                    className={`option-row ${answers[q.id]?.mcq_selected === opt.index ? 'selected' : ''}`}
                    onClick={() => setAnswer(q.id, { mcq_selected: opt.index })}
                  >
                    <input type="radio" checked={answers[q.id]?.mcq_selected === opt.index} readOnly />
                    {opt.text}
                  </div>
                ))}
              </div>
            )}

            {q.type === 'written' && (
              <textarea
                placeholder="Type your answer…"
                value={answers[q.id]?.written_text || ''}
                onChange={(e) => setAnswer(q.id, { written_text: e.target.value })}
              />
            )}

            {q.type === 'upload' && (
              <div>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => e.target.files[0] && handleFile(q.id, e.target.files[0])}
                />
                {uploadingFor === q.id && <p className="meta">Uploading…</p>}
                {answers[q.id]?.file_name && <p className="meta">✓ Uploaded: {answers[q.id].file_name}</p>}
              </div>
            )}
          </div>
        ))}
      </div>

      <button className="primary" onClick={() => handleSubmit(false)} disabled={submitting}>
        {submitting ? 'Submitting…' : 'Submit test'}
      </button>
    </div>
  );
}
