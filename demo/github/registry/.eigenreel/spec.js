/* ---------- EigenReelSpec: the static reader and gate for submissions (docs/submission-spec-slop.md) ----------
   One file, shared by the site (the chalkboard's live checks, the feed's share links and params panel) and the
   registry's checker (copied there verbatim), so the two can never disagree about what a submission says.
   "Static": it reads entries/<slug>.js and entries/<slug>.md as data and never runs piece code.
     read(source)                -> {ok, errors:[{line, col, message}], meta, colors, functions:{setup, draw, onMode},
                                     imports, forbidden:[{line, name}], ranges, unreadable}
                                    parses with acorn; COLORS first, one literal `export default {…}`, pinned imports only.
                                    col is 1-based. ranges holds source offsets ([start, end]) of the COLORS object, the
                                    export object and each metadata field's value, so the chalkboard can rewrite one
                                    literal; ranges.items[field] has each element of an array field. unreadable lists
                                    the fields whose value was not a literal (they are left out of meta).
     validateMeta(meta, colors, opts)  -> [{field, message}]   sections 1 to 5, judged from the metadata alone
                                    opts: {vocabulary: [tag…] (default DEFAULT_TAGS), site: {bg, fg}}
     validateValue(def, v), normalizeParams(meta, partial), nonDefault(meta, params), isDefault(meta, params),
     paramControls(meta), presetById(meta, id)                 params and presets (section 4)
     liveLink(meta, href)        -> {kind:'preset', preset} | {kind:'t', t} | {kind:'error', message} | null
     encodeShare({slug, params, t}, meta) -> '#v=<slug>&p=<base64url JSON>&t=<s>'; decodeShare(hashOrUrl, metaBySlug)
     toManifest(meta, colors, slug)  -> the eigenreel.json-shaped object the current site code expects
     explanationProblems(md, meta)   -> {errors, warnings, words}   section 7; wordCount(md)
     check({slug, source, md, wasm, hasBuild, others, vocabulary, site}) -> Promise<{ok, errors, warnings, meta,
                                    colors, sha256, read}>   the whole static gate of section 10. Errors and warnings
                                    are {file, line, message}; line is null for a problem with the whole file.
     contrast(fg, bg), LICENSES, DEFAULT_TAGS, LIMITS, SLUG_RE, PINNED, FORBIDDEN, SHORTENERS
   A plain script (global EigenReelSpec) on the page and a CommonJS module under node. The parser is acorn
   (root.acorn on the page, vendor/acorn.js; require('acorn') under node), TeX goes through EigenReelTeX (tex.js) and
   KaTeX when it can be loaded; all three are looked up only when needed, so loading this file never fails. */
