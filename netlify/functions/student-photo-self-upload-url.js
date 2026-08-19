const supabase = require('./utils/db');
const { getAuth, json } = require('./utils/auth');

// A STUDENT setting their own photo (different from
// student-photo-upload-url.js, which is a teacher/admin setting a photo
// ON BEHALF OF a student from the Manage Students screen).
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  const auth = getAuth(event);
  if (!auth || auth.role !== 'student') return json(401, { error: 'Not logged in' });

  try {
    const { file_ext } = JSON.parse(event.body || '{}');
    const safeExt = (file_ext || 'jpg').replace(/[^a-z0-9]/gi, '').slice(0, 5) || 'jpg';
    const path = `${auth.student_id}-${Date.now()}.${safeExt}`;

    const { data, error } = await supabase.storage
      .from('student-photos')
      .createSignedUploadUrl(path);
    if (error) throw error;

    return json(200, { path, upload_url: data.signedUrl, token: data.token });
  } catch (e) {
    return json(500, { error: e.message });
  }
};
