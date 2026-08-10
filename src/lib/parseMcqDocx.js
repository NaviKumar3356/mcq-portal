// Parses raw text extracted from a Word document into MCQ question objects.
//
// Expected format per question (numbering and option letters are flexible):
//
//   1. What is the capital of France?
//   a) London
//   b) Paris
//   c) Berlin
//   d) Madrid
//   Answer: b
//
// - Question numbering can be "1.", "1)", "Q1.", etc.
// - Options can be "a)", "A.", "(a)", "a." — any of these, 2 or more per question.
// - The answer line can give a letter ("Answer: b") or the full option text
//   ("Answer: Paris") — either is matched.
// - Marks are optional: add "[2 marks]" or "Marks: 2" anywhere in the block
//   to set that question's marks; defaults to 1 if not given.
//
// Returns { questions, warnings }. `warnings` lists any question blocks that
// couldn't be fully parsed (missing options, or no detectable answer) so the
// teacher can check/fix those by hand after import — nothing is silently
// dropped without being reported except blocks with no options at all.

const QUESTION_START = /^\s*(?:Q\.?\s*)?(\d{1,3})[.)]\s+(.*)$/i;
const OPTION_LINE = /^\s*\(?([A-Da-d])\)?[.)]\s+(.*)$/;
const ANSWER_LETTER = /^\s*(?:ans(?:wer)?|correct\s*answer)\s*[:\-]?\s*\(?([A-Da-d])\)?\s*\.?\s*$/i;
const ANSWER_TEXT = /^\s*(?:ans(?:wer)?|correct\s*answer)\s*[:\-]\s*(.+)$/i;
const MARKS_TAG = /\[?\bmarks?\s*[:\-]?\s*(\d+(?:\.\d+)?)\]?/i;

export function parseMcqDocx(rawText) {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  // Group lines into one block per detected question number. Anything
  // before the first numbered line (a title, instructions, etc.) is ignored.
  const blocks = [];
  let current = null;
  for (const line of lines) {
    const m = line.match(QUESTION_START);
    if (m) {
      if (current) blocks.push(current);
      current = { firstLine: m[2] };
      current.lines = [];
    } else if (current) {
      current.lines.push(line);
    }
  }
  if (current) blocks.push(current);

  const questions = [];
  const warnings = [];

  blocks.forEach((block) => {
    const allLines = [block.firstLine, ...block.lines];
    const questionTextParts = [];
    const options = [];
    let correct_option = null;
    let marks = 1;
    let sawOption = false;

    for (const rawLine of allLines) {
      const marksMatch = rawLine.match(MARKS_TAG);
      if (marksMatch) marks = Number(marksMatch[1]);
      const line = rawLine.replace(MARKS_TAG, '').trim();
      if (!line) continue;

      const optMatch = line.match(OPTION_LINE);
      if (optMatch && options.length < 8) {
        options.push(optMatch[2].trim());
        sawOption = true;
        continue;
      }

      const letterMatch = line.match(ANSWER_LETTER);
      if (letterMatch) {
        correct_option = letterMatch[1].toUpperCase().charCodeAt(0) - 65;
        continue;
      }
      const textMatch = line.match(ANSWER_TEXT);
      if (textMatch) {
        const ansText = textMatch[1].trim().toLowerCase();
        const foundIdx = options.findIndex((o) => o.toLowerCase() === ansText);
        if (foundIdx >= 0) correct_option = foundIdx;
        continue;
      }

      if (!sawOption) {
        questionTextParts.push(line);
      }
    }

    const question_text = questionTextParts.join(' ').trim();
    const preview = (question_text || block.firstLine || '').slice(0, 60);

    if (!question_text || options.length < 2) {
      warnings.push(`Skipped a block near "${preview}…" — couldn't find at least 2 options.`);
      return;
    }

    if (correct_option === null || correct_option >= options.length) {
      warnings.push(`"${preview}…" — answer key not detected, please pick the correct option manually.`);
      correct_option = null;
    }

    while (options.length < 4) options.push(''); // pad for a consistent 4-option UI

    questions.push({ type: 'mcq', question_text, options, correct_option, marks });
  });

  if (blocks.length === 0) {
    warnings.push('No numbered questions ("1.", "2.", ...) were found in this document.');
  }

  return { questions, warnings };
}
