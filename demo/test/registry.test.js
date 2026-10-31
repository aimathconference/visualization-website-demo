import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createImporter } from '../server/registry.js';
import { testApp, setUp } from './helpers.js';
import { readFileSync } from 'node:fs';

// A tiny fake of the GitHub API endpoints the importer uses.
function fakeGitHub() {
  const state = { head: 'c1', files: {}, authors: {}, calls: 0 };
  const blobSha = path => `${path}@${Buffer.from(state.files[path]).toString('base64').slice(0, 12)}`;
  const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { etag: `"${state.head}"` } });
  const fetch = async url => {
    state.calls++;
    const u = new URL(url), p = u.pathname;
    if (p === '/repos/org/registry/commits/main') return json({ sha: state.head });
    if (p.startsWith('/repos/org/registry/git/trees/')) return json({ tree: Object.keys(state.files).map(path => ({ path, type: 'blob', sha: blobSha(path) })) });
    if (p.startsWith('/repos/org/registry/git/blobs/')) {
      const path = Object.keys(state.files).find(f => blobSha(f) === decodeURIComponent(p.split('/blobs/')[1]));
      return json({ content: Buffer.from(state.files[path]).toString('base64'), encoding: 'base64' });
    }
    if (p === '/repos/org/registry/commits') return json([{ sha: `commit-${u.searchParams.get('path')}`, author: { login: 'merger' } }]);
    if (p.endsWith('/pulls')) {
      const path = decodeURIComponent(p.split('/commits/commit-')[1].replace('/pulls', ''));
      return json([{ number: 7, user: { login: state.authors[path] ?? 'someone' } }]);
    }
    return json({ message: 'Not Found' }, 404);
  };
  return { state, fetch };
}

const entry = (title, extra = '') => `export default { title: '${title}', hook: 'h', tags: ['Geometry'], license: 'MIT', ${extra} draw(ctx, w, h) {} };`;

test('imports approved entries as reviewed, credits the pull request author, updates and hides', async () => {
  const { db, config, as } = testApp({ env: { REGISTRY_REPO: 'org/registry' } });
  const gh = fakeGitHub();
  const log = { info() {}, warn() {} };
  const importer = createImporter({ db, config, fetch: gh.fetch, log });
  // Ann has set her GitHub username, so her merged entry is credited to her profile.
  const ann = as('ann@example.com');
  await setUp(ann, 'ann', { github: 'Ann-GH' });

  gh.state.files = { 'entries/roses.js': entry('Roses'), 'entries/roses.md': '## Roses', 'entries/waves.js': entry('Waves'), 'README.md': '#' };
  gh.state.authors = { 'entries/roses.js': 'ann-gh', 'entries/waves.js': 'newcomer' };
  const first = await importer.run();
  assert.deepEqual(first.imported.sort(), ['roses', 'waves']);
  const feed = (await ann('GET', '/api/feed')).json.items;
  const roses = feed.find(v => v.slug === 'roses'), waves = feed.find(v => v.slug === 'waves');
  assert.equal(roses.status, 'reviewed');
  assert.equal(roses.author.handle, 'ann');
  assert.equal(roses.explanation, '## Roses');
  assert.equal(roses.registryPr, 7);
  assert.equal(waves.author.handle, 'newcomer');
  assert.equal(roses.colors, null, 'entries from before COLORS still import');

  // Unchanged head: nothing to do.
  assert.deepEqual(await importer.run(), { unchanged: true });

  // An edit updates in place; a deleted entry is hidden; a bad entry is reported, not imported.
  gh.state.head = 'c2';
  gh.state.files = { 'entries/roses.js': `const COLORS = { main: '#112233', secondary: '#445566' };\n${entry('Roses, revised')}`, 'entries/bad.js': 'import x from "y";' };
  const second = await importer.run();
  assert.deepEqual(second.updated, ['roses']);
  assert.deepEqual(second.hidden, ['entries/waves.js']);
  assert.equal(second.errors.length, 1);
  assert.match(second.errors[0].error, /Imports/);
  const after = (await ann('GET', '/api/feed')).json.items.map(v => v.title);
  assert.ok(after.includes('Roses, revised') && !after.includes('Waves'));
  assert.deepEqual((await ann('GET', '/api/viz/roses')).json.colors, { main: '#112233', secondary: '#445566' });

  // The newcomer later sets up a profile with that GitHub username and claims the (hidden) entry.
  const newcomer = as('newcomer@example.com');
  await setUp(newcomer, 'nina', { github: 'newcomer' });
  const row = db.prepare("SELECT u.handle FROM viz v JOIN users u ON u.id = v.author_id WHERE v.slug = 'waves'").get();
  assert.equal(row.handle, 'nina');
});

