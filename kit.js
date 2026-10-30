/* ---------- @loci/kit: helpers every visualization may import ----------
   Loaded on the page (thumbnails, main-thread fallback) and sent as source to each worker,
   which resolves `import { ... } from '@loci/kit'` against exactly these functions. */
function hex(h){ h=h.replace('#',''); if(h.length===3) h=h.split('').map(c=>c+c).join(''); const n=parseInt(h,16); return [n>>16&255, n>>8&255, n&255]; }
function mix(a,b,t){ return [a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t, a[2]+(b[2]-a[2])*t]; }
function rgba(h,a){ const c=hex(h); return `rgba(${c[0]},${c[1]},${c[2]},${a})`; }
function label(ctx,P,str,x,y,o={}){
  if(!P.labels) return;
  ctx.save(); ctx.globalAlpha=o.alpha??1; ctx.fillStyle=o.color||P.fg;
  ctx.font=`${o.weight||400} ${o.size||13}px ${P.font}`; ctx.textAlign=o.align||'left'; ctx.textBaseline='alphabetic';
  if(o.halo!==false && P.bg){ /* a readable halo: a 2.5 px stroke in the background color under the text */
    const c=hex(P.bg); ctx.strokeStyle=`rgba(${c[0]},${c[1]},${c[2]},0.7)`; ctx.lineWidth=2.5; ctx.lineJoin='round'; ctx.miterLimit=2;
    ctx.strokeText(str,x,y);
  }
  ctx.fillText(str,x,y); ctx.restore();
}
function clipBox(ctx,B){ ctx.save(); ctx.beginPath(); ctx.rect(B.x,B.y,B.w,B.h); ctx.clip(); }
function fsFor(B){ return Math.round(Math.max(12, Math.min(16, B.w/34))); }
function mulberry32(a){
  return function(){ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; };
}
const LOCI_KIT=[hex, mix, rgba, label, clipBox, fsFor, mulberry32];
