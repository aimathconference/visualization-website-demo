// The automated check for a submission (DEMO_PLAN.md section 8).
// .github/workflows/check.yml runs THIS file from the base branch, so a pull request can't change the rules,
// and only reads the pull request's files as data; their code is parsed, never executed.
//
// usage: node check-entries.mjs <pr-checkout-dir> <changed-files.tsv> <author-association>
//   changed-files.tsv: one "<status>\t<path>" per line (status: added, modified, removed, renamed)
// Prints {ok, errors: [{file, line, message}], entries: [{slug, title}]} as JSON.

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { guard, COLORS_MISSING } from './guard.js';

const LICENSES = ['MIT', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', 'GPL-3.0-or-later', 'MPL-2.0', 'CC0-1.0'];
const ENTRY_RE = /^entries\/([a-z0-9][a-z0-9-]{0,47})\.(js|md)$/;

const [dir, listFile, association] = process.argv.slice(2);
// Maintainers (organization members) may change the repo's own files and remove entries; submitters may not.
const trusted = ['OWNER', 'MEMBER'].includes(association);
const errors = [], entries = [];
const changes = readFileSync(listFile, 'utf8').split('\n').filter(Boolean).map(l => l.split('\t'));

if (!changes.length) errors.push({ file: '', line: null, message: 'This pull request changes no files.' });

for (const [status, path] of changes) {
  const m = path.match(ENTRY_RE);
  if (!m) {
    if (!trusted) errors.push({ file: path, line: null, message: 'A submission can only add or change files named like entries/my-visualization.js (lowercase letters, numbers and dashes), plus an optional entries/my-visualization.md.' });
    continue;
  }
  if (status === 'removed') {
    if (!trusted) errors.push({ file: path, line: null, message: "Submissions can't remove entries. Ask a moderator to flag it for removal instead." });
    continue;
  }
  const file = join(dir, path);
  if (!existsSync(file)) { errors.push({ file: path, line: null, message: 'File not found in the pull request.' }); continue; }
  const text = readFileSync(file, 'utf8');
  if (m[2] === 'md') {
    if (text.length > 10_000) errors.push({ file: path, line: null, message: 'Explanations are limited to 10,000 characters.' });
    continue;
  }
  try {
    const { meta } = guard(text);
    if (!meta.title) errors.push({ file: path, line: null, message: "Add a title to the exported object, e.g. export default { title: 'My visualization', ... }." });
    if (!meta.colors) errors.push({ file: path, line: null, message: COLORS_MISSING });
    if (meta.license && !LICENSES.includes(meta.license)) errors.push({ file: path, line: null, message: `License must be one of: ${LICENSES.join(', ')}.` });
    if (meta.tags && meta.tags.length > 4) errors.push({ file: path, line: null, message: 'Use at most 4 tags.' });
    entries.push({ slug: m[1], title: meta.title ?? null });
  } catch (e) {
    errors.push({ file: path, line: e.line ?? null, message: e.message });
  }
}

console.log(JSON.stringify({ ok: errors.length === 0, errors, entries }, null, 2));
