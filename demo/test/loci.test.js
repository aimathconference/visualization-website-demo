// The routes added for the Loci front end at the repository root (server/routes/loci.js, server/catalog.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { testApp, setUp } from './helpers.js';
import { syncCatalog } from '../server/catalog.js';
import { loadConfig } from '../server/app.js';
import { readFileSync } from 'node:fs';

test('kv: per person, round trip, validation and limits', async () => {
  const { as } = testApp();
  const ann = as('ann@example.com'), bob = as('bob@example.com');
  assert.equal((await ann('GET', '/api/me/kv')).status, 403, 'needs a profile');
  await setUp(ann, 'ann'); await setUp(bob, 'bob');
  assert.deepEqual((await ann('GET', '/api/me/kv')).json, { items: {} });
  const list = [{ id: 'm1', title: 'Week 7', items: [{ v: 'times-table', t: 2 }] }];
  assert.equal((await ann('PUT', '/api/me/kv/loci:moments', { value: list })).status, 200);
  assert.equal((await ann('PUT', '/api/me/kv/loci:draft:hopf-fibers@mobile', { value: '// draft' })).status, 200);
  assert.equal((await ann('PUT', '/api/me/kv/loci:moments', { value: [...list, { id: 'm2', title: 'Two', items: [] }] })).status, 200, 'overwrite');
  const mine = (await ann('GET', '/api/me/kv')).json.items;
  assert.equal(mine['loci:moments'].length, 2);
  assert.equal(mine['loci:draft:hopf-fibers@mobile'], '// draft');
  assert.deepEqual((await bob('GET', '/api/me/kv')).json.items, {}, 'not shared with others');
  assert.equal((await ann('DELETE', '/api/me/kv/loci:draft:hopf-fibers@mobile')).status, 200);
  assert.deepEqual(Object.keys((await ann('GET', '/api/me/kv')).json.items), ['loci:moments']);
  assert.equal((await ann('PUT', '/api/me/kv/other', { value: 1 })).status, 400, 'only loci: keys');
  assert.equal((await ann('PUT', '/api/me/kv/loci:x', {})).status, 400, 'needs {value}');
  assert.equal((await ann('PUT', '/api/me/kv/loci:big', { value: 'x'.repeat(300_000) })).status, 413);
  assert.equal((await as('ann@example.com', { 'x-loci': '' })('PUT', '/api/me/kv/loci:saved', { value: [] })).status, 403, 'cross-site');
});

test('whoami: the boot probe, and the handle editor', async () => {
  const { as } = testApp();
  const ann = as('ann@example.com');
  const w0 = (await ann('GET', '/api/whoami')).json;
  assert.equal(w0.server, true); assert.equal(w0.needsSetup, true); assert.equal(w0.authMode, 'dev');
  await setUp(ann, 'ann'); await setUp(as('bob@example.com'), 'bob');
  assert.equal((await ann('GET', '/api/whoami')).json.user.handle, 'ann');
  assert.equal((await ann('PUT', '/api/me/handle', { handle: '@Annie' })).json.handle, 'annie');
  assert.equal((await ann('PUT', '/api/me/handle', { handle: 'bob' })).status, 422, 'taken');
  assert.equal((await ann('PUT', '/api/me/handle', { handle: 'admin' })).status, 422, 'reserved');
  assert.equal((await ann('GET', '/api/users/annie')).status, 200);
  // Sign out (the demo's signed_out cookie): the probe says so, and the front end falls back to this browser.
  const out = (await as('ann@example.com', { cookie: 'signed_out=1' })('GET', '/api/whoami')).json;
  assert.equal(out.identified, false); assert.equal(out.signedOut, true);
  assert.equal((await as('carl@example.com')('GET', '/api/whoami')).json.signedOut, undefined);
});

test('Playground: post a remix package, list it, refuse bad packages', async () => {
  const { as } = testApp();
  const ann = as('ann@example.com'), bob = as('bob@example.com');
  await setUp(ann, 'ann'); await setUp(bob, 'bob');
  const files = { 'index.js': 'export default { draw({ ctx }) { ctx.fillRect(0, 0, 1, 1); } };\n', 'loci.json': JSON.stringify({ title: 'Times, again', hook: 'A remix' }), 'explanation.md': 'Why.\n' };
  const r = await ann('POST', '/api/playground', { parent: 'times-table', files });
  assert.equal(r.status, 201);
  assert.equal(r.json.kind, 'remix'); assert.equal(r.json.status, 'playground'); assert.equal(r.json.parent.slug, 'times-table');
  assert.deepEqual(r.json.files, files);
  const list = (await bob('GET', '/api/playground')).json.items;
  assert.deepEqual(list.map(v => v.title), ['Times, again']);
  assert.ok(!(await bob('GET', '/api/feed')).json.items.some(v => v.status === 'playground'), 'not in the reviewed feed');
  assert.deepEqual((await bob('PUT', `/api/viz/${r.json.id}/like`)).json, { likes: 1, liked: true });
  for (const [bad, why] of [
    [{ ...files, 'index.js': 'fetch("https://example.com")' }, 'network'],
    [{ 'index.js': files['index.js'], 'explanation.md': 'x' }, 'no loci.json'],
    [{ 'loci.json': '{}', 'explanation.md': 'x' }, 'no module'],
    [{ ...files, '../x.js': '' }, 'path'],
  ]) assert.equal((await ann('POST', '/api/playground', { parent: 'times-table', files: bad })).status, 422, why);
  assert.equal((await ann('POST', '/api/playground', { parent: 'nope', files })).status, 422);
  assert.equal((await ann('DELETE', `/api/viz/${r.json.id}`)).status, 200);
  assert.deepEqual((await bob('GET', '/api/playground')).json.items, []);
});

