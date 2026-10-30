/* ---------- loci.json: validation, parameter normalization, Customize descriptors ----------
   Implements section 2 of docs/module-api.md. Plain script (a global LociManifest on the page)
   and a CommonJS module under node, so it can be unit tested without a browser. */
(function(root){
  const TYPES=['range','toggle','select','color','seed'];
  const RENDER={js:['canvas2d'], wasm:['pixels','commands']};
  const isNum=x=>typeof x==='number' && Number.isFinite(x);
  const isStr=x=>typeof x==='string' && x.length>0;
  const isHex=x=>typeof x==='string' && /^#[0-9a-f]{6}$/i.test(x);
  const decimals=x=>{ const s=String(x); if(/e-/.test(s)) return +s.split('e-')[1]; const i=s.indexOf('.'); return i<0?0:s.length-i-1; };

  function fail(where,msg){ throw new Error(`loci.json${where?' '+where:''}: ${msg}`); }

  function validateManifest(m){
    if(!m || typeof m!=='object' || Array.isArray(m)) fail('','must be an object');
    if(m.api!==1) fail('api',`must be 1 (got ${JSON.stringify(m.api)})`);
    if(!isStr(m.id) || !/^[a-z0-9][a-z0-9-]*$/.test(m.id)) fail('id','must be lowercase letters, digits and dashes');
    if(!isStr(m.title)) fail('title','must be a non-empty string');
    if(!RENDER[m.runtime]) fail('runtime',`must be "js" or "wasm" (got ${JSON.stringify(m.runtime)})`);
    if(!RENDER[m.runtime].includes(m.render)) fail('render',`for runtime "${m.runtime}" must be ${RENDER[m.runtime].map(r=>`"${r}"`).join(' or ')} (got ${JSON.stringify(m.render)})`);
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
    return m;
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

  const api={validateManifest, normalizeParams, paramControls, manifestJSON};
  if(typeof module!=='undefined' && module.exports) module.exports=api;
  else Object.assign(root,api,{LociManifest:api});
})(typeof globalThis!=='undefined'?globalThis:this);
