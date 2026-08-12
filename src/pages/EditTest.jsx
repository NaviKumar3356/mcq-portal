import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, getAuthInfo } from '../lib/api.js';
import PanelLayout from '../components/PanelLayout.jsx';
import { CLASSES, SUBJECTS } from '../lib/constants.js';
import { parseMcqDocx } from '../lib/parseMcqDocx.js';

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

function blankQuestion(type = 'mcq') {
  return {
    type,
    question_text: '',
    options: type === 'mcq' ? ['', '', '', ''] : undefined,
    correct_option: type === 'mcq' ? 0 : undefined,
    marks: 1,
    language: type === 'practical' ? 'python' : undefined,
    variants: type === 'practical' ? [{ question_text: '', starter_code: '' }] : undefined,
  };
}

export default function EditTest() {
  const { testId } = useParams();
  const nav = useNavigate();
  const auth = getAuthInfo();
  const isAdmin = auth?.role === 'super_admin';
  const classOptions = isAdmin ? CLASSES : (auth?.classes || []);
  const subjectOptions = isAdmin ? SUBJECTS : (auth?.subjects || []);

  const [loaded, setLoaded] = useState(false);
  const [submissionsCount, setSubmissionsCount] = useState(0);
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [klass, setKlass] = useState('');
  const [duration, setDuration] = useState(30);
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [questions, setQuestions] = useState([]);
  const [shuffleQuestions, setShuffleQuestions] = useState(false);
  const [shuffleOptions, setShuffleOptions] = useState(false);
  const [shuffleGroupSize, setShuffleGroupSize] = useState(5);
  const [importing, setImporting] = useState(false);
  const [importReport, setImportReport] = useState(null);

  async function handleDocxImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    setImporting(true);
    setImportReport(null);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const mammoth = (await import('mammoth')).default;
      const { value: rawText } = await mammoth.extractRawText({ arrayBuffer });
      const { questions: parsed, warnings } = parseMcqDocx(rawText);
      if (parsed.length > 0) {
        setQuestions((qs) => [...qs, ...parsed]);
      }
      setImportReport({ ok: parsed.length, warnings });
    } catch (err) {
      setImportReport({ ok: 0, warnings: [`Couldn't read that file: ${err.message}`] });
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  }
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api(`/test-edit?test_id=${testId}`).then((d) => {
      setTitle(d.test.title);
      setSubject(d.test.subject);
      setKlass(d.test.class);
      setDuration(d.test.duration_minutes);
      setStartAt(d.test.start_at ? d.test.start_at.slice(0, 16) : '');
      setEndAt(d.test.end_at ? d.test.end_at.slice(0, 16) : '');
      setShuffleQuestions(d.test.shuffle_questions);
      setShuffleOptions(d.test.shuffle_options);
      setShuffleGroupSize(d.test.shuffle_group_size);
      setQuestions(d.questions.map((q) => ({
        ...q,
        marks: q.marks,
        variants: q.type === 'practical' ? (q.variants && q.variants.length > 0 ? q.variants : [{ question_text: '', starter_code: '' }]) : q.variants,
      })));
      setSubmissionsCount(d.submissions_count);
      setLoaded(true);
    }).catch((e) => setError(e.message));
  }, [testId]);

  const locked = submissionsCount > 0;

  function updateQ(i, patch) {
    setQuestions((qs) => qs.map((q, idx) => (idx === i ? { ...q, ...patch } : q)));
  }
  function updateOption(i, optIdx, value) {
    setQuestions((qs) =>
      qs.map((q, idx) => {
        if (idx !== i) return q;
        const options = [...q.options];
        options[optIdx] = value;
        return { ...q, options };
      })
    );
  }
  function updateVariant(i, vi, patch) {
    setQuestions((qs) =>
      qs.map((q, idx) => {
        if (idx !== i) return q;
        const variants = q.variants.map((v, xi) => (xi === vi ? { ...v, ...patch } : v));
        return { ...q, variants };
      })
    );
  }
  function addVariant(i) {
    setQuestions((qs) =>
      qs.map((q, idx) => (idx === i ? { ...q, variants: [...q.variants, { question_text: '', starter_code: '' }] } : q))
    );
  }
  function removeVariant(i, vi) {
    setQuestions((qs) =>
      qs.map((q, idx) => (idx === i ? { ...q, variants: q.variants.filter((_, xi) => xi !== vi) } : q))
    );
  }
  function addQuestion(type) {
    setQuestions((qs) => [...qs, blankQuestion(type)]);
  }
  function removeQuestion(i) {
    setQuestions((qs) => qs.filter((_, idx) => idx !== i));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    for (const q of questions) {
      if (q.type === 'practical' && (!q.variants || q.variants.length === 0 || !q.variants[0].question_text)) {
        return setError('Every practical question needs at least one variant with a problem statement.');
      }
    }
    setSaving(true);
    try {
      await api('/test-edit', {
        method: 'POST',
        body: {
          test_id: testId,
          title,
          subject,
          class: klass,
          duration_minutes: Number(duration),
          start_at: startAt ? new Date(startAt).toISOString() : null,
          end_at: endAt ? new Date(endAt).toISOString() : null,
          shuffle_questions: shuffleQuestions,
          shuffle_options: shuffleOptions,
          shuffle_group_size: Number(shuffleGroupSize) || 1,
          questions: questions.map((q, i) => ({ ...q, order_index: i })),
        },
      });
      nav(isAdmin ? '/admin/papers' : '/teacher');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (error && !loaded) {
    return <PanelLayout items={isAdmin ? ADMIN_ITEMS : TEACHER_ITEMS}><div className="error-box">{error}</div></PanelLayout>;
  }
  if (!loaded) {
    return <PanelLayout items={isAdmin ? ADMIN_ITEMS : TEACHER_ITEMS}><p className="center-note">Loading…</p></PanelLayout>;
  }

  return (
    <PanelLayout items={isAdmin ? ADMIN_ITEMS : TEACHER_ITEMS}>
      <h2>Edit paper</h2>
      {error && <div className="error-box">{error}</div>}
      {locked && (
        <div className="notice-strip" style={{ display: 'block', marginBottom: 14 }}>
          {submissionsCount} student{submissionsCount === 1 ? ' has' : 's have'} already submitted this paper —
          questions can't be added or removed, but you can still fix wording, marks, or the answer key below.
        </div>
      )}

      <form onSubmit={onSubmit}>
        <div className="card">
          <div className="card-section-title">📝 Paper details</div>
          <label>Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} required />

          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label>Subject</label>
              <select value={subject} onChange={(e) => setSubject(e.target.value)} required>
                {(subjectOptions.includes(subject) ? subjectOptions : [subject, ...subjectOptions]).map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label>Class</label>
              <select value={klass} onChange={(e) => setKlass(e.target.value)} required>
                {(classOptions.includes(klass) ? classOptions : [klass, ...classOptions]).map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label>Duration (minutes)</label>
              <input type="text" inputMode="numeric" value={duration} onChange={(e) => setDuration(e.target.value)} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label>Opens at (optional)</label>
              <input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <label>Closes at (optional)</label>
              <input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} />
            </div>
          </div>

          <div className="shuffle-box">
            <div className="card-section-title">🔀 Anti-cheating (optional)</div>
            <label className="checkbox-row">
              <input type="checkbox" checked={shuffleQuestions} onChange={(e) => setShuffleQuestions(e.target.checked)} />
              Shuffle question order per student
            </label>
            <label className="checkbox-row">
              <input type="checkbox" checked={shuffleOptions} onChange={(e) => setShuffleOptions(e.target.checked)} />
              Shuffle each MCQ's option order per student
            </label>
            {(shuffleQuestions || shuffleOptions) && (
              <div style={{ marginTop: 8, maxWidth: 260 }}>
                <label>Same order for every… students (in a row, by roll no.)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={shuffleGroupSize}
                  onChange={(e) => setShuffleGroupSize(e.target.value)}
                />
              </div>
            )}
          </div>
        </div>

        {!locked && (
          <div className="card">
            <div className="card-section-title">📄 Import MCQs from Word (.docx)</div>
            <p className="meta">
              Format: number each question, list options as a) b) c) d), and end with a line like{' '}
              <code>Answer: b</code>. Add <code>[2 marks]</code> anywhere in a question to set its marks
              (defaults to 1). Imported questions are added below — review each one, especially any marked
              ⚠, before saving.
            </p>
            <input type="file" accept=".docx" onChange={handleDocxImport} disabled={importing} />
            {importing && <p className="meta">Reading file…</p>}
            {importReport && (
              <div style={{ marginTop: 10 }}>
                {importReport.ok > 0 && (
                  <p style={{ fontWeight: 600, color: 'var(--accent-dark)' }}>
                    ✅ Imported {importReport.ok} question{importReport.ok === 1 ? '' : 's'}.
                  </p>
                )}
                {importReport.warnings.length > 0 && (
                  <ul style={{ margin: '6px 0 0', paddingLeft: 18, color: 'var(--warn)', fontSize: '0.85rem' }}>
                    {importReport.warnings.map((w, i) => <li key={i}>{w}</li>)}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}

        {questions.map((q, i) => (
          <div className={`card question-card ${q.type}`} key={q.id || `new-${i}`}>
            <div className="question-card-head">
              <span>
                <span className="eyebrow" style={{ marginBottom: 0, marginRight: 8 }}>
                  Question {i + 1}{!q.id && ' (new)'}
                </span>
                <span className={`type-badge ${q.type}`}>
                  {q.type === 'mcq' && '🔘 MCQ'}
                  {q.type === 'written' && '✍️ Written'}
                  {q.type === 'upload' && '📎 Upload'}
                  {q.type === 'practical' && '💻 Practical'}
                </span>
              </span>
              <button
                type="button"
                className="secondary"
                onClick={() => removeQuestion(i)}
                disabled={locked && !!q.id}
                title={locked && q.id ? "Can't remove — students have already submitted" : ''}
              >
                Remove
              </button>
            </div>

            {q.type !== 'practical' && (
              <>
                <label>Question text</label>
                <textarea value={q.question_text} onChange={(e) => updateQ(i, { question_text: e.target.value })} required />
              </>
            )}

            <div style={{ flex: 1, maxWidth: 140 }}>
              <label>Marks</label>
              <input type="text" inputMode="numeric" value={q.marks} onChange={(e) => updateQ(i, { marks: e.target.value })} />
            </div>

            {q.type === 'mcq' && (q.correct_option === null || q.correct_option === undefined) && (
              <div className="notice-strip" style={{ display: 'block', marginBottom: 10 }}>
                ⚠ Answer not detected from import — please pick the correct option below.
              </div>
            )}

            {q.type === 'mcq' && (
              <div>
                <label>Options — and the answer key (mark the correct one)</label>
                {q.options.map((opt, oi) => (
                  <div key={oi} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                    <input
                      type="radio"
                      name={`correct-${i}`}
                      checked={q.correct_option === oi}
                      onChange={() => updateQ(i, { correct_option: oi })}
                    />
                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => updateOption(i, oi, e.target.value)}
                      placeholder={`Option ${oi + 1}`}
                      required
                    />
                  </div>
                ))}
              </div>
            )}
            {q.type === 'written' && <p className="meta">Student types their answer. You grade it manually.</p>}
            {q.type === 'upload' && <p className="meta">Student uploads a photo/scan. You grade it manually.</p>}

            {q.type === 'practical' && (
              <div>
                <label>Language</label>
                <select value={q.language} onChange={(e) => updateQ(i, { language: e.target.value })} disabled={locked && !!q.id}>
                  <option value="python">Python</option>
                  <option value="html">HTML</option>
                </select>
                <p className="meta">
                  Each variant below is a different problem. Every student gets exactly one, spread
                  round-robin across the class roster by roll number.
                </p>
                {(q.variants || []).map((v, vi) => (
                  <div key={vi} className="card" style={{ background: 'var(--paper)', marginBottom: 10 }}>
                    <div className="eyebrow">Variant {vi + 1}</div>
                    <label>Problem statement</label>
                    <textarea
                      value={v.question_text}
                      onChange={(e) => updateVariant(i, vi, { question_text: e.target.value })}
                      required
                    />
                    <label>Starter code (optional)</label>
                    <textarea
                      style={{ fontFamily: 'monospace', minHeight: 120 }}
                      value={v.starter_code}
                      onChange={(e) => updateVariant(i, vi, { starter_code: e.target.value })}
                    />
                    {q.variants.length > 1 && (
                      <button type="button" className="danger small" onClick={() => removeVariant(i, vi)}>
                        Remove variant
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" className="secondary" onClick={() => addVariant(i)}>
                  + Add variant
                </button>
              </div>
            )}
          </div>
        ))}

        <div className="card" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="secondary" disabled={locked} onClick={() => addQuestion('mcq')}>+ MCQ question</button>
          <button type="button" className="secondary" disabled={locked} onClick={() => addQuestion('written')}>+ Written question</button>
          <button type="button" className="secondary" disabled={locked} onClick={() => addQuestion('upload')}>+ Upload-answer question</button>
          <button type="button" className="secondary" disabled={locked} onClick={() => addQuestion('practical')}>+ Practical (code) question</button>
          {locked && <p className="meta" style={{ margin: 0 }}>Adding/removing is disabled once students have submitted.</p>}
        </div>

        <button className="primary" type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </form>
    </PanelLayout>
  );
}
