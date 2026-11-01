import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createImporter } from '../server/registry.js';
import { testApp, setUp } from './helpers.js';

// A tiny fake of the GitHub API endpoints the importer uses. state.authors: path → {login, id} of the pull request's author.
function fakeGitHub() {
  const state = { head: 'c1', files: {}, authors: {}, calls: 0 };
  const bytes = path => Buffer.isBuffer(state.files[path]) ? state.files[path] : Buffer.from(state.files[path]);
  const blobSha = path => `${path}@${createHash('sha1').update(bytes(path)).digest('hex')}`;
  const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { etag: `"${state.head}"` } });
  const fetch = async url => {
    state.calls++;
    const u = new URL(url), p = u.pathname;
    if (p === '/repos/org/registry/commits/main') return json({ sha: state.head });
    if (p.startsWith('/repos/org/registry/git/trees/')) return json({ tree: Object.keys(state.files).map(path => ({ path, type: 'blob', sha: blobSha(path), size: bytes(path).length })) });
    if (p.startsWith('/repos/org/registry/git/blobs/')) {
      const path = Object.keys(state.files).find(f => blobSha(f) === decodeURIComponent(p.split('/blobs/')[1]));
      return json({ content: bytes(path).toString('base64'), encoding: 'base64' });
    }
    if (p === '/repos/org/registry/commits') return json([{ sha: `commit-${u.searchParams.get('path')}`, author: { login: 'merger', id: 1 } }]);
    if (p.endsWith('/pulls')) {
      const path = decodeURIComponent(p.split('/commits/commit-')[1].replace('/pulls', ''));
      return json([{ number: 7, user: state.authors[path] ?? { login: 'someone', id: 999 } }]);
    }
    return json({ message: 'Not Found' }, 404);
  };
  return { state, fetch };
}

// A minimal valid entry in the submission format (docs/submission-spec-slop.md).
const piece = (title, { colors = "{main:'#112233', secondary:'#445566'}", extra = '' } = {}) => `const COLORS = ${colors};
export default { title: '${title}', hook: 'A hook about ${title}.', alt: 'A picture of ${title}.', tags: ['Geometry'], license: 'MIT',
  author: { name: 'Ann' }, modes: { desktop: true, phone: true }, time: { length: 10, loop: true }, ${extra}
  draw(ctx, t, params, env, S) {} };
`;
const entry = (slug, title, more = {}) => ({ [`entries/${slug}.js`]: piece(title, more), [`entries/${slug}.md`]: `## ${title}\n` });
const quiet = { info() {}, warn() {} };
const authorOf = (db, slug) => db.prepare('SELECT u.* FROM viz v JOIN users u ON u.id = v.author_id WHERE v.slug = ?').get(slug);

test('imports entries as written, credits the pull request author by numeric id, and serves them to the front end', async () => {
  const { db, config, as } = testApp({ env: { REGISTRY_REPO: 'org/registry' } });
  const gh = fakeGitHub();
  const importer = createImporter({ db, config, fetch: gh.fetch, log: quiet });
  // Ann has set her GitHub username; her first import records her numeric id on her profile.
  const ann = as('ann@example.com');
  await setUp(ann, 'ann', { github: 'Ann-GH' });

  const wasm = Buffer.from([0, 0x61, 0x73, 0x6d, 1, 0, 0, 0]);
  gh.state.files = { ...entry('roses', 'Roses'), ...entry('waves', 'Waves', { extra: "params: [{ key: 'k', type: 'range', label: 'k', min: 1, max: 5, step: 1, default: 2 }]," }),
    'entries/waves.wasm': wasm, 'sources/waves/main.c': 'int main(){}', 'README.md': '#' };
  gh.state.authors = { 'entries/roses.js': { login: 'ann-gh', id: 101 }, 'entries/waves.js': { login: 'newcomer', id: 202 } };
  const first = await importer.run();
  assert.deepEqual(first.errors, []);
  assert.deepEqual(first.imported.sort(), ['roses', 'waves']);
  assert.equal(authorOf(db, 'roses').handle, 'ann');
  assert.equal(authorOf(db, 'roses').github_id, 101, 'the id is recorded on the profile the login matched');
  const nc = authorOf(db, 'waves');
  assert.equal(nc.handle, 'newcomer'); assert.equal(nc.placeholder, 2); assert.equal(nc.github_id, 202);

  const roses = db.prepare("SELECT * FROM viz WHERE slug = 'roses'").get();
  assert.equal(roses.status, 'reviewed'); assert.equal(roses.source, 'registry'); assert.equal(roses.registry_path, 'entries/roses.js');
  assert.equal(roses.code, piece('Roses'), 'the code as written'); assert.equal(roses.code_guarded, null, 'no guard: the front end sandboxes it');

  const feed = (await ann('GET', '/api/feed')).json.items;
  assert.ok(feed.some(v => v.slug === 'roses' && v.registryPr === 7), 'in the reviewed feed');

  const reg = (await ann('GET', '/api/registry')).json;
  assert.equal(reg.repo, 'org/registry'); assert.equal(reg.branch, 'main');
  assert.deepEqual(reg.items, []);
  const r = reg.singles.find(s => s.slug === 'roses'), w = reg.singles.find(s => s.slug === 'waves');
  assert.equal(r.title, 'Roses'); assert.equal(r.hook, 'A hook about Roses.');
  assert.deepEqual(r.tags, ['Geometry']); assert.equal(r.license, 'MIT');
  assert.deepEqual(r.colors, { main: '#112233', secondary: '#445566' });
  assert.equal(r.code, piece('Roses'));
  assert.equal(r.explanation, '## Roses\n');
  assert.equal(r.author.handle, 'ann'); assert.equal(r.registryPr, 7); assert.equal(r.registryPath, 'entries/roses.js');
  assert.equal(r.likes, 0); assert.equal(r.liked, false);
  assert.equal(r.wasm, null);
  assert.deepEqual(r.meta.time, { length: 10, loop: true }); assert.equal(r.meta.alt, 'A picture of Roses.'); assert.deepEqual(r.meta.author, { name: 'Ann' });
  assert.equal(w.meta.params[0].key, 'k');
  assert.equal(w.wasm, `data:application/wasm;base64,${wasm.toString('base64')}`);

  // Unchanged head: nothing to do.
  assert.deepEqual(await importer.run(), { unchanged: true });
});

