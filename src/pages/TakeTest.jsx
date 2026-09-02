import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, uploadAnswerFile, getAuthInfo } from '../lib/api.js';
import SchoolLogo from '../components/SchoolLogo.jsx';
import { SCHOOL_NAME } from '../lib/constants.js';

// How many times a student can switch tabs / lose window focus before the
// test is auto-submitted and flagged for the teacher. Change this one
// number to make the policy stricter or looser.
const MAX_TAB_SWITCHES = 3;

// Measures the offset between this device's clock and the server's clock
// ONCE, on load, so the countdown can't be tricked by changing the
// system clock. Falls back to the client clock if the call fails.
//
// --- Reopen auto-submit bug fix -----------------------------------------
// This hook now also exposes a `ready` flag. Previously the countdown
// effect below could run its very first tick() BEFORE this async
// server-time fetch resolved, using offset=0 (i.e. trusting the device's
// own clock). For a normal test that's harmless — the deadline is far in
// the future either way — but for a freshly REOPENED test, the fresh
// deadline is often only a few minutes away. If a student's device clock
// was running even slightly fast, that first, uncorrected tick could read
// as "already expired" and fire the auto-submit instantly, before the
// student ever got to see a question. Gating the countdown on `ready`
// means it simply doesn't tick — and can never auto-submit — until we
// actually know the real server time.
function useServerClock() {
  const offsetRef = useRef(0);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    api('/server-time')
      .then((d) => { offsetRef.current = new Date(d.now).getTime() - Date.now(); })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);
  const nowFn = useCallback(() => Date.now() + offsetRef.current, []);
  return { nowFn, ready };
}

function useCountdown(endAt, nowFn, ready, onExpire) {
  const [remaining, setRemaining] = useState(null);
  const fired = useRef(false);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire; // always call the freshest version

  useEffect(() => {
    if (!endAt || !ready) return; // wait for the real server clock before ticking
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
  }, [endAt, nowFn, ready]);

  return remaining;
}

function formatMs(ms) {
  if (ms == null) return '--:--';
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60).toString().padStart(2, '0');
  const s = (total % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

// Anti-cheating: watches for the student leaving this tab (switching tabs,
// minimizing, switching apps) or the window losing focus. Every switch is
// logged; hitting MAX_TAB_SWITCHES calls onMaxExceeded exactly once, which
// the caller uses to auto-submit and flag the attempt.
//
// Both 'visibilitychange' (hidden) and window 'blur' are listened for,
// since different OS/browser combos surface tab/app switches differently —
// a short de-dupe window stops the same switch being counted twice when
// both fire together.
function useTabProctor(active, onMaxExceeded) {
  const [switchCount, setSwitchCount] = useState(0);
  const [warningOpen, setWarningOpen] = useState(false);
  const [tabHidden, setTabHidden] = useState(false);
  const countRef = useRef(0);
  const logRef = useRef([]);
  const exceededRef = useRef(false);
  const lastFlagAt = useRef(0);
  const onMaxExceededRef = useRef(onMaxExceeded);
  onMaxExceededRef.current = onMaxExceeded;

  useEffect(() => {
    if (!active) return;

    function flag(type) {
      if (exceededRef.current) return;
      const now = Date.now();
      if (now - lastFlagAt.current < 500) return; // de-dupe simultaneous events
      lastFlagAt.current = now;
      countRef.current += 1;
      logRef.current = [...logRef.current, { at: new Date().toISOString(), type }];
      setSwitchCount(countRef.current);
      setWarningOpen(true);
      if (countRef.current >= MAX_TAB_SWITCHES) {
        exceededRef.current = true;
        onMaxExceededRef.current?.(countRef.current, logRef.current);
      }
    }

    function onVisibility() {
      if (document.hidden) {
        setTabHidden(true);
        flag('tab_hidden');
      } else {
        setTabHidden(false);
      }
    }
    function onBlur() {
      setTabHidden(true);
      flag('window_blur');
    }
    function onFocus() {
      setTabHidden(false);
    }

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onBlur);
    window.addEventListener('focus', onFocus);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focus', onFocus);
    };
  }, [active]);

  return {
    switchCount,
    warningOpen,
    tabHidden,
    acknowledgeWarning: () => setWarningOpen(false),
    getLog: () => logRef.current,
  };
}

