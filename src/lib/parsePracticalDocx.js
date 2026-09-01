// Parses raw text extracted from a Word document into PRACTICAL (code
// completion) question objects — the counterpart to parseMcqDocx.js for
// the "practical" question type.
//
// Two source formats are recognised:
//
// FORMAT A — a single practical question with a pool of variants, e.g.:
//
//   Language: HTML
//   VARIANT 1
//   Problem Statement (10 Marks)
//   Create a webpage titled "School Achievement"...
//   Starter Code – Complete the blanks
//   <!DOCTYPE html>
//   ...
//   VARIANT 2
//   ...
//
//   Every "VARIANT N" block becomes one entry in that question's variant
//   pool (matching the portal's existing round-robin variant model), so
//   this produces exactly ONE practical question with N variants.
//
// FORMAT B — one or more independent numbered practical questions, e.g.:
//
//   1. Complete the following HTML program for a School Achievement
//   webpage. Fill every blank so that...
//
//   Code:
//   <!DOCTYPE html>
//   ...
//
//   Answer: collapse, 16px, red, href, href  [10 marks]
//
//   2. Complete the following HTML program for a Science Club webpage...
//
//   Each numbered block becomes its OWN practical question with a single
//   variant. A trailing "Answer: ..." line (if present) is never stored
//   or shown to students — practical questions are always graded
//   manually — but it's surfaced back as a warning so the teacher can
//   note it down for reference while grading.
//
// Returns { questions, warnings }, in the same shape produced by
// parseMcqDocx.js, so callers can merge the two result sets directly
// into a test's questions[] array.

function detectLanguage(text) {
  const m = text.match(/language\s*:\s*([a-z]+)/i);
  if (m && /python/i.test(m[1])) return 'python';
  return 'html';
}

function cleanCode(lines) {
  // Trim leading/trailing blank lines but keep internal blank lines and
  // indentation intact — this is code, whitespace matters for readability.
  const start = lines.findIndex((l) => l.trim() !== '');
  if (start === -1) return '';
  let end = lines.length - 1;
  while (end >= start && lines[end].trim() === '') end--;
  return lines.slice(start, end + 1).join('\n');
}

function parseVariantFormat(text) {
  const warnings = [];
  const language = detectLanguage(text);

  const markers = [...text.matchAll(/VARIANT\s*\d+/gi)];
  if (markers.length === 0) return { questions: [], warnings: ['No "VARIANT" blocks were found in this document.'] };

  const bounds = markers.map((m) => m.index);
  bounds.push(text.length);

  const variants = [];
  let marks = 10;

  for (let i = 0; i < bounds.length - 1; i++) {
    const segment = text.slice(bounds[i], bounds[i + 1]);
    const lines = segment.split('\n');
    const variantLabel = i + 1;

    const marksMatch = segment.match(/\((\d+(?:\.\d+)?)\s*marks?\)/i);
    if (marksMatch) marks = Number(marksMatch[1]);

    const starterIdx = lines.findIndex((l) => /starter\s*code/i.test(l));
    const psIdx = lines.findIndex((l) => /problem\s*statement/i.test(l));

    let descLines;
    let codeLines;
    if (starterIdx >= 0) {
      const descStart = psIdx >= 0 ? psIdx + 1 : 1;
      descLines = lines.slice(descStart, starterIdx);
      codeLines = lines.slice(starterIdx + 1);
    } else {
      descLines = lines.slice(psIdx >= 0 ? psIdx + 1 : 1);
      codeLines = [];
      warnings.push(`Variant ${variantLabel}: no "Starter Code" section found — add the code manually.`);
    }

    const question_text = descLines.join(' ').replace(/\s+/g, ' ').trim();
    const starter_code = cleanCode(codeLines);

    if (!question_text) {
      warnings.push(`Variant ${variantLabel}: couldn't detect a problem statement — please fill it in.`);
    }
    if (starterIdx >= 0 && !starter_code) {
      warnings.push(`Variant ${variantLabel}: the starter code block looks empty — please check it.`);
    }
    if (!/_{3,}/.test(starter_code) && starter_code) {
      warnings.push(`Variant ${variantLabel}: no blanks ("________") detected in the code — double check this is a fill-in-the-blank exercise.`);
    }

    variants.push({ question_text, starter_code });
  }

  const question = {
    type: 'practical',
    question_text: '',
    marks,
    language,
    variants,
  };

  return { questions: [question], warnings };
}

