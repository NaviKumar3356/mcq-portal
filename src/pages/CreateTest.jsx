import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';

function blankQuestion(type = 'mcq') {
  return {
    type,
    question_text: '',
    options: type === 'mcq' ? ['', '', '', ''] : undefined,
    correct_option: type === 'mcq' ? 0 : undefined,
    marks: 1,
  };
}

export default function CreateTest() {
  const nav = useNavigate();
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [klass, setKlass] = useState('');
  const [duration, setDuration] = useState(30);
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [questions, setQuestions] = useState([blankQuestion('mcq')]);
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
    setSaving(true);
    try {
      await api('/test-create', {
        method: 'POST',
        body: {
          title,
          subject,
          class: klass,
          duration_minutes: Number(duration),
          start_at: startAt ? new Date(startAt).toISOString() : null,
          end_at: endAt ? new Date(endAt).toISOString() : null,
          status: 'draft',
          questions,
        },
      });
      nav('/teacher');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="container">
      <h2>New paper</h2>
      {error && <div className="error-box">{error}</div>}

      <form onSubmit={onSubmit}>
        <div className="card">
          <label>Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="e.g. Periodic Test 1 — Science" />

          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label>Subject</label>
              <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Science" />
            </div>
            <div style={{ flex: 1 }}>
              <label>Class</label>
              <input value={klass} onChange={(e) => setKlass(e.target.value)} required placeholder="7th" />
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
        </div>

        {questions.map((q, i) => (
          <div className="card" key={i}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div className="eyebrow">Question {i + 1} — {q.type}</div>
              <button type="button" className="secondary" onClick={() => removeQuestion(i)}>Remove</button>
            </div>

            <label>Question text</label>
            <textarea value={q.question_text} onChange={(e) => updateQ(i, { question_text: e.target.value })} required />

            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <label>Marks</label>
                <input type="text" inputMode="numeric" value={q.marks} onChange={(e) => updateQ(i, { marks: e.target.value })} />
              </div>
            </div>

            {q.type === 'mcq' && (
              <div>
                <label>Options (mark the correct one)</label>
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

            {q.type === 'written' && <p className="meta">Student will type their answer in a text box. You grade it manually.</p>}
            {q.type === 'upload' && <p className="meta">Student will upload a photo/scan of their handwritten answer. You grade it manually.</p>}
          </div>
        ))}

        <div className="card" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="secondary" onClick={() => addQuestion('mcq')}>+ MCQ question</button>
          <button type="button" className="secondary" onClick={() => addQuestion('written')}>+ Written question</button>
          <button type="button" className="secondary" onClick={() => addQuestion('upload')}>+ Upload-answer question</button>
        </div>

        <button className="primary" type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save paper as draft'}
        </button>
      </form>
    </div>
  );
}
