/* ---------- LociChecks: the automated gate, run in the browser (docs/review-pipeline.md, section 2) ----------
   run(pkg, {onProgress, preview, bounties}) -> Promise<report>   (bounties: the Wanted list, [{id, status, title, answer?}],
              passed in by the page so the gate stays runnable on its own; without it a "bounty" id is a warning)
     pkg    = { files: Map<path, {text?: string, bytes?: ArrayBuffer|Uint8Array}> }  (a folder or an unzipped .zip;
              a single top-level folder is fine: paths are taken relative to the shallowest loci.json)
     report = { ok, checks:[{id, group, target?, title, status, detail, where?, frame?}], targets:[{id, render, matrix, ran, note}],
              manifest, posterBlob, durationMs, ... }
   Checks that read or run one target's module carry target ('any' for a piece without targets; ids get "@desktop" etc.
   otherwise). Static checks run once per target's entry; the dynamic suite runs once per target that can run here.
   Static checks read the files. Dynamic checks mount the module with LociHost (runtime.js) on canvases the
   checker owns, so they run in the same sandboxed worker as the feed. Content checks run server-side and are
   reported as skipped, except a local link lint.
   Also: unzip(arrayBuffer) -> Map (central-directory parser + DecompressionStream('deflate-raw')),
   samplePackage(viz, failing, overrides) -> pkg built from a catalog piece (loadSample also fetches a WASM piece's
   module.wasm), remixPackage(viz, {target: source}) -> a remix as its own package (new id, remixOf, author: the handle passed as o.author, else @you).
   Loads under node too (no DOM at load time). */
