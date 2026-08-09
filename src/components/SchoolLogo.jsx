import React from 'react';

// Real school logo, served from /public/logo.jpg.
// `light` is unused for an image logo but kept so existing callers
// (which pass light={true} on the dark sidebar) don't need changes.
export default function SchoolLogo({ size = 44 }) {
  return (
    <img
      src="/logo.jpg"
      alt="SNSVM logo"
      width={size}
      height={size}
      style={{ objectFit: 'contain', borderRadius: 6 }}
    />
  );
}