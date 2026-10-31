/* ---------- LociSingle: single-file entries (the demo's own format) in this site's module contract ----------
   A single-file entry is entries/<slug>.js in the registry (demo/github/README.md, "The contributor template"):

     const COLORS = { main, secondary, bg?, fg? };            // optional, the first statement
     export default { title, hook, tags, license, t0, param, draw(ctx, w, h, t, P, S, B) { ... } };

   with the kit helpers hex, mix, rgba, label, clipBox and fsFor in scope, P = {bg, fg, a1, a2, font, lw, labels, param},
   S an object kept between frames and B the drawing box. The demo runs it in an iframe (demo/server/runner-template.js)
   after guard.js has rewritten `export default` into `__loci.define(...)` and put a loop guard in every loop.

   module(code, o) wraps such a file into a module of the module API (docs/module-api.md), run by the worker sandbox
   like any upload: o.guarded true takes guard.js's output (a reviewed registry entry: its loop guard stays in effect,
   a frame over 250 ms throws), false the file as written (the New editor; the worker's own stall watchdog applies).
   The adapter gives the entry what its iframe had: the kit, `matchMedia`, and `addEventListener` for keys; the
   canvas gets clientWidth/clientHeight, and when the manifest declares pointer input (manifest(): any entry with an
   `interact` block) the host's pointer and key events are dispatched to the canvas and to that window stand-in.
   manifest(o) generates the loci.json: one range param from `param` when it has one, no presets, canvas2d, the
   entry's COLORS as "colors". Plain script; loads under node too. */
