import React from 'react';

// Real school logo, served from /public/logo.jpg.
export default function SchoolLogo({ size = 64 }) {
  return (
    <img
      src="/logo.jpg"
      alt="SNSVM logo"
      width={size}
      height={size}
      style={{
        objectFit: 'contain',
        borderRadius: 10,
        boxShadow: '0 3px 10px rgba(22,35,61,0.18)',
        background: '#fff',
      }}
    />
  );
}
