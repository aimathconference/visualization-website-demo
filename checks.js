/* ---------- LociChecks: the automated gate, run in the browser (docs/review-pipeline.md, section 2) ----------
   run(pkg, {onProgress, preview}) -> Promise<report>
     pkg    = { files: Map<path, {text?: string, bytes?: ArrayBuffer|Uint8Array}> }  (a folder or an unzipped .zip;
              a single top-level folder is fine: paths are taken relative to the shallowest loci.json)
     report = { ok, checks:[{id, group, title, status, detail, where?, frame?}], manifest, posterBlob, durationMs, ... }
   Static checks read the files. Dynamic checks mount the module with LociHost (runtime.js) on canvases the
   checker owns, so they run in the same sandboxed worker as the feed. Content checks run server-side and are
   reported as skipped, except a local link lint.
   Also: unzip(arrayBuffer) -> Map (central-directory parser + DecompressionStream('deflate-raw')),
   samplePackage(viz, failing) -> pkg built from a catalog piece. Loads under node too (no DOM at load time). */
(function(root){
'use strict';
const LICENSES=['MIT','BSD-2-Clause','BSD-3-Clause','Apache-2.0','GPL-3.0','MPL-2.0','ISC','CC0-1.0'];
const LIMIT={js:200*1024, wasm:2*1024*1024, pkg:4*1024*1024};
const SIZES=[[335,490],[700,300],[1100,700]], PALS=['night','graph','contrast'];
const M=24;                 // CSS px of canvas around the box, so "outside the box" has pixels to sample
const PLAY_MS=6000;         // per matrix cell; the pipeline plays 20 s
const SETUP_MS=8000, CAP_MS=6000, TOTAL_MS=180000, POOL=2;
const P95_MS=12, MAX_MS=40, BLANK=0.02, JUMP_TOL=0.005, FLASH_D=0.10, FLASH_N=3;
const SHORTENERS=['bit.ly','t.co','tinyurl.com','goo.gl'];
const WASM_MATH=['sin','cos','tan','asin','acos','atan','atan2','exp','log','pow','sqrt','floor','ceil','round','fabs','fmod','hypot','fmin','fmax'];
const CONTENT_NOTE='Runs server-side on upload: image safety on captured frames / text moderation / link resolution';
const FALLBACK_PAL={night:{bg:'#050508', fg:'#ecebf5', a1:'#ff2e74', a2:'#22e0e8'}, graph:{bg:'#ffffff', fg:'#13233a', a1:'#d2402a', a2:'#1d5fc4'}, contrast:{bg:'#000000', fg:'#ffffff', a1:'#ffd400', a2:'#00b3ff'}};

const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const now=()=>(typeof performance!=='undefined'?performance.now():Date.now());
const fmtMs=x=>x<10?x.toFixed(1):String(Math.round(x));
const plural=(n,w)=>`${n} ${w}${n===1?'':'s'}`;
const asU8=b=>b instanceof Uint8Array?b:new Uint8Array(b);
const textOf=f=>!f?null:f.text!=null?String(f.text):f.bytes?new TextDecoder().decode(asU8(f.bytes)):null;
const bytesOf=f=>!f?null:f.bytes?asU8(f.bytes):new TextEncoder().encode(f.text||'');
const sizeOf=f=>!f?0:f.bytes?asU8(f.bytes).byteLength:new TextEncoder().encode(f.text||'').byteLength;
const kb=n=>n<1024?`${n} B`:n<1048576?`${(n/1024).toFixed(1)} KB`:`${(n/1048576).toFixed(2)} MB`;
function withTimeout(p,ms,msg){ let id; return Promise.race([p,new Promise((_,rej)=>{ id=setTimeout(()=>rej(new Error(msg)),ms); })]).finally(()=>clearTimeout(id)); }

/* the site's palettes (app.js), read when a run starts */
function palettes(){
  const SP=typeof STYLE_PAL!=='undefined'?STYLE_PAL:null, PL=typeof PALETTES!=='undefined'?PALETTES:null;
  const hc=PL&&PL.find(p=>p.id==='contrast');
  const pick=p=>({bg:p.bg, fg:p.fg, a1:p.a1, a2:p.a2});
  return {night:pick(SP?SP.night:FALLBACK_PAL.night), graph:pick(SP?SP.graph:FALLBACK_PAL.graph), contrast:pick(hc||FALLBACK_PAL.contrast)};
}
const PAL_NAME={night:'night', graph:'graph', contrast:'high contrast'};

/* ---------- source helpers ---------- */
/* Comments become spaces (newlines kept, so offsets and line numbers survive); strings are kept. */
function stripComments(src){
  let out='', i=0; const n=src.length;
  while(i<n){
    const c=src[i], d=src[i+1];
    if(c==='/' && d==='/'){ while(i<n && src[i]!=='\n'){ out+=' '; i++; } continue; }
    if(c==='/' && d==='*'){ out+='  '; i+=2; while(i<n && !(src[i]==='*' && src[i+1]==='/')){ out+=src[i]==='\n'?'\n':' '; i++; } out+='  '; i+=2; continue; }
    if(c==='"' || c==="'" || c==='`'){
      const q=c; out+=c; i++;
      while(i<n && src[i]!==q){ if(src[i]==='\\'){ out+=src.slice(i,i+2); i+=2; continue; } if(q!=='`' && src[i]==='\n') break; out+=src[i]; i++; }
      if(i<n){ out+=src[i]; i++; } continue;
    }
    out+=c; i++;
  }
  return out;
}
const lineAt=(s,i)=>s.slice(0,i).split('\n').length;
const tokens=s=>stripComments(s).match(/[A-Za-z_$][\w$]*|\d+(?:\.\d+)?|[^\s\w]/g)||[];
function shingles(s,k=5){ const t=tokens(s), out=new Set(); for(let i=0;i+k<=t.length;i++) out.add(t.slice(i,i+k).join('\u0001')); return out; }
function jaccard(a,b){ if(!a.size&&!b.size) return 1; let n=0; const [s,l]=a.size<b.size?[a,b]:[b,a]; for(const x of s) if(l.has(x)) n++; return n/(a.size+b.size-n); }
async function sha256(bytes){ const h=await crypto.subtle.digest('SHA-256',bytes); return [...new Uint8Array(h)].map(b=>b.toString(16).padStart(2,'0')).join(''); }

/* ---------- package ---------- */
function normalizePkg(pkg){
  const all=new Map();
  for(const [p,f] of (pkg&&pkg.files)||[]) all.set(String(p).replace(/\\/g,'/').replace(/^(\.\/|\/)+/,''),f);
  const junk=p=>p.split('/').some(s=>s==='__MACOSX'||s.startsWith('.'));
  const mans=[...all.keys()].filter(p=>!junk(p) && /(^|\/)loci\.json$/.test(p)).sort((a,b)=>a.split('/').length-b.split('/').length||a.length-b.length);
  const base=mans.length?mans[0].slice(0,-'loci.json'.length):'';
  const files=new Map(); let total=0;
  for(const [p,f] of all){ total+=sizeOf(f); if(p.startsWith(base) && !junk(p)) files.set(p.slice(base.length),f); }
  return {base, files, total};
}

/* ---------- the report ---------- */
function makeReport(){
  const checks=[];
  const add=(group,id,title,status,detail,extra)=>{ const c={id, group, title, status, detail:detail||''}; if(extra) Object.assign(c,extra); checks.push(c); return c; };
  return {checks, add};
}
async function guard(R,group,id,title,fn){
  try{ return await fn(); }
  catch(e){ console.warn('loci-checks:',id,e); R.add(group,id,title,'fail',`The check crashed: ${e&&e.message||e}`); }
}

/* ---------- static ---------- */
async function staticChecks(R,P,ctx){
  const G='static', f=P.files, rawMan=textOf(f.get('loci.json'));
  let man=null;
  // manifest
  await guard(R,G,'manifest','Manifest validates',()=>{
    if(rawMan==null) return R.add(G,'manifest','Manifest validates','fail','No loci.json in the package.');
    let j; try{ j=JSON.parse(rawMan); }catch(e){ return R.add(G,'manifest','Manifest validates','fail',`loci.json is not valid JSON: ${e.message}`); }
    try{ validateManifest(j); man=j; R.add(G,'manifest','Manifest validates','pass',`loci.json schema v1: ${j.runtime}/${j.render}, ${plural(j.params.length,'param')}, motion "${j.motion}".`); }
    catch(e){ ctx.rawManifest=j; R.add(G,'manifest','Manifest validates','fail',e.message); }
  });
  ctx.manifest=man; const m=man||ctx.rawManifest||{};
  const runtime=m.runtime==='wasm'?'wasm':'js', entry=typeof m.entry==='string'&&m.entry?m.entry.replace(/^\.\//,''):(runtime==='wasm'?'module.wasm':'index.js');
  const ef=f.get(entry); ctx.runtime=runtime; ctx.entry=entry;
  ctx.source=runtime==='js'?textOf(ef):null; ctx.bytes=runtime==='wasm'&&ef?bytesOf(ef).slice():null;

  // sizes
  await guard(R,G,'size','Size limits',()=>{
    const es=sizeOf(ef), lim=LIMIT[runtime], probs=[];
    if(!ef) probs.push(`entry ${entry} is missing`);
    else if(es>lim) probs.push(`${entry} is ${kb(es)} (limit ${kb(lim)})`);
    if(P.total>LIMIT.pkg) probs.push(`package is ${kb(P.total)} (limit ${kb(LIMIT.pkg)})`);
    R.add(G,'size','Size limits',probs.length?'fail':'pass',probs.length?probs.join('; ')+'.':`${entry} ${kb(es)} of ${kb(lim)}; package ${kb(P.total)} of ${kb(LIMIT.pkg)} (${plural(P.files.size,'file')}).`);
  });
  // license
  await guard(R,G,'license','Open-source license',()=>{
    const lf=[...f.keys()].find(p=>/^(LICEN[CS]E|COPYING)(\.(md|txt))?$/i.test(p)), probs=[];
    if(!LICENSES.includes(m.license)) probs.push(m.license?`"${m.license}" is not one of ${LICENSES.join(', ')}`:`loci.json has no "license" (one of ${LICENSES.join(', ')})`);
    if(!lf) probs.push('no LICENSE file in the package');
    R.add(G,'license','Open-source license',probs.length?'fail':'pass',probs.length?probs.join('; ')+'.':`${m.license}, with ${lf}.`);
  });
  // imports
  await guard(R,G,'imports','Imports',async()=>{
    const T='Imports';
    if(!ef) return R.add(G,'imports',T,'skip',`No ${entry} to read.`);
    if(runtime==='wasm'){
      let mod; try{ mod=await WebAssembly.compile(ctx.bytes.slice()); }catch(e){ return R.add(G,'imports',T,'fail',`${entry} is not a valid WebAssembly module: ${e.message}`); }
      const bad=WebAssembly.Module.imports(mod).filter(i=>!(i.kind==='memory' || (i.kind==='function' && i.module==='env' && (WASM_MATH.includes(i.name)||WASM_MATH.includes(i.name.replace(/f$/,''))))));
      return R.add(G,'imports',T,bad.length?'fail':'pass',bad.length?`Only Math functions from "env" may be imported; found ${bad.map(i=>`${i.module}.${i.name} (${i.kind})`).join(', ')}.`:`WebAssembly imports only Math functions from "env".`);
    }
    const code=stripComments(ctx.source), probs=[], kitNames=typeof LOCI_KIT!=='undefined'?LOCI_KIT.map(fn=>fn.name):null;
    for(const mm of code.matchAll(/(^|[;\n}])[ \t]*(import|export)\b([^;'"`]*?)\bfrom\s*(['"])([^'"]*)\4|(^|[;\n}])[ \t]*import\s*(['"])([^'"]*)\7/g)){
      const spec=mm[5]!=null?mm[5]:mm[8], kw=mm[2]||'import', clause=(mm[3]||'').trim(), ln=lineAt(code,mm.index+mm[1].length);
      if(spec!=='@loci/kit'){ probs.push(`line ${ln}: ${kw} from '${spec}' (only '@loci/kit' is allowed)`); continue; }
      if(kw==='export' || !/^\{[^}]*\}$/.test(clause)){ probs.push(`line ${ln}: use import { … } from '@loci/kit'`); continue; }
      if(kitNames) for(const nm of clause.slice(1,-1).split(',').map(s=>s.trim().split(/\s+as\s+/)[0]).filter(Boolean)) if(!kitNames.includes(nm)) probs.push(`line ${ln}: '@loci/kit' has no export ${nm}`);
    }
    for(const mm of code.matchAll(/(^|[^\w$.])import\s*\(/g)) probs.push(`line ${lineAt(code,mm.index+mm[1].length)}: dynamic import()`);
    for(const mm of code.matchAll(/\bimportScripts\b/g)) probs.push(`line ${lineAt(code,mm.index)}: importScripts`);
    R.add(G,'imports',T,probs.length?'fail':'pass',probs.length?probs.join('; ')+'.':`Imports only '@loci/kit'.`);
  });
  // forbidden APIs
  await guard(R,G,'forbidden-apis','Forbidden APIs (lint)',()=>{
    const T='Forbidden APIs (lint)';
    if(runtime==='wasm') return R.add(G,'forbidden-apis',T,'skip','WebAssembly: a module reaches only the Math imports allowed above, so there is no source to lint.');
    if(ctx.source==null) return R.add(G,'forbidden-apis',T,'skip',`No ${entry} to read.`);
    const code=stripComments(ctx.source);
    const HARD=[['fetch',/\bfetch\b/],['XMLHttpRequest',/\bXMLHttpRequest\b/],['WebSocket',/\bWebSocket\b/],['EventSource',/\bEventSource\b/],['indexedDB',/\bindexedDB\b/],['localStorage',/\blocalStorage\b/],['sessionStorage',/\bsessionStorage\b/],['FontFace',/\bFontFace\b/],['new Image',/\bnew\s+Image\b/],['eval',/\beval\s*\(/],['Function(',/\bFunction\s*\(/]];
    const SOFT=[['Date.now',/\bDate\s*\.\s*now\b/],['performance.now',/\bperformance\s*\.\s*now\b/],['Math.random',/\bMath\s*\.\s*random\b/],['fillText',/\.\s*(fillText|strokeText)\s*\(/]];
    const hit=list=>list.map(([n,re])=>{ const mm=code.match(re); return mm?`${n} (line ${lineAt(code,mm.index)})`:null; }).filter(Boolean);
    const h=hit(HARD), s=hit(SOFT);
    if(h.length) return R.add(G,'forbidden-apis',T,'fail',`References ${h.join(', ')}. The sandbox removes these, so the piece would break.${s.length?` Also: ${s.join(', ')}.`:''}`);
    if(s.length) return R.add(G,'forbidden-apis',T,'warn',`References ${s.join(', ')}. Clocks and Math.random make frames nondeterministic (tested below; use t and mulberry32(seed)); draw text with label(), which honors theme.labels.`);
    R.add(G,'forbidden-apis',T,'pass','No network, storage, font, image, eval or clock APIs referenced.');
  });
  // explanation
  await guard(R,G,'explanation','Explanation',()=>{
    const T='Explanation', md=textOf(f.get('explanation.md'));
    if(md==null) return R.add(G,'explanation',T,'fail','No explanation.md in the package.');
    const words=md.replace(/[#*_`>|[\]()-]+/g,' ').split(/\s+/).filter(w=>/\w/.test(w)).length, probs=[];
    if(words<150||words>1200) probs.push(`explanation: ${words} words (150 to 1200)`);
    if(!/^#{1,6}[ \t]+What you(?:'|’)re seeing[ \t]*$/mi.test(md)) probs.push(`explanation: missing "What you're seeing"`);
    if(!/^#{1,6}[ \t]+Try this[ \t]*$/mi.test(md)) probs.push('explanation: missing "Try this"');
    if(!/^\*\*Reference\.\*\*/m.test(md)) probs.push('explanation: missing Reference');
    ctx.md=md;
    R.add(G,'explanation',T,probs.length?'fail':'pass',probs.length?probs.join('; ')+'.':`${words} words, with "What you're seeing", "Try this" and a Reference line.`);
  });
  // alt
  await guard(R,G,'alt','Alt text',()=>{
    const T='Alt text', a=typeof m.alt==='string'?m.alt.trim():'', same=x=>typeof x==='string'&&x.trim().toLowerCase()===a.toLowerCase(), probs=[];
    if(!a) return R.add(G,'alt',T,'fail','loci.json has no "alt".');
    if(a.length<40||a.length>300) probs.push(`alt is ${a.length} characters (40 to 300)`);
    if(same(m.title)) probs.push('alt == title');
    if(same(m.hook)) probs.push('alt == hook');
    const sentences=(a.match(/[.!?](\s|$)/g)||[]).length||1;
    if(probs.length) return R.add(G,'alt',T,'fail',probs.join('; ')+'.');
    R.add(G,'alt',T,sentences>2?'warn':'pass',sentences>2?`${a.length} characters, but ${sentences} sentences: keep alt text to one or two.`:`${a.length} characters, ${plural(sentences,'sentence')}, distinct from the title and hook.`);
  });
  // presets
  await guard(R,G,'presets','Presets',()=>{
    const T='Presets', pr=Array.isArray(m.presets)?m.presets:[];
    if(!man) return R.add(G,'presets',T,pr.length?'skip':'fail',pr.length?'Skipped: the manifest did not validate.':'No presets: at least one is required.');
    if(!pr.length) return R.add(G,'presets',T,'fail','No presets: at least one is required.');
    const keys=new Set(man.params.map(p=>p.key)), probs=[];
    pr.forEach((s,i)=>{
      const nm=`preset ${i+1} "${s.label}"`, norm=normalizeParams(man,s.params);
      for(const k in s.params){
        if(!keys.has(k)){ probs.push(`${nm}: unknown param ${k}`); continue; }
        if(JSON.stringify(norm[k])!==JSON.stringify(s.params[k])) probs.push(`${nm}: ${k} = ${JSON.stringify(s.params[k])} is not a valid value (normalizes to ${JSON.stringify(norm[k])})`);
      }
    });
    R.add(G,'presets',T,probs.length?'fail':'pass',probs.length?probs.join('; ')+'.':`${plural(pr.length,'preset')}, every one valid as written.`);
  });
  // metadata
  await guard(R,G,'metadata','Title, hook and tags',()=>{
    const T='Title, hook and tags', probs=[], vocab=ctx.vocab, tags=Array.isArray(m.tags)?m.tags:[];
    if(typeof m.title!=='string'||!m.title.trim()) probs.push('no title'); else if(m.title.length>60) probs.push(`title is ${m.title.length} characters (≤ 60)`);
    if(typeof m.hook!=='string'||!m.hook.trim()) probs.push('no hook'); else if(m.hook.length>160) probs.push(`hook is ${m.hook.length} characters (≤ 160)`);
    if(tags.length<2||tags.length>6) probs.push(`${plural(tags.length,'tag')} (2 to 6)`);
    const unknown=tags.filter(t=>!vocab.has(t)); if(unknown.length) probs.push(`not in the tag vocabulary: ${unknown.map(t=>`"${t}"`).join(', ')}`);
    R.add(G,'metadata',T,probs.length?'fail':'pass',probs.length?probs.join('; ')+'.':`Title ${m.title.length}/60, hook ${m.hook.length}/160, ${tags.length} tags from the vocabulary.`);
  });
  // duplicates
  await guard(R,G,'duplicate','Not a duplicate',async()=>{
    const T='Not a duplicate';
    const parts=[]; for(const p of [...f.keys()].sort()) parts.push(p+'\0'+await sha256(bytesOf(f.get(p))));
    ctx.packageHash=await sha256(new TextEncoder().encode(parts.join('\n')));
    if(!ef) return R.add(G,'duplicate',T,'skip',`No ${entry} to compare.`);
    const mine=bytesOf(ef); ctx.moduleHash=await sha256(mine);
    const others=ctx.catalog.filter(v=>v.id!==m.id), self=ctx.catalog.find(v=>v.id===m.id);
    const note=self?` Same id as the catalog piece “${self.title}”, so this is treated as an update and compared with the other ${others.length} pieces.`:` Compared with ${plural(others.length,'catalog module')}.`;
    let near=null;
    const mineSh=runtime==='js'?shingles(ctx.source):null;
    for(const v of others){
      const b=await v.bytes(); if(!b) continue;
      if(await sha256(b)===ctx.moduleHash) return R.add(G,'duplicate',T,'fail',`The module is identical (SHA-256) to “${v.title}” (${v.id}).`);
      if(mineSh && v.source){ const j=jaccard(mineSh,shingles(v.source)); if(j>=0.8 && (!near||j>near.j)) near={v,j}; }
    }
    if(near) return R.add(G,'duplicate',T,'warn',`Near-duplicate of “${near.v.title}” (${near.v.id}): ${(near.j*100).toFixed(0)}% of 5-token shingles shared. A reviewer will compare them.${note}`);
    R.add(G,'duplicate',T,'pass',`Module sha256 ${ctx.moduleHash.slice(0,12)}… is new.${note}`);
  });
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
function devBox(img,cell){ const s=img.w/(cell.W+2*M); return {x:Math.round(M*s), y:Math.round(M*s), w:Math.round(cell.W*s), h:Math.round(cell.H*s), s}; }
/* first pixel outside the box (inset by 1 CSS px) that is not theme.bg (transparent also counts as background) */
function outsideBox(img,cell,bg){
  const B=devBox(img,cell), pad=Math.ceil(B.s), [r,g,b]=hexRGB(bg), d=img.data;
  let bad=0, first=null, n=0;
  for(let y=0;y<img.h;y+=2) for(let x=0;x<img.w;x+=2){
    if(x>=B.x-pad && x<B.x+B.w+pad && y>=B.y-pad && y<B.y+B.h+pad) continue;
    const i=(y*img.w+x)*4; n++;
    if(d[i+3]===0) continue;
    if(Math.abs(d[i]-r)>2||Math.abs(d[i+1]-g)>2||Math.abs(d[i+2]-b)>2||d[i+3]<253){ bad++; if(!first) first=[Math.round(x/B.s),Math.round(y/B.s)]; }
  }
  return {bad, n, first};
}
function inkFraction(img,cell,bg){
  const B=devBox(img,cell), [r,g,b]=hexRGB(bg), d=img.data; let n=0, ink=0;
  for(let y=B.y;y<B.y+B.h;y+=2) for(let x=B.x;x<B.x+B.w;x+=2){ const i=(y*img.w+x)*4; n++; if(Math.abs(d[i]-r)>8||Math.abs(d[i+1]-g)>8||Math.abs(d[i+2]-b)>8) ink++; }
  return n?ink/n:0;
}
/* 4×4 block averages over the box, quantized to 6 bits a channel, FNV-1a */
function frameHash(img,cell){
  const B=devBox(img,cell), d=img.data, k=4; let h=0x811c9dc5;
  for(let y=B.y;y+k<=B.y+B.h;y+=k) for(let x=B.x;x+k<=B.x+B.w;x+=k){
    let R=0,G=0,Bl=0;
    for(let j=0;j<k;j++) for(let i=0;i<k;i++){ const o=((y+j)*img.w+x+i)*4; R+=d[o]; G+=d[o+1]; Bl+=d[o+2]; }
    for(const v of [R>>6,G>>6,Bl>>6]){ h^=v; h=Math.imul(h,0x01000193)>>>0; }
  }
  return h>>>0;
}
function sampledDiff(a,b,cell){
  if(a.w!==b.w||a.h!==b.h) return 1;
  const B=devBox(a,cell); let n=0, diff=0;
  for(let y=B.y;y<B.y+B.h;y+=2) for(let x=B.x;x<B.x+B.w;x+=2){ const i=(y*a.w+x)*4; n++; if(Math.abs(a.data[i]-b.data[i])>16||Math.abs(a.data[i+1]-b.data[i+1])>16||Math.abs(a.data[i+2]-b.data[i+2])>16) diff++; }
  return n?diff/n:0;
}
function exactDiff(a,b){
  if(a.w!==b.w||a.h!==b.h) return a.w*a.h;
  const x=new Uint32Array(a.data.buffer,a.data.byteOffset,a.data.byteLength>>2), y=new Uint32Array(b.data.buffer,b.data.byteOffset,b.data.byteLength>>2);
  let n=0; for(let i=0;i<x.length;i++) if(x[i]!==y[i]) n++; return n;
}
const lin=c=>{ c/=255; return c<=0.04045?c/12.92:Math.pow((c+0.055)/1.055,2.4); };
function boxLuminance(img,cell){
  const B=devBox(img,cell), d=img.data; let s=0,n=0;
  for(let y=B.y;y<B.y+B.h;y+=3) for(let x=B.x;x<B.x+B.w;x+=3){ const i=(y*img.w+x)*4; s+=0.2126*lin(d[i])+0.7152*lin(d[i+1])+0.0722*lin(d[i+2]); n++; }
  return n?s/n:0;
}
/* a transition is a swing of ≥ 10% relative luminance from the last extreme, in the other direction */
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

/* ---------- mounting ---------- */
function mounter(ctx){
  return function mountT(o){
    const W=o.W, H=o.H, dpr=o.dpr||1, pal=o.pal||'night';
    const theme={...ctx.pal[pal], font:'sans-serif', lw:1.5, labels:o.labels!==false};
    const cv=document.createElement('canvas'); cv.className='lc-cv';
    cv.style.aspectRatio=`${W+2*M} / ${H+2*M}`; cv.title=`${W}×${H} · ${PAL_NAME[pal]} · dpr ${dpr}`; cv.setAttribute('aria-hidden','true');
    ctx.preview.appendChild(cv);
    const rec={cell:{W,H}, pal, dpr, theme, stats:[], err:null, kind:null, cv, where:{size:`${W}×${H}`, palette:PAL_NAME[pal], dpr}};
    let rej; rec.failed=new Promise((_,r)=>rej=r); rec.failed.catch(()=>{});
    rec.h=LociHost.mount(cv,o.spec||ctx.spec,{theme, params:o.params||ctx.defaults, box:{x:M,y:M,w:W,h:H}, dpr, t:o.t||0, speed:1, playing:false, size:{w:W+2*M,h:H+2*M}, label:'checker',
      onError:(k,msg)=>{ if(k==='slow'){ rec.slow=msg||'slow'; return; } if(!rec.err){ rec.err=msg||k; rec.kind=k; } rej(new Error(`${k}: ${msg}`)); },
      onStats:s=>rec.stats.push(s.ms)});
    ctx.live.add(rec);
    const errMsg=()=>`${rec.kind}: ${rec.err}`;
    rec.ready=(async()=>{
      const until=now()+SETUP_MS+400;
      while(rec.h.state==='loading'){ if(rec.err) throw new Error(errMsg()); if(now()>until) throw new Error(`setup did not finish within ${SETUP_MS/1000} s`); await sleep(20); }
      if(rec.err) throw new Error(errMsg());
      if(rec.h.state!=='running') throw new Error(rec.h.state);
    })();
    rec.capture=async()=>{
      try{ const blob=await withTimeout(Promise.race([rec.h.capture(),rec.failed]),CAP_MS,'capture timed out'); return await pixels(blob); }
      catch(e){ await sleep(0); throw rec.err?new Error(errMsg()):e; }
    };
    rec.at=async t=>{ rec.h.seek(t); return rec.capture(); };
    rec.dispose=()=>{ try{ rec.h.dispose(); }catch(_){} cv.remove(); ctx.live.delete(rec); };
    return rec;
  };
}
const whereOf=(rec,t,extra)=>({...rec.where, ...(t!=null?{t}:{}), ...(extra||{})});

/* one cell of the matrix: setup, frames at t = 2, 10, 30, then 6 s of play */
async function runCell(ctx,cfg){
  const r={cfg, where:{size:`${cfg.W}×${cfg.H}`, palette:PAL_NAME[cfg.pal], dpr:cfg.dpr}, frames:[], lum:[]};
  const m=ctx.mount({...cfg, t:2}); r.rec=m;
  const t0=now(); let phase='setup';
  try{
    await m.ready; r.setupMs=now()-t0;
    for(const t of [2,10,30]){
      phase=`t=${t}`;
      const img=t===2?await m.capture():await m.at(t);
      const ink=inkFraction(img,m.cell,m.theme.bg), out=t<=10?outsideBox(img,m.cell,m.theme.bg):null;
      r.frames.push({t, ink, out, blob:(ink<BLANK||(out&&out.bad))?img.blob:null});
    }
    phase='play'; m.h.seek(0); m.h.play();
    const start=now(), deadline=start+PLAY_MS;
    if(cfg.flash){
      while(now()<deadline){
        const tick=now(), t=m.h.getTime(), img=await m.capture();
        r.lum.push({t, L:boxLuminance(img,m.cell), blob:img.blob});
        await sleep(Math.max(0,100-(now()-tick)));
      }
    } else await Promise.race([sleep(PLAY_MS),m.failed]);
    m.h.pause(); r.playMs=now()-start; r.played=m.h.getTime();
  }catch(e){ r.err=e.message; r.errPhase=phase; }
  r.stats=m.stats.slice(); r.slow=m.slow;
  m.dispose(); return r;
}
function pct(xs,p){ if(!xs.length) return 0; const s=[...xs].sort((a,b)=>a-b); return s[Math.min(s.length-1,Math.floor(p*(s.length-1)+0.5))]; }

function judgeCells(R,cells){
  const G='dynamic', label=r=>`${r.where.size} ${r.where.palette}${r.where.dpr>1?' @2x':''}`;
  // setup
  const bad=cells.find(r=>r.err);
  if(bad) R.add(G,'setup','Setup resolves in 8 s, no errors','fail',`${bad.errPhase==='setup'?'Setup failed':`Error at ${bad.errPhase}`}: ${bad.err} @ ${label(bad)}`,{where:{...bad.where, ...(bad.errPhase.startsWith('t=')?{t:+bad.errPhase.slice(2)}:{})}});
  else { const worst=cells.reduce((a,b)=>b.setupMs>a.setupMs?b:a); R.add(G,'setup','Setup resolves in 8 s, no errors','pass',`Ready in ${Math.round(worst.setupMs)} ms at worst (${label(worst)}) across ${cells.length} runs; no errors.`); }
  // budget
  const measured=cells.filter(r=>r.stats.length>=30);
  const slow=cells.find(r=>r.slow);
  let wp=null; for(const r of measured){ r.p95=pct(r.stats,0.95); r.max=Math.max(...r.stats); if(!wp||r.p95>wp.p95) wp=r; }
  const over=measured.find(r=>r.p95>=P95_MS)||measured.find(r=>r.max>=MAX_MS);
  const note=`${PLAY_MS/1000} s of play per run (the pipeline plays 20 s; shortened here to keep the suite near a minute).`;
  if(slow) R.add(G,'budget','Frame budget','fail',`The host paused it for running slowly (${slow.slow}) @ ${label(slow)}. ${note}`,{where:slow.where});
  else if(over) R.add(G,'budget','Frame budget','fail',`budget p95 ${fmtMs(over.p95)} ms, max ${fmtMs(over.max)} ms @ ${label(over)} (limits: p95 < ${P95_MS} ms, max < ${MAX_MS} ms). ${note}`,{where:over.where});
  else if(measured.length<cells.length/2) R.add(G,'budget','Frame budget','warn',`Only ${measured.length} of ${cells.length} runs produced enough frames to time (${cells.reduce((a,r)=>a+r.stats.length,0)} frames in all): the page was not rendering at full rate (a background tab or hidden window?), so the budget was not measured. Run the checks again with the page in view. ${note}`);
  else { const mx=measured.reduce((a,b)=>b.max>a.max?b:a); R.add(G,'budget','Frame budget','pass',`Worst p95 ${fmtMs(wp.p95)} ms @ ${label(wp)}; max ${fmtMs(mx.max)} ms @ ${label(mx)}; ${measured.reduce((a,r)=>a+r.stats.length,0)} frames timed${measured.length<cells.length?` (${cells.length-measured.length} runs too short to time)`:''}. ${note}`); }
  // stays in the box
  let ob=null; for(const r of cells) for(const f of r.frames) if(f.out&&f.out.bad&&!ob) ob={r,f};
  if(ob) R.add(G,'box','Stays in the box','fail',`outside box at (${ob.f.out.first.join(',')}): ${ob.f.out.bad} of ${ob.f.out.n} sampled pixels outside the box are not theme.bg @ ${label(ob.r)} t=${ob.f.t}`,{where:{...ob.r.where,t:ob.f.t}, frame:ob.f.blob});
  else R.add(G,'box','Stays in the box','pass',`Every sampled pixel outside the box (inset 1 px) is theme.bg at t = 2 and 10, in ${cells.filter(r=>r.frames.length).length} runs.`);
  // not blank
  let bl=null, minInk=1; for(const r of cells) for(const f of r.frames){ minInk=Math.min(minInk,f.ink); if(f.ink<BLANK&&!bl) bl={r,f}; }
  if(bl) R.add(G,'blank','Not blank','fail',`only ${(bl.f.ink*100).toFixed(2)}% of box pixels differ from bg (≥ 2% needed) @ ${label(bl.r)} t=${bl.f.t}`,{where:{...bl.r.where,t:bl.f.t}, frame:bl.f.blob});
  else R.add(G,'blank','Not blank','pass',`At least ${(minInk*100).toFixed(1)}% of the box is drawn at t = 2, 10 and 30 in every run.`);
  // flashing
  const fc=cells.find(r=>r.cfg.flash);
  if(!fc||fc.lum.length<8) R.add(G,'flashing','No flashing (WCAG 2.3.1)',fc&&fc.err?'skip':'warn',fc&&fc.err?'Skipped: the run errored.':'Too few frames were captured to measure flashing.');
  else {
    const f=flashes(fc.lum), span=fc.lum[fc.lum.length-1].t-fc.lum[0].t, rate=(fc.lum.length/(fc.playMs/1000)).toFixed(1);
    if(span<PLAY_MS/2000) R.add(G,'flashing','No flashing (WCAG 2.3.1)','warn',`The animation advanced only ${span.toFixed(1)} s during ${(fc.playMs/1000).toFixed(0)} s of play (the page was not rendering at full rate), so flashing was not measured. Run the checks again with the page in view.`);
    else if(f.worst>FLASH_N) R.add(G,'flashing','No flashing (WCAG 2.3.1)','fail',`flash ${f.worst}/s @ t=${f.at.t.toFixed(1)}: box-average luminance swings by ≥ 10% more than ${FLASH_N} times in one second @ ${label(fc)}.`,{where:{...fc.where,t:+f.at.t.toFixed(2)}, frame:f.at.blob});
    else R.add(G,'flashing','No flashing (WCAG 2.3.1)','pass',`${fc.lum.length} frames at ~${rate}/s @ ${label(fc)}: at most ${f.worst} luminance swing${f.worst===1?'':'s'} of ≥ 10% in any 1 s window (limit ${FLASH_N}).`);
  }
}

/* params at min/default/max (and the other types), palette swap, labels on/off */
async function paramChecks(R,ctx){
  const G='dynamic', man=ctx.manifest, def=ctx.defaults, cfg={W:700,H:300,pal:'night',dpr:1,labels:false};
  let m=null;
  const fresh=async()=>{ if(m) m.dispose(); m=ctx.mount({...cfg,t:5}); await m.ready; await m.capture(); return m; };
  const frameAt=async(params,theme)=>{ if(!m||m.err) await fresh(); m.h.setParams(params); if(theme) m.h.setTheme(theme); return m.capture(); };
  try{
    await fresh();
    const base=await frameAt(def), H0=frameHash(base,m.cell);
    for(const p of man.params){
      const T=`Param “${p.label||p.key}” matters`, id=`param:${p.key}`, d=def[p.key];
      let vals;
      if(p.type==='range'){ const n=normalizeParams(man,{[p.key]:p.min})[p.key], x=normalizeParams(man,{[p.key]:p.max})[p.key]; vals=[['min',n],['max',x]]; }
      else if(p.type==='toggle') vals=[[String(!d),!d]];
      else if(p.type==='select') vals=p.options.filter(o=>o[0]!==d).map(o=>[o[0],o[0]]);
      else if(p.type==='color'){ const alt=d.toLowerCase()==='#808080'?'#ff0000':'#808080'; vals=[[alt,alt]]; }
      else vals=[[`seed ${(d+1)>>>0}`,(d+1)>>>0]];
      const probs=[]; let frame=null, where=null;
      if(p.type==='range' && vals.some(([,v])=>v===d)) for(const [nm,v] of vals) if(v===d) probs.push(`param ${p.key}: ${nm} == default`);
      for(const [nm,v] of vals){
        if(v===d) continue;
        try{
          const img=await frameAt({...def,[p.key]:v});
          if(frameHash(img,m.cell)===H0){ probs.push(`param ${p.key}: ${nm} (${JSON.stringify(v)}) looks the same as the default`); frame=frame||img.blob; where=where||whereOf(m,5,{param:`${p.key}=${v}`}); }
        }catch(e){ probs.push(`param ${p.key} = ${JSON.stringify(v)}: ${e.message}`); where=where||whereOf(m,5,{param:`${p.key}=${v}`}); m.dispose(); m=null; }
      }
      try{ await frameAt(def); }catch(_){ m=null; }
      const shown=p.type==='range'?`min ${vals[0][1]}, default ${d}, max ${vals[1][1]}`:p.type==='toggle'?'on and off':p.type==='select'?`${p.options.length} options`:p.type==='color'?'two colors':'two seeds';
      if(probs.length) R.add(G,id,T,'fail',probs.join('; ')+'.',{where, ...(frame?{frame}:{})});
      else R.add(G,id,T,'pass',`${shown} render without error at t = 5, and each differs from the default (labels off, so only the picture counts).`,{where:whereOf(m||{where:{size:'700×300',palette:'night',dpr:1}},5)});
    }
    // palette swap
    {
      const T='Theme honored: palette', hs={};
      for(const pal of ['graph','contrast']){ const img=await frameAt(def,{...ctx.pal[pal], font:'sans-serif', lw:1.5, labels:false}); hs[pal]={h:frameHash(img,m.cell), blob:img.blob}; }
      await frameAt(def,{...ctx.pal.night, font:'sans-serif', lw:1.5, labels:false});
      const same=Object.keys(hs).filter(k=>hs[k].h===H0);
      if(same.length) R.add(G,'theme-palette',T,'fail',`Swapping night for ${same.map(k=>PAL_NAME[k]).join(' and ')} does not change the frame: draw with theme.bg, fg, a1 and a2.`,{where:{size:'700×300', palette:PAL_NAME[same[0]], t:5}, frame:hs[same[0]].blob});
      else R.add(G,'theme-palette',T,'pass','Night, graph and high contrast give three different frames at t = 5.');
    }
    // labels on vs off
    {
      const T='Theme honored: labels switch', img=await frameAt(def,{...ctx.pal.night, font:'sans-serif', lw:1.5, labels:true});
      if(frameHash(img,m.cell)===H0) R.add(G,'theme-labels',T,'warn','labels:true and labels:false give the same frame. Fine if the piece draws no text; otherwise text is not following theme.labels.',{where:{size:'700×300',palette:'night',t:5}});
      else R.add(G,'theme-labels',T,'pass','labels:true draws text that labels:false leaves out.');
    }
  } finally { if(m) m.dispose(); }
}

/* A copy of the module whose draw() throws if fillText/strokeText runs while theme.labels is false. */
function probeSource(src){
  const re=/^([ \t]*)export\s+default\s+/m, hits=src.match(new RegExp(re.source,'gm'));
  if(!hits||hits.length!==1) return null;
  const pre=`const __lociText=(()=>{ const st={on:false,n:0}; for(const C of [typeof OffscreenCanvasRenderingContext2D!=='undefined'&&OffscreenCanvasRenderingContext2D, typeof CanvasRenderingContext2D!=='undefined'&&CanvasRenderingContext2D]) if(C) for(const k of ['fillText','strokeText']){ const f=C.prototype[k]; C.prototype[k]=function(){ if(st.on) st.n++; return f.apply(this,arguments); }; } return st; })();\n`;
  const post=`\nconst __lociDraw=__lociModule.draw;\n__lociModule.draw=function(a){ __lociText.on=!(a&&a.theme&&a.theme.labels); __lociText.n=0; let r; try{ r=__lociDraw.apply(this,arguments); } finally { __lociText.on=false; } if(__lociText.n) throw new Error('labels off: text detected ('+__lociText.n+' fillText/strokeText call'+(__lociText.n>1?'s':'')+')'); return r; };\nexport default __lociModule;\n`;
  return pre+src.replace(re,(_,ind)=>`${ind}const __lociModule = `)+post;
}
async function labelsOffCheck(R,ctx){
  const G='dynamic', T='Labels off: no text drawn', id='labels-off';
  if(ctx.runtime==='wasm'){
    if(ctx.manifest.render==='commands') return R.add(G,id,T,'pass','Host-enforced: in commands mode the host skips every label command while theme.labels is false.');
    return R.add(G,id,T,'warn','Pixels mode: text in the pixels cannot be detected here (the pipeline runs an OCR spot check).');
  }
  const src=probeSource(ctx.source);
  if(!src) return R.add(G,id,T,'skip','Could not instrument the module (expected exactly one "export default").');
  const m=ctx.mount({W:335,H:490,pal:'night',dpr:1,labels:false,t:1,spec:{...ctx.spec, source:src}});
  let at=1;
  try{
    await m.ready; await m.capture();
    for(const t of [2,5,11,29]){ at=t; await m.at(t); }
    R.add(G,id,T,'pass','With labels:false the module made no fillText or strokeText calls at t = 1, 2, 5, 11 and 29.');
  }catch(e){
    const msg=/labels off: text detected/.test(e.message)?e.message.replace(/^error:\s*(draw:\s*)?/,''):`The instrumented run failed: ${e.message}`;
    R.add(G,id,T,'fail',`${msg} @ 335×490 night t=${at}. Draw text with label(), which skips it when theme.labels is false.`,{where:whereOf(m,at)});
  }finally{ m.dispose(); }
}

/* two fresh instances must agree exactly; a backwards seek must match a fresh instance */
async function determinismChecks(R,ctx){
  const G='dynamic', cfg={W:335,H:490,pal:'night',dpr:1};
  const A=ctx.mount({...cfg,t:3}), B=ctx.mount({...cfg,t:3});
  let C=null;
  try{
    await guard(R,G,'deterministic','Deterministic',async()=>{
      await Promise.all([A.ready,B.ready]);
      let bad=null;
      for(const t of [3,11,29]){
        const [a,b]=t===3?await Promise.all([A.capture(),B.capture()]):await Promise.all([A.at(t),B.at(t)]);
        const n=exactDiff(a,b); if(n && !bad) bad={t,n,a,b};
      }
      if(bad) R.add(G,'deterministic','Deterministic','fail',`nondeterministic at t=${bad.t}: two fresh instances with the same params and seed differ in ${bad.n} pixels. Use mulberry32(seed) instead of Math.random, and t instead of clocks.`,{where:{...A.where,t:bad.t}, frame:bad.a.blob});
      else R.add(G,'deterministic','Deterministic','pass','Two fresh instances give identical pixels at t = 3, 11 and 29.');
    });
    await guard(R,G,'time-jumps','Time jumps (seek back)',async()=>{
      await A.ready; await A.at(30); const back=await A.at(2);
      C=ctx.mount({...cfg,t:2}); await C.ready; const ref=await C.capture();
      const fr=sampledDiff(back,ref,A.cell);
      if(fr>JUMP_TOL) R.add(G,'time-jumps','Time jumps (seek back)','fail',`After seeking 30 → 2, ${(fr*100).toFixed(2)}% of sampled pixels differ from a fresh instance at t = 2 (tolerance 0.5%). If you integrate, detect t going backwards and recompute from the cycle start.`,{where:{...A.where,t:2}, frame:back.blob});
      else R.add(G,'time-jumps','Time jumps (seek back)','pass',`Seeking 30 → 2 renders without error and matches a fresh instance at t = 2 (${(fr*100).toFixed(2)}% of sampled pixels differ; tolerance 0.5%).`);
    });
  } finally { A.dispose(); B.dispose(); if(C) C.dispose(); }
}

async function reducedMotionCheck(R,ctx){
  const G='dynamic', T='Reduced motion: still frame', id='reduced-motion';
  if(ctx.manifest.motion!=='static') return R.add(G,id,T,'skip',`motion is "${ctx.manifest.motion}": reduced-motion viewers start paused, so there is no t = 0 still to check.`);
  const m=ctx.mount({W:335,H:490,pal:'night',dpr:1,t:0});
  try{ await m.ready; const img=await m.capture(), ink=inkFraction(img,m.cell,m.theme.bg);
    if(ink<BLANK) R.add(G,id,T,'fail',`motion is "static" but the t = 0 frame is blank (${(ink*100).toFixed(2)}% drawn).`,{where:whereOf(m,0), frame:img.blob});
    else R.add(G,id,T,'pass',`The t = 0 still is drawn (${(ink*100).toFixed(1)}% of the box).`);
  } finally { m.dispose(); }
}

function linkCheck(R,md){
  const G='content', T='Links', id='links';
  if(md==null) return R.add(G,id,T,'skip','No explanation.md.');
  const urls=new Set();
  for(const mm of md.matchAll(/\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/g)) urls.add(mm[1]);
  for(const mm of md.matchAll(/<([a-z][\w+.-]*:\/\/[^>\s]+)>|(?:^|[\s(])(https?:\/\/[^\s)<>\]]+)/gi)) urls.add((mm[1]||mm[2]).replace(/[.,;:!?]+$/,''));
  if(!urls.size) return R.add(G,id,T,'pass','No links in the explanation. (Resolving links runs server-side on upload.)');
  const probs=[];
  for(const u of urls){
    let x; try{ x=new URL(u); }catch(_){ probs.push(`${u}: not a well-formed absolute URL`); continue; }
    if(!/^https?:$/.test(x.protocol)) probs.push(`${u}: only http(s) links`);
    else if(SHORTENERS.some(h=>x.hostname===h||x.hostname.endsWith('.'+h))) probs.push(`${u}: link shorteners hide the destination`);
  }
  R.add(G,id,T,probs.length?'warn':'pass',probs.length?probs.join('; ')+'. (Resolving links runs server-side on upload.)':`${plural(urls.size,'link')}, all well-formed http(s) and not shorteners. Resolving them runs server-side on upload.`);
}

/* ---------- the run ---------- */
function catalogModules(){
  const list=typeof VIZ!=='undefined'?VIZ:[];
  return list.map(v=>{
    const source=v.manifest&&v.manifest.runtime==='js'&&typeof moduleSource==='function'?moduleSource(v):null;
    let cache=null;
    return {id:v.id, title:v.title, source, bytes:()=>cache||(cache=source!=null?Promise.resolve(new TextEncoder().encode(source)):v.entry?fetch(v.entry).then(r=>r.ok?r.arrayBuffer():null).then(b=>b&&new Uint8Array(b)).catch(()=>null):Promise.resolve(null))};
  });
}
function vocabulary(){ const s=new Set(); (typeof VIZ!=='undefined'?VIZ:[]).forEach(v=>(v.tags||[]).forEach(t=>s.add(t))); return s; }

async function run(pkg,opts={}){
  const T0=now(), R=makeReport(), onProgress=typeof opts.onProgress==='function'?opts.onProgress:()=>{};
  let preview=opts.preview, ownPreview=false;
  if(!preview){ preview=document.createElement('div'); preview.style.cssText='position:fixed;left:-10000px;top:0;width:400px'; document.body.appendChild(preview); ownPreview=true; }
  const ctx={pal:palettes(), preview, live:new Set(), vocab:vocabulary(), catalog:catalogModules()};
  ctx.mount=mounter(ctx);
  const heap0=typeof performance!=='undefined'&&performance.memory?performance.memory.usedJSHeapSize:null;
  const cells=[]; for(const [W,H] of SIZES) for(const pal of PALS) cells.push({W,H,pal,dpr:1,flash:W===335&&pal==='night'});
  cells.splice(1,0,{W:335,H:490,pal:'night',dpr:2});
  const n=1+cells.length+5; let step=0, posterBlob=null;
  const progress=label=>{ try{ onProgress(Math.min(step,n),n,label); }catch(_){} };
  const deadline=T0+(opts.maxMs||TOTAL_MS), late=()=>now()>deadline;
  const skipAll=(why,list)=>list.forEach(([id,title])=>R.add('dynamic',id,title,'skip',why));
  const DYN=[['setup','Setup resolves in 8 s, no errors'],['budget','Frame budget'],['box','Stays in the box'],['blank','Not blank'],['flashing','No flashing (WCAG 2.3.1)'],['theme-palette','Theme honored: palette'],['theme-labels','Theme honored: labels switch'],['labels-off','Labels off: no text drawn'],['deterministic','Deterministic'],['time-jumps','Time jumps (seek back)'],['reduced-motion','Reduced motion: still frame'],['memory','Memory']];
  try{
    progress('Static checks: manifest, sizes, license, imports, explanation, metadata, duplicates');
    const P=normalizePkg(pkg);
    await staticChecks(R,P,ctx); step++;
    const man=ctx.manifest, entryOK=ctx.runtime==='js'?ctx.source!=null:!!ctx.bytes;
    if(!man||!entryOK||typeof LociHost==='undefined'){
      skipAll(!man?'Skipped: the manifest did not validate.':!entryOK?`Skipped: no ${ctx.entry} to run.`:'Skipped: LociHost is not loaded.',DYN);
    } else {
      ctx.defaults=normalizeParams(man,{});
      ctx.spec=ctx.runtime==='js'?{runtime:'js', render:'canvas2d', source:ctx.source, manifest:man, trusted:false}:{runtime:'wasm', render:man.render, bytes:ctx.bytes.buffer.slice(0), manifest:man, trusted:false};
      // the matrix, two runs at a time
      const results=new Array(cells.length); let next=0;
      const worker=async()=>{ while(next<cells.length){ const i=next++, c=cells[i];
        if(late()){ results[i]={cfg:c, where:{size:`${c.W}×${c.H}`,palette:PAL_NAME[c.pal],dpr:c.dpr}, frames:[], lum:[], stats:[], err:'skipped: the suite hit its time cap', errPhase:'setup'}; step++; continue; }
        progress(`Playing ${c.W}×${c.H} · ${PAL_NAME[c.pal]} · dpr ${c.dpr} for ${PLAY_MS/1000} s${c.flash?' (sampling luminance for flashing)':''}`);
        results[i]=await runCell(ctx,c); step++; progress(`Finished ${c.W}×${c.H} · ${PAL_NAME[c.pal]} · dpr ${c.dpr}`); } };
      await Promise.all(Array.from({length:POOL},worker));
      judgeCells(R,results);
      const setupOK=!results.some(r=>r.err&&r.errPhase==='setup');
      const later=[
        ['Params at min, default and max; palette swap; labels on and off',()=>paramChecks(R,ctx),[...man.params.map(p=>[`param:${p.key}`,`Param “${p.label||p.key}” matters`]),DYN[5],DYN[6]]],
        ['Labels off: watching for fillText',()=>labelsOffCheck(R,ctx),[DYN[7]]],
        ['Determinism and seeking backwards',()=>determinismChecks(R,ctx),[DYN[8],DYN[9]]],
        ['Reduced motion',()=>reducedMotionCheck(R,ctx),[DYN[10]]],
        ['Poster at 700×300 night',async()=>{ const t=(Number.isFinite(man.t0)?man.t0:0)+6; posterBlob=await withTimeout(LociHost.poster(ctx.spec,{w:700,h:300,dpr:1,box:{x:0,y:0,w:700,h:300},theme:{...ctx.pal.night,font:'sans-serif',lw:1.5,labels:true},params:ctx.defaults,t}),SETUP_MS+CAP_MS,'poster timed out'); },[]],
      ];
      for(const [label,fn,ids] of later){
        progress(label);
        if(!setupOK) skipAll('Skipped: setup failed.',ids);
        else if(late()) skipAll('Skipped: the suite hit its time cap.',ids);
        else{ const before=R.checks.length; try{ await fn(); }catch(e){ console.warn('loci-checks:',label,e); const have=new Set(R.checks.slice(before).map(c=>c.id)); ids.filter(([id])=>!have.has(id)).forEach(([id,title])=>R.add('dynamic',id,title,'fail',`The check crashed: ${e&&e.message||e}`)); } }
        step++;
      }
      const heap1=heap0!=null&&performance.memory?performance.memory.usedJSHeapSize:null;
      if(heap1==null) R.add('dynamic','memory','Memory','skip',`performance.memory is not available in this browser. WASM memory is capped at 64 MiB by the host either way.`);
      else { const g=(heap1-heap0)/1048576; R.add('dynamic','memory','Memory',g>=32?'warn':'pass',`Page JS heap grew ${g.toFixed(1)} MB over the run (warn at 32 MB). The module's own worker heap is not visible from the page; WASM memory is capped at 64 MiB by the host.`); }
    }
    progress('Content checks');
    R.add('content','frames','Image safety','skip',CONTENT_NOTE);
    R.add('content','text','Text moderation','skip',CONTENT_NOTE);
    linkCheck(R,ctx.md);
    step=n; progress('Done');
  }catch(e){
    console.error('loci-checks: run crashed',e); R.add('static','runner','Checker','fail',`The checker itself crashed: ${e&&e.message||e}`);
  }finally{
    for(const r of [...ctx.live]) try{ r.dispose(); }catch(_){}
    if(ownPreview) preview.remove();
  }
  const order={static:0,dynamic:1,content:2};
  R.checks.sort((a,b)=>order[a.group]-order[b.group]);
  const counted=R.checks.filter(c=>c.status!=='skip');
  return {ok:!R.checks.some(c=>c.status==='fail'), checks:R.checks, manifest:ctx.manifest||ctx.rawManifest||null, posterBlob, durationMs:Math.round(now()-T0),
    packageHash:ctx.packageHash||null, moduleHash:ctx.moduleHash||null, playSeconds:PLAY_MS/1000,
    counts:{total:counted.length, pass:counted.filter(c=>c.status==='pass').length, fail:counted.filter(c=>c.status==='fail').length, warn:counted.filter(c=>c.status==='warn').length, skip:R.checks.length-counted.length}};
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
    if((total+=usize)>4*LIMIT.pkg) throw new Error('the archive expands to more than 16 MB');
    if(lho+30>u8.length || dv.getUint32(lho,true)!==0x04034b50) throw new Error(`${name}: bad local header`);
    const start=lho+30+dv.getUint16(lho+26,true)+dv.getUint16(lho+28,true), raw=u8.subarray(start,start+csize);
    const bytes=method===0?raw.slice():method===8?await inflateRaw(raw):null;
    if(!bytes) throw new Error(`${name}: compression method ${method} is not supported (stored or deflate only)`);
    if(bytes.length!==usize) throw new Error(`${name}: expected ${usize} bytes, got ${bytes.length}`);
    out.set(name,{bytes:bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)});
  }
  return out;
}
const TEXT_FILE=/(\.(json|md|markdown|js|mjs|txt|c|h|sh|css|html)|(^|\/)(LICEN[CS]E|COPYING|README)(\.\w+)?)$/i;
function withText(files){ const td=new TextDecoder(); for(const [p,f] of files) if(f.text==null && f.bytes && TEXT_FILE.test(p)) f.text=td.decode(asU8(f.bytes)); return files; }

/* ---------- built-in samples, generated from a catalog piece ---------- */
function licenseText(id,author,year){
  if(id==='MIT') return `MIT License\n\nCopyright (c) ${year} ${author}\n\nPermission is hereby granted, free of charge, to any person obtaining a copy\nof this software and associated documentation files (the "Software"), to deal\nin the Software without restriction, including without limitation the rights\nto use, copy, modify, merge, publish, distribute, sublicense, and/or sell\ncopies of the Software, and to permit persons to whom the Software is\nfurnished to do so, subject to the following conditions:\n\nThe above copyright notice and this permission notice shall be included in all\ncopies or substantial portions of the Software.\n\nTHE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR\nIMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,\nFITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE\nAUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER\nLIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,\nOUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE\nSOFTWARE.\n`;
  return `Copyright (C) ${year} ${author}\n\nThis program is free software, licensed under ${id}.\nThe full license text is at https://spdx.org/licenses/${id}.html\n(abbreviated in this sample package).\n`;
}
function samplePackage(v,failing){
  const man=JSON.parse(manifestJSON(v.manifest));
  const loci={api:1, id:man.id, title:man.title, hook:v.hook, alt:v.alt, author:v.author, license:v.license, tags:v.tags,
    runtime:'js', entry:'index.js', render:'canvas2d', params:man.params, presets:man.presets, ...(man.cycle?{cycle:man.cycle}:{}), motion:man.motion, t0:v.t0};
  let src=moduleSource(v), md=v.md;
  if(failing){
    const call='return draw(ctx, w, h, t, legacyP(theme, params), state, box);';
    if(!src.includes(call)) throw new Error('sample: unexpected module shape');
    src=src.replace(call,`draw(ctx, w, h, t, legacyP(theme, params), state, box);
    // a sparkle at a random spot: not a function of t
    ctx.fillStyle = theme.a1;
    ctx.beginPath(); ctx.arc(box.x + box.w * Math.random(), box.y + box.h * Math.random(), 3, 0, 2 * Math.PI); ctx.fill();
    // a watermark drawn with fillText, ignoring theme.labels
    ctx.font = '12px sans-serif'; ctx.fillStyle = theme.fg; ctx.fillText('draft', box.x + 6, box.y + box.h - 6);
    // a status strip across the top of the canvas, under the host's controls
    ctx.fillStyle = theme.a2; ctx.fillRect(0, 0, w, 4);`);
    md=md.replace(/^\*\*Reference\.\*\*.*$/m,'').trimEnd()+'\n';
  }
  const dir=v.id+(failing?'-broken':''), files=new Map();
  files.set(`${dir}/loci.json`,{text:JSON.stringify(loci,null,2)+'\n'});
  files.set(`${dir}/index.js`,{text:src});
  files.set(`${dir}/explanation.md`,{text:md.endsWith('\n')?md:md+'\n'});
  files.set(`${dir}/LICENSE`,{text:licenseText(v.license,v.author,2026)});
  return {name:dir, files};
}

const api={run, unzip, withText, samplePackage, probeSource, stripComments, jaccard, shingles, flashes, normalizePkg, LICENSES};
if(typeof module!=='undefined' && module.exports) module.exports=api;
root.LociChecks=api;
})(typeof globalThis!=='undefined'?globalThis:this);
