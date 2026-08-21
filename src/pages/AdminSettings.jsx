import React, { useEffect, useState } from 'react';
import { api, getAssetUrl } from '../lib/api.js';
import { supabase } from '../lib/supabaseClient.js';
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

export default function AdminSettings() {
  const [form, setForm] = useState(DEFAULTS);
  const [assets, setAssets] = useState({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function load() {
    setError('');
    try {
      const d = await api('/admin-site-settings');
      const s = d.settings || {};
      setForm({
        schoolName: s.site_school_name?.value || DEFAULTS.schoolName,
        schoolPlace: s.site_school_place?.value || DEFAULTS.schoolPlace,
        primary: s.theme_primary?.value || DEFAULTS.primary,
        secondary: s.theme_secondary?.value || DEFAULTS.secondary,
        accent: s.theme_accent?.value || DEFAULTS.accent,
      });
      setAssets({
        logo: s.site_logo_path?.value?.path || '',
        hero_1: s.site_hero_1?.value?.path || '',
        hero_2: s.site_hero_2?.value?.path || '',
        hero_3: s.site_hero_3?.value?.path || '',
      });
    } catch (e) { setError(e.message); }
  }
  useEffect(() => { load(); }, []);

  async function save() {
    setSaving(true); setError(''); setSuccess('');
    try {
      await api('/admin-site-settings', { method: 'PATCH', body: { settings: {
        site_school_name: { value: form.schoolName },
        site_school_place: { value: form.schoolPlace },
        theme_primary: { value: form.primary },
        theme_secondary: { value: form.secondary },
        theme_accent: { value: form.accent },
        ...(assets.logo ? { site_logo_path: { path: assets.logo } } : {}),
        ...(assets.hero_1 ? { site_hero_1: { path: assets.hero_1 } } : {}),
        ...(assets.hero_2 ? { site_hero_2: { path: assets.hero_2 } } : {}),
        ...(assets.hero_3 ? { site_hero_3: { path: assets.hero_3 } } : {}),
      }}});
      document.documentElement.style.setProperty('--ink', form.primary);
      document.documentElement.style.setProperty('--accent', form.secondary);
      document.documentElement.style.setProperty('--accent-dark', form.secondary);
      document.documentElement.style.setProperty('--accent-2', form.accent);
      window.dispatchEvent(new Event('site-settings-updated'));
      setSuccess('School branding and theme saved.');
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function upload(slot, file) {
    if (!file) return;
    setUploading(slot); setError(''); setSuccess('');
    try {
      const ext = file.name.split('.').pop();
      const d = await api('/admin-site-asset-upload-url', { method: 'POST', body: { slot, file_ext: ext } });
      const { error: uploadError } = await supabase.storage.from('site-assets').uploadToSignedUrl(d.path, d.token, file);
      if (uploadError) throw uploadError;
      setAssets((a) => ({ ...a, [slot]: d.path }));
      setSuccess(`${slot === 'logo' ? 'Logo' : 'Landing image'} uploaded. Click Save to publish it.`);
    } catch (e) { setError(`Upload failed: ${e.message}`); }
    finally { setUploading(''); }
  }

  const assetCard = (slot, title, help) => (
    <div className="card branding-asset-card">
      <div className="branding-asset-preview">
        {assets[slot] ? <img src={getAssetUrl(assets[slot])} alt="Preview" /> : <div className="branding-empty">No image selected</div>}
      </div>
      <div>
        <h3>{title}</h3>
        <p className="meta">{help}</p>
        <label className="secondary branding-upload-button">
          {uploading === slot ? 'Uploading…' : 'Upload / replace image'}
          <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" hidden disabled={!!uploading} onChange={(e) => upload(slot, e.target.files[0])} />
        </label>
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
        <div><b>Live school branding</b><p className="meta">The logo and colour theme are shared by the public landing page, rankings and portal headers. Keep the logo clear and use a transparent PNG/WebP when possible.</p></div>
      </div>

      <section className="admin-settings-grid">
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

      <div className="card">
        <div className="card-section-title">🎨 Logo-inspired theme</div>
        <p className="meta">Maroon and gold follow the school emblem, while green is used as the academic/action colour.</p>
        <div className="theme-control-grid">
          <label>Primary maroon<input type="color" value={form.primary} onChange={(e) => setForm({ ...form, primary: e.target.value })} /><code>{form.primary}</code></label>
          <label>Academic green<input type="color" value={form.secondary} onChange={(e) => setForm({ ...form, secondary: e.target.value })} /><code>{form.secondary}</code></label>
          <label>Gold accent<input type="color" value={form.accent} onChange={(e) => setForm({ ...form, accent: e.target.value })} /><code>{form.accent}</code></label>
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
