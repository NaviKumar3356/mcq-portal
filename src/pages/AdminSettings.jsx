import React, { useEffect, useState } from 'react';
import { api, getAssetUrl } from '../lib/api.js';
import PanelLayout from '../components/PanelLayout.jsx';
import SchoolLogo from '../components/SchoolLogo.jsx';

const ITEMS = [
  { to: '/admin', label: 'Overview', icon: '🏠', end: true },
  { to: '/admin/teachers', label: 'Teachers', icon: '🖊️' },
  { to: '/admin/students', label: 'Students', icon: '🎓' },
  { to: '/admin/papers', label: 'All papers', icon: '📄' },
  { to: '/admin/leaderboard', label: 'Leaderboard', icon: '🏆' },
  { to: '/admin/settings', label: 'School & branding', icon: '🎨' },
];

const DEFAULTS = {
  schoolName: 'Sant Nandlal Smriti Vidya Mandir',
  schoolPlace: 'Malsisar, Rajasthan',
  primary: '#8B1E2D',
  secondary: '#2F6B45',
  accent: '#E0A52C',
};

function unwrapSetting(setting, fallback = '') {
  // app_settings stores JSON values such as { value: '#8B1E2D' }.
  // Accept both the current nested shape and a future direct primitive shape.
  const raw = setting?.value;
  if (raw && typeof raw === 'object' && 'value' in raw) return raw.value ?? fallback;
  return raw ?? fallback;
}

function settingPath(setting) {
  const raw = setting?.value;
  return raw && typeof raw === 'object' && typeof raw.path === 'string' ? raw.path : '';
}

const THEME_PRESETS = [
  { id: 'school-emblem', name: 'School Emblem', note: 'Maroon, academic green & gold', primary: '#8B1E2D', secondary: '#2F6B45', accent: '#E0A52C' },
  { id: 'heritage', name: 'Heritage', note: 'Deep maroon, parchment & brass', primary: '#6F1F2D', secondary: '#6A5A3A', accent: '#C9982F' },
  { id: 'academic', name: 'Academic', note: 'Navy, forest green & gold', primary: '#162B4D', secondary: '#2F6B45', accent: '#D9A72B' },
  { id: 'royal', name: 'Royal', note: 'Indigo, plum & warm gold', primary: '#312B61', secondary: '#6B3E73', accent: '#D8A63A' },
  { id: 'clean', name: 'Clean', note: 'Slate, teal & amber', primary: '#243746', secondary: '#2D6F69', accent: '#D99A2B' },
  { id: 'earth', name: 'Earth', note: 'Terracotta, olive & sand', primary: '#8A3E2F', secondary: '#526447', accent: '#C89B42' },
];

