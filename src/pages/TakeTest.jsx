import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, uploadAnswerFile, getAuthInfo } from '../lib/api.js';
import SchoolLogo from '../components/SchoolLogo.jsx';
import { SCHOOL_NAME } from '../lib/constants.js';

// Measures the offset between this device's clock and the server's clock
// ONCE, on load, so the countdown can't be tricked by changing the
// system clock. Falls back to the client clock if the call fails.
function useServerClock() {
  const offsetRef = useRef(0);
  useEffect(() => {
    api('/server-time')
      .then((d) => { offsetRef.current = new Date(d.now).getTime() - Date.now(); })
      .catch(() => {});
  }, []);
  return useCallback(() => Date.now() + offsetRef.current, []);
}

function useCountdown(endAt, nowFn, onExpire) {
  const [remaining, setRemaining] = useState(null);
  const fired = useRef(false);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire; // always call the freshest version

  useEffect(() => {
    if (!endAt) return;
    fired.current = false;
    const tick = () => {
      const ms = new Date(endAt).getTime() - nowFn();
      setRemaining(Math.max(0, ms));
      if (ms <= 0 && !fired.current) {
        fired.current = true;
        onExpireRef.current?.();
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endAt, nowFn]);

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
  const serverNow = useServerClock();

  const [test, setTest] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(draftKey) || '{}');
    } catch {
      return {};
    }
  });
  // Auto-submit fires from a timer callback captured on mount, so it can't
  // read fresh React state directly — this ref is always up to date, so
  // the student's very latest selections are never dropped on auto-submit.
  const answersRef = useRef(answers);
  useEffect(() => { answersRef.current = answers; }, [answers]);

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [uploadingFor, setUploadingFor] = useState(null);
  const [timeUpNotice, setTimeUpNotice] = useState(false);
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

  const handleSubmit = useCallback(async (auto = false) => {
    if (submittedRef.current) return;
    if (!auto && !window.confirm('Submit the test now? You cannot change answers after this.')) return;
    submittedRef.current = true;
    setSubmitting(true);
    setError('');
    try {
      const current = answersRef.current; // always the latest selections, even on auto-submit
      const payload = questions.map((q) => ({
        question_id: q.id,
        mcq_selected: current[q.id]?.mcq_selected ?? null,
        written_text: current[q.id]?.written_text ?? null,
        file_path: current[q.id]?.file_path ?? null,
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
  }, [questions, testId, draftKey, nav]);

  const remaining = useCountdown(test?.end_at, serverNow, () => setTimeUpNotice(true));

  // Give the student a moment to see the notice and glance at their answers,
  // then submit automatically — this guarantees a submission always goes
  // through once time is up, instead of leaving them stuck on a dead screen.
  useEffect(() => {
    if (!timeUpNotice) return;
    const t = setTimeout(() => handleSubmit(true), 5000);
    return () => clearTimeout(t);
  }, [timeUpNotice, handleSubmit]);

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

  if (error && !test) return <div className="container"><div className="error-box">{error}</div></div>;
  if (!test) return <div className="container center-note">Loading test…</div>;

  return (
    <div className="container">
      <div className="card test-header-card">
        <div className="test-header-brand">
          <SchoolLogo size={56} />
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

      {timeUpNotice && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(22,35,61,0.55)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20,
          }}
        >
          <div className="card" style={{ maxWidth: 380, textAlign: 'center' }}>
            <h3 style={{ marginBottom: 8 }}>⏱ Time's up!</h3>
            <p className="meta">
              Whatever you've selected or typed so far will be submitted now — no answer is lost.
            </p>
            <button className="primary" onClick={() => handleSubmit(true)} disabled={submitting} style={{ marginTop: 10 }}>
              {submitting ? 'Submitting…' : 'Submit now'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