export default function TakeTest() {
  const { testId } = useParams();
  const nav = useNavigate();
  const auth = getAuthInfo();
  const draftKey = `draft:${testId}:${auth?.student_id || 'anon'}`;
  const { nowFn: serverNow, ready: clockReady } = useServerClock();

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
  const [cheatLocked, setCheatLocked] = useState(false);
  const submittedRef = useRef(false);

  useEffect(() => {
    api(`/test-detail?test_id=${testId}`)
      .then((d) => {
        setTest(d.test);
        setQuestions(d.questions);
      })
      .catch((e) => setError(e.message));
  }, [testId]);

  // Seed each practical question's starter code into the draft exactly
  // once, the first time it loads — never overwrite anything the student
  // has already typed (e.g. from a refresh-recovered draft).
  useEffect(() => {
    if (questions.length === 0) return;
    setAnswers((prev) => {
      let changed = false;
      const next = { ...prev };
      questions.forEach((q) => {
        if (q.type === 'practical' && next[q.id]?.written_text === undefined) {
          next[q.id] = { ...next[q.id], written_text: q.starter_code || '' };
          changed = true;
        }
      });
      return changed ? next : prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questions]);

  // Save a local draft on every change so a page refresh never loses progress —
  // it's only cleared once the test is actually submitted.
  useEffect(() => {
    localStorage.setItem(draftKey, JSON.stringify(answers));
  }, [answers, draftKey]);

  const handleSubmit = useCallback(async (auto = false, reason = null, tabInfo = null) => {
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
      await api('/submit-test', {
        method: 'POST',
        body: {
          test_id: testId,
          answers: payload,
          tab_switch_count: tabInfo?.count ?? 0,
          flagged_reason: reason,
          proctor_log: tabInfo?.log ?? [],
        },
      });
      localStorage.removeItem(draftKey);
      nav('/student/dashboard');
    } catch (e) {
      submittedRef.current = false;
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }, [questions, testId, draftKey, nav]);

  // Lets useTabProctor's onMaxExceeded call the freshest handleSubmit
  // without needing to be re-created every render.
  const handleSubmitRef = useRef(handleSubmit);
  useEffect(() => { handleSubmitRef.current = handleSubmit; }, [handleSubmit]);

  const onMaxSwitchesExceeded = useCallback((count, log) => {
    setCheatLocked(true);
    handleSubmitRef.current?.(true, 'tab_switching', { count, log });
  }, []);

  const proctor = useTabProctor(!!test && !submittedRef.current, onMaxSwitchesExceeded);

  // test.end_at is always the EFFECTIVE deadline for this student — for a
  // normal attempt that's the paper's own end_at, but for a reopened
  // attempt the server already computed a fresh window starting from the
  // moment of reopening (see test-detail.js). The `clockReady` gate below
  // is the other half of the reopen-auto-submit fix — see useServerClock
  // above for why it's needed.
  const remaining = useCountdown(test?.end_at, serverNow, clockReady, () =>
    handleSubmit(true, null, { count: proctor.switchCount, log: proctor.getLog() })
  );

  const timeUpFired = useRef(false);
  useEffect(() => {
    if (remaining === 0 && !timeUpFired.current) {
      timeUpFired.current = true;
      setTimeUpNotice(true);
    }
  }, [remaining]);

  // Give the student a moment to see the notice and glance at their answers,
  // then submit automatically — this guarantees a submission always goes
  // through once time is up, instead of leaving them stuck on a dead screen.
  useEffect(() => {
    if (!timeUpNotice) return;
    const t = setTimeout(
      () => handleSubmit(true, null, { count: proctor.switchCount, log: proctor.getLog() }),
      5000
    );
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeUpNotice]);

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

  const blurred = proctor.tabHidden || proctor.warningOpen;

  return (
    <div className="container">
      <div className={blurred ? 'proctor-blur' : ''}>
        <div className="card test-header-card">
          <div className="test-header-brand">
            <SchoolLogo size={56} />
            <div>
              <div className="test-header-school">{SCHOOL_NAME}</div>
              <h2 style={{ margin: 0 }}>{test.title}</h2>
              <div className="meta">{test.subject} · {test.total_marks} marks</div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            {test.reopened && <span className="pill open" style={{ marginBottom: 6, display: 'inline-block' }}>Reopened attempt</span>}
            {test.end_at && <div className="timer">⏱ {clockReady ? formatMs(remaining) : 'Syncing…'}</div>}
            <div className="meta" style={{ marginTop: 6 }}>
              🛡 Tab switches: {proctor.switchCount} / {MAX_TAB_SWITCHES}
            </div>
          </div>
        </div>

        {error && <div className="error-box">{error}</div>}

        <div className="card">
          {questions.map((q, idx) => (
            <div className="question-block" key={q.id}>
              <span className="q-marks">{q.marks} mark{q.marks === 1 ? '' : 's'}</span>
              {q.type !== 'practical' && (
                <div style={{ fontWeight: 600, marginBottom: 10 }}>
                  {idx + 1}. {q.question_text}
                </div>
              )}

              {q.resource_url && (
                <div className="question-resource-student">
                  <div className="meta">📎 QUESTION RESOURCE</div>
                  {q.resource_mime?.startsWith('image/') ? <img src={q.resource_url} alt={q.resource_name || 'Question reference'} className="question-reference-image" /> : null}
                  <a className="secondary small nav-action-button" href={q.resource_url} target="_blank" rel="noreferrer">⬇ {q.resource_name || 'Open / download resource'}</a>
                </div>
              )}

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
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.psd,.xcf"
                    onChange={(e) => e.target.files[0] && handleFile(q.id, e.target.files[0])}
                  />
                  {uploadingFor === q.id && <p className="meta">Uploading…</p>}
                  {answers[q.id]?.file_name && <p className="meta">✓ Uploaded: {answers[q.id].file_name}</p>}
                </div>
              )}

              {q.type === 'practical' && (
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>{idx + 1}. Practical question</div>
                  <span className="type-badge practical" style={{ marginBottom: 8, display: 'inline-block' }}>
                    💻 {q.language === 'python' ? 'Python' : 'HTML'}
                  </span>
                  <div className="card" style={{ background: 'var(--paper)', marginBottom: 10, whiteSpace: 'pre-wrap' }}>
                    {q.question_text}
                  </div>
                  <textarea
                    className="code-editor"
                    spellCheck={false}
                    value={answers[q.id]?.written_text ?? (q.starter_code || '')}
                    onChange={(e) => setAnswer(q.id, { written_text: e.target.value })}
                  />
                  {q.language === 'html' && (
                    <div className="html-live-preview">
                      <div className="meta">LIVE HTML PREVIEW</div>
                      <iframe title={`HTML preview for question ${idx + 1}`} sandbox="allow-scripts" srcDoc={answers[q.id]?.written_text || q.starter_code || ''} />
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        <button
          className="primary"
          onClick={() => handleSubmit(false, null, { count: proctor.switchCount, log: proctor.getLog() })}
          disabled={submitting}
        >
          {submitting ? 'Submitting…' : 'Submit test'}
        </button>
      </div>

      {/* Anti-cheating: tab/window switch warning — blocks interaction until acknowledged */}
      {proctor.warningOpen && !cheatLocked && (
        <div className="proctor-overlay">
          <div className="card proctor-card">
            <div className="proctor-count">Warning {proctor.switchCount} / {MAX_TAB_SWITCHES}</div>
            <h3 style={{ marginTop: 4 }}>⚠ Tab or window switch detected</h3>
            <p className="meta">
              Leaving this tab or window during a test is treated as possible cheating. After{' '}
              {MAX_TAB_SWITCHES} switches, your test will be submitted automatically and flagged for your
              teacher to review.
            </p>
            <button
              className="primary"
              onClick={proctor.acknowledgeWarning}
              disabled={proctor.tabHidden}
              style={{ marginTop: 12, width: '100%' }}
            >
              {proctor.tabHidden ? 'Return to this tab to continue…' : 'I understand — resume test'}
            </button>
          </div>
        </div>
      )}

      {/* Anti-cheating: switch limit exceeded — test is being auto-submitted, no way back in */}
      {cheatLocked && (
        <div className="proctor-overlay">
          <div className="card proctor-card proctor-card-locked">
            <h3>🚫 Test submitted</h3>
            <p className="meta">
              Repeated tab/window switching was detected during this test. It has been submitted
              automatically and flagged for your teacher's review.
            </p>
          </div>
        </div>
      )}

      {timeUpNotice && !cheatLocked && (
        <div className="proctor-overlay">
          <div className="card proctor-card" style={{ borderTopColor: 'var(--ink)' }}>
            <h3 style={{ marginBottom: 8 }}>⏱ Time's up!</h3>
            <p className="meta">
              Whatever you've selected or typed so far will be submitted now — no answer is lost.
            </p>
            <button
              className="primary"
              onClick={() => handleSubmit(true, null, { count: proctor.switchCount, log: proctor.getLog() })}
              disabled={submitting}
              style={{ marginTop: 10, width: '100%' }}
            >
              {submitting ? 'Submitting…' : 'Submit now'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
