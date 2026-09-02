const supabase = require('./utils/db');
const { json } = require('./utils/auth');
const { requireStudentSession } = require('./utils/student-session');

const ALLOWED_EXTENSIONS = new Set(['jpg','jpeg','png','webp','gif','pdf','doc','docx','xls','xlsx','ppt','pptx','zip']);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  const auth = await requireStudentSession(event);
  if (!auth) return json(401, { error: 'Your student session has expired or was signed out.' });

  try {
    const { test_id, question_id, file_ext } = JSON.parse(event.body || '{}');
    if (!test_id || !question_id) return json(400, { error: 'test_id and question_id are required' });

    const ext = String(file_ext || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5);
    const safeExt = ALLOWED_EXTENSIONS.has(ext) ? ext : null;
    if (!safeExt) return json(400, { error: 'This file type is not allowed for an answer upload.' });

    const { data: test, error: testError } = await supabase
      .from('tests')
      .select('id, class, status, start_at, end_at')
      .eq('id', test_id)
      .maybeSingle();
    if (testError) throw testError;
    if (!test) return json(404, { error: 'Test not found' });
    if (test.class !== auth.class) return json(403, { error: 'This test is not for your class' });

    const { data: question, error: qError } = await supabase
      .from('questions')
      .select('id, test_id, type')
      .eq('id', question_id)
      .eq('test_id', test_id)
      .maybeSingle();
    if (qError) throw qError;
    if (!question) return json(404, { error: 'Question not found' });
    if (question.type !== 'upload') return json(400, { error: 'This question does not accept file uploads.' });

    const now = new Date();
    if (test.start_at && now < new Date(test.start_at)) return json(403, { error: 'This test has not opened yet' });

    const { data: reopen } = await supabase
      .from('test_reopens')
      .select('reopened_at, reopen_minutes')
      .eq('test_id', test_id)
      .eq('student_id', auth.student_id)
      .maybeSingle();
    let effectiveEnd = test.end_at ? new Date(test.end_at) : null;
    if (reopen) {
      const minutes = Number(reopen.reopen_minutes) > 0 ? Number(reopen.reopen_minutes) : 30;
      effectiveEnd = new Date(new Date(reopen.reopened_at).getTime() + minutes * 60000);
    }
    if (effectiveEnd && now > effectiveEnd) return json(403, { error: 'This test has closed' });

    const { data: already } = await supabase
      .from('submissions')
      .select('id')
      .eq('test_id', test_id)
      .eq('student_id', auth.student_id)
      .maybeSingle();
    if (already) return json(403, { error: 'This test has already been submitted' });

    const path = `${test_id}/${auth.student_id}/${question_id}-${Date.now()}.${safeExt}`;
    const { data, error } = await supabase.storage.from('answer-sheets').createSignedUploadUrl(path);
    if (error) throw error;

    return json(200, { path, upload_url: data.signedUrl, token: data.token });
  } catch (e) {
    return json(500, { error: 'Could not prepare the answer upload' });
  }
};