test('no registry configured: import endpoint explains why', async () => {
  const { as } = testApp();
  const admin = as('admin@example.com');
  await setUp(admin, 'boss');
  const r = await admin('POST', '/api/admin/import-registry');
  assert.equal(r.status, 400);
  assert.match(r.json.error, /REGISTRY_REPO/);
});

// A Loci package folder, as the Submit page's "Download for the registry" lays it out.
const pkgFiles = (id, title, extra = {}, more = {}) => ({
  [`entries/${id}/loci.json`]: JSON.stringify({ api: 1, id, title, hook: 'A hook', license: 'MIT', tags: ['Geometry', 'Teaching'], runtime: 'js', entry: 'index.js', render: 'canvas2d', params: [], presets: [], motion: 'loop', ...more }),
  [`entries/${id}/index.js`]: 'export default { draw({ ctx }) { ctx.fillRect(0, 0, 1, 1); } };\n',
  [`entries/${id}/explanation.md`]: `## ${title}\n`,
  [`entries/${id}/LICENSE`]: 'MIT License\n',
  ...extra,
});

test('package folders: imported as reviewed with a viz_package, listed for the front end, updated and hidden; single files keep the guard path', async () => {
  const { db, config, as } = testApp({ env: { REGISTRY_REPO: 'org/registry' } });
  const gh = fakeGitHub();
  const importer = createImporter({ db, config, fetch: gh.fetch, log: { info() {}, warn() {} } });
  const ann = as('ann@example.com');
  await setUp(ann, 'ann', { github: 'ann-gh' });

  gh.state.files = { ...pkgFiles('conics', 'Conics', {}, { colors: { main: '#FF8A1F', secondary: '#2dd4a7' } }), 'entries/roses.js': entry('Roses'), ...pkgFiles('bad-id', 'Bad', { 'entries/bad-id/loci.json': JSON.stringify({ id: 'other', title: 'Bad' }) }) };
  gh.state.authors = { 'entries/conics': 'ann-gh', 'entries/roses.js': 'someone' };
  const first = await importer.run();
  assert.deepEqual(first.imported.sort(), ['conics', 'roses']);
  assert.equal(first.errors.length, 1);
  assert.match(first.errors[0].error, /"id" is "other"/);

  const conics = db.prepare("SELECT * FROM viz WHERE slug = 'conics'").get();
  assert.equal(conics.status, 'reviewed'); assert.equal(conics.source, 'registry'); assert.equal(conics.registry_path, 'entries/conics/');
  assert.equal(conics.code, null, 'a package is not run by the guard path');
  assert.deepEqual(JSON.parse(conics.colors_json), { main: '#ff8a1f', secondary: '#2dd4a7' }, 'loci.json colors, the package form of COLORS');
  const files = JSON.parse(db.prepare('SELECT files_json FROM viz_package WHERE viz_id = ?').get(conics.id).files_json);
  assert.deepEqual(Object.keys(files).sort(), ['LICENSE', 'explanation.md', 'index.js', 'loci.json']);
  const roses = db.prepare("SELECT * FROM viz WHERE slug = 'roses'").get();
  assert.ok(roses.code_guarded, 'the single file still goes through the guard');
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM viz_package WHERE viz_id = ?').get(roses.id).n, 0);

  // the front end's list: packages only, with their files and the registry they came from
  const reg = (await ann('GET', '/api/registry')).json;
  assert.equal(reg.repo, 'org/registry'); assert.equal(reg.branch, 'main');
  assert.deepEqual(reg.items.map(v => v.slug), ['conics']);
  assert.equal(reg.items[0].author.handle, 'ann');
  assert.equal(reg.items[0].registryPath, 'entries/conics/');
  assert.equal(reg.items[0].files['index.js'], files['index.js']);
  assert.ok((await ann('GET', '/api/feed')).json.items.some(v => v.slug === 'conics'), 'in the reviewed feed');

  // a changed file updates the row and its package in place; a removed folder is hidden
  gh.state.head = 'c2';
  gh.state.files = { ...pkgFiles('conics', 'Revised conics'), 'entries/roses.js': entry('Roses') };
  const second = await importer.run();
  assert.deepEqual(second.updated, ['conics']);
  assert.equal(JSON.parse(db.prepare('SELECT files_json FROM viz_package WHERE viz_id = ?').get(conics.id).files_json)['explanation.md'], '## Revised conics\n');
  gh.state.head = 'c3';
  gh.state.files = { 'entries/roses.js': entry('Roses') };
  assert.deepEqual((await importer.run()).hidden, ['entries/conics/']);
  assert.deepEqual((await ann('GET', '/api/registry')).json.items, []);

  // a package that uses the network is refused, as a Playground post would be
  gh.state.head = 'c4';
  gh.state.files = { ...pkgFiles('leaky', 'Leaky', { 'entries/leaky/index.js': 'export default { draw() { fetch("https://example.com"); } };' }) };
  const fourth = await importer.run();
  assert.equal(fourth.imported.length, 0);
  assert.match(fourth.errors[0].error, /fetch/);
});

