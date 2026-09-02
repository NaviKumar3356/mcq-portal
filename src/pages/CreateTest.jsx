import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, getAuthInfo, uploadQuestionResource } from '../lib/api.js';
import PanelLayout from '../components/PanelLayout.jsx';
import { CLASSES, SUBJECTS } from '../lib/constants.js';
import { parseQuestionsDocx } from '../lib/parseQuestionsDocx.js';
import ScheduleRangePicker from '../components/ScheduleRangePicker.jsx';

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
    reference_answer: '',
    resource_path: null,
    resource_name: '',
    resource_mime: '',
  };
}

export default function CreateTest() {
  const nav = useNavigate();
  const auth = getAuthInfo();
  const isAdmin = auth?.role === 'super_admin';
  const classOptions = isAdmin ? CLASSES : (auth?.classes || []);
  const subjectOptions = isAdmin ? SUBJECTS : (auth?.subjects || []);

  const [catalog, setCatalog] = useState({ classes: classOptions, subjects: subjectOptions });
  useEffect(() => { api('/admin-catalog').then(d => setCatalog({ classes: d.classes || classOptions, subjects: d.subjects || subjectOptions })).catch(() => {}); }, []);
  const activeClassOptions = catalog.classes;
  const activeSubjectOptions = catalog.subjects;

  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState(subjectOptions[0] || '');
  const [klass, setKlass] = useState(classOptions[0] || '');
  useEffect(() => {
    if (activeClassOptions.length && !activeClassOptions.includes(klass)) setKlass(activeClassOptions[0]);
    if (activeSubjectOptions.length && !activeSubjectOptions.includes(subject)) setSubject(activeSubjectOptions[0]);
  }, [activeClassOptions, activeSubjectOptions, klass, subject]);
  const [duration, setDuration] = useState(30);
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [questions, setQuestions] = useState([blankQuestion('mcq')]);
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
      // Auto-detects MCQ vs practical/code-completion documents and
      // returns questions in the right shape for either type.
      const { questions: parsed, warnings } = parseQuestionsDocx(rawText);
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
    if (questions.length === 0) return setError('Add at least one question.');
    if (!klass || !subject) return setError('Choose a class and subject.');
    if (startAt && endAt && new Date(endAt) <= new Date(startAt)) return setError('The closing time must be later than the opening time.');
    for (const q of questions) {
      if (q.type === 'practical' && (!q.variants || q.variants.length === 0 || !q.variants[0].question_text)) {
        return setError('Every practical question needs at least one variant with a problem statement.');
      }
    }
    setSaving(true);
    try {
      const created = await api('/test-create', {
        method: 'POST',
        body: {
          title,
          subject,
          class: klass,
          duration_minutes: Number(duration),
          start_at: startAt ? new Date(startAt).toISOString() : null,
          end_at: endAt ? new Date(endAt).toISOString() : null,
          status: 'draft',
          questions: questions.map(({ _resourceFile, ...q }) => q),
          shuffle_questions: shuffleQuestions,
          shuffle_options: shuffleOptions,
          shuffle_group_size: Number(shuffleGroupSize) || 1,
        },
      });
      // Upload any teacher-provided resources after the test gets its real ID.
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        if (q._resourceFile) {
          const path = await uploadQuestionResource({ test_id: created.test_id, question_id: q.id || `new-${i}`, file: q._resourceFile });
          q.resource_path = path; q.resource_name = q._resourceFile.name; q.resource_mime = q._resourceFile.type;
        }
      }
      if (questions.some(q => q._resourceFile)) {
        await api('/test-edit', { method: 'POST', body: { test_id: created.test_id, title, subject, class: klass, duration_minutes: Number(duration), start_at: startAt ? new Date(startAt).toISOString() : null, end_at: endAt ? new Date(endAt).toISOString() : null, questions: questions.map(({_resourceFile, ...q}, i) => ({...q, order_index:i})), shuffle_questions: shuffleQuestions, shuffle_options: shuffleOptions, shuffle_group_size: Number(shuffleGroupSize)||1 } });
      }
      nav(isAdmin ? '/admin/papers' : '/teacher');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (classOptions.length === 0 || subjectOptions.length === 0) {
    return (
      <PanelLayout items={isAdmin ? ADMIN_ITEMS : TEACHER_ITEMS}>
        <div className="card center-note">
          You don't have any class/subject assigned yet. Ask your Super Admin to assign one on the Teachers page.
        </div>
      </PanelLayout>
    );
  }

  return (
    <PanelLayout items={isAdmin ? ADMIN_ITEMS : TEACHER_ITEMS}>
      <div className="create-page-head">
        <div>
          <Link className="nav-action-button create-back-link" to={isAdmin ? '/admin/papers' : '/teacher'}>← Back to papers</Link>
          <div className="eyebrow">Assessment builder</div>
          <h2>Create a new paper</h2>
          <p className="meta">Set the schedule, security rules and questions in one guided workspace.</p>
        </div>
        <div className="create-progress">
          <span className="create-progress-step active">01 <small>Details</small></span>
          <span className="create-progress-line"></span>
          <span className="create-progress-step">02 <small>Questions</small></span>
          <span className="create-progress-line"></span>
          <span className="create-progress-step">03 <small>Save</small></span>
        </div>
      </div>
      {error && <div className="error-box">{error}</div>}

      <form onSubmit={onSubmit}>
        <div className="card create-section-card">
          <div className="create-section-heading">
            <div className="create-section-icon">📝</div>
            <div><div className="card-section-title">Paper details</div><p className="meta">Give the assessment a clear identity and schedule.</p></div>
          </div>
          <div className="create-title-field">
            <label htmlFor="paper-title">Paper name</label>
            <div className="create-title-input-wrap">
              <span className="create-input-icon">📝</span>
              <input
                id="paper-title"
                className="create-title-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="e.g. Periodic Test 1"
                autoComplete="off"
              />
            </div>
            <span className="create-field-hint">Use a clear name students and teachers will recognise in results and reports.</span>
          </div>

          <div className="create-field-grid">
            <div style={{ flex: 1 }}>
              <label>📚 Subject</label>
              <select value={subject} onChange={(e) => setSubject(e.target.value)} required>
                {activeSubjectOptions.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label>🏫 Class</label>
              <select value={klass} onChange={(e) => setKlass(e.target.value)} required>
                {activeClassOptions.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label>⏱ Duration (minutes)</label>
              <input type="text" inputMode="numeric" value={duration} onChange={(e) => setDuration(e.target.value)} />
            </div>
          </div>

          <div className="create-schedule-card">
            <div className="create-section-heading">
              <div className="create-section-icon">🗓️</div>
              <div>
                <div className="card-section-title">Assessment schedule</div>
                <p className="meta">Choose when students may begin and when new attempts stop.</p>
              </div>
            </div>
            <ScheduleRangePicker
              startValue={startAt}
              endValue={endAt}
              onStartChange={setStartAt}
              onEndChange={setEndAt}
            />
          </div>

          <div className="shuffle-box create-section-card">
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
              <div className="shuffle-group-settings">
                <label>Same order for every… students (in a row, by roll no.)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={shuffleGroupSize}
                  onChange={(e) => setShuffleGroupSize(e.target.value)}
                />
                <p className="meta">
                  E.g. 5 means roll numbers 1–5 get one order, 6–10 get another, and so on — so
                  neighbours rarely match but you still only have a handful of distinct "sets" in the room.
                  Use 1 for a fully different order per student.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-section-title">📥 Import questions from Word</div>
          <p className="meta">
            Supports two kinds of documents, auto-detected:
          </p>
          <p className="meta">
            <strong>MCQ:</strong> number each question, list options as a) b) c) d), and end with a line like{' '}
            <code>Answer: b</code>. Add <code>[2 marks]</code> anywhere in a question to set its marks
            (defaults to 1).
          </p>
          <p className="meta">
            <strong>Practical / code completion:</strong> either a set of <code>VARIANT 1</code>, <code>VARIANT 2</code>…
            blocks (each with a "Problem Statement" and a "Starter Code" section) — imported as ONE practical
            question with that many variants — or separate numbered questions, each with its own{' '}
            <code>Code:</code> block and an optional trailing <code>Answer: …</code> line. Reference answers are
            never stored or shown to students (practical questions are always graded manually) — they're only
            surfaced back to you as an import note.
          </p>
          <p className="meta">
            Imported questions are added below — review each one, especially any marked ⚠, before saving.
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

        <div className="create-question-library-head">
          <div>
            <div className="eyebrow">Question library</div>
            <h3>Build your paper</h3>
            <p className="meta">{questions.length} question{questions.length === 1 ? '' : 's'} added · mix MCQ, written, upload and practical questions.</p>
          </div>
          <div className="question-count-badge">{questions.length}</div>
        </div>

        {questions.map((q, i) => (
          <div className={`card question-card ${q.type}`} key={i}>
            <div className="question-card-head">
              <span>
                <span className="eyebrow" style={{ marginBottom: 0, marginRight: 8 }}>Question {i + 1}</span>
                <span className={`type-badge ${q.type}`}>
                  {q.type === 'mcq' && '🔘 MCQ'}
                  {q.type === 'written' && '✍️ Written'}
                  {q.type === 'upload' && '📎 Upload'}
                  {q.type === 'practical' && '💻 Practical'}
                </span>
              </span>
              <button type="button" className="secondary" onClick={() => removeQuestion(i)}>Remove</button>
            </div>

            {q.type !== 'practical' && (
              <>
                <label>Question text</label>
                <textarea value={q.question_text} onChange={(e) => updateQ(i, { question_text: e.target.value })} required />
              </>
            )}

            <div className="question-resource-box">
              <label>📎 Reference file / image (optional)</label>
              <input type="file" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip" onChange={(e) => { const file=e.target.files[0]; if(file) updateQ(i,{_resourceFile:file,resource_name:file.name,resource_mime:file.type}); }} />
              {q.resource_name && <div className="meta">✓ {q.resource_name} — students can view/download this resource.</div>}
              <small className="meta">Use this for a reference image, Word/Excel template, photo-editing source, or task file.</small>
            </div>

            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
              <div style={{ flex: 1, maxWidth: 140 }}>
                <label>Marks</label>
                <input type="text" inputMode="numeric" value={q.marks} onChange={(e) => updateQ(i, { marks: e.target.value })} />
              </div>
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

            {q.type === 'written' && <p className="meta">Student types their answer in a text box. You grade it manually.</p>}
            {q.type === 'upload' && <p className="meta">Student uploads a photo/scan of their handwritten answer. You grade it manually.</p>}

            {q.type === 'practical' && (
              <div>
                <label>Language</label>
                <select value={q.language} onChange={(e) => updateQ(i, { language: e.target.value })}>
                  <option value="python">Python</option>
                  <option value="html">HTML</option>
                </select>
                <label>Correct / reference answer (teacher only)</label>
                <textarea className="code-editor" spellCheck={false} value={q.reference_answer || ''} onChange={(e) => updateQ(i, { reference_answer: e.target.value })} placeholder={q.language === 'html' ? '<!-- Correct HTML code -->' : '# Correct Python code'} />
                <p className="meta">This is never shown to students. During grading it can be applied to every student's remark in one click.</p>
                <p className="meta">
                  Each variant below is a different problem. Every student gets exactly one, spread
                  round-robin across the class roster by roll number — add enough variants and no two
                  neighbours get the same problem.
                </p>
                {q.variants.map((v, vi) => (
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

        <div className="card create-add-question-card">
          <button type="button" className="secondary" onClick={() => addQuestion('mcq')}>🔘 + MCQ question</button>
          <button type="button" className="secondary" onClick={() => addQuestion('written')}>✍️ + Written question</button>
          <button type="button" className="secondary" onClick={() => addQuestion('upload')}>📎 + Upload-answer question</button>
          <button type="button" className="secondary" onClick={() => addQuestion('practical')}>💻 + Practical (code) question</button>
        </div>

        <p className="meta">
          You can also finalize or change the answer key later from the paper's "Answer key" button, even after saving.
        </p>

        <div className="create-save-bar"><div><strong>Ready to save?</strong><span className="meta">The paper will be saved as a draft. You can edit it later.</span></div><button className="primary" type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save paper as draft'}
        </button></div>
      </form>
    </PanelLayout>
  );
}
