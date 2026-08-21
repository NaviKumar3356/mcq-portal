import { SCHOOL_NAME, SCHOOL_PLACE } from './constants.js';

let cachedLogo = null;

export async function getLogoDataUrl() {
  if (cachedLogo) return cachedLogo;
  try {
    const res = await fetch('/logo.jpg');
    const blob = await res.blob();
    cachedLogo = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    return cachedLogo;
  } catch {
    return null;
  }
}

const MAROON = [125, 28, 45];
const GREEN = [36, 99, 65];
const GOLD = [224, 168, 40];
const INK = [28, 42, 65];
const MUTED = [103, 108, 116];
const CREAM = [250, 247, 239];

export async function drawWatermark(doc) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const logo = await getLogoDataUrl();
  if (!logo || !doc.GState) return;
  const size = Math.min(pageW, pageH) * 0.58;
  doc.saveGraphicsState();
  doc.setGState(new doc.GState({ opacity: 0.055 }));
  doc.addImage(logo, 'JPEG', (pageW - size) / 2, (pageH - size) / 2, size, size);
  doc.restoreGraphicsState();
}

export async function drawReportCardHeader(doc, { studentName, studentClass, rollNumber, title, testNumber }) {
  const pageW = doc.internal.pageSize.getWidth();
  const logo = await getLogoDataUrl();
  doc.setFillColor(...MAROON);
  doc.rect(0, 0, pageW, 3.2, 'F');
  doc.setFillColor(...GOLD);
  doc.rect(0, 3.2, pageW, 1.1, 'F');

  // Give the school logo enough space to remain recognisable at print size.
  if (logo) doc.addImage(logo, 'JPEG', 14, 9, 29, 29);

  // Keep the long school name away from the report-card title to avoid overlap.
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14.5);
  doc.setTextColor(...INK);
  const schoolLines = doc.splitTextToSize(SCHOOL_NAME, 92);
  doc.text(schoolLines, 48, 17);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.8);
  doc.setTextColor(...MUTED);
  doc.text(SCHOOL_PLACE, 48, 28);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.2);
  doc.setTextColor(...GREEN);
  doc.text('STUDENT ASSESSMENT', pageW - 14, 16, { align: 'right' });
  doc.text('REPORT CARD', pageW - 14, 21, { align: 'right' });
  doc.setFontSize(7.3);
  doc.setTextColor(...MUTED);
  doc.text('Official result summary', pageW - 14, 27, { align: 'right' });

  doc.setDrawColor(226, 219, 202);
  doc.line(14, 42, pageW - 14, 42);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...MAROON);
  doc.text(title, 16, 54);
  if (testNumber) {
    doc.setFillColor(...GOLD);
    doc.roundedRect(pageW - 50, 46, 36, 10, 5, 5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(55, 45, 20);
    doc.text(`TEST ${String(testNumber).toUpperCase()}`, pageW - 32, 52.5, { align: 'center' });
  }

  const y = 63;
  doc.setFillColor(...CREAM);
  doc.roundedRect(14, y, pageW - 28, 25, 4, 4, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text('STUDENT', 20, y + 8);
  doc.text('CLASS', 105, y + 8);
  doc.text('ROLL NUMBER', 145, y + 8);
  doc.setFontSize(11);
  doc.setTextColor(...INK);
  doc.text(String(studentName || 'Student'), 20, y + 17);
  doc.text(String(studentClass || '—'), 105, y + 17);
  doc.text(String(rollNumber || '—'), 145, y + 17);
  return 97;
}

export function drawSummaryCard(doc, y, { score, percentage, correct, wrong, unanswered, total }) {
  const pageW = doc.internal.pageSize.getWidth();
  const cardW = pageW - 28;
  doc.setDrawColor(228, 218, 195);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(14, y, cardW, 42, 5, 5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text('FINAL SCORE', 22, y + 10);
  doc.setFontSize(24);
  doc.setTextColor(...MAROON);
  doc.text(score, 22, y + 26);
  doc.setFontSize(11);
  doc.setTextColor(...GREEN);
  doc.text(`${percentage}`, 22, y + 35);

  const items = [
    ['Correct', correct, GREEN],
    ['Wrong', wrong, MAROON],
    ['Unanswered', unanswered, [105, 105, 105]],
    ['Questions', total, INK],
  ];
  const startX = 82;
  const colW = 25;
  items.forEach(([label, value, color], i) => {
    const x = startX + i * colW;
    doc.setFillColor(247, 244, 236);
    doc.circle(x + 6, y + 16, 5.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...color);
    doc.text(String(value), x + 6, y + 18.5, { align: 'center' });
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text(label.toUpperCase(), x + 6, y + 29, { align: 'center' });
  });
  return y + 42;
}

export function drawPerformanceRow(doc, y, { questionLines, type, marks, remark }) {
  const pageW = doc.internal.pageSize.getWidth();
  const textColor = INK;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.7);
  doc.setTextColor(...textColor);
  questionLines.forEach((line, idx) => doc.text(line, 16, y + 4.5 + idx * 4.2));
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text(type.toUpperCase(), 137, y + 4.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...MAROON);
  doc.text(marks, 174, y + 4.5);
  if (remark) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.3);
    doc.setTextColor(...MUTED);
    const r = doc.splitTextToSize(`Remark: ${remark}`, 150);
    r.forEach((line, idx) => doc.text(line, 20, y + 4.5 + questionLines.length * 4.2 + idx * 3.5));
  }
  doc.setDrawColor(235, 230, 218);
  const h = Math.max(8, questionLines.length * 4.2 + (remark ? 5 : 0));
  doc.line(16, y + h, pageW - 16, y + h);
}

