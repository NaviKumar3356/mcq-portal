const supabase = require('./utils/db');
const { requireRole, json } = require('./utils/auth');

// Returns small bits of admin-only profile state (currently just the
// super admin's own avatar photo) that don't fit anywhere else since
// the super admin has no row of their own in the database.
exports.handler = async (event) => {
  const auth = requireRole(event, ['super_admin']);
  if (!auth) return json(401, { error: 'Not authorized' });

  try {
    const { data } = await supabase.from('app_settings').select('value').eq('key', 'admin_photo_path').maybeSingle();
    return json(200, { photo_path: data?.value?.photo_path || null });
  } catch (e) {
    return json(500, { error: e.message });
  }
};
