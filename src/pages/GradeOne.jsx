import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api, getAuthInfo } from '../lib/api.js';
import PanelLayout from '../components/PanelLayout.jsx';
import StudentAvatar from '../components/StudentAvatar.jsx';

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
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

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

  async function save(goBack = false) {
    setSaving(true);
    setError('');
    try {
      const grades = data.answers.map((a) => ({
        answer_id: a.id,
        marks_awarded: Number(marks[a.id] || 0),
        teacher_remark: remarks[a.id]?.trim() || '',
      }));
      await api('/grade-submission', { method: 'POST', body: { submission_id: submissionId, grades } });
      if (goBack) nav(-1);
      else {
        const refreshed = await api(`/submission-detail?submission_id=${submissionId}`);
        setData(refreshed);
        setMarks(Object.fromEntries(refreshed.answers.map((a) => [a.id, a.marks_awarded ?? ''])));
        setRemarks(Object.fromEntries(refreshed.answers.map((a) => [a.id, a.teacher_remark ?? ''])));
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  function answerStatus(a) {
    if (a.questions.type !== 'mcq') return 'manual';
    const selected = a.mcq_selected;
    if (selected === null || selected === undefined) return 'unanswered';
    return selected === a.questions.correct_option ? 'correct' : 'wrong';
  }

  function initials(name = '') {
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0]).join('').toUpperCase() || 'S';
  }

  if (error && !data) {
    return <PanelLayout items={isAdmin ? ADMIN_ITEMS : TEACHER_ITEMS}><div className="error-box">{error}</div></PanelLayout>;
  }
  if (!data) {
    return <PanelLayout items={isAdmin ? ADMIN_ITEMS : TEACHER_ITEMS}><p className="center-note">Loading submission…</p></PanelLayout>;
  }

  const answers = data.answers || [];
  const visibleAnswers = answers.filter((a) => {
    const status = answerStatus(a);
    const text = `${a.questions?.question_text || ''} ${a.written_text || ''}`.toLowerCase();
    return (filter === 'all' || status === filter) && (!search || text.includes(search.toLowerCase()));
  });
  const autoCorrect = answers.filter((a) => answerStatus(a) === 'correct').length;
  const autoWrong = answers.filter((a) => answerStatus(a) === 'wrong').length;
  const unanswered = answers.filter((a) => answerStatus(a) === 'unanswered').length;
  const manual = answers.filter((a) => answerStatus(a) === 'manual').length;
  const totalAwarded = answers.reduce((sum, a) => sum + Number(a.marks_awarded || 0), 0);

  return (
    <PanelLayout items={isAdmin ? ADMIN_ITEMS : TEACHER_ITEMS}>
      <Link className="nav-action-button" to="#" onClick={(e) => { e.preventDefault(); nav(-1); }}>← Back to submissions</Link>

      {data.submission.flagged_reason && (
        <div className="notice-strip notice-danger" style={{ display: 'block', margin: '14px 0' }}>
          ⚠ <strong>Review flagged attempt.</strong> This attempt was auto-submitted after the student switched tabs or left the test window {data.submission.tab_switch_count} time{data.submission.tab_switch_count === 1 ? '' : 's'}.
        </div>
      )}

      <section className="grade-review-hero">
        <div className="grade-review-student">
          <StudentAvatar student={data.submission.students} className="grade-review-avatar grade-review-avatar-image" alt={data.submission.students?.name || 'Student'} />
          <div>
            <div className="eyebrow">TEACHER REVIEW · {data.submission.status || 'SUBMISSION'}</div>
            <h1>{data.submission.students?.name || 'Student submission'}</h1>
            <div className="meta">Roll {data.submission.students?.roll_number ?? '—'} · Class {data.submission.students?.class ?? '—'} · {data.submission.tests?.title || data.submission.test?.title || 'Assessment'}</div>
          </div>
        </div>
        <div className="grade-review-summary">
          <div className="grade-review-stat"><strong>{totalAwarded}</strong><span>Marks awarded</span></div>
          <div className="grade-review-stat"><strong>{autoCorrect}</strong><span>Correct MCQ</span></div>
          <div className="grade-review-stat"><strong>{autoWrong}</strong><span>Wrong MCQ</span></div>
          <div className="grade-review-stat"><strong>{manual}</strong><span>Manual review</span></div>
        </div>
      </section>

      {error && <div className="error-box">{error}</div>}

      <div className="grade-review-toolbar">
        <div>
          <strong>Review answers</strong>
          <div className="meta">Use the filters to focus on incorrect, unanswered or manually graded work.</div>
        </div>
        <div className="grade-review-filters">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search question…" aria-label="Search questions" />
          <select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter answers">
            <option value="all">All ({answers.length})</option>
            <option value="correct">Correct ({autoCorrect})</option>
            <option value="wrong">Wrong ({autoWrong})</option>
            <option value="unanswered">Unanswered ({unanswered})</option>
            <option value="manual">Manual ({manual})</option>
          </select>
          <button className="secondary small" onClick={() => { setFilter('all'); setSearch(''); }}>Reset</button>
        </div>
      </div>

      {visibleAnswers.map((a) => {
        const i = answers.indexOf(a);
        const q = a.questions;
        const status = answerStatus(a);
        const selected = a.mcq_selected;
        const correct = q.correct_option;
        return (
          <article className="grade-answer-card" key={a.id}>
            <div className="grade-answer-top">
              <div>
                <div className="grade-question-label">Question {i + 1} · {q.type.toUpperCase()} · {q.marks} mark{q.marks === 1 ? '' : 's'}</div>
                {q.type !== 'practical' && <div className="grade-question-text">{q.question_text}</div>}
              </div>
              <div className="grade-score-badge">{marks[a.id] === '' ? 'Not graded' : `${marks[a.id]} / ${q.marks}`}</div>
            </div>

            {q.type === 'mcq' && (
              <>
                <div className="grade-answer-callout">
                  <div className="selected"><span className="meta">STUDENT SELECTED</span><strong>{selected === null || selected === undefined ? 'Not answered' : `${String.fromCharCode(65 + selected)}. ${q.options?.[selected] ?? 'Unknown option'}`}</strong></div>
                  <div className="answer-key"><span className="meta">CORRECT ANSWER</span><strong>{correct === null || correct === undefined ? 'Answer key not set' : `${String.fromCharCode(65 + correct)}. ${q.options?.[correct] ?? 'Unknown option'}`}</strong></div>
                </div>
                <div className="grade-mcq-grid">
                  {(q.options || []).map((opt, oi) => {
                    const isStudent = selected === oi;
                    const isCorrect = correct === oi;
                    return (
                      <div className={`grade-mcq-option ${isStudent ? 'student' : ''} ${isCorrect ? 'correct' : ''}`} key={oi}>
                        <span className="letter">{String.fromCharCode(65 + oi)}</span>
                        <span>{opt}</span>
                        <span>
                          {isStudent && <span className="grade-mcq-tag student">Student selected</span>}
                          {isCorrect && <span className="grade-mcq-tag correct">Correct answer</span>}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {q.type === 'written' && <div className="card" style={{ background: 'var(--paper)', marginTop: 12 }}><div className="meta">STUDENT RESPONSE</div><div style={{ whiteSpace: 'pre-wrap', marginTop: 6 }}>{a.written_text || <em>No answer submitted</em>}</div></div>}
            {q.type === 'upload' && <div className="file-thumb" style={{ marginTop: 12 }}>{a.file_url ? <img src={a.file_url} alt="Uploaded student answer" /> : <em>No file uploaded</em>}</div>}
            {q.type === 'practical' && (
              <div style={{ marginTop: 12 }}>
                <div className="meta">PRACTICAL TASK</div>
                <div className="card" style={{ background: 'var(--paper)', margin: '7px 0 12px', whiteSpace: 'pre-wrap' }}>{a.variant_snapshot?.question_text || q.question_text}</div>
                <div className="meta">STUDENT SUBMITTED CODE</div>
                <pre className="code-block" style={{ marginTop: 7 }}>{a.written_text || 'No code submitted'}</pre>
              </div>
            )}

            <div className="grade-feedback">
              <div className="grade-feedback-grid">
                {(q.type !== 'mcq') && (
                  <div><label>Marks awarded / {q.marks}</label><input type="number" min="0" max={q.marks} step="0.5" value={marks[a.id]} onChange={(e) => setMarks((m) => ({ ...m, [a.id]: e.target.value }))} /></div>
                )}
                <div style={{ gridColumn: q.type === 'mcq' ? '1 / -1' : 'auto' }}>
                  <label>Teacher remark</label>
                  <textarea value={remarks[a.id] || ''} onChange={(e) => setRemarks((r) => ({ ...r, [a.id]: e.target.value }))} placeholder="Add a helpful remark for the student…" />
                  <small>Keep feedback specific, encouraging and actionable.</small>
                </div>
              </div>
            </div>
          </article>
        );
      })}

      {visibleAnswers.length === 0 && <div className="card center-note">No answers match the current filter.</div>}

      <div className="grade-savebar">
        <button className="secondary" onClick={() => nav(-1)}>Cancel</button>
        <button className="primary" onClick={() => save(false)} disabled={saving}>{saving ? 'Saving…' : 'Save review'}</button>
        <button className="primary" onClick={() => save(true)} disabled={saving}>{saving ? 'Saving…' : 'Save & return'}</button>
      </div>
    </PanelLayout>
  );
}
