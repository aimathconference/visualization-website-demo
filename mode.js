/* ---------- light and dark mode ----------
   Two looks: dark is the site's Night theme, and light is Solarized light (the :root and :root[data-mode="light"] blocks
   of styles.css). Each browser follows the device's setting until its visitor picks one from the menu, and keeps that
   choice ('eigenreel:mode'). Loaded in <head>, before the stylesheet paints, so a reload never flashes the other look.
   Also the color helpers the accent and a piece's colors in light mode use (app.js, "accent follows the piece"). */
/* The site was called Loci: move this browser's keys from the old names (loci:…, loci.…, loci-…) to the new ones,
   keeping a value already saved under the new name. Runs before anything reads them. */
(function(){
  for(const store of ['localStorage','sessionStorage']){
    try{
      const s=window[store], old=[];
      for(let i=0;i<s.length;i++){ const k=s.key(i); if(k && /^loci[:.\-]/.test(k)) old.push(k); }
      for(const k of old){ const n='eigenreel'+k.slice(4); if(s.getItem(n)==null) s.setItem(n,s.getItem(k)); s.removeItem(k); }
    }catch(_){}
  }
})();
(function(root){
'use strict';
/* ---------- colors ---------- */
const isHex=c=>typeof c==='string' && /^#[0-9a-f]{6}$/i.test(c);
const rgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
const toHex=a=>'#'+a.map(x=>Math.round(Math.max(0,Math.min(255,x))).toString(16).padStart(2,'0')).join('');
const lum=h=>{ const [r,g,b]=rgb(h).map(v=>{ v/=255; return v<=0.03928?v/12.92:((v+0.055)/1.055)**2.4; }); return 0.2126*r+0.7152*g+0.0722*b; };
const contrast=(a,b)=>{ const [x,y]=[lum(a),lum(b)].sort((p,q)=>q-p); return (x+0.05)/(y+0.05); };
const onColor=c=>contrast(c,'#ffffff')>=contrast(c,'#000000')?'#ffffff':'#000000';
const toHsl=h=>{ const [r,g,b]=rgb(h).map(v=>v/255), hi=Math.max(r,g,b), lo=Math.min(r,g,b), d=hi-lo, l=(hi+lo)/2;
  if(!d) return [0,0,l];
  const s=d/(1-Math.abs(2*l-1)), H=hi===r?((g-b)/d+6)%6:hi===g?(b-r)/d+2:(r-g)/d+4; return [H*60,s,l]; };
const fromHsl=(h,s,l)=>{ const f=n=>{ const k=(n+h/30)%12; return 255*(l-s*Math.min(l,1-l)*Math.max(-1,Math.min(k-3,9-k,1))); }; return toHex([f(0),f(8),f(4)]); };
/* c with its lightness moved, in small steps, darker on a light ground or lighter on a dark one, until it reads at
   `min`:1 on every color of `grounds`. Hue and saturation stay, so amber stays amber instead of going brown. Unchanged
   when it already reads. */
function legible(c,grounds,min=4.5){
  const gs=[].concat(grounds).filter(isHex), worst=x=>Math.min(...gs.map(g=>contrast(x,g)));
  if(!isHex(c) || !gs.length || worst(c)>=min) return c;
  const [h,s,l]=toHsl(c), dark=gs.reduce((a,g)=>a+lum(g),0)/gs.length<0.18;
  for(const to of dark?[1,0]:[0,1])
    for(let t=0.025;t<=1.0001;t+=0.025){ const x=fromHsl(h,s,l+(to-l)*t); if(worst(x)>=min) return x; }
  return worst('#ffffff')>=worst('#000000')?'#ffffff':'#000000';
}

/* ---------- the mode ---------- */
const KEY='eigenreel:mode';
const stored=()=>{ try{ const m=localStorage.getItem(KEY); return m==='light'||m==='dark'?m:null; }catch(_){ return null; } };
const prefersLight=root.matchMedia?root.matchMedia('(prefers-color-scheme: light)'):null;
const device=()=>prefersLight&&prefersLight.matches?'light':'dark';
let mode=stored()||device();
const paint=()=>{ document.documentElement.dataset.mode=mode; };
const api={isHex, contrast, legible, onColor,
  get:()=>mode,
  set(m){ mode=m==='light'?'light':'dark'; try{ localStorage.setItem(KEY,mode); }catch(_){} paint(); if(api.onChange) api.onChange(mode); },
  toggle(){ api.set(mode==='light'?'dark':'light'); },
  onChange:null, // app.js repaints the live pieces and thumbnails
};
/* the device changing (a sunset schedule, say) moves anyone who has not picked */
if(prefersLight && prefersLight.addEventListener) prefersLight.addEventListener('change',()=>{ if(stored()) return; mode=device(); paint(); if(api.onChange) api.onChange(mode); });
paint();
root.SiteMode=api;
})(typeof globalThis!=='undefined'?globalThis:this);