export function drawMCQReviewBlock(doc, y, { number, question, options = [], selected, correct }) {
  const pageW = doc.internal.pageSize.getWidth();
  const contentW = pageW - 32;
  const optionTexts = options.map((o) => typeof o === 'object' ? (o.text ?? '') : String(o ?? ''));
  const answered = selected !== null && selected !== undefined;
  const isCorrect = answered && Number(selected) === Number(correct);

  doc.setFillColor(250, 247, 239);
  doc.roundedRect(14, y, contentW + 4, 8, 2.5, 2.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...MAROON);
  doc.text(`QUESTION ${number}`, 19, y + 5.3);
  doc.setTextColor(...MUTED);
  doc.text(isCorrect ? '✓ Correct' : (answered ? '✕ Incorrect' : 'Not answered'), pageW - 20, y + 5.3, { align: 'right' });
  y += 12;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.2);
  doc.setTextColor(...INK);
  const qLines = doc.splitTextToSize(question || `Question ${number}`, contentW - 2);
  doc.text(qLines, 16, y);
  y += qLines.length * 4.2 + 3;

  optionTexts.forEach((text, oi) => {
    const right = Number(correct) === oi;
    const yours = answered && Number(selected) === oi;
    let bg = [248, 248, 246];
    let border = [228, 224, 214];
    let label = '';
    let labelColor = MUTED;
    if (right) {
      bg = [235, 247, 239]; border = GREEN; label = yours ? '✓ Your answer · Correct' : '✓ Correct answer'; labelColor = GREEN;
    } else if (yours) {
      bg = [253, 237, 238]; border = MAROON; label = '✕ Your answer'; labelColor = MAROON;
    }
    const lines = doc.splitTextToSize(`${String.fromCharCode(65 + oi)}. ${text}`, 105);
    const h = Math.max(8, lines.length * 3.7 + 4);
    doc.setFillColor(...bg); doc.setDrawColor(...border);
    doc.roundedRect(16, y, contentW, h, 2, 2, 'FD');
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.2); doc.setTextColor(...INK);
    doc.text(lines, 20, y + 5);
    if (label) {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(6.8); doc.setTextColor(...labelColor);
      doc.text(label, pageW - 20, y + 5, { align: 'right' });
    }
    y += h + 2.5;
  });

  if (!answered) {
    doc.setFont('helvetica', 'italic'); doc.setFontSize(7.2); doc.setTextColor(...MUTED);
    doc.text('Student response: Not answered', 18, y + 1);
    y += 5;
  }
  doc.setDrawColor(232, 226, 214);
  doc.line(16, y + 1, pageW - 16, y + 1);
  return y + 5;
}

export function addFooter(doc) {
  const pageCount = doc.internal.getNumberOfPages();
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const generated = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFillColor(...MAROON);
    doc.rect(0, pageH - 3, pageW, 3, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text(`${SCHOOL_NAME} · Generated ${generated} IST`, 14, pageH - 8);
    doc.text(`Page ${i} of ${pageCount}`, pageW - 14, pageH - 8, { align: 'right' });
  }
}

// Backward-compatible export used by older pages.
export async function drawWatermarkAndHeader(doc, { title, subtitle }) {
  await drawWatermark(doc);
  const y = await drawReportCardHeader(doc, { studentName: 'Student', title, testNumber: '' });
  if (subtitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...MUTED);
    doc.text(subtitle, 16, y - 5);
  }
  return y;
}
