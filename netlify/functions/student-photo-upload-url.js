const supabase = require('./utils/db');
const { requireRole, json } = require('./utils/auth');

// Returns a short-lived signed upload URL for a student's profile photo,
// the same pattern as upload-url.js for answer sheets, but targeting the
// PUBLIC 'student-photos' bucket instead of the private 'answer-sheets'
// one. After the browser uploads directly to this URL, it must call
// student-photo-set.js to persist the resulting path onto the student's
// row.
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  const auth = requireRole(event, ['teacher', 'super_admin']);
  if (!auth) return json(401, { error: 'Not authorized' });

  try {
    const { student_id, file_ext } = JSON.parse(event.body || '{}');
    if (!student_id) return json(400, { error: 'student_id is required' });

    if (auth.role === 'teacher') {
      const { data: student } = await supabase.from('students').select('class').eq('id', student_id).maybeSingle();
      if (!student) return json(404, { error: 'Student not found' });
      if (!(auth.classes || []).includes(student.class)) {
        return json(403, { error: 'You are not assigned to that class' });
      }
    }

    const safeExt = (file_ext || 'jpg').replace(/[^a-z0-9]/gi, '').slice(0, 5) || 'jpg';
    const path = `${student_id}-${Date.now()}.${safeExt}`;

    const { data, error } = await supabase.storage
      .from('student-photos')
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
