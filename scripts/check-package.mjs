#!/usr/bin/env node
/* The dynamic half of the Loci gate, outside the Submit page (docs/review-pipeline.md section 2, "Dynamic").
 *
 *   node scripts/check-package.mjs <package-folder> [--json report.json] [--all] [--sample-of <id>] [--browser <path>] [--verbose]
 *
 * Serves this repository on 127.0.0.1, starts headless Chromium (or Chrome) with a DevTools port, and opens a tiny
 * harness page that loads the site's own scripts (kit.js, manifest.js, runtime.js, catalog.js, bounties.js, tex.js,
 * checks.js) and calls LociChecks.run on the package, exactly as the Submit page does: the module runs in the same
 * sandboxed worker as the feed. It prints the dynamic checks and a summary, and with --json writes the whole report.
 *
 * The registry's check.yml runs it in its best-effort "dynamic" job, which never blocks a merge; the required
 * "check" job runs the static half under node (.loci/check-entries.mjs). By default only dynamic failures count
 * toward the exit code; --all counts every group. --sample-of <id> compares the package as a new piece made from
 * that catalog piece, like the Submit page's samples (so the duplicate check does not fail it).
 *
 * Exit code: 0 no counted failure, 1 a counted failure, 2 the harness could not run (no browser, a crash, a timeout).
 * Needs Node 22+ (global WebSocket) and chromium, chromium-browser, google-chrome or google-chrome-stable on PATH,
 * or --browser / $CHROME. No npm dependencies. */
