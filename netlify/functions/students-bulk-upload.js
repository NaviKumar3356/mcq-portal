const supabase = require('./utils/db');
const { requireRole, json } = require('./utils/auth');
const { getCatalog } = require('./utils/catalog');

// Body: { rows: [{ srno, roll_number, name, class, dob }, ...] }
// srno is optional (your own record/attendance-sheet numbering — not used
// for login, which is still class + roll_number + dob).
// Upserts on (roll_number, class): existing students are updated (name/dob/srno),
// new ones are inserted. Returns a per-row report so the teacher can see
// exactly what happened, including which rows were rejected and why.
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  const auth = requireRole(event, ['teacher', 'super_admin']);
  if (!auth) return json(401, { error: 'Not authorized' });

  try {
    const { rows } = JSON.parse(event.body || '{}');
    if (!Array.isArray(rows) || rows.length === 0) {
      return json(400, { error: 'rows[] is required' });
    }
    if (rows.length > 2000) {
      return json(400, { error: 'Please upload 2000 rows or fewer at a time' });
    }

    const catalog = await getCatalog();
    const allowedClasses = auth.role === 'super_admin' ? catalog.classes : (auth.classes || []);

    const results = [];
    for (const [i, raw] of rows.entries()) {
      const roll_number = String(raw.roll_number || '').trim();
      const name = String(raw.name || '').trim();
      const klass = String(raw.class || '').trim();
      const dob = String(raw.dob || '').trim();
      const section = String(raw.section || 'A').trim();
      const srnoRaw = String(raw.srno ?? '').trim();
      const rowNum = i + 1;

      if (!roll_number || !name || !klass || !dob) {
        results.push({ row: rowNum, ok: false, error: 'Missing roll_number, name, class or dob' });
        continue;
      }
      if (!catalog.classes.includes(klass)) {
        results.push({ row: rowNum, ok: false, error: `Unknown class "${klass}"` });
        continue;
      }
      if (!allowedClasses.includes(klass)) {
        results.push({ row: rowNum, ok: false, error: `You are not assigned to class ${klass}` });
        continue;
      }
      if (section && !catalog.sections.includes(section)) { results.push({ row: rowNum, ok: false, error: `Unknown section "${section}"` }); continue; }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
        results.push({ row: rowNum, ok: false, error: 'dob must be YYYY-MM-DD' });
        continue;
      }
      let srno = null;
      if (srnoRaw !== '') {
        srno = srnoRaw;
      }

      const { error } = await supabase
        .from('students')
        .upsert(
          {
            srno,
            roll_number,
            name,
            class: klass,
            section: section || 'A',
            dob,
            added_by: auth.role === 'teacher' ? auth.teacher_id : null,
          },
          { onConflict: 'roll_number,class' }
        );

      if (error) {
        results.push({ row: rowNum, ok: false, error: error.message });
      } else {
        results.push({ row: rowNum, ok: true, roll_number, class: klass, name });
      }
    }

    const succeeded = results.filter((r) => r.ok).length;
    return json(200, { succeeded, failed: results.length - succeeded, results });
  } catch (e) {
    return json(500, { error: e.message });
  }
};