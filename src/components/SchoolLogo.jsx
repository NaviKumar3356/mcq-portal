import React from 'react';

// A clean seal-style monogram for Sant Nandlal Smriti Vidya Mandir.
// Replace with a real logo any time: drop a file at /public/logo.png and
// swap the <svg> below for <img src="/logo.png" ... />.
export default function SchoolLogo({ size = 44, light = false }) {
  const ink = light ? '#ffffff' : '#16233d';
  const accent = '#2f6f4f';

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-label="SNSVM seal">
      <circle cx="50" cy="46" r="34" fill="none" stroke={ink} strokeWidth="2.5" />
      <circle cx="50" cy="46" r="27" fill="none" stroke={accent} strokeWidth="2" />
      <text x="50" y="43" textAnchor="middle" fontFamily="'Source Serif 4', Georgia, serif"
            fontWeight="700" fontSize="17" fill={ink}>SNSVM</text>
      <text x="50" y="57" textAnchor="middle" fontFamily="Inter, sans-serif"
            fontWeight="600" fontSize="7" letterSpacing="0.5" fill={accent}>EST. VIDYA</text>
      <path d="M22 78 L50 70 L78 78 L78 88 L50 80 L22 88 Z" fill={ink} />
    </svg>
  );
}
