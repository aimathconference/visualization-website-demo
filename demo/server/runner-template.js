// Builds the sandboxed runner page for one visualization (DEMO_PLAN.md section 6, layer 1).
// The page is loaded in <iframe sandbox="allow-scripts"> (opaque origin) and served with a CSP that
// blocks all network access. Kit helpers, the runtime and the guarded code are inlined with a nonce.

import { randomBytes } from 'node:crypto';
import { FRAME_BUDGET_MS } from './guard.js';

// Helpers every visualization may use (same as the mockup's kit), plus the hooks the guarded code needs,
// which must exist before that code runs.
const KIT = String.raw`
var __frameStart=0, __vizExport=null, __earlyError=null;
window.__loci={ overtime:()=>performance.now()-__frameStart>__BUDGET__, define(v){ __vizExport=v; } };
window.addEventListener('error',ev=>{ if(!__earlyError) __earlyError=ev.error||new Error(ev.message); });
function hex(h){ h=h.replace('#',''); if(h.length===3) h=h.split('').map(c=>c+c).join(''); const n=parseInt(h,16); return [n>>16&255, n>>8&255, n&255]; }
function mix(a,b,t){ return [a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t, a[2]+(b[2]-a[2])*t]; }
function rgba(h,a){ const c=hex(h); return 'rgba('+c[0]+','+c[1]+','+c[2]+','+a+')'; }
function label(ctx,P,str,x,y,o={}){
  if(!P.labels) return;
  ctx.save(); ctx.globalAlpha=o.alpha??1; ctx.fillStyle=o.color||P.fg;
  ctx.font=(o.weight||400)+' '+(o.size||13)+'px '+P.font; ctx.textAlign=o.align||'left'; ctx.textBaseline='alphabetic';
  ctx.fillText(str,x,y); ctx.restore();
}
function clipBox(ctx,B){ ctx.save(); ctx.beginPath(); ctx.rect(B.x,B.y,B.w,B.h); ctx.clip(); }
function fsFor(B){ return Math.round(Math.max(12, Math.min(16, B.w/34))); }
`;

