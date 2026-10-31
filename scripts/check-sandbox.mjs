#!/usr/bin/env node
/* Attacks on the sandbox, from a piece's point of view: a regression test for docs/review-pipeline.md, "Who enforces what".
 *
 *   node scripts/check-sandbox.mjs [--browser <path>] [--shots <dir>] [--verbose]
 *
 * Starts the real demo server (dev mode, a throwaway database) and a plain static server for the same files, plus a
 * little "other site" that records every request it receives. Everything binds to 127.0.0.1. Then, in headless Chrome,
 * it runs hostile modules and hostile explanations against both, and checks that the catalog still draws, that the
 * kill switch stops a piece and that a crashed tab skips one. No npm dependencies beyond the demo's own; needs Node 22+.
 * Exit code: 0 all passed, 1 a check failed, 2 the harness could not run. */
import { createServer } from 'node:http';
import { spawn, execFileSync } from 'node:child_process';
import { readFileSync, existsSync, statSync, mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve, extname, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2), flag = n => args.includes(n), opt = n => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
const verbose = flag('--verbose'), shots = opt('--shots');
const die = m => { console.error(`check-sandbox: ${m}`); process.exit(2); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const TMP = mkdtempSync(join(tmpdir(), 'loci-sandbox-'));
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
setTimeout(() => die('the checks did not finish within 10 minutes'), 600000).unref();
const wsURL = await new Promise((res, rej) => { let b = ''; chrome.stderr.on('data', d => { b += d; const m = b.match(/DevTools listening on (ws:\/\/\S+)/); if (m) res(m[1]); }); chrome.on('exit', c => rej(new Error(`browser exited (${c})`))); }).catch(e => die(e.message));
const cdpPort = new URL(wsURL).port;
async function open(url, { init } = {}) {
  const t = await (await fetch(`http://127.0.0.1:${cdpPort}/json/new?about:blank`, { method: 'PUT' })).json();
  const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  let id = 0; const wait = new Map(), errors = [], events = new Map();
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && wait.has(m.id)) { wait.get(m.id)(m); wait.delete(m.id); }
    if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
    if (verbose && m.method === 'Runtime.consoleAPICalled') console.error('[page]', m.params.args.map(a => a.value ?? a.description ?? '').join(' ').slice(0, 300));
    const l = events.get(m.method); if (l) l.forEach(f => f(m.params)); };
  const send = (method, params = {}) => new Promise(r => { const i = ++id; wait.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  await send('Page.enable'); await send('Runtime.enable');
  if (init) await send('Page.addScriptToEvaluateOnNewDocument', { source: init });
  const go = u => new Promise(async r => { const f = () => { events.delete('Page.loadEventFired'); r(); }; events.set('Page.loadEventFired', [f]); await send('Page.navigate', { url: u }); });
  await go(url);
  const ev = async x => { const m = await send('Runtime.evaluate', { expression: x, awaitPromise: true, returnByValue: true }); if (m.result?.exceptionDetails) throw new Error(m.result.exceptionDetails.exception?.description || m.result.exceptionDetails.text); return m.result?.result?.value; };
  const shot = async name => { if (!shots) return; const m = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(join(shots, name + '.png'), Buffer.from(m.result.data, 'base64')); };
  return { ev, go, send, shot, errors, on: (n, f) => events.set(n, [f]), close: async () => { await fetch(`http://127.0.0.1:${cdpPort}/json/close/${t.id}`).catch(() => {}); ws.close(); } };
}

/* ---------- the report ---------- */
let failed = 0, total = 0;
const check = (name, ok, detail) => { total++; if (!ok) failed++; console.log(`  ${ok ? 'pass' : 'FAIL'}  ${name}${!ok && detail !== undefined ? `\n        ${typeof detail === 'string' ? detail : JSON.stringify(detail)}` : ''}`); };
const until = async (f, ms = 8000) => { const t = Date.now(); for (;;) { const v = await f(); if (v || Date.now() - t > ms) return v; await sleep(100); } };

/* ---------- hostile modules ---------- */
const DRAW = `export default { draw({ctx,box,theme}){ ctx.fillStyle=theme.fg; ctx.fillRect(box.x,box.y,10,10); return {view:{...R, font:theme.font}}; } };`;
const module_ = body => `const R={}; const done=(k,p)=>Promise.resolve().then(p).then(v=>{R[k]=v;},e=>{R[k]='blocked: '+e.name;});\n${body}\n${DRAW}`;
const HARNESS = `window.__run=(source,ms,o={})=>new Promise(res=>{
  const c=document.createElement('canvas'); c.style.cssText='position:fixed;left:0;top:0;width:400px;height:300px;z-index:9999'; document.body.append(c); const out={views:[],errors:[]};
  const h=LociHost.mount(c,{runtime:'js',render:'canvas2d',source,manifest:{id:'attack-'+Math.random().toString(36).slice(2),render:'canvas2d',params:[]}},{theme:{bg:'#000000',fg:'#ffffff',a1:'#ff0000',a2:'#00ff00',font:o.font||'sans-serif',lw:1,labels:true},params:{},box:{x:0,y:0,w:400,h:300},dpr:1,seed:1,playing:true,size:{w:400,h:300},label:o.label,onError:(k,m)=>out.errors.push(k+': '+m),onView:v=>out.views.push(v)});
  setTimeout(()=>{ out.state=h.state; out.last=out.views[out.views.length-1]||{}; h.dispose(); c.remove(); res(out); },ms);
});`;
const GONE = ['fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource', 'WebTransport', 'importScripts', 'Worker', 'SharedWorker', 'BroadcastChannel', 'indexedDB', 'caches', 'eval', 'FontFace', 'fonts', 'MessageChannel', 'setTimeout', 'setInterval', 'requestAnimationFrame', 'queueMicrotask'];

async function attacks(base, label, privateUrl) {
  console.log(`\nHostile modules, ${label}:`);
  const p = await open(`${base}/`); await p.ev(HARNESS);
  await until(() => p.ev('typeof LociHost==="object"'));
  const r = await p.ev(`__run(${JSON.stringify(module_(`
    R.origin=self.origin; R.hasDocument=typeof parent!=='undefined'||(self.document&&!!self.document.cookie);
    R.left=[]; for(const k of ${JSON.stringify(GONE)}) for(let o=self;o;o=Object.getPrototypeOf(o)){ let v; try{ v=o[k]; }catch(_){ continue; } if(v){ R.left.push(k); break; } }
    try{ (()=>{}).constructor('return 1')(); R.fn='ran'; }catch(e){ R.fn=e.name; }
    done('remote',()=>import/**/(${JSON.stringify(OTHER + '/code.js?' + label.replace(/\W/g, ''))}).then(()=>'loaded'));
    done('remoteJson',()=>import/**/(${JSON.stringify(OTHER + '/data.json?' + label.replace(/\W/g, ''))},{with:{type:'json'}}).then(()=>'loaded'));
    done('private',()=>import/**/(${JSON.stringify(privateUrl)},{with:{type:'json'}}).then(m=>JSON.stringify(m.default).slice(0,200)));
  `))},5000)`);
  const v = r.last;
  check('runs in an opaque origin', v.origin === 'null', v);
  check('no page objects', v.hasDocument === false, v);
  check('network, storage, timers and eval are gone, on the prototype chain too', Array.isArray(v.left) && v.left.length === 0, v.left);
  check('new Function is refused', v.fn === 'EvalError', v.fn);
  check('cannot load code from another site', String(v.remote).startsWith('blocked'), v);
  check('cannot load JSON from another site', String(v.remoteJson).startsWith('blocked'), v.remoteJson);
  check('cannot read this site with the viewer’s cookies', String(v.private).startsWith('blocked'), v.private);
  check('the other site received nothing', !hits.some(h => h.includes(label.replace(/\W/g, ''))), hits);
  const stuck = await p.ev(`(async()=>{ let beats=0; const id=setInterval(()=>beats++,50); const r=await __run(${JSON.stringify(`export default { draw(){ try{ self.postMessage({type:'beat',t:0,ms:0,drawn:true}); }catch(_){} for(;;); } };`)},2500); clearInterval(id); return {...r,beats}; })()`);
  check('an endless loop that forges heartbeats is stopped', stuck.errors.some(e => e.startsWith('stalled')), stuck);
  check('and the page stays responsive meanwhile', stuck.beats > 30, stuck.beats);
  const portGrab = await p.ev(`__run(${JSON.stringify(`const R={grabbed:false}; const d=Object.getOwnPropertyDescriptor(MessageEvent.prototype,'data'); Object.defineProperty(MessageEvent.prototype,'data',{get(){ if(this.target&&this.target.postMessage) R.grabbed=true; return d.get.call(this); }});\n${DRAW}`)},1500)`);
  check('a patched MessageEvent cannot reach the page’s port', portGrab.last.grabbed === false, portGrab);
  const htmlErr = await p.ev(`(async()=>{ const r=await __run(${JSON.stringify(`export default { draw(){ throw new Error('<img src=x onerror="window.__xss=3">'); } };`)},1000); const c=document.createElement('div'); document.body.append(c); return {errors:r.errors}; })()`);
  check('an error message stays text in the host', htmlErr.errors.some(e => e.includes('<img')), htmlErr);
  const burst = await p.ev(`__run(${JSON.stringify(`const f=()=>{ const e=performance.now()+300; while(performance.now()<e); setTimeout(f,20); }; f();\nexport default { draw(){} };`)},1500)`);
  check('code outside draw() has no timers to run on', burst.errors.some(e => e.startsWith('error')), burst);
  await p.close();
}

/* ---------- hostile explanations ---------- */
const XSS = [
  '<img src=x onerror="window.__xss=1">', '<svg onload="window.__xss=1"></svg>', '<script>window.__xss=1</script>',
  '[click](javascript:window.__xss=1)', '[click](JaVaScRiPt:window.__xss=1)', '[click](data:text/html,<script>window.__xss=1</script>)',
  '<a href="javascript:window.__xss=1" data-act="share">x</a>', '<iframe srcdoc="<script>parent.__xss=1</script>"></iframe>',
  '<details open ontoggle="window.__xss=1">x</details>', '<style>body{display:none}</style>', '![pixel](https://example.invalid/pixel.png)',
  '<form action="https://example.invalid"><button>x</button></form>', '<div id="feed" class="stall" style="position:fixed;inset:0" data-close-modal="1">spoof</div>',
].join('\n\n');
async function explanations(base, label) {
  console.log(`\nHostile explanations, ${label}:`);
  const p = await open(`${base}/`);
  await until(() => p.ev('typeof md==="function" && !!window.DOMPurify'));
  const r = await p.ev(`(async()=>{ const el=document.createElement('article'); el.className='md'; document.body.append(el); el.innerHTML=md(touchCopy(${JSON.stringify('# Title\n\nSome *text* with [a link](https://example.com), a [live link](#param:k=2) and $x^2$.\n\n' + XSS)})); await new Promise(r=>setTimeout(r,800));
    const hrefs=[...el.querySelectorAll('a[href]')].map(a=>a.getAttribute('href'));
    const html=el.innerHTML; el.remove(); return {xss:window.__xss||null, html, hrefs, hasMath:/class="tex"/.test(html), hasEm:/<em>text<\\/em>/.test(html)}; })()`);
  check('no script ran', r.xss === null, r.xss);
  check('no event handlers, styles, ids, forms, frames, images or data-* survive', !/onerror|onload|ontoggle|<script|<svg|<img|<iframe|<form|<style|style=|\bid=|data-act|data-close/i.test(r.html), r.html);
  check('no javascript: or data: link survives', r.hrefs.every(h => /^(https?:|#)/.test(h)), r.hrefs);
  check('ordinary Markdown, live links and math still work', r.hasEm && r.hasMath && r.hrefs.includes('https://example.com') && r.hrefs.includes('#param:k=2'), r);
  const off = await p.ev(`(()=>{ const D=window.DOMPurify; window.DOMPurify=undefined; const h=md('<img src=x onerror="window.__xss=2">'); window.DOMPurify=D; return h; })()`);
  check('without the sanitizer, the raw text is shown and no HTML', off.startsWith('<pre class="raw">') && off.includes('&lt;img'), off);
  await p.close();
}

/* ---------- a registry package with HTML in every field ---------- */
async function registryFuzz() {
  console.log('\nA registry package with HTML in every field, on the server:');
  const H = '<img src=x onerror=__xss=1>';
  const base = JSON.parse(readFileSync(join(ROOT, 'demo/github/registry/.loci/catalog-index.json'), 'utf8')).pieces.find(x => x.id === 'rose-curves');
  const man = JSON.parse(JSON.stringify(base.manifest)); man.id = 'fuzz-piece'; man.title = H + ' title'; man.hook = H + ' hook'; man.alt = H + ' alt text that is long enough to count'; man.license = H;
  for (const q of man.params || []) { q.label = H; if (q.hint) q.hint = H; }
  for (const s of man.presets || []) { s.label = H; s.note = H; }
  const md = `# What you're seeing\n\n${H}\n\n# Try this\n\n${H}\n\n**Reference.** ${H}\n`;
  const item = { id: 999, slug: 'fuzz-piece', title: H, hook: H, license: 'MIT', createdAt: '2026-10-01 00:00:00', registryPr: 1, registryPath: 'entries/fuzz-piece/"><img src=x onerror=__xss=1>', tags: [H], author: { handle: 'fuzz"><img src=x onerror=__xss=1>' }, files: { 'loci.json': JSON.stringify(man), 'index.js': base.sources.any ?? Object.values(base.sources)[0], 'explanation.md': md } };
  const init = `(()=>{ const f=window.fetch; window.fetch=async function(u,o){ const r=await f.apply(this,arguments); if(String(u).endsWith('api/registry')){ const j=await r.clone().json(); j.items=[...(j.items||[]),${JSON.stringify(item)}]; return new Response(JSON.stringify(j),{status:200,headers:{'content-type':'application/json'}}); } return r; }; })();`;
  const p = await open(`${SERVER}/?v=fuzz-piece`, { init });
  const shown = await until(() => p.ev(`typeof VIZ!=='undefined' && VIZ.some(v=>v.id==='fuzz-piece')`), 8000);
  check('the package reached the feed', !!shown);
  await sleep(1500);
  for (const tab of ['explain', 'customize']) {
    await p.ev(`openDrawer(${JSON.stringify(tab)},VIZ.find(v=>v.id==='fuzz-piece'))`); await sleep(300);
  }
  const opened = await p.ev(`document.querySelector('#d-body').innerHTML.length>0`);
  check('its drawer opened', opened);
  await p.ev(`document.querySelector('#d-close').click()`); await sleep(200);
  for (const t of ['browse', 'submit', 'admin', 'feed']) { await p.ev(`document.querySelector('#tab-${t}').click()`).catch(() => {}); await sleep(500); }
  const r = await p.ev(`({xss:window.__xss||null, live:[...document.querySelectorAll('img[onerror]')].map(i=>i.parentElement.outerHTML.slice(0,200)+' IN '+(i.closest('[id]')||{}).id)})`);
  check('no field became HTML', r.xss === null && r.live.length === 0, r);
  await p.close();
}

/* ---------- the site still works ---------- */
async function catalog(base, label) {
  console.log(`\nThe catalog, ${label}:`);
  const p = await open(`${base}/`);
  await until(() => p.ev('typeof VIZ!=="undefined" && typeof specFor==="function"'));
  await sleep(1500); await p.shot(`feed-${label}`);
  const place = await until(() => p.ev(`(()=>{ const f=document.querySelector('.stage iframe[sandbox]'); if(!f) return null; const c=f.nextElementSibling, a=f.getBoundingClientRect(), b=c.getBoundingClientRect(), hit=document.elementFromPoint(b.left+b.width/2,b.top+b.height/2); return {sandbox:f.getAttribute('sandbox'), sameBox:Math.abs(a.left-b.left)<1&&Math.abs(a.top-b.top)<1&&Math.abs(a.width-b.width)<1&&Math.abs(a.height-b.height)<1, events:getComputedStyle(f).pointerEvents, top:hit&&hit.tagName, n:document.querySelectorAll('iframe[sandbox]').length, w:b.width}; })()`));
  check('the first slide runs in a sandboxed frame, exactly under its canvas', place && place.sandbox === 'allow-scripts' && place.sameBox && place.events === 'none' && place.w > 0, place);
  check('at most three live frames in the feed', place && place.n <= 4, place);
  const res = await p.ev(`(async()=>{ const out=[]; for(const v of VIZ){ const box={x:0,y:0,w:300,h:220}; try{ const ch=chooseTarget(v,box); if(ch.fallback){ out.push({id:v.id,skip:ch.fallback.message}); continue; }
      const b=await Promise.race([LociHost.poster(specFor(v,ch.id),{w:300,h:220,dpr:1,box,theme:themeFor(v),params:getSettings(v).params,t:3}),new Promise((_,j)=>setTimeout(()=>j(new Error('timeout')),15000))]);
      const bm=await createImageBitmap(b), c=new OffscreenCanvas(bm.width,bm.height).getContext('2d'); c.drawImage(bm,0,0); const d=c.getImageData(0,0,bm.width,bm.height).data; const first=[d[0],d[1],d[2]]; let diff=0; for(let i=0;i<d.length;i+=4) if(Math.abs(d[i]-first[0])+Math.abs(d[i+1]-first[1])+Math.abs(d[i+2]-first[2])>20) diff++;
      out.push({id:v.id,ink:diff/(d.length/4)}); }catch(e){ out.push({id:v.id,err:e.message}); } } return out; })()`);
  // A GPU piece can miss the 500 ms watchdog on this software renderer, as it did before the sandbox. Elsewhere that is a failure.
  const slowHere = res.filter(x => x.err && x.err.startsWith('stalled') && /hopf-fibers/.test(x.id));
  if (slowHere.length) console.log(`  note  ${slowHere.map(x => x.id).join(', ')} missed the watchdog on the software GPU`);
  const bad = res.filter(x => !slowHere.includes(x) && (x.err || (!x.skip && x.ink < 0.001)));
  check(`all ${res.length} pieces draw in the sandbox`, bad.length === 0, bad);
  if (verbose) console.error(res);
  const left = await until(() => p.ev(`document.querySelectorAll('iframe[sandbox][style*="display: none"]').length===0`));
  check('hidden frames go away after use', left);
  const noTrust = await p.ev(`({fallback:LociHost.forceFallback, trusted:specFor(VIZ[0]).trusted})`);
  check('no trusted flag and no main-page fallback', noTrust.fallback === undefined && noTrust.trusted === undefined, noTrust);
  await p.close();
  const fb = await open(`${base}/?fallback=1`); await until(() => fb.ev('typeof LociHost==="object"')); await sleep(1500);
  const em = await open(`${base}/?embed=1&v=elliptic-group-law`);
  await until(() => em.ev(`typeof es!=='undefined' || !!document.querySelector('.e-stage.e-still')`), 5000); await sleep(1000);
  await em.ev(`document.querySelector('.e-stage').click()`);
  check('embed mode draws a still, then runs in a sandboxed frame when played', await until(() => em.ev(`!!document.querySelector('.e-stage iframe[sandbox]:not([style*="display: none"])') && !!document.querySelector('.e-stage canvas.viz')`), 8000));
  await sleep(600); await em.shot(`embed-${label}`); await em.close();
  check('?fallback=1 changes nothing', await until(() => fb.ev(`!!document.querySelector('.stage iframe[sandbox]')`)));
  await fb.close();
}
async function fonts(base) {
  console.log('\nFonts, with no network in the sandbox:');
  const p = await open(`${base}/`); await p.ev(HARNESS); await until(() => p.ev('typeof LociHost==="object"'));
  const fam = await p.ev(`(()=>{ const t=themeFor(VIZ[0]); return t.font; })()`);
  const r = await p.ev(`__run(${JSON.stringify(`const R={};\n${DRAW}`)},5000,{font:${JSON.stringify(fam)}})`);
  const first = String(fam).split(',')[0].replace(/['"]/g, '').trim();
  check(`the theme font (${first}) reaches the module once its bytes arrive`, String(r.last.font).includes(first), r.last);
  await p.close();
}

/* ---------- the kill switch ---------- */
async function killSwitch() {
  console.log('\nThe kill switch, on the server:');
  const p = await open(`${SERVER}/`);
  await until(() => p.ev(`!!document.querySelector('.stage iframe[sandbox]')`));
  const first = await p.ev(`slides[activeIdx].v.id`);
  const call = (m, path, body) => p.ev(`fetch(${JSON.stringify(path)},{method:${JSON.stringify(m)},headers:{'x-loci':'1','content-type':'application/json'},body:${JSON.stringify(JSON.stringify(body || {}))}}).then(r=>r.status)`);
  check('an admin can stop a piece', await call('PUT', `api/admin/blocked/${first}`, { reason: 'test' }) === 200);
  check('a reason is required', await call('PUT', `api/admin/blocked/${first}`, {}) === 400);
  await p.ev(`LociAPI.readBlocked()`);
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
  await p.ev(`LociAPI.readBlocked()`);
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
  if (verbose) console.error('journal', await p.ev(`sessionStorage.getItem('loci:mounting')`));
  p.send('Page.crash').catch(() => {});
  await sleep(1500);
  await p.go(`${STATIC}/`);
  if (verbose) console.error('after', await p.ev(`[sessionStorage.getItem('loci:mounting'),sessionStorage.getItem('loci:crashed')]`));
  const r = await until(() => p.ev(`(()=>{ if(typeof slides==='undefined'||!slides.length) return null; const s=slides.find(x=>x.v.id===${JSON.stringify(first)}), c=s&&s.el.querySelector('.stall'); return c?{text:c.textContent, retry:!!c.querySelector('[data-act="restart"]')}:null; })()`), 8000);
  check('the piece is skipped on reload, with a way to try again', r && /skipped/.test(r.text) && r.retry, r);
  await p.shot('crashed');
  if (r) {
    await p.ev(`slides.find(x=>x.v.id===${JSON.stringify(first)}).el.querySelector('[data-act="restart"]').click()`);
    check('Try again runs it', await until(() => p.ev(`(()=>{ const s=slides.find(x=>x.v.id===${JSON.stringify(first)}); return !s.el.querySelector('.stall') && !!s.el.querySelector('iframe[sandbox]'); })()`), 5000));
  }
  await p.ev(`location.reload()`).catch(() => {}); await sleep(1500);
  check('a clean reload blames nothing', await until(() => p.ev(`typeof LociHost==='object' && !LociHost.isCrashed(${JSON.stringify(first)})`), 4000));
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

try {
  await headers();
  await attacks(SERVER, 'on the server', `${SERVER}/api/me/kv`);
  await attacks(STATIC, 'as static files', `${STATIC}/private.json`);
  await explanations(SERVER, 'on the server');
  await explanations(STATIC, 'as static files');
  await registryFuzz();
  await catalog(SERVER, 'on the server');
  await catalog(STATIC, 'as static files');
  await fonts(STATIC);
  await killSwitch();
  await crash();
} catch (e) { console.error(e); cleanup(); process.exit(2); }
console.log(`\n${total - failed} of ${total} checks passed.`);
cleanup();
process.exit(failed ? 1 : 0);
