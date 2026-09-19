// Conservative, deterministic HTML grading helper.
// It does NOT execute submitted code. It checks required tags/attributes/text
// from the teacher's model answer and returns an assisted score that a teacher
// can review/override. This keeps grading safe in a serverless environment.

function normalize(s) {
  return String(s || '')
    .replace(/\s+/g, ' ')
    .replace(/>\s+</g, '><')
    .trim()
    .toLowerCase();
}

function extractChecks(reference) {
  const src = String(reference || '');
  const checks = [];
  const seen = new Set();
  const add = (kind, value) => {
    const key = `${kind}:${normalize(value)}`;
    if (!value || seen.has(key)) return;
    seen.add(key);
    checks.push({ kind, value: String(value) });
  };

  for (const m of src.matchAll(/<([a-z][a-z0-9-]*)\b/gi)) {
    const tag = m[1].toLowerCase();
    if (!['html','head','body','meta','title'].includes(tag)) add('tag', `<${tag}`);
  }
  for (const m of src.matchAll(/\b([a-z_:][-a-z0-9_:.]*)\s*=\s*(["'])(.*?)\2/gi)) {
    const attr = m[1].toLowerCase();
    const value = m[3].trim();
    if (value) add('attr', `${attr}="${value}"`);
  }

  // Visible text snippets, useful for headings/paragraphs. Avoid tiny HTML
  // boilerplate words and scripts/styles.
  const withoutBlocks = src.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '');
  for (const m of withoutBlocks.matchAll(/>([^<>]{3,80})</g)) {
    const text = m[1].replace(/\s+/g, ' ').trim();
    if (text && !/^doctype$/i.test(text)) add('text', text);
  }
  return checks;
}

function gradeHtml(student, reference, maxMarks) {
  const ref = normalize(reference);
  const ans = normalize(student);
  const marks = Number(maxMarks) || 0;
  if (!ans || !ref || marks <= 0) return { marks_awarded: 0, matched: 0, total: 0, percent: 0 };

  const checks = extractChecks(reference);
  if (checks.length === 0) {
    const exact = ans === ref || ans.includes(ref) || ref.includes(ans);
    return { marks_awarded: exact ? marks : 0, matched: exact ? 1 : 0, total: 1, percent: exact ? 100 : 0 };
  }

  let matched = 0;
  for (const c of checks) {
    const needle = normalize(c.value);
    if (c.kind === 'tag') {
      if (ans.includes(needle)) matched++;
    } else if (c.kind === 'attr') {
      const attr = needle.replace(/&quot;/g, '"');
      if (ans.includes(attr)) matched++;
      else {
        const bare = attr.replace(/\s*=\s*/g, '=').replace(/"/g, '');
        if (ans.includes(bare)) matched++;
      }
    } else if (c.kind === 'text') {
      if (ans.includes(needle)) matched++;
    }
  }

  const percent = Math.round((matched / checks.length) * 100);
  const raw = marks * matched / checks.length;
  const marksAwarded = Math.round(raw * 2) / 2;
  return { marks_awarded: Math.min(marks, marksAwarded), matched, total: checks.length, percent };
}

module.exports = { gradeHtml, extractChecks };
