/* ---------- loci.json: validation, parameter normalization, Customize descriptors ----------
   Implements section 2 of docs/module-api.md. Plain script (a global LociManifest on the page)
   and a CommonJS module under node, so it can be unit tested without a browser. */
(function(root){
  const TYPES=['range','toggle','select','color','seed'];
  const RENDER={js:['canvas2d','webgl2'], wasm:['pixels','commands']};
  const isNum=x=>typeof x==='number' && Number.isFinite(x);
  const isStr=x=>typeof x==='string' && x.length>0;
  const isHex=x=>typeof x==='string' && /^#[0-9a-f]{6}$/i.test(x);
  const decimals=x=>{ const s=String(x); if(/e-/.test(s)) return +s.split('e-')[1]; const i=s.indexOf('.'); return i<0?0:s.length-i-1; };

  function fail(where,msg){ throw new Error(`loci.json${where?' '+where:''}: ${msg}`); }

  function validateManifest(m,opts){
    if(!m || typeof m!=='object' || Array.isArray(m)) fail('','must be an object');
    if(m.api!==1) fail('api',`must be 1 (got ${JSON.stringify(m.api)})`);
    if(!isStr(m.id) || !/^[a-z0-9][a-z0-9-]*$/.test(m.id)) fail('id','must be lowercase letters, digits and dashes');
    if(!isStr(m.title)) fail('title','must be a non-empty string');
    const multi=m.targets!=null; // with targets, the top-level runtime/render/entry are optional defaults each target inherits
    if(!multi || m.runtime!=null){
      if(!RENDER[m.runtime]) fail('runtime',`must be "js" or "wasm" (got ${JSON.stringify(m.runtime)})`);
      if((!multi || m.render!=null) && !RENDER[m.runtime].includes(m.render)) fail('render',`for runtime "${m.runtime}" must be ${RENDER[m.runtime].map(r=>`"${r}"`).join(' or ')} (got ${JSON.stringify(m.render)})`);
    } else if(m.render!=null) fail('render','needs a top-level runtime');
    if(m.entry!=null && !isStr(m.entry)) fail('entry','must be a path string');
    if(!Array.isArray(m.params)) fail('params','must be an array');
    const keys=new Set();
    m.params.forEach((p,i)=>{
      const w=`params[${i}]`;
      if(!p || typeof p!=='object') fail(w,'must be an object');
      if(!isStr(p.key) || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(p.key)) fail(w+'.key','must be an identifier');
      if(keys.has(p.key)) fail(w+'.key',`duplicate key "${p.key}"`); keys.add(p.key);
      if(!TYPES.includes(p.type)) fail(w+'.type',`must be one of ${TYPES.join(', ')} (got ${JSON.stringify(p.type)})`);
      if(p.type!=='seed' && !isStr(p.label)) fail(w+'.label','must be a non-empty string');
      if(p.type==='range'){
        if(!isNum(p.min)||!isNum(p.max)||!(p.min<p.max)) fail(w,'range needs numbers min < max');
        if(!isNum(p.step)||!(p.step>0)) fail(w+'.step','must be a positive number');
        if(!isNum(p.default)||p.default<p.min||p.default>p.max) fail(w+'.default',`must be a number in [${p.min}, ${p.max}]`);
        if(p.format!=null && typeof p.format!=='string') fail(w+'.format','must be a pattern string like "0.00"');
        if(p.fmt!=null && typeof p.fmt!=='function') fail(w+'.fmt','must be a function');
      } else if(p.type==='toggle'){
        if(typeof p.default!=='boolean') fail(w+'.default','toggle default must be true or false');
      } else if(p.type==='select'){
        if(!Array.isArray(p.options)||!p.options.length) fail(w+'.options','must be a non-empty array of [value, label]');
        p.options.forEach((o,j)=>{ if(!Array.isArray(o)||o.length!==2||!isStr(o[0])||!isStr(o[1])) fail(`${w}.options[${j}]`,'must be [value, label] strings'); });
        if(!p.options.some(o=>o[0]===p.default)) fail(w+'.default',`must be one of ${p.options.map(o=>o[0]).join(', ')}`);
      } else if(p.type==='color'){
        if(!isHex(p.default)) fail(w+'.default','color default must be #rrggbb');
      } else if(p.type==='seed'){
        if(p.default!=null && !Number.isInteger(p.default)) fail(w+'.default','seed default must be an integer');
      }
    });
    if(m.presets!=null){
      if(!Array.isArray(m.presets)) fail('presets','must be an array');
      m.presets.forEach((s,i)=>{
        const w=`presets[${i}]`;
        if(!s||!isStr(s.label)) fail(w+'.label','must be a non-empty string');
        if(!s.params||typeof s.params!=='object') fail(w+'.params','must be an object');
        for(const k in s.params) if(!keys.has(k)) fail(w+'.params',`unknown key "${k}"`);
        if(s.note!=null && typeof s.note!=='string') fail(w+'.note','must be a string');
        if(s.t!=null && !(isNum(s.t)&&s.t>=0)) fail(w+'.t','must be a non-negative number of seconds');
      });
    }
    if(m.cycle!=null && !(isNum(m.cycle)&&m.cycle>0)) fail('cycle','must be a positive number of seconds');
    if(!['pause','static'].includes(m.motion)) fail('motion','must be "pause" or "static"');
    if(!opts || opts.targets!==false){ const pr=targetProblems(m); if(pr.length) fail(pr[0].where,pr[0].msg); }
    return m;
  }

  /* ---------- targets (docs/module-api.md, section 2, "Targets") ----------
     A piece may ship one module per target, sharing one id, explanation, params, presets, likes and saves.
     A manifest without "targets" is one target with id "any", built from its top-level runtime/render/entry. */
  const TARGET_IDS=['desktop','mobile','download'], REQUIRES=['webgl2'], FORMATS=['zip','html','app'];
  const TARGET_NAME={desktop:'Desktop', mobile:'Mobile', download:'Download', any:'Any device'};
  /* entry size limits per target, in bytes: a phone gets the old limits, desktop JS may be larger (three.js scenes, data) */
  const TARGET_LIMITS={any:{js:200*1024, wasm:2*1024*1024}, mobile:{js:200*1024, wasm:2*1024*1024}, desktop:{js:2*1024*1024, wasm:2*1024*1024}};
  /* The targets with the top-level defaults filled in. A js/webgl2 target always requires webgl2. */
  function targetsOf(m){
    if(!m) return [];
    if(!Array.isArray(m.targets)) return [{id:'any', runtime:m.runtime, render:m.render, entry:m.entry, requires:m.runtime==='js'&&m.render==='webgl2'?['webgl2']:[]}];
    return m.targets.filter(t=>t&&typeof t==='object').map(t=>{
      if(t.id==='download') return {...t};
      const o={...t, runtime:t.runtime??m.runtime, render:t.render??(t.runtime==null||t.runtime===m.runtime?m.render:undefined), entry:t.entry??m.entry};
      const req=Array.isArray(t.requires)?[...t.requires]:[];
      if(o.runtime==='js' && o.render==='webgl2' && !req.includes('webgl2')) req.push('webgl2');
      o.requires=req; return o;
    });
  }
  const runnableTargets=m=>targetsOf(m).filter(t=>t.id!=='download');
  const targetById=(m,id)=>targetsOf(m).find(t=>t.id===id)||null;
  /* every rule broken by m.targets, as [{rule:'targets'|'target-params', where, msg}] (empty when fine) */
  function targetProblems(m){
    const out=[], add=(rule,where,msg)=>out.push({rule,where,msg});
    if(m.targets==null) return out;
    if(!Array.isArray(m.targets)||!m.targets.length){ add('targets','targets','must be a non-empty array'); return out; }
    const keys=new Set(Array.isArray(m.params)?m.params.map(p=>p&&p.key):[]), seen=new Set();
    m.targets.forEach((t,i)=>{
      const w=`targets[${i}]`;
      if(!t||typeof t!=='object'||Array.isArray(t)) return add('targets',w,'must be an object');
      if(!TARGET_IDS.includes(t.id)) return add('targets',w+'.id',`must be one of ${TARGET_IDS.join(', ')} (got ${JSON.stringify(t.id)})`);
      if(seen.has(t.id)) add('targets',w+'.id',`duplicate target "${t.id}"`); seen.add(t.id);
      if(t.note!=null && typeof t.note!=='string') add('targets',w+'.note','must be a string');
      if(t.id==='download'){
        if(!isStr(t.url)) add('targets',w+'.url','a download target needs a url');
        if(!FORMATS.includes(t.format)) add('targets',w+'.format',`must be one of ${FORMATS.join(', ')} (got ${JSON.stringify(t.format)})`);
        if(t.size!=null && !(Number.isInteger(t.size)&&t.size>0)) add('targets',w+'.size','must be a positive number of bytes');
        for(const k of ['runtime','render','entry','requires','minBox','params']) if(t[k]!=null) add('targets',w+'.'+k,'a download target is metadata only: no runtime, render, entry, requires, minBox or params');
        return;
      }
      const runtime=t.runtime??m.runtime, render=t.render??(t.runtime==null||t.runtime===m.runtime?m.render:undefined), entry=t.entry??m.entry;
      if(!RENDER[runtime]) add('targets',w+'.runtime',`the ${t.id} target needs a runtime, "js" or "wasm" (got ${JSON.stringify(runtime)})`);
      else if(!RENDER[runtime].includes(render)) add('targets',w+'.render',`for runtime "${runtime}" must be ${RENDER[runtime].map(r=>`"${r}"`).join(' or ')} (got ${JSON.stringify(render)})`);
      if(!isStr(entry)) add('targets',w+'.entry',`the ${t.id} target needs an entry path`);
      if(t.id==='mobile' && render==='webgl2') add('targets',w+'.render','a mobile target may only use canvas2d (js) or pixels/commands (wasm); put webgl2 in the desktop target');
      if(t.requires!=null){
        if(!Array.isArray(t.requires)||t.requires.some(r=>!REQUIRES.includes(r))) add('targets',w+'.requires',`must be an array of ${REQUIRES.map(r=>`"${r}"`).join(', ')}`);
        else if(t.id==='mobile' && t.requires.includes('webgl2')) add('targets',w+'.requires','a mobile target cannot require webgl2');
      }
      if(t.minBox!=null && !(Array.isArray(t.minBox)&&t.minBox.length===2&&t.minBox.every(x=>isNum(x)&&x>0))) add('targets',w+'.minBox','must be [width, height] in CSS px');
      if(t.params!=null){
        if(!Array.isArray(t.params)||t.params.some(k=>typeof k!=='string')) add('target-params',w+'.params','must be an array of param keys');
        else for(const k of t.params) if(!keys.has(k)) add('target-params',w+'.params',`unknown param "${k}" (the ${t.id} target can only honor params the piece declares)`);
      }
      if(t.format!=null||t.url!=null) add('targets',w,'format and url belong on the download target');
    });
    if(!seen.has('desktop') && !seen.has('mobile')) add('targets','targets','needs a desktop or a mobile target (download alone is not runnable)');
    return out;
  }
  /* Which target to run here. caps = {webgl2, coarsePointer, viewportW, viewportH, saveData, preferred?, box?:{w,h}}.
     Returns {target, id, reason, fallback} where fallback is null or {reason:'webgl2'|'minBox', message} when even
     the best target cannot run here (the host then shows a poster and a card instead of mounting). */
  function canRun(t,caps){
    if((t.requires||[]).includes('webgl2') && !caps.webgl2) return {reason:'webgl2', message:'This piece needs a desktop browser with WebGL2'};
    const b=caps.box||{w:caps.viewportW, h:caps.viewportH};
    if(t.minBox && b && isNum(b.w) && isNum(b.h) && (b.w<t.minBox[0]||b.h<t.minBox[1])) return {reason:'minBox', message:`This piece needs a screen with room for ${t.minBox[0]}×${t.minBox[1]} px`};
    return null;
  }
  function targetFor(m,caps={}){
    const ts=runnableTargets(m), by=id=>ts.find(t=>t.id===id), ok=t=>t&&!canRun(t,caps);
    const pick=(t,reason)=>({target:t, id:t.id, reason, fallback:null});
    if(caps.preferred && ok(by(caps.preferred))) return pick(by(caps.preferred),'preferred');
    const D=by('desktop'), Mb=by('mobile');
    const phone=!!caps.coarsePointer || (isNum(caps.viewportW)&&caps.viewportW<700) || !!caps.saveData || (D&&!ok(D));
    if(phone && ok(Mb)) return pick(Mb,'phone');
    if(ok(D)) return pick(D,'desktop');
    if(ok(Mb)) return pick(Mb,'only');
    const any=by('any'); if(ok(any)) return pick(any,'only');
    const t=D||Mb||any||ts[0]||null;
    return {target:t, id:t&&t.id, reason:'fallback', fallback:t?canRun(t,caps):{reason:'none', message:'This piece has no runnable target'}};
  }
  /* the manifest one target runs with: the shared fields plus that target's runtime/render/entry */
  function manifestForTarget(m,t){
    if(!t || t.id==='any') return m;
    const o={...m, runtime:t.runtime, render:t.render, entry:t.entry, target:t.id}; return o;
  }

  function snap(p,v){
    v=Math.min(p.max,Math.max(p.min,v));
    const k=Math.round((v-p.min)/p.step); let s=p.min+k*p.step;
    if(s>p.max+1e-9) s-=p.step;
    const d=Math.max(decimals(p.step),decimals(p.min));
    return +s.toFixed(Math.min(12,d));
  }
  function defaultOf(p){
    return p.type==='seed' ? (Number.isInteger(p.default)?p.default>>>0:1) : p.default;
  }
  /* A module never receives an invalid value: fill defaults, clamp and snap ranges, drop unknown keys. */
  function normalizeParams(m,partial){
    const src=partial&&typeof partial==='object'?partial:{}, out={};
    for(const p of m.params){
      let v=Object.prototype.hasOwnProperty.call(src,p.key)?src[p.key]:undefined;
      switch(p.type){
        case 'range': { if(typeof v==='string' && v.trim()!=='') v=+v; out[p.key]=isNum(v)?snap(p,v):p.default; break; }
        case 'toggle': out[p.key]=typeof v==='boolean'?v:(v===0||v===1)?!!v:p.default; break;
        case 'select': out[p.key]=p.options.some(o=>o[0]===v)?v:p.default; break;
        case 'color': out[p.key]=isHex(v)?v.toLowerCase():p.default; break;
        case 'seed': out[p.key]=isNum(v)?(Math.trunc(v)>>>0):defaultOf(p); break;
      }
    }
    return out;
  }

  /* "0.00" -> 2 decimals; literal text around the digits is kept ("0°", "0.0 s", "×0.00"). */
  function formatter(p){
    if(typeof p.fmt==='function') return p.fmt;
    if(typeof p.format==='string'){
      const mm=p.format.match(/^(.*?)(0+(?:\.0+)?)(.*)$/);
      if(mm){ const d=(mm[2].split('.')[1]||'').length; return v=>mm[1]+(+v).toFixed(d)+mm[3]; }
    }
    if(p.type==='range'){ const d=decimals(p.step); return v=>(+v).toFixed(d); }
    return v=>String(v);
  }
  /* Descriptors the Customize panel renders from. */
  function paramControls(m){
    return m.params.map(p=>{
      const c={key:p.key, type:p.type, label:p.label||(p.type==='seed'?'Random seed':p.key), default:defaultOf(p), id:'cz-p-'+p.key, format:formatter(p)};
      if(p.type==='range') Object.assign(c,{min:p.min, max:p.max, step:p.step});
      if(p.type==='select') c.options=p.options.map(([value,label])=>({value,label}));
      if(p.type==='seed') Object.assign(c,{min:0, max:4294967295, step:1});
      return c;
    });
  }
  /* The manifest as it would appear in loci.json (functions dropped). */
  function manifestJSON(m){ return JSON.stringify(m,(k,v)=>typeof v==='function'?undefined:v,2); }

  const api={validateManifest, normalizeParams, paramControls, manifestJSON, targetsOf, runnableTargets, targetById, targetProblems, targetFor, canRun, manifestForTarget, TARGET_IDS, TARGET_NAME, TARGET_LIMITS};
  if(typeof module!=='undefined' && module.exports) module.exports=api;
  else Object.assign(root,api,{LociManifest:api});
})(typeof globalThis!=='undefined'?globalThis:this);
