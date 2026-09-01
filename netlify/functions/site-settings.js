const supabase = require('./utils/db');
const { json } = require('./utils/auth');

exports.handler = async () => {
  try {
    const { data, error } = await supabase.from('app_settings').select('key,value').in('key', [
      'site_logo_path','site_hero_1','site_hero_2','site_hero_3','default_avatar','site_school_name','site_school_place',
      'theme_primary','theme_secondary','theme_accent','ui_card_density','ui_corner_style'
    ]);
    if (error) throw error;
    const settings = {};
    (data || []).forEach((row) => { settings[row.key] = row.value; });
    const base = process.env.SUPABASE_URL;
    const publicUrl = (path) => path ? `${base}/storage/v1/object/public/site-assets/${path}` : null;
    return json(200, {
      logo_url: publicUrl(settings.site_logo_path?.path),
      default_avatar_url: publicUrl(settings.default_avatar?.path),
      hero_1_url: publicUrl(settings.site_hero_1?.path),
      hero_2_url: publicUrl(settings.site_hero_2?.path),
      hero_3_url: publicUrl(settings.site_hero_3?.path),
      school_name: settings.site_school_name?.value || null,
      school_place: settings.site_school_place?.value || null,
      theme_primary: settings.theme_primary?.value || null,
      theme_secondary: settings.theme_secondary?.value || null,
      theme_accent: settings.theme_accent?.value || null,
      card_density: settings.ui_card_density?.value || null,
      corner_style: settings.ui_corner_style?.value || null,
    });
  } catch (e) {
    return json(500, { error: e.message });
  }
};
