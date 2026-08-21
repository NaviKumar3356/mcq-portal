import React, { useEffect, useState } from 'react';

let cachedLogo = null;
let loading = null;

async function loadLogo() {
  if (cachedLogo) return cachedLogo;
  if (!loading) {
    loading = fetch('/api/site-settings')
      .then((r) => r.ok ? r.json() : {})
      .then((d) => {
        cachedLogo = d.logo_url || '/logo.jpg';
        return cachedLogo;
      })
      .catch(() => '/logo.jpg');
  }
  return loading;
}

export default function SchoolLogo({ size = 64 }) {
  const [src, setSrc] = useState(cachedLogo || '/logo.jpg');

  useEffect(() => {
    let mounted = true;
    loadLogo().then((url) => mounted && setSrc(url));
    const refresh = () => {
      cachedLogo = null;
      loading = null;
      loadLogo().then((url) => mounted && setSrc(url));
    };
    window.addEventListener('site-settings-updated', refresh);
    return () => {
      mounted = false;
      window.removeEventListener('site-settings-updated', refresh);
    };
  }, []);

  return (
    <img
      src={src}
      alt="SNSVM logo"
      width={size}
      height={size}
      style={{ objectFit: 'contain', borderRadius: 10, boxShadow: '0 3px 10px rgba(89,22,32,0.18)', background: '#fff' }}
      onError={(e) => { e.currentTarget.src = '/logo.jpg'; }}
    />
  );
}
