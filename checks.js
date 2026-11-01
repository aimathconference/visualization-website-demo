/* ---------- EigenReelChecks: a submission's checks, as one report (docs/submission-spec-slop.md, section 10) ----------
   run(piece, opts) -> Promise<report>
     piece  = { slug, source, md, wasm?: ArrayBuffer|Uint8Array|null, hasBuild?: boolean }
              entries/<slug>.js as text, entries/<slug>.md as text, entries/<slug>.wasm as bytes, and whether
              sources/<slug>/BUILD exists.
     opts   = { onProgress(text, fraction), preview: HTMLElement|null (where the checker's canvases go, visible to the
              author; without one they go in a container of the checker's own), dynamic: true|false (default true in a
              browser, false under node), vocabulary: [tag…], others: [{slug, sha256}], site: {bg, fg} }
              others defaults to the catalog (VIZ) in a browser; vocabulary to spec.js's DEFAULT_TAGS.
     report = { ok, checks: [{ id, group: 'static'|'dynamic'|'content', title, status: 'pass'|'fail'|'warn'|'skip', detail,
              where?: {size, device, fullscreen, t}, frame?: Blob, frames?: [Blob, Blob] }], meta, colors, sha256,
              errors, warnings (spec.check's own lists, {file, line, message}), durationMs }
       ok is false iff a static check failed. Dynamic results never change ok: on a pull request they are best effort
       and go to the reviewers (spec, section 10), but they are reported.
   The static group is spec.js's gate (EigenReelSpec.check), one row per rule family; it never runs piece code. The
   dynamic group mounts the piece with EigenReelHost (runtime.js, label 'checker') in the same sandbox as the feed, at
   the phone size (335×490) and the desktop size (1100×700) the piece declares in modes, windowed and full screen:
     setup             ready and a first frame within 4 s (half the watchdog's 8 s), with no error
     ink               at least 2% of the box differs from bg, in each size at t = 2 or t = time.length / 2 (a sparse
                       moment at one of them is noted, not failed: a curve may start over from nothing), counted on
                       4 px blocks so that line art counts by the area it covers
     time-purity       a fresh instance played to t* = min(length, 6) s and one seeked there give the same frame, and two
                       fresh instances agree at the same t and params (0.5% of sampled pixels, as 3×3 means; 2% with webgl2)
     setparam-honesty  in interact mode: drive every control in env.ui (handle.probeUI / handle.fire), a drag and three
                       wheel turns over the box, then remount with the resulting params at the same t. A different frame
                       is a warning with both frames attached: reviewers judge hover-like state
     flashing          at most 3 luminance flashes in any second over the played seconds (the UI layer is not in the capture)
     runtime           any 'stalled', 'memory', 'error' (or other) stop the host reported during the suite
   The content group (image safety, text moderation) needs a service and is reported as skipped.
   Also: htmlProblems(md) (raw HTML and images in an explanation), unzip(arrayBuffer) -> Map, withText(files), flashes,
   sampledDiff. A zip writer is EigenReelGif.zip (gif.js); the chalkboard uses that.
   A plain script (global EigenReelChecks), and a CommonJS module under node for the static part; spec.js is
   root.EigenReelSpec on the page and require('./spec.js') under node. */
