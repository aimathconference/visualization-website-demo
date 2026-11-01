#!/usr/bin/env node
/* One registry entry through the whole check (docs/submission-spec-slop.md, section 10): the static gate and the
 * dynamic checks, exactly as the chalkboard runs them (checks.js), the dynamic half in headless Chromium.
 *
 *   node scripts/check-entry.mjs <entries-dir> <slug> [--json out.json] [--browser <path>] [--static] [--frames <dir>] [--verbose]
 *
 * Reads <entries-dir>/<slug>.js, .md and .wasm (if there is one), and whether <entries-dir>/../sources/<slug>/BUILD
 * exists; the other entries in <entries-dir> are the duplicates to compare against, and <entries-dir>/../tags.json (if
 * there is one) the tag vocabulary. Without --static it serves this repository on 127.0.0.1 (the runtime needs its
 * files from the page's origin: runner.html, worker.js, kit.js, vendor/), opens a small page in headless Chromium that
 * loads vendor/acorn.js, tex.js, KaTeX (if installed), kit.js, spec.js, runtime.js and checks.js, and calls
 * EigenReelChecks.run. --static runs the static half under node and skips the browser.
 *
 * Prints one line per check. --json writes {slug, ok, checks: [{id, group, title, status, detail, where?}], meta: {title},
 * durationMs}; the registry's check.yml reads the rows with group 'dynamic'. --frames writes the frames attached to
 * failing or warning checks as PNGs.
 * Exit code: 0 the static checks passed (dynamic results never fail it), 1 a static check failed, 2 the harness
 * could not run. Needs Node 22+ (global WebSocket) and Chromium or Chrome (--browser, $CHROME, or on PATH). */
