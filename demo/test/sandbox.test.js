// The sandbox, the kill switch and the gate's explanation rules (docs/review-pipeline.md, "Who enforces what").
// The browser half is scripts/check-sandbox.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, cpSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import vm from 'node:vm';
import { testApp, setUp } from './helpers.js';
import { frontendCsp } from '../server/app.js';

const SITE = join(import.meta.dirname, '..', '..');
const read = f => readFileSync(join(SITE, f), 'utf8');

test('runner.html: its policy allows its own script, and no network or eval', () => {
  const html = read('runner.html');
  const policy = html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)[1];
  const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  const hash = createHash('sha256').update(script).digest('base64');
  assert.ok(policy.includes(`'sha256-${hash}'`), `the script's hash is sha256-${hash}: put it in runner.html's <meta> tag`);
  for (const d of ["default-src 'none'", "connect-src 'none'", "font-src 'none'", "img-src 'none'", "base-uri 'none'", "form-action 'none'"]) assert.ok(policy.includes(d), d);
  assert.ok(!/'unsafe-eval'/.test(policy), 'no eval');
  assert.ok(!/script-src[^;]*'unsafe-inline'/.test(policy), 'no inline script but its own');
});

test('the server: the sandbox header, and a page that needs neither eval nor outside images', async () => {
  const { as } = testApp();
  const anon = as(null);
  const run = await anon('GET', '/runner.html');
  assert.equal(run.status, 200);
  const rc = run.headers.get('content-security-policy');
  assert.match(rc, /^sandbox allow-scripts; /); assert.match(rc, /connect-src 'none'/); assert.match(rc, /frame-ancestors 'self'/);
  const page = (await anon('GET', '/')).headers.get('content-security-policy');
  assert.equal(page, frontendCsp(''));
  assert.ok(!/ 'unsafe-eval'/.test(page)); assert.ok(!/script-src[^;]*blob:/.test(page)); assert.ok(!/img-src[^;]*https:/.test(page));
  const other = testApp({ env: { RUNNER_URL: 'https://sandbox.example/runner.html' } }).as(null);
  assert.match((await other('GET', '/')).headers.get('content-security-policy'), /frame-src 'self' https:\/\/sandbox\.example/);
  assert.equal((await other('GET', '/api/whoami')).json.runnerUrl, 'https://sandbox.example/runner.html');
  assert.equal((await anon('GET', '/api/whoami')).json.runnerUrl, undefined);
});

test('the kill switch: only admins stop a piece, everyone reads the list, and it is all audited', async () => {
  const { as } = testApp({ env: { DEV_LOGIN: '', ADMIN_LOGINS: 'admin@example.com' } }); // no default login: as(null) is nobody
  const admin = as('admin@example.com'), bob = as('bob@example.com'), anon = as(null);
  await setUp(admin, 'adm'); await setUp(bob, 'bob');
  assert.deepEqual((await anon('GET', '/api/blocked')).json, { items: [] });
  assert.equal((await bob('PUT', '/api/admin/blocked/rose-curves', { reason: 'x' })).status, 403);
  assert.equal((await anon('PUT', '/api/admin/blocked/rose-curves', { reason: 'x' })).status, 403);
  assert.equal((await admin('PUT', '/api/admin/blocked/rose-curves', {})).status, 400, 'a reason is required');
  assert.equal((await admin('PUT', '/api/admin/blocked/Not%20A%20Slug', { reason: 'x' })).status, 400);
  assert.equal((await as('admin@example.com', { 'x-loci': '' })('PUT', '/api/admin/blocked/rose-curves', { reason: 'x' })).status, 403, 'cross-site');
  assert.equal((await admin('PUT', '/api/admin/blocked/rose-curves', { reason: 'flashes badly' })).status, 200);
  assert.deepEqual((await anon('GET', '/api/blocked')).json, { items: [{ id: 'rose-curves', reason: 'flashes badly' }] });
  assert.equal((await anon('GET', '/api/blocked')).headers.get('cache-control'), 'no-store');
  assert.equal((await admin('GET', '/api/admin/blocked')).json.items[0].by, 'adm');
  assert.equal((await admin('PUT', '/api/admin/blocked/rose-curves', { reason: 'still' })).status, 200, 'stopping twice updates the reason');
  assert.equal((await anon('GET', '/api/blocked')).json.items.length, 1);
  assert.equal((await bob('DELETE', '/api/admin/blocked/rose-curves')).status, 403);
  assert.equal((await admin('DELETE', '/api/admin/blocked/rose-curves')).status, 200);
  assert.equal((await admin('DELETE', '/api/admin/blocked/rose-curves')).status, 404);
  assert.deepEqual((await anon('GET', '/api/blocked')).json, { items: [] });
  const log = (await admin('GET', '/api/admin/audit')).json.items.map(a => a.action);
  assert.ok(log.includes('stop-piece') && log.includes('restart-piece'));
});