(function(root){
'use strict';
const LICENSES=['MIT','BSD-2-Clause','BSD-3-Clause','Apache-2.0','GPL-3.0','MPL-2.0','ISC','CC0-1.0'];
const LIMIT={js:200*1024, wasm:2*1024*1024, pkg:4*1024*1024};
const SIZES=[[335,490],[700,300],[1100,700]], PALS=['night','graph','contrast'];
const TNAME={any:'Any device', desktop:'Desktop', mobile:'Mobile'};
/* The dynamic matrix per target (docs/review-pipeline.md, "Targets"): a piece without targets gets the full matrix;
   a mobile target the phone matrix; a desktop target the desktop matrix with CPU + GPU time in a 16 ms budget. */
function matrixFor(tid){
  if(tid==='mobile') return {p95:12, text:'Phone matrix: 335×490 and 700×300 at pixel ratio 1 and 2 on the night palette, plus graph and high contrast at pixel ratio 1; frame budget p95 < 12 ms.',
    cells:[{W:335,H:490,pal:'night',dpr:1,flash:true},{W:335,H:490,pal:'night',dpr:2},{W:700,H:300,pal:'night',dpr:1},{W:700,H:300,pal:'night',dpr:2},{W:335,H:490,pal:'graph',dpr:1},{W:700,H:300,pal:'contrast',dpr:1}]};
  if(tid==='desktop') return {p95:16, text:'Desktop matrix: 1100×700 and 700×300 at pixel ratio 1 on the night, graph and high-contrast palettes; frame budget p95 < 16 ms, CPU + GPU when the browser has a GPU timer.',
    cells:[{W:1100,H:700,pal:'night',dpr:1,flash:true},{W:700,H:300,pal:'night',dpr:1},{W:1100,H:700,pal:'graph',dpr:1},{W:700,H:300,pal:'contrast',dpr:1}]};
  const cells=[]; for(const [W,H] of SIZES) for(const pal of PALS) cells.push({W,H,pal,dpr:1,flash:W===335&&pal==='night'});
  cells.splice(1,0,{W:335,H:490,pal:'night',dpr:2});
  return {p95:12, text:'Run in the sandboxed worker at 335×490, 700×300 and 1100×700, on the night, graph and high-contrast palettes, plus one run at 2× pixel ratio.', cells};
}
const M=24;                 // CSS px of canvas around the box, so "outside the box" has pixels to sample
const PLAY_MS=6000;         // per matrix cell; the pipeline plays 20 s
const SETUP_MS=8000, CAP_MS=6000, TOTAL_MS=180000, POOL=2;
const MAX_MS=40, BLANK=0.02, JUMP_TOL=0.005, FLASH_D=0.10, FLASH_N=3;
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

/* ---------- GLSL in JS strings ---------- */
/* Every string or template literal that looks like GLSL ("void main", gl_FragCoord or "#version 300 es"), with its offset. */
function glslStrings(src){
  const out=[], n=src.length; let i=0;
  while(i<n){
    const c=src[i], d=src[i+1];
    if(c==='/' && d==='/'){ while(i<n && src[i]!=='\n') i++; continue; }
    if(c==='/' && d==='*'){ i+=2; while(i<n && !(src[i]==='*' && src[i+1]==='/')) i++; i+=2; continue; }
    if(c==='"' || c==="'" || c==='`'){
      const q=c, start=++i;
      while(i<n && src[i]!==q){ if(src[i]==='\\'){ i+=2; continue; } if(q!=='`' && src[i]==='\n') break; i++; }
      const body=src.slice(start,i); i++;
      if(/void\s+main\b|gl_FragCoord|#version\s+300\s+es/.test(body)) out.push({body, at:start});
      continue;
    }
    i++;
  }
  return out;
}
const glslComments=s=>s.replace(/\/\*[\s\S]*?\*\//g,m=>m.replace(/[^\n]/g,' ')).replace(/\/\/[^\n]*/g,m=>' '.repeat(m.length));
/* while/do → fail; a for whose bound is not an integer literal or a #define/const int, and that has no
   literal "if (i >= N) break;" guard in its body → warn. Line numbers are lines of the JS source. */
function shaderLoops(src){
  const res={shaders:0, loops:0, fail:[], warn:[]};
  for(const g of glslStrings(src)){
    res.shaders++;
    const code=glslComments(g.body), ln=k=>lineAt(src,g.at+k), consts=new Set();
    for(const mm of code.matchAll(/#define\s+([A-Za-z_]\w*)\s+(\d+)\b/g)) consts.add(mm[1]);
    for(const mm of code.matchAll(/\bconst\s+(?:lowp\s+|mediump\s+|highp\s+)?(?:int|uint)\s+([A-Za-z_]\w*)\s*=\s*(\d+)u?\s*;/g)) consts.add(mm[1]);
    const lit=x=>/^\d+u?$/.test(x) || consts.has(x);
    for(const mm of code.matchAll(/\bwhile\s*\(/g)) res.fail.push(`line ${ln(mm.index)}: while loop in GLSL`);
    for(const mm of code.matchAll(/\bfor\s*\(([^;]*);([^;]*);([^)]*)\)/g)){
      res.loops++;
      const head=mm[1], cond=mm[2].trim(), v=(head.match(/([A-Za-z_]\w*)\s*=/)||[])[1];
      const c=cond.match(/^\(?\s*([A-Za-z_]\w*)\s*(<=|<|>=|>|!=)\s*([^)]*?)\s*\)?$/), bound=c&&c[1]===v?c[3].trim():null;
      if(bound!=null && lit(bound)) continue;
      // the body: from the brace after the header to its match
      let j=mm.index+mm[0].length; while(j<code.length && /\s/.test(code[j])) j++;
      let body='';
      if(code[j]==='{'){ let depth=0, k=j; for(;k<code.length;k++){ if(code[k]==='{') depth++; else if(code[k]==='}' && --depth===0) break; } body=code.slice(j,k+1); }
      else body=code.slice(j,code.indexOf(';',j)+1);
      const guard=v && new RegExp(`\\bif\\s*\\(\\s*${v}\\s*>=?\\s*([A-Za-z_]\\w*|\\d+u?)\\s*\\)\\s*\\{?\\s*break\\s*;`).exec(body);
      if(guard && lit(guard[1])) continue;
      res.warn.push(`line ${ln(mm.index)}: for (${cond}) has no literal bound`);
    }
  }
  return res;
}

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
/* A report that tags every check with one target: ids get "@target" and titles " · Target" when the piece has targets. */
function forTarget(R,tc){
  if(tc.id==='any') return {add:(g,id,title,st,d,x)=>R.add(g,id,title,st,d,{...(x||{}), target:'any'}), checks:R.checks};
  return {add:(g,id,title,st,d,x)=>R.add(g,`${id}@${tc.id}`,`${title} · ${TNAME[tc.id]}`,st,d,{...(x||{}), target:tc.id}), checks:R.checks};
}
async function staticChecks(R,P,ctx){
  const G='static', f=P.files, rawMan=textOf(f.get('loci.json'));
  let man=null;
  // manifest (the targets are judged by their own checks below)
  await guard(R,G,'manifest','Manifest validates',()=>{
    if(rawMan==null) return R.add(G,'manifest','Manifest validates','fail','No loci.json in the package.');
    let j; try{ j=JSON.parse(rawMan); }catch(e){ return R.add(G,'manifest','Manifest validates','fail',`loci.json is not valid JSON: ${e.message}`); }
    try{ validateManifest(j,{targets:false}); man=j; const ts=runnableTargets(j);
      R.add(G,'manifest','Manifest validates','pass',`loci.json schema v1: ${ts.map(t=>`${t.id==='any'?'':TNAME[t.id].toLowerCase()+' '}${t.runtime}/${t.render}`).join(', ')}, ${plural(j.params.length,'param')}, motion "${j.motion}".`); }
    catch(e){ ctx.rawManifest=j; R.add(G,'manifest','Manifest validates','fail',e.message); }
  });
  const m0=man||ctx.rawManifest||{};
  // targets: the rules of docs/module-api.md, "Targets"
  const probs=Array.isArray(m0.params)?targetProblems(m0):[];
  await guard(R,G,'targets','Targets',()=>{
    const T='Targets', bad=probs.filter(p=>p.rule==='targets');
    if(m0.targets==null) return R.add(G,'targets',T,'pass','No "targets": one target, "any", from the top-level runtime, render and entry, checked against the full matrix.');
    if(bad.length) return R.add(G,'targets',T,'fail',bad.map(p=>`${p.where}: ${p.msg}`).join('; ')+'.');
    const ts=targetsOf(m0); R.add(G,'targets',T,'pass',`${ts.map(t=>t.id==='download'?`download (${t.format})`:`${t.id} (${t.runtime}/${t.render}${t.requires.length?`, needs ${t.requires.join(', ')}`:''})`).join(', ')}.`);
  });
  await guard(R,G,'target-params','Target params',()=>{
    const T='Target params', bad=probs.filter(p=>p.rule==='target-params'), with_=(Array.isArray(m0.targets)?m0.targets:[]).filter(t=>t&&Array.isArray(t.params));
    if(bad.length) return R.add(G,'target-params',T,'fail',bad.map(p=>`${p.where}: ${p.msg}`).join('; ')+'.');
    if(!with_.length) return R.add(G,'target-params',T,'pass',m0.targets?'No target lists its params, so every target honors all of them.':'No targets.');
    R.add(G,'target-params',T,'pass',with_.map(t=>`${t.id} honors ${t.params.length===(m0.params||[]).length?'all':t.params.length+' of '+(m0.params||[]).length} params`).join('; ')+'; every key is a param of the piece.');
  });
  ctx.manifest=man&&!probs.length?man:null; ctx.linkManifest=man; const m=m0; // live links need only a valid manifest; the dynamic suite needs a fully valid manifest, targets included
  // the runnable targets and their entries
  ctx.targets=runnableTargets(m).map(t=>{
    const runtime=t.runtime==='wasm'?'wasm':'js', entry=typeof t.entry==='string'&&t.entry?t.entry.replace(/^\.\//,''):(runtime==='wasm'?'module.wasm':'index.js'), ef=f.get(entry);
    return {id:t.id, t, runtime, render:t.render, entry, ef, source:runtime==='js'?textOf(ef):null, bytes:runtime==='wasm'&&ef?bytesOf(ef).slice():null};
  });
  await sharedStatic(R,P,ctx,m,man);
  for(const tc of ctx.targets) await targetStatic(forTarget(R,tc),P,ctx,tc,m);
}
/* the checks that read one target's entry: size, imports, forbidden APIs, shader loops, duplicates */
async function targetStatic(R,P,ctx,tc,m){
  const G='static', f=P.files, {runtime, entry, ef}=tc;
  {
  // sizes
  await guard(R,G,'size','Size limits',()=>{
    const es=sizeOf(ef), lim=(TARGET_LIMITS[tc.id]||TARGET_LIMITS.any)[runtime], probs=[];
    if(!ef) probs.push(`entry ${entry} is missing`);
    else if(es>lim) probs.push(`${entry} is ${kb(es)} (limit ${kb(lim)})`);
    if(P.total>LIMIT.pkg) probs.push(`package is ${kb(P.total)} (limit ${kb(LIMIT.pkg)})`);
    R.add(G,'size','Size limits',probs.length?'fail':'pass',probs.length?probs.join('; ')+'.':`${entry} ${kb(es)} of ${kb(lim)}; package ${kb(P.total)} of ${kb(LIMIT.pkg)} (${plural(P.files.size,'file')}).`);
  });
  // imports
  await guard(R,G,'imports','Imports',async()=>{
    const T='Imports';
    if(!ef) return R.add(G,'imports',T,'skip',`No ${entry} to read.`);
    if(runtime==='wasm'){
      let mod; try{ mod=await WebAssembly.compile(tc.bytes.slice()); }catch(e){ return R.add(G,'imports',T,'fail',`${entry} is not a valid WebAssembly module: ${e.message}`); }
      const bad=WebAssembly.Module.imports(mod).filter(i=>!(i.kind==='memory' || (i.kind==='function' && i.module==='env' && (WASM_MATH.includes(i.name)||WASM_MATH.includes(i.name.replace(/f$/,''))))));
      return R.add(G,'imports',T,bad.length?'fail':'pass',bad.length?`Only Math functions from "env" may be imported; found ${bad.map(i=>`${i.module}.${i.name} (${i.kind})`).join(', ')}.`:`WebAssembly imports only Math functions from "env".`);
    }
    const code=stripComments(tc.source), probs=[], kitNames=typeof LOCI_KIT!=='undefined'?LOCI_KIT.map(fn=>fn.name):null;
    for(const mm of code.matchAll(/(^|[;\n}])[ \t]*(import|export)\b([^;'"`]*?)\bfrom\s*(['"])([^'"]*)\4|(^|[;\n}])[ \t]*import\s*(['"])([^'"]*)\7/g)){
      const spec=mm[5]!=null?mm[5]:mm[8], kw=mm[2]||'import', clause=(mm[3]||'').trim(), ln=lineAt(code,mm.index+mm[1].length);
      if(spec==='@loci/three'){ if(kw==='export' || !/^(\{[^}]*\}|\*\s*as\s+[A-Za-z_$][\w$]*)$/.test(clause)) probs.push(`line ${ln}: use import * as THREE from '@loci/three'`); else tc.three=true; continue; }
      if(spec!=='@loci/kit'){ probs.push(`line ${ln}: ${kw} from '${spec}' (only '@loci/kit' and '@loci/three' are allowed)`); continue; }
      if(kw==='export' || !/^\{[^}]*\}$/.test(clause)){ probs.push(`line ${ln}: use import { … } from '@loci/kit'`); continue; }
      if(kitNames) for(const nm of clause.slice(1,-1).split(',').map(s=>s.trim().split(/\s+as\s+/)[0]).filter(Boolean)) if(!kitNames.includes(nm)) probs.push(`line ${ln}: '@loci/kit' has no export ${nm}`);
    }
    for(const mm of code.matchAll(/(^|[^\w$.])import\s*\(/g)) probs.push(`line ${lineAt(code,mm.index+mm[1].length)}: dynamic import()`);
    for(const mm of code.matchAll(/\bimportScripts\b/g)) probs.push(`line ${lineAt(code,mm.index)}: importScripts`);
    R.add(G,'imports',T,probs.length?'fail':'pass',probs.length?probs.join('; ')+'.':tc.three?`Imports only '@loci/kit' and the host's pinned '@loci/three'.`:`Imports only '@loci/kit'.`);
  });
  // forbidden APIs
  await guard(R,G,'forbidden-apis','Forbidden APIs (lint)',()=>{
    const T='Forbidden APIs (lint)';
    if(runtime==='wasm') return R.add(G,'forbidden-apis',T,'skip','WebAssembly: a module reaches only the Math imports allowed above, so there is no source to lint.');
    if(tc.source==null) return R.add(G,'forbidden-apis',T,'skip',`No ${entry} to read.`);
    const code=stripComments(tc.source);
    const HARD=[['fetch',/\bfetch\b/],['XMLHttpRequest',/\bXMLHttpRequest\b/],['WebSocket',/\bWebSocket\b/],['EventSource',/\bEventSource\b/],['indexedDB',/\bindexedDB\b/],['localStorage',/\blocalStorage\b/],['sessionStorage',/\bsessionStorage\b/],['FontFace',/\bFontFace\b/],['new Image',/\bnew\s+Image\b/],['eval',/\beval\s*\(/],['Function(',/\bFunction\s*\(/]];
    const SOFT=[['Date.now',/\bDate\s*\.\s*now\b/],['performance.now',/\bperformance\s*\.\s*now\b/],['Math.random',/\bMath\s*\.\s*random\b/],['fillText',/\.\s*(fillText|strokeText)\s*\(/]];
    const hit=list=>list.map(([n,re])=>{ const mm=code.match(re); return mm?`${n} (line ${lineAt(code,mm.index)})`:null; }).filter(Boolean);
    const h=hit(HARD), s=hit(SOFT);
    if(h.length) return R.add(G,'forbidden-apis',T,'fail',`References ${h.join(', ')}. The sandbox removes these, so the piece would break.${s.length?` Also: ${s.join(', ')}.`:''}`);
    if(s.length) return R.add(G,'forbidden-apis',T,'warn',`References ${s.join(', ')}. Clocks and Math.random make frames nondeterministic (tested below; use t and mulberry32(seed)); draw text with label(), which honors theme.labels.`);
    R.add(G,'forbidden-apis',T,'pass','No network, storage, font, image, eval or clock APIs referenced.');
  });
  // shader loops: the watchdog cannot stop a GPU that is stuck in a shader, so loops must be visibly bounded
  await guard(R,G,'shader-loops','Shader loops',()=>{
    const T='Shader loops';
    if(runtime==='wasm') return R.add(G,'shader-loops',T,'skip','WebAssembly: no GLSL.');
    if(tc.source==null) return R.add(G,'shader-loops',T,'skip',`No ${entry} to read.`);
    const res=shaderLoops(tc.source);
    if(!res.shaders) return R.add(G,'shader-loops',T,'pass',tc.render==='webgl2'?'No GLSL strings in the source (a three.js piece using built-in materials, for example).':'No GLSL in the source.');
    const where=`${plural(res.shaders,'GLSL string')}, ${plural(res.loops,'for loop')}`;
    if(res.fail.length) return R.add(G,'shader-loops',T,'fail',`${res.fail.join('; ')}. A GPU stuck in a shader cannot be stopped by the watchdog: use for with a literal cap and break on the uniform. (${where})`);
    if(res.warn.length) return R.add(G,'shader-loops',T,'warn',`${res.warn.join('; ')}. Bound it by an integer literal or a const, or add if(i >= N) break; with a literal N. (${where})`);
    R.add(G,'shader-loops',T,'pass',`${where}; every loop has a literal or const trip count, or a literal break guard. No while loops.`);
  });
  }
  // pointer input: the declaration, and whether the module reads the events it asked for
  await guard(R,G,'pointer','Pointer input',()=>{
    const T='Pointer input', decl=tc.t.pointer??m.pointer, probs=[];
    if(m.pointer!=null) for(const p of pointerProblems(m.pointer)) probs.push(`pointer${p.where}: ${p.msg}`);
    if(tc.t.pointer!=null) for(const p of pointerProblems(tc.t.pointer)) probs.push(`${tc.id==='any'?'':`targets.${tc.id}.`}pointer${p.where}: ${p.msg}`);
    if(probs.length) return R.add(G,'pointer',T,'fail',probs.join('; ')+'.');
    const P=pointerFor(m,tc.t);
    if(P.mode==='none') return R.add(G,'pointer',T,'pass',decl?'pointer mode "none": the host keeps scrub-by-drag and long-press.':'No pointer declaration: the host keeps scrub-by-drag and long-press, and the piece gets no events.');
    const kinds=['drag','click','keys','wheel'].filter(k=>P[k]).join(', ')||'none';
    if(runtime==='wasm') return R.add(G,'pointer',T,'warn',`Declares pointer mode "${P.mode}", but WebAssembly modules receive no events in API v1: the slide becomes engageable and nothing answers. Drop "pointer" or ship a JS target for it.`);
    if(tc.source==null) return R.add(G,'pointer',T,'skip',`No ${entry} to read.`);
    const code=stripComments(tc.source), reads=/\bevents\b/.test(code)||/\bonEvent\b/.test(code), notes=[];
    if(/\bgetView\s*\(/.test(code)!==/\bsetView\s*\(/.test(code)) notes.push('it has only one of getView() and setView(): share links need both to restore the view');
    else if(/\bview\s*:/.test(code) && !/\bsetView\s*\(/.test(code)) notes.push('it returns a view from draw() but has no setView(view), so a share link cannot restore it');
    if(!reads) return R.add(G,'pointer',T,'warn',`Declares pointer mode "${P.mode}" (${kinds}) but never reads \`events\` from draw() or defines onEvent(): the slide would become engageable and nothing would answer.${notes.length?' Also: '+notes.join('; ')+'.':''}`);
    R.add(G,'pointer',T,notes.length?'warn':'pass',`Pointer mode "${P.mode}" (${kinds}), hint “${P.hint}”; the module reads ${/\bonEvent\b/.test(code)?'onEvent()':'events'}.${notes.length?' But '+notes.join('; ')+'.':''}`);
  });
  await duplicateCheck(R,P,ctx,tc,m);
}
function texLib(){
  if(root.LociTeX) return root.LociTeX;
  try{ return typeof require==='function'?require('./tex.js'):null; }catch(_){ return null; }
}
async function sharedStatic(R,P,ctx,m,man){
  const G='static', f=P.files;
  // license
  await guard(R,G,'license','Open-source license',()=>{
    const lf=[...f.keys()].find(p=>/^(LICEN[CS]E|COPYING)(\.(md|txt))?$/i.test(p)), probs=[];
    if(!LICENSES.includes(m.license)) probs.push(m.license?`"${m.license}" is not one of ${LICENSES.join(', ')}`:`loci.json has no "license" (one of ${LICENSES.join(', ')})`);
    if(!lf) probs.push('no LICENSE file in the package');
    R.add(G,'license','Open-source license',probs.length?'fail':'pass',probs.length?probs.join('; ')+'.':`${m.license}, with ${lf}.`);
  });
  // explanation
  await guard(R,G,'explanation','Explanation',async()=>{
    const T='Explanation', md=textOf(f.get('explanation.md'));
    if(md==null) return R.add(G,'explanation',T,'fail','No explanation.md in the package.');
    // TeX: the same tokenizer as the renderer (tex.js), so the gate fails exactly the spans the page would show raw
    const TeX=texLib(), sp=TeX?TeX.split(md):{parts:[{text:md}],warnings:[]}, spans=sp.parts.filter(p=>p.tex!=null);
    const prose=sp.parts.map(p=>p.text!=null?p.text:' ').join('');
    const words=prose.replace(/[#*_`>|[\]()-]+/g,' ').split(/\s+/).filter(w=>/\w/.test(w)).length, probs=[], warns=[];
    if(words<150||words>1200) probs.push(`explanation: ${words} words (150 to 1200, formulas not counted)`);
    if(!/^#{1,6}[ \t]+What you(?:'|’)re seeing[ \t]*$/mi.test(md)) probs.push(`explanation: missing "What you're seeing"`);
    if(!/^#{1,6}[ \t]+Try this[ \t]*$/mi.test(md)) probs.push('explanation: missing "Try this"');
    if(!/^\*\*Reference\.\*\*/m.test(md)) probs.push('explanation: missing Reference');
    const seen=new Set(); for(const w of sp.warnings){ const k=w.line+w.msg; if(!seen.has(k)){ seen.add(k); warns.push(`explanation line ${w.line}: ${w.msg}`); } }
    let parsed=0;
    if(spans.length){
      const bad=spans.map(p=>[p,TeX.problem(p.tex)]).filter(x=>x[1]);
      for(const [p,why] of bad) probs.push(`explanation line ${p.line}: ${why}`);
      let katex=null; try{ katex=await TeX.load(); }catch(e){ warns.push(`could not load KaTeX ${TeX.VER} to parse ${plural(spans.length,'formula')} (${e&&e.message||e}); the server gate parses them on upload`); }
      if(katex) for(const p of spans){
        if(TeX.problem(p.tex)) continue;
        try{ katex.renderToString(p.tex,{...TeX.OPTS, displayMode:p.display}); parsed++; }
        catch(e){ probs.push(`explanation line ${p.line}: ${String(e&&e.message||e).replace(/\s+/g,' ')}`); }
      }
      for(const p of spans) if(p.tex.length>TeX.LONG) warns.push(`explanation line ${p.line}: a ${p.tex.length}-character formula (over ${TeX.LONG}); say it in words, or split it`);
    }
    ctx.md=md;
    const tex=spans.length?`, ${plural(spans.length,'TeX formula')}${parsed===spans.length?' that KaTeX parses':''}`:'';
    if(probs.length) return R.add(G,'explanation',T,'fail',probs.concat(warns).join('; ')+'.');
    R.add(G,'explanation',T,warns.length?'warn':'pass',`${words} words${tex}, with "What you're seeing", "Try this" and a Reference line.${warns.length?' But '+warns.join('; ')+'.':''}`);
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
      if(s.view!==undefined){ const vp=viewProblem(s.view); if(vp) probs.push(`${nm}: view ${vp}`); }
      for(const k in s.params){
        if(!keys.has(k)){ probs.push(`${nm}: unknown param ${k}`); continue; }
        if(JSON.stringify(norm[k])!==JSON.stringify(s.params[k])) probs.push(`${nm}: ${k} = ${JSON.stringify(s.params[k])} is not a valid value (normalizes to ${JSON.stringify(norm[k])})`);
      }
    });
    R.add(G,'presets',T,probs.length?'fail':'pass',probs.length?probs.join('; ')+'.':`${plural(pr.length,'preset')}, every one valid as written.`);
  });
  // bounty: the Wanted request the piece answers (docs/bounties.md). The id's shape is the manifest's job; whether it
  // names a request needs the Wanted list, which the page passes in (opts.bounties). Without it, a warning.
  if(m.bounty!=null) await guard(R,G,'bounty','Answers a request (bounty)',()=>{
    const T='Answers a request (bounty)', id=m.bounty;
    if(!man) return R.add(G,'bounty',T,'skip','Skipped: the manifest did not validate.');
    if(!ctx.bounties) return R.add(G,'bounty',T,'warn',`bounty: ${id}. The Wanted list (bounties.js) is not loaded here, so whether it names a request is checked on upload.`);
    const c=ctx.bounties.find(b=>b&&b.id===id);
    if(!c) return R.add(G,'bounty',T,'fail',`bounty: "${id}" is not a request on the Wanted page (the ids are ${ctx.bounties.map(b=>b.id).join(', ')}).`);
    if(c.status==='answered'){
      if(c.answer===man.id || c.answer===ctx.sampleOf) return R.add(G,'bounty',T,'pass',`bounty: ${id}, the request this piece answered: “${c.title}”.`);
      return R.add(G,'bounty',T,'warn',`bounty: ${id}, “${c.title}”, is already answered${c.answer?` by ${c.answer}`:''}. Another answer is welcome, but it is not an open request.`);
    }
    R.add(G,'bounty',T,'pass',`bounty: ${id}, ${c.status==='month'?'this month’s challenge':'an open request'}: “${c.title}”.`);
  });
  // a remix whose code changed but whose words did not (docs/ideas/round2/210): a string compare with the parent's
  // presets and explanation, so the integer-k remix cannot pass silently with "k sweeps slowly upward" unchanged.
  if(ctx.parent) await guard(R,G,'remix-words','Remix still described',()=>{
    const T='Remix still described', pv=ctx.parent, ms=typeof moduleSource==='function'?moduleSource:null;
    const changed=(ctx.targets||[]).filter(tc=>tc.runtime==='js' && typeof tc.source==='string' && (!ms || tc.source!==ms(pv,tc.id==='any'?undefined:tc.id)));
    if(!changed.length) return R.add(G,'remix-words',T,'pass','No module differs from the parent’s, so its presets and explanation still describe it.');
    const pm=JSON.parse(JSON.stringify(pv.manifest,(k,x)=>typeof x==='function'?undefined:x));
    const samePresets=JSON.stringify(m.presets||[])===JSON.stringify(pm.presets||[]);
    const strip=x=>String(x||'').replace(/\n*\*\*Remix\.\*\*[^\n]*\n?$/,'').trim();
    const md=textOf(f.get('explanation.md')), sameMd=typeof pv.md==='string' && md!=null && strip(md)===pv.md.trim();
    const files=changed.map(tc=>tc.entry).join(' and '), same=[samePresets?'the presets':null, sameMd?'the explanation':null].filter(Boolean);
    if(!same.length) return R.add(G,'remix-words',T,'pass',`${files} changed, and so did the presets and the explanation.`);
    R.add(G,'remix-words',T,'warn',`${files} changed; ${same.join(' and ')} ${same.length>1?'are':'is'} identical to the parent’s (${pv.id}). ${same.length>1?'Presets and explanation':same[0][4].toUpperCase()+same[0].slice(5)} unchanged: do they still describe your remix?`);
  });
  // related: the "after" ids (docs/module-api.md section 2). The shape is the manifest's job; here, whether each id is a
  // piece we know. Only the bundled catalog is visible from the browser, so an unknown id is a warning, not a failure:
  // the server gate resolves it against the published index on upload.
  await guard(R,G,'related','Builds on (after)',()=>{
    const T='Builds on (after)', after=Array.isArray(m.after)?m.after:[];
    if(!man) return R.add(G,'related',T,m.after!=null?'skip':'pass',m.after!=null?'Skipped: the manifest did not validate.':'No "after": the piece names no pieces it builds on.');
    if(!after.length) return R.add(G,'related',T,'pass','No "after": the piece names no pieces it builds on.');
    const cat=typeof VIZ!=='undefined'?VIZ:[], known=new Set(cat.map(v=>v.id)), unknown=after.filter(a=>!known.has(a)), warns=[];
    if(unknown.length) warns.push(`${unknown.map(a=>`"${a}"`).join(', ')} ${unknown.length===1?'is':'are'} not in the catalog bundled with this page (the server gate checks the published index on upload)`);
    // a cycle through this piece means the order is wrong somewhere
    const edges=new Map(cat.filter(v=>v.id!==man.id).map(v=>[v.id,(v.manifest&&v.manifest.after)||[]])); edges.set(man.id,after);
    const seen=new Set(), stack=[...after]; let cyc=false;
    while(stack.length){ const x=stack.pop(); if(x===man.id){ cyc=true; break; } if(seen.has(x)) continue; seen.add(x); stack.push(...(edges.get(x)||[])); }
    if(cyc) warns.push(`following "after" from ${man.id} leads back to it: a cycle, so the order is wrong somewhere`);
    const names=after.map(a=>{ const v=cat.find(o=>o.id===a); return v?`${a} (“${v.title}”)`:a; }).join(', ');
    R.add(G,'related',T,warns.length?'warn':'pass',warns.length?warns.join('; ')+'.':`Comes after ${names}; every id is a catalog piece, with no cycle.`);
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
  // the package hash
  { const parts=[]; for(const p of [...f.keys()].sort()) parts.push(p+'\0'+await sha256(bytesOf(f.get(p)))); ctx.packageHash=await sha256(new TextEncoder().encode(parts.join('\n'))); }
}

/* An id the catalog already has is an update only if the package changes a module: an unchanged package under that id,
   or a module identical to any other piece's under any id, is a duplicate (fail). Near-duplicate text of another
   piece is a warning. A built-in sample (pkg.sampleOf) is compared as if its catalog piece were not there yet. */
async function duplicateCheck(R,P,ctx,tc,m){
  const G='static', T='Not a duplicate', {ef, entry, runtime}=tc;
  await guard(R,G,'duplicate',T,async()=>{
    if(!ef) return R.add(G,'duplicate',T,'skip',`No ${entry} to compare.`);
    const mine=bytesOf(ef); tc.moduleHash=await sha256(mine); if(!ctx.moduleHash) ctx.moduleHash=tc.moduleHash;
    const cat=ctx.catalog.filter(v=>v.id!==ctx.sampleOf), others=cat.filter(v=>v.id!==m.id), selfMods=cat.filter(v=>v.id===m.id), self=selfMods[0], nOther=new Set(others.map(v=>v.id)).size;
    const hashOf=async v=>{ if(v.hash===undefined){ const b=await v.bytes(); v.hash=b?await sha256(b):null; } return v.hash; };
    const tname=v=>v.target&&v.target!=='any'?`, ${v.target}`:'';
    if(self && ctx.unchanged===undefined){ // does any entry of the package differ from the published piece's modules?
      const pub=new Set(); for(const v of selfMods){ const h=await hashOf(v); if(h) pub.add(h); }
      let same=true; for(const t of ctx.targets){ if(!t.ef || !pub.has(await sha256(bytesOf(t.ef)))){ same=false; break; } }
      ctx.unchanged=same;
    }
    const sample=ctx.sampleOf?` This built-in sample is made from the catalog piece “${ctx.sampleOfTitle||ctx.sampleOf}”, so it is compared as a new piece.`:'';
    if(self && ctx.unchanged) return R.add(G,'duplicate',T,'fail',`Same id as the catalog piece “${self.title}”, and every module is identical (SHA-256) to the published one: an update must change a module. A remix or a copy needs its own id.`);
    const note=self?` Same id as the catalog piece “${self.title}” and the package changes a module, so this is treated as an update and compared with the other ${nOther} pieces.`:` Compared with ${plural(nOther,'catalog piece')}.${sample}`;
    if(self) for(const v of selfMods) if(await hashOf(v)===tc.moduleHash) return R.add(G,'duplicate',T,'pass',`Module sha256 ${tc.moduleHash.slice(0,12)}… is unchanged from the published “${self.title}”${tname(v)}; another entry of this update changed.${note}`);
    let near=null;
    const mineSh=runtime==='js'?shingles(tc.source):null;
    for(const v of others){
      const h=await hashOf(v); if(!h) continue;
      if(h===tc.moduleHash) return R.add(G,'duplicate',T,'fail',`The module is identical (SHA-256) to “${v.title}” (${v.id}${tname(v)}).`);
      if(mineSh && v.source){ const j=jaccard(mineSh,shingles(v.source)); if(j>=0.8 && (!near||j>near.j)) near={v,j}; }
    }
    if(near) return R.add(G,'duplicate',T,'warn',`Near-duplicate of “${near.v.title}” (${near.v.id}): ${(near.j*100).toFixed(0)}% of 5-token shingles shared. A reviewer will compare them.${note}`);
    R.add(G,'duplicate',T,'pass',`Module sha256 ${tc.moduleHash.slice(0,12)}… is new.${note}`);
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
    rec.h=LociHost.mount(cv,o.spec||ctx.spec,{theme, params:o.params||ctx.defaults, box:{x:M,y:M,w:W,h:H}, dpr, t:o.t||0, speed:1, playing:false, size:{w:W+2*M,h:H+2*M}, label:'checker', target:ctx.tc&&ctx.tc.id, view:o.view,
      onError:(k,msg)=>{ if(k==='slow'){ rec.slow=msg||'slow'; return; } if(!rec.err){ rec.err=msg||k; rec.kind=k; } rej(new Error(`${k}: ${msg}`)); },
      onStats:s=>{ rec.stats.push(s.ms); if(s.gpu!=null) rec.gpuN=(rec.gpuN||0)+1; }}); // s.ms is CPU + GPU when the GPU timer exists
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
  r.stats=m.stats.slice(); r.slow=m.slow; r.gpuN=m.gpuN||0;
  m.dispose(); return r;
}
function pct(xs,p){ if(!xs.length) return 0; const s=[...xs].sort((a,b)=>a-b); return s[Math.min(s.length-1,Math.floor(p*(s.length-1)+0.5))]; }

function judgeCells(R,cells,ctx,P95_MS){
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
  const gpuN=cells.reduce((a,r)=>a+r.gpuN,0), gl=ctx&&ctx.manifest&&ctx.manifest.render==='webgl2';
  const timed=gl?(gpuN?' Frame time is CPU + GPU (EXT_disjoint_timer_query_webgl2).':' CPU time only: this browser does not expose EXT_disjoint_timer_query_webgl2, so GPU time was not measured.'):'';
  const note=`${PLAY_MS/1000} s of play per run (the pipeline plays 20 s; shortened here to keep the suite near a minute).${timed}`;
  if(slow) R.add(G,'budget','Frame budget','fail',`The host paused it for running slowly (${slow.slow}) @ ${label(slow)}. ${note}`,{where:slow.where});
  else if(over) R.add(G,'budget','Frame budget','fail',`budget p95 ${fmtMs(over.p95)} ms, max ${fmtMs(over.max)} ms @ ${label(over)} (limits: p95 < ${P95_MS} ms, max < ${MAX_MS} ms). ${note}`,{where:over.where});
  else if(measured.length<cells.length/2) R.add(G,'budget','Frame budget','warn',`Only ${measured.length} of ${cells.length} runs produced enough frames to time (${cells.reduce((a,r)=>a+r.stats.length,0)} frames in all): the page was not rendering at full rate (a background tab or hidden window?), so the budget was not measured. Run the checks again with the page in view. ${note}`);
  else { const mx=measured.reduce((a,b)=>b.max>a.max?b:a); R.add(G,'budget','Frame budget','pass',`Worst p95 ${fmtMs(wp.p95)} ms @ ${label(wp)} (limit ${P95_MS} ms); max ${fmtMs(mx.max)} ms @ ${label(mx)}; ${measured.reduce((a,r)=>a+r.stats.length,0)} frames timed${measured.length<cells.length?` (${cells.length-measured.length} runs too short to time)`:''}. ${note}`); }
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
    const honored=ctx.tc&&Array.isArray(ctx.tc.t.params)?new Set(ctx.tc.t.params):null;
    for(const p of man.params){
      const T=`Param “${p.label||p.key}” matters`, id=`param:${p.key}`, d=def[p.key];
      if(honored && !honored.has(p.key)){ R.add(G,id,T,'skip',`This target does not honor ${p.key} (its "params" leaves it out), so the control is shown disabled and the param is not tested here.`); continue; }
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
      // a mobile target may clamp a param's range (submitting.md, "Desktop and mobile targets"): one end matching the default is a warning there
      const clamped=ctx.tc&&ctx.tc.id==='mobile'&&p.type==='range'&&probs.length===1&&/looks the same as the default/.test(probs[0]);
      if(clamped) R.add(G,id,T,'warn',`${probs[0]}. Fine if the mobile module clamps ${p.key} on purpose: show the clamp in the readout and say so in the explanation's "Try this"; a reviewer checks it.`,{where, ...(frame?{frame}:{})});
      else if(probs.length) R.add(G,id,T,'fail',probs.join('; ')+'.',{where, ...(frame?{frame}:{})});
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
  const gl=ctx.manifest.render==='webgl2', host='Labels a module returns from draw() are dropped by the host while theme.labels is false (host-enforced).';
  const src=probeSource(ctx.source);
  if(!src) return R.add(G,id,T,gl?'pass':'skip',gl?`${host} Could not also instrument the module for fillText (expected exactly one "export default").`:'Could not instrument the module (expected exactly one "export default").');
  const m=ctx.mount({...ctx.small,pal:'night',dpr:1,labels:false,t:1,spec:{...ctx.spec, source:src}});
  let at=1;
  try{
    await m.ready; await m.capture();
    for(const t of [2,5,11,29]){ at=t; await m.at(t); }
    R.add(G,id,T,'pass',`With labels:false the module made no fillText or strokeText calls at t = 1, 2, 5, 11 and 29.${gl?` ${host}`:''}`);
  }catch(e){
    const msg=/labels off: text detected/.test(e.message)?e.message.replace(/^error:\s*(draw:\s*)?/,''):`The instrumented run failed: ${e.message}`;
    R.add(G,id,T,'fail',`${msg} @ ${ctx.small.W}×${ctx.small.H} night t=${at}. Draw text with label(), which skips it when theme.labels is false.`,{where:whereOf(m,at)});
  }finally{ m.dispose(); }
}

/* two fresh instances must agree exactly; a backwards seek must match a fresh instance */
async function determinismChecks(R,ctx){
  const G='dynamic', cfg={...ctx.small,pal:'night',dpr:1};
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

/* Played vs seeked: a fresh instance played from t = 0 to about t = 3 at real time, and a second fresh instance seeked
   straight to the same t, must draw the same picture. "Deterministic" and "Time jumps" only compare seeks, and a seek
   draws with dt = 0, so a module that advances its state by dt passes both while recording a still. */
const PLAY_TO=3;
async function playedVsSeekedCheck(R,ctx){
  const G='dynamic', ID='played-vs-seeked', T='Played vs seeked', cfg={...ctx.small,pal:'night',dpr:1};
  if(ctx.manifest && ctx.manifest.motion==='static') return R.add(G,ID,T,'skip','Skipped: motion is "static", so playing does not advance t.');
  const A=ctx.mount({...cfg,t:0}); let B=null;
  try{
    await guard(R,G,ID,T,async()=>{
      await A.ready; A.h.play();
      const until=now()+PLAY_TO*1000+SETUP_MS;
      while(A.h.getTime()<PLAY_TO){ if(A.err) throw new Error(`${A.kind}: ${A.err}`); if(now()>until) throw new Error(`playing did not reach t = ${PLAY_TO} in ${(PLAY_TO*1000+SETUP_MS)/1000} s`); await sleep(16); }
      A.h.pause();
      const played=await A.capture(), t=A.h.getTime(); // the capture's render reports the worker's t, after the pause
      B=ctx.mount({...cfg,t}); await B.ready; const seeked=await B.capture();
      const fr=sampledDiff(played,seeked,A.cell);
      if(fr>JUMP_TOL) R.add(G,ID,T,'fail',`Played from t = 0 to t = ${t.toFixed(2)} at real time, the frame differs from a fresh instance seeked to the same t in ${(fr*100).toFixed(2)}% of sampled pixels (tolerance 0.5%). The module seems to advance its state by dt instead of drawing a function of t. Recorded clips and share links depend on seek-exactness: every seek and every recorded frame is drawn at an exact t with dt = 0, so a dt-driven piece records as a still and a link lands on a different picture. Compute the frame from t (integrate with a fixed step from the cycle start, keyed on t).`,{where:{...A.where,t:+t.toFixed(2)}, frame:played.blob});
      else R.add(G,ID,T,'pass',`Played to t = ${t.toFixed(2)} at real time and seeked to the same t: ${(fr*100).toFixed(2)}% of sampled pixels differ (tolerance 0.5%), so recorded clips and share links show what plays.`);
    });
  } finally { A.dispose(); if(B) B.dispose(); }
}

/* Pointer input: a scripted sequence through the handle (engage, drag 100 px, 3 wheel ticks, a click, an arrow key
   when keys are declared, release, as Esc would), then the same sequence replayed on a fresh instance; and the view
   round trip: the view reported after the sequence, given to a fresh instance, must draw the identical frame. */
function pointerScript(cell,P){
  const cx=M+cell.W/2, cy=M+cell.H/2, pt=(x,y)=>[{id:1,x,y}], steps=[];
  const ev=(type,x,y,o)=>({type, x, y, button:0, buttons:0, pointerType:'mouse', pointers:[], ...(o||{})});
  steps.push([{type:'engage'}]);
  if(P.drag||P.click){
    const drag=[ev('pointerdown',cx-50,cy,{buttons:1, pointers:pt(cx-50,cy)})];
    for(let i=1;i<=10;i++) drag.push(ev('pointermove',cx-50+10*i,cy,{dx:10, buttons:1, pointers:pt(cx-50+10*i,cy)}));
    drag.push(ev('pointerup',cx+50,cy)); steps.push(drag);
  }
  if(P.wheel) steps.push([1,2,3].map(()=>ev('wheel',cx+20,cy-10,{deltaY:-100})));
  if(P.click) steps.push([ev('pointerdown',cx+15,cy+15,{buttons:1, pointers:pt(cx+15,cy+15)}),ev('pointerup',cx+15,cy+15),ev('click',cx+15,cy+15)]);
  if(P.keys) steps.push([{type:'keydown', key:'ArrowRight', code:'ArrowRight'},{type:'keyup', key:'ArrowRight', code:'ArrowRight'}]);
  steps.push([{type:'release'}]);
  return steps;
}
async function pointerChecks(R,ctx){
  const G='dynamic', P=pointerFor(ctx.manifest,null), T1='Pointer events', T2='View round-trip';
  if(P.mode==='none'){ R.add(G,'pointer-events',T1,'skip','No pointer input declared.'); R.add(G,'view',T2,'skip','No pointer input declared.'); return; }
  if(ctx.runtime==='wasm'){ R.add(G,'pointer-events',T1,'skip','WebAssembly modules receive no events in API v1.'); R.add(G,'view',T2,'skip','WebAssembly modules have no view in API v1.'); return; }
  const cfg={...ctx.small,pal:'night',dpr:1,t:4}, t=4, mounted=[];
  const mount=o=>{ const m=ctx.mount({...cfg,...(o||{})}); mounted.push(m); return m; };
  const play=async(m,steps)=>{ for(const st of steps){ for(const e of st) m.h.input(e); await m.capture(); if(m.err) throw new Error(`${m.kind}: ${m.err}`); } return m.capture(); };
  try{
    const A=mount(); await A.ready; const before=await A.capture();
    const steps=pointerScript(A.cell,P), what=['drag 100 px','3 wheel ticks','a click','an arrow key'].filter((_,i)=>[P.drag||P.click,P.wheel,P.click,P.keys][i]).join(', ')+', release';
    let after;
    try{ after=await play(A,steps); }
    catch(e){ R.add(G,'pointer-events',T1,'fail',`The module threw while handling the scripted input (${what}): ${e.message}`,{where:whereOf(A,t)}); R.add(G,'view',T2,'skip','Skipped: the pointer sequence failed.'); return; }
    const view=A.h.getView(), changed=exactDiff(before,after)>0;
    if(!changed) R.add(G,'pointer-events',T1,'fail',`The frame after the scripted input (${what}) is identical to the untouched frame at t = ${t}: a piece that declares pointer mode "${P.mode}" must answer at least one of them.`,{where:whereOf(A,t), frame:after.blob});
    else {
      const B=mount(); await B.ready; await B.capture(); const again=await play(B,steps), n=exactDiff(after,again);
      if(n) R.add(G,'pointer-events',T1,'fail',`Replaying the same input on a fresh instance gives a different frame (${n} pixels): handle events as a function of the events and t only.`,{where:whereOf(A,t), frame:again.blob});
      else R.add(G,'pointer-events',T1,'pass',`Engage, ${what}: no errors, the frame changes, and a fresh instance given the same input draws the identical frame at t = ${t}.`);
    }
    // the view round trip
    if(view==null){ R.add(G,'view',T2,changed?'warn':'skip',changed?'The module reported no view after the input changed the picture, so a share link cannot keep what the viewer did. Implement getView() and setView(view), or return {view} from draw() with setView().':'No view reported.'); return; }
    const bytes=new TextEncoder().encode(JSON.stringify(view)).length;
    const C=mount({view}); await C.ready; const restored=await C.capture(), n=exactDiff(after,restored);
    if(n) R.add(G,'view',T2,'fail',`A fresh instance given the view ${JSON.stringify(view).slice(0,120)} draws a different frame (${n} pixels) from the one the view came from: setView(view) must restore everything the view describes.`,{where:whereOf(C,t), frame:restored.blob});
    else R.add(G,'view',T2,'pass',`getView() after the input (${bytes} bytes of JSON, limit 2048) → a fresh instance's setView() draws the identical frame.`);
  } finally { mounted.forEach(m=>m.dispose()); }
}

async function reducedMotionCheck(R,ctx){
  const G='dynamic', T='Reduced motion: still frame', id='reduced-motion';
  if(ctx.manifest.motion!=='static') return R.add(G,id,T,'skip',`motion is "${ctx.manifest.motion}": reduced-motion viewers start paused, so there is no t = 0 still to check.`);
  const m=ctx.mount({...ctx.small,pal:'night',dpr:1,t:0});
  try{ await m.ready; const img=await m.capture(), ink=inkFraction(img,m.cell,m.theme.bg);
    if(ink<BLANK) R.add(G,id,T,'fail',`motion is "static" but the t = 0 frame is blank (${(ink*100).toFixed(2)}% drawn).`,{where:whereOf(m,0), frame:img.blob});
    else R.add(G,id,T,'pass',`The t = 0 still is drawn (${(ink*100).toFixed(1)}% of the box).`);
  } finally { m.dispose(); }
}

/* Live links (docs/submitting.md section 6, "Live links"): [text](#param:k), (#preset:label), (#t:12.5), (#state:…)
   drive the piece and are validated against the manifest here (liveLink in manifest.js, the parser the Explanation tab
   uses): a bad one fails with its line. They are exempt from the URL lint. Also counts the "Why it works" steps. */
function liveLinks(md,man){
  const out={links:[], fails:[], warns:[], steps:0, stepStates:0};
  const re=/\]\(\s*<?(#[a-z]+:[^)\s>]*)>?(?:\s+"[^"]*")?\s*\)/gi;
  let fence=false, why=null;
  md.split('\n').forEach((raw,i)=>{
    const line=i+1;
    if(/^\s{0,3}(```|~~~)/.test(raw)){ fence=!fence; return; }
    if(fence || /^( {4}|\t)/.test(raw) && !why) return;
    const ln=raw.replace(/`[^`]*`/g,'');
    const h=/^\s{0,3}#{1,6}\s+(.*?)\s*#*\s*$/.exec(ln);
    if(h) why=/^why it works$/i.test(h[1])?{line, items:0}:null;
    const item=why && /^\s{0,3}(\d+[.)]|[-*+])\s/.test(ln);
    let state=false;
    for(const mm of ln.matchAll(re)){
      const L=liveLink(man,mm[1]); if(!L) continue;
      out.links.push(L);
      if(L.problem) (L.unknown?out.warns:out.fails).push(`explanation line ${line}: ${L.problem}`);
      else if(L.kind!=='param') state=true;
    }
    if(item){ why.items++; out.steps++; if(state) out.stepStates++; }
  });
  return out;
}
function linkCheck(R,md,man){
  const G='content', T='Links', id='links';
  if(md==null) return R.add(G,id,T,'skip','No explanation.md.');
  const urls=new Set(), LIVE=/^#[a-z]+:/i;
  for(const mm of md.matchAll(/\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/g)) if(!LIVE.test(mm[1])) urls.add(mm[1]);
  for(const mm of md.matchAll(/<([a-z][\w+.-]*:\/\/[^>\s]+)>|(?:^|[\s(])(https?:\/\/[^\s)<>\]]+)/gi)) urls.add((mm[1]||mm[2]).replace(/[.,;:!?]+$/,''));
  const live=man?liveLinks(md,man):null, nLive=live?live.links.length:0;
  const kinds=live?['param','preset','t','state'].map(k=>[k,live.links.filter(l=>l.kind===k&&!l.problem).length]).filter(x=>x[1]).map(([k,n])=>`${n} #${k}:`).join(', '):'';
  const liveNote=!live?' Live links (#param:, #preset:, #t:, #state:) were not checked: the manifest did not validate.'
    :nLive?` ${plural(nLive,'live link')}${kinds?` (${kinds})`:''}${live.fails.length?'':', every one valid against loci.json'}.${live.steps?` Why it works: ${plural(live.steps,'step')}, ${live.stepStates} setting up the picture.`:''}`:'';
  const probs=[];
  for(const u of urls){
    let x; try{ x=new URL(u); }catch(_){ probs.push(`${u}: not a well-formed absolute URL`); continue; }
    if(!/^https?:$/.test(x.protocol)) probs.push(`${u}: only http(s) links`);
    else if(SHORTENERS.some(h=>x.hostname===h||x.hostname.endsWith('.'+h))) probs.push(`${u}: link shorteners hide the destination`);
  }
  if(live) probs.push(...live.warns);
  if(live && live.fails.length) return R.add(G,id,T,'fail',live.fails.concat(probs).join('; ')+'.'+liveNote);
  if(!urls.size && !nLive) return R.add(G,id,T,'pass','No links in the explanation. (Resolving links runs server-side on upload.)'+(live?'':liveNote));
  R.add(G,id,T,probs.length?'warn':'pass',((probs.length?probs.join('; ')+'. (Resolving links runs server-side on upload.)':urls.size?`${plural(urls.size,'link')}, all well-formed http(s) and not shorteners. Resolving them runs server-side on upload.`:'')+liveNote).trim());
}

/* ---------- the run ---------- */
function catalogModules(){
  const list=typeof VIZ!=='undefined'?VIZ:[];
  return list.flatMap(v=>runnableTargets(v.manifest).map(t=>{
    const source=t.runtime==='js'&&typeof moduleSource==='function'?moduleSource(v,t.id):null;
    let cache=null;
    return {id:v.id, target:t.id, title:v.title, source, bytes:()=>cache||(cache=source!=null?Promise.resolve(new TextEncoder().encode(source)):v.entry?fetch(v.entry).then(r=>r.ok?r.arrayBuffer():null).then(b=>b&&new Uint8Array(b)).catch(()=>null):Promise.resolve(null))};
  }));
}
function vocabulary(){ const s=new Set(); (typeof VIZ!=='undefined'?VIZ:[]).forEach(v=>(v.tags||[]).forEach(t=>s.add(t))); return s; }

async function run(pkg,opts={}){
  const T0=now(), R=makeReport(), onProgress=typeof opts.onProgress==='function'?opts.onProgress:()=>{};
  let preview=opts.preview, ownPreview=false;
  if(!preview){ preview=document.createElement('div'); preview.style.cssText='position:fixed;left:-10000px;top:0;width:400px'; document.body.appendChild(preview); ownPreview=true; }
  const ctx={pal:palettes(), preview, live:new Set(), vocab:vocabulary(), catalog:catalogModules()};
  if(Array.isArray(opts.bounties)) ctx.bounties=opts.bounties;
  if(pkg && typeof pkg.remixOf==='string' && typeof VIZ!=='undefined'){ const pv=VIZ.find(v=>v.id===pkg.remixOf); if(pv) ctx.parent=pv; }
  if(pkg && typeof pkg.sampleOf==='string'){ ctx.sampleOf=pkg.sampleOf; const sv=typeof VIZ!=='undefined'&&VIZ.find(v=>v.id===pkg.sampleOf); ctx.sampleOfTitle=sv?sv.title:null; }
  const heap0=typeof performance!=='undefined'&&performance.memory?performance.memory.usedJSHeapSize:null;
  let step=0, n=2, posterBlob=null, posterFrom=null; const targets=[];
  const progress=label=>{ try{ onProgress(Math.min(step,n),n,label); }catch(_){} };
  let deadline=T0+(opts.maxMs||TOTAL_MS); const late=()=>now()>deadline;
  const DYN=[['setup','Setup resolves in 8 s, no errors'],['budget','Frame budget'],['box','Stays in the box'],['blank','Not blank'],['flashing','No flashing (WCAG 2.3.1)'],['theme-palette','Theme honored: palette'],['theme-labels','Theme honored: labels switch'],['labels-off','Labels off: no text drawn'],['deterministic','Deterministic'],['time-jumps','Time jumps (seek back)'],['played-vs-seeked','Played vs seeked'],['reduced-motion','Reduced motion: still frame'],['pointer-events','Pointer events'],['view','View round-trip']];
  try{
    progress('Static checks: manifest, targets, sizes, license, imports, explanation, metadata, duplicates');
    const P=normalizePkg(pkg);
    await staticChecks(R,P,ctx); step++;
    const man=ctx.manifest, gl=typeof LociHost!=='undefined'&&LociHost.hasWebGL2?LociHost.hasWebGL2():true;
    const tcs=ctx.targets||[];
    // which targets run here: a webgl2 target on a machine without WebGL2 is skipped, never failed
    const plan=tcs.map(tc=>({tc, mx:matrixFor(tc.id), why:!man?'Skipped: the manifest did not validate.':(tc.runtime==='js'?tc.source==null:!tc.bytes)?`Skipped: no ${tc.entry} to run.`:typeof LociHost==='undefined'?'Skipped: LociHost is not loaded.':(tc.t.requires||[]).includes('webgl2')&&!gl?`Skipped: this browser has no WebGL2, so the ${TNAME[tc.id].toLowerCase()} target (render "${tc.render}") cannot run here. It is not a failure: run the checks in a desktop browser with WebGL2 to test it; the pipeline runs it on a GPU machine.`:null}));
    const runs=plan.filter(x=>!x.why);
    n=2+runs.reduce((a,x)=>a+x.mx.cells.length+7,0);
    deadline=T0+(opts.maxMs||TOTAL_MS)*Math.max(1,runs.length);
    for(const x of plan){
      const tc=x.tc, RT=forTarget(R,tc), info={id:tc.id, runtime:tc.runtime, render:tc.render, entry:tc.entry, matrix:x.mx.text, ran:!x.why, note:x.why||null};
      targets.push(info);
      const paramIds=(man?man.params:[]).map(p=>[`param:${p.key}`,`Param “${p.label||p.key}” matters`]);
      const skipAll=(why,list)=>list.forEach(([id,title])=>RT.add('dynamic',id,title,'skip',why));
      if(x.why){ skipAll(x.why,[...DYN.slice(0,5),...paramIds,...DYN.slice(5)]); continue; }
      const tm=manifestForTarget(man,tc.t), small=tc.id==='desktop'?{W:700,H:300}:{W:335,H:490};
      const tctx={...ctx, tc, runtime:tc.runtime, source:tc.source, bytes:tc.bytes, entry:tc.entry, manifest:tm, small, defaults:normalizeParams(man,{})};
      tctx.spec=tc.runtime==='js'?{runtime:'js', render:tc.render, source:tc.source, manifest:tm, trusted:false}:{runtime:'wasm', render:tc.render, bytes:tc.bytes.buffer.slice(0), manifest:tm, trusted:false};
      tctx.mount=mounter(tctx);
      const cells=x.mx.cells, tl=tc.id==='any'?'':`${TNAME[tc.id]}: `;
      // the matrix, two runs at a time
      const results=new Array(cells.length); let next=0;
      const worker=async()=>{ while(next<cells.length){ const i=next++, c=cells[i];
        if(late()){ results[i]={cfg:c, where:{size:`${c.W}×${c.H}`,palette:PAL_NAME[c.pal],dpr:c.dpr}, frames:[], lum:[], stats:[], err:'skipped: the suite hit its time cap', errPhase:'setup'}; step++; continue; }
        progress(`${tl}playing ${c.W}×${c.H} · ${PAL_NAME[c.pal]} · dpr ${c.dpr} for ${PLAY_MS/1000} s${c.flash?' (sampling luminance for flashing)':''}`);
        results[i]=await runCell(tctx,c); step++; progress(`${tl}finished ${c.W}×${c.H} · ${PAL_NAME[c.pal]} · dpr ${c.dpr}`); } };
      await Promise.all(Array.from({length:POOL},worker));
      judgeCells(RT,results,tctx,x.mx.p95);
      const setupOK=!results.some(r=>r.err&&r.errPhase==='setup');
      const later=[
        ['Params at min, default and max; palette swap; labels on and off',()=>paramChecks(RT,tctx),[...paramIds,DYN[5],DYN[6]]],
        ['Labels off: watching for fillText',()=>labelsOffCheck(RT,tctx),[DYN[7]]],
        ['Determinism and seeking backwards',()=>determinismChecks(RT,tctx),[DYN[8],DYN[9]]],
        [`Played to t = ${PLAY_TO} at real time vs seeked`,()=>playedVsSeekedCheck(RT,tctx),[DYN[10]]],
        ['Reduced motion',()=>reducedMotionCheck(RT,tctx),[DYN[11]]],
        ['Pointer events and the view round trip',()=>pointerChecks(RT,tctx),[DYN[12],DYN[13]]],
        ['Poster at 700×300 night',async()=>{ if(posterBlob && posterFrom==='desktop') return; const t=(Number.isFinite(man.t0)?man.t0:0)+6;
          posterBlob=await withTimeout(LociHost.poster(tctx.spec,{w:700,h:300,dpr:1,box:{x:0,y:0,w:700,h:300},theme:{...ctx.pal.night,font:'sans-serif',lw:1.5,labels:true},params:tctx.defaults,t,target:tc.id}),SETUP_MS+CAP_MS,'poster timed out'); posterFrom=tc.id; },[]],
      ];
      for(const [label,fn,ids] of later){
        progress(tl+label);
        if(!setupOK) skipAll('Skipped: setup failed.',ids);
        else if(late()) skipAll('Skipped: the suite hit its time cap.',ids);
        else{ const before=R.checks.length; try{ await fn(); }catch(e){ console.warn('loci-checks:',label,e); const have=new Set(R.checks.slice(before).map(c=>c.id.split('@')[0])); ids.filter(([id])=>!have.has(id)).forEach(([id,title])=>RT.add('dynamic',id,title,'fail',`The check crashed: ${e&&e.message||e}`)); } }
        step++;
      }
    }
    const heap1=heap0!=null&&performance.memory?performance.memory.usedJSHeapSize:null;
    if(!runs.length) R.add('dynamic','memory','Memory','skip','Skipped: no target ran here.');
    else if(heap1==null) R.add('dynamic','memory','Memory','skip',`performance.memory is not available in this browser. WASM memory is capped at 64 MiB by the host either way.`);
    else { const g=(heap1-heap0)/1048576; R.add('dynamic','memory','Memory',g>=32?'warn':'pass',`Page JS heap grew ${g.toFixed(1)} MB over the run (warn at 32 MB). The module's own worker heap is not visible from the page; WASM memory is capped at 64 MiB by the host.`); }
    progress('Content checks');
    R.add('content','frames','Image safety','skip',CONTENT_NOTE);
    R.add('content','text','Text moderation','skip',CONTENT_NOTE);
    linkCheck(R,ctx.md,ctx.linkManifest);
    step=n; progress('Done');
  }catch(e){
    console.error('loci-checks: run crashed',e); R.add('static','runner','Checker','fail',`The checker itself crashed: ${e&&e.message||e}`);
  }finally{
    for(const r of [...ctx.live]) try{ r.dispose(); }catch(_){}
    if(ownPreview) preview.remove();
  }
  // report order: content last; within static and dynamic, shared checks first, then each target in manifest order
  const order={static:0,dynamic:1,content:2}, tord=c=>c.target==null?-1:Math.max(0,targets.findIndex(t=>t.id===c.target));
  R.checks.forEach((c,i)=>c._i=i);
  R.checks.sort((a,b)=>order[a.group]-order[b.group]||(a.group==='content'?0:tord(a)-tord(b))||a._i-b._i);
  R.checks.forEach(c=>delete c._i);
  const counted=R.checks.filter(c=>c.status!=='skip');
  return {ok:!R.checks.some(c=>c.status==='fail'), checks:R.checks, manifest:ctx.manifest||ctx.rawManifest||null, targets, posterBlob, posterTarget:posterFrom, durationMs:Math.round(now()-T0),
    packageHash:ctx.packageHash||null, moduleHash:ctx.moduleHash||null, moduleHashes:Object.fromEntries((ctx.targets||[]).filter(t=>t.moduleHash).map(t=>[t.id,t.moduleHash])), playSeconds:PLAY_MS/1000,
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
/* holders: one name, or a list (a remix keeps the original copyright line and adds the remixer's) */
function licenseText(id,holders,year){
  const hs=Array.isArray(holders)?holders:[holders], cr=sign=>hs.map(h=>`Copyright ${sign} ${year} ${h}`).join('\n');
  if(id==='MIT') return `MIT License\n\n${cr('(c)')}\n\nPermission is hereby granted, free of charge, to any person obtaining a copy\nof this software and associated documentation files (the "Software"), to deal\nin the Software without restriction, including without limitation the rights\nto use, copy, modify, merge, publish, distribute, sublicense, and/or sell\ncopies of the Software, and to permit persons to whom the Software is\nfurnished to do so, subject to the following conditions:\n\nThe above copyright notice and this permission notice shall be included in all\ncopies or substantial portions of the Software.\n\nTHE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR\nIMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,\nFITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE\nAUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER\nLIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,\nOUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE\nSOFTWARE.\n`;
  return `${cr('(C)')}\n\nThis program is free software, licensed under ${id}.\nThe full license text is at https://spdx.org/licenses/${id}.html\n(abbreviated in this sample package).\n`;
}
/* A package built from a catalog piece. o (optional) overrides it, for a remix (remixPackage) or a WebAssembly piece:
   o.sources {targetId: module source} replaces those entries ('any' for a piece without targets); o.id, o.title,
   o.author, o.remixOf, o.credit (a line appended to explanation.md) and o.holders (LICENSE copyright lines) rename and
   re-attribute it; o.loci (the editable fields of a remix's loci.json: title, hook, alt, tags, params, presets, after,
   bounty) replaces those fields; o.wasmBytes and o.md supply what a WASM piece keeps in files (loadSample fetches them). */
function samplePackage(v,failing,o={}){
  const man=JSON.parse(manifestJSON(v.manifest));
  const multi=Array.isArray(man.targets), wasm=!multi&&man.runtime==='wasm', entry=wasm?(man.entry||'module.wasm').replace(/^\.\//,''):'index.js';
  const id=o.id||man.id;
  const loci={api:1, id, title:o.title||man.title, hook:v.hook, alt:v.alt, author:o.author||v.author, license:v.license, tags:v.tags, ...(o.remixOf?{remixOf:o.remixOf}:{}),
    runtime:wasm?'wasm':'js', ...(multi?{targets:man.targets}:{entry, render:man.render}), ...(man.pointer?{pointer:man.pointer}:{}), params:man.params, presets:man.presets, ...(man.after?{after:man.after}:{}), ...(man.cycle?{cycle:man.cycle}:{}), motion:man.motion, t0:v.t0};
  if(o.loci) for(const k of Object.keys(o.loci)) if(!['api','id','author','license','remixOf','runtime','entry','render','targets','motion','t0'].includes(k)) loci[k]=o.loci[k]; // a remix's edited loci.json fields
  const srcOf=tid=>o.sources&&typeof o.sources[tid]==='string'?o.sources[tid]:moduleSource(v,tid==='any'?undefined:tid);
  let src=wasm?null:srcOf(multi?'desktop':'any'), md=typeof o.md==='string'?o.md:v.md;
  if(wasm && !o.wasmBytes) throw new Error(`sample: ${v.id} is a WebAssembly piece; pass its module bytes as {wasmBytes} (LociChecks.loadSample fetches them)`);
  if(!md) throw new Error(`sample: ${v.id} has no explanation text loaded (pass {md})`);
  if(failing){
    if(typeof v.source==='string') throw new Error('sample: the failing variant is built from a canvas2d catalog piece');
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
  const dir=o.id||v.id+(failing?'-broken':''), files=new Map();
  files.set(`${dir}/loci.json`,{text:JSON.stringify(loci,null,2)+'\n'});
  if(multi){ for(const t of runnableTargets(man)) files.set(`${dir}/${t.entry}`,{text:srcOf(t.id)}); }
  else if(wasm) files.set(`${dir}/${entry}`,{bytes:asU8(o.wasmBytes).slice()});
  else files.set(`${dir}/index.js`,{text:src});
  if(o.credit) md=md.trimEnd()+'\n\n'+o.credit+'\n';
  files.set(`${dir}/explanation.md`,{text:md.endsWith('\n')?md:md+'\n'});
  files.set(`${dir}/LICENSE`,{text:licenseText(v.license,o.holders||v.author,2026)});
  return o.remixOf?{name:dir, files, remixOf:o.remixOf}:{name:dir, files, sampleOf:v.id};
}

/* samplePackage for any catalog piece, fetching what a WebAssembly piece keeps in files (module.wasm, explanation.md). */
async function loadSample(v,failing){
  if(v.manifest.runtime!=='wasm' || v.manifest.targets) return samplePackage(v,failing);
  const get=(u,bin)=>fetch(u).then(r=>{ if(!r.ok) throw new Error(`could not fetch ${u} (${r.status})`); return bin?r.arrayBuffer():r.text(); });
  const [wasmBytes,md]=await Promise.all([get(v.entry,true), v.md?v.md:v.mdUrl?get(v.mdUrl):'']);
  return samplePackage(v,failing,{wasmBytes, md});
}
/* A remix as a package of its own: a new id derived from the parent and the remixed code, remixOf naming the parent,
   the remixer as author with the parent credited in explanation.md and LICENSE (whose license it keeps).
   sources: {targetId: source} for the remixed entries ('any' without targets); the others ship the parent's.
   o.loci: the edited loci.json fields (an unchanged title still gets " (remix)"); o.md: the edited explanation.md. */
async function remixPackage(v,sources,o={}){
  if(v.manifest.runtime==='wasm' && !v.manifest.targets) throw new Error('A WebAssembly piece cannot be remixed in the browser.');
  const tids=Object.keys(sources||{}).sort(); if(!tids.length) throw new Error('remixPackage: no remixed source');
  const author=o.author||'@you', h=await sha256(new TextEncoder().encode(tids.map(t=>t+'\0'+sources[t]).join('\n')));
  const id=`${v.id}-remix-${h.slice(0,6)}`, own=o.loci&&typeof o.loci.title==='string'&&o.loci.title!==v.title?o.loci.title:null;
  const title=own||(v.title.length+8<=60?`${v.title} (remix)`:v.title), loci=o.loci?{...o.loci, title}:null;
  return samplePackage(v,false,{sources, id, title, author, remixOf:v.id, ...(loci?{loci}:{}), ...(typeof o.md==='string'?{md:o.md}:{}),
    credit:`**Remix.** A remix by ${author} of “${v.title}” (${v.id}) by ${v.author}, under its ${v.license} license.`,
    holders:[`${v.author} (original, ${v.id})`, `${author} (remix)`]});
}

const api={run, unzip, withText, samplePackage, loadSample, remixPackage, probeSource, stripComments, shaderLoops, jaccard, shingles, flashes, normalizePkg, LICENSES};
if(typeof module!=='undefined' && module.exports) module.exports=api;
root.LociChecks=api;
})(typeof globalThis!=='undefined'?globalThis:this);
