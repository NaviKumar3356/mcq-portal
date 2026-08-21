const supabase = require('./utils/db');
const { requireRole, json } = require('./utils/auth');

const ALLOWED = new Set(['logo','hero_1','hero_2','hero_3']);
const EXTENSIONS = new Set(['jpg','jpeg','png','webp','svg']);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
  const auth = requireRole(event, ['super_admin']);
  if (!auth) return json(401, { error: 'Not authorized' });
  try {
    const { slot, file_ext } = JSON.parse(event.body || '{}');
    if (!ALLOWED.has(slot)) return json(400, { error: 'Invalid asset slot' });
    const ext = String(file_ext || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!EXTENSIONS.has(ext)) return json(400, { error: 'Unsupported image format' });
    const path = `${slot}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { data, error } = await supabase.storage.from('site-assets').createSignedUploadUrl(path);
    if (error) throw error;
    return json(200, { path, token: data.token });
  } catch (e) {
    return json(500, { error: e.message });
  }
};