test('a package with the slug of a catalog piece takes over its row: same id, author and likes, no second copy', async () => {
  const { db, config, as } = testApp({ env: { REGISTRY_REPO: 'org/registry' } });
  const gh = fakeGitHub();
  const importer = createImporter({ db, config, fetch: gh.fetch, log: { info() {}, warn() {} } });
  const ann = as('ann@example.com');
  await setUp(ann, 'ann');
  const before = db.prepare("SELECT * FROM viz WHERE slug = 'times-table'").get();
  assert.equal(before.source, 'seed');
  assert.equal((await ann('PUT', '/api/viz/times-table/like')).status, 200);

  gh.state.files = pkgFiles('times-table', 'Multiplication tables on a circle');
  gh.state.authors = { 'entries/times-table': 'migrator' };
  const first = await importer.run();
  assert.deepEqual(first.imported, ['times-table']);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM viz WHERE slug LIKE 'times-table%'").get().n, 1);
  const after = db.prepare("SELECT * FROM viz WHERE slug = 'times-table'").get();
  assert.equal(after.id, before.id); assert.equal(after.source, 'registry'); assert.equal(after.registry_path, 'entries/times-table/');
  assert.equal(after.author_id, before.author_id, 'the author stays, not whoever opened the migration');
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM likes WHERE viz_id = ?').get(after.id).n, 1);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM viz_package WHERE viz_id = ?').get(after.id).n, 1);

  gh.state.head = 'c2';
  gh.state.files = pkgFiles('times-table', 'Multiplication tables on a circle', { 'entries/times-table/index.js': '// revised\nexport default { draw({ ctx }) {} };\n' });
  const second = await importer.run();
  assert.deepEqual(second.updated, ['times-table']);
  assert.equal(db.prepare('SELECT author_id FROM viz WHERE id = ?').get(after.id).author_id, before.author_id);
});

test('single-file entries: the contributor template, imported and listed for the Loci front end with its guarded code', async () => {
  const { db, config, as } = testApp({ env: { REGISTRY_REPO: 'org/registry' } });
  const gh = fakeGitHub();
  const importer = createImporter({ db, config, fetch: gh.fetch, log: { info() {}, warn() {} } });
  const ann = as('ann@example.com');
  await setUp(ann, 'ann', { github: 'ann-gh' });
  const template = readFileSync(new URL('../github/registry/template/visualization.js', import.meta.url), 'utf8');
  gh.state.files = { 'entries/lissajous.js': template, 'entries/lissajous.md': '## Lissajous', 'entries/pkg/loci.json': JSON.stringify({ id: 'pkg', title: 'P' }), 'entries/pkg/index.js': 'export default { draw() {} };', 'entries/pkg/explanation.md': 'x' };
  gh.state.authors = { 'entries/lissajous.js': 'ann-gh' };
  const r = await importer.run();
  assert.deepEqual(r.imported.sort(), ['lissajous', 'pkg']);
  const reg = (await ann('GET', '/api/registry')).json;
  assert.deepEqual(reg.items.map(i => i.slug), ['pkg'], 'packages are listed as before');
  assert.equal(reg.singles.length, 1);
  const s = reg.singles[0];
  assert.equal(s.slug, 'lissajous');
  assert.equal(s.title, 'Lissajous curves');
  assert.equal(s.author.handle, 'ann');
  assert.equal(s.registryPath, 'entries/lissajous.js');
  assert.equal(s.explanation, '## Lissajous');
  assert.equal(s.code, template, "the author's file as written");
  assert.match(s.guarded, /__loci\.define\(__export\)/, 'the code as guard.js prepared it');
  assert.match(s.guarded, /This frame ran for over 250 ms/, 'with its loop guard');
  assert.deepEqual(s.colors, { main: '#ff8a1f', secondary: '#2dd4a7', bg: '#050508', fg: '#ecebf5' });
  assert.deepEqual(s.meta, { t0: 0, param: { key: 'a', label: 'Horizontal frequency a', min: 1, max: 8, step: 1, value: 3 } });
  // a hidden entry leaves the list
  gh.state.head = 'c2'; delete gh.state.files['entries/lissajous.js'];
  await importer.run();
  assert.deepEqual((await ann('GET', '/api/registry')).json.singles, []);
});
