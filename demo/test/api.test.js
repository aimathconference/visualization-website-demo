import { test } from 'node:test';
import assert from 'node:assert/strict';
import { testApp, setUp, AVATAR } from './helpers.js';

test('seed: six reviewed visualizations, newest first', async () => {
  const { as } = testApp();
  const r = await as(null)('GET', '/api/feed');
  assert.equal(r.status, 200);
  assert.deepEqual(r.json.items.map(v => v.slug), ['times-table', 'elliptic-group-law', 'himmelblau-descent', 'julia-circle', 'fourier-square', 'riemann-sums']);
  assert.ok(r.json.items.every(v => v.status === 'reviewed' && v.likes === 0));
});

test('profile setup: required before writing, unique handles, validation', async () => {
  const { as } = testApp();
  const ann = as('ann@example.com'), bob = as('bob@example.com');
  assert.equal((await ann('GET', '/api/me')).json.needsSetup, true);
  assert.equal((await ann('PUT', '/api/viz/1/like')).status, 403);
  assert.equal((await ann('PUT', '/api/me', { handle: 'x', avatar: AVATAR })).status, 422);
  assert.equal((await ann('PUT', '/api/me', { handle: 'admin', avatar: AVATAR })).status, 422);
  assert.equal((await ann('PUT', '/api/me', { handle: 'ann', avatar: AVATAR, homepage: 'javascript:alert(1)' })).status, 422);
  await setUp(ann, 'ann', { github: 'ann-gh', homepage: 'https://ann.example' });
  assert.equal((await bob('PUT', '/api/me', { handle: 'ann', avatar: AVATAR })).status, 422, 'handle taken');
  assert.equal((await bob('PUT', '/api/me', { handle: 'bob', avatar: AVATAR, github: 'ANN-gh' })).status, 422, 'github taken');
  // The handle can't be changed once set.
  const again = await ann('PUT', '/api/me', { handle: 'annie', avatar: AVATAR, bio: 'hello' });
  assert.equal(again.json.handle, 'ann');
  assert.equal(again.json.bio, 'hello');
});

test('logins never appear in responses', async () => {
  const { as } = testApp();
  const ann = as('secret-login@example.com');
  await setUp(ann, 'ann');
  for (const path of ['/api/me', '/api/users/ann', '/api/users', '/api/feed', '/api/admin/users']) {
    const r = await as('admin@example.com')('GET', path);
    assert.ok(!r.text.includes('secret-login'), path);
    assert.ok(!r.text.includes('ts_login'), path);
  }
  assert.ok(!(await ann('GET', '/api/me')).text.includes('secret-login'));
});

test('likes: toggle, counts, My likes, and polling changes', async () => {
  const { as } = testApp();
  const ann = as('ann@example.com'), bob = as('bob@example.com');
  await setUp(ann, 'ann'); await setUp(bob, 'bob');
  const { seq } = (await ann('GET', '/api/feed')).json;
  assert.deepEqual((await ann('PUT', '/api/viz/2/like')).json, { likes: 1, liked: true });
  assert.deepEqual((await bob('PUT', '/api/viz/2/like')).json, { likes: 2, liked: true });
  assert.deepEqual((await ann('PUT', '/api/viz/2/like')).json, { likes: 2, liked: true }, 'idempotent');
  await ann('PUT', '/api/viz/4/like');
  const mine = (await ann('GET', '/api/me/likes')).json.items;
  assert.deepEqual(mine.map(v => v.slug).sort(), ['elliptic-group-law', 'julia-circle']);
  assert.ok(mine.every(v => v.liked));
  const changes = (await bob('GET', `/api/changes?since=${seq}`)).json;
  assert.deepEqual(changes.changes.map(c => [c.id, c.likes]).sort(), [[2, 2], [4, 1]]);
  assert.deepEqual((await bob('DELETE', '/api/viz/2/like')).json, { likes: 1, liked: false });
});

test('cross-site writes are refused', async () => {
  const { as } = testApp();
  const ann = as('ann@example.com');
  await setUp(ann, 'ann');
  assert.equal((await as('ann@example.com', { 'x-loci': '' })('PUT', '/api/viz/1/like')).status, 403);
  assert.equal((await as('ann@example.com', { 'sec-fetch-site': 'cross-site' })('PUT', '/api/viz/1/like')).status, 403);
  assert.equal((await as('ann@example.com', { 'sec-fetch-site': 'same-origin' })('PUT', '/api/viz/1/like')).status, 200);
});