// Parses a single already-split numbered block (see splitNumberedBlocks in
// parseMcqDocx.js) as ONE practical question with a single variant.
// `label` is used in warning messages (e.g. "Question 3").
export function parsePracticalBlock(block, label, language) {
  const warnings = [];
  const allLines = [block.firstLine, ...block.lines];

  const codeIdx = allLines.findIndex((l) => /^\s*code\s*:?\s*$/i.test(l.trim()));

  let answerIdx = -1;
  let answerText = '';
  for (let i = allLines.length - 1; i >= 0; i--) {
    const am = allLines[i].match(/^\s*answer\s*:\s*(.*)$/i);
    if (am) {
      answerIdx = i;
      answerText = am[1];
      break;
    }
  }

  const joined = allLines.join(' ');
  // Accepts both "[10 marks]" / "10 marks" (digits first) and
  // "marks: 10" / "marks 10" (word first) — teachers write either way.
  const marksMatch =
    joined.match(/\[?\s*(\d+(?:\.\d+)?)\s*marks?\s*\]?/i) ||
    joined.match(/\bmarks?\s*[:\-]?\s*(\d+(?:\.\d+)?)/i);
  const marks = marksMatch ? Number(marksMatch[1]) : 1;

  let descLines;
  let codeLines;
  if (codeIdx >= 0) {
    descLines = allLines.slice(0, codeIdx);
    const codeEnd = answerIdx >= 0 ? answerIdx : allLines.length;
    codeLines = allLines.slice(codeIdx + 1, codeEnd);
  } else {
    descLines = [allLines[0]];
    codeLines = [];
    warnings.push(`${label}: no "Code:" section found — imported with the description only, please add starter code manually.`);
  }

  const question_text = descLines
    .join(' ')
    .replace(/\[?\s*\d+(?:\.\d+)?\s*marks?\s*\]?/gi, '')
    .replace(/\bmarks?\s*[:\-]?\s*\d+(?:\.\d+)?/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  const starter_code = cleanCode(codeLines);

  if (codeIdx >= 0 && !starter_code) {
    warnings.push(`${label} ("${question_text.slice(0, 60)}…") has an empty code block.`);
  }
  if (answerIdx === -1) {
    warnings.push(`${label}: no "Answer:" line detected. Practical questions are graded manually, so this is just a heads-up — nothing to fix.`);
  } else if (answerText.trim()) {
    warnings.push(`${label}: reference answer found — "${answerText.trim()}". This is NOT stored or shown to students (practical answers are always graded manually); note it down yourself if you'll need it while grading.`);
  }

  const question = {
    type: 'practical',
    question_text: '',
    marks,
    language,
    variants: [{ question_text, starter_code }],
  };

  return { question, warnings };
}

function parseNumberedFormat(text) {
  const language = detectLanguage(text);
  // Local import avoided (no circular dep): duplicate the tiny splitter
  // inline so this file still works standalone.
  const QUESTION_START = /^\s*(?:Q\.?\s*)?(\d{1,3})[.)]\s+(.*)$/i;
  const lines = text.split('\n');
  const blocks = [];
  let current = null;
  for (const line of lines) {
    const m = line.match(QUESTION_START);
    if (m) {
      if (current) blocks.push(current);
      current = { firstLine: m[2], lines: [] };
    } else if (current) {
      current.lines.push(line);
    }
  }
  if (current) blocks.push(current);

  if (blocks.length === 0) {
    return { questions: [], warnings: ['No numbered questions ("1.", "2.", ...) were found in this document.'] };
  }

  const questions = [];
  const warnings = [];
  blocks.forEach((block, bi) => {
    const { question, warnings: w } = parsePracticalBlock(block, `Question ${bi + 1}`, language);
    warnings.push(...w);
    questions.push(question);
  });

  return { questions, warnings };
}

export function parsePracticalDocx(rawText) {
  const text = String(rawText || '').replace(/\r\n/g, '\n');
  if (/VARIANT\s*\d+/i.test(text)) {
    return parseVariantFormat(text);
  }
  return parseNumberedFormat(text);
}