(function(root){
'use strict';
const LIMIT_PKG=4*1024*1024;
const PHONE={W:335,H:490}, DESK={W:1100,H:700};
const M=24, FS_PAD=28;          // windowed: CSS px of canvas around the box; full screen: the page's own padding (app.js boxFor)
const SETUP_LIMIT=4000, READY_MAX=8500, CAP_MS=6000, TOTAL_MS=90000, PLAY_MAX=6, PLAY_WALL=9000;
const INK_MIN=0.02, INK_BLOCK=4, PURE_2D=0.005, PURE_GL=0.02, HONEST=0.005, FLASH_D=0.10, FLASH_N=3;
const CONTENT_NOTE='Image safety on captured frames and text moderation need a service; not run.';

const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const now=()=>(typeof performance!=='undefined'?performance.now():Date.now());
const asU8=b=>b instanceof Uint8Array?b:ArrayBuffer.isView(b)?new Uint8Array(b.buffer,b.byteOffset,b.byteLength):new Uint8Array(b);
const kb=n=>n<1024?`${n} B`:n<1048576?`${(n/1024).toFixed(1)} KB`:`${(n/1048576).toFixed(2)} MB`;
const pct=x=>`${(x*100).toFixed(x<0.001&&x>0?3:2)}%`;
const plural=(n,w)=>`${n} ${w}${n===1?'':'s'}`;
function withTimeout(p,ms,msg){ let id; return Promise.race([p,new Promise((_,rej)=>{ id=setTimeout(()=>rej(new Error(msg)),ms); })]).finally(()=>clearTimeout(id)); }
function tryRequire(n){ try{ return typeof require==='function'?require(n):null; }catch(_){ return null; } }
const getSpec=()=>root.EigenReelSpec||tryRequire('./spec.js');
const texLib=()=>root.EigenReelTeX||tryRequire('./tex.js');

/* What an explanation may not hold: raw HTML and images. The page sanitizes them away anyway, so the author should
   hear it here. Code, math and autolinks like <https://example.com> are fine. */
function htmlProblems(md){
  const TeX=texLib(), out=[], blank=s=>s.replace(/[^\n]/g,' ');
  let text=String(md).replace(/^( {0,3})(```|~~~)[^\n]*\n[\s\S]*?(?:^ {0,3}\2[^\n]*$|(?![\s\S]))/gm,blank).replace(/(`+)[\s\S]*?\1/g,blank);
  if(TeX) text=TeX.split(text).parts.map(p=>p.text!=null?p.text:blank(p.raw||'')).join('');
  const line=i=>text.slice(0,i).split('\n').length;
  for(const mm of text.matchAll(/<\/?[a-zA-Z][\w-]*(?:[\s\/][^<>]*)?>|<!--|<\?|<![a-zA-Z]/g)) out.push({line:line(mm.index), msg:`raw HTML (${mm[0].slice(0,40)}): write Markdown instead, or put a literal < in code`});
  for(const mm of text.matchAll(/!\[[^\]]*\]\s*[([]/g)) out.push({line:line(mm.index), msg:'an image: explanations hold text, math and links, because an image from another server tells it who is reading'});
  return out;
}

/* ---------- the report ---------- */
function makeReport(){
  const checks=[];
  const add=(group,id,title,status,detail,extra)=>{ const c={id, group, title, status, detail:detail||''}; if(extra) for(const k of Object.keys(extra)) if(extra[k]!==undefined) c[k]=extra[k]; checks.push(c); return c; };
  return {checks, add};
}

/* ---------- static: spec.check, one row per rule family ---------- */
const FAMILIES=[
  ['files','Slug, files and sizes'], ['metadata','Metadata'], ['colors','COLORS and contrast'], ['params','Params and presets'],
  ['explanation','Explanation'], ['imports','Imports'], ['libraries','Bundled libraries'], ['wasm','WebAssembly'],
  ['webgl2','webgl2 is desktop only'], ['duplicates','Duplicates'],
];
/* which family a message of spec.check belongs to. byMessage maps validateMeta's messages to their field. */
function familyOf(e,slug,byMessage){
  const f=String(e.file||''), m=String(e.message||'');
  if(/\.md$/.test(f)) return 'explanation';
  if(/\.wasm$/.test(f) || /^sources\//.test(f) || /env\.wasm\(\)/.test(m) || /WebAssembly/.test(m)) return 'wasm';
  if(/is identical to entries\//.test(m) || /could not hash/.test(m)) return 'duplicates';
  if(e.line==null && (/^the slug /.test(m) || /^the piece .* is missing$/.test(m) || /\(at most [\d.]+ KB, bundled libraries included\)/.test(m))) return 'files';
  const field=byMessage.get(m);
  if(field!=null){
    const top=field.split(/[.[]/)[0];
    if(top==='colors') return 'colors';
    if(top==='params' || top==='presets') return 'params';
    if(top==='libraries') return 'libraries';
    if(field==='modes.phone' && /webgl2/.test(m)) return 'webgl2';
    return 'metadata';
  }
  if(/COLORS/.test(m)) return 'colors';
  if(/pinned libraries|dynamic import|re-exported/.test(m)) return 'imports';
  return 'metadata';
}
const at=e=>e.line!=null?`${e.file} line ${e.line}: `:`${e.file}: `;
function passDetail(fam,ctx){
  const {slug, source, md, wasm, meta, colors, read, sha256, Spec}=ctx, L=Spec.LIMITS;
  const bytes=s=>new TextEncoder().encode(String(s||'')).length;
  switch(fam){
    case 'files': return `entries/${slug}.js is ${kb(bytes(source))} (at most ${kb(L.js)})${md!=null?`, entries/${slug}.md ${kb(bytes(md))} (at most ${kb(L.md)})`:''}${wasm?`, entries/${slug}.wasm ${kb(asU8(wasm).length)}`:''}.`;
    case 'metadata': return meta?`“${meta.title}”: ${meta.license}, ${(meta.tags||[]).join(', ')}; ${meta.modes?Object.keys(meta.modes).filter(k=>meta.modes[k]).join(' and '):'?'}; ${meta.time?`${meta.time.length} s, ${meta.time.loop?'looping':'plays once'}`:''}; ${meta.context}${meta.interact?'; interactive':''}.`:'';
    case 'colors': { if(!colors) return ''; const bg=colors.bg||(ctx.site&&ctx.site.bg)||'#050508', fg=colors.fg||(ctx.site&&ctx.site.fg)||'#ecebf5';
      return `COLORS is first, with ${Object.keys(colors).join(', ')}; fg on bg ${Spec.contrast(fg,bg).toFixed(2)}:1 (at least 4.5:1).`; }
    case 'params': return meta?`${plural((meta.params||[]).length,'param')}, ${plural((meta.presets||[]).length,'preset')}, all valid.`:'';
    case 'explanation': { if(md==null) return ''; const w=Spec.wordCount?Spec.wordCount(md):null; return `Sections, TeX and links are valid${w!=null?` (${w} words)`:''}.`; }
    case 'imports': return read&&read.imports.length?`Only pinned libraries: ${[...new Set(read.imports)].join(', ')}.`:'No imports.';
    case 'libraries': return meta&&meta.libraries&&meta.libraries.length?meta.libraries.map(l=>`${l.name} ${l.version} (${l.license})`).join(', ')+'.':'No bundled libraries declared.';
    case 'wasm': return wasm?`entries/${slug}.wasm is a valid module of ${kb(asU8(wasm).length)}, and sources/${slug}/BUILD exists.`:'No WebAssembly.';
    case 'webgl2': return meta&&meta.context==='webgl2'?'A webgl2 piece, desktop only.':`Not a webgl2 piece (context ${meta?meta.context:'?'}).`;
    case 'duplicates': return sha256?`sha256 ${sha256.slice(0,12)}… is not another piece's.`:'';
  }
  return '';
}
async function staticChecks(R,piece,opts,out){
  const Spec=getSpec();
  if(!Spec){ R.add('static','spec','The static gate','fail','spec.js (EigenReelSpec) is not loaded, so nothing was checked.'); return null; }
  const slug=String(piece.slug||''), wasm=piece.wasm!=null?asU8(piece.wasm):null;
  const res=await Spec.check({slug, source:piece.source, md:piece.md, wasm, hasBuild:!!piece.hasBuild, others:opts.others, vocabulary:opts.vocabulary, site:opts.site});
  out.meta=res.meta||null; out.colors=res.colors||null; out.sha256=res.sha256||null; out.errors=res.errors; out.warnings=res.warnings;
  const byMessage=new Map();
  if(res.meta) for(const e of Spec.validateMeta(res.meta,res.colors,{vocabulary:opts.vocabulary, site:opts.site})) if(!byMessage.has(e.message)) byMessage.set(e.message,e.field);
  const errs=new Map(FAMILIES.map(([id])=>[id,[]])), warns=new Map(FAMILIES.map(([id])=>[id,[]]));
  for(const e of res.errors) errs.get(familyOf(e,slug,byMessage)).push(e);
  const forbidden=[];
  for(const w of res.warnings){ if(/^the sandbox blocks /.test(w.message)) forbidden.push(w); else warns.get(familyOf(w,slug,byMessage)).push(w); }
  const ctx={slug, source:piece.source, md:piece.md, wasm, meta:res.meta, colors:res.colors, read:res.read, sha256:res.sha256, Spec, site:opts.site};
  const blocked=!res.read || !res.read.ok;
  for(const [id,title] of FAMILIES){
    const E=errs.get(id), W=warns.get(id);
    if(E.length) R.add('static',id,title,'fail',E.map(e=>at(e)+e.message).join('\n'));
    else if(W.length) R.add('static',id,title,'warn',W.map(e=>at(e)+e.message).join('\n'));
    else if(blocked && ['metadata','colors','params','libraries','webgl2'].includes(id) && !res.meta) R.add('static',id,title,'skip','Not judged: the source could not be read (see the failures above).');
    else R.add('static',id,title,'pass',passDetail(id,ctx));
  }
  R.add('static','forbidden','Forbidden APIs',forbidden.length?'warn':'pass',forbidden.length
    ?forbidden.map(e=>at(e)+e.message).join('\n')+'\nThe sandbox blocks these anyway; the warning tells you why a call does nothing.'
    :'No reference to fetch, XMLHttpRequest, WebSocket, importScripts, indexedDB, localStorage, FontFace, Image, eval, Function or import().');
  return res;
}

/* ---------- pixels ---------- */
async function pixels(blob){
  const bm=await createImageBitmap(blob,{colorSpaceConversion:'none', premultiplyAlpha:'none'});
  const oc=new OffscreenCanvas(bm.width,bm.height), c=oc.getContext('2d',{willReadFrequently:true});
  c.drawImage(bm,0,0); if(bm.close) bm.close();
  const d=c.getImageData(0,0,oc.width,oc.height);
  return {data:d.data, w:d.width, h:d.height, blob};
}
const hexRGB=h=>{ const n=parseInt(String(h).slice(1,7),16); return [n>>16&255,n>>8&255,n&255]; };
/* the box in device pixels; cell = {cw, ch, box} in CSS px */
function devBox(img,cell){ const s=img.w/cell.cw, b=cell.box; return {x:Math.round(b.x*s), y:Math.round(b.y*s), w:Math.round(b.w*s), h:Math.round(b.h*s), s}; }
/* ink: the share of the box that has something drawn. Counted on blocks of INK_BLOCK CSS px, a block counting when any of
   its pixels differs from bg, so thin line art counts by the area it covers rather than by its 1 or 2 px of stroke.
   pixels: the plain share of pixels, for the report. */
function inkFraction(img,cell,bg){
  const B=devBox(img,cell), [r,g,b]=hexRGB(bg), d=img.data, K=Math.max(1,Math.round(INK_BLOCK*B.s));
  const off=i=>Math.abs(d[i]-r)>8||Math.abs(d[i+1]-g)>8||Math.abs(d[i+2]-b)>8;
  let n=0, ink=0, pn=0, pink=0;
  for(let by=B.y;by+K<=B.y+B.h;by+=K) for(let bx=B.x;bx+K<=B.x+B.w;bx+=K){
    n++; let hit=false;
    for(let y=by;y<by+K;y++) for(let x=bx;x<bx+K;x++){ pn++; if(off((y*img.w+x)*4)){ pink++; hit=true; } }
    if(hit) ink++;
  }
  return {blocks:n?ink/n:0, pixels:pn?pink/pn:0};
}
/* the share of sampled box pixels that differ, compared as 3×3 means (a channel more than 12 apart): two canvases can
   anti-alias the same thin line differently (accelerated or not), which is not a different picture */
function sampledDiff(a,b,cell){
  if(a.w!==b.w||a.h!==b.h) return 1;
  const B=devBox(a,cell), W=a.w, A=a.data, Bd=b.data; let n=0, diff=0;
  const x0=Math.max(1,B.x), y0=Math.max(1,B.y), x1=Math.min(W-1,B.x+B.w), y1=Math.min(a.h-1,B.y+B.h);
  for(let y=y0;y<y1;y+=2) for(let x=x0;x<x1;x+=2){
    n++;
    for(let c=0;c<3;c++){
      let s=0;
      for(let dy=-1;dy<=1;dy++){ const row=((y+dy)*W+x)*4+c; s+=A[row-4]+A[row]+A[row+4]-Bd[row-4]-Bd[row]-Bd[row+4]; }
      if(Math.abs(s)>12*9){ diff++; break; }
    }
  }
  return n?diff/n:0;
}
const lin=c=>{ c/=255; return c<=0.04045?c/12.92:Math.pow((c+0.055)/1.055,2.4); };
function boxLuminance(img,cell){
  const B=devBox(img,cell), d=img.data; let s=0,n=0;
  for(let y=B.y;y<B.y+B.h;y+=3) for(let x=B.x;x<B.x+B.w;x+=3){ const i=(y*img.w+x)*4; s+=0.2126*lin(d[i])+0.7152*lin(d[i+1])+0.0722*lin(d[i+2]); n++; }
  return n?s/n:0;
}
/* a transition is a swing of ≥ 10% relative luminance from the last extreme, in the other direction;
   samples are [{t (s), L}], and worst is the most transitions in any 1 s window */
function flashes(samples){
  const tr=[]; if(samples.length<2) return {worst:0, at:null, tr};
  let hi=samples[0].L, lo=samples[0].L, dir=0;
  for(const s of samples){
    if(s.L>hi) hi=s.L; if(s.L<lo) lo=s.L;
    if(dir>=0 && hi-s.L>=FLASH_D){ tr.push(s); dir=-1; lo=s.L; hi=s.L; }
    else if(dir<=0 && s.L-lo>=FLASH_D){ tr.push(s); dir=1; hi=s.L; lo=s.L; }
  }
  let worst=0, at=null;
  for(let i=0;i<tr.length;i++){ let j=i; while(j<tr.length && tr[j].t-tr[i].t<1) j++; if(j-i>worst){ worst=j-i; at=tr[i]; } }
  return {worst, at, tr};
}

/* ---------- dynamic ---------- */
/* the sizes the piece declares: phone and desktop, each windowed and full screen */
function configs(meta){
  const modes=meta&&meta.modes&&typeof meta.modes==='object'?meta.modes:{desktop:true}, out=[];
  for(const [device,S] of [['phone',PHONE],['desktop',DESK]]){
    if(modes[device]!==true) continue;
    out.push({device, fullscreen:false, cw:S.W+2*M, ch:S.H+2*M, box:{x:M,y:M,w:S.W,h:S.H}, label:`${device} ${S.W}×${S.H}`, size:`${S.W}×${S.H}`});
    out.push({device, fullscreen:true, cw:S.W, ch:S.H, box:{x:FS_PAD,y:FS_PAD,w:S.W-2*FS_PAD,h:S.H-2*FS_PAD}, label:`${device} ${S.W}×${S.H} full screen`, size:`${S.W}×${S.H}`});
  }
  return out;
}
const whereOf=(cfg,t)=>({size:cfg.size, device:cfg.device, fullscreen:cfg.fullscreen, ...(t!=null?{t:Math.round(t*1000)/1000}:{})});

function mounter(ctx){
  return function mount(cfg,o={}){
    const cv=document.createElement('canvas');
    cv.style.cssText=`display:block;width:100%;max-width:${Math.min(360,cfg.cw)}px;aspect-ratio:${cfg.cw} / ${cfg.ch};margin:0 0 6px`;
    cv.title=`${cfg.label}${o.mode==='interact'?' · interact':''}`; cv.setAttribute('aria-hidden','true');
    ctx.holder.appendChild(cv);
    const rec={cfg, cv, errs:[], t0:now()};
    let rej; rec.failed=new Promise((_,r)=>rej=r); rec.failed.catch(()=>{});
    const onError=(k,m)=>{ rec.errs.push({kind:k, message:m}); ctx.errors.push({kind:k, message:String(m||''), where:whereOf(cfg,rec.h&&rec.h.getTime?rec.h.getTime():null)}); rej(new Error(`${k}: ${m}`)); };
    rec.h=EigenReelHost.mount(cv,ctx.piece,{params:o.params||ctx.defaults, t:o.t||0, playing:false, device:cfg.device, mode:o.mode||'feed', fullscreen:cfg.fullscreen,
      box:cfg.box, dpr:1, size:{w:cfg.cw,h:cfg.ch}, site:ctx.site, label:'checker', onError});
    ctx.live.add(rec);
    const errMsg=()=>`${rec.errs[0].kind}: ${rec.errs[0].message}`;
    rec.ready=(async()=>{
      const until=now()+READY_MAX;
      while(rec.h.state==='loading'){ if(rec.errs.length) throw new Error(errMsg()); if(now()>until) throw new Error(`setup did not finish within ${READY_MAX/1000|0} s`); await sleep(20); }
      if(rec.errs.length) throw new Error(errMsg());
      if(rec.h.state!=='running') throw new Error(rec.h.state);
    })();
    rec.capture=async()=>{
      try{ const blob=await withTimeout(Promise.race([rec.h.capture(),rec.failed]),CAP_MS,'capture timed out'); return await pixels(blob); }
      catch(e){ await sleep(0); throw rec.errs.length?new Error(errMsg()):e; }
    };
    /* ready and a first frame: the setup time the check judges */
    rec.first=async()=>{ await rec.ready; const img=await rec.capture(); rec.setupMs=now()-rec.t0; return img; };
    rec.at=async t=>{ rec.h.seek(t); return rec.capture(); };
    rec.dispose=()=>{ try{ rec.h.dispose(); }catch(_){} cv.remove(); ctx.live.delete(rec); };
    return rec;
  };
}

/* one size: setup and ink, played vs seeked (sampling luminance while it plays), two fresh instances, setParam honesty */
async function runConfig(ctx,cfg){
  const r={cfg, setup:[], ink:[], pure:[], honest:null, lum:[], err:null};
  const {mount, meta, length}=ctx, tol=meta.context==='webgl2'?PURE_GL:PURE_2D, bg=ctx.colors.bg;
  const phase=p=>{ r.phase=p; ctx.progress(`${cfg.label}: ${p}`); };
  let A=null, B=null, C=null;
  try{
    // setup and ink, on B
    phase('setup');
    const t1=Math.min(2,length);
    B=mount(cfg,{t:t1});
    const i1=await B.first(); r.setup.push(B.setupMs);
    phase('ink');
    { const f=inkFraction(i1,cfg,bg); r.ink.push({t:t1, ink:f.blocks, px:f.pixels, blob:i1.blob}); }
    const t2=length/2, i2=await B.at(t2);
    { const f=inkFraction(i2,cfg,bg); r.ink.push({t:t2, ink:f.blocks, px:f.pixels, blob:i2.blob}); }
    // A: fresh, played from 0 with the clock to t*, sampling luminance on the way
    phase(`playing to t = ${Math.min(length,PLAY_MAX)} s`);
    A=mount(cfg,{t:0});
    await A.first(); r.setup.push(A.setupMs);
    const tStar=Math.min(length,PLAY_MAX), wall=now()+PLAY_WALL;
    A.h.play(); const start=now();
    while(now()<wall){
      const tick=now(), img=await A.capture();
      r.lum.push({t:(now()-start)/1000, L:boxLuminance(img,cfg), blob:img.blob});
      const tt=A.h.getTime(), el=(now()-start)/1000;
      if(!A.h.playing) break;                              // a loop:false piece reached its end
      if(length>PLAY_MAX ? tt>=tStar-1e-3 : el>=PLAY_MAX) break; // a short looping piece plays 6 s, wrapping round
      await sleep(Math.max(0,100-(now()-tick)));
    }
    A.h.pause(); await sleep(60);
    r.playedS=(now()-start)/1000;
    const a=await A.capture(), tA=A.h.getTime(); r.tA=tA;
    // B: seeked to the same t
    phase(`seeked to t = ${tA.toFixed(3)}`);
    const b=await B.at(tA), dAB=sampledDiff(a,b,cfg);
    r.pure.push({what:'played vs seeked', t:tA, diff:dAB, tol, frames:[a.blob,b.blob]});
    A.dispose(); A=null;
    // C: a second fresh instance at tA, against B
    C=mount(cfg,{t:tA});
    const c=await C.first(); r.setup.push(C.setupMs);
    const dBC=sampledDiff(b,c,cfg);
    r.pure.push({what:'two fresh instances', t:tA, diff:dBC, tol, frames:[b.blob,c.blob]});
    B.dispose(); B=null; C.dispose(); C=null;
    // setParam honesty
    if(meta.interact && !ctx.late()){ phase('driving the controls'); r.honest=await honesty(ctx,cfg,tA); }
  }catch(e){ r.err=e.message||String(e); r.errPhase=r.phase; }
  finally{ for(const x of [A,B,C]) if(x) x.dispose(); }
  return r;
}

/* drive every control in env.ui and the box, then remount with the resulting params at the same t */
async function honesty(ctx,cfg,t){
  const {mount}=ctx, out={driven:[], t};
  let D=mount(cfg,{t, mode:'interact'}), E=null;
  try{
    await D.first(); await sleep(150); // onMode builds the panel
    const els=await withTimeout(D.h.probeUI(),CAP_MS,'probeUI timed out');
    const settle=()=>sleep(40);
    const fire=async(id,ev)=>{ D.h.fire(id,ev); await settle(); if(D.errs.length) throw new Error(`${D.errs[0].kind}: ${D.errs[0].message}`); };
    for(const el of els){
      if(el.id===0 || el.disabled) continue;
      const L=new Set(el.listeners), types=['input','change'].filter(x=>L.has(x));
      if(el.tag==='input' && (el.type==='range' || el.type==='number') && types.length){
        const def=el.value, vals=[el.max, el.min].filter(v=>v!=null).map(String);
        for(const v of [...vals, def]) for(const ty of types) await fire(el.id,{type:ty, value:v});
        out.driven.push(`${el.type} #${el.id} (max, min, back to ${def||'its value'})`);
      } else if(el.tag==='input' && (el.type==='checkbox' || el.type==='radio') && (types.length || L.has('click'))){
        for(const ty of types.length?types:['click']) await fire(el.id,{type:ty, checked:!el.checked});
        out.driven.push(`${el.type} #${el.id} (toggled)`);
      } else if(el.tag==='input' && types.length){
        for(const ty of types) await fire(el.id,{type:ty, value:el.value});
        out.driven.push(`${el.type||'text'} input #${el.id}`);
      } else if(el.tag==='select' && types.length){
        const other=(el.options||[]).find(v=>v!==el.value);
        if(other!=null){ for(const ty of types) await fire(el.id,{type:ty, value:String(other)}); out.driven.push(`select #${el.id} (to “${other}”)`); }
      }
      if(L.has('click') && !(el.tag==='input' && (el.type==='checkbox'||el.type==='radio'))){ await fire(el.id,{type:'click', x:0, y:0, button:0}); out.driven.push(`${el.tag} #${el.id} (click)`); }
    }
    // the box itself: a drag from the centre and three wheel turns
    const cx=cfg.box.w/2, cy=cfg.box.h/2, P={pointerId:1, pointerType:'mouse', button:0};
    D.h.input({type:'pointerdown', x:cx, y:cy, buttons:1, ...P}); await settle();
    for(let i=1;i<=5;i++){ D.h.input({type:'pointermove', x:cx+i*cfg.box.w/20, y:cy+i*cfg.box.h/30, buttons:1, ...P}); await settle(); }
    D.h.input({type:'pointerup', x:cx+cfg.box.w/4, y:cy+cfg.box.h/6, buttons:0, ...P}); await settle();
    for(let i=0;i<3;i++){ D.h.input({type:'wheel', x:cx, y:cy, deltaY:i===1?-100:100, deltaX:0}); await settle(); }
    out.driven.push('a drag over the box', '3 wheel turns');
    if(D.errs.length) throw new Error(`${D.errs[0].kind}: ${D.errs[0].message}`);
    await sleep(120);
    D.h.pause();
    const d=await D.capture(); out.t=D.h.getTime(); out.params=D.h.getParams();
    D.dispose(); D=null;
    E=mount(cfg,{t:out.t, mode:'interact', params:out.params});
    await E.first(); await sleep(150);
    const e=await E.at(out.t);
    out.diff=sampledDiff(d,e,cfg); out.frames=[d.blob,e.blob]; out.controls=els.filter(x=>x.id!==0).length; out.root=(els.find(x=>x.id===0)||{listeners:[]}).listeners;
  }catch(e){ out.err=e.message||String(e); }
  finally{ if(D) D.dispose(); if(E) E.dispose(); }
  return out;
}

const DYN=[['setup','Setup within 4 s, no errors'],['ink','Draws in the box (2% ink)'],['time-purity','Time purity'],['setparam-honesty','setParam honesty'],['flashing','No flashing (3 a second)'],['runtime','No stops by the host']];

function judge(R,runs,ctx){
  const G='dynamic', label=r=>r.cfg.label;
  // setup
  const bad=runs.find(r=>r.err&&r.errPhase==='setup'), slow=runs.flatMap(r=>r.setup.map(ms=>({r,ms}))).filter(x=>x.ms>SETUP_LIMIT);
  const worst=runs.flatMap(r=>r.setup.map(ms=>({r,ms}))).reduce((a,b)=>!a||b.ms>a.ms?b:a,null);
  const other=runs.find(r=>r.err&&r.errPhase!=='setup');
  if(bad) R.add(G,'setup',DYN[0][1],'fail',`Setup failed @ ${label(bad)}: ${bad.err}`,{where:whereOf(bad.cfg)});
  else if(slow.length) R.add(G,'setup',DYN[0][1],'fail',`Ready and drawn in ${Math.round(slow[0].ms)} ms @ ${label(slow[0].r)} (at most ${SETUP_LIMIT} ms, half the watchdog's limit).`,{where:whereOf(slow[0].r.cfg)});
  else if(other) R.add(G,'setup',DYN[0][1],'fail',`Ready, then an error while ${other.errPhase} @ ${label(other)}: ${other.err}`,{where:whereOf(other.cfg,other.tA)});
  else if(worst) R.add(G,'setup',DYN[0][1],'pass',`Ready and drawn in ${Math.round(worst.ms)} ms at worst (${label(worst.r)}), ${plural(runs.reduce((a,r)=>a+r.setup.length,0),'mount')}.`);
  else R.add(G,'setup',DYN[0][1],'skip','Nothing was mounted.');
  // ink: each size draws at least 2% of the box at one of t = 2 and length/2 at least. A single sparse moment (a curve
  // that starts over from nothing) is not a blank piece, so it is noted, not failed.
  const sized=runs.filter(r=>r.ink.length).map(r=>({r, best:r.ink.reduce((a,b)=>b.ink>a.ink?b:a), least:r.ink.reduce((a,b)=>b.ink<a.ink?b:a)}));
  const blank=sized.find(x=>x.best.ink<INK_MIN), sparse=sized.filter(x=>x.least.ink<INK_MIN);
  const tt=`t = ${Math.min(2,ctx.length)} and ${ctx.length/2}`;
  if(blank) R.add(G,'ink',DYN[1][1],'fail',`Only ${pct(blank.best.ink)} of the box differs from bg ${ctx.colors.bg} at best (at least 2%, counted on ${INK_BLOCK} px blocks; ${pct(blank.best.px)} of its pixels) @ ${label(blank.r)}, ${tt}.`,{where:whereOf(blank.r.cfg,blank.best.t), frame:blank.best.blob});
  else if(sized.length){
    const lo=sized.reduce((a,b)=>b.best.ink<a.best.ink?b:a);
    R.add(G,'ink',DYN[1][1],'pass',`At ${tt}, at least ${pct(lo.best.ink)} of the box is drawn in every size (${label(lo.r)} the least, counted on ${INK_BLOCK} px blocks; ${pct(lo.best.px)} of its pixels).`
      +(sparse.length?` A sparse moment: ${sparse.map(x=>`${pct(x.least.ink)} at t = ${+x.least.t.toFixed(3)} @ ${label(x.r)}`).slice(0,2).join('; ')}.`:''));
  }
  else R.add(G,'ink',DYN[1][1],'skip','Skipped: no frame was captured.');
  // time purity
  const pure=runs.flatMap(r=>r.pure.map(p=>({r,p})));
  const impure=pure.filter(x=>x.p.diff>x.p.tol).sort((a,b)=>b.p.diff-a.p.diff)[0], maxd=pure.reduce((a,b)=>!a||b.p.diff>a.p.diff?b:a,null);
  const tolTxt=pct(pure.length?pure[0].p.tol:PURE_2D);
  if(impure) R.add(G,'time-purity',DYN[2][1],'fail',`${impure.p.what}: ${pct(impure.p.diff)} of sampled box pixels differ (at most ${tolTxt}) @ ${label(impure.r)}, t = ${impure.p.t.toFixed(3)}. The frame must be a function of t, params and the size: state kept between frames shows up here.`,{where:whereOf(impure.r.cfg,impure.p.t), frame:impure.p.frames[0], frames:impure.p.frames});
  else if(maxd) R.add(G,'time-purity',DYN[2][1],'pass',`Played to t* and seeked to t* agree, and so do two fresh instances: at most ${pct(maxd.p.diff)} of sampled pixels differ (limit ${tolTxt}), ${plural(pure.length,'comparison')}. Played ${runs.filter(r=>r.playedS).map(r=>`${r.playedS.toFixed(1)} s to t = ${r.tA.toFixed(2)}`)[0]||''} with the clock.`);
  else R.add(G,'time-purity',DYN[2][1],'skip',runs.some(r=>r.err)?'Skipped: the piece stopped before it could be compared.':'Skipped.');
  // setParam honesty
  if(!ctx.meta.interact) R.add(G,'setparam-honesty',DYN[3][1],'skip','The piece has no interact mode, so nothing in it can call setParam from input.');
  else {
    const hs=runs.filter(r=>r.honest).map(r=>({r,h:r.honest}));
    const crashed=hs.find(x=>x.h.err), off=hs.filter(x=>!x.h.err&&x.h.diff>HONEST).sort((a,b)=>b.h.diff-a.h.diff)[0];
    const drv=hs.length?hs[0].h.driven:[];
    if(crashed) R.add(G,'setparam-honesty',DYN[3][1],'fail',`Driving the piece failed @ ${label(crashed.r)}: ${crashed.h.err}`,{where:whereOf(crashed.r.cfg,crashed.h.t)});
    else if(off) R.add(G,'setparam-honesty',DYN[3][1],'warn',`After driving ${drv.join(', ')}, a remount with the resulting params ${JSON.stringify(off.h.params)} at t = ${off.h.t.toFixed(3)} differs in ${pct(off.h.diff)} of sampled pixels (at most ${pct(HONEST)}) @ ${label(off.r)}. Either the piece keeps a param outside params (in S: not allowed), or hover-like state (fine): reviewers judge. The two frames are attached, driven first.`,{where:whereOf(off.r.cfg,off.h.t), frame:off.h.frames[0], frames:off.h.frames});
    else if(hs.length) R.add(G,'setparam-honesty',DYN[3][1],'pass',`Drove ${drv.join(', ')} in ${plural(hs.length,'size')}; remounted with the resulting params ${JSON.stringify(hs[0].h.params)}, the frame is the same (at most ${pct(Math.max(...hs.map(x=>x.h.diff)))} differs).`);
    else R.add(G,'setparam-honesty',DYN[3][1],'skip',runs.some(r=>r.err)?'Skipped: the piece stopped before interact mode was tried.':'Skipped: the suite ran out of time.');
  }
  // flashing
  const fr=runs.filter(r=>r.lum.length>=8);
  if(!fr.length) R.add(G,'flashing',DYN[4][1],runs.some(r=>r.err)?'skip':'warn',runs.some(r=>r.err)?'Skipped: the piece stopped before it played.':'Too few frames were captured to measure flashing.');
  else {
    const res=fr.map(r=>({r,f:flashes(r.lum)})), w=res.reduce((a,b)=>b.f.worst>a.f.worst?b:a);
    const note=' Measured on captures of the canvas: env.ui (the piece\'s own controls) is not in them.';
    if(w.f.worst>FLASH_N) R.add(G,'flashing',DYN[4][1],'fail',`${w.f.worst} luminance swings of 10% or more within one second (at most ${FLASH_N}) @ ${label(w.r)}, ${w.f.at.t.toFixed(1)} s into play.${note}`,{where:whereOf(w.r.cfg,w.f.at.t), frame:w.f.at.blob});
    else R.add(G,'flashing',DYN[4][1],'pass',`At most ${plural(w.f.worst,'swing')} of 10% luminance in any second (limit ${FLASH_N}), from ${fr.reduce((a,r)=>a+r.lum.length,0)} frames over ${fr.map(r=>r.playedS.toFixed(1)+' s').join(', ')} of play.${note}`);
  }
  // runtime
  const errs=ctx.errors;
  if(errs.length){ const e=errs[0]; R.add(G,'runtime',DYN[5][1],'fail',`${errs.length===1?'The host stopped the piece':`The host stopped the piece ${errs.length} times`}: ${errs.slice(0,3).map(x=>`${x.kind} (${x.message}) @ ${x.where.size} ${x.where.device}${x.where.fullscreen?' full screen':''}`).join('; ')}.`,{where:e.where}); }
  else R.add(G,'runtime',DYN[5][1],'pass','No stall (8 s setup, 250 ms per call), no error and no WebAssembly memory over 64 MiB during the suite. The host enforces these for every viewer.');
}

async function dynamicChecks(R,piece,res,opts,progress,deadline){
  const G='dynamic', skipAll=why=>DYN.forEach(([id,title])=>R.add(G,id,title,'skip',why));
  if(typeof EigenReelHost==='undefined' || typeof document==='undefined') return skipAll('Not run here: the dynamic checks need a browser with runtime.js.');
  if(!res || !res.read || !res.read.ok || !res.meta) return skipAll('Not run: the piece could not be read (see the static checks).');
  const meta=res.meta, Spec=getSpec();
  if(!EigenReelHost.supported) return skipAll('Not run: this browser has no OffscreenCanvas, which the sandbox needs.');
  if(meta.context==='webgl2' && !EigenReelHost.hasWebGL2()) return skipAll('Not run: this browser has no WebGL2, so a webgl2 piece cannot run here. It is not a failure; run the checks in a desktop browser with WebGL2.');
  const cfgs=configs(meta);
  if(!cfgs.length) return skipAll('Not run: modes declares neither desktop nor phone.');
  let holder=opts.preview, own=null;
  if(!holder){ own=holder=document.createElement('div'); holder.style.cssText='position:fixed;left:0;top:0;width:360px;opacity:0.01;pointer-events:none;z-index:-1'; document.body.appendChild(holder); }
  const length=meta.time&&Number.isFinite(meta.time.length)&&meta.time.length>0?meta.time.length:60;
  const wasm=piece.wasm!=null?(()=>{ const u=asU8(piece.wasm); return u.buffer.slice(u.byteOffset,u.byteOffset+u.byteLength); })():undefined;
  const ctx={meta, length, colors:{bg:(opts.site&&opts.site.bg)||'#050508', fg:(opts.site&&opts.site.fg)||'#ecebf5', ...(res.colors||{})}, site:opts.site, holder, live:new Set(), errors:[],
    defaults:Spec.normalizeParams(meta,{}), late:()=>now()>deadline,
    piece:{slug:String(piece.slug||''), source:piece.source, meta, colors:res.colors||{}, ...(wasm?{wasm}:{})}};
  ctx.mount=mounter(ctx);
  const runs=[];
  try{
    for(let i=0;i<cfgs.length;i++){
      const cfg=cfgs[i];
      ctx.progress=t=>progress(t,0.1+0.85*i/cfgs.length);
      if(ctx.late()){ runs.push({cfg, setup:[], ink:[], pure:[], lum:[], err:'skipped: the suite hit its time limit', errPhase:'time'}); continue; }
      const r=await runConfig(ctx,cfg); runs.push(r);
      if(r.err && r.errPhase==='setup') break; // the other sizes would fail the same way
    }
  } finally {
    for(const x of [...ctx.live]) try{ x.dispose(); }catch(_){}
    if(own) own.remove();
  }
  const timedOut=runs.filter(r=>r.errPhase==='time');
  judge(R,runs.filter(r=>r.errPhase!=='time'),ctx);
  if(timedOut.length) R.checks.filter(c=>c.group===G).forEach(c=>{ c.detail+=` (Not run at ${timedOut.map(r=>r.cfg.label).join(', ')}: the suite hit its ${TOTAL_MS/1000} s limit.)`; });
}

/* catalog hashes for the duplicate check, when the page did not pass others */
async function catalogOthers(){
  const V=typeof VIZ!=='undefined'&&Array.isArray(VIZ)?VIZ:[];
  const out=[];
  for(const v of V) if(v && typeof v.source==='string'){ const h=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(v.source)); out.push({slug:v.id, sha256:[...new Uint8Array(h)].map(b=>b.toString(16).padStart(2,'0')).join('')}); }
  return out;
}

async function run(piece,opts={}){
  const T0=now(), R=makeReport(), out={meta:null, colors:null, sha256:null, errors:[], warnings:[]};
  const onProgress=typeof opts.onProgress==='function'?opts.onProgress:()=>{};
  const progress=(text,f)=>{ try{ onProgress(text,Math.max(0,Math.min(1,f))); }catch(_){} };
  const browser=typeof document!=='undefined' && typeof EigenReelHost!=='undefined';
  const dynamic=opts.dynamic==null?browser:!!opts.dynamic;
  piece=piece||{};
  try{
    progress('Static checks: files, metadata, COLORS, params, explanation, imports, WebAssembly, duplicates',0);
    const o={...opts};
    if(o.others===undefined && browser) try{ o.others=await catalogOthers(); }catch(_){}
    const res=await staticChecks(R,piece,o,out);
    if(dynamic) await dynamicChecks(R,piece,res,opts,progress,T0+TOTAL_MS);
    else DYN.forEach(([id,title])=>R.add('dynamic',id,title,'skip',browser?'Not run: static checks only.':'Not run here: the dynamic checks need a browser (scripts/check-entry.mjs runs them in headless Chromium).'));
    R.add('content','content','Image safety and text moderation','skip',CONTENT_NOTE);
    progress('Done',1);
  }catch(e){
    console.error('eigenreel-checks: run crashed',e);
    R.add('static','checker','The checker','fail',`The checker itself crashed: ${e&&e.message||e}`);
  }
  const order={static:0,dynamic:1,content:2};
  R.checks.forEach((c,i)=>c._i=i); R.checks.sort((a,b)=>order[a.group]-order[b.group]||a._i-b._i); R.checks.forEach(c=>delete c._i);
  return {ok:!R.checks.some(c=>c.group==='static'&&c.status==='fail'), checks:R.checks, meta:out.meta, colors:out.colors, sha256:out.sha256,
    errors:out.errors, warnings:out.warnings, durationMs:Math.round(now()-T0)};
}

/* ---------- zip: central directory + DecompressionStream('deflate-raw') ---------- */
async function inflateRaw(u8){
  const s=new Blob([u8]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(s).arrayBuffer());
}
async function unzip(buf){
  const u8=asU8(buf), dv=new DataView(u8.buffer,u8.byteOffset,u8.byteLength), td=new TextDecoder();
  let eocd=-1;
  for(let i=u8.length-22;i>=Math.max(0,u8.length-22-65535);i--) if(dv.getUint32(i,true)===0x06054b50){ eocd=i; break; }
  if(eocd<0) throw new Error('not a zip file (no end of central directory record)');
  const count=dv.getUint16(eocd+10,true), cdOff=dv.getUint32(eocd+16,true);
  if(count===0xffff||cdOff===0xffffffff) throw new Error('ZIP64 archives are not supported');
  const out=new Map(); let p=cdOff, total=0;
  for(let k=0;k<count;k++){
    if(p+46>u8.length || dv.getUint32(p,true)!==0x02014b50) throw new Error('corrupt zip: bad central directory entry');
    const flags=dv.getUint16(p+8,true), method=dv.getUint16(p+10,true), csize=dv.getUint32(p+20,true), usize=dv.getUint32(p+24,true);
    const nlen=dv.getUint16(p+28,true), xlen=dv.getUint16(p+30,true), clen=dv.getUint16(p+32,true), lho=dv.getUint32(p+42,true);
    const name=td.decode(u8.subarray(p+46,p+46+nlen)); p+=46+nlen+xlen+clen;
    if(name.endsWith('/')) continue;
    if(flags&1) throw new Error(`${name}: encrypted entries are not supported`);
    if((total+=usize)>4*LIMIT_PKG) throw new Error('the archive expands to more than 16 MB');
    if(lho+30>u8.length || dv.getUint32(lho,true)!==0x04034b50) throw new Error(`${name}: bad local header`);
    const start=lho+30+dv.getUint16(lho+26,true)+dv.getUint16(lho+28,true), raw=u8.subarray(start,start+csize);
    const bytes=method===0?raw.slice():method===8?await inflateRaw(raw):null;
    if(!bytes) throw new Error(`${name}: compression method ${method} is not supported (stored or deflate only)`);
    if(bytes.length!==usize) throw new Error(`${name}: expected ${usize} bytes, got ${bytes.length}`);
    out.set(name,{bytes:bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)});
  }
  return out;
}
const TEXT_FILE=/(\.(json|md|markdown|js|mjs|txt|c|h|sh|css|html|rs|toml)|(^|\/)(LICEN[CS]E|COPYING|README|BUILD)(\.\w+)?)$/i;
function withText(files){ const td=new TextDecoder(); for(const [p,f] of files) if(f.text==null && f.bytes && TEXT_FILE.test(p)) f.text=td.decode(asU8(f.bytes)); return files; }

const api={run, htmlProblems, unzip, withText, flashes, sampledDiff, inkFraction, configs, FAMILIES, DYN};
if(typeof module!=='undefined' && module.exports) module.exports=api;
root.EigenReelChecks=api;
})(typeof globalThis!=='undefined'?globalThis:this);
