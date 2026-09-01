import { QUESTION_START, parseMcqBlock } from './parseMcqDocx.js';
import { parsePracticalBlock, parsePracticalDocx } from './parsePracticalDocx.js';

// Auto-detects, QUESTION BY QUESTION, whether each numbered block in an
// imported Word document is an MCQ or a practical/code-completion
// question, and parses each with the matching logic. This lets a single
// document mix both types — e.g. an MCQ paper and a practical paper
// combined into one file — and still import correctly in one go.
//
// A block counts as "practical" if it contains a standalone "Code:" line
// or mentions "Starter Code" — both are strong signals no MCQ question
// would contain. Everything else is parsed as MCQ.
//
// A document made entirely of "VARIANT n" blocks (no question numbering
// at all) is still supported as a single practical question with that
// many variants, exactly as before.

function detectLanguage(text) {
  const m = text.match(/language\s*:\s*([a-z]+)/i);
  return m && /python/i.test(m[1]) ? 'python' : 'html';
}

// Splits into numbered blocks WITHOUT trimming leading whitespace or
// dropping blank lines — unlike parseMcqDocx's splitter, this one needs to
// preserve code indentation/formatting for any block that turns out to be
// a practical question.
function splitBlocksPreserveFormatting(text) {
  const rawLines = text.split('\n');
  const blocks = [];
  let current = null;
  for (const rawLine of rawLines) {
    if (rawLine.trim() === '') {
      if (current) current.lines.push(rawLine);
      continue;
    }
    const m = rawLine.match(QUESTION_START);
    if (m) {
      if (current) blocks.push(current);
      current = { firstLine: m[2], lines: [] };
    } else if (current) {
      current.lines.push(rawLine);
    }
  }
  if (current) blocks.push(current);
  return blocks;
}

function blockLooksPractical(block) {
  const all = [block.firstLine, ...block.lines];
  return all.some((l) => /^\s*code\s*:?\s*$/i.test(l.trim())) || all.some((l) => /starter\s*code/i.test(l));
}

export function parseQuestionsDocx(rawText) {
  const text = String(rawText || '').replace(/\r\n/g, '\n');
  const language = detectLanguage(text);

  // A pool of "VARIANT n" blocks (optionally preceded by numbered MCQ
  // questions) is pulled out and handled by the practical variant parser;
  // everything before it is split into numbered blocks as usual.
  const variantIdx = text.search(/VARIANT\s*\d+/i);
  let mainText = text;
  let variantResult = null;
  if (variantIdx >= 0) {
    mainText = text.slice(0, variantIdx);
    variantResult = parsePracticalDocx(text.slice(variantIdx));
  }

  const blocks = splitBlocksPreserveFormatting(mainText);
  const questions = [];
  const warnings = [];

  blocks.forEach((block, bi) => {
    if (blockLooksPractical(block)) {
      const { question, warnings: w } = parsePracticalBlock(block, `Question ${bi + 1}`, language);
      warnings.push(...w);
      questions.push(question);
    } else {
      const { question, warnings: w } = parseMcqBlock(block);
      warnings.push(...w);
      if (question) questions.push(question);
    }
  });

  if (variantResult) {
    questions.push(...variantResult.questions);
    warnings.push(...variantResult.warnings);
  }

  if (questions.length === 0) {
    warnings.push('No questions could be detected in this document.');
  }

  return { questions, warnings };
}
