const supabase = require('./utils/db');
const { requireRole, json } = require('./utils/auth');

const KEYS = new Set([
  'site_logo_path','site_hero_1','site_hero_2','site_hero_3','site_school_name','site_school_place',
  'theme_primary','theme_secondary','theme_accent'
]);

exports.handler = async (event) => {
  const auth = requireRole(event, ['super_admin']);
  if (!auth) return json(401, { error: 'Not authorized' });
  try {
    if (event.httpMethod === 'GET') {
      const { data, error } = await supabase.from('app_settings').select('key,value,updated_at').in('key', [...KEYS]);
      if (error) throw error;
      const settings = {};
      (data || []).forEach((r) => { settings[r.key] = r; });
      return json(200, { settings });
    }

    if (event.httpMethod === 'PATCH') {
      const body = JSON.parse(event.body || '{}');
      const updates = body.settings || {};
      for (const [key, value] of Object.entries(updates)) {
        if (!KEYS.has(key)) return json(400, { error: `Unsupported setting: ${key}` });
        if (typeof value !== 'object' || value === null) return json(400, { error: `Invalid value for ${key}` });
      }
      const rows = Object.entries(updates).map(([key, value]) => ({ key, value, updated_at: new Date().toISOString() }));
      if (rows.length) {
        const { error } = await supabase.from('app_settings').upsert(rows, { onConflict: 'key' });
        if (error) throw error;
      }
      return json(200, { ok: true });
    }

    return json(405, { error: 'Method not allowed' });
  } catch (e) {
    return json(500, { error: e.message });
  }
};
