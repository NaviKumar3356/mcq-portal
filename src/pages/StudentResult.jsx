import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../lib/api.js';

export default function StudentResult() {
  const { testId } = useParams();
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api(`/result-student?test_id=${testId}`)
      .then(setResult)
      .catch((e) => setError(e.message));
  }, [testId]);

  if (error) return <div className="container"><div className="error-box">{error}</div></div>;
  if (!result) return <div className="container center-note">Loading result…</div>;

  return (
    <div className="container">
      <Link to="/dashboard">&larr; Back to tests</Link>
      <div className="card" style={{ marginTop: 14 }}>
        <h2>{result.test_title}</h2>
        <p style={{ fontSize: '1.4rem', fontWeight: 700 }}>
          {result.total_marks_awarded} <span style={{ color: 'var(--muted)', fontSize: '1rem' }}>/ {result.total_marks}</span>
        </p>
      </div>

      <div className="card">
        <table className="grade-table">
          <thead>
            <tr><th>Question</th><th>Marks</th><th>Remark</th></tr>
          </thead>
          <tbody>
            {result.breakdown.map((a) => (
              <tr key={a.question_id}>
                <td>{a.questions?.question_text}</td>
                <td>{a.marks_awarded ?? '—'} / {a.questions?.marks}</td>
                <td>{a.teacher_remark || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
