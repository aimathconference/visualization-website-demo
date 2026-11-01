// The required check on a submission (docs/submission-spec-slop.md, sections 10 "The gate" and 11).
// .github/workflows/check.yml runs THIS file from the base branch, so a pull request can't change the rules, and
// it only reads the pull request's files as data: spec.js parses the piece with acorn and never runs it.
//
// A submission is one piece's files, and nothing else:
//   entries/<slug>.js     the piece (required)
//   entries/<slug>.md     its explanation (required)
//   entries/<slug>.wasm   an optional WebAssembly module, with its source and a BUILD file under sources/<slug>/
// spec.js and tex.js are copies of the EigenReel site's own files (scripts/sync-registry-checker.sh), the same gate
// the Chalkboard runs live, so the two cannot disagree. KaTeX comes from node_modules, pinned to tex.js's version.
// The tag vocabulary is the base branch's tags.json.
//
// usage: node check-entries.mjs <pr-checkout-dir> <changed-files.tsv> [<author-id>] [<first-author.json>]
//   changed-files.tsv  one "<status>\t<path>[\t<previous path>]" per line (status: added, modified, removed,
//                      renamed, ...); the previous path is there for renames and is held to the same rule
//   author-id          the numeric GitHub id of the account that opened the pull request
//   first-author.json  {"<slug>": <numeric id of whoever opened the pull request that first added
//                      entries/<slug>.js> | null}, computed by check.yml for slugs already on the base branch
// Prints {ok, errors: [{file, line, message}], warnings: [{file, line, message}],
//         entries: [{slug, title, kind: 'added' | 'modified' | 'removed'}]} as JSON.
// Only errors fail the check; warnings go to the reviewers.
//
// The checker never knows who is a maintainer, and there is no exception for members: a pull request that changes
// anything outside a piece's own files fails. Maintainers change the registry's own files by pushing to main, or
// merge such a pull request over the failing check with the admin bypass (demo/github/README.md).

