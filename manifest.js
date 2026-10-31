/* ---------- loci.json: validation, parameter normalization, Customize descriptors ----------
   Implements section 2 of docs/module-api.md. Plain script (a global LociManifest on the page)
   and a CommonJS module under node, so it can be unit tested without a browser. */
(function(root){
  const TYPES=['range','toggle','select','color','seed'];
  const RENDER={js:['canvas2d','webgl2'], wasm:['pixels','commands']};
  const isNum=x=>typeof x==='number' && Number.isFinite(x);
  const isStr=x=>typeof x==='string' && x.length>0;
  const isHex=x=>typeof x==='string' && /^#[0-9a-f]{6}$/i.test(x);
  const isHandle=x=>typeof x==='string' && /^@[a-z0-9][a-z0-9._-]{0,38}$/i.test(x);
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
        if(p.scale!=null && !isNum(p.scale)) fail(w+'.scale','must be a number');
        if(p.labels!=null && (!Array.isArray(p.labels) || !p.labels.every(isStr))) fail(w+'.labels','must be an array of strings');
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
        // optional credit for a viewer who found this state (docs/module-api.md section 2, "foundBy")
        if(s.foundBy!=null && !isHandle(s.foundBy)) fail(w+'.foundBy','must be a handle like "@may.iterates"');
        if(s.view!==undefined){ const vp=viewProblem(s.view); if(vp) fail(w+'.view',vp); }
      });
    }
    if(m.cycle!=null && !(isNum(m.cycle)&&m.cycle>0)) fail('cycle','must be a positive number of seconds');
    // optional: the piece's own palette, the package form of a single-file entry's COLORS block (demo/github/README.md,
    // "The contributor template"). main and secondary are required when it is there; bg, fg and any other names are optional.
    // On the default palette in the Night style the piece draws with main and secondary as a1 and a2 (app.js themeFor).
    if(m.colors!=null){
      if(typeof m.colors!=='object' || Array.isArray(m.colors)) fail('colors','must be an object of name: "#rrggbb"');
      for(const k in m.colors){
        if(!/^[A-Za-z_][A-Za-z0-9_]{0,30}$/.test(k)) fail('colors',`"${k}" is not a color name (letters, digits and _)`);
        if(!isHex(m.colors[k])) fail('colors.'+k,'must be a six-digit hex color like "#ff2e74"');
      }
      if(!m.colors.main || !m.colors.secondary) fail('colors','needs both a main and a secondary color');
    }
    // optional metadata: the Wanted challenge this piece answers (docs/bounties.md). No behaviour beyond the Explanation line.
    if(m.bounty!=null && !(isStr(m.bounty) && /^[a-z0-9][a-z0-9-]*$/.test(m.bounty))) fail('bounty','must be a challenge id: lowercase letters, digits and dashes');
    // optional metadata: the pieces this one builds on (docs/module-api.md section 2). Shown as "Before this" in the
    // Explanation tab; "Next" is derived from other pieces' lists, never authored. Whether each id is published is the
    // static "related" check's job (a warning), since the published index is not available here.
    if(m.after!=null){
      if(!Array.isArray(m.after)) fail('after','must be an array of piece ids');
      if(m.after.length>3) fail('after',`at most 3 pieces (got ${m.after.length})`);
      const seen=new Set();
      m.after.forEach((a,i)=>{
        if(!(isStr(a) && /^[a-z0-9][a-z0-9-]*$/.test(a))) fail(`after[${i}]`,'must be a piece id: lowercase letters, digits and dashes');
        if(a===m.id) fail(`after[${i}]`,'a piece cannot come after itself');
        if(seen.has(a)) fail(`after[${i}]`,`duplicate id "${a}"`); seen.add(a);
      });
    }
    if(!['pause','static'].includes(m.motion)) fail('motion','must be "pause" or "static"');
    if(m.pointer!=null){ const pp=pointerProblems(m.pointer); if(pp.length) fail('pointer'+pp[0].where,pp[0].msg); }
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
        for(const k of ['runtime','render','entry','requires','minBox','params','pointer']) if(t[k]!=null) add('targets',w+'.'+k,'a download target is metadata only: no runtime, render, entry, requires, minBox, params or pointer');
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
      if(t.pointer!=null) for(const p of pointerProblems(t.pointer)) add('pointer',w+'.pointer'+p.where,p.msg);
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
    const o={...m, runtime:t.runtime, render:t.render, entry:t.entry, target:t.id}, p=t.pointer??m.pointer;
    if(p!=null) o.pointer=p; return o;
  }

  /* ---------- pointer input (docs/module-api.md, section 2, "Pointer") ----------
     pointer: { mode: "none" | "orbit" | "pan-zoom" | "custom", drag?, click?, keys?, wheel?, hint? } on the manifest or
     on a desktop/mobile target (the target's wins). "none" (the default) keeps the host's scrub-by-drag and long-press;
     any other mode makes the slide engageable: once the viewer clicks or taps it, the host forwards pointer, wheel and
     key events to the module. drag/click/keys/wheel say which kinds the module wants (all default to true). */
  const POINTER_MODES=['none','orbit','pan-zoom','custom'], POINTER_FLAGS=['drag','click','keys','wheel'];
  const POINTER_HINT={orbit:'Drag to orbit · scroll to zoom', 'pan-zoom':'Drag to pan · scroll to zoom', custom:'Drag to explore'};
  function pointerProblems(p){
    const out=[], add=(where,msg)=>out.push({where,msg});
    if(!p || typeof p!=='object' || Array.isArray(p)){ add('','must be an object like {"mode": "orbit"}'); return out; }
    if(!POINTER_MODES.includes(p.mode)) add('.mode',`must be one of ${POINTER_MODES.map(x=>`"${x}"`).join(', ')} (got ${JSON.stringify(p.mode)})`);
    for(const k of POINTER_FLAGS) if(p[k]!=null && typeof p[k]!=='boolean') add('.'+k,'must be true or false');
    if(p.hint!=null && !(typeof p.hint==='string' && p.hint.length>0 && p.hint.length<=80)) add('.hint','must be a string of 1 to 80 characters');
    for(const k in p) if(k!=='mode' && k!=='hint' && !POINTER_FLAGS.includes(k)) add('.'+k,`unknown field (allowed: mode, ${POINTER_FLAGS.join(', ')}, hint)`);
    return out;
  }
  /* The pointer declaration a target runs with, filled in: {mode, drag, click, keys, wheel, hint}. mode "none" when absent. */
  function pointerFor(m,t){
    const p=(t&&t.pointer)||(m&&m.pointer)||null;
    if(!p || !POINTER_MODES.includes(p.mode) || p.mode==='none') return {mode:'none', drag:false, click:false, keys:false, wheel:false, hint:''};
    const o={mode:p.mode}; for(const k of POINTER_FLAGS) o[k]=p[k]!==false;
    o.hint=typeof p.hint==='string'&&p.hint?p.hint:POINTER_HINT[p.mode]; return o;
  }
  /* A view (camera, selection, dragged points) a module reports and the host serializes: plain JSON, at most 2 KB.
     null clears it (the module's default view). Returns an error message or null. */
  const VIEW_MAX=2048;
  function viewProblem(v){
    if(v===null) return null;
    if(!v || typeof v!=='object' || Array.isArray(v)) return 'must be a plain JSON object (or null)';
    let bad=null, depth=0;
    const walk=(x,d)=>{ if(bad) return; if(d>16){ bad='nests deeper than 16 levels'; return; }
      if(x===null || typeof x==='string' || typeof x==='boolean') return;
      if(typeof x==='number'){ if(!Number.isFinite(x)) bad='must not contain NaN or Infinity'; return; }
      if(Array.isArray(x)){ x.forEach(y=>walk(y,d+1)); return; }
      if(typeof x==='object' && Object.getPrototypeOf(x)===Object.prototype){ for(const k in x) walk(x[k],d+1); return; }
      bad='must be plain JSON (objects, arrays, strings, finite numbers, booleans, null)'; };
    walk(v,depth); if(bad) return bad;
    const j=JSON.stringify(v), n=typeof TextEncoder!=='undefined'?new TextEncoder().encode(j).length:unescape(encodeURIComponent(j)).length; if(n>VIEW_MAX) return `is ${n} bytes of JSON (at most ${VIEW_MAX})`;
    return null;
  }
  const normalizeView=v=>v===undefined||viewProblem(v)?null:v===null?null:JSON.parse(JSON.stringify(v));

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

  /* "0.00" -> 2 decimals; literal text around the digits is kept ("0°", "0.0 s", "×0.00"). scale multiplies the value
     first (a slider in hundredths reads 3.83); labels names each step from min instead ("left", "midpoint", "right"). */
  function formatter(p){
    if(typeof p.fmt==='function') return p.fmt;
    if(Array.isArray(p.labels)) return v=>p.labels[Math.round((v-p.min)/p.step)]??String(v);
    if(typeof p.scale==='number'){ const f=typeof p.format==='string'?p.format:'0.00', mm=f.match(/^(.*?)(0+(?:\.0+)?)(.*)$/), d=mm?(mm[2].split('.')[1]||'').length:2; return v=>(mm?mm[1]:'')+(v*p.scale).toFixed(d)+(mm?mm[3]:''); }
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

  /* Live explanation links (docs/submitting.md section 6): links in explanation.md whose target is a reserved
     #scheme: drive the piece. liveLink(m, href) is shared by the Explanation tab (which acts on it) and the gate
     (which fails every problem with its line). It returns null for any other href, {kind, problem} for a bad one, else
       #param:<key>              {kind:'param', key}   a readout of a declared param (never a time-driven quantity)
       #preset:<label or index>  {kind:'preset', i}    a preset by its label's slug (or a unique leading part of it), or by index from 0
       #t:<seconds>              {kind:'t', t}         seek to t and pause
       #state:<base64url JSON>   {kind:'state', stop}  a lesson stop {p?, t?, view?, note?}; params must be valid as written */
  const LIVE_SCHEMES=['param','preset','t','state'], LIVE_STATE_MAX=2048;
  const liveSlug=s=>String(s).normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,'-').replace(/^-+|-+$/g,'');
  const b64uDecode=s=>new TextDecoder().decode(Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0)));
  function liveLink(m,href){
    const mm=/^#([a-z]+):(.*)$/i.exec(String(href==null?'':href).trim()); if(!mm) return null;
    const kind=mm[1].toLowerCase(); let a=mm[2]; try{ a=decodeURIComponent(a); }catch(_){}
    const bad=problem=>({kind, arg:a, problem});
    if(!LIVE_SCHEMES.includes(kind)) return {kind, arg:a, unknown:true, problem:`unknown link scheme #${kind}: (the live schemes are ${LIVE_SCHEMES.map(k=>'#'+k+':').join(', ')})`};
    if(kind==='param'){
      return m.params.some(p=>p.key===a)?{kind, key:a}:bad(`link to unknown param ${a||'(empty)'}${m.params.length?` (the params are ${m.params.map(p=>p.key).join(', ')})`:''}`);
    }
    if(kind==='preset'){
      const pr=Array.isArray(m.presets)?m.presets:[];
      if(/^\d+$/.test(a)) return +a<pr.length?{kind, i:+a}:bad(`link to preset ${a}, but the piece has ${pr.length} (counted from 0)`);
      const s=liveSlug(a), slugs=pr.map(p=>liveSlug(p.label));
      if(!s) return bad('#preset: needs a preset label or index');
      const i=slugs.indexOf(s); if(i>=0) return {kind, i};
      const hits=slugs.map((x,j)=>x.startsWith(s+'-')?j:-1).filter(j=>j>=0);
      if(hits.length===1) return {kind, i:hits[0]};
      if(hits.length>1) return bad(`#preset:${a} matches ${hits.length} presets (${hits.map(j=>`"${pr[j].label}"`).join(', ')}); use more of the label`);
      return bad(`link to unknown preset "${a}"${pr.length?` (the presets are ${pr.map(p=>`"${p.label}"`).join(', ')})`:''}`);
    }
    if(kind==='t'){
      if(!/^\d+(\.\d+)?$/.test(a) || !Number.isFinite(+a)) return bad(`#t:${a} is not a time in seconds (a number >= 0, like #t:12.5)`);
      return {kind, t:+a};
    }
    // state: a lesson stop, base64url JSON
    if(a.length>LIVE_STATE_MAX) return bad(`#state: is ${a.length} characters (at most ${LIVE_STATE_MAX})`);
    let o; try{ if(!/^[A-Za-z0-9_-]+$/.test(a)) throw 0; o=JSON.parse(b64uDecode(a)); }catch(_){ return bad('#state: is not base64url-encoded JSON'); }
    if(!o || typeof o!=='object' || Array.isArray(o)) return bad('#state: must encode a JSON object {p, t, view, note}');
    for(const k in o) if(!['v','p','t','view','note'].includes(k)) return bad(`#state: has "${k}"; a state sets only p, t, view and note${k==='theme'?' (never the theme)':''}`);
    if(o.v!==undefined && o.v!==m.id) return bad(`#state: names another piece (${String(o.v).slice(0,40)})`);
    if(o.p!==undefined){
      if(!o.p || typeof o.p!=='object' || Array.isArray(o.p)) return bad('#state: p must be an object of params');
      const norm=normalizeParams(m,o.p);
      for(const k in o.p){
        if(!m.params.some(p=>p.key===k)) return bad(`#state: unknown param ${k}`);
        if(JSON.stringify(norm[k])!==JSON.stringify(o.p[k])) return bad(`#state: ${k} = ${JSON.stringify(o.p[k])} is not a valid value (normalizes to ${JSON.stringify(norm[k])})`);
      }
    }
    if(o.t!==undefined && !(isNum(o.t)&&o.t>=0)) return bad('#state: t must be a number of seconds >= 0');
    if(o.view!==undefined){ const vp=viewProblem(o.view); if(vp) return bad(`#state: view ${vp}`); }
    if(o.note!==undefined && typeof o.note!=='string') return bad('#state: note must be a string');
    const stop={}; for(const k of ['p','t','view','note']) if(o[k]!==undefined) stop[k]=o[k];
    return {kind, stop};
  }

  const api={validateManifest, normalizeParams, paramControls, manifestJSON, targetsOf, runnableTargets, targetById, targetProblems, targetFor, canRun, manifestForTarget, pointerProblems, pointerFor, viewProblem, normalizeView, liveLink, LIVE_SCHEMES, TARGET_IDS, TARGET_NAME, TARGET_LIMITS, POINTER_MODES, VIEW_MAX, isHandle};
  if(typeof module!=='undefined' && module.exports) module.exports=api;
  else Object.assign(root,api,{LociManifest:api});
})(typeof globalThis!=='undefined'?globalThis:this);