export default function AdminSettings() {
  const [form, setForm] = useState(DEFAULTS);
  const [assets, setAssets] = useState({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [themePreset, setThemePreset] = useState('school-emblem');
  const [cardDensity, setCardDensity] = useState('comfortable');
  const [cornerStyle, setCornerStyle] = useState('rounded');
  const [catalog, setCatalog] = useState({ classes: [], subjects: [], sections: [] });
  const [catalogDraft, setCatalogDraft] = useState({ classes: '', subjects: '', sections: '' });
  const [catalogSaving, setCatalogSaving] = useState(false);
  const [catalogNew, setCatalogNew] = useState({ classes: '', subjects: '', sections: '' });

  async function load() {
    setError('');
    try {
      const d = await api('/admin-site-settings');
      const s = d.settings || {};
      const schoolName = unwrapSetting(s.site_school_name, DEFAULTS.schoolName);
      const schoolPlace = unwrapSetting(s.site_school_place, DEFAULTS.schoolPlace);
      const primary = unwrapSetting(s.theme_primary, DEFAULTS.primary);
      const secondary = unwrapSetting(s.theme_secondary, DEFAULTS.secondary);
      const accent = unwrapSetting(s.theme_accent, DEFAULTS.accent);
      setForm({ schoolName, schoolPlace, primary, secondary, accent });
      setCardDensity(unwrapSetting(s.ui_card_density, 'comfortable'));
      setCornerStyle(unwrapSetting(s.ui_corner_style, 'rounded'));
      const matchedPreset = THEME_PRESETS.find((p) => p.primary === primary && p.secondary === secondary && p.accent === accent);
      setThemePreset(matchedPreset?.id || 'custom');
      const catalogData = await api('/admin-catalog');
      const nextCatalog = { classes: catalogData.classes || [], subjects: catalogData.subjects || [], sections: catalogData.sections || [] };
      setCatalog(nextCatalog);
      setCatalogDraft({ classes: nextCatalog.classes.join('\n'), subjects: nextCatalog.subjects.join('\n'), sections: nextCatalog.sections.join('\n') });
      setAssets({
        logo: settingPath(s.site_logo_path),
        hero_1: settingPath(s.site_hero_1),
        hero_2: settingPath(s.site_hero_2),
        hero_3: settingPath(s.site_hero_3),
        default_avatar: settingPath(s.default_avatar),
      });
    } catch (e) { setError(e.message); }
  }
  useEffect(() => { load(); }, []);

  function applyThemePreset(preset) {
    setThemePreset(preset.id);
    setForm((f) => ({ ...f, primary: preset.primary, secondary: preset.secondary, accent: preset.accent }));
  }

  async function save() {
    setSaving(true); setError(''); setSuccess('');
    try {
      await api('/admin-site-settings', { method: 'PATCH', body: { settings: {
        site_school_name: { value: form.schoolName },
        site_school_place: { value: form.schoolPlace },
        theme_primary: { value: form.primary },
        theme_secondary: { value: form.secondary },
        theme_accent: { value: form.accent },
        ui_card_density: { value: cardDensity },
        ui_corner_style: { value: cornerStyle },
        ...(assets.logo ? { site_logo_path: { path: assets.logo } } : {}),
        ...(assets.hero_1 ? { site_hero_1: { path: assets.hero_1 } } : {}),
        ...(assets.hero_2 ? { site_hero_2: { path: assets.hero_2 } } : {}),
        ...(assets.hero_3 ? { site_hero_3: { path: assets.hero_3 } } : {}),
        ...(Object.prototype.hasOwnProperty.call(assets, 'default_avatar')
          ? { default_avatar: { path: assets.default_avatar || '' } }
          : {}),
      }}});
      document.documentElement.style.setProperty('--ink', form.primary);
      document.documentElement.style.setProperty('--accent', form.secondary);
      document.documentElement.style.setProperty('--accent-dark', form.secondary);
      document.documentElement.style.setProperty('--accent-2', form.accent);
      document.documentElement.dataset.cardDensity = cardDensity;
      document.documentElement.dataset.cornerStyle = cornerStyle;
      window.dispatchEvent(new Event('site-settings-updated'));
      setSuccess('School branding and theme saved.');
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  }


  function catalogItems(key) {
    return catalogDraft[key].split(/\n|,/).map(v => v.trim()).filter(Boolean);
  }

  function addCatalogItem(key) {
    const value = catalogNew[key].trim();
    if (!value) return;
    const items = catalogItems(key);
    if (items.some(v => v.toLowerCase() === value.toLowerCase())) return;
    setCatalogDraft(d => ({ ...d, [key]: [...items, value].join('\n') }));
    setCatalogNew(n => ({ ...n, [key]: '' }));
  }

  function removeCatalogItem(key, value) {
    const items = catalogItems(key).filter(v => v !== value);
    setCatalogDraft(d => ({ ...d, [key]: items.join('\n') }));
  }

  async function saveCatalog() {
    setCatalogSaving(true); setError(''); setSuccess('');
    try {
      const body = {};
      for (const key of ['classes','subjects','sections']) {
        body[key] = catalogDraft[key].split(/\n|,/).map(v => v.trim()).filter(Boolean);
      }
      const d = await api('/admin-catalog', { method: 'PATCH', body });
      setCatalog({ classes: d.classes || body.classes, subjects: d.subjects || body.subjects, sections: d.sections || body.sections });
      setSuccess('School catalog saved. New classes, subjects and sections are now available in the portal.');
      window.dispatchEvent(new Event('school-catalog-updated'));
    } catch (e) { setError(e.message); }
    finally { setCatalogSaving(false); }
  }

  async function upload(slot, file) {
    if (!file) return;
    setUploading(slot); setError(''); setSuccess('');
    try {
      if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
        throw new Error('Browser Supabase settings are missing. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your local .env file before uploading branding images.');
      }
      const ext = file.name.split('.').pop();
      const d = await api('/admin-site-asset-upload-url', { method: 'POST', body: { slot, file_ext: ext } });
      const { supabase } = await import('../lib/supabaseClient.js');
      const { error: uploadError } = await supabase.storage.from('site-assets').uploadToSignedUrl(d.path, d.token, file);
      if (uploadError) throw uploadError;
      setAssets((a) => ({ ...a, [slot]: d.path }));
      const label = slot === 'logo' ? 'Logo' : slot === 'default_avatar' ? 'Student default avatar' : 'Landing image';
      setSuccess(`${label} uploaded. Click Save to publish it.`);
    } catch (e) { setError(`Upload failed: ${e.message}`); }
    finally { setUploading(''); }
  }

  const assetCard = (slot, title, help) => (
    <div className={`card branding-asset-card ${slot === 'default_avatar' ? 'default-avatar-asset-card' : ''}`}>
      <div className="branding-asset-preview">
        {assets[slot]
          ? <img src={getAssetUrl(assets[slot])} alt={`${title} preview`} />
          : slot === 'default_avatar'
            ? <img src="/default-student-avatar.svg" alt="Built-in default avatar preview" />
            : <div className="branding-empty">No image selected</div>}
      </div>
      <div>
        <div className="branding-asset-heading">
          <div>
            <h3>{title}</h3>
            <p className="meta">{help}</p>
          </div>
          {slot === 'default_avatar' && <span className="branding-status-pill">Student fallback</span>}
        </div>
        <div className="branding-asset-actions">
          <label className="secondary branding-upload-button">
            {uploading === slot ? 'Uploading…' : 'Upload / replace'}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              hidden
              disabled={!!uploading}
              onChange={(e) => upload(slot, e.target.files[0])}
            />
          </label>
          {slot === 'default_avatar' && assets[slot] && (
            <button
              type="button"
              className="secondary branding-upload-button"
              onClick={() => setAssets((a) => ({ ...a, default_avatar: '' }))}
              disabled={!!uploading}
            >
              Restore built-in
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <PanelLayout items={ITEMS}>
      <div className="admin-page-heading">
        <div><span className="section-kicker">🎨 SCHOOL CONTROL CENTRE</span><h2>School & branding</h2><p className="meta">Change the public identity, colours and media without touching source code.</p></div>
        <button className="primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save all changes'}</button>
      </div>
      {error && <div className="error-box">{error}</div>}
      {success && <div className="success-box">{success}</div>}

      <div className="card admin-settings-intro">
        <SchoolLogo size={76} />
        <div><b>Live school branding</b><p className="meta">The logo and colour theme are shared by the public landing page, rankings and portal headers. Keep the logo clear and use a transparent PNG/WebP when possible. The default student avatar can also be replaced here without changing source code.</p></div>
      </div>

      <section className="admin-settings-grid">
        {assetCard('default_avatar', 'Student default avatar', 'Shown automatically anywhere a student has not uploaded a profile photo. JPG, PNG or WebP; 512 × 512 px is recommended.')}
        {assetCard('logo', 'School logo', 'Replaces the school logo across the portal. Recommended: transparent PNG or high-resolution JPG.')}
        {assetCard('hero_1', 'Landing image 1', 'Reserved for the public landing-page media carousel.')}
        {assetCard('hero_2', 'Landing image 2', 'Reserved for the public landing-page media carousel.')}
        {assetCard('hero_3', 'Landing image 3', 'Reserved for the public landing-page media carousel.')}
      </section>

      <div className="card">
        <div className="card-section-title">🏫 School identity</div>
        <div className="form-grid-2">
          <div><label>School name</label><input value={form.schoolName} onChange={(e) => setForm({ ...form, schoolName: e.target.value })} /></div>
          <div><label>Location / campus</label><input value={form.schoolPlace} onChange={(e) => setForm({ ...form, schoolPlace: e.target.value })} /></div>
        </div>
      </div>


      <div className="card admin-catalog-card">
        <div className="admin-section-heading">
          <div>
            <span className="section-kicker">ACADEMIC SETUP</span>
            <h3>Classes, subjects & sections</h3>
            <p className="meta">Use the simple Add / Remove controls below. You do not need to type a list or know the database format.</p>
          </div>
          <span className="admin-config-badge">Configuration</span>
        </div>

        <div className="catalog-help-strip">
          <span className="catalog-help-icon">✓</span>
          <div><strong>How to add a new option</strong><span>Type the name in the box and click Add. It will become available in student records, teacher assignments and paper creation after you save.</span></div>
        </div>

        <div className="admin-catalog-grid">
          {[['classes','Classes','e.g. XIII'],['subjects','Subjects','e.g. Artificial Intelligence'],['sections','Sections','e.g. D']].map(([key,label,placeholder]) => {
            const items = catalogItems(key);
            return (
              <div className="admin-catalog-editor" key={key}>
                <div className="catalog-editor-head">
                  <div><h4>{label}</h4><span>{items.length} configured</span></div>
                </div>
                <div className="catalog-add-row">
                  <input
                    value={catalogNew[key]}
                    placeholder={placeholder}
                    aria-label={`New ${label.slice(0,-1)}`}
                    onChange={e => setCatalogNew(n => ({ ...n, [key]: e.target.value }))}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCatalogItem(key); } }}
                  />
                  <button type="button" className="secondary" onClick={() => addCatalogItem(key)}>+ Add</button>
                </div>
                <div className="catalog-chip-list">
                  {items.map(item => (
                    <span className="catalog-chip" key={item}>
                      <span>{item}</span>
                      <button type="button" aria-label={`Remove ${item}`} onClick={() => removeCatalogItem(key, item)}>×</button>
                    </span>
                  ))}
                  {items.length === 0 && <span className="catalog-empty">No options configured yet.</span>}
                </div>
              </div>
            );
          })}
        </div>

        <div className="admin-catalog-actions">
          <button className="primary" type="button" onClick={saveCatalog} disabled={catalogSaving}>{catalogSaving ? 'Saving catalogue…' : 'Save academic catalogue'}</button>
          <span className="meta">Removing an option only removes it from future selections; existing student/test records are not deleted.</span>
        </div>
      </div>

      <div className="card">
        <div className="card-section-title">🎨 Theme studio</div>
        <p className="meta">Choose a professionally balanced preset or fine-tune the colours below. The preview uses the same palette across public and portal screens.</p>
        <div className="admin-theme-presets">
          {THEME_PRESETS.map((preset) => (
            <button type="button" key={preset.id} className={`admin-theme-preset ${themePreset === preset.id ? 'active' : ''}`} onClick={() => applyThemePreset(preset)}>
              <div className="admin-theme-swatches"><span style={{ background: preset.primary }} /><span style={{ background: preset.secondary }} /><span style={{ background: preset.accent }} /></div>
              <strong>{preset.name}</strong><small>{preset.note}</small>
            </button>
          ))}
        </div>
        <div className="theme-control-grid" style={{ marginTop: 18 }}>
          <label>Primary maroon<input type="color" value={form.primary} onChange={(e) => setForm({ ...form, primary: e.target.value })} /><code>{form.primary}</code></label>
          <label>Academic green<input type="color" value={form.secondary} onChange={(e) => setForm({ ...form, secondary: e.target.value })} /><code>{form.secondary}</code></label>
          <label>Gold accent<input type="color" value={form.accent} onChange={(e) => setForm({ ...form, accent: e.target.value })} /><code>{form.accent}</code></label>
        </div>
      </div>

      <div className="card">
        <div className="card-section-title">🧩 Interface preferences</div>
        <p className="meta">These settings affect visual comfort only; they do not change permissions or assessment security.</p>
        <div className="admin-advanced-grid">
          <div className="admin-option-card">
            <label>Card density</label>
            <select value={cardDensity} onChange={(e) => setCardDensity(e.target.value)}>
              <option value="comfortable">Comfortable — recommended</option>
              <option value="compact">Compact — more information per screen</option>
              <option value="spacious">Spacious — presentation focused</option>
            </select>
          </div>
          <div className="admin-option-card">
            <label>Corner style</label>
            <select value={cornerStyle} onChange={(e) => setCornerStyle(e.target.value)}>
              <option value="rounded">Rounded — modern school portal</option>
              <option value="soft">Soft — subtle corners</option>
              <option value="classic">Classic — restrained corners</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card admin-security-card">
        <div className="card-section-title">🔐 Administration access</div>
        <p className="meta">The administration login is not linked from public navigation. Current private route:</p>
        <code>/secure-admin-console/login</code>
        <p className="meta">For production, set <code>VITE_ADMIN_LOGIN_PATH</code> to a private route known only to authorised administrators. Server-side role checks remain the real security boundary.</p>
      </div>
    </PanelLayout>
  );
}
