import React, { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../lib/api.js';

export default function StudentResult() {
  const { testId } = useParams();
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState('');
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
      doc.setFontSize(16);
      doc.text(result.test_title, 14, 18);
      doc.setFontSize(12);
      doc.text(`Score: ${result.total_marks_awarded} / ${result.total_marks}`, 14, 28);

      let y = 42;
      doc.setFontSize(10);
      result.breakdown.forEach((a, i) => {
        if (y > 280) { doc.addPage(); y = 20; }
        const q = a.questions?.question_text || `Question ${i + 1}`;
        doc.text(`${i + 1}. ${q.slice(0, 78)}`, 14, y);
        doc.text(`${a.marks_awarded ?? '-'} / ${a.questions?.marks ?? '-'}`, 175, y);
        y += 7;
      });

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
          {exporting === 'pdf' ? 'Preparing…' : '📄 PDF'}
        </button>
      </div>

      <Link to="/student/leaderboard"><button className="secondary">🏆 See the class leaderboard</button></Link>
    </div>
  );
}