function gate() {
  const ctx = vm.createContext({ console: { log() {}, info() {}, warn() {}, error() {} }, TextEncoder, TextDecoder, crypto, performance, setTimeout, clearTimeout, URL, Promise, atob, btoa });
  ctx.globalThis = ctx;
  for (const f of ['kit.js', 'manifest.js', 'tex.js', 'checks.js', 'catalog.js']) vm.runInContext(read(f), ctx, { filename: f });
  return { checks: ctx.LociChecks, VIZ: vm.runInContext('VIZ', ctx) };
}

test('the gate: raw HTML and images in an explanation are refused, code and math are not', () => {
  const { checks } = gate();
  const hit = s => checks.htmlProblems(s).map(p => p.msg);
  for (const bad of ['<img src=x onerror=alert(1)>', '<script>x</script>', 'a <b>bold</b> word', '<!-- note -->', '<svg/onload=alert(1)>', '![alt](https://example.com/a.png)', '![alt][ref]', 'text <a href="javascript:x">y</a>'])
    assert.ok(hit(bad).length, `refuses ${bad}`);
  for (const ok of ['plain text', 'if a < b and b > c', 'inline `<img src=x>` code', '```html\n<script>x</script>\n```', 'math $a<b>c$ here', '<https://example.com> autolink', '[a link](https://example.com)', 'x<y'])
    assert.deepEqual([...hit(ok)], [], `allows ${ok}`);
  assert.equal(checks.htmlProblems('line\n\n<img src=x>')[0].line, 3);
});

test('every explanation in the catalog passes the new rules', () => {
  const { checks, VIZ } = gate();
  const problems = [...VIZ].flatMap(v => [...checks.htmlProblems(v.md || '')].map(p => `${v.id} line ${p.line}: ${p.msg}`));
  assert.deepEqual(problems, []);
});

function runChecker(files) {
  const dir = mkdtempSync(join(tmpdir(), 'loci-gate-'));
  cpSync(join(SITE, 'demo/github/registry/.loci'), join(dir, '.loci'), { recursive: true, filter: s => !s.includes('node_modules') });
  symlinkSync(join(SITE, 'demo/node_modules'), join(dir, '.loci/node_modules'));
  const list = [];
  for (const [p, text] of Object.entries(files)) { mkdirSync(join(dir, 'pr', p, '..'), { recursive: true }); writeFileSync(join(dir, 'pr', p), text); list.push(`added\t${p}`); }
  writeFileSync(join(dir, 'changed.tsv'), list.join('\n') + '\n');
  return JSON.parse(execFileSync(process.execPath, [join(dir, '.loci/check-entries.mjs'), join(dir, 'pr'), join(dir, 'changed.tsv'), 'NONE'], { encoding: 'utf8' }));
}
const pkg = md => {
  const index = JSON.parse(read('demo/github/registry/.loci/catalog-index.json')), p = index.pieces.find(x => x.id === 'rose-curves');
  const man = { ...p.manifest, id: 'rose-study', title: 'Rose study', hook: 'A short study of how many petals a rose curve draws for each k.' };
  return { 'entries/rose-study/loci.json': JSON.stringify(man), 'entries/rose-study/index.js': p.sources.any + '\n// a study\n', 'entries/rose-study/explanation.md': md, 'entries/rose-study/LICENSE': 'MIT\n' };
};
const MD = extra => `# What you're seeing\n\n${Array.from({ length: 170 }, (_, i) => 'petal' + i % 7).join(' ')}\n\n${extra}\n\n# Try this\n\nMove the slider.\n\n**Reference.** A book.\n`;

test('the registry check refuses hostile explanations in both layouts, and passes a clean package', () => {
  const clean = runChecker(pkg(MD('Ordinary [link](https://example.com) text.')));
  assert.deepEqual(clean.errors, [], 'a clean package passes');
  for (const bad of ['<img src=x onerror="fetch(1)">', '[click](javascript:alert(1))', '[click][r]\n\n[r]: javascript:alert(1)', '[x](data:text/html,hi)', '![pixel](https://example.com/p.png)']) {
    const r = runChecker(pkg(MD(bad)));
    assert.ok(r.errors.some(e => e.file.endsWith('explanation.md')), `${bad}: ${JSON.stringify(r.errors)}`);
  }
  const single = runChecker({ 'entries/one.md': 'Hello <img src=x onerror=1>' });
  assert.ok(single.errors.some(e => e.file === 'entries/one.md' && /raw HTML/.test(e.message)), JSON.stringify(single.errors));
});

test('no module can run on the page: the fallback is gone', () => {
  const rt = read('runtime.js'), w = read('worker.js'), app = read('app.js');
  assert.ok(!/new Function/.test(rt) && !/forceFallback/.test(rt) && !/fallback=1/.test(rt) && !/\btrusted\s*:/.test(app));
  assert.ok(!/LOCI_SELF/.test(w));
  assert.ok(rt.includes(`setAttribute('sandbox','allow-scripts')`) && !/allow-same-origin/.test(rt));
});