test('Playground: preview, post, remix; never in the reviewed feed unless promoted', async () => {
  const { as } = testApp();
  const ann = as('ann@example.com'), admin = as('admin@example.com');
  await setUp(ann, 'ann'); await setUp(admin, 'boss');
  const bad = await ann('POST', '/api/preview', { code: 'export default {\n draw() {}\n};\nlet x = ;' });
  assert.equal(bad.status, 422);
  assert.equal(bad.json.line, 4);
  const ok = await ann('POST', '/api/preview', { code: 'export default { title: "T", draw(ctx, w, h) { ctx.fillRect(0, 0, w, h); } };' });
  assert.equal(ok.status, 200);
  const page = await ann('GET', `/run/preview/${ok.json.id}`);
  assert.equal(page.status, 200);
  assert.match(page.headers.get('content-security-policy'), /connect-src 'none'/);
  assert.match(page.text, /__loci\.define\(__export\)/);

  const post = await ann('POST', '/api/viz', { kind: 'code', title: 'My First Viz', tags: 'Geometry, Fun', code: 'export default { draw(ctx, w, h) {} };' });
  assert.equal(post.status, 201);
  assert.equal(post.json.status, 'playground');
  assert.equal(post.json.slug, 'my-first-viz');
  const remix = await ann('POST', '/api/viz', { kind: 'remix', parentId: 2, title: 'Elliptic, my way', settings: { palette: 'viridis', lw: 9, param: 50, evil: 1 } });
  assert.equal(remix.status, 201);
  assert.equal(remix.json.runId, 2);
  assert.deepEqual(remix.json.settings, { palette: 'viridis', font: 'style', lw: 4, speed: 1, labels: true, param: 50 });

  const reviewed = async () => (await ann('GET', '/api/feed')).json.items.map(v => v.slug);
  assert.ok(!(await reviewed()).includes('my-first-viz'));
  assert.deepEqual((await ann('GET', '/api/feed?tab=playground')).json.items.map(v => v.slug).sort(), ['elliptic-my-way', 'my-first-viz']);
  assert.equal((await ann('POST', `/api/admin/viz/${post.json.id}/promote`)).status, 403);
  assert.equal((await admin('POST', `/api/admin/viz/${post.json.id}/promote`, { reason: 'demo' })).status, 200);
  assert.ok((await reviewed()).includes('my-first-viz'));
  const log = (await admin('GET', '/api/admin/audit')).json.items;
  assert.deepEqual([log[0].action, log[0].target, log[0].reason, log[0].actor], ['promote', 'my-first-viz', 'demo', 'boss']);
});

test('roles: hierarchy and admin-only endpoints', async () => {
  const { as, db } = testApp();
  const ann = as('ann@example.com'), admin = as('admin@example.com');
  await setUp(ann, 'ann'); await setUp(admin, 'boss');
  const annId = db.prepare("SELECT id FROM users WHERE handle = 'ann'").get().id;
  for (const [m, p] of [['GET', '/api/admin/users'], ['GET', '/api/admin/audit'], ['POST', '/api/admin/viz/1/hide'], ['DELETE', `/api/admin/users/${annId}`]]) {
    assert.equal((await ann(m, p)).status, 403, `${m} ${p}`);
  }
  assert.equal((await admin('PUT', `/api/admin/users/${annId}/role`, { role: 'blog' })).status, 200);
  // A blog maintainer passes moderator checks but still isn't an admin.
  assert.equal((await ann('GET', '/api/admin/users')).status, 403);
  assert.equal((await admin('PUT', `/api/admin/users/${annId}/role`, { role: 'superuser' })).status, 400);
});

test('removing an account hides their posts and refuses the login', async () => {
  const { as, db } = testApp();
  const ann = as('ann@example.com'), admin = as('admin@example.com');
  await setUp(ann, 'ann'); await setUp(admin, 'boss');
  const post = await ann('POST', '/api/viz', { kind: 'code', title: 'Mine', code: 'export default { draw() {} };' });
  const annId = db.prepare("SELECT id FROM users WHERE handle = 'ann'").get().id;
  assert.equal((await admin('DELETE', `/api/admin/users/${annId}`, { reason: 'test' })).status, 200);
  assert.equal((await ann('GET', '/api/me')).json.removed, true);
  assert.equal((await ann('PUT', '/api/viz/1/like')).status, 403);
  assert.equal((await ann('PUT', '/api/me', { avatar: AVATAR })).status, 403);
  assert.ok(!(await admin('GET', '/api/feed?tab=playground')).json.items.some(v => v.id === post.json.id));
  assert.equal((await admin('POST', `/api/admin/users/${annId}/restore`)).status, 200);
  assert.ok((await admin('GET', '/api/feed?tab=playground')).json.items.some(v => v.id === post.json.id));
});

test('deleting: author or admin only, and polling reports the removal', async () => {
  const { as } = testApp();
  const ann = as('ann@example.com'), bob = as('bob@example.com');
  await setUp(ann, 'ann'); await setUp(bob, 'bob');
  const post = await ann('POST', '/api/viz', { kind: 'code', title: 'Mine', code: 'export default { draw() {} };' });
  const { seq } = (await bob('GET', '/api/feed')).json;
  assert.equal((await bob('DELETE', `/api/viz/${post.json.id}`)).status, 403);
  assert.equal((await ann('DELETE', `/api/viz/${post.json.id}`)).status, 200);
  assert.deepEqual((await bob('GET', `/api/changes?since=${seq}`)).json.removed, [post.json.id]);
  assert.match((await bob('GET', `/run/${post.json.id}`)).text, /no longer available/);
});

