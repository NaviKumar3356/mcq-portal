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
  const [student, setStudent] = useState(null);
  const cardRef = useRef(null);

  useEffect(() => {
    api(`/result-student?test_id=${testId}`)
      .then(setResult)
      .catch((e) => setError(e.message));
    api('/student-self')
      .then((d) => setStudent(d.student || null))
      .catch(() => {});
  }, [testId]);

  const breakdown = result?.breakdown || [];
  const safeName = (value) => String(value || '').trim().replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '');
  const studentName = student?.name || 'Student';
  const testTitle = result?.test_title || 'Assessment';
  const testNumberMatch = testTitle.match(/\b(?:test|paper|assessment)\s*(?:no\.?|number)?\s*([ivxlcdm]+|\d+)\b/i);
  const testNumber = testNumberMatch?.[1] || '';
  const fileBase = `${safeName(studentName)}_${testNumber ? `Test-${safeName(testNumber)}_` : ''}${safeName(testTitle)}_Result`; 

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
      const { drawReportCardHeader, drawSummaryCard, drawPerformanceRow, drawMCQReviewBlock, drawWatermark, addFooter } = await import('../lib/reportExport.js');
      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const pct = result.total_marks ? Math.round((result.total_marks_awarded / result.total_marks) * 1000) / 10 : 0;
      const correctCount = breakdown.filter((a) => a.questions?.type === 'mcq' && a.mcq_selected === a.questions.correct_option).length;
      const wrongCount = breakdown.filter((a) => a.questions?.type === 'mcq' && a.mcq_selected !== null && a.mcq_selected !== undefined && a.mcq_selected !== a.questions.correct_option).length;
      const unansweredCount = breakdown.filter((a) => a.questions?.type === 'mcq' && (a.mcq_selected === null || a.mcq_selected === undefined)).length;

      await drawWatermark(doc);
      let y = await drawReportCardHeader(doc, {
        studentName,
        studentClass: student?.class,
        rollNumber: student?.roll_number,
        title: testTitle,
        testNumber,
      });

      y = drawSummaryCard(doc, y, {
        score: `${result.total_marks_awarded} / ${result.total_marks}`,
        percentage: `${pct}%`,
        correct: correctCount,
        wrong: wrongCount,
        unanswered: unansweredCount,
        total: breakdown.length,
      });

      y += 8;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(125, 28, 45);
      doc.text('Question-wise review', 16, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.8);
      doc.setTextColor(103, 108, 116);
      doc.text('Correct answers are shown in green. Student answers are marked clearly; incorrect responses are shown in red.', 16, y);
      y += 7;

      for (let i = 0; i < breakdown.length; i++) {
        const a = breakdown[i];
        const q = a.questions || {};
        const isMcq = q.type === 'mcq';

        if (isMcq) {
          const options = Array.isArray(q.options) ? q.options : [];
          const selected = a.mcq_selected;
          const correct = q.correct_option;
          // Estimate a safe block height before drawing; if uncertain, start a fresh page.
          const optionLines = options.reduce((n, opt) => n + Math.max(1, doc.splitTextToSize(typeof opt === 'object' ? (opt.text ?? '') : String(opt ?? ''), 122).length), 0);
          const qLines = doc.splitTextToSize(q.question_text || `Question ${i + 1}`, 188).length;
          const estimated = 20 + qLines * 4.2 + optionLines * 4.8 + options.length * 4;
          if (y + estimated > pageH - 20) {
            addFooter(doc);
            doc.addPage();
            await drawWatermark(doc);
            y = 20;
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(12);
            doc.setTextColor(125, 28, 45);
            doc.text('Question-wise review — continued', 16, y);
            y += 8;
          }
          y = drawMCQReviewBlock(doc, y, {
            number: i + 1,
            question: q.question_text,
            options,
            selected,
            correct,
          });
        } else {
          const qText = q.question_text || a.variant_snapshot?.question_text || `Question ${i + 1}`;
          const lines = doc.splitTextToSize(`${i + 1}. ${qText}`, 145);
          const answer = a.written_text || '';
          const answerLines = answer ? doc.splitTextToSize(`Student answer: ${answer}`, 175) : ['Student answer: Not submitted'];
          const rowH = Math.max(18, lines.length * 4.2 + answerLines.length * 3.8 + 10);
          if (y + rowH > pageH - 20) {
            addFooter(doc);
            doc.addPage();
            await drawWatermark(doc);
            y = 20;
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(12);
            doc.setTextColor(125, 28, 45);
            doc.text('Question-wise review — continued', 16, y);
            y += 8;
          }
          doc.setFillColor(250, 247, 239);
          doc.roundedRect(14, y, pageW - 28, rowH, 3, 3, 'F');
          doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...MAROON);
          doc.text(`QUESTION ${i + 1}`, 19, y + 6);
          doc.text(`${a.marks_awarded ?? '—'} / ${q.marks ?? '—'} marks`, pageW - 19, y + 6, { align: 'right' });
          doc.setFont('helvetica', 'bold'); doc.setFontSize(8.8); doc.setTextColor(...INK);
          doc.text(lines, 19, y + 12);
          doc.setFont('helvetica', 'normal'); doc.setFontSize(7.8); doc.setTextColor(...MUTED);
          doc.text(answerLines, 19, y + 12 + lines.length * 4.2 + 3);
          y += rowH + 5;
        }
      }

      addFooter(doc);
      doc.save(`${fileBase}.pdf`);
    } catch (e) {
      setError('Could not generate the PDF: ' + e.message);
    } finally {
      setExporting('');
    }
  }

  if (error) {
    return (
      <div className="container student-result-page">
        <div className="result-page-navigation">
          <Link className="nav-action-button secondary" to="/student/dashboard">← Back to my tests</Link>
        </div>
        <section className="result-empty-state card">
          <div className="result-empty-icon">📋</div>
          <div className="eyebrow">ASSESSMENT REVIEW</div>
          <h1>No attempt found</h1>
          <p className="meta">This test has no submitted attempt for your account, so there is no result or paper review to display.</p>
          <div className="result-empty-actions">
            <Link className="nav-action-button primary" to="/student/dashboard">📚 Back to my tests</Link>
            <Link className="nav-action-button secondary" to="/student/leaderboard">🏆 View my ranking</Link>
          </div>
          {error !== 'No submitted attempt found for this test' && <div className="error-box">{error}</div>}
        </section>
      </div>
    );
  }
  if (!result) return <div className="container center-note">Loading result…</div>;

  const pct = result.total_marks ? Math.round((result.total_marks_awarded / result.total_marks) * 1000) / 10 : null;
  const correctCount = breakdown.filter((a) => a.questions?.type === 'mcq' && a.mcq_selected === a.questions.correct_option).length;
  const wrongCount = breakdown.filter((a) => a.questions?.type === 'mcq' && a.mcq_selected !== null && a.mcq_selected !== undefined && a.mcq_selected !== a.questions.correct_option).length;
  const unansweredCount = breakdown.filter((a) => a.questions?.type === 'mcq' && (a.mcq_selected === null || a.mcq_selected === undefined)).length;

  return (
    <div className="container student-result-page">
      <Link className="nav-action-button result-back-link" to="/student/dashboard">← Back to my tests</Link>

      <div ref={cardRef}>
        <section className="result-hero-card">
          <div className="result-hero-main">
            <div className="eyebrow">ASSESSMENT RESULT</div>
            <h1>{result.test_title}</h1>
            <p className="result-hero-subtitle">Your performance summary and detailed paper review.</p>
          </div>

          <div className="result-score-panel">
            <div className="result-score-label">YOUR SCORE</div>
            <div className="result-score-value">
              {result.total_marks_awarded}
              <span>/ {result.total_marks}</span>
            </div>
            {pct !== null && <div className="result-percentage">{pct}%</div>}
          </div>

          <div className="result-hero-actions">
            <button className="result-review-button" onClick={() => setReviewOpen((v) => !v)}>
              <span>{reviewOpen ? '✓' : '◉'}</span>
              {reviewOpen ? 'Hide correct & wrong answers' : 'Show correct & wrong answers'}
            </button>
            <div className="result-review-hint">Review each question, your answer and the correct option.</div>
          </div>

          <div className="result-stat-strip">
            <div><strong>{correctCount}</strong><span>Correct</span></div>
            <div><strong>{wrongCount}</strong><span>Wrong</span></div>
            <div><strong>{unansweredCount}</strong><span>Unanswered</span></div>
            <div><strong>{breakdown.length}</strong><span>Total questions</span></div>
          </div>

          {pct !== null && pct >= 90 && <div className="scorecard-celebrate">🌟 Excellent score — great work!</div>}
          {pct !== null && pct >= 75 && pct < 90 && <div className="scorecard-celebrate">👏 Nicely done!</div>}
        </section>

        <div className="result-review-section">
          {reviewOpen && breakdown.length === 0 && (
            <div className="result-empty-review">Nothing to review for this submission.</div>
          )}

          {reviewOpen && breakdown.length > 0 && (
            <div className="result-review-list">
              <div className="result-review-header">
                <div>
                  <div className="eyebrow">PAPER REVIEW</div>
                  <h2>Correct &amp; wrong answers</h2>
                </div>
                <div className="result-legend">
                  <span className="legend-correct">✓ Correct</span>
                  <span className="legend-wrong">✕ Wrong</span>
                </div>
              </div>

              {breakdown.map((a, i) => {
                const q = a.questions;
                const isMcq = q?.type === 'mcq';
                const isPractical = q?.type === 'practical';
                const isCorrect = isMcq && a.mcq_selected === q.correct_option;
                const answered = isMcq ? a.mcq_selected !== null && a.mcq_selected !== undefined : true;
                const practicalPrompt = a.variant_snapshot?.question_text || q?.question_text;
                const practicalLang = a.variant_snapshot?.language || q?.language;
                const status = isMcq ? (!answered ? 'unanswered' : isCorrect ? 'correct' : 'wrong') : 'review';

                return (
                  <article className={`result-question-card status-${status} ${q?.type || ''}`} key={a.question_id}>
                    <div className="result-question-topline">
                      <span className="result-question-number">Q{i + 1}</span>
                      <span className="result-question-type">{q?.type === 'mcq' ? 'Multiple choice' : q?.type || 'Question'}</span>
                      <span className="result-question-marks">{a.marks_awarded ?? '—'} / {q?.marks ?? '—'} marks</span>
                      {isMcq && <span className={`result-status status-pill-${status}`}>{!answered ? 'Not answered' : isCorrect ? '✓ Correct' : '✕ Incorrect'}</span>}
                    </div>

                    {!isPractical && <h3>{q?.question_text}</h3>}

                    {isMcq && (
                      <div className="result-options">
                        {(q.options || []).map((opt, oi) => {
                          const isYourPick = a.mcq_selected === oi;
                          const isRight = q.correct_option === oi;
                          const optionClass = isRight ? 'option-correct' : (isYourPick ? 'option-wrong' : '');
                          return (
                            <div key={oi} className={`result-option-row ${optionClass}`}>
                              <span className="result-option-letter">{String.fromCharCode(65 + oi)}</span>
                              <span className="result-option-text">{opt}</span>
                              {isRight && <span className="result-option-label correct">✓ Correct answer</span>}
                              {isYourPick && !isRight && <span className="result-option-label wrong">✕ Your answer</span>}
                              {isYourPick && isRight && <span className="result-option-label correct">✓ Your answer</span>}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {q?.type === 'written' && (
                      <div className="result-answer-box"><div className="result-answer-label">Your answer</div>{a.written_text || <em>No answer submitted</em>}</div>
                    )}

                    {q?.type === 'upload' && (
                      <div className="result-answer-box"><div className="result-answer-label">Uploaded answer</div>{a.file_url ? <img className="result-uploaded-image" src={a.file_url} alt="Uploaded answer" /> : <em>No file uploaded</em>}</div>
                    )}

                    {isPractical && (
                      <div>
                        <span className="type-badge practical" style={{ marginBottom: 8, display: 'inline-block' }}>💻 {practicalLang === 'python' ? 'Python' : practicalLang === 'javascript' ? 'JavaScript' : 'HTML'}</span>
                        <div className="result-answer-box result-problem-box"><div className="result-answer-label">Problem statement</div>{practicalPrompt || <em>Problem statement unavailable</em>}</div>
                        <div className="result-answer-label">Your submitted code</div>
                        <pre className="code-block">{a.written_text || 'No code submitted'}</pre>
                      </div>
                    )}

                    {a.teacher_remark && <div className="result-teacher-remark">💬 <strong>Teacher's remark:</strong> {a.teacher_remark}</div>}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="export-bar result-export-bar">
        <span className="meta">Save this result:</span>
        <button className="secondary small" onClick={downloadImage} disabled={!!exporting}>{exporting === 'jpg' ? 'Preparing…' : '🖼 Image'}</button>
        <button className="secondary small" onClick={downloadPDF} disabled={!!exporting}>{exporting === 'pdf' ? 'Preparing…' : '📄 PDF report card'}</button>
      </div>

      <Link className="nav-action-button" to="/student/leaderboard">🏆 See the class leaderboard</Link>
    </div>
  );
}
