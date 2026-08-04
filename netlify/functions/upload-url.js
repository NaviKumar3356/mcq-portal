const supabase = require('./utils/db');
const { getAuth, json } = require('./utils/auth');

exports.handler = async (event) => {
  const auth = getAuth(event);
  if (!auth || auth.role !== 'student') return json(401, { error: 'Not logged in' });

  try {
    const { test_id, question_id, file_ext } = JSON.parse(event.body || '{}');
    if (!test_id || !question_id) return json(400, { error: 'test_id and question_id are required' });

    const safeExt = (file_ext || 'jpg').replace(/[^a-z0-9]/gi, '').slice(0, 5) || 'jpg';
    const path = `${test_id}/${auth.student_id}/${question_id}-${Date.now()}.${safeExt}`;

    const { data, error } = await supabase.storage
      .from('answer-sheets')
      .createSignedUploadUrl(path);

    if (error) throw error;

    return json(200, {
      path,
      upload_url: data.signedUrl,
      token: data.token,
    });
  } catch (e) {
    return json(500, { error: e.message });
  }
};
