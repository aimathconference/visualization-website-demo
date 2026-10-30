// The routes added for the Loci front end at the repository root (server/routes/loci.js, server/catalog.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { testApp, setUp } from './helpers.js';
import { syncCatalog } from '../server/catalog.js';
import { loadConfig } from '../server/app.js';

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
