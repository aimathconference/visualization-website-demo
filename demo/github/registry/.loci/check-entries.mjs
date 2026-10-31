// The automated check for a submission (DEMO_PLAN.md section 8; docs/review-pipeline.md section 2).
// .github/workflows/check.yml runs THIS file from the base branch, so a pull request can't change the rules,
// and only reads the pull request's files as data; their code is parsed or linted, never executed.
//
// A submission adds or changes one of two kinds of entry:
//   entries/<slug>.js (+ optional entries/<slug>.md)   a single-file entry, the demo's Playground format: guard.js
//                                                     parses it (acorn) as the demo server does
//   entries/<slug>/                                   a package, the Loci format (docs/submitting.md section 2):
//     loci.json, index.js and/or the targets' entries (mobile.js, ...), or module.wasm, explanation.md, LICENSE
//     The static half of the Loci gate (checks.js, the same file the Submit page runs) reads the whole folder
//     under node, with manifest.js, tex.js, kit.js and KaTeX. The dynamic half needs a browser: check.yml's
//     best-effort "dynamic" job runs it with the site's scripts/check-package.mjs.
//
// usage: node check-entries.mjs <pr-checkout-dir> <changed-files.tsv> <author-association>
//   changed-files.tsv: one "<status>\t<path>" per line (status: added, modified, removed, renamed)
// Prints {ok, errors: [{file, line, message}], warnings: [{file, line, message}], entries: [{slug, kind, title}]}
// as JSON. kind is "file" or "package". Only errors fail the check; warnings are shown to the reviewers.

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import { guard, COLORS_MISSING } from './guard.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const LICENSES = ['MIT', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', 'GPL-3.0-or-later', 'MPL-2.0', 'CC0-1.0'];
const SLUG = '[a-z0-9][a-z0-9-]{0,47}';
const FILE_RE = new RegExp(`^entries/(${SLUG})\\.(js|md)$`);
const PKG_RE = new RegExp(`^entries/(${SLUG})/([^/]+)$`);
// What a package folder may hold: the manifest, JS or WebAssembly entries, the explanation and the license.
const PKG_FILE = /^(loci\.json|explanation\.md|[a-z0-9][a-z0-9_-]{0,40}\.js|[a-z0-9][a-z0-9_-]{0,40}\.wasm|(LICEN[CS]E|COPYING)(\.(md|txt))?)$/;
const TEXT_FILE = /\.(js|json|md|txt)$|^(LICEN[CS]E|COPYING)$/;
const MAX_FILES = 12;

/* ---------- the Loci gate under node ---------- */
// checks.js and its helpers are page scripts (no DOM at load time). They run in one vm context, like the site's
// scripts/gen-share-pages.mjs does; catalog-index.json stands in for the catalog (the tag vocabulary, the ids
// "after" may name, and the modules the duplicate check compares with) and for the Wanted list.
let gate = null;
function loadGate() {
  if (gate) return gate;
  const index = JSON.parse(readFileSync(join(HERE, 'catalog-index.json'), 'utf8'));
  const ctx = vm.createContext({ console: { log() {}, info() {}, warn() {}, error() {} }, TextEncoder, TextDecoder, crypto, performance, setTimeout, clearTimeout, URL, Promise, atob, btoa });
  ctx.globalThis = ctx;
  try { ctx.katex = createRequire(import.meta.url)('katex'); } catch { /* without KaTeX the explanation check warns instead of parsing */ }
  for (const f of ['kit.js', 'manifest.js', 'tex.js', 'checks.js']) vm.runInContext(readFileSync(join(HERE, f), 'utf8'), ctx, { filename: f });
  ctx.VIZ = index.pieces.map(p => ({ id: p.id, title: p.title, tags: p.tags, manifest: p.manifest, src: p.sources }));
  vm.runInContext('var moduleSource = (v, tid) => v.src ? (v.src[tid || "any"] ?? null) : null;', ctx);
  gate = { ctx, checks: ctx.LociChecks, bounties: index.wanted };
  return gate;
}

