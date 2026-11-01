/* ---------- @eigenreel/kit: helpers every piece may import (docs/submission-spec-slop.md, section 5) ----------
   Loaded on the page (the checks read it) and sent as source to each worker, which resolves
   `import { ... } from '@eigenreel/kit'` against exactly these functions and classes.
   The worker joins this source onto one line, so: block comments only, and every statement ends in a semicolon.
   Event helpers (OrbitCamera, PanZoom, Picker) take the events a piece's listeners on env.ui receive (spec, section 6):
   { type, x, y, button, buttons, pointerId, deltaX, deltaY, key, shiftKey, ctrlKey, altKey, metaKey }, x and y in CSS px
   from the box's top-left corner. They work out drag deltas themselves from the last pointer position. There is no
   multi-touch: a trackpad pinch arrives as a wheel event with ctrlKey, and zooms. */
function hex(h){ h=h.replace('#',''); if(h.length===3) h=h.split('').map(c=>c+c).join(''); const n=parseInt(h,16); return [n>>16&255, n>>8&255, n&255]; }
function mix(a,b,t){ return [a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t, a[2]+(b[2]-a[2])*t]; }
function rgba(h,a){ const c=hex(h); return `rgba(${c[0]},${c[1]},${c[2]},${a})`; }
/* label(ctx, env, text, x, y, {size, weight, color, align, alpha, halo}): text in the site font (env.font), in env.colors.fg
   unless color says otherwise, over a halo in env.colors.bg so it stays readable over the drawing. With context 'webgl2',
   pass env.overlay as ctx. An old theme object ({fg, bg, font}) works in place of env. */
function label(ctx,env,str,x,y,o={}){
  const C=(env&&env.colors)||env||{}, font=(env&&env.font)||'sans-serif';
  ctx.save(); ctx.globalAlpha=o.alpha??1; ctx.fillStyle=o.color||C.fg||'#ffffff';
  ctx.font=`${o.weight||400} ${o.size||13}px ${font}`; ctx.textAlign=o.align||'left'; ctx.textBaseline='alphabetic';
  if(o.halo!==false && /^#[0-9a-fA-F]{6}$/.test(C.bg||'')){ /* a readable halo: a 2.5 px stroke in the background color under the text */
    const c=hex(C.bg); ctx.strokeStyle=`rgba(${c[0]},${c[1]},${c[2]},0.7)`; ctx.lineWidth=2.5; ctx.lineJoin='round'; ctx.miterLimit=2;
    ctx.strokeText(str,x,y);
  }
  ctx.fillText(str,x,y); ctx.restore();
}
function clipBox(ctx,B){ ctx.save(); ctx.beginPath(); ctx.rect(B.x,B.y,B.w,B.h); ctx.clip(); }
function fsFor(B){ return Math.round(Math.max(12, Math.min(16, B.w/34))); }
function mulberry32(a){
  return function(){ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; };
}

/* ---------- pointer helpers ----------
   Each takes events with handle(e) and returns true when its state changed (redraw then). The state is plain JSON
   (getState/setState). It is undeclared state, lost on remount: if a view should be shareable, mirror it into declared
   params with env.setParam. */
function KIT_NUM(x,d){ return typeof x==='number'&&Number.isFinite(x)?x:d; }
function KIT_CLAMP(x,a,b){ return Math.min(b,Math.max(a,x)); }
/* the modifier keys, in the spec's names or the old short ones */
function KIT_MODS(e){ return {shift:!!(e.shiftKey||e.shift), ctrl:!!(e.ctrlKey||e.ctrl), alt:!!(e.altKey||e.alt), meta:!!(e.metaKey||e.meta)}; }
/* the pointer's movement since the last event this helper saw (h.last: [x, y] or null) */
function KIT_DELTA(h,e){ const x=KIT_NUM(e.x,0), y=KIT_NUM(e.y,0), l=h.last; h.last=[x,y]; return l?[x-l[0],y-l[1]]:[0,0]; }
/* wheel zoom factor: a pinch (ctrlKey) moves in small steps, so it counts for more */
function KIT_WHEEL(e,sign){ const d=KIT_CLAMP(KIT_NUM(e.deltaY,0),-500,500); return Math.exp(sign*d*(KIT_MODS(e).ctrl?0.01:0.0015)); }