test('updates in place keep the first author; removed entries are hidden; unreadable entries are reported, not imported', async () => {
  const { db, config, as } = testApp({ env: { REGISTRY_REPO: 'org/registry' } });
  const gh = fakeGitHub();
  const importer = createImporter({ db, config, fetch: gh.fetch, log: quiet });
  const ann = as('ann@example.com');
  await setUp(ann, 'ann');

  gh.state.files = { ...entry('roses', 'Roses'), ...entry('waves', 'Waves') };
  gh.state.authors = { 'entries/roses.js': { login: 'first', id: 11 }, 'entries/waves.js': { login: 'first', id: 11 } };
  await importer.run();
  const before = db.prepare("SELECT * FROM viz WHERE slug = 'roses'").get();
  assert.equal((await ann('PUT', '/api/viz/roses/like')).status, 200);

  gh.state.head = 'c2';
  gh.state.files = { ...entry('roses', 'Roses, revised', { colors: "{main:'#aabbcc', secondary:'#ddeeff'}" }),
    'entries/bad.js': 'import x from "y";', 'entries/bad.md': '## Bad', 'entries/nomd.js': piece('No explanation') };
  gh.state.authors = { 'entries/roses.js': { login: 'second', id: 22 } };
  const second = await importer.run();
  assert.deepEqual(second.updated, ['roses']);
  assert.deepEqual(second.imported, []);
  assert.deepEqual(second.hidden, ['entries/waves.js']);
  assert.deepEqual(second.errors.map(e => e.entry).sort(), ['entries/bad.js', 'entries/nomd.js']);
  assert.match(second.errors.find(e => e.entry === 'entries/bad.js').error, /cannot be read: line 1: the file must start with const COLORS/);
  assert.match(second.errors.find(e => e.entry === 'entries/nomd.js').error, /nomd\.md is missing/);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM viz WHERE slug IN ('bad', 'nomd')").get().n, 0);

  const after = db.prepare("SELECT * FROM viz WHERE slug = 'roses'").get();
  assert.equal(after.id, before.id); assert.equal(after.title, 'Roses, revised');
  assert.equal(after.author_id, before.author_id, 'a later pull request from someone else does not change the author');
  assert.equal(authorOf(db, 'roses').github_id, 11);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM users WHERE github_id = 22').get().n, 0, 'no profile made for the later author');
  const reg = (await ann('GET', '/api/registry')).json.singles;
  assert.deepEqual(reg.map(s => s.slug), ['roses']);
  assert.deepEqual(reg[0].colors, { main: '#aabbcc', secondary: '#ddeeff' });
  assert.equal(reg[0].likes, 1); assert.equal(reg[0].liked, true);

  // a hidden entry that comes back is shown again, on the same row
  gh.state.head = 'c3';
  gh.state.files = { ...entry('roses', 'Roses, revised'), ...entry('waves', 'Waves again') };
  assert.deepEqual((await importer.run()).updated.sort(), ['roses', 'waves']);
  assert.ok((await ann('GET', '/api/registry')).json.singles.some(s => s.title === 'Waves again'));
});