/** Runs the static checks on one package folder. Returns {title, errors, warnings, counts}. */
async function checkPackage(slug, folder) {
  const out = { title: null, errors: [], warnings: [] };
  const at = (file, line, message) => ({ file: `entries/${slug}/${file}`, line, message });
  const names = readdirSync(folder).filter(n => !n.startsWith('.'));
  if (names.length > MAX_FILES) out.errors.push(at('', null, `A package holds at most ${MAX_FILES} files.`));
  const files = new Map();
  for (const n of names) {
    const p = join(folder, n);
    if (statSync(p).isDirectory()) { out.errors.push(at(n, null, 'A package folder has no subfolders: put loci.json, the modules, explanation.md and LICENSE side by side.')); continue; }
    if (!PKG_FILE.test(n)) { out.errors.push(at(n, null, 'Not a package file. A package holds loci.json, its .js or .wasm entries, explanation.md and LICENSE.')); continue; }
    const buf = readFileSync(p);
    files.set(n, TEXT_FILE.test(n) ? { text: buf.toString('utf8') } : { bytes: new Uint8Array(buf) });
  }
  if (!files.has('loci.json')) { out.errors.push(at('loci.json', null, 'A package folder needs a loci.json.')); return out; }
  let loci = null;
  try { loci = JSON.parse(files.get('loci.json').text); } catch { /* the manifest check reports it */ }
  if (loci && typeof loci === 'object') {
    out.title = typeof loci.title === 'string' ? loci.title : null;
    if (loci.id !== slug) out.errors.push(at('loci.json', null, `"id" is ${JSON.stringify(loci.id ?? null)}, but the folder is entries/${slug}/: they must match.`));
  }

  const { checks, bounties } = loadGate();
  // A maintainer's first copy of a catalog piece in entries/ is compared as a new piece, not as an unchanged update.
  const firstCopy = trusted && !existsSync(join(HERE, '..', 'entries', slug));
  const report = await checks.run({ files, ...(firstCopy ? { sampleOf: slug } : {}) }, { preview: {}, bounties });
  const entryOf = new Map((report.targets || []).map(t => [t.id, t.entry]));
  for (const c of report.checks) {
    if (c.group === 'dynamic' || c.status === 'pass' || c.status === 'skip') continue;
    const line = Number((c.detail.match(/\bline (\d+)/) || [])[1]) || null;
    const file = fileFor(c, entryOf, line);
    const item = at(file, line, `${c.title}: ${c.detail}`);
    (c.status === 'fail' ? out.errors : out.warnings).push(item);
  }
  out.counts = report.counts;
  return out;
}
/* which file a check is about, so the bot can point at it */
function fileFor(c, entryOf, line) {
  const id = c.id.split('@')[0];
  if (['size', 'imports', 'forbidden-apis', 'shader-loops', 'pointer', 'duplicate'].includes(id)) return entryOf.get(c.target || 'any') || '';
  if (id === 'explanation' || id === 'links') return 'explanation.md';
  if (id === 'license') return /LICENSE file/.test(c.detail) && !/is not one of|has no "license"/.test(c.detail) ? 'LICENSE' : 'loci.json';
  return id === 'runner' || id === 'remix-words' ? '' : 'loci.json';
}

/* ---------- the pull request ---------- */
const [dir, listFile, association] = process.argv.slice(2);
// Maintainers (organization members) may change the repo's own files and remove entries; submitters may not.
const trusted = ['OWNER', 'MEMBER'].includes(association);
const errors = [], warnings = [], entries = [];
const changes = readFileSync(listFile, 'utf8').split('\n').filter(Boolean).map(l => l.split('\t'));

if (!changes.length) errors.push({ file: '', line: null, message: 'This pull request changes no files.' });

const packages = new Set();
for (const [status, path] of changes) {
  const pm = path.match(PKG_RE);
  if (pm) {
    // A file removed from a package that still exists is part of an update (a target dropped, say); removing a
    // whole package is a moderator's job, which the folder check below notices.
    packages.add(pm[1]);
    if (status === 'removed' && !trusted && !existsSync(join(dir, 'entries', pm[1], 'loci.json'))) errors.push({ file: path, line: null, message: "Submissions can't remove entries. Ask a moderator to flag it for removal instead." });
    continue;
  }
  const m = path.match(FILE_RE);
  if (!m) {
    if (!trusted) errors.push({ file: path, line: null, message: 'A submission can only add or change a package folder entries/my-visualization/ (loci.json, index.js, explanation.md, LICENSE), or a single file entries/my-visualization.js plus an optional entries/my-visualization.md (lowercase letters, numbers and dashes).' });
    continue;
  }
  if (status === 'removed') {
    if (!trusted) errors.push({ file: path, line: null, message: "Submissions can't remove entries. Ask a moderator to flag it for removal instead." });
    continue;
  }
  if (existsSync(join(dir, 'entries', m[1]))) errors.push({ file: path, line: null, message: `entries/${m[1]}/ is a package with the same name: an entry is either a folder or a single file, not both.` });
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
    entries.push({ slug: m[1], kind: 'file', title: meta.title ?? null });
  } catch (e) {
    errors.push({ file: path, line: e.line ?? null, message: e.message });
  }
}

for (const slug of [...packages].sort()) {
  const folder = join(dir, 'entries', slug);
  if (!existsSync(folder)) { if (!trusted) errors.push({ file: `entries/${slug}/`, line: null, message: "Submissions can't remove entries. Ask a moderator to flag it for removal instead." }); continue; }
  try {
    const r = await checkPackage(slug, folder);
    errors.push(...r.errors); warnings.push(...r.warnings);
    entries.push({ slug, kind: 'package', title: r.title, ...(r.counts ? { counts: r.counts } : {}) });
  } catch (e) {
    errors.push({ file: `entries/${slug}/`, line: null, message: `The checker crashed on this package: ${e.message}` });
  }
}

console.log(JSON.stringify({ ok: errors.length === 0, errors, warnings, entries }, null, 2));
