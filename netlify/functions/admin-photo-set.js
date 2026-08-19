const supabase = require('./utils/db');
const { requireRole, json } = require('./utils/auth');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  const auth = requireRole(event, ['super_admin']);
  if (!auth) return json(401, { error: 'Not authorized' });

  try {
    const { photo_path } = JSON.parse(event.body || '{}');
    if (!photo_path) return json(400, { error: 'photo_path is required' });

    const { error } = await supabase
      .from('app_settings')
      .upsert({ key: 'admin_photo_path', value: { photo_path }, updated_at: new Date().toISOString() });
    if (error) throw error;

    return json(200, { ok: true });
  } catch (e) {
    return json(500, { error: e.message });
  }
};
