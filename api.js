/* ---------- LociAPI: where what you make and mark is kept (docs/server.md) ----------
   Loaded before app.js. Opened as static files, everything stays in this browser's localStorage under the same keys
   as always. Served by the demo server (demo/), the boot probe of api/whoami answers {server: true, ...} and the
   per-person stores move to the server: likes into its likes table, your handle into its users table, and the rest
   (saved pieces, watch time, lists of moments, remix drafts, proposals, answers) into its user_kv table, one JSON
   value per key. (Opened as static files, api/whoami is a file in this folder that says {"server": false}.)
   The interface is synchronous, as the UI code always was: reads come from a cache filled once at boot (LociAPI.ready),
   writes update the cache at once and go to the server behind it, coalesced per key. app.js waits for ready before
   it builds the feed. Session-only state (a remix you ran, the feed filter, the Mode preference) stays in the browser. */
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
  saves:k=>k==='loci:saved', signals:k=>k==='loci:watch', lists:k=>k==='loci:moments',
  drafts:k=>k.startsWith('loci:draft:')||k.startsWith('loci:draft2:'),
  proposals:k=>k==='loci:preset-proposals'||k==='loci:bounty-proposals'||k==='loci:bounty-votes',
  answers:k=>k.startsWith('loci:question:')||k.startsWith('loci:ask:'),
};
const shared=k=>Object.values(FAMILIES).some(f=>f(k));

const S={on:false, me:null, who:null, kv:new Map(), viz:new Map(), liked:new Set(), users:new Map(), playground:[], registry:{repo:null, branch:'main', items:[], singles:[]}, timers:new Map(), listeners:new Map()};
const emit=(ev,...a)=>(S.listeners.get(ev)||[]).forEach(f=>{ try{ f(...a); }catch(e){ console.warn('loci: api listener',e); } });

/* every write carries the header the server's cross-site check asks for */
async function call(method,path,body,o={}){
  const r=await fetch(path,{method, headers:{'x-loci':'1', ...(body!==undefined?{'content-type':'application/json'}:{})}, body:body===undefined?undefined:JSON.stringify(body), credentials:'same-origin', keepalive:!!o.keepalive});
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
    .catch(e=>{ console.warn(`loci: could not save ${k} to the server: ${e.message}`); emit('error',k,e); });
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
  const ok=FAMILIES[name], check=k=>{ if(!ok(k)) throw new Error(`LociAPI.${name}: not one of its keys: ${k}`); return k; };
  return {get:(k,d)=>kv.get(check(k),d), set:(k,v)=>kv.set(check(k),v), del:k=>kv.del(check(k)), keys:prefix=>kv.keys(prefix).filter(ok)};
}
const one=(key,d)=>({get:()=>kv.get(key,d), set:v=>kv.set(key,v)});

/* likes: an array of piece ids. On the server each change is a PUT or DELETE on /api/viz/<id>/like, and the
   count it answers with is the piece's shared total (LociAPI.on('likes', (id, count, liked) => …)). */
const likes={
  get(){ return S.on?[...S.liked]:LS.get('loci:likes',[]); },
  set(ids){
    if(!S.on) return LS.set('loci:likes',ids);
    const want=new Set(ids);
    for(const id of new Set([...want,...S.liked])){
      const on=want.has(id); if(on===S.liked.has(id) || !S.viz.has(id)) continue;
      if(on) S.liked.add(id); else S.liked.delete(id);
      call(on?'PUT':'DELETE',`api/viz/${encodeURIComponent(S.viz.get(id).id)}/like`).then(r=>{ const x=S.viz.get(id); x.likes=r.likes; x.liked=r.liked; emit('likes',id,r.likes,r.liked); })
        .catch(e=>{ console.warn(`loci: could not ${on?'like':'unlike'} ${id}: ${e.message}`); if(on) S.liked.delete(id); else S.liked.add(id); emit('likes',id,null,!on); });
    }
  },
  /* the shared total for a piece, or null when there is no server (the catalog's sample numbers apply) */
  count(id){ return S.on && S.viz.has(id)?S.viz.get(id).likes:null; },
};
/* your handle: '@name'. On the server it is your profile's handle (lowercase, 3 to 20 characters), and set returns a
   promise that settles when the server has taken it (or refused, with its reason). In this browser set is immediate. */
const handle={
  get(){ return S.on?(S.me&&S.me.handle?'@'+S.me.handle:''):LS.get('loci:handle',''); },
  set(h){
    if(!S.on){ if(h) LS.set('loci:handle',h); else LS.del('loci:handle'); return; }
    if(!h) return Promise.reject(new Error('On the demo server your handle is your profile’s name, so it cannot be empty.'));
    return call('PUT','api/me/handle',{handle:h.replace(/^@/,'')}).then(u=>{ const old=S.me&&S.me.handle; S.me=u; if(old) S.users.delete(old); S.users.set(u.handle,u); emit('me',u); return u; });
  },
};
/* Your Playground posts (demo server only; nobody else's reach this page): list() → [{id, slug, title, hook, author, parent, likes, liked, files, …}],
   post(parentId, files) → the new one, after which it is in list(); remove(id) deletes one. Its likes are under the piece id 'pg-<id>'. */