import { createServer } from 'node:http';
import { spawn, execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync, existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join, dirname, resolve, extname, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const flag = n => args.includes(n);
const opt = n => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
const pkgDir = args.find((a, i) => !a.startsWith('--') && !['--json', '--sample-of', '--browser', '--timeout'].includes(args[i - 1]));
const TIMEOUT = (Number(opt('--timeout')) || 600) * 1000;
const verbose = flag('--verbose');
const fail = (msg, code = 2) => { console.error(`check-package: ${msg}`); process.exit(code); };
if (!pkgDir || flag('--help')) fail('usage: node scripts/check-package.mjs <package-folder> [--json report.json] [--all] [--sample-of <id>] [--browser <path>] [--timeout <s>] [--verbose]');
if (!existsSync(pkgDir) || !statSync(pkgDir).isDirectory()) fail(`${pkgDir} is not a folder`);

/* the package, as {path, b64} for the harness (dotfiles skipped; at most 16 MB read) */
const pkgFiles = [];
let total = 0;
(function walk(d, pre) {
  for (const n of readdirSync(d).sort()) {
    if (n.startsWith('.') || n === 'node_modules') continue;
    const p = join(d, n);
    if (statSync(p).isDirectory()) { walk(p, pre + n + '/'); continue; }
    const b = readFileSync(p); total += b.length;
    if (total > 16 * 1048576) fail('the package is over 16 MB (the limit is 4 MB)');
    pkgFiles.push({ path: pre + n, b64: b.toString('base64') });
  }
})(resolve(pkgDir), '');
if (!pkgFiles.length) fail('the package folder is empty');

const HARNESS = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Loci package check</title>
<style>body{margin:0;background:#050508;color:#ecebf5;font:14px sans-serif} #preview{width:400px}</style></head>
<body><p id="status">Running the Loci checks…</p><div id="preview"></div>
<script src="/kit.js"></script><script src="/manifest.js"></script><script src="/runtime.js"></script>
<script src="/catalog.js"></script><script src="/bounties.js"></script><script src="/tex.js"></script><script src="/checks.js"></script>
<script>
window.__lociRun = (async () => {
  const cfg = await (await fetch('/__check/pkg.json')).json();
  const files = new Map(cfg.files.map(f => [f.path, { bytes: Uint8Array.from(atob(f.b64), c => c.charCodeAt(0)) }]));
  LociChecks.withText(files);
  const pkg = { name: cfg.name, files };
  if (cfg.sampleOf) pkg.sampleOf = cfg.sampleOf;
  const r = await LociChecks.run(pkg, { preview: document.getElementById('preview'), bounties: typeof WANTED !== 'undefined' ? WANTED : null,
    onProgress: (i, n, label) => { document.getElementById('status').textContent = i + ' / ' + n + ': ' + label; } });
  document.getElementById('status').textContent = 'Done';
  return JSON.stringify({ ok: r.ok, counts: r.counts, durationMs: r.durationMs, playSeconds: r.playSeconds, id: r.manifest && r.manifest.id || null,
    targets: r.targets, packageHash: r.packageHash, moduleHashes: r.moduleHashes,
    checks: r.checks.map(c => ({ id: c.id, group: c.group, target: c.target, title: c.title, status: c.status, detail: c.detail, where: c.where })) });
})();
</script></body></html>`;

/* ---------- a static server for the repository, plus the harness ---------- */
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.wasm': 'application/wasm', '.md': 'text/markdown', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  const send = (code, type, body) => { res.writeHead(code, { 'content-type': type, 'cache-control': 'no-store' }); res.end(body); };
  if (url.pathname === '/__check/harness.html') return send(200, 'text/html', HARNESS);
  if (url.pathname === '/__check/pkg.json') return send(200, 'application/json', JSON.stringify({ name: pkgDir.split(/[\\/]/).filter(Boolean).pop(), sampleOf: opt('--sample-of') || null, files: pkgFiles }));
  const p = resolve(ROOT, '.' + decodeURIComponent(url.pathname));
  if (!p.startsWith(ROOT + sep) || p.slice(ROOT.length).includes(`${sep}.`) || !existsSync(p) || !statSync(p).isFile()) return send(404, 'text/plain', 'not found');
  send(200, TYPES[extname(p)] || 'application/octet-stream', readFileSync(p));
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const origin = `http://127.0.0.1:${server.address().port}`;

/* ---------- the browser ---------- */
function findBrowser() {
  for (const c of [opt('--browser'), process.env.CHROME, 'chromium', 'chromium-browser', 'google-chrome', 'google-chrome-stable']) {
    if (!c) continue;
    if (c.includes('/')) { if (existsSync(c)) return c; continue; }
    try { return execFileSync('which', [c], { encoding: 'utf8' }).trim(); } catch { /* not on PATH */ }
  }
  return null;
}
const exe = findBrowser();
if (!exe) { server.close(); fail('no chromium or google-chrome found (pass --browser <path> or set CHROME)'); }
const profile = mkdtempSync(join(tmpdir(), 'loci-check-'));
const chrome = spawn(exe, [
  '--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check',
  '--window-size=1280,900', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
  '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows',
  ...(flag('--no-sandbox') ? ['--no-sandbox'] : []),
  `${origin}/__check/harness.html`,
], { stdio: ['ignore', 'ignore', 'pipe'] });
let done = false;
const cleanup = () => { if (done) return; done = true; try { chrome.kill('SIGKILL'); } catch { /* gone */ } server.close(); try { rmSync(profile, { recursive: true, force: true }); } catch { /* busy */ } };
process.on('exit', cleanup);
const killer = setTimeout(() => { cleanup(); fail(`the checks did not finish within ${TIMEOUT / 1000} s`); }, TIMEOUT);

const wsURL = await new Promise((res, rej) => {
  let buf = '';
  chrome.stderr.on('data', d => { buf += d; const m = buf.match(/DevTools listening on (ws:\/\/\S+)/); if (m) res(m[1]); });
  chrome.on('exit', code => rej(new Error(`${exe} exited (${code}) before it opened DevTools: ${buf.slice(-400)}`)));
}).catch(e => { cleanup(); fail(e.message); });

const port = new URL(wsURL).port;
let page = null;
for (let i = 0; i < 50 && !page; i++) {
  const list = await fetch(`http://127.0.0.1:${port}/json/list`).then(r => r.json()).catch(() => []);
  page = list.find(t => t.type === 'page' && t.url.includes('/__check/harness.html'));
  if (!page) await new Promise(r => setTimeout(r, 200));
}
if (!page) { cleanup(); fail('the harness page did not open'); }

const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('could not connect to DevTools')); }).catch(e => { cleanup(); fail(e.message); });
let seq = 0;
const pending = new Map(), consoleErrors = [];
ws.onmessage = e => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); return; }
  if (m.method === 'Runtime.consoleAPICalled') {
    const text = m.params.args.map(a => a.value ?? a.description ?? '').join(' ');
    if (m.params.type === 'error') consoleErrors.push(text);
    if (verbose) console.error(`[page ${m.params.type}] ${text}`);
  } else if (m.method === 'Runtime.exceptionThrown') {
    consoleErrors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
  }
};
const send = (method, params = {}) => new Promise(r => { const id = ++seq; pending.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
await send('Runtime.enable');

// the harness defines __lociRun as soon as its scripts have loaded
let result = null;
for (let i = 0; i < 100; i++) {
  const r = await send('Runtime.evaluate', { expression: 'typeof window.__lociRun', returnByValue: true });
  if (r.result?.result?.value === 'object') break;
  await new Promise(r => setTimeout(r, 200));
}
const r = await send('Runtime.evaluate', { expression: 'window.__lociRun', awaitPromise: true, returnByValue: true, timeout: TIMEOUT });
clearTimeout(killer);
if (r.result?.exceptionDetails || typeof r.result?.result?.value !== 'string') {
  cleanup();
  fail(`the harness failed: ${r.result?.exceptionDetails?.exception?.description || JSON.stringify(r.result || r.error).slice(0, 400)}${consoleErrors.length ? `\npage errors:\n${consoleErrors.join('\n')}` : ''}`);
}
result = JSON.parse(r.result.result.value);
ws.close(); cleanup();

/* ---------- the report ---------- */
const ICON = { pass: 'pass', fail: 'FAIL', warn: 'warn', skip: 'skip' };
const groups = flag('--all') ? ['static', 'dynamic', 'content'] : ['dynamic'];
const counted = result.checks.filter(c => groups.includes(c.group));
const where = w => w ? ` [${[w.size, w.palette, w.dpr > 1 ? `dpr ${w.dpr}` : null, w.t != null ? `t = ${w.t} s` : null, w.param].filter(Boolean).join(' · ')}]` : '';
console.log(`Loci checks for ${result.id || pkgDir} in ${exe.split('/').pop()} (${Math.round(result.durationMs / 1000)} s, ${result.playSeconds} s per run)`);
for (const t of result.targets || []) console.log(`  target ${t.id}: ${t.runtime}/${t.render}, ${t.ran ? t.matrix : t.note}`);
for (const g of groups) {
  const list = result.checks.filter(c => c.group === g);
  if (!list.length) continue;
  console.log(`\n${g}:`);
  for (const c of list) console.log(`  ${ICON[c.status]}  ${c.title}${where(c.where)}${c.status === 'pass' ? '' : `\n        ${c.detail}`}`);
}
const n = s => counted.filter(c => c.status === s).length;
const other = result.checks.filter(c => !groups.includes(c.group) && c.status === 'fail').length;
console.log(`\n${groups.join(' + ')}: ${n('pass')} passed, ${n('fail')} failed, ${n('warn')} warnings, ${n('skip')} skipped.${other ? ` (${other} other check${other === 1 ? '' : 's'} failed: the static ones are the registry's "check" job; run with --all to see them.)` : ''}`);
if (consoleErrors.length) console.log(`page errors:\n  ${consoleErrors.join('\n  ')}`);
if (opt('--json')) writeFileSync(opt('--json'), JSON.stringify({ ...result, counted: groups, failures: n('fail'), pageErrors: consoleErrors }, null, 2) + '\n');
process.exit(n('fail') ? 1 : 0);