/* OrbitCamera({yaw, pitch, dist, target, minDist, maxDist}): left-drag orbits, right-drag (or shift-drag) pans the
   target in the view plane, wheel and trackpad pinch zoom exponentially, arrow keys orbit (shift+arrows pan), + and - zoom,
   0 resets. The eye sits at target + dist * unit * (cos p sin y, sin p, cos p cos y); set cam.unit to scale dist to
   the scene (default 1) and cam.pxScale to the world size of one CSS px at distance 1 for exact panning. */
class OrbitCamera {
  constructor(o){ o=o||{}; this.home={yaw:KIT_NUM(o.yaw,0), pitch:KIT_NUM(o.pitch,0.3), dist:KIT_NUM(o.dist,5), target:Array.isArray(o.target)?o.target.slice(0,3).map(Number):[0,0,0]};
    this.minDist=KIT_NUM(o.minDist,0.05); this.maxDist=KIT_NUM(o.maxDist,1e4); this.minPitch=KIT_NUM(o.minPitch,-1.5); this.maxPitch=KIT_NUM(o.maxPitch,1.5);
    this.speed=KIT_NUM(o.speed,0.008); this.unit=KIT_NUM(o.unit,1); this.pxScale=KIT_NUM(o.pxScale,0.002); this.drag=null; this.last=null; this.reset(); }
  reset(){ this.yaw=this.home.yaw; this.pitch=this.home.pitch; this.dist=this.home.dist; this.target=this.home.target.slice(); return true; }
  isHome(){ const h=this.home; return Math.abs(this.yaw-h.yaw)<1e-6&&Math.abs(this.pitch-h.pitch)<1e-6&&Math.abs(this.dist-h.dist)<1e-9&&this.target.every((v,i)=>Math.abs(v-h.target[i])<1e-9); }
  zoom(f){ const d=KIT_CLAMP(this.dist*f,this.minDist,this.maxDist); const ch=d!==this.dist; this.dist=d; return ch; }
  orbit(dyaw,dpitch){ this.yaw=this.yaw+dyaw; this.pitch=KIT_CLAMP(this.pitch+dpitch,this.minPitch,this.maxPitch); return true; }
  pan(dx,dy){ const v=this.view(), s=this.dist*this.unit*this.pxScale; for(let i=0;i<3;i++) this.target[i]+=(-dx*v.right[i]+dy*v.up[i])*s; return true; }
  handle(e){
    if(!e||!e.type) return false;
    const t=e.type, m=KIT_MODS(e);
    if(t==='pointerdown'){ this.drag=(e.button===2||e.button===1||m.shift)?'pan':'orbit'; this.last=[KIT_NUM(e.x,0),KIT_NUM(e.y,0)]; return false; }
    if(t==='pointerup'||t==='pointercancel'||t==='release'){ this.drag=null; this.last=null; return false; }
    if(t==='pointermove'){
      const d=KIT_DELTA(this,e);
      if(!this.drag||e.buttons===0) return false;
      if(this.drag==='pan') return this.pan(d[0],d[1]);
      return this.orbit(-d[0]*this.speed,d[1]*this.speed);
    }
    if(t==='wheel') return this.zoom(KIT_WHEEL(e,1));
    if(t==='keydown'){
      const k=e.key, st=0.08;
      if(m.shift&&(k==='ArrowLeft'||k==='ArrowRight'||k==='ArrowUp'||k==='ArrowDown')) return this.pan(k==='ArrowLeft'?-40:k==='ArrowRight'?40:0,k==='ArrowUp'?-40:k==='ArrowDown'?40:0);
      if(k==='ArrowLeft') return this.orbit(st,0); if(k==='ArrowRight') return this.orbit(-st,0);
      if(k==='ArrowUp') return this.orbit(0,st); if(k==='ArrowDown') return this.orbit(0,-st);
      if(k==='+'||k==='=') return this.zoom(0.85); if(k==='-'||k==='_') return this.zoom(1/0.85);
      if(k==='0') return this.reset();
    }
    return false;
  }
  /* rot: the 3x3 world-to-camera rotation, rows right, up and back (the camera looks along -back); eye: its position.
     A point p is at rot * (p - eye) in camera space: x right, y up, z toward the viewer (negative in front). */
  view(){
    const cy=Math.cos(this.yaw), sy=Math.sin(this.yaw), cp=Math.cos(this.pitch), sp=Math.sin(this.pitch);
    const back=[cp*sy,sp,cp*cy], right=[cy,0,-sy];
    const up=[back[1]*right[2]-back[2]*right[1], back[2]*right[0]-back[0]*right[2], back[0]*right[1]-back[1]*right[0]];
    const r=this.dist*this.unit, eye=[this.target[0]+back[0]*r, this.target[1]+back[1]*r, this.target[2]+back[2]*r];
    return {rot:[right,up,back], right, up, back, eye, target:this.target.slice(), dist:this.dist};
  }
  /* point a three.js camera (anything with position.set, up.set and lookAt) along this view */
  applyTo(cam){ const v=this.view(); cam.up.set(0,1,0); cam.position.set(v.eye[0],v.eye[1],v.eye[2]); cam.lookAt(v.target[0],v.target[1],v.target[2]); return cam; }
  getState(){ return {yaw:this.yaw, pitch:this.pitch, dist:this.dist, target:this.target.slice()}; }
  setState(s){ if(!s||typeof s!=='object') return this.reset();
    this.yaw=KIT_NUM(s.yaw,this.home.yaw); this.pitch=KIT_CLAMP(KIT_NUM(s.pitch,this.home.pitch),this.minPitch,this.maxPitch);
    this.dist=KIT_CLAMP(KIT_NUM(s.dist,this.home.dist),this.minDist,this.maxDist);
    this.target=Array.isArray(s.target)&&s.target.length===3?s.target.map((v,i)=>KIT_NUM(v,this.home.target[i])):this.home.target.slice(); return true; }
}

