const supabase = require('./utils/db');
const { requireRole, json } = require('./utils/auth');

// Deletes one student's submission (their answers + any uploaded answer-copy
// files stay referenced only in Storage — deleting the DB row does not
// delete the file bytes; see README for a periodic storage cleanup note).
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  const auth = requireRole(event, ['teacher', 'super_admin']);
  if (!auth) return json(401, { error: 'Not authorized' });

  try {
    const { submission_id } = JSON.parse(event.body || '{}');
    if (!submission_id) return json(400, { error: 'submission_id is required' });

    const { data: submission } = await supabase
      .from('submissions')
      .select('id, tests(class, subject)')
      .eq('id', submission_id)
      .maybeSingle();
    if (!submission) return json(404, { error: 'Submission not found' });

    if (auth.role === 'teacher') {
      const t = submission.tests;
      if (!(auth.classes || []).includes(t.class) || !(auth.subjects || []).includes(t.subject)) {
        return json(403, { error: 'You are not assigned to this class/subject' });
      }
    }

    const { error } = await supabase.from('submissions').delete().eq('id', submission_id);
    if (error) throw error;

    return json(200, { ok: true });
  } catch (e) {
    return json(500, { error: e.message });
  }
};
