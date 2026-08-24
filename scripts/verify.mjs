import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const errors = [];

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', 'dist'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

const srcFiles = walk(path.join(root, 'src')).filter(f => /\.(jsx?|css)$/.test(f));
for (const file of srcFiles) {
  const source = fs.readFileSync(file, 'utf8');
  const importRe = /(?:from\s+|import\s*\()(['"])(\.\.?\/[^'"]+)\1/g;
  let m;
  while ((m = importRe.exec(source))) {
    const ref = m[2];
    const base = path.resolve(path.dirname(file), ref);
    const candidates = [base, `${base}.js`, `${base}.jsx`, `${base}.css`, path.join(base, 'index.js'), path.join(base, 'index.jsx')];
    if (!candidates.some(fs.existsSync)) errors.push(`${path.relative(root, file)} -> missing local import ${ref}`);
  }
}

const app = fs.readFileSync(path.join(root, 'src/App.jsx'), 'utf8');
const routeRefs = [...app.matchAll(/import\s+([A-Za-z0-9_]+)\s+from\s+['"](\.\/[^'"]+)['"]/g)];
for (const [, name, ref] of routeRefs) {
  const base = path.resolve(root, 'src', ref.slice(2));
  if (![base, `${base}.js`, `${base}.jsx`].some(fs.existsSync)) errors.push(`App import ${name} -> ${ref} is missing`);
}

const grade = fs.readFileSync(path.join(root, 'src/pages/GradeSubmissions.jsx'), 'utf8');
for (const token of ['function MergeControls', 'async function exportExcel', 'async function exportPDF', 'async function exportImage']) {
  if ((grade.match(new RegExp(token.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&'), 'g')) || []).length !== 1) errors.push(`GradeSubmissions expected exactly one ${token}`);
}

try {
  const functions = walk(path.join(root, 'netlify/functions')).filter(f => f.endsWith('.js'));
  for (const file of functions) execFileSync(process.execPath, ['--check', file], { stdio: 'ignore' });
} catch {
  errors.push('One or more Netlify Functions failed Node syntax validation');
}

if (errors.length) {
  console.error('Verification failed');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('MCQ Portal verification passed.');
console.log(`Checked ${srcFiles.length} source files, App imports/routes, GradeSubmissions merge/export declarations, and Netlify Function syntax.`);