test('authorship goes by numeric id: renamed logins still match, reused logins do not, and a claimed placeholder hands its id over', async () => {
  const { db, config, as } = testApp({ env: { REGISTRY_REPO: 'org/registry' } });
  const gh = fakeGitHub();
  const importer = createImporter({ db, config, fetch: gh.fetch, log: quiet });
  const ann = as('ann@example.com'), bea = as('bea@example.com');
  await setUp(ann, 'ann', { github: 'old-name' });
  await setUp(bea, 'bea', { github: 'taken-login' });
  db.prepare("UPDATE users SET github_id = 500 WHERE handle = 'bea'").run();

  gh.state.files = { ...entry('one', 'One') };
  gh.state.authors = { 'entries/one.js': { login: 'old-name', id: 300 } };
  await importer.run();
  assert.equal(authorOf(db, 'one').handle, 'ann');

  // Ann renamed her GitHub account (her profile still says old-name): her id still finds her.
  gh.state.head = 'c2';
  gh.state.files = { ...entry('one', 'One'), ...entry('two', 'Two'), ...entry('three', 'Three'), ...entry('four', 'Four') };
  gh.state.authors = { 'entries/two.js': { login: 'new-name', id: 300 },
    // someone else now holds the login on Bea's profile; Bea's recorded id differs, so it is not her
    'entries/three.js': { login: 'taken-login', id: 600 },
    'entries/four.js': { login: 'later', id: 700 } };
  const r = await importer.run();
  assert.deepEqual(r.errors, []);
  assert.equal(authorOf(db, 'two').handle, 'ann');
  const three = authorOf(db, 'three');
  assert.notEqual(three.handle, 'bea'); assert.equal(three.placeholder, 2); assert.equal(three.github_id, 600);
  assert.equal(three.github, null, 'the login stays with the profile that has it');

  // The author of four sets up a profile with that GitHub username: the piece and the id move to it.
  const later = as('later@example.com');
  await setUp(later, 'lately', { github: 'later' });
  const four = authorOf(db, 'four');
  assert.equal(four.handle, 'lately'); assert.equal(four.github_id, 700);
  gh.state.head = 'c3';
  gh.state.files = { ...gh.state.files, ...entry('five', 'Five') };
  gh.state.authors['entries/five.js'] = { login: 'later-renamed', id: 700 };
  await importer.run();
  assert.equal(authorOf(db, 'five').handle, 'lately');
});

test('an entry with the slug of a catalog piece, or of an old package folder, takes over its row', async () => {
  const { db, config, as } = testApp({ env: { REGISTRY_REPO: 'org/registry' } });
  const gh = fakeGitHub();
  const importer = createImporter({ db, config, fetch: gh.fetch, log: quiet });
  const ann = as('ann@example.com');
  await setUp(ann, 'ann');
  const before = db.prepare("SELECT * FROM viz WHERE slug = 'times-table'").get();
  assert.equal(before.source, 'seed');
  assert.equal((await ann('PUT', '/api/viz/times-table/like')).status, 200);
  // an old package import (entries/<slug>/ with a viz_package row)
  const pkg = db.prepare(`INSERT INTO viz (slug, author_id, kind, status, source, registry_path, title)
    VALUES ('conics', ?, 'code', 'reviewed', 'registry', 'entries/conics/', 'Conics')`).run(before.author_id).lastInsertRowid;
  db.prepare("INSERT INTO viz_package (viz_id, files_json) VALUES (?, '{}')").run(pkg);

  gh.state.files = { ...entry('times-table', 'Multiplication tables on a circle'), ...entry('conics', 'Conics') };
  gh.state.authors = { 'entries/times-table.js': { login: 'migrator', id: 9 }, 'entries/conics.js': { login: 'migrator', id: 9 } };
  const first = await importer.run();
  assert.deepEqual(first.imported.sort(), ['conics', 'times-table']);
  assert.deepEqual(first.hidden, []);
  const after = db.prepare("SELECT * FROM viz WHERE slug = 'times-table'").get();
  assert.equal(after.id, before.id); assert.equal(after.source, 'registry'); assert.equal(after.registry_path, 'entries/times-table.js');
  assert.equal(after.author_id, before.author_id, 'the author stays, not whoever opened the migration');
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM viz WHERE slug LIKE 'times-table%'").get().n, 1);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM likes WHERE viz_id = ?').get(after.id).n, 1);
  const conics = db.prepare("SELECT * FROM viz WHERE slug = 'conics'").get();
  assert.equal(conics.id, pkg); assert.equal(conics.registry_path, 'entries/conics.js');
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM viz_package WHERE viz_id = ?').get(pkg).n, 0, 'the old package files are dropped');
  assert.deepEqual((await ann('GET', '/api/registry')).json.singles.map(s => s.slug).sort(), ['conics', 'times-table']);
});

test('the contributor template imports as it is', async () => {
  const { db, config, as } = testApp({ env: { REGISTRY_REPO: 'org/registry' } });
  const gh = fakeGitHub();
  const importer = createImporter({ db, config, fetch: gh.fetch, log: quiet });
  const template = readFileSync(new URL('../github/registry/template/visualization.js', import.meta.url), 'utf8');
  gh.state.files = { 'entries/template-test.js': template, 'entries/template-test.md': '## Template\n' };
  const r = await importer.run();
  assert.deepEqual(r.errors, []);
  assert.deepEqual(r.imported, ['template-test']);
  const s = (await as('ann@example.com')('GET', '/api/registry')).json.singles[0];
  assert.equal(s.code, template);
  assert.ok(s.title && s.meta.time && s.colors.main && s.colors.secondary);
});

test('no registry configured: import endpoint explains why', async () => {
  const { as } = testApp();
  const admin = as('admin@example.com');
  await setUp(admin, 'boss');
  const r = await admin('POST', '/api/admin/import-registry');
  assert.equal(r.status, 400);
  assert.match(r.json.error, /REGISTRY_REPO/);
});
