const supabase = require('./utils/db');
const { requireRole, json } = require('./utils/auth');
const ALLOWED_EXTENSIONS = new Set(['jpg','jpeg','png','webp','gif','pdf','doc','docx','xls','xlsx','ppt','pptx','zip']);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
  const auth = requireRole(event, ['teacher', 'super_admin']);
  if (!auth) return json(401, { error: 'Not authorized' });
  try {
    const { test_id, question_id, file_ext } = JSON.parse(event.body || '{}');
    if (!test_id || !question_id) return json(400, { error: 'test_id and question_id are required' });
    const { data: test } = await supabase.from('tests').select('id,class,subject').eq('id', test_id).maybeSingle();
    if (!test) return json(404, { error: 'Test not found' });
    if (auth.role === 'teacher' && (!(auth.classes || []).includes(test.class) || !(auth.subjects || []).includes(test.subject))) {
      return json(403, { error: 'You are not assigned to this class/subject' });
    }
    const safeExt = String(file_ext || 'bin').replace(/[^a-z0-9]/gi, '').slice(0, 5).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(safeExt)) return json(400, { error: 'Unsupported resource file type' });
    const path = `${test_id}/question-${question_id}-${Date.now()}.${safeExt}`;
    const { data, error } = await supabase.storage.from('question-resources').createSignedUploadUrl(path);
    if (error) throw error;
    return json(200, { path, token: data.token, upload_url: data.signedUrl });
  } catch (e) { return json(500, { error: e.message }); }
};