test('catalog: every share page gets a reviewed viz row, once; the front end is served, the rest is not', async () => {
  const { db, as } = testApp();
  const added = syncCatalog(db, loadConfig({}).frontendDir);
  assert.ok(added.includes('hopf-fibers') && !added.includes('times-table'), 'seeds keep their rows');
  assert.deepEqual(syncCatalog(db, loadConfig({}).frontendDir), [], 'idempotent');
  const feed = (await as(null)('GET', '/api/feed')).json.items;
  assert.equal(feed.find(v => v.slug === 'hopf-fibers').author.handle, 'villarceau');
  const get = p => as(null)('GET', p);
  assert.equal((await get('/')).status, 200);
  assert.match((await get('/')).headers.get('content-security-policy'), /worker-src 'self' blob:/);
  assert.equal((await get('/examples/wasm-lissajous/module.wasm')).headers.get('content-type'), 'application/wasm');
  for (const p of ['/demo/package.json', '/.gitignore', '/PLAN.md', '/scripts/gen-share-pages.mjs', '/v/../demo/package.json']) assert.equal((await get(p)).status, 404, p);
});

test('site page colors: moderators set them for everyone; whoami carries them to every page', async () => {
  const { as, db } = testApp();
  const ann = as('ann@example.com'), bob = as('bob@example.com'), admin = as('admin@example.com'), newcomer = as('carl@example.com');
  await setUp(ann, 'ann'); await setUp(bob, 'bob'); await setUp(admin, 'boss');
  const theme = { bg: '#FDF6E3', fg: '#073642', accent: '#d33682', accent2: '#268bd2' };
  assert.equal((await bob('PUT', '/api/page-theme', { theme })).status, 403, 'plain users cannot');
  assert.equal((await newcomer('GET', '/api/page-theme')).json.theme, null);
  assert.equal((await newcomer('GET', '/api/whoami')).json.pageTheme, null);
  const annId = db.prepare("SELECT id FROM users WHERE handle = 'ann'").get().id;
  await admin('PUT', `/api/admin/users/${annId}/role`, { role: 'moderator' });
  assert.equal((await ann('PUT', '/api/page-theme', { theme: { ...theme, accent: 'red' } })).status, 400);
  assert.equal((await ann('PUT', '/api/page-theme', { theme })).json.theme.bg, '#fdf6e3');
  // everyone gets it: another person, someone without a profile yet, and the boot probe
  assert.equal((await bob('GET', '/api/page-theme')).json.theme.accent, '#d33682');
  assert.deepEqual((await bob('GET', '/api/whoami')).json.pageTheme, { bg: '#fdf6e3', fg: '#073642', accent: '#d33682', accent2: '#268bd2' });
  assert.equal((await newcomer('GET', '/api/whoami')).json.pageTheme.fg, '#073642');
  assert.equal((await ann('GET', '/api/me/page-theme')).json.theme, null, 'the per-account colors of the demo front end are separate');
  assert.equal((await admin('PUT', '/api/page-theme', { theme: null })).json.theme, null);
  assert.equal((await bob('GET', '/api/whoami')).json.pageTheme, null);
});

test('Playground: a new visualization (no parent) is a top-level post', async () => {
  const { as } = testApp();
  const ann = as('ann@example.com'), bob = as('bob@example.com');
  await setUp(ann, 'ann'); await setUp(bob, 'bob');
  const loci = { api: 1, id: 'new-abc123', title: 'Lissajous curves', hook: 'Two oscillations', tags: ['Geometry'], license: 'MIT', colors: { main: '#ff8a1f', secondary: '#2dd4a7' } };
  const files = { 'index.js': 'export default { draw({ ctx }) { ctx.fillRect(0, 0, 1, 1); } };\n', 'loci.json': JSON.stringify(loci), 'explanation.md': 'Why.\n' };
  const r = await ann('POST', '/api/playground', { parent: null, files });
  assert.equal(r.status, 201);
  assert.equal(r.json.kind, 'code'); assert.equal(r.json.status, 'playground'); assert.equal(r.json.parent, null);
  assert.deepEqual(r.json.tags, ['Geometry']); assert.deepEqual(r.json.colors, loci.colors);
  assert.deepEqual((await bob('GET', '/api/playground')).json.items.map(v => v.title), ['Lissajous curves']);
  assert.ok(!(await bob('GET', '/api/feed')).json.items.some(v => v.status === 'playground'), 'not in the reviewed feed');
});

test('the New button starts from the contributor template: examples/template is an exact copy', () => {
  const read = p => readFileSync(new URL(p, import.meta.url), 'utf8');
  assert.equal(read('../../examples/template/visualization.js'), read('../github/registry-practice/template/visualization.js'),
    'copy demo/github/registry-practice/template/visualization.js to examples/template/visualization.js');
});