/* PanZoom({center:[x, y], scale, minScale, maxScale}) for 2D views: scale is CSS px per world unit, y points up.
   Drag pans, wheel and trackpad pinch zoom about the pointer, arrow keys pan, + and - zoom, 0 resets. Call
   setBox({x:0, y:0, w:env.box.w, h:env.box.h}) every frame so toWorld/toScreen know where the middle of the box is
   (draw's origin and event coordinates are both the box's top-left corner). */
class PanZoom {
  constructor(o){ o=o||{}; this.home={center:Array.isArray(o.center)?[KIT_NUM(+o.center[0],0),KIT_NUM(+o.center[1],0)]:[0,0], scale:KIT_NUM(o.scale,100)};
    this.minScale=KIT_NUM(o.minScale,1e-9); this.maxScale=KIT_NUM(o.maxScale,1e12); this.box={x:0,y:0,w:0,h:0}; this.down=false; this.last=null; this.reset(); }
  reset(){ this.center=this.home.center.slice(); this.scale=this.home.scale; return true; }
  isHome(){ return this.center[0]===this.home.center[0]&&this.center[1]===this.home.center[1]&&this.scale===this.home.scale; }
  setBox(b){ if(b) this.box={x:b.x,y:b.y,w:b.w,h:b.h}; return this; }
  toWorld(px,py){ const b=this.box; return [this.center[0]+(px-b.x-b.w/2)/this.scale, this.center[1]-(py-b.y-b.h/2)/this.scale]; }
  toScreen(wx,wy){ const b=this.box; return [b.x+b.w/2+(wx-this.center[0])*this.scale, b.y+b.h/2-(wy-this.center[1])*this.scale]; }
  panBy(dx,dy){ this.center=[this.center[0]-dx/this.scale, this.center[1]+dy/this.scale]; return dx!==0||dy!==0; }
  zoomAt(px,py,f){ const w=this.toWorld(px,py), s=KIT_CLAMP(this.scale*f,this.minScale,this.maxScale); if(s===this.scale) return false;
    this.scale=s; const b=this.box; this.center=[w[0]-(px-b.x-b.w/2)/s, w[1]+(py-b.y-b.h/2)/s]; return true; }
  handle(e){
    if(!e||!e.type) return false;
    const t=e.type, b=this.box, cx=b.x+b.w/2, cy=b.y+b.h/2;
    if(t==='pointerdown'){ this.down=true; this.last=[KIT_NUM(e.x,0),KIT_NUM(e.y,0)]; return false; }
    if(t==='pointerup'||t==='pointercancel'||t==='release'){ this.down=false; this.last=null; return false; }
    if(t==='pointermove'){
      const d=KIT_DELTA(this,e);
      if(!this.down||e.buttons===0) return false;
      return this.panBy(d[0],d[1]);
    }
    if(t==='wheel') return this.zoomAt(KIT_NUM(e.x,cx),KIT_NUM(e.y,cy),KIT_WHEEL(e,-1));
    if(t==='dblclick') return this.zoomAt(KIT_NUM(e.x,cx),KIT_NUM(e.y,cy),KIT_MODS(e).shift?0.5:2);
    if(t==='keydown'){
      const k=e.key;
      if(k==='ArrowLeft') return this.panBy(40,0); if(k==='ArrowRight') return this.panBy(-40,0);
      if(k==='ArrowUp') return this.panBy(0,40); if(k==='ArrowDown') return this.panBy(0,-40);
      if(k==='+'||k==='=') return this.zoomAt(cx,cy,1.25); if(k==='-'||k==='_') return this.zoomAt(cx,cy,0.8);
      if(k==='0') return this.reset();
    }
    return false;
  }
  getState(){ return {center:this.center.slice(), scale:this.scale}; }
  setState(s){ if(!s||typeof s!=='object') return this.reset();
    this.center=Array.isArray(s.center)&&s.center.length===2?[KIT_NUM(s.center[0],this.home.center[0]),KIT_NUM(s.center[1],this.home.center[1])]:this.home.center.slice();
    this.scale=KIT_CLAMP(KIT_NUM(s.scale,this.home.scale),this.minScale,this.maxScale); return true; }
}