import { createServer } from 'node:http';
import { spawn, execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, existsSync, statSync, mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve, extname, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const args = process.argv.slice(2), flag = n => args.includes(n), opt = n => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
const VALUED = ['--json', '--browser', '--frames', '--timeout'];
const pos = args.filter((a, i) => !a.startsWith('--') && !VALUED.includes(args[i - 1]));
const die = (m, code = 2) => { console.error(`check-entry: ${m}`); process.exit(code); };
const verbose = flag('--verbose');
const [dirArg, slug] = pos;
if (!dirArg || !slug || flag('--help')) die('usage: node scripts/check-entry.mjs <entries-dir> <slug> [--json out.json] [--browser <path>] [--static] [--frames <dir>] [--verbose]');
const DIR = resolve(dirArg);
if (!existsSync(DIR) || !statSync(DIR).isDirectory()) die(`${dirArg} is not a folder`);
const TIMEOUT = (Number(opt('--timeout')) || 240) * 1000;

/* ---------- the entry, as data ---------- */
const file = n => { const p = join(DIR, n); return existsSync(p) && statSync(p).isFile() ? p : null; };
const js = file(`${slug}.js`), md = file(`${slug}.md`), wasm = file(`${slug}.wasm`);
const piece = {
  slug,
  source: js ? readFileSync(js, 'utf8') : null,
  md: md ? readFileSync(md, 'utf8') : null,
  wasm: wasm ? readFileSync(wasm) : null,
  hasBuild: existsSync(join(DIR, '..', 'sources', slug, 'BUILD')),
};
const others = readdirSync(DIR).filter(n => n.endsWith('.js') && n !== `${slug}.js`)
  .map(n => ({ slug: n.slice(0, -3), sha256: createHash('sha256').update(readFileSync(join(DIR, n))).digest('hex') }));
let vocabulary;
try { const v = JSON.parse(readFileSync(join(DIR, '..', 'tags.json'), 'utf8')); if (Array.isArray(v)) vocabulary = v; } catch { /* the default vocabulary */ }
const KATEX = ['demo/github/registry/.eigenreel/node_modules/katex', 'demo/node_modules/katex', 'node_modules/katex'].map(p => join(ROOT, p)).find(p => existsSync(join(p, 'dist', 'katex.min.js')));

/* ---------- printing ---------- */
const MARK = { pass: 'pass', fail: 'FAIL', warn: 'warn', skip: 'skip' };
function print(r) {
  console.log(`EigenReel checks: ${slug}${r.meta && r.meta.title ? ` (“${r.meta.title}”)` : ''}`);
  for (const c of r.checks) {
    const [first, ...rest] = String(c.detail || '').split('\n');
    console.log(`  ${MARK[c.status] || c.status}  ${c.group.padEnd(7)}  ${c.title}: ${first}`);
    for (const l of rest) console.log(`                   ${l}`);
  }
  const n = s => r.checks.filter(c => c.status === s).length;
  console.log(`\n${r.ok ? 'Static checks passed' : 'Static checks FAILED'}: ${n('pass')} pass, ${n('fail')} fail, ${n('warn')} warn, ${n('skip')} skip (${(r.durationMs / 1000).toFixed(1)} s).`);
}
function finish(r) {
  print(r);
  if (opt('--json')) {
    const out = { slug, ok: r.ok, checks: r.checks.map(({ frame, frames, ...c }) => c), meta: { title: r.meta && r.meta.title || null }, durationMs: r.durationMs };
    writeFileSync(opt('--json'), JSON.stringify(out, null, 2) + '\n');
  }
  process.exit(r.ok ? 0 : 1);
}

/* ---------- --static: under node ---------- */
if (flag('--static')) {
  if (KATEX) globalThis.katex = require(KATEX);
  globalThis.acorn = require(join(ROOT, 'vendor/acorn.js'));
  globalThis.EigenReelTeX = require(join(ROOT, 'tex.js'));
  require(join(ROOT, 'spec.js'));
  const Checks = require(join(ROOT, 'checks.js'));
  const r = await Checks.run(piece, { dynamic: false, others, vocabulary }).catch(e => die(`the checker crashed: ${e.stack || e}`));
  finish(r);
}

/* ---------- the browser ---------- */
function findBrowser() {
  for (const c of [opt('--browser'), process.env.CHROME, '/usr/bin/chromium', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', 'chromium', 'chromium-browser', 'google-chrome', 'google-chrome-stable']) {
    if (!c) continue;
    if (c.includes('/')) { if (existsSync(c)) return c; continue; }
    try { return execFileSync('which', [c], { encoding: 'utf8' }).trim(); } catch { /* not on PATH */ }
  }
  return null;
}
const exe = findBrowser(); if (!exe) die('no Chrome or Chromium found (pass --browser <path> or set CHROME)');

/* the site's font, self-hosted from @fontsource when the demo's dependencies are installed; without it the pieces
   draw in sans-serif and the checks still run */
const FONT_DIR = ['demo/node_modules/@fontsource/manrope/files', 'node_modules/@fontsource/manrope/files'].map(p => join(ROOT, p)).find(p => existsSync(p));
const FONTS_CSS = FONT_DIR ? [400, 700].map(w => `@font-face{font-family:"Manrope";font-style:normal;font-weight:${w};src:url(/__font/manrope-latin-${w}-normal.woff2) format("woff2")}`).join('\n') : '';
const PAGE = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>EigenReel entry check</title>
${FONT_DIR ? '<link rel="stylesheet" href="/__fonts.css">' : ''}
<style>:root{--f-body:"Manrope",system-ui,sans-serif;--bg:#050508;--fg:#ecebf5} body{margin:0;background:#050508;color:#ecebf5;font:14px sans-serif} #preview{width:360px}</style></head>
<body><div id="preview"></div>
<script src="/vendor/acorn.js"></script><script src="/tex.js"></script>${KATEX ? '<script src="/__katex.js"></script>' : ''}
<script src="/kit.js"></script><script src="/spec.js"></script><script src="/runtime.js"></script><script src="/checks.js"></script>
</body></html>`;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.wasm': 'application/wasm', '.woff2': 'font/woff2' };
const DATA = JSON.stringify({ ...piece, wasm: piece.wasm ? piece.wasm.toString('base64') : null, others, vocabulary: vocabulary || null });
const server = createServer((q, res) => {
  const u = new URL(q.url, 'http://x'), send = (type, body) => { res.writeHead(200, { 'content-type': type, 'cache-control': 'no-store' }); res.end(body); };
  if (u.pathname === '/__check.html') return send('text/html', PAGE);
  if (u.pathname === '/__entry.json') return send('application/json', DATA);
  if (u.pathname === '/__fonts.css') return send('text/css', FONTS_CSS);
  if (u.pathname === '/__katex.js' && KATEX) return send('text/javascript', readFileSync(join(KATEX, 'dist', 'katex.min.js')));
  if (u.pathname.startsWith('/__font/') && FONT_DIR) { const p = join(FONT_DIR, u.pathname.slice(8).replace(/[^\w.-]/g, '')); if (existsSync(p)) return send('font/woff2', readFileSync(p)); }
  const p = resolve(ROOT, u.pathname.slice(1));
  if (!p.startsWith(ROOT + sep) || p.slice(ROOT.length).includes(`${sep}.`) || !existsSync(p) || !statSync(p).isFile()) { res.writeHead(404); return res.end('not found'); }
  send(TYPES[extname(p)] || 'application/octet-stream', readFileSync(p));
});
const port = await new Promise(r => server.listen(0, '127.0.0.1', () => r(server.address().port)));
const TMP = mkdtempSync(join(tmpdir(), 'eigenreel-check-'));
const chrome = spawn(exe, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${join(TMP, 'profile')}`, '--no-first-run', '--no-default-browser-check',
  '--window-size=1280,1000', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
  '--disable-backgrounding-occluded-windows', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
const cleanup = () => { try { chrome.kill('SIGKILL'); } catch { } try { server.close(); } catch { } try { rmSync(TMP, { recursive: true, force: true }); } catch { } };
process.on('exit', cleanup);
setTimeout(() => die(`the checks did not finish within ${TIMEOUT / 1000} s`), TIMEOUT).unref();

try {
  const wsURL = await new Promise((res, rej) => { let b = ''; chrome.stderr.on('data', d => { b += d; const m = b.match(/DevTools listening on (ws:\/\/\S+)/); if (m) res(m[1]); }); chrome.on('exit', c => rej(new Error(`the browser exited (${c})`))); });
  const cdp = new URL(wsURL).port;
  const t = await (await fetch(`http://127.0.0.1:${cdp}/json/new?about:blank`, { method: 'PUT' })).json();
  const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  let id = 0; const wait = new Map(); let loaded = null;
  ws.onmessage = e => {
    const m = JSON.parse(e.data);
    if (m.id && wait.has(m.id)) { wait.get(m.id)(m); wait.delete(m.id); }
    if (m.method === 'Page.loadEventFired' && loaded) loaded();
    if (verbose && m.method === 'Runtime.consoleAPICalled') console.error('[page]', m.params.args.map(a => a.value ?? a.description ?? '').join(' ').slice(0, 400));
    if (m.method === 'Runtime.exceptionThrown') console.error('[page error]', m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
  };
  const cmd = (method, params = {}) => new Promise(r => { const i = ++id; wait.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  await cmd('Page.enable'); await cmd('Runtime.enable');
  await new Promise(async r => { loaded = r; await cmd('Page.navigate', { url: `http://127.0.0.1:${port}/__check.html` }); });
  const ev = async x => { const m = await cmd('Runtime.evaluate', { expression: x, awaitPromise: true, returnByValue: true }); if (m.result?.exceptionDetails) throw new Error(m.result.exceptionDetails.exception?.description || m.result.exceptionDetails.text); return m.result?.result?.value; };
  const r = await ev(`(async()=>{
    const d=await fetch('/__entry.json').then(r=>r.json());
    const wasm=d.wasm?Uint8Array.from(atob(d.wasm),c=>c.charCodeAt(0)):null;
    let last='';
    const r=await EigenReelChecks.run({slug:d.slug, source:d.source, md:d.md, wasm, hasBuild:d.hasBuild},
      {preview:document.getElementById('preview'), dynamic:true, others:d.others, vocabulary:d.vocabulary||undefined,
       onProgress:(t)=>{ if(t!==last){ last=t; console.log('progress: '+t); } }});
    const b64=async b=>{ const u=new Uint8Array(await b.arrayBuffer()); let s=''; for(let i=0;i<u.length;i+=0x8000) s+=String.fromCharCode.apply(null,u.subarray(i,i+0x8000)); return btoa(s); };
    const checks=[];
    for(const c of r.checks){ const {frame,frames,...rest}=c; const fs=frames||(frame?[frame]:[]); rest.png=${opt('--frames') ? 'await Promise.all(fs.map(b64))' : '[]'}; checks.push(rest); }
    return {...r, checks};
  })()`);
  if (!r || !Array.isArray(r.checks)) throw new Error('the page returned no report');
  if (opt('--frames')) {
    mkdirSync(opt('--frames'), { recursive: true });
    for (const c of r.checks) c.png.forEach((b, i) => writeFileSync(join(opt('--frames'), `${slug}-${c.id}-${i + 1}.png`), Buffer.from(b, 'base64')));
  }
  for (const c of r.checks) delete c.png;
  ws.close();
  finish(r);
} catch (e) { cleanup(); die(`the harness failed: ${e.stack || e.message || e}`); }
