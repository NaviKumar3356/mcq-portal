import { useEffect } from 'react';

export default function SiteTheme() {
  useEffect(() => {
    let active = true;
    fetch('/api/site-settings')
      .then((r) => r.ok ? r.json() : {})
      .then((s) => {
        if (!active) return;
        if (s.theme_primary) document.documentElement.style.setProperty('--ink', s.theme_primary);
        if (s.theme_secondary) {
          document.documentElement.style.setProperty('--accent', s.theme_secondary);
          document.documentElement.style.setProperty('--accent-dark', s.theme_secondary);
        }
        if (s.theme_accent) document.documentElement.style.setProperty('--accent-2', s.theme_accent);
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);
  return null;
}
