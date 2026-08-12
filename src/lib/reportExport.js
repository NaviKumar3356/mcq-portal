import { SCHOOL_NAME, SCHOOL_PLACE } from './constants.js';

let cachedLogo = null;

// Fetches /logo.jpg once and caches it as a data URL so repeated exports
// in the same session don't re-fetch it.
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

// Draws a report-card-style letterhead (school name, place, logo) plus a
// large, faint, centered logo watermark behind the page content — the way
// a printed school report card looks. Returns the y-coordinate where the
// caller's own table/content should start.
export async function drawWatermarkAndHeader(doc, { title, subtitle }) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const logo = await getLogoDataUrl();

  if (logo) {
    const size = Math.min(pageW, pageH) * 0.6;
    if (doc.GState) {
      doc.saveGraphicsState();
      doc.setGState(new doc.GState({ opacity: 0.08 }));
      doc.addImage(logo, 'JPEG', (pageW - size) / 2, (pageH - size) / 2, size, size);
      doc.restoreGraphicsState();
    }
    doc.addImage(logo, 'JPEG', 14, 10, 20, 20);
  }

  doc.setFont(undefined, 'bold');
  doc.setFontSize(14);
  doc.text(SCHOOL_NAME, logo ? 40 : 14, 18);
  doc.setFont(undefined, 'normal');
  doc.setFontSize(9);
  doc.text(SCHOOL_PLACE, logo ? 40 : 14, 24);

  doc.setDrawColor(200);
  doc.line(14, 32, pageW - 14, 32);

  doc.setFont(undefined, 'bold');
  doc.setFontSize(13);
  doc.text(title, 14, 42);
  if (subtitle) {
    doc.setFont(undefined, 'normal');
    doc.setFontSize(10);
    doc.text(subtitle, 14, 49);
  }
  return 58;
}

// Adds a page-number + "generated at" footer (in IST) to every page.
// Call this once, right before doc.save().
export function addFooter(doc) {
  const pageCount = doc.internal.getNumberOfPages();
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const generated = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(140);
    doc.text(`${SCHOOL_NAME} · Generated ${generated} IST`, 14, pageH - 8);
    doc.text(`Page ${i} of ${pageCount}`, pageW - 32, pageH - 8);
    doc.setTextColor(0);
  }
}
