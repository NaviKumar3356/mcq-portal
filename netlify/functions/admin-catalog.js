const supabase = require('./utils/db');
const { requireRole, json } = require('./utils/auth');

const DEFAULTS = {
  classes: ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'],
  subjects: ['English','Hindi','Sanskrit','Mathematics','EVS','Computer','Science','SST','CT & AI'],
  sections: ['A','B','C'],
};
const KEYS = { classes: 'school_classes', subjects: 'school_subjects', sections: 'school_sections' };

function cleanList(value, fallback) {
  if (!Array.isArray(value)) return fallback;
  const seen = new Set();
  return value.map(v => String(v || '').trim()).filter(Boolean).filter(v => {
    const key = v.toLowerCase(); if (seen.has(key)) return false; seen.add(key); return true;
  }).slice(0, 100);
}

exports.handler = async (event) => {
  const auth = requireRole(event, ['super_admin']);
  if (!auth) return json(401, { error: 'Not authorized' });
  try {
    if (event.httpMethod === 'GET') {
      const { data, error } = await supabase.from('app_settings').select('key,value').in('key', Object.values(KEYS));
      if (error) throw error;
      const out = { ...DEFAULTS };
      (data || []).forEach(r => {
        const k = Object.keys(KEYS).find(x => KEYS[x] === r.key);
        if (k) out[k] = cleanList(r.value?.items, DEFAULTS[k]);
      });
      return json(200, out);
    }
    if (event.httpMethod === 'PATCH') {
      const body = JSON.parse(event.body || '{}');
      const updates = [];
      for (const k of Object.keys(DEFAULTS)) {
        if (body[k] === undefined) continue;
        const items = cleanList(body[k], DEFAULTS[k]);
        if (!items.length) return json(400, { error: `${k} cannot be empty` });
        updates.push({ key: KEYS[k], value: { items }, updated_at: new Date().toISOString() });
      }
      if (!updates.length) return json(400, { error: 'No catalog changes supplied' });
      const { error } = await supabase.from('app_settings').upsert(updates, { onConflict: 'key' });
      if (error) throw error;
      return json(200, { ok: true });
    }
    return json(405, { error: 'Method not allowed' });
  } catch (e) { return json(500, { error: e.message }); }
};
