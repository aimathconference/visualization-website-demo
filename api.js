/* ---------- EigenReelAPI: where what you make and mark is kept (docs/server.md) ----------
   Loaded before app.js. Opened as static files, everything stays in this browser's localStorage under the same keys
   as always. Served by the demo server (demo/), the boot probe of api/whoami answers {server: true, ...} and the
   per-person stores move to the server: likes into its likes table, your handle into its users table, and the rest
   (saved pieces, watch time, lists of moments, Chalkboard drafts, proposals, answers) into its user_kv table, one JSON
   value per key. (Opened as static files, api/whoami is a file in this folder that says {"server": false}.)
   The interface is synchronous, as the UI code always was: reads come from a cache filled once at boot (EigenReelAPI.ready),
   writes update the cache at once and go to the server behind it, coalesced per key. app.js waits for ready before
   it builds the feed. Session-only state (the feed filter) stays in the browser. */
(function(root){
'use strict';
const LS={
  get(k,d){ try{ const x=localStorage.getItem(k); return x==null?d:JSON.parse(x); }catch(_){ return d; } },
  set(k,v){ try{ localStorage.setItem(k,JSON.stringify(v)); }catch(_){} },
  del(k){ try{ localStorage.removeItem(k); }catch(_){} },
  keys(prefix){ const out=[]; try{ for(let i=0;i<localStorage.length;i++){ const k=localStorage.key(i); if(k && k.startsWith(prefix)) out.push(k); } }catch(_){} return out.sort(); },
};
/* the stores that are per person: on the server when there is one. Everything else is always this browser's. */
const FAMILIES={
  saves:k=>k==='eigenreel:saved', signals:k=>k==='eigenreel:watch', lists:k=>k==='eigenreel:moments',
  drafts:k=>k.startsWith('eigenreel:draft:')||k.startsWith('eigenreel:draft2:'),
  proposals:k=>k==='eigenreel:preset-proposals'||k==='eigenreel:bounty-proposals'||k==='eigenreel:bounty-votes',
  answers:k=>k.startsWith('eigenreel:question:')||k.startsWith('eigenreel:ask:'),
};
const shared=k=>Object.values(FAMILIES).some(f=>f(k));

const S={on:false, me:null, who:null, kv:new Map(), viz:new Map(), liked:new Set(), users:new Map(), playground:[], registry:{repo:null, branch:'main', singles:[]}, timers:new Map(), listeners:new Map()};
const emit=(ev,...a)=>(S.listeners.get(ev)||[]).forEach(f=>{ try{ f(...a); }catch(e){ console.warn('eigenreel: api listener',e); } });

/* every write carries the header the server's cross-site check asks for */
async function call(method,path,body,o={}){
  const r=await fetch(path,{method, headers:{'x-eigenreel':'1', ...(body!==undefined?{'content-type':'application/json'}:{})}, body:body===undefined?undefined:JSON.stringify(body), credentials:'same-origin', keepalive:!!o.keepalive});
  let j=null; try{ j=await r.json(); }catch(_){}
  if(!r.ok) throw new Error((j&&j.error)||`HTTP ${r.status}`);
  return j;
}
const kvPath=k=>'api/me/kv/'+encodeURIComponent(k);
/* write-through, coalesced: the last value for a key within `wait` ms is the one sent */
function flushKey(k,keepalive){
  const t=S.timers.get(k); if(t){ clearTimeout(t); S.timers.delete(k); } else if(!keepalive) return;
  const has=S.kv.has(k), v=S.kv.get(k);
  return (has?call('PUT',kvPath(k),{value:v},{keepalive}):call('DELETE',kvPath(k),undefined,{keepalive}))
    .catch(e=>{ console.warn(`eigenreel: could not save ${k} to the server: ${e.message}`); emit('error',k,e); });
}
function schedule(k,wait=400){ const t=S.timers.get(k); if(t) clearTimeout(t); S.timers.set(k,setTimeout(()=>flushKey(k),wait)); }
const waitFor=k=>FAMILIES.signals(k)?20000:400; // watch time ticks every few seconds; it need not reach the server as often
addEventListener('pagehide',()=>{ if(S.on) [...S.timers.keys()].forEach(k=>flushKey(k,true)); });

/* the generic routed store: per-person keys to the server when there is one, the rest to localStorage */
const kv={
  get(k,d){ if(S.on && shared(k)) return S.kv.has(k)?structuredClone(S.kv.get(k)):d; return LS.get(k,d); },
  set(k,v){ if(S.on && shared(k)){ S.kv.set(k,structuredClone(v)); schedule(k,waitFor(k)); return; } LS.set(k,v); },
  del(k){ if(S.on && shared(k)){ if(!S.kv.has(k)) return; S.kv.delete(k); schedule(k,0); return; } LS.del(k); },
  keys(prefix){ if(S.on && shared(prefix)) return [...S.kv.keys()].filter(k=>k.startsWith(prefix)).sort(); return LS.keys(prefix); },
};
/* a facade per store: the same calls, limited to that store's keys */
function family(name){
  const ok=FAMILIES[name], check=k=>{ if(!ok(k)) throw new Error(`EigenReelAPI.${name}: not one of its keys: ${k}`); return k; };
  return {get:(k,d)=>kv.get(check(k),d), set:(k,v)=>kv.set(check(k),v), del:k=>kv.del(check(k)), keys:prefix=>kv.keys(prefix).filter(ok)};
}
const one=(key,d)=>({get:()=>kv.get(key,d), set:v=>kv.set(key,v)});

/* likes: an array of piece ids. On the server each change is a PUT or DELETE on /api/viz/<id>/like, and the
   count it answers with is the piece's shared total (EigenReelAPI.on('likes', (id, count, liked) => …)). */
const likes={
  get(){ return S.on?[...S.liked]:LS.get('eigenreel:likes',[]); },
  set(ids){
    if(!S.on) return LS.set('eigenreel:likes',ids);
    const want=new Set(ids);
    for(const id of new Set([...want,...S.liked])){
      const on=want.has(id); if(on===S.liked.has(id) || !S.viz.has(id)) continue;
      if(on) S.liked.add(id); else S.liked.delete(id);
      call(on?'PUT':'DELETE',`api/viz/${encodeURIComponent(S.viz.get(id).id)}/like`).then(r=>{ const x=S.viz.get(id); x.likes=r.likes; x.liked=r.liked; emit('likes',id,r.likes,r.liked); })
        .catch(e=>{ console.warn(`eigenreel: could not ${on?'like':'unlike'} ${id}: ${e.message}`); if(on) S.liked.delete(id); else S.liked.add(id); emit('likes',id,null,!on); });
    }
  },
  /* the shared total for a piece, or null when there is no server (the catalog's sample numbers apply) */
  count(id){ return S.on && S.viz.has(id)?S.viz.get(id).likes:null; },
};
/* your handle: '@name'. On the server it is your profile's handle (lowercase, 3 to 20 characters), and set returns a
   promise that settles when the server has taken it (or refused, with its reason). In this browser set is immediate. */
const handle={
  get(){ return S.on?(S.me&&S.me.handle?'@'+S.me.handle:''):LS.get('eigenreel:handle',''); },
  set(h){
    if(!S.on){ if(h) LS.set('eigenreel:handle',h); else LS.del('eigenreel:handle'); return; }
    if(!h) return Promise.reject(new Error('On the demo server your handle is your profile’s name, so it cannot be empty.'));
    return call('PUT','api/me/handle',{handle:h.replace(/^@/,'')}).then(u=>{ const old=S.me&&S.me.handle; S.me=u; if(old) S.users.delete(old); S.users.set(u.handle,u); emit('me',u); return u; });
  },
};
/* Your Chalkboard (demo server only; nobody else's reach this page; the API's name for it is the playground):
   list() → [{id, slug, title, hook, author, parent, likes, liked, files, …}], post(parentId, files) → a new one, after
   which it is in list(); update(id, files) → the same one with new files; remove(id) deletes one. Its likes are under
   the piece id 'pg-<id>'. */
const playground={
  list(){ return S.on?S.playground:[]; },
  post(parent,files){
    if(!S.on) return Promise.reject(new Error('Saving to the Chalkboard needs the demo server.'));
    return call('POST','api/playground',{parent, files}).then(v=>{ S.playground=[v,...S.playground]; S.viz.set('pg-'+v.id,v); return v; });
  },
  update(id,files){
    if(!S.on) return Promise.reject(new Error('Saving to the Chalkboard needs the demo server.'));
    return call('PUT',`api/playground/${encodeURIComponent(id)}`,{files}).then(v=>{ S.playground=S.playground.map(x=>x.id===id?v:x); S.viz.set('pg-'+v.id,v); return v; });
  },
  remove(id){
    if(!S.on) return Promise.reject(new Error('Saving to the Chalkboard needs the demo server.'));
    return call('DELETE',`api/viz/${encodeURIComponent(id)}`).then(()=>{ S.playground=S.playground.filter(v=>v.id!==id); S.viz.delete('pg-'+id); S.liked.delete('pg-'+id); });
  },
};
/* The registry (demo server only): the entries merged after two approvals (entries/<slug>.js and .md in the submission
   format, docs/submission-spec-slop.md), which the server imports (demo/server/registry.js). singles() →
   [{id, slug, title, hook, tags, license, colors, meta, code, explanation, wasm (a data: URL or null), registryPath,
   registryPr, author: {handle, avatar, github}, likes, liked, createdAt, …}], where meta is what EigenReelSpec.read()
   read from the code; app.js gives each the catalog's shape. repo/branch name the registry, the repository
   submissions go to as pull requests (the Submit page). Their likes are under their slug, like any reviewed piece. */
const registry={ singles(){ return S.on?S.registry.singles:[]; }, get repo(){ return S.on?S.registry.repo:null; }, get branch(){ return S.registry.branch; } };
/* profiles kept by the server (handle without the @ → {handle, avatar, bio, homepage, github, joined, …}) */
const users={ get:h=>S.on?S.users.get(String(h||'').replace(/^@/,''))||null:null, all:()=>S.on?[...S.users.values()]:[] };

/* your bio and links, on the server (My Account). save({bio, homepage, github}) settles with your profile, or rejects with the server's reason. */
const profile={
  save(f){
    if(!S.on||!S.me) return Promise.reject(new Error('Your profile needs an account on the demo server.'));
    return call('PUT','api/me',{bio:f.bio, homepage:f.homepage, github:f.github, avatar:S.me.avatar||avatarFor(S.me.handle)}).then(u=>{ S.me=u; S.users.set(u.handle,u); emit('me',u); return u; });
  },
};

/* ---------- boot: probe, then (on the server) sign in and load what is yours ---------- */
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function probe(){
  try{
    const r=await Promise.race([fetch('api/whoami',{credentials:'same-origin', cache:'no-store'}), sleep(4000).then(()=>null)]);
    if(!r || !r.ok) return null;
    const j=await r.json(); return j && j.server===true?j:null;
  }catch(_){ return null; }
}
/* first visit: the server needs a profile (a handle and a curve avatar) before anything can be written */
const AV_KINDS=['rose','liss','spiral','hypo','chords'];
function avatarFor(seed){
  let x=7; for(const c of String(seed)) x=(x*31+c.charCodeAt(0))>>>0;
  const hx=n=>'#'+[0,8,16].map(s=>((n>>>s)&255).toString(16).padStart(2,'0')).join('');
  const kind=AV_KINDS[x%5], o={kind, bg:hx((x*2654435761)>>>0&0x3f3f3f), fg:hx(((x*40503)>>>0)|0x808080)};
  if(kind==='rose'||kind==='chords') o.k=2+x%7; if(kind==='liss'){ o.a=1+x%5; o.b=2+x%4; } if(kind==='spiral') o.turns=3+x%5; if(kind==='hypo'){ o.R=5; o.r=2+x%2; o.d=3; }
  return o;
}
async function setUp(){
  const info=await call('GET','api/me'), base=(info.suggestedHandle||'').replace(/[^a-z0-9._-]/g,'')||'guest';
  for(const h of [base, ...[1,2,3].map(()=>`${base.slice(0,14)}-${Math.floor(1000+Math.random()*9000)}`)]){
    if(h.length<3) continue;
    try{ return await call('PUT','api/me',{handle:h, avatar:avatarFor(h)}); }catch(e){ if(!/taken|reserved/i.test(e.message)) throw e; }
  }
  throw new Error('could not pick a free handle');
}
async function load(){
  const [kvr,feed,pg,us,reg]=await Promise.all([call('GET','api/me/kv'), call('GET','api/feed'), call('GET','api/playground'), call('GET','api/users'), call('GET','api/registry').catch(()=>null)]);
  if(reg && typeof reg==='object') S.registry={repo:reg.repo||null, branch:reg.branch||'main', singles:Array.isArray(reg.singles)?reg.singles:[]};
  S.users=new Map(us.items.map(u=>[u.handle,u])); if(S.me) S.users.set(S.me.handle,S.me);
  S.kv=new Map(Object.entries(kvr.items||{}));
  S.viz=new Map(feed.items.map(v=>[v.slug,v])); S.liked=new Set(feed.items.filter(v=>v.liked).map(v=>v.slug));
  S.playground=pg.items; pg.items.forEach(v=>{ S.viz.set('pg-'+v.id,v); if(v.liked) S.liked.add('pg-'+v.id); });
}
const ready=(async()=>{
  const who=await probe(); if(!who) return false;
  S.who=who;
  if(who.signedOut){ console.info('eigenreel: signed out of the demo server in this browser: keeping everything in this browser'); return false; }
  if(!who.identified || who.removed){ console.info('eigenreel: served by the demo server, but not signed in: keeping everything in this browser'); return false; }
  try{
    S.me=who.needsSetup?await setUp():who.user;
    S.on=true; await load();
    return true;
  }catch(e){ console.warn(`eigenreel: the demo server did not answer (${e.message}); keeping everything in this browser`); S.on=false; return false; }
})();

/* ---------- the kill switch: pieces an admin has stopped (demo/server/routes/admin.js; blocked.json as static files) ----------
   The last list is kept in this browser, so a stopped piece stays stopped while the list cannot be read. Read at load,
   every minute, and whenever the tab comes back. */
const BLOCK_KEY='eigenreel:blocked';
try{ const c=JSON.parse(localStorage.getItem(BLOCK_KEY)||'null'); if(c) EigenReelHost.setBlocked(c); }catch(_){}
let blockGate=0;
async function readBlocked(){
  const n=++blockGate;
  try{
    const onServer=!!S.who; // the probe answered, signed in or not
    const r=await fetch(onServer?'api/blocked':'blocked.json',{cache:'no-store', credentials:'same-origin'});
    if(!r.ok || n!==blockGate) return;
    const j=await r.json(), items=Array.isArray(j.items)?j.items:[];
    EigenReelHost.setBlocked(items); emit('blocked',items);
    try{ localStorage.setItem(BLOCK_KEY,JSON.stringify(items)); }catch(_){}
  }catch(_){}
}
ready.finally(()=>{
  if(S.who && S.who.runnerUrl) EigenReelHost.setRunnerURL(S.who.runnerUrl);
  readBlocked(); setInterval(readBlocked,60000);
  document.addEventListener('visibilitychange',()=>{ if(!document.hidden) readBlocked(); });
});

const api={
  ready, readBlocked, kv, likes, handle, users, profile, playground, registry,
  saves:one('eigenreel:saved',[]), signals:one('eigenreel:watch',{}),
  lists:{ get:()=>kv.get('eigenreel:moments',null), put:list=>kv.set('eigenreel:moments',list), delete:()=>kv.del('eigenreel:moments') },
  drafts:family('drafts'), proposals:family('proposals'), answers:family('answers'),
  get server(){ return S.on; },
  /* the name the site shows (config.js SITE_NAME; the demo server's siteName wins, even before anyone is signed in) */
  siteName(){ const n=S.who&&typeof S.who.siteName==='string'?S.who.siteName.trim():''; return n||(typeof SITE_NAME==='string'&&SITE_NAME)||'EigenReel'; },
  /* your role on the demo server (user, moderator, blog, admin), or null */
  role(){ return S.on&&S.me?S.me.role||'user':null; },
  whoami(){ return S.on?{server:true, handle:handle.get(), user:S.me, authMode:S.who.authMode, devLogin:S.who.devLogin||null}:{server:false, handle:handle.get(), ...(S.who&&S.who.signedOut?{signedOut:true}:{})}; },
  /* Sign out / sign back in (the demo's POST /api/sign-out and /api/sign-in): a cookie makes the server ignore this
     browser's Tailscale (or dev) identity. The page reloads either way, so every part of it starts in the new state. */
  signOut(){ return call('POST','api/sign-out').then(()=>location.reload()); },
  signIn(){ return call('POST','api/sign-in').then(()=>location.reload()); },
  on(ev,f){ if(!S.listeners.has(ev)) S.listeners.set(ev,[]); S.listeners.get(ev).push(f); },
  call, _state:S,
};
root.EigenReelAPI=api;
})(typeof globalThis!=='undefined'?globalThis:this);