/* Picker(): hit targets registered every frame, in CSS px. add(id, x, y, r) adds a disc; addHit(id, fn) a hit
   function fn(x, y) returning a distance in px (or null for a miss) and an optional radius. pick(x, y) is the nearest
   id within its radius, or null. For draggable points: begin(e) grabs the target under a pointerdown, move(e, toWorld)
   returns where the grabbed point goes (toWorld maps CSS px to world, identity if omitted), end() lets go.
   handle(e, toWorld) does all three and returns {type: 'begin' | 'move' | 'end', id, pos} or null. */
class Picker {
  constructor(){ this.items=[]; this.active=null; this.hover=null; this.off=[0,0]; }
  clear(){ this.items.length=0; return this; }
  add(id,x,y,r){ this.items.push({id,x,y,r:KIT_NUM(r,12)}); return this; }
  addHit(id,fn,r){ this.items.push({id,fn,r:KIT_NUM(r,8)}); return this; }
  find(id){ return this.items.find(it=>it.id===id)||null; }
  pick(x,y){ let best=null, bd=Infinity;
    for(const it of this.items){ let d; if(it.fn){ const v=it.fn(x,y); d=v===true?0:typeof v==='number'?v:Infinity; } else d=Math.hypot(x-it.x,y-it.y);
      if(d<=it.r && d<bd){ bd=d; best=it.id; } }
    return best; }
  begin(e){ const id=this.pick(e.x,e.y); if(id==null) return null; const it=this.find(id); this.active=id; this.off=it&&!it.fn?[it.x-e.x,it.y-e.y]:[0,0]; return id; }
  move(e,toWorld){ if(this.active==null){ this.hover=this.pick(e.x,e.y); return null; } const px=e.x+this.off[0], py=e.y+this.off[1]; return toWorld?toWorld(px,py):[px,py]; }
  end(){ const id=this.active; this.active=null; return id; }
  handle(e,toWorld){
    if(!e||!e.type) return null;
    if(e.type==='pointerdown'){ const id=this.begin(e); return id==null?null:{type:'begin', id, pos:toWorld?toWorld(e.x+this.off[0],e.y+this.off[1]):[e.x,e.y]}; }
    if(e.type==='pointermove'){ const was=this.active, pos=this.move(e,toWorld); return was==null?null:{type:'move', id:was, pos}; }
    if(e.type==='pointerup'||e.type==='pointercancel'||e.type==='release'){ if(e.type==='release') this.hover=null; const id=this.end(); return id==null?null:{type:'end', id, pos:null}; }
    return null;
  }
  cursor(){ return this.active!=null?'grabbing':this.hover!=null?'grab':null; }
  getState(){ return {active:this.active, hover:this.hover}; }
  setState(s){ this.active=s&&s.active!=null?s.active:null; this.hover=s&&s.hover!=null?s.hover:null; return true; }
}

const EIGENREEL_KIT=[hex, mix, rgba, label, clipBox, fsFor, mulberry32, OrbitCamera, PanZoom, Picker];
/* used by the classes above and sent along with them, but not importable */
const EIGENREEL_KIT_PRIVATE=[KIT_NUM, KIT_CLAMP, KIT_MODS, KIT_DELTA, KIT_WHEEL];