const playground={
  list(){ return S.on?S.playground:[]; },
  post(parent,files){
    if(!S.on) return Promise.reject(new Error('The Playground needs the demo server.'));
    return call('POST','api/playground',{parent, files}).then(v=>{ S.playground=[v,...S.playground]; S.viz.set('pg-'+v.id,v); return v; });
  },
  remove(id){
    if(!S.on) return Promise.reject(new Error('The Playground needs the demo server.'));
    return call('DELETE',`api/viz/${encodeURIComponent(id)}`).then(()=>{ S.playground=S.playground.filter(v=>v.id!==id); S.viz.delete('pg-'+id); S.liked.delete('pg-'+id); });
  },
};
/* Registry packages (demo server only): entries/<slug>/ folders merged in the registry after two approvals, which the
   server imports (demo/server/registry.js). list() → [{id, slug, title, author, license, createdAt, registryPr,
   registryPath, files, …}]; repo/branch name the registry. Their likes are under their slug, like any reviewed piece.
   singles() → the single-file entries (entries/<slug>.js): [{id, slug, title, author, colors, registryPath, code, guarded, meta: {t0, param}, …}],
   which app.js runs through single.js. */
const registry={ list(){ return S.on?S.registry.items:[]; }, singles(){ return S.on?S.registry.singles:[]; }, get repo(){ return S.on?S.registry.repo:null; }, get branch(){ return S.registry.branch; } };
/* profiles kept by the server (handle without the @ → {handle, avatar, bio, homepage, github, joined, …}) */
const users={ get:h=>S.on?S.users.get(String(h||'').replace(/^@/,''))||null:null, all:()=>S.on?[...S.users.values()]:[] };

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
  if(reg && Array.isArray(reg.items)) S.registry={repo:reg.repo||null, branch:reg.branch||'main', items:reg.items, singles:Array.isArray(reg.singles)?reg.singles:[]};
  S.users=new Map(us.items.map(u=>[u.handle,u])); if(S.me) S.users.set(S.me.handle,S.me);
  S.kv=new Map(Object.entries(kvr.items||{}));
  S.viz=new Map(feed.items.map(v=>[v.slug,v])); S.liked=new Set(feed.items.filter(v=>v.liked).map(v=>v.slug));
  S.playground=pg.items; pg.items.forEach(v=>{ S.viz.set('pg-'+v.id,v); if(v.liked) S.liked.add('pg-'+v.id); });
}
const ready=(async()=>{
  const who=await probe(); if(!who) return false;
  S.who=who;
  if(who.signedOut){ console.info('loci: signed out of the demo server in this browser: keeping everything in this browser'); return false; }
  if(!who.identified || who.removed){ console.info('loci: served by the demo server, but not signed in: keeping everything in this browser'); return false; }
  try{
    S.me=who.needsSetup?await setUp():who.user;
    S.on=true; await load();
    return true;
  }catch(e){ console.warn(`loci: the demo server did not answer (${e.message}); keeping everything in this browser`); S.on=false; return false; }
})();

const api={
  ready, kv, likes, handle, users, playground, registry,
  saves:one('loci:saved',[]), signals:one('loci:watch',{}),
  lists:{ get:()=>kv.get('loci:moments',null), put:list=>kv.set('loci:moments',list), delete:()=>kv.del('loci:moments') },
  drafts:family('drafts'), proposals:family('proposals'), answers:family('answers'),
  get server(){ return S.on; },
  /* the name the site shows (config.js SITE_NAME; the demo server's siteName wins, even before anyone is signed in) */
  siteName(){ const n=S.who&&typeof S.who.siteName==='string'?S.who.siteName.trim():''; return n||(typeof SITE_NAME==='string'&&SITE_NAME)||'EigenReel'; },
  /* the moderators' site-wide page colors ({bg, fg, accent, accent2}, demo/server/routes/page-theme.js), or null; null as static files */
  pageTheme(){ const t=S.who&&S.who.pageTheme; return t&&typeof t==='object'?{...t}:null; },
  setPageTheme(theme){ if(!S.on) return Promise.reject(new Error('Page colors need the demo server.')); return call('PUT','api/page-theme',{theme}).then(r=>{ S.who.pageTheme=r.theme; return r.theme; }); },
  /* your role on the demo server (user, moderator, blog, admin), or null; moderator and above may set the page colors */
  role(){ return S.on&&S.me?S.me.role||'user':null; },
  canModerate(){ return ['moderator','blog','admin'].includes(api.role()); },
  whoami(){ return S.on?{server:true, handle:handle.get(), user:S.me, authMode:S.who.authMode, devLogin:S.who.devLogin||null}:{server:false, handle:handle.get(), ...(S.who&&S.who.signedOut?{signedOut:true}:{})}; },
  /* Sign out / sign back in (the demo's POST /api/sign-out and /api/sign-in): a cookie makes the server ignore this
     browser's Tailscale (or dev) identity. The page reloads either way, so every part of it starts in the new state. */
  signOut(){ return call('POST','api/sign-out').then(()=>location.reload()); },
  signIn(){ return call('POST','api/sign-in').then(()=>location.reload()); },
  on(ev,f){ if(!S.listeners.has(ev)) S.listeners.set(ev,[]); S.listeners.get(ev).push(f); },
  call, _state:S,
};
root.LociAPI=api;
})(typeof globalThis!=='undefined'?globalThis:this);
