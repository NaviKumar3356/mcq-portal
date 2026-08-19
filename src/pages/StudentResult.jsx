import React, { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { drawWatermarkAndHeader, addFooter } from '../lib/reportExport.js';

export default function StudentResult() {
  const { testId } = useParams();
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState('');
  const [reviewOpen, setReviewOpen] = useState(false);
  const cardRef = useRef(null);

  useEffect(() => {
    api(`/result-student?test_id=${testId}`)
      .then(setResult)
      .catch((e) => setError(e.message));
  }, [testId]);

  const fileBase = (result?.test_title || 'result').replace(/[^a-z0-9]+/gi, '-').toLowerCase();

  async function downloadImage() {
    if (!cardRef.current) return;
    setExporting('jpg');
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(cardRef.current, { backgroundColor: '#ffffff', scale: 2 });
      const link = document.createElement('a');
      link.download = `${fileBase}.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 0.95);
      link.click();
    } catch (e) {
      setError('Could not generate the image: ' + e.message);
    } finally {
      setExporting('');
    }
  }

  async function downloadPDF() {
    if (!result) return;
    setExporting('pdf');
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      let y = await drawWatermarkAndHeader(doc, {
        title: result.test_title,
        subtitle: `Score: ${result.total_marks_awarded} / ${result.total_marks}`,
      });

      doc.setFont(undefined, 'bold');
      doc.setFontSize(10);
      doc.text('Question', 14, y);
      doc.text('Marks', 160, y);
      doc.setDrawColor(220);
      doc.line(14, y + 2, 196, y + 2);
      doc.setFont(undefined, 'normal');
      y += 8;

      result.breakdown.forEach((a, i) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        const q = a.questions?.question_text || `Question ${i + 1}`;
        doc.text(`${i + 1}. ${q.slice(0, 90)}`, 14, y);
        doc.text(`${a.marks_awarded ?? '-'} / ${a.questions?.marks ?? '-'}`, 165, y);
        if (a.teacher_remark) {
          y += 5;
          doc.setFontSize(8);
          doc.setTextColor(110);
          doc.text(`Remark: ${a.teacher_remark.slice(0, 100)}`, 18, y);
          doc.setTextColor(0);
          doc.setFontSize(10);
        }
        y += 7;
      });

      addFooter(doc);
      doc.save(`${fileBase}.pdf`);
    } catch (e) {
      setError('Could not generate the PDF: ' + e.message);
    } finally {
      setExporting('');
    }
  }

  if (error) return <div className="container"><div className="error-box">{error}</div></div>;
  if (!result) return <div className="container center-note">Loading result…</div>;

  const pct = result.total_marks ? Math.round((result.total_marks_awarded / result.total_marks) * 1000) / 10 : null;

  return (
    <div className="container">
      <Link to="/student/dashboard">&larr; Back to tests</Link>

      <div ref={cardRef}>
        <div className="card" style={{ marginTop: 14 }}>
          <h2>{result.test_title}</h2>
          <p style={{ fontSize: '1.4rem', fontWeight: 700 }}>
            {result.total_marks_awarded} <span style={{ color: 'var(--muted)', fontSize: '1rem' }}>/ {result.total_marks}</span>
          </p>
          {pct !== null && pct >= 90 && (
            <div className="scorecard-celebrate">🌟 Excellent score — great work!</div>
          )}
          {pct !== null && pct >= 75 && pct < 90 && (
            <div className="scorecard-celebrate">👏 Nicely done!</div>
          )}
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

      <div className="export-bar">
        <span className="meta">Save this result:</span>
        <button className="secondary small" onClick={downloadImage} disabled={!!exporting}>
          {exporting === 'jpg' ? 'Preparing…' : '🖼 Image'}
        </button>
        <button className="secondary small" onClick={downloadPDF} disabled={!!exporting}>
          {exporting === 'pdf' ? 'Preparing…' : '📄 PDF report card'}
        </button>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="card-section-title" style={{ marginBottom: 0 }}>📝 Review your paper</div>
          <button className="secondary small" onClick={() => setReviewOpen((v) => !v)}>
            {reviewOpen ? 'Hide' : 'Show correct & wrong answers'}
          </button>
        </div>

        {reviewOpen && (
          <div style={{ marginTop: 14 }}>
            {result.breakdown.map((a, i) => {
              const q = a.questions;
              const isMcq = q?.type === 'mcq';
              const isCorrect = isMcq && a.mcq_selected === q.correct_option;
              const answered = isMcq ? a.mcq_selected !== null && a.mcq_selected !== undefined : true;
              return (
                <div className={`card question-card ${q?.type || ''}`} key={a.question_id} style={{ marginBottom: 12 }}>
                  <div className="eyebrow">
                    Question {i + 1} — {q?.marks} mark{q?.marks === 1 ? '' : 's'}
                    {isMcq && (
                      <span style={{ marginLeft: 10, fontWeight: 700, color: !answered ? 'var(--muted)' : isCorrect ? 'var(--accent-dark)' : 'var(--danger)' }}>
                        {!answered ? '· Not answered' : isCorrect ? '· ✅ Correct' : '· ❌ Incorrect'}
                      </span>
                    )}
                  </div>
                  <div style={{ fontWeight: 600, marginBottom: 10 }}>{q?.question_text}</div>

                  {isMcq && (
                    <div>
                      {(q.options || []).map((opt, oi) => {
                        const isYourPick = a.mcq_selected === oi;
                        const isRight = q.correct_option === oi;
                        let style = {};
                        if (isRight) style = { borderColor: 'var(--accent)', background: '#eef6f0', fontWeight: 600 };
                        else if (isYourPick && !isRight) style = { borderColor: 'var(--danger)', background: '#fbe9e7' };
                        return (
                          <div key={oi} className="option-row" style={style}>
                            <span style={{ flex: 1 }}>{opt}</span>
                            {isRight && <span style={{ color: 'var(--accent-dark)', fontWeight: 700 }}>✓ Correct answer</span>}
                            {isYourPick && !isRight && <span style={{ color: 'var(--danger)', fontWeight: 700 }}>✗ Your answer</span>}
                            {isYourPick && isRight && <span style={{ color: 'var(--accent-dark)', fontWeight: 700 }}>✓ Your answer</span>}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {q?.type === 'written' && (
                    <div className="card" style={{ background: 'var(--paper)' }}>
                      {a.written_text || <em>No answer submitted</em>}
                    </div>
                  )}

                  {q?.type === 'upload' && (
                    <div className="file-thumb">
                      {a.file_url ? <img src={a.file_url} alt="Uploaded answer" /> : <em>No file uploaded</em>}
                    </div>
                  )}

                  {q?.type === 'practical' && (
                    <pre className="code-block">{a.written_text || 'No code submitted'}</pre>
                  )}

                  {a.teacher_remark && (
                    <p className="meta" style={{ marginTop: 10 }}>💬 Teacher's remark: {a.teacher_remark}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Link to="/student/leaderboard"><button className="secondary">🏆 See the class leaderboard</button></Link>
    </div>
  );
}