import { readFileSync, existsSync, lstatSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';

const require = createRequire(import.meta.url);
const Spec = require('./spec.js');
const HERE = dirname(fileURLToPath(import.meta.url));
const BASE = join(HERE, '..');   // the base branch's checkout: tags.json and the entries already merged

const ENTRY_RE = /^entries\/([^/]+)\.(js|md|wasm)$/;
const SOURCE_RE = /^sources\/([^/]+)\/.+$/;
const SHAPES = 'entries/<slug>.js, entries/<slug>.md, entries/<slug>.wasm and sources/<slug>/';

const [dir, listFile, authorArg, firstAuthorFile] = process.argv.slice(2);
if (!dir || !listFile) {
  console.error('usage: node check-entries.mjs <pr-checkout-dir> <changed-files.tsv> [<author-id>] [<first-author.json>]');
  process.exit(2);
}
const errors = [], warnings = [], entries = [];
const E = (file, line, message) => errors.push({ file, line: line ?? null, message });
const W = (file, line, message) => warnings.push({ file, line: line ?? null, message });

/* ---------- inputs ---------- */
function vocabulary() {
  try {
    const v = JSON.parse(readFileSync(join(BASE, 'tags.json'), 'utf8'));
    if (Array.isArray(v) && v.length && v.every(t => typeof t === 'string' && t.trim())) return v;
    W('tags.json', null, 'the registry\'s tags.json is not a non-empty array of strings; the checker used the default vocabulary (a maintainer should fix tags.json)');
  } catch {
    W('tags.json', null, 'the registry has no readable tags.json; the checker used the default vocabulary (a maintainer should add tags.json)');
  }
  return Spec.DEFAULT_TAGS;
}
function firstAuthors() {
  if (!firstAuthorFile) return {};
  try {
    const v = JSON.parse(readFileSync(firstAuthorFile, 'utf8'));
    return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
  } catch { return {}; }
}
/** A regular file in the pull request's checkout (never a symlink: it could point at the runner's own files). */
const linked = new Set();
function regular(path) {
  let st;
  try { st = lstatSync(join(dir, path)); } catch { return null; }
  if (st.isSymbolicLink()) {
    if (!linked.has(path)) E(path, null, 'symbolic links are not allowed in a submission');
    linked.add(path);
    return null;
  }
  return st.isFile() ? st : null;
}
const sha = text => createHash('sha256').update(Buffer.from(text, 'utf8')).digest('hex');

/* ---------- which files the pull request changes (section 11) ---------- */
const changes = readFileSync(listFile, 'utf8').split('\n').filter(l => l.trim()).map(l => l.split('\t'));
if (!changes.length) E('', null, 'This pull request changes no files.');

const slugs = new Map();   // slug -> {paths: [[status, path]]}
for (const [status, path, previous] of changes) {
  for (const p of [path, previous].filter(Boolean)) {
    const m = p.match(ENTRY_RE) || p.match(SOURCE_RE);
    if (!m) {
      E(p, null, `A pull request may change only one piece's own files: ${SHAPES} (section 11 of the submission spec). The registry's own files (.github/, .eigenreel/, tags.json, reviewers.yml, the README) are changed by its maintainers.`);
      continue;
    }
    if (!Spec.SLUG_RE.test(m[1])) {
      E(p, null, `The slug "${m[1]}" must be lowercase letters, digits and dashes, starting with a letter or digit, at most 40 characters.`);
      continue;
    }
    if (!slugs.has(m[1])) slugs.set(m[1], { paths: [] });
    slugs.get(m[1]).paths.push([p === previous ? 'removed' : status, p]);
  }
}

/* ---------- each piece ---------- */
const vocab = slugs.size ? vocabulary() : Spec.DEFAULT_TAGS;
const first = firstAuthors();
const author = authorArg && /^\d+$/.test(authorArg) ? Number(authorArg) : null;

// every other piece in the pull request's checkout (the registry as it would be after the merge), for duplicates
let others = null;
function otherPieces() {
  if (others) return others;
  others = [];
  let names = [];
  try { names = readdirSync(join(dir, 'entries')); } catch { /* no entries/ */ }
  for (const n of names) {
    const m = n.match(/^(.+)\.js$/);
    if (!m || slugs.has(m[1]) || !Spec.SLUG_RE.test(m[1])) continue;
    try {
      if (!lstatSync(join(dir, 'entries', n)).isFile()) continue;
      others.push({ slug: m[1], sha256: sha(readFileSync(join(dir, 'entries', n), 'utf8')) });
    } catch { /* unreadable: skip */ }
  }
  return others;
}

for (const [slug, { paths }] of [...slugs].sort((a, b) => a[0].localeCompare(b[0]))) {
  const JS = `entries/${slug}.js`, MD = `entries/${slug}.md`, WASM = `entries/${slug}.wasm`, SRC = `sources/${slug}/`;
  for (const [, p] of paths) regular(p);   // reports symlinks among the changed paths
  const onBase = existsSync(join(BASE, JS));
  const firstId = Number.isInteger(first[slug]) ? first[slug] : null;
  const someoneElse = firstId != null && author != null && firstId !== author;

  // An author withdrawing a piece: every file of it goes, and nothing is checked.
  if (!existsSync(join(dir, JS)) && !linked.has(JS)) {
    if (!onBase) {
      E(JS, null, `${JS} is missing: a submission is ${JS} and ${MD} (and optionally ${WASM} with its source under ${SRC})`);
      entries.push({ slug, title: null, kind: 'added' });
      continue;
    }
    const left = [MD, WASM].filter(p => existsSync(join(dir, p)));
    if (existsSync(join(dir, 'sources', slug))) left.push(SRC);
    if (left.length) for (const p of left) E(p, null, `${JS} is gone, but ${p} is still there: remove a piece's files together, or keep ${JS}.`);
    if (someoneElse) W(JS, null, `this pull request removes ${slug}, first added by another account (section 11): reviewers decide whether the change is welcome`);
    entries.push({ slug, title: null, kind: 'removed' });
    continue;
  }

  const js = regular(JS), md = regular(MD), wasm = regular(WASM);
  const build = regular(`sources/${slug}/BUILD`);
  if (!js) { if (!linked.has(JS)) E(JS, null, `${JS} must be a regular file`); entries.push({ slug, title: null, kind: onBase ? 'modified' : 'added' }); continue; }
  if (!wasm && existsSync(join(dir, 'sources', slug))) W(SRC, null, `${SRC} holds the source of ${WASM}, but there is no ${WASM}`);
  try {
    const r = await Spec.check({
      slug,
      source: readFileSync(join(dir, JS), 'utf8'),
      md: md ? readFileSync(join(dir, MD), 'utf8') : null,
      wasm: wasm ? new Uint8Array(readFileSync(join(dir, WASM))) : null,
      hasBuild: !!build,
      others: otherPieces(),
      vocabulary: vocab,
    });
    errors.push(...r.errors);
    warnings.push(...r.warnings);
    entries.push({ slug, title: r.meta && typeof r.meta.title === 'string' ? r.meta.title : null, kind: onBase ? 'modified' : 'added' });
  } catch (e) {
    E(JS, null, `The checker crashed on this piece: ${e.message}`);
    entries.push({ slug, title: null, kind: onBase ? 'modified' : 'added' });
  }
  if (someoneElse) W(JS, null, `this pull request changes ${slug}, first added by another account (section 11): reviewers decide whether the change is welcome`);
}

console.log(JSON.stringify({ ok: errors.length === 0, errors, warnings, entries }, null, 2));
