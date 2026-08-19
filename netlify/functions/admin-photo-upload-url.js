const supabase = require('./utils/db');
const { requireRole, json } = require('./utils/auth');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  const auth = requireRole(event, ['super_admin']);
  if (!auth) return json(401, { error: 'Not authorized' });

  try {
    const { file_ext } = JSON.parse(event.body || '{}');
    const safeExt = (file_ext || 'jpg').replace(/[^a-z0-9]/gi, '').slice(0, 5) || 'jpg';
    const path = `admin-${Date.now()}.${safeExt}`;

    const { data, error } = await supabase.storage
      .from('student-photos')
      .createSignedUploadUrl(path);
    if (error) throw error;

    return json(200, { path, upload_url: data.signedUrl, token: data.token });
  } catch (e) {
    return json(500, { error: e.message });
  }
};
