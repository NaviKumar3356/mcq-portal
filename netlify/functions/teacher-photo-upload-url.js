const supabase = require('./utils/db');
const { getAuth, json } = require('./utils/auth');

// A teacher's OWN self-service photo upload — different from
// student-photo-upload-url.js (which is a teacher/admin uploading a
// PHOTO OF A STUDENT). This one is "log in as yourself, set your own
// avatar", so it only checks that the caller IS a teacher, not that
// they manage anyone.
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  const auth = getAuth(event);
  if (!auth || auth.role !== 'teacher') return json(401, { error: 'Not authorized' });

  try {
    const { file_ext } = JSON.parse(event.body || '{}');
    const safeExt = (file_ext || 'jpg').replace(/[^a-z0-9]/gi, '').slice(0, 5) || 'jpg';
    const path = `teacher-${auth.teacher_id}-${Date.now()}.${safeExt}`;

    const { data, error } = await supabase.storage
      .from('student-photos') // shared public avatar bucket
      .createSignedUploadUrl(path);
    if (error) throw error;

    return json(200, { path, upload_url: data.signedUrl, token: data.token });
  } catch (e) {
    return json(500, { error: e.message });
  }
};