(function(root){
'use strict';
const KIT='hex, mix, rgba, label, clipBox, fsFor';
const KEY_RE=/^[A-Za-z_][A-Za-z0-9_]*$/;
const num=x=>typeof x==='number'&&Number.isFinite(x);

/* the one range param of a manifest, from the entry's `param` ({key, label, min, max, step, value}), or null */
function rangeParam(p){
  if(!p || typeof p!=='object' || !num(p.min) || !num(p.max) || !(p.min<p.max)) return null;
  const step=num(p.step)&&p.step>0?p.step:+((p.max-p.min)/100).toPrecision(3);
  const def=num(p.value)?Math.min(p.max,Math.max(p.min,p.value)):p.min;
  return {key:typeof p.key==='string'&&KEY_RE.test(p.key)?p.key:'param', type:'range', label:typeof p.label==='string'&&p.label.trim()?p.label.slice(0,60):'Parameter', min:p.min, max:p.max, step, default:def};
}
const usesInput=code=>/\binteract\s*:\s*\{/.test(String(code||''));

/* the generated loci.json. o: {id, title, hook, author, license, tags, t0, param, colors, code} */
function manifest(o){
  const p=rangeParam(o.param), m={api:1, id:o.id, title:String(o.title||o.id), hook:String(o.hook||''), author:o.author||'@you', license:String(o.license||'MIT'),
    tags:Array.isArray(o.tags)?o.tags.map(String).slice(0,4):[], runtime:'js', render:'canvas2d', entry:'index.js', params:p?[p]:[], presets:[], motion:'pause',
    t0:num(o.t0)&&o.t0>=0?o.t0:0};
  if(o.colors && typeof o.colors==='object' && o.colors.main && o.colors.secondary) m.colors={...o.colors};
  if(usesInput(o.code)) m.pointer={mode:'custom', drag:true, click:true, keys:true, wheel:false, hint:'Click the piece to interact with it'};
  return m;
}

/* the module source. o: {guarded, key (the param's key, or null), file (shown in the header)} */
function moduleSource(code,o={}){
  const key=o.key&&KEY_RE.test(o.key)?o.key:null, file=o.file||'visualization.js';
  const body=o.guarded?String(code)
    // the file as written: its default export becomes the entry; a block keeps its names apart from the adapter's
    : `{\n${String(code).replace(/^([ \t]*)export\s+default\s+/m,'$1__entry = ')}\n}`;
  return `// ${file}: a single-file entry (export default { title, …, draw(ctx, w, h, t, P, S, B) }), run in this site's module
// contract by the adapter around it (single.js). ${o.guarded?'This is the code as the registry\'s guard prepared it: its loop guard stops a frame that runs over 250 ms.':'Edit the entry between the two adapter blocks.'}
import { ${KIT} } from '@loci/kit';
// ---- adapter: what the entry had in the demo's runner ----
let __frameStart = 0, __entry = null, __w = 1, __h = 1, __canvas = null;
const __loci = { overtime: () => performance.now() - __frameStart > 250, define(v) { __entry = v; } };
const __window = new EventTarget();
const addEventListener = (...a) => __window.addEventListener(...a), removeEventListener = (...a) => __window.removeEventListener(...a);
const matchMedia = q => ({ matches: /hover:\\s*hover|pointer:\\s*fine/.test(String(q)), media: String(q), addEventListener() {}, removeEventListener() {} });
// ---- the entry ----
${body}
// ---- adapter: the module API (docs/module-api.md) ----
const __event = (type, e) => Object.assign(new Event(type), { clientX: e.x, clientY: e.y, offsetX: e.x, offsetY: e.y, button: e.button, buttons: e.buttons, pointerType: e.pointerType, key: e.key, code: e.code, shiftKey: e.shift, ctrlKey: e.ctrl, altKey: e.alt, metaKey: e.meta });
export default {
  setup({ canvas }) {
    __canvas = canvas;
    for (const [k, f] of [['clientWidth', () => __w], ['clientHeight', () => __h]]) try { Object.defineProperty(canvas, k, { get: f, configurable: true }); } catch (_) {}
  },
  onEvent(e) {
    if (e.type === 'keydown' || e.type === 'keyup') __window.dispatchEvent(__event(e.type, e));
    else if (__canvas && __canvas.dispatchEvent && /^(pointer|click|dblclick)/.test(e.type)) __canvas.dispatchEvent(__event(e.type, e));
  },
  draw({ ctx, t, box, theme, params, state }) {
    if (!__entry || typeof __entry.draw !== 'function') throw new Error('the entry must export default { draw(ctx, w, h, t, P, S, B) { ... } }');
    const d = ctx.getTransform().a || 1;
    __w = ctx.canvas.width / d; __h = ctx.canvas.height / d;
    __frameStart = performance.now();
    __entry.draw(ctx, __w, __h, t, { ...theme, param: ${key?`params.${key}`:'undefined'} }, state, box);
  }
};
`;
}

/* What guard.js reads from a file (title, hook, tags, license, t0, param, COLORS), read here with patterns instead
   of a parser: only for a file this site ships (the contributor template the New button starts from), never for
   code from elsewhere, whose metadata comes from the server's guard(). Missing or unreadable fields are left out. */
function readMeta(code){
  const s=String(code||''), m={}, str=k=>{ const x=new RegExp(`^\\s*${k}:\\s*'((?:[^'\\\\]|\\\\.)*)'`,'m').exec(s); return x?x[1].replace(/\\'/g,"'"):undefined; };
  for(const k of ['title','hook','license']){ const v=str(k); if(v!==undefined) m[k]=v; }
  const tags=/^\s*tags:\s*\[([^\]]*)\]/m.exec(s); if(tags) m.tags=[...tags[1].matchAll(/'([^']*)'/g)].map(x=>x[1]);
  const t0=/^\s*t0:\s*(-?[\d.]+)/m.exec(s); if(t0) m.t0=+t0[1];
  const p=/^\s*param:\s*\{([^}]*)\}/m.exec(s);
  if(p){ const o={}; for(const [,k,v] of p[1].matchAll(/(\w+)\s*:\s*('(?:[^'\\]|\\.)*'|-?[\d.]+)/g)) o[k]=v[0]==="'"?v.slice(1,-1):+v; m.param=o; }
  const c=/^const COLORS\s*=\s*\{([\s\S]*?)\};/m.exec(s);
  if(c){ const o={}; for(const [,k,v] of c[1].matchAll(/(\w+)\s*:\s*'(#[0-9a-fA-F]{6})'/g)) o[k]=v.toLowerCase(); if(o.main&&o.secondary) m.colors=o; }
  return m;
}

const api={module:moduleSource, manifest, rangeParam, readMeta};
root.LociSingle=api;
})(typeof globalThis!=='undefined'?globalThis:this);