test('newsletter: three lists, unknown ones dropped; anonymous signup', async () => {
  const { as } = testApp();
  const ann = as('ann@example.com');
  await setUp(ann, 'ann');
  assert.deepEqual((await ann('PUT', '/api/me/newsletter', { lists: ['dev-blog', 'spam', 'dev-blog', 'miscellany'] })).json, { lists: ['dev-blog', 'miscellany'] });
  assert.deepEqual((await ann('GET', '/api/me')).json.user.newsletter, { lists: ['dev-blog', 'miscellany'] });
  assert.equal((await as(null)('POST', '/api/newsletter', { email: 'not-an-email' })).status, 422);
  assert.equal((await as(null)('POST', '/api/newsletter', { email: 'Reader@Example.org' })).status, 200);
});

test('thumbnails: author or admin, known styles, image data only', async () => {
  const { as } = testApp();
  const ann = as('ann@example.com'), admin = as('admin@example.com');
  await setUp(ann, 'ann'); await setUp(admin, 'boss');
  const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
  assert.equal((await ann('PUT', '/api/viz/1/thumb/night', { data: png })).status, 403, 'seed viz belongs to someone else');
  assert.equal((await admin('PUT', '/api/viz/1/thumb/plaid', { data: png })).status, 400);
  assert.equal((await admin('PUT', '/api/viz/1/thumb/night', { data: 'data:text/html;base64,PHNjcmlwdD4=' })).status, 400);
  assert.deepEqual((await admin('PUT', '/api/viz/1/thumb/night', { data: png })).json, { thumbs: { night: 'png' } });
  const img = await ann('GET', '/thumbs/1/night.png');
  assert.equal(img.status, 200);
  assert.equal(img.headers.get('content-type'), 'image/png');
});

test('tailscale mode: identity only from Serve headers, dev headers ignored', async () => {
  const { as } = testApp({ env: { AUTH_MODE: 'tailscale', ADMIN_LOGINS: 'boss@example.com' } });
  assert.deepEqual((await as(null)('GET', '/api/me')).json, { identified: false });
  assert.equal((await as(null, { 'x-dev-login': 'boss@example.com' })('GET', '/api/me')).json.identified, false);
  const boss = as('boss@example.com', { 'tailscale-user-name': '=?utf-8?q?Ren=C3=A9_B?=' });
  assert.equal((await boss('GET', '/api/me')).json.suggestedHandle, 'rene.b');
  await setUp(boss, 'boss');
  assert.equal((await boss('GET', '/api/me')).json.user.role, 'admin');
});

test('blog posts load from content/blog', async () => {
  const { as } = testApp();
  const list = (await as(null)('GET', '/api/posts')).json.items;
  assert.deepEqual(list.map(p => p.slug), ['top-october-2026', 'calculus-ten', 'how-we-curate']);
  const post = (await as(null)('GET', '/api/posts/calculus-ten')).json;
  assert.equal(post.author, 'calc-commons');
  assert.deepEqual(post.viz, ['riemann-sums', 'fourier-square', 'himmelblau-descent']);
  assert.ok((await as(null)('GET', '/api/users/calc-commons')).json.posts.some(p => p.slug === 'calculus-ten'));
});

test('an admin login is an admin from the very first profile save', async () => {
  const { as } = testApp();
  const me = await setUp(as('admin@example.com'), 'boss');
  assert.equal(me.role, 'admin');
});

test('page colors (temporary): moderators and up, per account, validated', async () => {
  const { as, db } = testApp();
  const ann = as('ann@example.com'), bob = as('bob@example.com'), admin = as('admin@example.com');
  await setUp(ann, 'ann'); await setUp(bob, 'bob'); await setUp(admin, 'boss');
  const theme = { bg: '#FDF6E3', fg: '#073642', accent: '#d33682', accent2: '#268bd2' };
  assert.equal((await ann('PUT', '/api/me/page-theme', { theme })).status, 403, 'plain users cannot');
  const annId = db.prepare("SELECT id FROM users WHERE handle = 'ann'").get().id;
  await admin('PUT', `/api/admin/users/${annId}/role`, { role: 'moderator' });
  assert.equal((await ann('GET', '/api/me/page-theme')).json.theme, null);
  assert.equal((await ann('PUT', '/api/me/page-theme', { theme: { ...theme, fg: 'red' } })).status, 400);
  assert.equal((await ann('PUT', '/api/me/page-theme', { theme: { ...theme, fg: '#073642;}' } })).status, 400);
  assert.equal((await ann('PUT', '/api/me/page-theme', { theme })).json.theme.bg, '#fdf6e3');
  assert.equal((await ann('GET', '/api/me/page-theme')).json.theme.accent, '#d33682');
  assert.equal((await admin('GET', '/api/me/page-theme')).json.theme, null, 'each account has its own');
  assert.equal((await ann('PUT', '/api/me/page-theme', { theme: null })).json.theme, null);
  assert.equal((await ann('GET', '/api/me/page-theme')).json.theme, null);
});