(function(root){
'use strict';

const LICENSES=['MIT','BSD-2-Clause','BSD-3-Clause','Apache-2.0','GPL-3.0','MPL-2.0','ISC','CC0-1.0'];
/* The tag vocabulary until the registry's tags.json replaces it: the union of the tags in catalog.js. */
const DEFAULT_TAGS=['Algebraic geometry','Calculus','Chaos','Complex dynamics','Dynamics','Elliptic curves','Fourier series',
  'Fractals','GPU','Geometry','Gradient descent','Harmonic analysis','Integration','Mechanics','Modular arithmetic',
  'Multivariable calculus','Number theory','Numerical analysis','Optimization','Probability','Research','Statistics',
  'Teaching','Topology','WebAssembly'];
const LIMITS={js:200*1024, md:64*1024, wasm:2*1024*1024};
const SLUG_RE=/^[a-z0-9][a-z0-9-]{0,39}$/;
const PINNED=['@eigenreel/kit','@eigenreel/three'];
const FORBIDDEN=['fetch','XMLHttpRequest','WebSocket','importScripts','indexedDB','localStorage','FontFace','Image','eval','Function'];
const SHORTENERS=['bit.ly','t.co','tinyurl.com','goo.gl'];
const META_FIELDS=['title','hook','alt','tags','license','author','modes','time','context','libraries','params','presets','interact'];
const FUNCS=['setup','draw','onMode'];
const TYPES=['range','toggle','select'];
const PARAM_FIELDS={range:['key','type','label','min','max','step','default','format'], toggle:['key','type','label','default'],
  select:['key','type','label','options','default']};
const KEY_RE=/^[A-Za-z][A-Za-z0-9_]{0,31}$/, PRESET_RE=/^[a-z0-9][a-z0-9-]{0,31}$/, HEX_RE=/^#[0-9a-fA-F]{6}$/;
const SITE={bg:'#050508', fg:'#ecebf5'};
const SHARE_MAX=2048;

const isNum=x=>typeof x==='number' && Number.isFinite(x);
const isStr=x=>typeof x==='string' && x.trim().length>0;
const isObj=x=>!!x && typeof x==='object' && !Array.isArray(x);
const len=s=>[...String(s)].length;
const has=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const decimals=x=>{ const s=String(x); if(/e-/.test(s)) return +s.split('e-')[1]; const i=s.indexOf('.'); return i<0?0:s.length-i-1; };
const q=JSON.stringify;

/* ---------- lazy dependencies ---------- */
const req=typeof require==='function'?require:null;
function tryRequire(...names){ if(!req) return null; for(const n of names){ try{ return req(n); }catch(_){} } return null; }
let acornMod, texMod, katexMod;
const getAcorn=()=>acornMod||(acornMod=root.acorn||tryRequire('acorn','./vendor/acorn.js'));
const getTeX=()=>texMod||(texMod=root.EigenReelTeX||tryRequire('./tex.js'));
const getKatex=()=>root.katex||katexMod||(katexMod=tryRequire('katex'));

/* ---------- read: the source as data ---------- */
const at=n=>n&&n.loc?{line:n.loc.start.line, col:n.loc.start.column+1}:{line:null};
const what=n=>({Identifier:`a reference to the variable "${n.name}"`, TemplateLiteral:'a template literal with ${…}',
  SpreadElement:'a spread (...)', CallExpression:'a function call', ArrowFunctionExpression:'a function',
  FunctionExpression:'a function', BinaryExpression:'an expression', MemberExpression:'an expression'}[n.type]||`a ${n.type}`);

/* A JSON-like literal: strings (template literals without ${…}), numbers (with an optional unary minus), booleans,
   arrays and objects with plain keys. Returns the value, or undefined after pushing an error at the offending node. */
function literal(node, err, path){
  const bad=(n,m)=>{ err(n,`${path}: ${m}; metadata must be a plain literal`); return undefined; };
  switch(node.type){
    case 'Literal':
      if(typeof node.value==='string' || typeof node.value==='boolean') return node.value;
      if(typeof node.value==='number') return isNum(node.value)?node.value:bad(node,'not a finite number');
      return bad(node, node.regex?'a regular expression':node.bigint?'a BigInt':node.value===null?'null':'not allowed');
    case 'TemplateLiteral':
      if(node.expressions.length) return bad(node.expressions[0],'a template literal with ${…}');
      return node.quasis[0].value.cooked;
    case 'UnaryExpression':
      if(node.operator==='-' && node.argument.type==='Literal' && typeof node.argument.value==='number') return -node.argument.value;
      return bad(node,`the operator ${node.operator}`);
    case 'ArrayExpression': {
      const out=[]; let ok=true;
      node.elements.forEach((e,i)=>{
        if(!e){ bad(node,'an array with a hole'); ok=false; return; }
        if(e.type==='SpreadElement'){ bad(e,'a spread (...)'); ok=false; return; }
        const v=literal(e,err,`${path}[${i}]`); if(v===undefined) ok=false; out.push(v);
      });
      return ok?out:undefined;
    }
    case 'ObjectExpression': {
      const out={}; let ok=true;
      for(const p of node.properties){
        if(p.type==='SpreadElement'){ bad(p,'a spread (...)'); ok=false; continue; }
        const k=propKey(p);
        if(k==null){ bad(p,'a computed or numeric key'); ok=false; continue; }
        if(p.kind!=='init'){ bad(p,`a ${p.kind}ter "${k}"`); ok=false; continue; }
        if(p.method){ bad(p,`a method "${k}"`); ok=false; continue; }
        if(p.shorthand){ bad(p,`a reference to the variable "${k}"`); ok=false; continue; }
        if(k==='__proto__'){ bad(p,'the key __proto__'); ok=false; continue; }
        if(has(out,k)){ bad(p,`the key "${k}" twice`); ok=false; continue; }
        const v=literal(p.value,err,`${path}.${k}`); if(v===undefined){ ok=false; continue; }
        out[k]=v;
      }
      return ok?out:undefined;
    }
    default: return bad(node,what(node));
  }
}
function propKey(p){
  if(p.computed) return null;
  if(p.key.type==='Identifier') return p.key.name;
  if(p.key.type==='Literal' && typeof p.key.value==='string') return p.key.value;
  return null;
}

/* every identifier that refers to something (not a non-computed member or key), visited once */
function walk(node, visit, parent, key){
  if(!node || typeof node.type!=='string') return;
  visit(node,parent,key);
  for(const k in node){
    if(k==='type'||k==='loc'||k==='start'||k==='end'||k==='range') continue;
    const v=node[k];
    if(Array.isArray(v)) v.forEach(c=>c&&typeof c==='object'&&walk(c,visit,node,k));
    else if(v && typeof v==='object' && typeof v.type==='string') walk(v,visit,node,k);
  }
}
function isReference(parent,key){
  if(!parent) return true;
  switch(parent.type){
    case 'MemberExpression': return key!=='property' || parent.computed;
    case 'Property': case 'PropertyDefinition': case 'MethodDefinition': return key!=='key' || parent.computed;
    case 'LabeledStatement': case 'BreakStatement': case 'ContinueStatement': case 'MetaProperty':
    case 'ImportSpecifier': case 'ImportDefaultSpecifier': case 'ImportNamespaceSpecifier': case 'ExportSpecifier': return false;
  }
  return true;
}

function read(source){
  source=String(source==null?'':source);
  const errors=[], imports=[], forbidden=[], functions={setup:null, draw:null, onMode:null};
  const ranges={colors:null, exportObject:null, fields:{}, items:{}}, unreadable=[];
  const out=(meta,colors)=>({ok:!errors.length, errors, meta, colors, functions, imports, forbidden, ranges, unreadable});
  const err=(n,message)=>errors.push({...at(n), message});
  const acorn=getAcorn();
  if(!acorn){ errors.push({line:null, message:'the JavaScript parser (acorn) is not loaded'}); return out(null,null); }
  let ast;
  try{ ast=acorn.parse(source,{ecmaVersion:'latest', sourceType:'module', locations:true, ranges:true}); }
  catch(e){ errors.push({line:e.loc?e.loc.line:null, col:e.loc?e.loc.column+1:undefined, message:String(e.message||e)}); return out(null,null); }

  /* COLORS: the first statement, const COLORS = { … } */
  const isColors=s=>s.type==='VariableDeclaration' && s.declarations.some(d=>d.id.type==='Identifier' && d.id.name==='COLORS');
  const first=ast.body[0], cs=ast.body.find(isColors);
  let colors=null;
  if(!cs) err(first||ast,'the file must start with const COLORS = { main: \'#rrggbb\', secondary: \'#rrggbb\', … }');
  else {
    if(cs!==first) err(cs,'COLORS must be the first statement of the file');
    const d=cs.declarations.find(d=>d.id.name==='COLORS');
    if(cs.kind!=='const' || cs.declarations.length!==1) err(cs,'COLORS must be declared on its own, with const');
    if(!d.init || d.init.type!=='ObjectExpression') err(d.init||d,'COLORS must be an object literal');
    else {
      ranges.colors=[d.init.start,d.init.end];
      const c=literal(d.init,err,'COLORS');
      if(c){
        colors={};
        for(const p of d.init.properties){
          const k=propKey(p), v=c[k];
          if(typeof v!=='string' || !HEX_RE.test(v)) err(p.value,`COLORS.${k} must be a six-digit hex color like '#ff8a1f' (got ${q(v)})`);
          else colors[k]=v.toLowerCase();
        }
        for(const k of ['main','secondary']) if(!has(c,k)) err(d.init,`COLORS.${k} is required`);
      }
    }
  }

  /* exports and imports */
  let exp=null;
  for(const s of ast.body){
    if(s.type==='ExportDefaultDeclaration'){
      if(exp) err(s,'only one export default is allowed');
      else exp=s;
    } else if(s.type==='ExportNamedDeclaration' || s.type==='ExportAllDeclaration'){
      if(s.source) err(s,`only the pinned libraries may be imported (${PINNED.join(', ')}), and not re-exported`);
      else err(s,'the only export is export default { … }');
    } else if(s.type==='ImportDeclaration'){
      const spec=s.source.value; imports.push(spec);
      if(!PINNED.includes(spec)) err(s.source,`only the pinned libraries may be imported (${PINNED.join(', ')}); bundle "${spec}" into the file and declare it in libraries`);
    }
  }
  const seen=new Set();
  walk(ast,(n,parent,key)=>{
    if(n.type==='ImportExpression'){
      err(n,'dynamic import is not available: only the pinned libraries may be imported, with import … from');
      const id=`${n.loc.start.line}:import()`; if(!seen.has(id)){ seen.add(id); forbidden.push({line:n.loc.start.line, name:'import()'}); }
    } else if(n.type==='Identifier' && FORBIDDEN.includes(n.name) && isReference(parent,key)){
      const id=`${n.loc.start.line}:${n.name}`; if(!seen.has(id)){ seen.add(id); forbidden.push({line:n.loc.start.line, name:n.name}); }
    }
  });

  if(!exp){ err(ast.body[ast.body.length-1]||ast,'the file needs export default { title, …, draw }'); return out(null,colors); }
  const obj=exp.declaration;
  if(obj.type!=='ObjectExpression'){ err(obj,'export default must be an object literal { title, …, draw }'); return out(null,colors); }
  ranges.exportObject=[obj.start,obj.end];
  const raw={}, names=new Set();
  for(const p of obj.properties){
    if(p.type==='SpreadElement'){ err(p,'a spread (...) in export default; metadata must be a plain literal'); continue; }
    const k=propKey(p);
    if(k==null){ err(p,'a computed key in export default; metadata must be a plain literal'); continue; }
    if(names.has(k)){ err(p,`"${k}" appears twice`); continue; }
    names.add(k);
    if(p.kind!=='init'){ err(p,`"${k}" is a ${p.kind}ter; metadata must be a plain literal`); unreadable.push(k); continue; }
    if(FUNCS.includes(k)){
      const f=p.value;
      if(f.type!=='FunctionExpression' && f.type!=='ArrowFunctionExpression'){ err(f,`${k} must be a function`); continue; }
      functions[k]={line:f.loc.start.line, start:p.start, end:p.end, async:!!f.async};
      continue;
    }
    if(!META_FIELDS.includes(k)){ err(p.key,`unknown field "${k}"`); continue; }
    if(p.method || p.shorthand){ err(p,`${k}: ${p.method?'a method':`a reference to the variable "${k}"`}; metadata must be a plain literal`); unreadable.push(k); continue; }
    ranges.fields[k]=[p.value.start,p.value.end];
    if(p.value.type==='ArrayExpression') ranges.items[k]=p.value.elements.map(e=>e?[e.start,e.end]:null);
    const v=literal(p.value,err,k);
    if(v===undefined){ unreadable.push(k); continue; }
    raw[k]=v;
    if(k==='author' && isObj(v) && has(v,'github')){
      const g=p.value.properties.find(x=>propKey(x)==='github');
      err(g,'author.github: the GitHub account is never declared in the file; it is the account that opens the pull request');
    }
  }
  if(!functions.draw) err(obj,'draw(ctx, t, params, env, S) is required');
  const meta={...raw};
  if(!has(meta,'context')) meta.context='2d';
  for(const k of ['libraries','params','presets']) if(!has(meta,k)) meta[k]=[];
  if(!has(meta,'interact')) meta.interact=null;
  return out(meta,colors);
}

/* ---------- colors ---------- */
function luminance(hex){
  const n=parseInt(hex.slice(1),16), c=[n>>16&255,n>>8&255,n&255].map(v=>{ v/=255; return v<=0.03928?v/12.92:((v+0.055)/1.055)**2.4; });
  return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2];
}
function contrast(fg,bg){
  const a=luminance(fg), b=luminance(bg);
  return (Math.max(a,b)+0.05)/(Math.min(a,b)+0.05);
}

/* ---------- params ---------- */
function onGrid(p,v){ const s=p.min+Math.round((v-p.min)/p.step)*p.step; return Math.abs(v-s)<=p.step*1e-9; }
function validateValue(def,v){
  if(!def) return undefined;
  switch(def.type){
    case 'range': {
      if(!isNum(v)) return def.default;
      const d=Math.min(15,Math.max(decimals(def.step),decimals(def.min)));
      const s=+(def.min+Math.round((v-def.min)/def.step)*def.step).toFixed(d);
      return Math.min(def.max,Math.max(def.min,s));
    }
    case 'toggle': return typeof v==='boolean'?v:def.default;
    case 'select': return Array.isArray(def.options) && def.options.some(o=>Array.isArray(o) && o[0]===v)?v:def.default;
  }
  return def.default;
}
const paramsOf=meta=>meta && Array.isArray(meta.params)?meta.params.filter(p=>isObj(p) && typeof p.key==='string'):[];
function normalizeParams(meta,partial){
  const src=isObj(partial)?partial:{}, out={};
  for(const p of paramsOf(meta)) out[p.key]=has(src,p.key)?validateValue(p,src[p.key]):p.default;
  return out;
}
function nonDefault(meta,params){
  const n=normalizeParams(meta,params), out={};
  for(const p of paramsOf(meta)) if(n[p.key]!==p.default) out[p.key]=n[p.key];
  return out;
}
const isDefault=(meta,params)=>!Object.keys(nonDefault(meta,params)).length;
function formatter(p){
  const tpl=typeof p.format==='string' && p.format.includes('{}')?p.format:null;
  const d=p.type==='range'?Math.min(15,Math.max(decimals(p.step),decimals(p.min))):0;
  const base=p.type==='range'?v=>(+v).toFixed(d)
    :p.type==='toggle'?v=>v?'on':'off'
    :v=>{ const o=(p.options||[]).find(o=>o[0]===v); return o?String(o[1]):String(v); };
  return tpl?v=>tpl.split('{}').join(base(v)):base;
}
function paramControls(meta){
  return paramsOf(meta).map(p=>({key:p.key, type:p.type, label:p.label, min:p.min, max:p.max, step:p.step, default:p.default,
    options:p.options, format:formatter(p)}));
}
const presetById=(meta,id)=>(meta && Array.isArray(meta.presets)?meta.presets:[]).find(s=>isObj(s) && s.id===id)||null;
const lengthOf=meta=>meta && isObj(meta.time) && isNum(meta.time.length) && meta.time.length>0?meta.time.length:null;

/* ---------- validateMeta ---------- */
function validateMeta(meta,colors,opts){
  opts=opts||{};
  const out=[], E=(field,message)=>out.push({field, message});
  if(!isObj(meta)){ E('','the metadata must be an object'); return out; }
  const vocab=Array.isArray(opts.vocabulary)?opts.vocabulary:DEFAULT_TAGS;
  const site={...SITE, ...(opts.site||{})};
  const str=(f,max,{min=1}={})=>{
    const v=meta[f];
    if(v===undefined) return E(f,`${f} is required`), null;
    if(typeof v!=='string' || !v.trim()) return E(f,`${f} must be a non-empty string`), null;
    const n=len(v);
    if(n>max) E(f,`${f} is ${n} characters (at most ${max})`);
    if(n<min) E(f,`${f} is ${n} characters (at least ${min})`);
    return v;
  };
  const title=str('title',60), hook=str('hook',160), alt=str('alt',300,{min:40});
  if(alt){
    const sentences=(alt.trim().match(/[.!?]+["'’”)]*\s+(?=[\p{Lu}])/gu)||[]).length+1;
    if(sentences>2) E('alt',`alt is ${sentences} sentences (1 or 2)`);
    const norm=s=>String(s).trim().toLowerCase();
    if(title && norm(alt)===norm(title)) E('alt','alt must describe the picture, not repeat the title');
    if(hook && norm(alt)===norm(hook)) E('alt','alt must describe the picture, not repeat the hook');
  }
  // tags
  if(!Array.isArray(meta.tags)) E('tags','tags must be an array of 1 to 4 tags');
  else {
    if(meta.tags.length<1 || meta.tags.length>4) E('tags',`tags has ${meta.tags.length} entries (1 to 4)`);
    meta.tags.forEach((t,i)=>{
      if(typeof t!=='string') E(`tags[${i}]`,'a tag must be a string');
      else if(!vocab.includes(t)) E(`tags[${i}]`,`"${t}" is not in the tag vocabulary`);
      if(meta.tags.indexOf(t)!==i) E(`tags[${i}]`,`"${t}" appears twice`);
    });
  }
  // license
  if(!LICENSES.includes(meta.license)) E('license',`license must be one of ${LICENSES.join(', ')} (got ${q(meta.license)})`);
  // author
  if(!isObj(meta.author)) E('author','author must be { name: \'Your name\' }');
  else {
    const a=meta.author;
    if(typeof a.name!=='string' || !a.name.trim()) E('author.name','author.name must be a non-empty string');
    else if(len(a.name)>60) E('author.name',`author.name is ${len(a.name)} characters (at most 60)`);
    for(const k of Object.keys(a)) if(k!=='name') E(`author.${k}`,k==='github'
      ?'author.github: the GitHub account is never declared in the file; it is the account that opens the pull request'
      :`unknown field author.${k} (author has only name)`);
  }
  // modes
  if(!isObj(meta.modes)) E('modes','modes must be { desktop: true, phone: true } with at least one true');
  else {
    for(const k of Object.keys(meta.modes)){
      if(k!=='desktop' && k!=='phone') E(`modes.${k}`,`unknown field modes.${k} (desktop or phone)`);
      else if(typeof meta.modes[k]!=='boolean') E(`modes.${k}`,`modes.${k} must be true or false`);
    }
    if(meta.modes.desktop!==true && meta.modes.phone!==true) E('modes','at least one of modes.desktop and modes.phone must be true');
  }
  // time
  const T=meta.time;
  if(T===undefined) E('time','time is required: { length: <seconds>, loop: true|false }');
  else if(!isObj(T)) E('time','time must be { length: <seconds>, loop: true|false }');
  else {
    if(!isNum(T.length) || !(T.length>0) || T.length>3600) E('time.length',`time.length must be a number of seconds, more than 0 and at most 3600 (got ${q(T.length)})`);
    if(typeof T.loop!=='boolean') E('time.loop','time.loop must be true or false');
    for(const k of Object.keys(T)) if(k!=='length' && k!=='loop') E(`time.${k}`,`unknown field time.${k}`);
  }
  const length=isObj(T) && isNum(T.length) && T.length>0?T.length:null;
  // context
  const ctx=meta.context===undefined?'2d':meta.context;
  if(ctx!=='2d' && ctx!=='webgl2') E('context',`context must be '2d' or 'webgl2' (got ${q(ctx)})`);
  if(ctx==='webgl2' && isObj(meta.modes) && meta.modes.phone===true) E('modes.phone','a webgl2 piece is desktop only: modes.phone must not be true');
  // libraries
  const libs=meta.libraries===undefined?[]:meta.libraries;
  if(!Array.isArray(libs)) E('libraries','libraries must be an array of { name, version, license }');
  else libs.forEach((l,i)=>{
    const w=`libraries[${i}]`;
    if(!isObj(l)){ E(w,'must be { name, version, license }'); return; }
    for(const k of ['name','version','license']) if(!isStr(l[k])) E(`${w}.${k}`,`${w}.${k} must be a non-empty string`);
    for(const k of Object.keys(l)) if(!['name','version','license'].includes(k)) E(`${w}.${k}`,`unknown field ${w}.${k}`);
    if(isStr(l.license)){
      if(!LICENSES.includes(l.license)) E(`${w}.license`,`${l.name||w} is under ${l.license}, which is not on the list (${LICENSES.join(', ')})`);
      else if(l.license==='GPL-3.0' && meta.license!=='GPL-3.0') E(`${w}.license`,`${l.name||w} is under GPL-3.0, so the piece must be GPL-3.0 too`);
    }
  });
  // interact
  if(meta.interact!=null){
    const I=meta.interact;
    if(!isObj(I)) E('interact','interact must be { hint: \'…\' }, or left out for a feed-only piece');
    else {
      if(typeof I.hint!=='string' || !I.hint.trim()) E('interact.hint','interact.hint must be a non-empty string');
      else if(len(I.hint)>60) E('interact.hint',`interact.hint is ${len(I.hint)} characters (at most 60)`);
      for(const k of Object.keys(I)) if(k!=='hint') E(`interact.${k}`,`unknown field interact.${k}`);
    }
  }
  // params
  const params=meta.params===undefined?[]:meta.params, defs={};
  if(!Array.isArray(params)) E('params','params must be an array');
  else params.forEach((p,i)=>{
    const w=`params[${i}]`, PE=(f,m)=>E(f?`${w}.${f}`:w,m);
    if(!isObj(p)){ PE('','must be an object { key, type, label, … }'); return; }
    const key=p.key, name=typeof key==='string'?`${w} (${key})`:w;
    if(typeof key!=='string' || !KEY_RE.test(key)) PE('key',`${w}.key must match ${KEY_RE} (got ${q(key)})`);
    else if(key in Object.prototype || key==='__proto__') PE('key',`${w}.key "${key}" is a name on Object.prototype`);
    else if(has(defs,key)) PE('key',`duplicate param key "${key}"`);
    else defs[key]=p;
    if(!TYPES.includes(p.type)){ PE('type',`${name}: type must be one of ${TYPES.join(', ')} (got ${q(p.type)})`); return; }
    for(const k of Object.keys(p)) if(!PARAM_FIELDS[p.type].includes(k)) PE(k,`${name}: unknown field "${k}" for a ${p.type}`);
    if(typeof p.label!=='string' || !p.label.trim()) PE('label',`${name}: label is required`);
    else if(len(p.label)>40) PE('label',`${name}: label is ${len(p.label)} characters (at most 40)`);
    if(p.type==='range'){
      const nums=['min','max','step','default'].filter(k=>!isNum(p[k]));
      if(nums.length){ PE(nums[0],`${name}: ${nums.join(', ')} must be finite numbers`); delete defs[key]; return; }
      if(!(p.min<p.max)) PE('max',`${name}: min must be less than max`);
      if(!(p.step>0)){ PE('step',`${name}: step must be more than 0`); delete defs[key]; return; }
      if(p.default<p.min || p.default>p.max) PE('default',`${name}: default ${p.default} is outside [${p.min}, ${p.max}]`);
      else if(!onGrid(p,p.default)) PE('default',`${name}: default ${p.default} is not on the grid min + k·step (${p.min} + k·${p.step})`);
      if(p.min<p.max && !onGrid(p,p.max)) PE('max',`${name}: max ${p.max} is not on the grid min + k·step (${p.min} + k·${p.step})`);
      if(p.format!==undefined){
        if(typeof p.format!=='string' || !p.format.includes('{}')) PE('format',`${name}: format must be a string with {} for the value, like '{}°'`);
        else if(len(p.format)>16) PE('format',`${name}: format is ${len(p.format)} characters (at most 16)`);
      }
    } else if(p.type==='toggle'){
      if(typeof p.default!=='boolean') PE('default',`${name}: a toggle's default must be true or false`);
    } else {
      if(!Array.isArray(p.options) || !p.options.length){ PE('options',`${name}: options must be a non-empty array of [value, label]`); delete defs[key]; return; }
      const vals=[];
      p.options.forEach((o,j)=>{
        const ow=`options[${j}]`;
        if(!Array.isArray(o) || o.length!==2){ PE(ow,`${name}: ${ow} must be [value, label]`); return; }
        if(typeof o[0]!=='string' || !o[0].length || len(o[0])>32) PE(ow,`${name}: ${ow} value must be a string of 1 to 32 characters`);
        else if(vals.includes(o[0])) PE(ow,`${name}: option value "${o[0]}" appears twice`);
        vals.push(o[0]);
        if(typeof o[1]!=='string' || !o[1].trim()) PE(ow,`${name}: ${ow} label must be a non-empty string`);
        else if(len(o[1])>40) PE(ow,`${name}: ${ow} label is ${len(o[1])} characters (at most 40)`);
      });
      if(!vals.includes(p.default)) PE('default',`${name}: default must be one of the option values (${vals.map(v=>q(v)).join(', ')})`);
    }
  });
  // presets
  const presets=meta.presets===undefined?[]:meta.presets, ids=new Set();
  if(!Array.isArray(presets)) E('presets','presets must be an array');
  else presets.forEach((s,i)=>{
    const w=`presets[${i}]`;
    if(!isObj(s)){ E(w,'must be { id, label, params, t? }'); return; }
    const name=typeof s.id==='string'?`${w} (${s.id})`:w;
    if(typeof s.id!=='string' || !PRESET_RE.test(s.id)) E(`${w}.id`,`${w}.id must match ${PRESET_RE} (got ${q(s.id)})`);
    else if(ids.has(s.id)) E(`${w}.id`,`duplicate preset id "${s.id}"`);
    else ids.add(s.id);
    if(typeof s.label!=='string' || !s.label.trim()) E(`${w}.label`,`${name}: label is required`);
    else if(len(s.label)>40) E(`${w}.label`,`${name}: label is ${len(s.label)} characters (at most 40)`);
    for(const k of Object.keys(s)) if(!['id','label','params','t'].includes(k)) E(`${w}.${k}`,`${name}: unknown field "${k}"`);
    if(!isObj(s.params)) E(`${w}.params`,`${name}: params must be an object of param values`);
    else for(const k of Object.keys(s.params)){
      if(!has(defs,k)){ E(`${w}.params.${k}`,`${name}: "${k}" is not a declared param`); continue; }
      const v=s.params[k], n=validateValue(defs[k],v);
      if(!Object.is(n,v)) E(`${w}.params.${k}`,`${name}: ${k} = ${q(v)} is not a valid value (validation turns it into ${q(n)})`);
    }
    if(s.t!==undefined){
      if(!isNum(s.t) || s.t<0) E(`${w}.t`,`${name}: t must be a number of seconds >= 0`);
      else if(length!=null && s.t>length) E(`${w}.t`,`${name}: t = ${s.t} is beyond time.length (${length})`);
    }
  });
  // colors: fg on bg
  const C=isObj(colors)?colors:{};
  const bg=typeof C.bg==='string' && HEX_RE.test(C.bg)?C.bg:site.bg, fg=typeof C.fg==='string' && HEX_RE.test(C.fg)?C.fg:site.fg;
  const r=contrast(fg,bg);
  if(r<4.5) E('colors',`fg ${fg} on bg ${bg} has a contrast ratio of ${r.toFixed(2)}:1 (at least 4.5:1)`);
  return out;
}

/* ---------- links in the explanation ---------- */
function liveLink(meta,href){
  const m=/^#([A-Za-z][A-Za-z0-9_-]*):(.*)$/.exec(String(href==null?'':href).trim());
  if(!m) return null;
  const kind=m[1].toLowerCase(); let a=m[2]; try{ a=decodeURIComponent(a); }catch(_){}
  const error=message=>({kind:'error', message});
  if(kind==='preset'){
    const p=presetById(meta,a);
    if(p) return {kind:'preset', preset:p};
    const ids=(meta && Array.isArray(meta.presets)?meta.presets:[]).map(s=>s&&s.id).filter(Boolean);
    return error(`link to unknown preset "${a}"${ids.length?` (the presets are ${ids.join(', ')})`:' (the piece has no presets)'}`);
  }
  if(kind==='t'){
    if(!/^\d+(\.\d+)?$/.test(a)) return error(`#t:${a} is not a time in seconds (like #t:12.5)`);
    const t=+a, L=lengthOf(meta);
    if(L!=null && t>L) return error(`#t:${a} is beyond time.length (${L})`);
    return {kind:'t', t};
  }
  return error(`unknown link target #${m[1]}: (the reserved targets are #preset: and #t:)`);
}

/* ---------- share links ---------- */
function b64uEncode(s){
  const b=new TextEncoder().encode(s); let bin=''; for(const x of b) bin+=String.fromCharCode(x);
  return btoa(bin).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
function b64uDecode(s){
  if(!/^[A-Za-z0-9_-]*$/.test(s)) throw new Error('not base64url');
  return new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0)));
}
const clampT=(t,meta)=>{ const L=lengthOf(meta); t=Math.max(0,t); return L!=null?Math.min(L,t):t; };
function encodeShare(state,meta){
  const {slug, params, t}=state||{};
  const nd=nonDefault(meta,params);
  let p=Object.keys(nd).length?b64uEncode(JSON.stringify(nd)):null;
  const tt=isNum(t)?String(Math.round(clampT(t,meta)*1000)/1000):null;
  const build=()=>'#v='+encodeURIComponent(String(slug))+(p?'&p='+p:'')+(tt!=null?'&t='+tt:'');
  let s=build();
  if(s.length>SHARE_MAX){ p=null; s=build(); }
  return s;
}
function decodeShare(hashOrUrl,metaBySlug){
  const s=String(hashOrUrl==null?'':hashOrUrl), i=s.indexOf('#'), h=i>=0?s.slice(i+1):s;
  const kv={};
  for(const part of h.split('&')){
    const j=part.indexOf('='); if(j<0) continue;
    let v=part.slice(j+1); try{ v=decodeURIComponent(v); }catch(_){}
    kv[part.slice(0,j)]=v;
  }
  const slug=kv.v;
  if(typeof slug!=='string' || !SLUG_RE.test(slug)) return null;
  const meta=!metaBySlug?null:metaBySlug instanceof Map?metaBySlug.get(slug)
    :typeof metaBySlug==='function'?metaBySlug(slug):has(metaBySlug,slug)?metaBySlug[slug]:null;
  if(!meta) return null;
  let partial={};
  if(kv.p){ try{ const o=JSON.parse(b64uDecode(kv.p)); if(isObj(o)) partial=o; }catch(_){} }
  const tn=kv.t!=null && kv.t!==''?Number(kv.t):NaN;
  return {slug, params:normalizeParams(meta,partial), t:Number.isFinite(tn)?clampT(tn,meta):undefined};
}

/* ---------- the shape the current site code reads from eigenreel.json ---------- */
function toManifest(meta,colors,slug){
  const m=meta||{};
  return {api:1, id:slug, title:m.title, hook:m.hook, alt:m.alt, author:m.author&&m.author.name, license:m.license, tags:m.tags,
    params:Array.isArray(m.params)?m.params:[], presets:(Array.isArray(m.presets)?m.presets:[]).map(s=>{ const {note, ...r}=s; return r; }),
    colors:colors||{}, pointer:m.interact?{mode:'custom', hint:m.interact.hint}:null, modes:m.modes, time:m.time,
    context:m.context||'2d', libraries:m.libraries||[], interact:m.interact||null, t0:0};
}

/* ---------- the explanation (section 7) ---------- */
/* The Markdown with fenced code blanked (and, with math, formulas blanked), keeping every offset and line. */
const blank=s=>s.replace(/[^\n]/g,' ');
function prose(md,{math=true}={}){
  md=String(md==null?'':md).replace(/\r\n?/g,'\n');
  let s=md;
  const TeX=getTeX();
  if(math && TeX){ s=TeX.split(md).parts.map(p=>p.text!=null?p.text:blank(p.raw)).join(''); if(s.length!==md.length) s=md; }
  const lines=s.split('\n'); let fence=null;
  for(let i=0;i<lines.length;i++){
    const L=lines[i];
    if(fence){ lines[i]=blank(L); if(new RegExp('^ {0,3}'+fence[0]+'{'+fence.length+',}\\s*$').test(L)) fence=null; continue; }
    const f=/^ {0,3}(`{3,}|~{3,})/.exec(L);
    if(f && !(f[1][0]==='`' && L.slice(f[0].length).includes('`'))){ fence=f[1]; lines[i]=blank(L); }
  }
  return lines;
}
const wordsIn=s=>(s.match(/[\p{L}\p{N}][\p{L}\p{N}'’_-]*/gu)||[]).length;
function countWords(lines){
  return wordsIn(lines.map(L=>L
    .replace(/^ {0,3}\[[^\]]+\]:\s*\S+.*$/,'')                 // reference definitions
    .replace(/\]\(\s*<?[^)\s>]*>?(?:\s+"[^"]*")?\s*\)/g,']')   // inline link URLs
    .replace(/<[a-zA-Z][a-zA-Z0-9+.-]{1,31}:[^\s<>]*>/g,' ')    // autolinks
  ).join('\n'));
}
const wordCount=md=>countWords(prose(md));

/* the URL of an inline link starting right after "](", allowing balanced parentheses (Wikipedia's Foo_(bar)) */
function linkUrl(L,k){
  while(L[k]===' ' || L[k]==='\t') k++;
  if(L[k]==='<'){ const e=L.indexOf('>',k); return e<0?L.slice(k+1):L.slice(k+1,e); }
  let d=0, j=k;
  for(;j<L.length;j++){
    const c=L[j];
    if(c==='\\'){ j++; continue; }
    if(/\s/.test(c)) break;
    if(c==='(') d++;
    else if(c===')'){ if(!d) break; d--; }
  }
  return L.slice(k,j);
}
function explanationProblems(md,meta){
  const errors=[], warnings=[];
  if(typeof md!=='string'){ errors.push({line:null, message:'the explanation is missing'}); return {errors, warnings, words:0}; }
  const E=(line,message)=>errors.push({line, message}), W=(line,message)=>warnings.push({line, message});
  const lines=prose(md), words=countWords(lines);
  if(words<150) E(null,`the explanation is ${words} words (150 to 1200, not counting formulas)`);
  else if(words>1200) E(null,`the explanation is ${words} words (150 to 1200, not counting formulas)`);

  // sections
  const norm=s=>s.toLowerCase().replace(/[’‘`]/g,"'").replace(/[*_]/g,'').replace(/[\s:.]+$/,'').replace(/\s+/g,' ').trim();
  const heads=new Set(); let reference=false;
  lines.forEach(L=>{
    const h=/^ {0,3}#{1,6}\s+(.*?)(?:\s+#+)?\s*$/.exec(L);
    if(h) heads.add(norm(h[1]));
    if(/^\s*(?:#{1,6}\s*)?(?:\*\*|__)?\s*references?\b/i.test(L)) reference=true;
  });
  for(const want of ["What you're seeing",'Try this']) if(!heads.has(norm(want))) E(null,`the explanation needs a heading "${want}"`);
  if(!reference) E(null,'the explanation needs a Reference line (a line starting with "Reference")');

  // links, HTML and images: on the text outside code and formulas, with inline code spans blanked
  const checkUrl=(url,line)=>{
    url=url.trim();
    if(url.startsWith('#')){
      const lv=liveLink(meta,url);
      if(lv && lv.kind==='error') E(line,lv.message);
      else if(!lv) E(line,`link to ${url}: links must be http(s), #preset:<id> or #t:<seconds>`);
      return;
    }
    let u; try{ u=new URL(url); }catch(_){ E(line,`link to ${q(url)}: links must be full http(s) URLs`); return; }
    if(u.protocol!=='http:' && u.protocol!=='https:'){ E(line,`link to ${u.protocol} URL: links must be http(s)`); return; }
    const host=u.hostname.toLowerCase().replace(/^www\./,'');
    if(SHORTENERS.includes(host)) E(line,`link to ${url}: link shorteners hide the destination`);
  };
  lines.forEach((L0,i)=>{
    const line=i+1;
    let L=L0.replace(/(`+)([\s\S]*?[^`])\1(?!`)/g,m=>blank(m));
    const def=/^ {0,3}\[([^\]]+)\]:\s*(\S+)/.exec(L);
    if(def){ checkUrl(def[2].replace(/^<|>$/g,''),line); return; }
    L=L.replace(/<([a-zA-Z][a-zA-Z0-9+.-]{1,31}:[^\s<>]*)>/g,(m,u)=>{ checkUrl(u,line); return blank(m); });
    L=L.replace(/<[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+>/g,m=>{ E(line,`link to ${m}: links must be http(s)`); return blank(m); });
    if(/<\/?[a-zA-Z][^>]*>/.test(L)) E(line,'raw HTML is not allowed in the explanation');
    if(/!\[[^\]]*\]\s*[(\[]/.test(L)) E(line,'images are not allowed in the explanation (an image would tell an outside server who is reading)');
    let k=-1;
    while((k=L.indexOf('](',k+1))>=0) checkUrl(linkUrl(L,k+2),line);
  });

  // TeX
  const TeX=getTeX();
  if(!TeX) W(null,'tex.js is not loaded: formulas were not checked');
  else {
    const {parts, warnings:tw}=TeX.split(md);
    tw.forEach(w=>W(w.line,w.msg));
    const katex=getKatex();
    const spans=parts.filter(p=>p.tex!=null);
    spans.forEach(p=>{
      const pr=TeX.problem(p.tex);
      if(pr){ E(p.line,`${pr}: ${p.raw.slice(0,60)}`); return; }
      if(katex && katex.renderToString){
        try{ katex.renderToString(p.tex,{...TeX.OPTS, displayMode:p.display}); }
        catch(e){ E(p.line,`KaTeX cannot render ${p.raw.slice(0,60)}: ${String(e&&e.message||e).replace(/^KaTeX parse error: /,'')}`); }
      }
    });
    if(spans.length && !(katex && katex.renderToString)) W(null,'KaTeX is not available here: formulas were checked for forbidden commands only, not rendered');
  }
  return {errors, warnings, words};
}

/* ---------- check: the static gate (section 10) ---------- */
const utf8=s=>new TextEncoder().encode(String(s));
async function sha256(bytes){
  const subtle=root.crypto && root.crypto.subtle;
  if(subtle){ const d=new Uint8Array(await subtle.digest('SHA-256',bytes)); return [...d].map(b=>b.toString(16).padStart(2,'0')).join(''); }
  const c=tryRequire('node:crypto','crypto');
  if(!c) throw new Error('no SHA-256 available');
  return c.createHash('sha256').update(bytes).digest('hex');
}
const lineAt=(src,off)=>{ let n=1; for(let i=0;i<off && i<src.length;i++) if(src.charCodeAt(i)===10) n++; return n; };
const kb=n=>`${Math.round(n/1024*10)/10} KB`;

async function check(o){
  o=o||{};
  const slug=String(o.slug==null?'':o.slug), source=typeof o.source==='string'?o.source:'';
  const JS=`entries/${slug}.js`, MD=`entries/${slug}.md`, WASM=`entries/${slug}.wasm`;
  const errors=[], warnings=[];
  const E=(file,line,message)=>errors.push({file, line:line==null?null:line, message});
  const W=(file,line,message)=>warnings.push({file, line:line==null?null:line, message});

  if(!SLUG_RE.test(slug)) E(JS,null,`the slug ${q(slug)} must match ${SLUG_RE} (lowercase letters, digits and dashes, at most 40)`);
  if(typeof o.source!=='string') E(JS,null,`the piece ${JS} is missing`);
  const jsBytes=utf8(source);
  if(jsBytes.length>LIMITS.js) E(JS,null,`${JS} is ${kb(jsBytes.length)} (at most ${kb(LIMITS.js)}, bundled libraries included)`);

  // the source
  const r=read(source);
  r.errors.forEach(e=>E(JS,e.line,e.message));
  const meta=r.meta, colors=r.colors;
  if(meta){
    const skip=new Set(r.unreadable), fieldLine=f=>{
      const top=f.split(/[.[]/)[0], m=/^[A-Za-z]+\[(\d+)\]/.exec(f), it=m&&r.ranges.items[top]&&r.ranges.items[top][+m[1]];
      const rg=top==='colors'?r.ranges.colors:it||r.ranges.fields[top]||r.ranges.exportObject;
      return rg?lineAt(source,rg[0]):null;
    };
    for(const e of validateMeta(meta,colors,{vocabulary:o.vocabulary, site:o.site})){
      const top=e.field.split(/[.[]/)[0];
      if(skip.has(top)) continue;
      // read() already reported author.github with its own line
      if(e.field==='author.github' && r.errors.some(x=>/^author\.github/.test(x.message))) continue;
      E(JS,fieldLine(e.field),e.message);
    }
  }
  r.forbidden.forEach(f=>W(JS,f.line,f.name==='import()'?'the sandbox blocks import(); this call will do nothing'
    :`the sandbox blocks ${f.name}; this call will do nothing`));

  // the explanation
  if(o.md==null) E(MD,null,`the explanation ${MD} is missing`);
  else {
    const md=String(o.md), n=utf8(md).length;
    if(n>LIMITS.md) E(MD,null,`${MD} is ${kb(n)} (at most ${kb(LIMITS.md)})`);
    const x=explanationProblems(md,meta||{});
    x.errors.forEach(e=>E(MD,e.line,e.message));
    x.warnings.forEach(w=>W(MD,w.line,w.message));
  }

  // WebAssembly
  if(o.wasm!=null){
    const b=o.wasm instanceof Uint8Array?o.wasm:o.wasm instanceof ArrayBuffer?new Uint8Array(o.wasm):ArrayBuffer.isView(o.wasm)?new Uint8Array(o.wasm.buffer,o.wasm.byteOffset,o.wasm.byteLength):null;
    if(!b) E(WASM,null,`${WASM} could not be read as bytes`);
    else {
      if(b.length>LIMITS.wasm) E(WASM,null,`${WASM} is ${kb(b.length)} (at most ${kb(LIMITS.wasm)})`);
      if(typeof WebAssembly==='undefined') W(WASM,null,'WebAssembly is not available here: the module was not validated');
      else { let ok=false; try{ ok=WebAssembly.validate(b); }catch(_){} if(!ok) E(WASM,null,`${WASM} is not a valid WebAssembly module`); }
    }
    if(o.hasBuild!==true) E(`sources/${slug}/BUILD`,null,`sources/${slug}/BUILD is missing (the command that builds ${WASM} from sources/${slug}/)`);
  } else if(/\benv\s*\.\s*wasm\b/.test(source)) E(JS,null,`the piece calls env.wasm() but there is no ${WASM}`);

  // duplicates
  let hash=null;
  try{ hash=await sha256(jsBytes); }catch(e){ W(JS,null,`could not hash the source: ${e.message}`); }
  if(hash && Array.isArray(o.others)){
    const dup=o.others.find(x=>x && x.sha256===hash && x.slug!==slug);
    if(dup) E(JS,null,`${JS} is identical to entries/${dup.slug}.js`);
  }

  return {ok:!errors.length, errors, warnings, meta, colors, sha256:hash, read:r};
}

const api={read, validateMeta, validateValue, normalizeParams, nonDefault, isDefault, paramControls, presetById, liveLink,
  encodeShare, decodeShare, toManifest, explanationProblems, wordCount, check, contrast,
  LICENSES, DEFAULT_TAGS, LIMITS, SLUG_RE, PINNED, FORBIDDEN, SHORTENERS};
if(typeof module!=='undefined' && module.exports) module.exports=api;
root.EigenReelSpec=api;
})(typeof self!=='undefined'?self:globalThis);