// Talks to the parent page; see the message table in DEMO_PLAN.md section 6.
const RUNTIME = String.raw`
(function(){
  const canvas=document.querySelector('canvas'), ctx=canvas.getContext('2d');
  const viz=__vizExport;
  let theme=null, settings=null, pads={t:16,r:16,b:16,l:16}, t=0, S={};
  let paused=true, dead=false, raf=0, last=0, w=0, h=0, dpr=1, perfSum=0, perfN=0, perfAt=0;
  const post=m=>parent.postMessage(Object.assign({loci:1},m),'*');
  const lineOf=e=>{ const m=String(e&&e.stack||'').match(/:(\d+):\d+\)?\s*(\n|$)/); if(!m) return null; const n=+m[1]-__CODE_LINE__+1; return n>0?n:null; };
  function die(e){ if(dead) return; dead=true; cancelAnimationFrame(raf); post({type:'error', message:String(e&&e.message||e), line:lineOf(e)}); }
  window.addEventListener('error',ev=>{ ev.preventDefault(); die(ev.error||ev.message); });
  function size(){ const r=canvas.getBoundingClientRect(); w=r.width; h=r.height; canvas.width=Math.max(1,Math.round(w*dpr)); canvas.height=Math.max(1,Math.round(h*dpr)); }
  function render(){
    if(dead||!viz||!settings) return;
    if(!w) size();
    ctx.setTransform(dpr,0,0,dpr,0,0);
    const B={x:pads.l, y:pads.t, w:Math.max(100,w-pads.l-pads.r), h:Math.max(100,h-pads.t-pads.b)};
    const P={bg:theme.bg, fg:theme.fg, a1:theme.a1, a2:theme.a2, font:theme.font, lw:settings.lw, labels:settings.labels, param:settings.param};
    __frameStart=performance.now();
    try{ viz.draw(ctx,w,h,t,P,S,B); }catch(e){ die(e); return; }
    const ms=performance.now()-__frameStart; perfSum+=ms; perfN++;
    if(__frameStart-perfAt>1000){ if(!paused) post({type:'perf', avgFrameMs:perfSum/perfN}); perfSum=0; perfN=0; perfAt=__frameStart; }
  }
  function frame(now){ raf=0; const dt=Math.min(0.05,(now-last)/1000); last=now; t+=dt*settings.speed; render(); if(!paused&&!dead) raf=requestAnimationFrame(frame); }
  // The page doesn't know the parameter's default until "ready", so null means "use the code's value".
  const withParam=s=>{ if(s.param==null&&viz&&viz.param&&typeof viz.param.value==='number') s.param=viz.param.value; return s; };
  function resume(){ if(dead||!paused) return; paused=false; last=performance.now(); raf=requestAnimationFrame(frame); }
  function pause(){ paused=true; cancelAnimationFrame(raf); raf=0; }
  async function addFonts(list){
    for(const f of list||[]){ try{ const face=new FontFace(f.family,f.data,{weight:String(f.weight||400)}); await face.load(); document.fonts.add(face); }catch(e){} }
  }
  // Only the embedding page may drive the runner.
  window.addEventListener('message',async ev=>{
    if(ev.source!==parent) return;
    const m=ev.data||{};
    if(m.type==='init'){
      theme=m.theme; settings=withParam(Object.assign({},m.settings)); pads=m.pads||pads; dpr=Math.min(2,m.dpr||1);
      t=typeof m.t==='number'?m.t:(viz&&typeof viz.t0==='number'?viz.t0:0);
      await addFonts(m.fonts); size(); render();
      if(!dead) post({type:'ready', param:viz&&viz.param?JSON.parse(JSON.stringify(viz.param)):null});
      if(!m.paused) resume();
    }else if(m.type==='set'){
      if(m.theme) theme=m.theme; if(m.settings) settings=withParam(Object.assign({},settings,m.settings)); if(m.pads) pads=m.pads;
      if(m.fonts) await addFonts(m.fonts);
      if(paused) render();
    }else if(m.type==='pause') pause();
    else if(m.type==='resume') resume();
    else if(m.type==='snapshot'){ render(); let data=null; try{ data=canvas.toDataURL('image/webp',0.85); }catch(e){} post({type:'snapshot', id:m.id, data}); }
  });
  new ResizeObserver(()=>{ size(); if(paused) render(); }).observe(canvas);
  canvas.addEventListener('dblclick',ev=>post({type:'dblclick', x:ev.clientX, y:ev.clientY}));
  window.addEventListener('keydown',ev=>{ if(!ev.metaKey&&!ev.ctrlKey&&!ev.altKey) post({type:'key', key:ev.key}); });
  if(__earlyError) die(__earlyError);
  else if(!viz||typeof viz.draw!=='function') die(new Error('The code ran but did not export an object with a draw function.'));
  else post({type:'loaded'});
})();
`;

export const RUNNER_CSP = nonce =>
  `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'unsafe-inline'; img-src data: blob:; ` +
  `connect-src 'none'; font-src 'none'; media-src 'none'; form-action 'none'; base-uri 'none'; frame-ancestors 'self'`;

/** @param {string} guardedCode output of guard() */
export function runnerPage(guardedCode) {
  const nonce = randomBytes(16).toString('base64');
  const esc = s => s.replace(/<\/script/gi, '<\\/script');
  const head = `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>html,body{margin:0;height:100%;overflow:hidden;background:transparent}canvas{display:block;width:100%;height:100%;touch-action:pan-y}</style>
</head><body><canvas></canvas>
<script nonce="${nonce}">${esc(KIT.replace('__BUDGET__', String(FRAME_BUDGET_MS)))}</script>
<script nonce="${nonce}">
`;
  // The user's code starts on the line after this one; the runtime uses it to map errors back to their source.
  const codeLine = head.split('\n').length;
  const runtime = RUNTIME.replace('__CODE_LINE__', String(codeLine));
  const html = `${head}${esc(guardedCode)}
</script>
<script nonce="${nonce}">${esc(runtime)}</script>
</body></html>`;
  return { html, csp: RUNNER_CSP(nonce) };
}

/** Shown in place of a runner when the code can't be prepared (e.g. it was removed). */
export function runnerErrorPage(message) {
  const nonce = randomBytes(16).toString('base64');
  return {
    html: `<!doctype html><meta charset="utf-8"><body style="margin:0"><script nonce="${nonce}">parent.postMessage({loci:1,type:'error',message:${JSON.stringify(message).replace(/</g, '\\u003c')}},'*')</script>`,
    csp: RUNNER_CSP(nonce),
  };
}
