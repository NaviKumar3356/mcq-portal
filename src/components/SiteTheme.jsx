import { useEffect } from 'react';
import { api } from '../lib/api.js';

export default function SiteTheme() {
  useEffect(() => {
    let active = true;
    api('/site-settings')
      .then((s) => {
        if (!active) return;
        if (s.theme_primary) document.documentElement.style.setProperty('--ink', s.theme_primary);
        if (s.theme_secondary) {
          document.documentElement.style.setProperty('--accent', s.theme_secondary);
          document.documentElement.style.setProperty('--accent-dark', s.theme_secondary);
        }
        if (s.theme_accent) document.documentElement.style.setProperty('--accent-2', s.theme_accent);
        if (s.card_density) document.documentElement.dataset.cardDensity = s.card_density;
        if (s.corner_style) document.documentElement.dataset.cornerStyle = s.corner_style;
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);
  return null;
}
