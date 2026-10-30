/* ---------- visualization-specific helpers ---------- */
function himmelblau(x,y){ return (x*x+y-11)**2 + (x+y*y-7)**2; }
function himmelGrad(x,y){ const A=x*x+y-11, C=x+y*y-7; return [4*x*A+2*C, 2*A+4*y*C]; }
function himmelField(n,P){
  n=Math.max(60, Math.min(640, n));
  const cv=document.createElement('canvas'); cv.width=cv.height=n;
  const c=cv.getContext('2d'), img=c.createImageData(n,n), d=img.data;
  const vals=new Float32Array(n*n), bands=new Int16Array(n*n), L=Math.log(891);
  for(let j=0;j<n;j++) for(let i=0;i<n;i++){
    const x=-5+10*(i+.5)/n, y=5-10*(j+.5)/n, v=Math.min(1, Math.log(1+himmelblau(x,y))/L);
    vals[j*n+i]=v; bands[j*n+i]=Math.floor(v*18);
  }
  const bg=hex(P.bg), lo=hex(P.a2), fg=hex(P.fg);
  for(let j=0;j<n;j++) for(let i=0;i<n;i++){
    const k=j*n+i, v=vals[k], b=bands[k];
    let col=mix(bg, lo, 0.6*Math.pow(1-v,1.6));
    if((i<n-1 && bands[k+1]!==b) || (j<n-1 && bands[k+n]!==b)) col=mix(col, fg, 0.32);
    d[k*4]=col[0]; d[k*4+1]=col[1]; d[k*4+2]=col[2]; d[k*4+3]=255;
  }
  c.putImageData(img,0,0); return cv;
}

function logisticField(w,h,P){
  const cv=document.createElement('canvas'); cv.width=w; cv.height=h;
  const c=cv.getContext('2d'), img=c.createImageData(w,h), d=img.data, cnt=new Uint16Array(w*h);
  for(let i=0;i<w;i++){
    const r=2.5+1.5*i/(w-1); let x=0.5;
    for(let k=0;k<300;k++) x=r*x*(1-x);
    for(let k=0;k<400;k++){ x=r*x*(1-x); cnt[Math.min(h-1,Math.floor((1-x)*h))*w+i]++; }
  }
  const bg=hex(P.bg), c1=hex(P.a2), c2=hex(P.a1);
  for(let i=0;i<w;i++){
    const hue=mix(c1,c2,i/(w-1));
    for(let j=0;j<h;j++){
      const k=j*w+i, v=Math.min(1,Math.pow(cnt[k]/14,0.45)), col=mix(bg,hue,v);
      d[k*4]=col[0]; d[k*4+1]=col[1]; d[k*4+2]=col[2]; d[k*4+3]=255;
    }
  }
  c.putImageData(img,0,0); return cv;
}
function dpDeriv(y,o){
  const d=y[0]-y[1], den=3-Math.cos(2*d), s=Math.sin(d), c=Math.cos(d), g=9.81;
  o[0]=y[2]; o[1]=y[3];
  o[2]=(-3*g*Math.sin(y[0]) - g*Math.sin(y[0]-2*y[1]) - 2*s*(y[3]*y[3]+y[2]*y[2]*c))/den;
  o[3]=(2*s*(2*y[2]*y[2]+2*g*Math.cos(y[0])+y[3]*y[3]*c))/den;
}
function dpStep(y,dt,K){
  const k1=K[0],k2=K[1],k3=K[2],k4=K[3],u=K[4];
  dpDeriv(y,k1);
  for(let i=0;i<4;i++) u[i]=y[i]+dt/2*k1[i];
  dpDeriv(u,k2);
  for(let i=0;i<4;i++) u[i]=y[i]+dt/2*k2[i];
  dpDeriv(u,k3);
  for(let i=0;i<4;i++) u[i]=y[i]+dt*k3[i];
  dpDeriv(u,k4);
  for(let i=0;i<4;i++) y[i]+=dt/6*(k1[i]+2*k2[i]+2*k3[i]+k4[i]);
}
function lorenzStep(s,dt,rho){
  const sg=10, be=8/3, h=dt/2, x=s[0], y=s[1], z=s[2];
  const ax=sg*(y-x), ay=x*(rho-z)-y, az=x*y-be*z;
  let X=x+h*ax, Y=y+h*ay, Z=z+h*az;
  const bx=sg*(Y-X), by=X*(rho-Z)-Y, bz=X*Y-be*Z;
  X=x+h*bx; Y=y+h*by; Z=z+h*bz;
  const cx=sg*(Y-X), cy=X*(rho-Z)-Y, cz=X*Y-be*Z;
  X=x+dt*cx; Y=y+dt*cy; Z=z+dt*cz;
  const ex=sg*(Y-X), ey=X*(rho-Z)-Y, ez=X*Y-be*Z;
  s[0]=x+dt/6*(ax+2*bx+2*cx+ex); s[1]=y+dt/6*(ay+2*by+2*cy+ey); s[2]=z+dt/6*(az+2*bz+2*cz+ez);
}
/* ---------- the catalog ---------- */
/* reviewers: on Feed-lane pieces, the two people who checked the mathematics (docs/review-pipeline.md section 4), named in the
   Explanation tab's footer and on their profiles under "Reviews". Sample data for the prototype: no review has run. New-lane pieces have none. */
const VIZ = [
{
  id:'times-table', title:'Multiplication tables on a circle',
  hook:'Connect i to k·i mod n and a cardioid appears. Keep going and it grows cusps.',
  author:'@circle-mod-n', license:'MIT', repo:'github.com/loci-viz/times-table', reviewed:'Oct 2026', reviewers:['@kmoreau.geom','@epicycle.lab'], likes:12400, t0:0,
  tags:['Number theory','Modular arithmetic','Geometry','Teaching'],
  alt:"A circle with evenly spaced points joined by straight chords. As the multiplier slowly grows, the chords form a glowing heart-shaped curve, then a two-lobed one, then curves with more and more cusps.",
  manifest:{ api:1, id:'times-table', title:'Multiplication tables on a circle', runtime:'js', render:'canvas2d',
    params:[{key:'n', type:'range', label:'Points on the circle', min:20, max:400, step:1, default:200, fmt:v=>String(v)}],
    presets:[
      {label:'n = 101, wait for k = 51', params:{n:101}, t:271, note:'51 · 2 ≡ 1 (mod 101), so multiplying by 51 undoes multiplying by 2 and the cardioid\'s chords come back.'},
      {label:'n = 30, chords not a curve', params:{n:30}, note:'With few points the envelope dissolves into a visible chord diagram. Where does it stop looking like a curve?'}
    ], motion:'pause' },
  md:`## Multiplication tables on a circle

Place *n* points evenly around a circle and label them 0, 1, …, *n* − 1. For a multiplier *k*, draw a chord from every point *i* to the point *k·i* mod *n*.

### What you're seeing
The multiplier *k* sweeps slowly upward from 2. At **k = 2** the chords envelope a **cardioid**; at **k = 3**, a **nephroid**. For integer *k*, as *n* → ∞ the envelope is an **epicycloid with k − 1 cusps**: the path of a point on a circle of radius *r* rolling around a fixed circle of radius (*k* − 1)*r*.

### Why it works
The chord joins the points at angles *θ* and *kθ*. The envelope of the family of lines through $e^{i\\theta}$ and $e^{ik\\theta}$ is the epicycloid traced by

$$z(\\theta) = \\frac{k\\,e^{i\\theta} + e^{ik\\theta}}{k + 1}.$$

### Try this
- Set *n* = 101 and wait for *k* = 51. Since 51 · 2 ≡ 1 (mod 101), multiplying by 51 inverts multiplying by 2: you get the cardioid's chords again.
- Lower *n* to 30 and the envelope dissolves into a visible chord diagram. Where does the picture stop looking like a curve?

### In the classroom
One picture covers modular arithmetic, the units of ℤ/*n*ℤ, and envelopes of line families. The construction was popularized by Mathologer's video.

**Reference.** Mathologer (B. Polster), *Times Tables, Mandelbrot and the Heart of Mathematics*, video, 2015.`,
  draw(ctx,w,h,t,P,S,B){
    ctx.fillStyle=P.bg; ctx.fillRect(0,0,w,h);
    const n=P.param, k=2+(t*0.18)%60, fs=fsFor(B);
    const cx=B.x+B.w/2, cy=B.y+B.h/2+(P.labels?fs:0), R=Math.min(B.w,B.h-(P.labels?fs*2:0))*0.46;
    const pt=a=>[cx+R*Math.cos(a-Math.PI/2), cy+R*Math.sin(a-Math.PI/2)];
    ctx.strokeStyle=rgba(P.fg,0.35); ctx.lineWidth=1;
    ctx.beginPath(); ctx.arc(cx,cy,R,0,Math.PI*2); ctx.stroke();
    const c1=hex(P.a1), c2=hex(P.a2), batches=10;
    ctx.lineWidth=Math.max(0.4, P.lw*0.55);
    for(let b=0;b<batches;b++){
      const c=mix(c1,c2,Math.abs(b-(batches-1)/2)/((batches-1)/2));
      ctx.strokeStyle=`rgba(${c.map(Math.round).join()},0.62)`; ctx.beginPath();
      for(let i=Math.floor(b*n/batches); i<Math.floor((b+1)*n/batches); i++){
        const p1=pt(2*Math.PI*i/n), p2=pt(2*Math.PI*((k*i)%n)/n);
        ctx.moveTo(p1[0],p1[1]); ctx.lineTo(p2[0],p2[1]);
      }
      ctx.stroke();
    }
    label(ctx,P,'i ↦ k·i mod n',B.x,B.y+fs,{size:fs+1,weight:700});
    label(ctx,P,`k = ${k.toFixed(2)}    n = ${n}`,B.x,B.y+fs*2.3,{size:fs,alpha:.75});
    const m=Math.round(k);
    if(Math.abs(k-m)<0.07){
      const name = m===2?'cardioid':m===3?'nephroid':`epicycloid, ${m-1} cusps`;
      label(ctx,P,name,B.x+B.w,B.y+fs,{size:fs+1,weight:700,color:P.a1,align:'right'});
    }
  }
},
{
  id:'elliptic-group-law', title:'The group law on an elliptic curve',
  hook:'A line through P and Q meets the cubic once more. Reflect that point and you have P + Q.',
  author:'@kmoreau.geom', license:'GPL-3.0', repo:'github.com/loci-viz/elliptic-group-law', reviewed:'Oct 2026', reviewers:['@circle-mod-n','@fatou.dust'], likes:8930, t0:2.2,
  tags:['Algebraic geometry','Number theory','Elliptic curves','Research','Teaching'],
  alt:"A cubic curve with a line through two points P and Q that crosses it a third time; a dashed vertical line joins that crossing to its mirror image, the sum P + Q, while P slides along the curve. Engaged, either point can be dragged along the curve and the sum follows.",
  manifest:{ api:1, id:'elliptic-group-law', title:'The group law on an elliptic curve', runtime:'js', render:'canvas2d',
    pointer:{ mode:'custom', wheel:false, hint:'Drag P or Q along the curve' },
    params:[{key:'b', type:'range', label:'Coefficient b', min:5, max:200, step:5, default:100, fmt:v=>(v/100).toFixed(2)}],
    presets:[
      {label:'Split the curve: b = 0.30', params:{b:30}, note:'Below 2/(3√3) ≈ 0.385 the real curve has two components. The unbounded one is the identity component, and a subgroup.'},
      {label:'P on the oval', params:{b:30}, view:{P:[-0.95,1], Q:[1,-1]}, note:'With P on the oval and Q on the unbounded branch, P + Q lands back on the oval: the oval is a coset of the identity component.'},
      {label:'Let P slide again', params:{}, view:null, note:'P follows its animation again and Q goes back to its place.'}
    ], motion:'pause' },
  md:`## The chord-and-tangent law

An **elliptic curve** over ℝ is the set of solutions of a Weierstrass equation

$$y^2 = x^3 + ax + b, \\qquad 4a^3 + 27b^2 \\neq 0,$$

together with a point at infinity 𝒪. Here $a = -1$ and you control $b$.

### What you're seeing
Draw the line through **P** and **Q**. By Bézout's theorem a line meets a cubic in three points counted with multiplicity, so it hits the curve once more, at **P∗Q**. Reflect that point across the *x*-axis to get **P + Q**.

With 𝒪 as the identity and reflection as negation, this rule makes the curve an **abelian group**. Commutativity is obvious. Associativity is the hard part; one classical proof uses the Cayley–Bacharach theorem for cubics through eight points.

### The formulas
For $P \\neq \\pm Q$, write $P = (x_P, y_P)$, $Q = (x_Q, y_Q)$ and $P + Q = (x_3, y_3)$. With the slope $\\lambda = (y_Q - y_P)/(x_Q - x_P)$ of the chord,

$$
\\begin{aligned}
x_3 &= \\lambda^2 - x_P - x_Q, \\\\
y_3 &= \\lambda\\,(x_P - x_3) - y_P.
\\end{aligned}
$$

### Try this
- Click the piece, then drag **P** or **Q** along the curve. The pointer's *x* snaps onto the curve, and dragging above or below the axis picks the branch. Esc (or a click outside) hands scrolling back; the points stay where you left them, and a share link keeps them.
- With the piece engaged, the keyboard works too: **P** or **Q** picks a point, ← and → move it (Shift for small steps), ↑ and ↓ pick the branch, 0 puts both back.
- Lower *b* below $2/(3\\sqrt{3}) \\approx 0.385$. The real curve splits into an oval and an unbounded branch. The unbounded branch is the identity component, and it is a subgroup. Drag P onto the oval and watch where P + Q goes.
- Drag P onto Q: the chord becomes the tangent at P and the readout shows 2P.
- Watch what happens as P passes under Q: the line turns vertical, and P + Q runs off to 𝒪.

### Where it leads
Over $\\mathbb{F}_p$ the same formulas give elliptic-curve cryptography. Over ℚ, the Mordell–Weil theorem says *E*(ℚ) is finitely generated, and the Birch and Swinnerton-Dyer conjecture predicts its rank from an *L*-function.

**Reference.** Silverman and Tate, *Rational Points on Elliptic Curves*, chapter 1.`,
  // A module written directly against the module API (pointer input needs events, which the legacy draw() never sees).
  source:`// github.com/loci-viz/elliptic-group-law/src/index.js · GPL-3.0 License
// pointer: "custom". Once the viewer engages the piece, P and Q can be dragged along the curve (Picker from the kit);
// the dragged x snaps onto the curve and the sign of the pointer's y picks the branch. Until P is dragged it slides
// along the curve with t, exactly as before, and holds still while the piece is engaged so it can be grabbed.
// The dragged points are the view, so a share link keeps them.
import { rgba, label, clipBox, fsFor, Picker } from '@loci/kit';

const A = -1;                                   // y² = x³ + A x + b

/* The real roots of x³ − x + b, ascending (one or three). The curve lives where the cubic is ≥ 0:
   [r1, r2] ∪ [r3, ∞) with three roots, [r1, ∞) with one. */
function roots(b) {
  const p = A, q = b, D = -(4 * p * p * p + 27 * q * q);
  if (D > 0) {
    const m = 2 * Math.sqrt(-p / 3), th = Math.acos((3 * q) / (2 * p) * Math.sqrt(-3 / p)) / 3;
    return [0, 1, 2].map(k => m * Math.cos(th - (2 * Math.PI * k) / 3)).sort((u, v) => u - v);
  }
  const s = Math.sqrt(q * q / 4 + p * p * p / 27);
  return [Math.cbrt(-q / 2 + s) + Math.cbrt(-q / 2 - s)];
}
/* the nearest x where the curve exists */
function snapX(x, rs) {
  if (rs.length === 1) return Math.max(x, rs[0]);
  const [r1, r2, r3] = rs;
  if (x < r1) return r1;
  if (x > r2 && x < r3) return x - r2 < r3 - x ? r2 : r3;
  return x;
}
const pointOf = (x, s, b) => [x, s * Math.sqrt(Math.max(0, x * x * x + A * x + b))];
const parsePt = v => Array.isArray(v) && v.length === 2 && Number.isFinite(v[0]) && (v[1] === 1 || v[1] === -1) ? [v[0], v[1]] : null;

export default {
  setup() {
    this.pick = new Picker();
    this.pts = { P: null, Q: null };   // dragged points as [x, sign], or null while a point follows its default
    this.sel = 'P';                     // the point the arrow keys move
    this.hold = null;                   // P's x while engaged and not yet dragged: it stops sliding so it can be grabbed
  },
  getView() {
    const v = {};
    for (const k of ['P', 'Q']) if (this.pts[k]) v[k] = this.pts[k].slice();   // exact: the view must redraw the same frame
    return v.P || v.Q ? v : null;
  },
  setView(v) { this.pts = { P: parsePt(v && v.P), Q: parsePt(v && v.Q) }; },

  draw({ ctx, t, box: B, theme: P, params, events, engaged }) {
    const b = params.b / 100, rhs = x => x * x * x + A * x + b, fs = fsFor(B), rs = roots(b), r0 = rs[rs.length - 1];
    const xm = 0.3, k = Math.min(B.w / 5.8, B.h / 9), ox = B.x + B.w / 2, oy = B.y + B.h / 2;
    const px = x => ox + (x - xm) * k, py = y => oy - y * k;
    const toWorld = (sx, sy) => [xm + (sx - ox) / k, (oy - sy) / k];
    const xl = xm - B.w / 2 / k, xr = xm + B.w / 2 / k, yt = B.h / 2 / k;

    // the default positions: P slides with t on the unbounded branch, Q sits below it
    const slide = tt => r0 + 0.04 + 1.9 * (1 - Math.cos(tt * 0.45)) / 2;
    const def = { P: [slide(t), 1], Q: [r0 + 0.85, -1] };
    const cur = id => this.pts[id] || (id === 'P' && this.hold != null ? [snapX(this.hold, rs), 1] : def[id]);
    const put = (id, x, s) => { this.pts[id] = [snapX(x, rs), s]; };

    // input since the last frame: drags (Picker), and keys for the selected point
    for (const e of events) {
      if (e.type === 'engage') this.hold = slide(e.t); else if (e.type === 'release') this.hold = null;
      const hit = this.pick.handle(e, toWorld);
      if (hit && (hit.type === 'begin' || hit.type === 'move')) { this.sel = hit.id; put(hit.id, hit.pos[0], hit.pos[1] >= 0 ? 1 : -1); }
      if (e.type === 'keydown') {
        const key = e.key.toLowerCase(), c = cur(this.sel), step = e.shift ? 0.01 : 0.05;
        if (key === 'p' || key === 'q') this.sel = key.toUpperCase();
        else if (key === 'arrowleft' || key === 'arrowright') put(this.sel, c[0] + (key === 'arrowleft' ? -step : step), c[1]);
        else if (key === 'arrowup' || key === 'arrowdown') put(this.sel, c[0], key === 'arrowup' ? 1 : -1);
        else if (key === '0' || key === 'backspace') this.pts = { P: null, Q: null };
      }
    }
    for (const id of ['P', 'Q']) if (this.pts[id]) this.pts[id][0] = snapX(this.pts[id][0], rs); // b may have changed

    const d = ctx.getTransform().a;
    ctx.fillStyle = P.bg; ctx.fillRect(0, 0, ctx.canvas.width / d, ctx.canvas.height / d);
    clipBox(ctx, B);
    ctx.strokeStyle = rgba(P.fg, 0.1); ctx.lineWidth = 1; ctx.beginPath();
    for (let g = Math.ceil(xl); g <= xr; g++) { ctx.moveTo(px(g), B.y); ctx.lineTo(px(g), B.y + B.h); }
    for (let g = Math.ceil(-yt); g <= yt; g++) { ctx.moveTo(B.x, py(g)); ctx.lineTo(B.x + B.w, py(g)); }
    ctx.stroke();
    ctx.strokeStyle = rgba(P.fg, 0.38); ctx.beginPath();
    ctx.moveTo(B.x, py(0)); ctx.lineTo(B.x + B.w, py(0)); ctx.moveTo(px(0), B.y); ctx.lineTo(px(0), B.y + B.h); ctx.stroke();
    const root = (lo, hi) => { for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; if ((rhs(lo) < 0) === (rhs(mid) < 0)) lo = mid; else hi = mid; } return (lo + hi) / 2; };
    const segs = []; let run = null; const dx = (xr - xl) / 900;
    for (let x = xl; x <= xr + dx; x += dx) {
      const v = rhs(x);
      if (v >= 0) { if (!run) { run = []; if (x > xl) run.push([root(x - dx, x), 0]); segs.push(run); } run.push([x, Math.sqrt(v)]); }
      else if (run) { run.push([root(x - dx, x), 0]); run = null; }
    }
    ctx.strokeStyle = P.fg; ctx.lineWidth = P.lw * 1.6; ctx.lineJoin = 'round';
    for (const s of segs) for (const sg of [1, -1]) {
      ctx.beginPath(); s.forEach(([x, y], i) => i ? ctx.lineTo(px(x), py(sg * y)) : ctx.moveTo(px(x), py(sg * y))); ctx.stroke();
    }

    const [xP, yP] = pointOf(...cur('P'), b), [xQ, yQ] = pointOf(...cur('Q'), b);
    const dot = (x, y, r, fill, stroke) => { ctx.beginPath(); ctx.arc(px(x), py(y), r, 0, Math.PI * 2); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke(); } };
    // the chord through P and Q, or the tangent at P when they coincide
    let m = null, sumTxt = 'P + Q = 𝒪';
    if (Math.abs(xP - xQ) > 1e-4) m = (yQ - yP) / (xQ - xP);
    else if (Math.abs(yP - yQ) < 1e-6 && Math.abs(yP) > 1e-6) m = (3 * xP * xP + A) / (2 * yP);
    if (m !== null) {
      const x3 = m * m - xP - xQ, y3 = yP + m * (x3 - xP);
      ctx.strokeStyle = rgba(P.fg, 0.55); ctx.lineWidth = P.lw; ctx.beginPath();
      ctx.moveTo(px(xl), py(yP + m * (xl - xP))); ctx.lineTo(px(xr), py(yP + m * (xr - xP))); ctx.stroke();
      ctx.setLineDash([5, 5]); ctx.strokeStyle = P.a2; ctx.lineWidth = P.lw * 1.2;
      ctx.beginPath(); ctx.moveTo(px(x3), py(y3)); ctx.lineTo(px(x3), py(-y3)); ctx.stroke(); ctx.setLineDash([]);
      dot(x3, y3, 5, P.bg, P.fg); dot(x3, -y3, 7, P.a2);
      label(ctx, P, 'P∗Q', px(x3) + 10, py(y3) + (y3 > 0 ? -8 : 16), { size: fs, weight: 700 });
      label(ctx, P, 'P + Q', px(x3) + 12, py(-y3) + (y3 > 0 ? 18 : -10), { size: fs + 1, weight: 700, color: P.a2 });
      sumTxt = Math.abs(m) > 9 ? 'P + Q → 𝒪, the point at infinity' : \`\${Math.abs(xP - xQ) > 1e-4 ? 'P + Q' : '2P'} = (\${x3.toFixed(2)}, \${(-y3).toFixed(2)})\`;
    }
    // P and Q, with a ring on the one under the pointer (or being dragged), and on the keyboard's point while engaged
    const ring = this.pick.active || this.pick.hover || (engaged ? this.sel : null);
    for (const [id, x, y] of [['P', xP, yP], ['Q', xQ, yQ]]) {
      if (ring === id) dot(x, y, 11, null, rgba(P.a1, 0.55));
      dot(x, y, 6, P.a1);
    }
    label(ctx, P, 'P', px(xP) - 6, py(yP) - 12, { size: fs + 1, weight: 700, color: P.a1, align: 'right' });
    label(ctx, P, 'Q', px(xQ) + 10, py(yQ) + 18, { size: fs + 1, weight: 700, color: P.a1 });
    ctx.restore();
    // hit targets for the next frame's events, in CSS px
    this.pick.clear().add('P', px(xP), py(yP), 16).add('Q', px(xQ), py(yQ), 16);

    const disc = 27 * b * b - 4;
    label(ctx, P, \`y² = x³ − x + \${b.toFixed(2)}\`, B.x, B.y + fs, { size: fs + 1, weight: 700 });
    label(ctx, P, \`Δ = \${(-16 * disc).toFixed(1)}  ·  \${disc > 0 ? 'one real component' : disc < 0 ? 'two real components' : 'singular'}\`, B.x, B.y + fs * 2.3, { size: fs, alpha: 0.75 });
    label(ctx, P, sumTxt, B.x, B.y + B.h - 6, { size: fs, color: P.a2, weight: 700 });
    return { cursor: this.pick.cursor() || 'default' };
  },
};
`
},
{
  id:'himmelblau-descent', title:'Four valleys of Himmelblau',
  hook:'Twelve gradient-descent walkers with momentum race toward the four minima of a nonconvex function.',
  author:'@sofia.opt', license:'MIT', repo:'github.com/loci-viz/himmelblau-descent', reviewed:'Oct 2026', reviewers:['@calc-commons','@levien.tan'], likes:6120, t0:4,
  tags:['Optimization','Gradient descent','Multivariable calculus','Teaching'],
  helpers:[himmelblau, himmelGrad, himmelField],
  alt:"A contour map of a landscape with four dark valleys. Twelve dots start on a ring around the middle and roll downhill, leaving trails that curve and settle into the four valleys.",
  manifest:{ api:1, id:'himmelblau-descent', title:'Four valleys of Himmelblau', runtime:'js', render:'canvas2d',
    params:[{key:'eta', type:'range', label:'Step size η', min:1, max:12, step:1, default:4, fmt:v=>(v/1000).toFixed(3)}],
    presets:[
      {label:'Overshoot: η = 0.010', params:{eta:10}, note:'Momentum turns into overshoot: walkers ricochet between valleys before settling, or never settle.'},
      {label:'Steepest descent: η = 0.001', params:{eta:1}, note:'Paths hug the curves of steepest descent, which cross every contour at a right angle.'}
    ], motion:'pause' },
  md:`## Gradient descent on Himmelblau's function

*f(x, y) = (x² + y − 11)² + (x + y² − 7)²*

Himmelblau's function has four local minima, all with *f* = 0, at roughly (3, 2), (−2.805, 3.131), (−3.779, −3.283) and (3.584, −1.848). It also has one local maximum near (−0.271, −0.923) and four saddle points.

### What you're seeing
Twelve walkers start on a circle of radius 4.6 and follow heavy-ball (momentum) descent:

    v ← β·v − η·∇f(p)
    p ← p + v

with *β* = 0.85. Contours are drawn at evenly spaced levels of log(1 + *f*), so the shading is darkest in the four valleys. The run restarts every ten seconds from a slightly rotated circle.

Which valley a walker ends in depends on where it starts. For plain gradient flow, the basin boundaries are the stable manifolds of the saddle points; momentum lets a walker coast across them.

### Try this
- Raise *η* to 0.010 or more. Momentum turns into overshoot, and walkers ricochet between valleys before settling, or never settle.
- Lower *η* to 0.001. Paths hug the curves of steepest descent, which cross every contour at a right angle.

### In the classroom
A concrete picture of ∇*f* being orthogonal to level sets, and of why "the minimum" is the wrong phrase for a nonconvex function.`,
  draw(ctx,w,h,t,P,S,B){
    ctx.fillStyle=P.bg; ctx.fillRect(0,0,w,h);
    const fs=fsFor(B), top=P.labels?fs*1.6:0;
    const s=Math.min(B.w, B.h-top*2), ox=B.x+(B.w-s)/2, oy=B.y+top+(B.h-top*2-s)/2;
    const X=x=>ox+(x+5)/10*s, Y=y=>oy+(5-y)/10*s;
    const key=[Math.round(s),P.bg,P.fg,P.a2].join();
    if(S.key!==key){ S.key=key; S.field=himmelField(Math.round(s),P); }
    ctx.imageSmoothingEnabled=true; ctx.drawImage(S.field,ox,oy,s,s);
    ctx.strokeStyle=rgba(P.fg,0.3); ctx.lineWidth=1; ctx.strokeRect(ox+.5,oy+.5,s-1,s-1);
    const lr=P.param/1000, cycle=Math.floor(t/10), local=t-cycle*10;
    if(S.cycle!==cycle || S.lr!==lr){
      S.cycle=cycle; S.lr=lr; S.steps=0;
      S.walkers=Array.from({length:12},(_,i)=>{ const a=2*Math.PI*i/12+cycle*0.37; const x=4.6*Math.cos(a), y=4.6*Math.sin(a); return {x,y,vx:0,vy:0,trail:[[x,y]]}; });
    }
    const target=Math.min(360, Math.floor(local*45));
    while(S.steps<target){
      for(const p of S.walkers){
        const g=himmelGrad(p.x,p.y), gn=Math.hypot(g[0],g[1]); if(gn>60){ g[0]*=60/gn; g[1]*=60/gn; }
        p.vx=0.85*p.vx-lr*g[0]; p.vy=0.85*p.vy-lr*g[1];
        p.x=Math.max(-6,Math.min(6,p.x+p.vx)); p.y=Math.max(-6,Math.min(6,p.y+p.vy));
        p.trail.push([p.x,p.y]);
      }
      S.steps++;
    }
    clipBox(ctx,{x:ox,y:oy,w:s,h:s});
    ctx.lineJoin='round'; ctx.lineCap='round';
    for(const p of S.walkers){
      ctx.strokeStyle=rgba(P.a1,0.9); ctx.lineWidth=P.lw*1.3; ctx.beginPath();
      p.trail.forEach(([x,y],i)=> i? ctx.lineTo(X(x),Y(y)) : ctx.moveTo(X(x),Y(y))); ctx.stroke();
    }
    for(const p of S.walkers){ ctx.beginPath(); ctx.arc(X(p.x),Y(p.y),3+P.lw,0,Math.PI*2); ctx.fillStyle=P.fg; ctx.fill(); ctx.strokeStyle=P.a1; ctx.lineWidth=2; ctx.stroke(); }
    ctx.strokeStyle=P.fg; ctx.lineWidth=1.5;
    for(const [mx,my] of [[3,2],[-2.805,3.131],[-3.779,-3.283],[3.584,-1.848]]){
      ctx.beginPath(); ctx.moveTo(X(mx)-5,Y(my)); ctx.lineTo(X(mx)+5,Y(my)); ctx.moveTo(X(mx),Y(my)-5); ctx.lineTo(X(mx),Y(my)+5); ctx.stroke();
    }
    ctx.restore();
    label(ctx,P,'f(x, y) = (x² + y − 11)² + (x + y² − 7)²',ox,oy-fs*0.6,{size:fs,weight:700});
    label(ctx,P,`η = ${lr.toFixed(3)}  ·  β = 0.85  ·  step ${S.steps}`,ox,oy+s+fs*1.3,{size:fs,alpha:.75});
  }
},
{
  id:'julia-circle', title:'Julia sets on a circle of parameters',
  hook:'As c circles the origin, the Julia set of z² + c shatters into dust and reassembles.',
  author:'@fatou.dust', license:'BSD-3-Clause', repo:'github.com/loci-viz/julia-circle', reviewed:'Sep 2026', reviewers:['@may.iterates','@escape.time'], likes:10300, t0:6,
  tags:['Complex dynamics','Fractals','Research'],
  alt:"A detailed fractal shape in warm and cool colors with a two-fold symmetry. As a point moves around a circle, the shape tears apart into scattered dust and then joins back into one connected piece.",
  manifest:{ api:1, id:'julia-circle', title:'Julia sets on a circle of parameters', runtime:'js', render:'canvas2d',
    params:[{key:'iter', type:'range', label:'Iteration limit', min:20, max:200, step:10, default:70, fmt:v=>String(v)}],
    presets:[], motion:'pause',
    after:['logistic-bifurcation'] }, // the real slice of z² + c is conjugate to the logistic map: Julia sets are its complex picture
  md:`## Julia sets of z² + c

For a complex parameter *c*, iterate *f_c(z) = z² + c*. The **filled Julia set** *K_c* is the set of starting points whose orbit stays bounded. Its boundary *J_c* is the **Julia set**, where the dynamics is chaotic.

### What you're seeing
The parameter travels around the circle |*c*| = 0.7885. Each pixel is colored by a smoothed escape time

    μ = n + 1 − log₂ log |zₙ|

and points that never escape within the iteration limit are left in the interior tint.

### Connected, or dust
Fatou and Julia showed that *J_c* is connected exactly when the critical orbit 0, *c*, *c*² + *c*, … stays bounded, which is the definition of *c* lying in the **Mandelbrot set** *M*. Otherwise *J_c* is a Cantor set. This circle crosses the boundary of *M* several times, so you see the set break apart and reconnect. The label in the corner tells you which side you're on.

### Try this
- Raise the iteration limit to resolve thin filaments when *c* is near the boundary of *M*.
- Notice the 180° symmetry. Since *f_c(−z) = f_c(z)*, the set satisfies *K_c* = −*K_c*.

### Research connections
Whether *M* is locally connected (the MLC conjecture) is still open. Douady and Hubbard showed that MLC would imply that hyperbolic parameters are dense in the quadratic family.`,
  draw(ctx,w,h,t,P,S,B){
    ctx.fillStyle=P.bg; ctx.fillRect(0,0,w,h);
    const cols=Math.max(90, Math.min(260, Math.round(B.w/2.6))), rows=Math.max(60, Math.round(cols*B.h/B.w));
    if(!S.cv || S.cv.width!==cols || S.cv.height!==rows){
      S.cv=document.createElement('canvas'); S.cv.width=cols; S.cv.height=rows; S.c=S.cv.getContext('2d'); S.img=S.c.createImageData(cols,rows);
    }
    const lk=[P.bg,P.fg,P.a1,P.a2].join();
    if(S.lk!==lk){
      S.lk=lk; S.lut=new Uint8ClampedArray(256*3);
      const st=[[0,hex(P.bg)],[.32,hex(P.a2)],[.68,hex(P.a1)],[1,hex(P.fg)]];
      for(let i=0;i<256;i++){ const v=i/255; let j=0; while(j<st.length-2 && v>st[j+1][0]) j++;
        const c=mix(st[j][1],st[j+1][1],(v-st[j][0])/(st[j+1][0]-st[j][0])); S.lut[i*3]=c[0]; S.lut[i*3+1]=c[1]; S.lut[i*3+2]=c[2]; }
      S.inner=mix(hex(P.bg),hex(P.fg),0.09);
    }
    const th=0.6+t*0.12, cr=0.7885*Math.cos(th), ci=0.7885*Math.sin(th);
    const maxIt=P.param, sc=3.1/Math.min(cols,rows), d=S.img.data, lut=S.lut, inn=S.inner;
    let p=0;
    for(let j=0;j<rows;j++){
      const y0=(j-rows/2)*sc;
      for(let i=0;i<cols;i++){
        let x=(i-cols/2)*sc, y=y0, x2=x*x, y2=y*y, n=0;
        while(n<maxIt && x2+y2<16){ y=2*x*y+ci; x=x2-y2+cr; x2=x*x; y2=y*y; n++; }
        if(n>=maxIt){ d[p]=inn[0]; d[p+1]=inn[1]; d[p+2]=inn[2]; }
        else { const mu=n+1-Math.log(Math.log(Math.sqrt(x2+y2)))/Math.LN2; const v=Math.min(1,Math.max(0,Math.sqrt(Math.max(0,mu)/maxIt)*1.15)); const li=(v*255|0)*3; d[p]=lut[li]; d[p+1]=lut[li+1]; d[p+2]=lut[li+2]; }
        d[p+3]=255; p+=4;
      }
    }
    S.c.putImageData(S.img,0,0); ctx.imageSmoothingEnabled=true; ctx.drawImage(S.cv,B.x,B.y,B.w,B.h);
    let zr=0, zi=0, n=0; while(n<maxIt && zr*zr+zi*zi<4){ const tmp=zr*zr-zi*zi+cr; zi=2*zr*zi+ci; zr=tmp; n++; }
    const fs=fsFor(B);
    label(ctx,P,'z ↦ z² + c',B.x,B.y+fs,{size:fs+1,weight:700});
    label(ctx,P,`c = ${cr.toFixed(3)} ${ci<0?'−':'+'} ${Math.abs(ci).toFixed(3)}i`,B.x,B.y+fs*2.3,{size:fs,alpha:.8});
    label(ctx,P, n>=maxIt?'c ∈ M  ·  J_c connected':'c ∉ M  ·  J_c is a Cantor set',B.x,B.y+B.h-6,{size:fs,weight:700,color:n>=maxIt?P.a2:P.a1});
  }
},
{
  id:'fourier-square', title:'A square wave from spinning circles',
  hook:'Each epicycle is one odd harmonic. Add more and watch the Gibbs overshoot refuse to shrink.',
  author:'@epicycle.lab', license:'MIT', repo:'github.com/loci-viz/fourier-square', reviewed:'Oct 2026', reviewers:['@calc-commons','@levien.tan'], likes:7740, t0:1,
  tags:['Harmonic analysis','Fourier series','Teaching'],
  alt:"On the left, a chain of rotating circles, each smaller and faster than the last. On the right, the height of the chain's tip is traced as a wave that approximates a square wave, with ripples that squeeze toward the jumps as more circles are added.",
  manifest:{ api:1, id:'fourier-square', title:'A square wave from spinning circles', runtime:'js', render:'canvas2d',
    params:[{key:'N', type:'range', label:'Number of terms N', min:1, max:40, step:1, default:6, fmt:v=>String(v)}],
    presets:[
      {label:'N = 1, a pure sine', params:{N:1}, note:'One circle gives a pure sine.'},
      {label:'N = 40, Gibbs overshoot', params:{N:40}, note:'The ripples squeeze toward the jump while their peak stays at about 1.179.'}
    ], motion:'pause' },
  md:`## Building a square wave from circles

The square wave *sq(θ) = sign(sin θ)* has the Fourier series

    sq(θ) = (4/π) Σ sin((2k − 1)θ) / (2k − 1),   k = 1, 2, 3, …

Each term is a rotating vector, an **epicycle**, of radius 4/((2*k* − 1)π) spinning at frequency 2*k* − 1. Chain [*N*](#param:N) of them tip to tail. The height of the last tip, plotted against time, is the partial sum *S_N(θ)*, drawn to the right. The dashed line is the square wave itself. The newest point of the trace is its left end, joined to the tip by the dotted line, at θ = 1.1 *t*, so a jump of *sq* enters the trace whenever θ passes a multiple of π: [pause at t = 3.1 s](#t:3.1), just after θ passes π, and the jump sits just inside the left end of the trace.

### Gibbs phenomenon
The partial sums converge to *sq* in *L²* and at every point (to 0 at the jumps), but not uniformly. Near each jump, *S_N* overshoots to about 1.179, roughly 9% of the jump height. As *N* grows the overshoot moves closer to the jump, but its height never shrinks. Compare the same moment at [six terms](#state:eyJwIjp7Ik4iOjZ9LCJ0IjozLjF9) and at [forty terms](#state:eyJwIjp7Ik4iOjQwfSwidCI6My4xfQ): the first ripple beside the jump is narrower at forty and just as tall.

### Try this
- [Set *N* = 1](#preset:n-1). One circle gives a pure sine.
- [Set *N* = 40](#preset:n-40) and watch the ripples squeeze toward the jump while their peak stays put.

### In the classroom
Orthogonal decomposition, the difference between *L²* and uniform convergence, and why sharp corners need high frequencies, all from one animation.`,
  draw(ctx,w,h,t,P,S,B){
    ctx.fillStyle=P.bg; ctx.fillRect(0,0,w,h);
    const N=P.param, fs=fsFor(B), R=Math.min(B.h*0.2, B.w*0.15), cx=B.x+R*1.45, cy=B.y+B.h/2, om=t*1.1;
    const wx0=cx+R*1.65, wx1=B.x+B.w, dth=0.022;
    const S_N=th=>{ let s=0; for(let k=1;k<=N;k++){ const n=2*k-1; s+=4/(n*Math.PI)*Math.sin(n*th); } return s; };
    ctx.setLineDash([4,5]); ctx.strokeStyle=rgba(P.fg,0.35); ctx.lineWidth=1; ctx.beginPath();
    for(let x=wx0,i=0; x<=wx1; x+=2,i++){ const y=cy-R*Math.sign(Math.sin(om-i*dth)); i? ctx.lineTo(x,y) : ctx.moveTo(x,y); }
    ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle=rgba(P.fg,0.18); ctx.beginPath(); ctx.moveTo(wx0,cy); ctx.lineTo(wx1,cy); ctx.stroke();
    let x=cx, y=cy;
    for(let k=1;k<=N;k++){
      const n=2*k-1, r=R*4/(n*Math.PI), nx=x+r*Math.cos(n*om), ny=y-r*Math.sin(n*om);
      ctx.strokeStyle=rgba(P.fg,0.22); ctx.lineWidth=1; ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.stroke();
      ctx.strokeStyle=rgba(P.fg,0.85); ctx.lineWidth=Math.max(1,P.lw*0.9); ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(nx,ny); ctx.stroke();
      x=nx; y=ny;
    }
    ctx.setLineDash([3,4]); ctx.strokeStyle=rgba(P.a1,0.7); ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(wx0,y); ctx.stroke(); ctx.setLineDash([]);
    ctx.beginPath(); ctx.arc(x,y,3.5,0,Math.PI*2); ctx.fillStyle=P.a1; ctx.fill();
    ctx.strokeStyle=P.a1; ctx.lineWidth=P.lw*1.5; ctx.lineJoin='round'; ctx.beginPath();
    for(let xx=wx0,i=0; xx<=wx1; xx+=2,i++){ const yy=cy-R*S_N(om-i*dth); i? ctx.lineTo(xx,yy) : ctx.moveTo(xx,yy); }
    ctx.stroke();
    label(ctx,P,'S_N(θ) = (4/π) Σ sin((2k−1)θ) / (2k−1)',B.x,B.y+fs,{size:fs+1,weight:700});
    label(ctx,P,`N = ${N} term${N>1?'s':''}`,B.x,B.y+fs*2.3,{size:fs,alpha:.75});
    if(N>=8) label(ctx,P,'Gibbs overshoot ≈ 1.179, about 9% of the jump',B.x,B.y+B.h-6,{size:fs,weight:700,color:P.a2});
  }
},
{
  id:'riemann-sums', title:'Riemann sums and their errors',
  hook:'Rectangles refine from 2 to 64. The inset shows left sums converge like 1/n and midpoints like 1/n².',
  author:'@calc-commons', license:'Apache-2.0', repo:'github.com/loci-viz/riemann-sums', reviewed:'Oct 2026', reviewers:['@epicycle.lab','@sofia.opt'], likes:5210, t0:0,
  tags:['Calculus','Integration','Numerical analysis','Teaching'],
  alt:"A wavy curve with bars under it that are refined from a few wide rectangles to many thin ones, filling the area under the curve more and more tightly. Numbers show the running error, and a small log-log graph shows the error shrinking.",
  manifest:{ api:1, id:'riemann-sums', title:'Riemann sums and their errors', runtime:'js', render:'canvas2d',
    params:[{key:'rule', type:'range', label:'Sample point', min:0, max:2, step:1, default:0, fmt:v=>['left','midpoint','right'][v]}],
    presets:[
      {label:'Left rule', params:{rule:0}, note:'Error O(1/n): the inset line has slope −1.'},
      {label:'Right rule', params:{rule:2}, note:'The error has the opposite sign to the left rule. Their average is the trapezoid rule.'},
      {label:'Midpoint rule', params:{rule:1}, note:'Error O(1/n²): compare the inset\'s slope with the left rule\'s.'}
    ], cycle:18.2, motion:'pause',
    bounty:'riemann-order' }, // answers a sample challenge on the Wanted page (bounties.js)
  md:`## Riemann sums and their errors

Take *f(x) = 1.2 + sin(1.5x) + x/4* on [0, 5]. Split the interval into *n* pieces of width Δ*x* = 5/*n*, pick a sample point *x*ᵢ* in each, and add up *f(x*ᵢ*)Δx*. The exact value is

*∫₀⁵ f(x) dx = 6 + (1 − cos 7.5)/1.5 + 25/8 ≈ 9.5606*.

### What you're seeing
The number of rectangles cycles through 2, 3, 4, …, 64. The readout shows the sum, the exact integral, and the signed error. The inset in the corner plots |error| against *n* on log–log axes, so a power law shows up as a straight line.

### Rate of convergence
- **Left and right rules** have error about ∓(*f(b) − f(a)*)Δ*x*/2, which is *O*(1/*n*). The inset line has slope −1.
- **Midpoint rule** has error about (*f′(b) − f′(a)*)Δ*x*²/24, which is *O*(1/*n*²). The slope is −2.

### Try this
- Switch between left and right. The errors have opposite signs, and their average is the trapezoid rule.
- Switch to midpoint and compare the inset's slope with the left rule's.

### In the classroom
Students see the definition of the integral and a first lesson in numerical analysis on the same screen: the limit exists, and how fast you get there depends on where you sample.`,
  draw(ctx,w,h,t,P,S,B){
    ctx.fillStyle=P.bg; ctx.fillRect(0,0,w,h);
    const f=x=>1.2+Math.sin(1.5*x)+x/4, a=0, b=5, exact=6+(1-Math.cos(7.5))/1.5+25/8;
    const NS=[2,3,4,5,6,8,10,12,16,20,24,32,48,64], n=NS[Math.floor(t/1.3)%NS.length], rule=P.param, fs=fsFor(B);
    const sumFor=m=>{ const dx=(b-a)/m; let s=0; for(let i=0;i<m;i++) s+=f(a+i*dx+dx*rule/2)*dx; return s; };
    const L=B.x+30, Rr=B.x+B.w-6, T=B.y+(P.labels?fs*6:8), Bt=B.y+B.h-20;
    const X=x=>L+(x-a)/(b-a)*(Rr-L), Y=y=>Bt-(y/3.8)*(Bt-T);
    ctx.strokeStyle=rgba(P.fg,0.12); ctx.lineWidth=1; ctx.beginPath();
    for(let gy=1;gy<=3;gy++){ ctx.moveTo(L,Y(gy)); ctx.lineTo(Rr,Y(gy)); } ctx.stroke();
    const dx=(b-a)/n; let sum=0;
    for(let i=0;i<n;i++){
      const x0=a+i*dx, xs=x0+dx*rule/2, fy=f(xs); sum+=fy*dx;
      ctx.fillStyle=rgba(P.a2,0.26); ctx.fillRect(X(x0),Y(fy),X(x0+dx)-X(x0),Bt-Y(fy));
      ctx.strokeStyle=rgba(P.a2,0.9); ctx.lineWidth=1; ctx.strokeRect(X(x0),Y(fy),X(x0+dx)-X(x0),Bt-Y(fy));
    }
    ctx.strokeStyle=P.fg; ctx.lineWidth=P.lw*1.4; ctx.beginPath();
    for(let i=0;i<=200;i++){ const x=a+(b-a)*i/200; i? ctx.lineTo(X(x),Y(f(x))) : ctx.moveTo(X(x),Y(f(x))); } ctx.stroke();
    if(n<=32) for(let i=0;i<n;i++){ const xs=a+i*dx+dx*rule/2; ctx.beginPath(); ctx.arc(X(xs),Y(f(xs)),2.6,0,Math.PI*2); ctx.fillStyle=P.a1; ctx.fill(); }
    ctx.strokeStyle=rgba(P.fg,0.6); ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(L,T); ctx.lineTo(L,Bt); ctx.lineTo(Rr,Bt); ctx.stroke();
    for(let gx=0;gx<=5;gx++) label(ctx,P,String(gx),X(gx),Bt+fs+2,{size:fs-2,align:'center',alpha:.7});
    for(let gy=0;gy<=3;gy++) label(ctx,P,String(gy),L-8,Y(gy)+4,{size:fs-2,align:'right',alpha:.7});
    const rn=['left','midpoint','right'][rule];
    label(ctx,P,`n = ${n}  ·  ${rn} rule`,B.x,B.y+fs,{size:fs+1,weight:700});
    label(ctx,P,`Σ f(xᵢ*) Δx = ${sum.toFixed(4)}`,B.x,B.y+fs*2.4,{size:fs});
    label(ctx,P,`∫₀⁵ f(x) dx = ${exact.toFixed(4)}`,B.x,B.y+fs*3.7,{size:fs,alpha:.8});
    label(ctx,P,`error = ${(sum-exact>=0?'+':'−')}${Math.abs(sum-exact).toFixed(4)}`,B.x,B.y+fs*5,{size:fs,weight:700,color:P.a1});
    if(P.labels && B.w>=420){
      const iw=150, ih=fs*4.6, ix=B.x+B.w-iw, iy=B.y;
      const errs=NS.map(m=>Math.max(1e-7,Math.abs(sumFor(m)-exact)));
      const lmin=Math.log10(Math.min(...errs)), lmax=Math.log10(Math.max(...errs)), nx=m=>ix+8+(Math.log(m)-Math.log(2))/(Math.log(64)-Math.log(2))*(iw-16), ny=e=>iy+ih-8-(Math.log10(e)-lmin)/Math.max(.5,lmax-lmin)*(ih-fs-14);
      ctx.strokeStyle=rgba(P.fg,0.3); ctx.strokeRect(ix+.5,iy+.5,iw-1,ih-1);
      label(ctx,P,'|error| vs n, log–log',ix+8,iy+fs,{size:fs-3,alpha:.8});
      ctx.strokeStyle=rgba(P.fg,0.5); ctx.beginPath(); NS.forEach((m,i)=> i? ctx.lineTo(nx(m),ny(errs[i])) : ctx.moveTo(nx(m),ny(errs[i]))); ctx.stroke();
      NS.forEach((m,i)=>{ ctx.beginPath(); ctx.arc(nx(m),ny(errs[i]),m===n?4:2,0,Math.PI*2); ctx.fillStyle=m===n?P.a1:rgba(P.fg,0.7); ctx.fill(); });
    }
  }
},
{
  id:'logistic-bifurcation', title:'The road to chaos in the logistic map',
  hook:'One parabola, one knob. Turn r up and a steady state splits into 2, 4, 8 cycles, then chaos, then a window of order.',
  author:'@may.iterates', license:'MIT', repo:'github.com/loci-viz/logistic-bifurcation', reviewed:'Oct 2026', reviewers:['@fatou.dust','@ed.lorenz.fan'], likes:9460, t0:4,
  tags:['Dynamics','Chaos','Teaching','Research'],
  helpers:[logisticField],
  alt:'Top: a bifurcation diagram, a branching tree of dots that splits from one curve into two, four, then a dense cloud, with a vertical marker at the chosen r. Bottom: a parabola and a diagonal line with a staircase path that bounces between them.',
  manifest:{ api:1, id:'logistic-bifurcation', title:'The road to chaos in the logistic map', runtime:'js', render:'canvas2d',
    params:[{key:'r', type:'range', label:'Growth rate r', min:250, max:400, step:1, default:383, fmt:v=>(v/100).toFixed(2)}],
    presets:[
      {label:'r = 3.20, a 2-cycle', params:{r:320}, note:'The cobweb settles onto a rectangle: a 2-cycle.'},
      {label:'r = 4.00, coin flips', params:{r:400}, note:'With x = sin²(πθ) the map becomes θ ↦ 2θ mod 1, as random-looking as coin flips.'},
      {label:'r = 3.82, intermittency', params:{r:382}, note:'Just left of 3.8284 the orbit idles near a 3-cycle, then bursts away.'},
      // 1 + √6 ≈ 3.449 < 3.50 < 3.544 (the next doubling), so r = 3.50 is squarely a stable 4-cycle
      {label:'r = 3.50, a 4-cycle', params:{r:350}, foundBy:'@kmoreau.geom', note:'Past 1 + √6 ≈ 3.449 the 2-cycle doubles: the cobweb visits four corners before it repeats.'}
    ], cycle:16, motion:'pause' },
  md:`## The logistic map

*x*ₙ₊₁ = *r x*ₙ(1 − *x*ₙ),  with 0 ≤ *x* ≤ 1 and 0 ≤ *r* ≤ 4.

Robert May used this one-line model of a population with limited resources to show that very simple rules can behave unpredictably.

### What you're seeing
**Top.** For each *r* from 2.5 to 4, start at *x* = 0.5, discard 300 iterates, and plot the next 400. Brighter pixels are visited more often. The vertical line marks the [*r*](#param:r) you chose.

**Bottom.** A cobweb diagram. From the point (*x*, *x*) on the diagonal go vertically to the parabola, which gives *f(x)*, then horizontally back to the diagonal. Each corner on the diagonal is one iterate, four of them per second. The path restarts from *x*₀ = 0.2 every 16 seconds; [pause at t = 2 s](#t:2) to see only the first eight.

### Period doubling
For 1 < *r* < 3 the fixed point x⋆ = 1 − 1/*r* attracts, because |*f′*(x⋆)| = |2 − *r*| < 1. At *r* = 3 the slope reaches −1 and a 2-cycle takes over; further splits happen at *r* = 1 + √6 ≈ 3.4495, 3.5441, 3.5644, … and pile up at *r*∞ ≈ 3.5699. The gaps between splits shrink by the Feigenbaum constant δ ≈ 4.6692, and the same δ appears in every smooth one-hump map.

### Why it works
1. For *r* < 3 the fixed point x⋆ = 1 − 1/*r* attracts: *f′*(x⋆) = 2 − *r*, and |2 − *r*| < 1, so each iterate shrinks the distance to x⋆ by about that factor. The slope is negative, so the cobweb spirals in, landing on alternate sides of x⋆. [See it at r = 2.8, after 60 iterates](#state:eyJwIjp7InIiOjI4MH0sInQiOjE1fQ).
2. At *r* = 3 the slope is exactly −1 and the linear term no longer contracts. The orbit still converges, but only through the higher-order terms, so slowly that after 60 iterates the spiral is still open. [See it at r = 3](#state:eyJwIjp7InIiOjMwMH0sInQiOjE1fQ).
3. Past 3, x⋆ repels. Look at *f*∘*f* instead: its slope at x⋆ is *f′*(x⋆)², which passes 1, and two new fixed points of *f*∘*f* split off on either side, a pair *p*, *q* with *f(p)* = *q* and *f(q)* = *p*. That pair is the 2-cycle the cobweb settles onto: [r = 3.2](#preset:r-3-20).
4. The 2-cycle attracts while |*f′(p) f′(q)*| < 1, the slope of *f*∘*f* at *p*. The product reaches −1 at *r* = 1 + √6 ≈ 3.4495, and the argument of step 3, applied to *f*∘*f*, gives a 4-cycle: [see it at r = 3.5](#state:eyJwIjp7InIiOjM1MH0sInQiOjE1fQ).
5. The same step repeats for each composite, which is why the splits come one after another. Why their gaps shrink by the same δ in every one-hump map is the deep part (Feigenbaum's renormalization, proved by Lanford in 1982), and nothing in this picture shows it.

### Order inside chaos
Past *r*∞ the picture is mostly chaotic, but not entirely. At *r* = 1 + √8 ≈ 3.8284 a stable 3-cycle appears. By the Li–Yorke theorem and Sharkovskii's ordering, a period-3 orbit forces orbits of every other period.

### Try this
- [Set *r* = 3.2](#preset:r-3-20). The cobweb settles onto a rectangle: a 2-cycle.
- [Set *r* = 4](#preset:r-4). With *x* = sin²(π*θ*) the map becomes *θ* ↦ 2*θ* mod 1, so the dynamics is as random-looking as coin flips.
- [Sit just left of 3.8284](#preset:r-3-82) and watch the orbit idle near a 3-cycle, then burst away. That is intermittency.

**Reference.** R. May, *Simple mathematical models with very complicated dynamics*, Nature 261 (1976). S. Strogatz, *Nonlinear Dynamics and Chaos*, chapter 10. O. Lanford, *A computer-assisted proof of the Feigenbaum conjectures*, Bull. AMS 6 (1982).`,
  draw(ctx,w,h,t,P,S,B){
    ctx.fillStyle=P.bg; ctx.fillRect(0,0,w,h);
    const r=P.param/100, fs=fsFor(B), top=P.labels?fs*2.8:4, foot=P.labels?fs*1.8:0;
    const avail=B.h-top-foot, hb=Math.max(40,Math.round(avail*0.44)), bw=Math.max(60,Math.round(B.w)), bx=B.x, by=B.y+top;
    const key=[bw,hb,P.bg,P.a1,P.a2].join();
    if(S.key!==key){ S.key=key; S.field=logisticField(bw,hb,P); }
    ctx.imageSmoothingEnabled=true; ctx.drawImage(S.field,bx,by,B.w,hb);
    ctx.strokeStyle=rgba(P.fg,0.3); ctx.lineWidth=1; ctx.strokeRect(bx+.5,by+.5,B.w-1,hb-1);
    const RX=q=>bx+(q-2.5)/1.5*B.w;
    ctx.strokeStyle=rgba(P.fg,0.2); ctx.beginPath();
    for(const q of [3,3.5699,3.8284]){ ctx.moveTo(RX(q),by+hb); ctx.lineTo(RX(q),by+hb-6); }
    ctx.stroke();
    ctx.strokeStyle=P.fg; ctx.lineWidth=Math.max(1,P.lw*0.8); ctx.beginPath(); ctx.moveTo(RX(r),by); ctx.lineTo(RX(r),by+hb); ctx.stroke();
    label(ctx,P,'chaos begins',RX(3.5699)-4,by+fs,{size:fs-3,alpha:.7,align:'right'});
    label(ctx,P,'period 3',RX(3.8284)+5,by+hb-9,{size:fs-3,alpha:.7,align:'left'});
    // cobweb
    const cy0=by+hb+(P.labels?fs*1.2:8), hc=B.y+B.h-foot-cy0, sc=Math.max(30,Math.min(hc,B.w)), cx0=B.x+(B.w-sc)/2;
    const X=x=>cx0+x*sc, Y=y=>cy0+sc-y*sc;
    ctx.strokeStyle=rgba(P.fg,0.3); ctx.lineWidth=1; ctx.strokeRect(cx0+.5,cy0+.5,sc-1,sc-1);
    ctx.beginPath(); ctx.moveTo(X(0),Y(0)); ctx.lineTo(X(1),Y(1)); ctx.stroke();
    ctx.strokeStyle=P.fg; ctx.lineWidth=P.lw*1.3; ctx.beginPath();
    for(let i=0;i<=60;i++){ const x=i/60, y=r*x*(1-x); i? ctx.lineTo(X(x),Y(y)) : ctx.moveTo(X(x),Y(y)); } ctx.stroke();
    const steps=Math.min(60,Math.floor((t%16)*4)); let x=0.2, y;
    ctx.strokeStyle=rgba(P.a1,0.9); ctx.lineWidth=Math.max(1,P.lw*0.9); ctx.lineJoin='round'; ctx.beginPath(); ctx.moveTo(X(x),Y(0));
    for(let i=0;i<steps;i++){ y=r*x*(1-x); ctx.lineTo(X(x),Y(y)); ctx.lineTo(X(y),Y(y)); x=y; }
    ctx.stroke();
    ctx.beginPath(); ctx.arc(X(x),Y(steps? x : 0),4,0,Math.PI*2); ctx.fillStyle=P.a1; ctx.fill();
    const reg = r<3?'one stable fixed point' : r<3.4495?'period 2' : r<3.5441?'period 4' : r<3.5699?'period 8, 16, …' : (r>3.8284&&r<3.8415)?'period-3 window' : 'mostly chaotic';
    label(ctx,P,'xₙ₊₁ = r·xₙ(1 − xₙ)',B.x,B.y+fs,{size:fs+1,weight:700});
    label(ctx,P,`r = ${r.toFixed(2)}   iterate ${steps}`,B.x,B.y+fs*2.3,{size:fs,alpha:.75});
    label(ctx,P,reg,B.x,B.y+B.h-6,{size:fs,weight:700,color:P.a2});
  }
},
{
  id:'double-pendulum', title:'Two double pendulums, one thousandth apart',
  hook:'Start two double pendulums 0.001 rad apart. For a few seconds they agree. Then they have nothing to do with each other.',
  author:'@levien.tan', license:'BSD-3-Clause', repo:'github.com/loci-viz/double-pendulum', reviewed:'Oct 2026', reviewers:['@ed.lorenz.fan','@may.iterates'], likes:15800, t0:3,
  tags:['Dynamics','Chaos','Mechanics','Teaching'],
  helpers:[dpDeriv, dpStep],
  alt:'Two double pendulums hang from one pivot, drawn in two colors, one on top of the other. At first they swing together; after a few seconds one swings off differently and the glowing trails behind their tips tangle apart.',
  manifest:{ api:1, id:'double-pendulum', title:'Two double pendulums, one thousandth apart', runtime:'js', render:'canvas2d',
    params:[{key:'th', type:'range', label:'Initial angle θ₁', min:20, max:175, step:5, default:135, fmt:v=>v+'°'}],
    presets:[
      {label:'θ₁ = 20°, small swings', params:{th:20}, note:'Small angles linearize into two normal modes. The motion is quasi-periodic and the copies stay together.'}
    ], cycle:24, motion:'pause' },
  md:`## The double pendulum

Hang a second rod, with its own bob, from the end of a pendulum. With equal masses and lengths and angles θ₁, θ₂ measured from straight down, the Lagrangian gives

    θ₁″ = [−3g sin θ₁ − g sin(θ₁ − 2θ₂) − 2 sin(θ₁ − θ₂)(θ₂′² + θ₁′² cos(θ₁ − θ₂))] / (3 − cos(2θ₁ − 2θ₂))
    θ₂″ = [2 sin(θ₁ − θ₂)(2θ₁′² + 2g cos θ₁ + θ₂′² cos(θ₁ − θ₂))] / (3 − cos(2θ₁ − 2θ₂))

with *g* = 9.81 and rod lengths 1. The state is (θ₁, θ₂, θ₁′, θ₂′), integrated here with fourth-order Runge–Kutta at a step of 0.005 s.

### What you're seeing
Two copies start from rest with the same θ₂ = 0. Their θ₁ differ by 0.001 rad (0.057°). Trails show the last stretch of each lower bob's path. The simulation restarts every 24 seconds.

### Why they separate
The system is conservative, so energy is fixed, but for large angles it is chaotic: nearby trajectories separate roughly like *e*^{λt}, where λ > 0 is the largest Lyapunov exponent. A gap of 10⁻³ becomes order one after about ln(10³)/λ seconds, and then it cannot grow further because both pendulums are confined to the same energy surface. This is why long forecasts fail even when the equations are exactly known.

### Try this
- Set θ₁ = 20°. For small angles the equations linearize into two normal modes with ω² = (*g*/ℓ)(2 ± √2). The motion is quasi-periodic and the two copies stay together.
- Raise θ₁ and note when they start to part ways. More energy means a stronger exponent.
- Watch the readout: the tip separation is the distance between the two lower bobs, in rod lengths.

**Reference.** Levien and Tan, *Double pendulum: An experiment in chaos*, American Journal of Physics 61 (1993).`,
  draw(ctx,w,h,t,P,S,B){
    ctx.fillStyle=P.bg; ctx.fillRect(0,0,w,h);
    const T=24, dt=0.005, NT=360, cyc=Math.floor(t/T), local=t-cyc*T, key=P.param+':'+cyc;
    if(S.key!==key || local<S.sim){
      S.key=key; const a=P.param*Math.PI/180;
      S.A=new Float64Array([a,0,0,0]); S.Bp=new Float64Array([a+0.001,0,0,0]);
      S.K=[0,1,2,3,4].map(()=>new Float64Array(4));
      S.trA=new Float32Array(NT*2); S.trB=new Float32Array(NT*2); S.head=0; S.n=0; S.steps=0;
    }
    const target=Math.floor(local/dt);
    while(S.steps<target){
      dpStep(S.A,dt,S.K); dpStep(S.Bp,dt,S.K); S.steps++;
      if(S.steps%3===0){
        const hd=S.head*2, A=S.A, Bq=S.Bp;
        S.trA[hd]=Math.sin(A[0])+Math.sin(A[1]); S.trA[hd+1]=Math.cos(A[0])+Math.cos(A[1]);
        S.trB[hd]=Math.sin(Bq[0])+Math.sin(Bq[1]); S.trB[hd+1]=Math.cos(Bq[0])+Math.cos(Bq[1]);
        S.head=(S.head+1)%NT; if(S.n<NT) S.n++;
      }
    }
    S.sim=local;
    const fs=fsFor(B), top=P.labels?fs*3:4, foot=P.labels?fs*1.8:4, avail=B.h-top-foot;
    const k=Math.min(B.w,avail)/4*0.96, ox=B.x+B.w/2, oy=B.y+top+avail/2;
    clipBox(ctx,B);
    const drawTrail=(tr,col)=>{
      const n=S.n; if(n<2) return; const start=(S.head-n+NT)%NT, chunks=4, per=Math.ceil(n/chunks);
      ctx.lineWidth=Math.max(1,P.lw); ctx.lineJoin='round';
      for(let c=0;c<chunks;c++){
        const i0=c*per, i1=Math.min(n-1,(c+1)*per); if(i1<=i0) break;
        ctx.strokeStyle=rgba(col,0.12+0.22*c); ctx.beginPath();
        for(let i=i0;i<=i1;i++){ const j=(start+i)%NT, x=ox+tr[2*j]*k, y=oy+tr[2*j+1]*k; i===i0? ctx.moveTo(x,y) : ctx.lineTo(x,y); }
        ctx.stroke();
      }
    };
    drawTrail(S.trB,P.a2); drawTrail(S.trA,P.a1);
    const rod=(y,col,wd)=>{
      const x1=ox+Math.sin(y[0])*k, y1=oy+Math.cos(y[0])*k, x2=x1+Math.sin(y[1])*k, y2=y1+Math.cos(y[1])*k;
      ctx.strokeStyle=col; ctx.lineWidth=wd; ctx.lineCap='round'; ctx.beginPath(); ctx.moveTo(ox,oy); ctx.lineTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
      ctx.fillStyle=col; ctx.beginPath(); ctx.arc(x1,y1,3+P.lw,0,Math.PI*2); ctx.arc(x2,y2,4+P.lw,0,Math.PI*2); ctx.fill();
      return [x2,y2];
    };
    const q2=rod(S.Bp,rgba(P.a2,0.85),Math.max(1.5,P.lw)), q1=rod(S.A,P.a1,Math.max(1.5,P.lw));
    ctx.fillStyle=P.fg; ctx.beginPath(); ctx.arc(ox,oy,4,0,Math.PI*2); ctx.fill();
    ctx.restore();
    const sep=Math.hypot(q1[0]-q2[0],q1[1]-q2[1])/k;
    label(ctx,P,'Two double pendulums, θ₁ differs by 0.001 rad',B.x,B.y+fs,{size:fs,weight:700});
    label(ctx,P,`θ₁(0) = ${P.param}°   t = ${local.toFixed(1)} s`,B.x,B.y+fs*2.3,{size:fs,alpha:.75});
    label(ctx,P,`tip separation ${sep.toFixed(3)} rod lengths`,B.x,B.y+B.h-6,{size:fs,weight:700,color:sep>0.2?P.a1:P.a2});
  }
},
{
  id:'lorenz-butterfly', title:'The Lorenz butterfly, two runs at once',
  hook:'Two points that start 0.001 apart ride the same three equations and end up on opposite wings of the attractor.',
  author:'@ed.lorenz.fan', license:'Apache-2.0', repo:'github.com/loci-viz/lorenz-butterfly', reviewed:'Oct 2026', reviewers:['@levien.tan','@may.iterates'], likes:11200, t0:5,
  tags:['Dynamics','Chaos','Research','Teaching'],
  helpers:[lorenzStep],
  alt:'A slowly rotating butterfly-shaped curve made of looping lines in two colors, drawn from two nearly identical starting points. The two trails loop together at first, then drift apart and switch between the two wings at different times.',
  manifest:{ api:1, id:'lorenz-butterfly', title:'The Lorenz butterfly, two runs at once', runtime:'js', render:'canvas2d',
    params:[{key:'rho', type:'range', label:'Rayleigh number ρ', min:5, max:50, step:1, default:28, fmt:v=>String(v)}],
    presets:[
      {label:'ρ = 10, a fixed point', params:{rho:10}, note:'Both runs spiral into the same fixed point. Nothing is chaotic below about 13.9.'},
      {label:'ρ = 28, the butterfly', params:{rho:28}, note:'Wait for the two colors to separate onto different wings.'},
      {label:'ρ = 20, transient chaos', params:{rho:20}, note:'Trajectories wander chaotically for a long time before settling onto a fixed point.'}
    ], motion:'pause' },
  md:`## The Lorenz system

$$
\\begin{aligned}
\\dot{x} &= \\sigma\\,(y - x) \\\\
\\dot{y} &= x\\,(\\rho - z) - y \\\\
\\dot{z} &= xy - \\beta z
\\end{aligned}
$$

with $\\sigma = 10$, $\\beta = 8/3$, and $\\rho$ yours to choose. Edward Lorenz derived it in 1963 by truncating a model of convecting fluid to three modes, hoping for a toy weather model. He found something better.

### What you're seeing
Two solutions start at (1, 1, 1) and (1.001, 1, 1) and are integrated with fourth-order Runge–Kutta. The view is the orthographic projection onto the vertical axis *z* and a horizontal axis in the (*x*, *y*) plane, rotating slowly so the two wings and the loops around them show depth. The run restarts every 40 seconds.

### The mathematics
- **Dissipative.** The divergence of the vector field is $-(\\sigma + 1 + \\beta) \\approx -13.67$, so volumes in phase space shrink like $e^{-13.67\\,t}$. The attractor has zero volume; its fractal dimension is about 2.06.
- **Fixed points.** The origin, plus $C_\\pm = \\bigl(\\pm\\sqrt{\\beta(\\rho - 1)},\\ \\pm\\sqrt{\\beta(\\rho - 1)},\\ \\rho - 1\\bigr)$ once $\\rho > 1$. For $\\sigma = 10$, $\\beta = 8/3$ the pair $C_\\pm$ loses stability at $\\rho = \\sigma(\\sigma + \\beta + 3)/(\\sigma - \\beta - 1) \\approx 24.74$.
- **Sensitive dependence.** At $\\rho = 28$ the largest Lyapunov exponent is about 0.906, so a gap of $10^{-3}$ grows to order one in roughly 7 time units. That is the butterfly effect: the wing a trajectory visits next is unpredictable, while the attractor itself is perfectly stable.

### Try this
- Set $\\rho = 10$. Both runs spiral into the same fixed point and the picture settles. Nothing is chaotic below about 13.9.
- Set $\\rho = 28$ and wait for the two colors to separate.
- Try $\\rho = 20$. Trajectories wander chaotically for a long time before settling onto a fixed point.

**Reference.** E. Lorenz, *Deterministic nonperiodic flow*, Journal of the Atmospheric Sciences 20 (1963).`,
  draw(ctx,w,h,t,P,S,B){
    ctx.fillStyle=P.bg; ctx.fillRect(0,0,w,h);
    const T=40, dt=0.005, NT=900, rho=P.param, cyc=Math.floor(t/T), local=t-cyc*T, key=rho+':'+cyc;
    if(S.key!==key || local<S.sim){
      S.key=key; S.A=new Float64Array([1,1,1]); S.Bq=new Float64Array([1.001,1,1]);
      S.trA=new Float32Array(NT*3); S.trB=new Float32Array(NT*3); S.head=0; S.n=0; S.steps=0;
    }
    const target=Math.floor(local*250);
    while(S.steps<target){
      lorenzStep(S.A,dt,rho); lorenzStep(S.Bq,dt,rho); S.steps++;
      if(S.steps%2===0){
        const hd=S.head*3; for(let i=0;i<3;i++){ S.trA[hd+i]=S.A[i]; S.trB[hd+i]=S.Bq[i]; }
        S.head=(S.head+1)%NT; if(S.n<NT) S.n++;
      }
    }
    S.sim=local;
    const fs=fsFor(B), top=P.labels?fs*3:4, foot=P.labels?fs*1.8:4, avail=B.h-top-foot;
    const H=2.7*Math.sqrt(8/3*(rho-1))+2, sc=Math.min(B.w/(2*H), avail/(1.75*rho))*0.97;
    const cx=B.x+B.w/2, cy=B.y+top+avail/2, zc=0.87*rho, ph=t*0.12, ca=Math.cos(ph), sa=Math.sin(ph);
    clipBox(ctx,B);
    const drawTrail=(tr,col)=>{
      const n=S.n; if(n<2) return; const start=(S.head-n+NT)%NT, chunks=5, per=Math.ceil(n/chunks);
      ctx.lineWidth=Math.max(0.8,P.lw*0.8); ctx.lineJoin='round';
      for(let c=0;c<chunks;c++){
        const i0=c*per, i1=Math.min(n-1,(c+1)*per); if(i1<=i0) break;
        ctx.strokeStyle=rgba(col,0.1+0.22*c); ctx.beginPath();
        for(let i=i0;i<=i1;i++){
          const j=((start+i)%NT)*3, x=cx+sc*(tr[j]*ca+tr[j+1]*sa), y=cy-sc*(tr[j+2]-zc);
          i===i0? ctx.moveTo(x,y) : ctx.lineTo(x,y);
        }
        ctx.stroke();
      }
    };
    drawTrail(S.trB,P.a2); drawTrail(S.trA,P.a1);
    const head=(s,col)=>{ ctx.beginPath(); ctx.arc(cx+sc*(s[0]*ca+s[1]*sa),cy-sc*(s[2]-zc),3+P.lw,0,Math.PI*2); ctx.fillStyle=col; ctx.fill(); };
    head(S.Bq,P.a2); head(S.A,P.a1);
    ctx.restore();
    const gap=Math.hypot(S.A[0]-S.Bq[0],S.A[1]-S.Bq[1],S.A[2]-S.Bq[2]);
    label(ctx,P,'Lorenz system, σ = 10, β = 8/3',B.x,B.y+fs,{size:fs+1,weight:700});
    label(ctx,P,`ρ = ${rho}   t = ${(S.steps*dt).toFixed(1)}`,B.x,B.y+fs*2.3,{size:fs,alpha:.75});
    label(ctx,P,`gap between the two runs: ${gap.toFixed(3)}`,B.x,B.y+B.h-6,{size:fs,weight:700,color:gap>1?P.a1:P.a2});
  }
},
{
  id:'galton-board', title:'A Galton board and the bell curve', lane:'new',
  hook:'Each ball bounces left or right at every peg. Pile up enough of them and the histogram becomes a Gaussian.',
  author:'@demoivre.hall', license:'MIT', repo:'github.com/loci-viz/galton-board', reviewed:'Oct 2026', likes:7380, t0:6,
  tags:['Probability','Statistics','Teaching'],
  alt:'A triangle of pegs with small balls bouncing down through it, one after another. At the bottom the balls stack into bins, and the stacks gradually form a symmetric bell shape that matches a smooth curve drawn over them.',
  manifest:{ api:1, id:'galton-board', title:'A Galton board and the bell curve', runtime:'js', render:'canvas2d',
    params:[{key:'rows', type:'range', label:'Rows of pegs', min:4, max:16, step:1, default:12, fmt:v=>String(v)}],
    presets:[
      {label:'16 rows', params:{rows:16}, note:'The tallest bin should hold C(16, 8)/2¹⁶ ≈ 19.6% of the balls, about 47 of 240.'},
      {label:'4 rows, Pascal\'s row', params:{rows:4}, note:'The histogram is 1, 4, 6, 4, 1 and the Gaussian is a poor fit.'}
    ], cycle:20, motion:'pause' },
  md:`## The Galton board

A ball falls through *n* rows of pegs. At each peg it goes right with probability ½ and left with probability ½, independently. After *n* rows it lands in bin *k*, where *k* is the number of rightward bounces.

### What you're seeing
240 balls are released at a steady rate. Their paths come from a seeded random number generator, so every loop is the same. The bars are the bins; the curve is the normal density with the same mean and variance that the bars should approach, scaled to the number of balls that have landed.

### The mathematics
The bin of a ball is a sum of *n* independent Bernoulli(½) variables, so

*P(k) = C(n, k) / 2ⁿ*,  mean *n*/2,  variance *n*/4.

The de Moivre–Laplace theorem says that for large *n*

*P(k) ≈ (1 / √(2πσ²)) exp(−(k − n/2)² / 2σ²)*,  σ² = *n*/4.

This is the first and most concrete case of the central limit theorem: sums of many small independent pieces look Gaussian, whatever the details of a single piece. The width grows like √*n*, not like *n*, which is why a deep board does not spread out as fast as the number of rows suggests.

### Try this
- With 16 rows the tallest bin should hold *C(16, 8)/2¹⁶* ≈ 19.6% of the balls, about 47 of 240. Early on the histogram is ragged. The relative noise in a bin shrinks like 1/√(count).
- Drop to 4 rows. The histogram is the row 1, 4, 6, 4, 1 of Pascal's triangle, and the Gaussian is a poor fit. How many rows before the curve looks right?

**Reference.** W. Feller, *An Introduction to Probability Theory and Its Applications*, vol. 1, chapter VII. F. Galton, *Natural Inheritance* (1889).`,
  draw(ctx,w,h,t,P,S,B){
    ctx.fillStyle=P.bg; ctx.fillRect(0,0,w,h);
    const L=P.param, N=240, GAP=0.06, SPEED=8, T=20, tl=t%T;
    if(S.L!==L){
      S.L=L; const rnd=mulberry32(12345+L), W=L+1;
      S.off=new Int8Array(N*W); S.fin=new Int16Array(N); S.cnt=new Int32Array(W); S.pmf=new Float64Array(W);
      for(let i=0;i<N;i++){ let s=0; for(let k=0;k<L;k++){ s+=rnd()<0.5?1:0; S.off[i*W+k+1]=s; } S.fin[i]=s; }
      let c=1; for(let j=0;j<=L;j++){ S.pmf[j]=c/Math.pow(2,L); c=c*(L-j)/(j+1); }
    }
    const W=L+1, off=S.off, cnt=S.cnt, pmf=S.pmf, fs=fsFor(B), top=P.labels?fs*3:6, foot=P.labels?fs*1.8:4;
    const avail=B.h-top-foot, cx=B.x+B.w/2, sx=Math.min(B.w/(L+2),28), sy=avail*0.5/(L+1), y0=B.y+top;
    const hTop=y0+(L+1)*sy, hBase=B.y+B.h-foot, hH=hBase-hTop, pegR=Math.max(1.5,sx*0.09);
    ctx.fillStyle=rgba(P.fg,0.45); ctx.beginPath();
    for(let r=0;r<L;r++) for(let j=0;j<=r;j++){ const px=cx+(j-r/2)*sx, py=y0+(r+1)*sy; ctx.moveTo(px+pegR,py); ctx.arc(px,py,pegR,0,Math.PI*2); }
    ctx.fill();
    cnt.fill(0); let landed=0; const tLand=(L+1)/SPEED;
    for(let i=0;i<N;i++){ if(tl-i*GAP>=tLand){ cnt[S.fin[i]]++; landed++; } else if(tl-i*GAP<0) break; }
    const unit=hH/(N*pmf[L>>1]*1.12), bwid=sx*0.86;
    ctx.fillStyle=rgba(P.a2,0.75);
    for(let j=0;j<=L;j++){ const bh=Math.min(hH,cnt[j]*unit); ctx.fillRect(cx+(j-L/2)*sx-bwid/2,hBase-bh,bwid,bh); }
    ctx.strokeStyle=rgba(P.fg,0.5); ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(cx-(L/2+1)*sx,hBase+.5); ctx.lineTo(cx+(L/2+1)*sx,hBase+.5); ctx.stroke();
    if(landed>3){
      const sg=Math.sqrt(L)/2, amp=landed/(Math.sqrt(2*Math.PI)*sg);
      ctx.strokeStyle=P.a1; ctx.lineWidth=P.lw*1.3; ctx.beginPath();
      for(let i=0;i<=60;i++){ const u=(i/60-.5)*(L+2), y=hBase-Math.min(hH*1.1,amp*Math.exp(-u*u/(2*sg*sg))*unit); i? ctx.lineTo(cx+u*sx,y) : ctx.moveTo(cx+u*sx,y); }
      ctx.stroke();
    }
    const br=Math.max(2,sx*0.2); ctx.fillStyle=P.fg; ctx.beginPath();
    for(let i=0;i<N;i++){
      const tf=tl-i*GAP; if(tf<0) break; const p=tf*SPEED; if(p>=L+1) continue;
      const q=p-1; let bx=cx;
      if(q>=0){ const k=Math.floor(q), f=q-k, sm=f*f*(3-2*f), a=off[i*W+k]-k/2, b=off[i*W+k+1]-(k+1)/2; bx=cx+(a+(b-a)*sm)*sx; }
      const by=y0+p*sy; ctx.moveTo(bx+br,by); ctx.arc(bx,by,br,0,Math.PI*2);
    }
    ctx.fill();
    label(ctx,P,`Galton board, ${L} rows`,B.x,B.y+fs,{size:fs+1,weight:700});
    label(ctx,P,`${landed} of ${N} balls landed`,B.x,B.y+fs*2.3,{size:fs,alpha:.75});
    label(ctx,P,`Binomial(${L}, ½) ≈ N(${L/2}, ${(L/4).toString()}),  σ = ${(Math.sqrt(L)/2).toFixed(2)} bins`,B.x,B.y+B.h-6,{size:fs-1,weight:700,color:P.a1});
  }
},
{
  id:'wasm-lissajous', title:'Lissajous figures from two oscillators', lane:'new',
  hook:'Two oscillators at right angles, one at frequency 3 and one at b. Count where the curve touches the square and you have read off their ratio.',
  author:'@wasm.curious', license:'MIT', repo:'github.com/loci-viz/wasm-lissajous', reviewed:'Oct 2026', likes:3140, t0:0,
  tags:['Dynamics','Mechanics','Teaching','WebAssembly'],
  alt:'A looping curve inside a square, made of interlocking lobes. A bright point runs along it with a fading tail, while two small dots slide along the bottom and left edges, showing the horizontal and vertical oscillations that combine into the curve.',
  // A WebAssembly piece: the package is examples/wasm-lissajous/ (viz.c, build.sh, loci.json, module.wasm, explanation.md).
  entry:'examples/wasm-lissajous/module.wasm', sourceUrl:'examples/wasm-lissajous/viz.c', mdUrl:'examples/wasm-lissajous/explanation.md', md:'',
  manifest:{"api":1, "id":"wasm-lissajous", "title":"Lissajous figures from two oscillators", "runtime":"wasm", "entry":"module.wasm", "render":"commands", "params":[{"key":"b", "type":"range", "label":"Frequency b (a = 3)", "min":1, "max":6, "step":0.05, "default":2, "format":"0.00"}, {"key":"delta", "type":"range", "label":"Phase δ", "min":0, "max":180, "step":1, "default":90, "format":"0°"}, {"key":"square", "type":"toggle", "label":"Inscribed square", "default":true}], "presets":[{"label":"3 : 2, the classic figure", "params":{"b":2, "delta":90}, "note":"Three lobes across, two up and down: the curve touches the left and right sides three times and the top and bottom twice."}, {"label":"b = a, one oscillator", "params":{"b":3, "delta":90}, "note":"Equal frequencies with a quarter-period phase give a circle: the phase portrait of a single harmonic oscillator."}, {"label":"Collapse to a curve", "params":{"b":1, "delta":0}, "note":"With δ = 0 the curve traces x = sin 3u against y = sin u, a polynomial graph x = 3y − 4y³ traced back and forth."}, {"label":"Nearly 3 : 3", "params":{"b":3.05, "delta":90}, "note":"A slightly detuned ratio: the circle slowly shears through ellipses. The curve only closes after 20 turns."}], "motion":"pause"}
},
{
  id:'mandelbrot-zoom', title:'A zoom into the Mandelbrot set, on the GPU', lane:'new',
  hook:'A hundred thousand times closer to the edge of the Mandelbrot set, every pixel iterated on the GPU, until 32-bit floats run out of digits.',
  author:'@escape.time', license:'MIT', repo:'github.com/loci-viz/mandelbrot-zoom', reviewed:'Oct 2026', likes:2210, t0:4,
  tags:['Complex dynamics','Fractals','GPU'],
  alt:'The black-bodied Mandelbrot set glows at its edge in bands of two colors while the view dives toward a point on the boundary, where spirals and filaments open up, and pulls back out. Engaged, the view can be panned and zoomed by hand.',
  // Two targets sharing one id, explanation, params and presets: desktop is WebGL2 (a fragment shader plus a little
  // JavaScript), mobile is a canvas2d module that iterates on the CPU at half resolution.
  sources:{ desktop:`// github.com/loci-viz/mandelbrot-zoom/src/index.js · MIT License
// render: "webgl2". One full-box triangle; the fragment shader iterates z -> z² + c for every pixel.
// pointer: "pan-zoom". The camera follows a zoom tour, a function of t. Once the viewer drags, scrolls or double-clicks
// (after engaging the piece) the kit's PanZoom takes over and the view stays where they left it, also after they
// release the piece, until the "Resume the tour" preset (or the 0 key) hands it back to the tour.
import { hex, fsFor, PanZoom } from '@loci/kit';

const VERT = \`#version 300 es
in vec2 p;
void main() { gl_Position = vec4(p, 0.0, 1.0); }\`;

const FRAG = \`#version 300 es
precision highp float;
#define MAX_ITER 1000            // the literal cap: the loop below never runs longer than this
uniform vec4 u_vp;               // the box in device pixels: x, y, w, h
uniform vec2 u_center;           // the point at the middle of the box
uniform float u_width;           // the width of the box's shorter side, in the complex plane
uniform int u_iter;              // the iteration budget (param), at most MAX_ITER
uniform vec3 u_bg, u_a1, u_a2;
out vec4 color;
void main() {
  float s = min(u_vp.z, u_vp.w);
  vec2 q = (gl_FragCoord.xy - u_vp.xy - 0.5 * u_vp.zw) / s;
  vec2 c = u_center + q * u_width;
  vec2 z = vec2(0.0);
  float n = -1.0;
  for (int i = 0; i < MAX_ITER; i++) {
    if (i >= u_iter) break;
    z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
    if (dot(z, z) > 256.0) { n = float(i); break; }
  }
  if (n < 0.0) { color = vec4(u_bg, 1.0); return; }      // did not escape: inside, as far as we can tell
  float mu = n + 1.0 - log2(0.5 * log(dot(z, z)));        // smooth escape count
  float w = 0.5 + 0.5 * cos(2.2 * log(mu + 1.0) * 3.14159);
  vec3 ink = mix(u_a1, u_a2, w);
  color = vec4(mix(u_bg, ink, 1.0 - exp(-0.15 * mu)), 1.0);
}\`;

// three boundary points to zoom toward
const TARGETS = {
  seahorse: { re: -0.743643887037151, im: 0.131825904205330, name: 'Seahorse valley' },
  misiurewicz: { re: -0.77568377, im: 0.13646737, name: 'a Misiurewicz point' },
  branch: { re: -0.10109636384562, im: 0.95628651080914, name: 'a three-armed branch point' },
};
const START = { re: -0.6, im: 0.0 }, W0 = 3.2, DEPTH = 5, CYCLE = 30;
const W_MIN = 2e-5, W_MAX = 4;   // the view's width limits: below W_MIN 32-bit floats show blocks, not detail

// the tour: zoom depth k goes 0 -> DEPTH -> 0 once per cycle; the centre slides from the overview onto the target
function tour(t, T) {
  const ph = ((t % CYCLE) + CYCLE) % CYCLE / CYCLE, k = DEPTH * (0.5 - 0.5 * Math.cos(2 * Math.PI * ph));
  const s = Math.pow(10, -k), pull = Math.pow(s, 1.5);
  return { k, re: T.re + (START.re - T.re) * pull, im: T.im + (START.im - T.im) * pull, w: W0 * s };
}

function compile(gl, type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src); gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error('shader: ' + gl.getShaderInfoLog(sh));
  return sh;
}

export default {
  setup({ gl, env }) {
    const prog = gl.createProgram();
    gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
    gl.bindAttribLocation(prog, 0, 'p');
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error('link: ' + gl.getProgramInfoLog(prog));
    const vao = gl.createVertexArray(), buf = gl.createBuffer();
    gl.bindVertexArray(vao); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);   // one triangle covers the viewport
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
    const u = {};
    for (const k of ['u_vp', 'u_center', 'u_width', 'u_iter', 'u_bg', 'u_a1', 'u_a2']) u[k] = gl.getUniformLocation(prog, k);
    this.gpu = { prog, vao, u };
    this.pz = new PanZoom();
    this.mine = null;   // the viewer's view {c: [re, im], w}, or null while the tour drives the camera
  },
  // the view a share link keeps: the viewer's centre and width, or nothing during the tour
  getView() { return this.mine && { c: this.mine.c.slice(), w: this.mine.w }; },
  setView(v) {
    const ok = v && Array.isArray(v.c) && v.c.length === 2 && v.c.every(Number.isFinite) && Number.isFinite(v.w);
    this.mine = ok ? { c: v.c.slice(), w: Math.min(W_MAX, Math.max(W_MIN, v.w)) } : null;
  },

  draw({ gl, t, box, viewport, theme, params, events, engaged }) {
    const { prog, vao, u } = this.gpu, T = TARGETS[params.target] || TARGETS.seahorse, pz = this.pz, S = Math.min(box.w, box.h);
    // input: PanZoom starts from wherever the camera is (the tour's, or the viewer's), in this box
    const tc = tour(t, T), from = this.mine || { c: [tc.re, tc.im], w: tc.w };
    pz.setBox(box); pz.minScale = S / W_MAX; pz.maxScale = S / W_MIN; pz.setState({ center: from.c, scale: S / from.w });
    for (const e of events) {
      if (e.type === 'keydown' && e.key === '0') { this.mine = null; pz.setState({ center: [tc.re, tc.im], scale: S / tc.w }); continue; }
      if (pz.handle(e)) this.mine = { c: pz.center.slice(), w: S / pz.scale };
    }
    const cam = this.mine ? { re: this.mine.c[0], im: this.mine.c[1], w: this.mine.w, k: Math.log10(W0 / this.mine.w) } : tc;
    const cre = cam.re, cim = cam.im, k = cam.k;
    const col = h => hex(h).map(x => x / 255);
    gl.disable(gl.DEPTH_TEST); gl.disable(gl.BLEND);
    gl.useProgram(prog); gl.bindVertexArray(vao);
    gl.uniform4f(u.u_vp, ...viewport);
    gl.uniform2f(u.u_center, cre, cim);
    gl.uniform1f(u.u_width, cam.w);
    gl.uniform1i(u.u_iter, params.iter);
    gl.uniform3f(u.u_bg, ...col(theme.bg)); gl.uniform3f(u.u_a1, ...col(theme.a1)); gl.uniform3f(u.u_a2, ...col(theme.a2));
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindVertexArray(null);
    // text cannot be drawn into a WebGL canvas here: return it, and the host draws it in the theme font
    const fs = fsFor(box);
    return { labels: [
      { text: this.mine ? \`Mandelbrot set at \${cre.toFixed(6)} \${cim < 0 ? '−' : '+'} \${Math.abs(cim).toFixed(6)}i\` : \`Mandelbrot set, toward \${T.name}\`, x: box.x, y: box.y + fs, size: fs + 1, weight: 700 },
      { text: \`\${params.iter} iterations · zoom 10^\${k.toFixed(1)}\${this.mine ? ' · your view' : ''}\`, x: box.x, y: box.y + fs * 2.3, size: fs, alpha: 0.8 },
      { text: \`width \${cam.w.toExponential(1)}\${this.mine && !engaged ? ' · Resume the tour from Try this' : ''}\`, x: box.x, y: box.y + box.h - 6, size: fs, weight: 700, color: k > 4.2 ? 'a1' : 'fg' },
    ], cursor: pz.down ? 'grabbing' : 'grab' };
  },
};
`,
  mobile:`// github.com/loci-viz/mandelbrot-zoom/src/mobile.js · MIT License
// The mobile target: render "canvas2d". The same zoom path and smooth coloring as the desktop shader, iterated on
// the CPU at half resolution, with the iteration budget capped at 200.
// pointer: "pan-zoom", as on desktop: after a tap, one finger pans, two pinch, a double tap zooms in.
import { hex, fsFor, label, clipBox, PanZoom } from '@loci/kit';

const MOBILE_MAX_ITER = 200;     // the phone cap: params.iter above this is clamped (see "Try this")
const MAX_SAMPLES = 48000;       // pixels in the buffer, at most (a large box gets less than half resolution)
const TARGETS = {
  seahorse: { re: -0.743643887037151, im: 0.131825904205330, name: 'Seahorse valley' },
  misiurewicz: { re: -0.77568377, im: 0.13646737, name: 'a Misiurewicz point' },
  branch: { re: -0.10109636384562, im: 0.95628651080914, name: 'a three-armed branch point' },
};
const START = { re: -0.6, im: 0.0 }, W0 = 3.2, DEPTH = 5, CYCLE = 30;
const W_MIN = 2e-5, W_MAX = 4;   // the same view limits as the desktop version

// the camera of the desktop version: zoom depth k goes 0 -> DEPTH -> 0 once per cycle
function camera(t, T) {
  const ph = ((t % CYCLE) + CYCLE) % CYCLE / CYCLE, k = DEPTH * (0.5 - 0.5 * Math.cos(2 * Math.PI * ph));
  const s = Math.pow(10, -k), pull = Math.pow(s, 1.5);
  return { k, s, re: T.re + (START.re - T.re) * pull, im: T.im + (START.im - T.im) * pull };
}

// smooth escape count mu of c = (cr, ci), or -1 if the orbit has not escaped within iter steps (bailout |z| > 16)
function escape(cr, ci, iter) {
  const q = (cr - 0.25) * (cr - 0.25) + ci * ci;           // the main cardioid and the period-2 bulb never escape
  if (q * (q + (cr - 0.25)) <= 0.25 * ci * ci || (cr + 1) * (cr + 1) + ci * ci <= 0.0625) return -1;
  let zr = 0, zi = 0, zr2 = 0, zi2 = 0;
  for (let n = 0; n < iter; n++) {
    zi = 2 * zr * zi + ci; zr = zr2 - zi2 + cr; zr2 = zr * zr; zi2 = zi * zi;
    if (zr2 + zi2 > 256) return n + 1 - Math.log2(0.5 * Math.log(zr2 + zi2));
  }
  return -1;
}

/* Fill mu[] for the W×H grid. Mariani–Silver: when the whole border of a rectangle has not escaped, neither has its
   inside (the set is connected and full), so it is filled without iterating. Only rectangles bordered by escaping
   points are subdivided down to single pixels. */
function render(mu, W, H, cam, iter) {
  const S = Math.min(W, H), step = cam.s * W0 / S;
  const at = (i, j) => { const o = j * W + i; if (mu[o] === -2) mu[o] = escape(cam.re + (i + 0.5 - W / 2) * step, cam.im + (H / 2 - (j + 0.5)) * step, iter); return mu[o]; };
  mu.fill(-2);
  const stack = [0, 0, W - 1, H - 1];
  while (stack.length) {
    const y1 = stack.pop(), x1 = stack.pop(), y0 = stack.pop(), x0 = stack.pop();
    if (x1 - x0 < 6 || y1 - y0 < 6) { for (let j = y0; j <= y1; j++) for (let i = x0; i <= x1; i++) at(i, j); continue; }
    let inside = true;
    for (let i = x0; i <= x1; i++) { if (at(i, y0) >= 0) inside = false; if (at(i, y1) >= 0) inside = false; }
    for (let j = y0 + 1; j < y1; j++) { if (at(x0, j) >= 0) inside = false; if (at(x1, j) >= 0) inside = false; }
    if (inside) { for (let j = y0 + 1; j < y1; j++) mu.fill(-1, j * W + x0 + 1, j * W + x1); continue; }
    const xm = (x0 + x1) >> 1, ym = (y0 + y1) >> 1;
    stack.push(x0, y0, xm, ym, xm + 1, y0, x1, ym, x0, ym + 1, xm, y1, xm + 1, ym + 1, x1, y1);
  }
}

export default {
  setup() { this.pz = new PanZoom(); this.mine = null; },
  getView() { return this.mine && { c: this.mine.c.slice(), w: this.mine.w }; },
  setView(v) {
    const ok = v && Array.isArray(v.c) && v.c.length === 2 && v.c.every(Number.isFinite) && Number.isFinite(v.w);
    this.mine = ok ? { c: v.c.slice(), w: Math.min(W_MAX, Math.max(W_MIN, v.w)) } : null;
  },
  draw({ ctx, t, box, theme, params, state, events, engaged }) {
    const T = TARGETS[params.target] || TARGETS.seahorse, iter = Math.min(MOBILE_MAX_ITER, params.iter), pz = this.pz, S = Math.min(box.w, box.h);
    const tc = camera(t, T), from = this.mine || { c: [tc.re, tc.im], w: W0 * tc.s };
    pz.setBox(box); pz.minScale = S / W_MAX; pz.maxScale = S / W_MIN; pz.setState({ center: from.c, scale: S / from.w });
    for (const e of events) {
      if (e.type === 'keydown' && e.key === '0') { this.mine = null; pz.setState({ center: [tc.re, tc.im], scale: S / (W0 * tc.s) }); continue; }
      if (pz.handle(e)) this.mine = { c: pz.center.slice(), w: S / pz.scale };
    }
    const cam = this.mine ? { re: this.mine.c[0], im: this.mine.c[1], s: this.mine.w / W0, k: Math.log10(W0 / this.mine.w) } : tc;
    // the buffer: half the box's CSS size, cached by size. Deep in the zoom almost every pixel escapes late, so each
    // whole zoom level below 10^-2 takes a little resolution off (a function of t, so frames stay deterministic).
    const level = Math.max(0, Math.round(cam.k) - 2), f = Math.min(0.5, Math.sqrt(MAX_SAMPLES / (box.w * box.h))) * (1 - 0.1 * level);
    const W = Math.max(1, Math.round(box.w * f)), H = Math.max(1, Math.round(box.h * f)), size = W + 'x' + H;
    state.bufs = state.bufs || new Map();
    if (!state.bufs.has(size)) {
      if (state.bufs.size > 8) state.bufs.clear();     // the box changed: drop the old sizes
      const buf = new OffscreenCanvas(W, H), bctx = buf.getContext('2d');
      state.bufs.set(size, { buf, bctx, img: bctx.createImageData(W, H), mu: new Float32Array(W * H), key: '' });
    }
    const B = state.bufs.get(size);
    const key = [cam.re, cam.im, cam.s, iter, theme.bg, theme.a1, theme.a2].join('|');
    if (key !== B.key) {   // a paused redraw or a capture at the same t reuses the last frame
      B.key = key;
      render(B.mu, W, H, cam, iter);
      // color: the palette of the desktop shader, a function of mu
      const bg = hex(theme.bg), a1 = hex(theme.a1), a2 = hex(theme.a2), px = B.img.data, mu = B.mu;
      for (let o = 0; o < W * H; o++) {
        const m = mu[o], p = o * 4; px[p + 3] = 255;
        if (m < 0) { px[p] = bg[0]; px[p + 1] = bg[1]; px[p + 2] = bg[2]; continue; }
        const w = 0.5 + 0.5 * Math.cos(2.2 * Math.log(m + 1) * 3.14159), g = 1 - Math.exp(-0.15 * m);
        for (let c = 0; c < 3; c++) { const ink = a1[c] + (a2[c] - a1[c]) * w; px[p + c] = bg[c] + (ink - bg[c]) * g; }
      }
      B.bctx.putImageData(B.img, 0, 0);
    }
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(B.buf, box.x, box.y, box.w, box.h);
    const fs = fsFor(box), capped = params.iter > MOBILE_MAX_ITER;
    clipBox(ctx, box);   // text stays inside the box, antialiasing included
    label(ctx, theme, this.mine ? \`Mandelbrot set at \${cam.re.toFixed(6)} \${cam.im < 0 ? '−' : '+'} \${Math.abs(cam.im).toFixed(6)}i\` : \`Mandelbrot set, toward \${T.name}\`, box.x, box.y + fs, { size: fs + 1, weight: 700 });
    label(ctx, theme, \`\${iter} iterations\${capped ? \` (capped from \${params.iter} on phones)\` : ''} · zoom 10^\${cam.k.toFixed(1)}\${this.mine ? ' · your view' : ''}\`, box.x, box.y + fs * 2.3, { size: fs, alpha: 0.8 });
    label(ctx, theme, \`width \${(W0 * cam.s).toExponential(1)}\${this.mine && !engaged ? ' · Resume the tour from Try this' : ''}\`, box.x, box.y + box.h - 6, { size: fs, weight: 700, color: cam.k > 4.2 ? theme.a1 : theme.fg });
    ctx.restore();
    return { cursor: pz.down ? 'grabbing' : 'grab' };
  },
};
` },
  manifest:{ api:1, id:'mandelbrot-zoom', title:'A zoom into the Mandelbrot set, on the GPU', runtime:'js',
    targets:[
      {id:'desktop', render:'webgl2', entry:'index.js', requires:['webgl2'], pointer:{mode:'pan-zoom', hint:'Drag to pan · scroll to zoom · double-click to zoom in'}},
      {id:'mobile', render:'canvas2d', entry:'mobile.js', params:['iter','target'], note:'On the CPU at half resolution, with at most 200 iterations.', pointer:{mode:'pan-zoom', hint:'Drag to pan · pinch to zoom · double-tap to zoom in'}}
    ],
    params:[
      {key:'iter', type:'range', label:'Iterations', min:50, max:1000, step:10, default:300, format:'0'},
      {key:'target', type:'select', label:'Zoom toward', options:[['seahorse','Seahorse valley'],['misiurewicz','Misiurewicz point'],['branch','Branch point']], default:'seahorse'}
    ],
    presets:[
      {label:'Seahorse valley at 1000 iterations', params:{iter:1000, target:'seahorse'}, t:13, note:'At zoom 10^4 the slow-escaping points near the boundary resolve into spirals instead of a blob.'},
      {label:'50 iterations, the budget shows', params:{iter:50, target:'seahorse'}, t:12, note:'Too few iterations: points that escape late are drawn as if they were in the set.'},
      {label:'A three-armed branch point', params:{iter:300, target:'branch'}, t:14, note:'Near c ≈ −0.1011 + 0.9563i three filaments meet. Almost every pixel escapes: the set is very thin here.'},
      {label:'Resume the tour', params:{}, view:null, note:'Back to the automatic zoom after you have panned or zoomed yourself.'}
    ], cycle:30, motion:'static',
    after:['julia-circle'] }, // the Mandelbrot set is the set of c whose Julia set is connected, the dichotomy the Julia piece shows
  md:`## Zooming into the Mandelbrot set

The Mandelbrot set *M* is the set of complex numbers *c* for which the orbit of 0 under

    z ↦ z² + c

stays bounded. If |*z*| ever exceeds 2 the orbit escapes to infinity, so membership can be tested by iterating and watching for that moment.

### What you're seeing
Every pixel of the box is one value of *c*, and the GPU runs the iteration for all of them at once in a fragment shader. Points that have not escaped within the iteration budget are drawn in the background color: as far as this picture can tell, they are in *M*. Every other point is colored by how fast it escaped. The camera zooms toward a point on the boundary of *M* and back out, once every 30 seconds, from a width of 3.2 down to about 3 × 10⁻⁵, a magnification of 10⁵. The readout shows the budget and the current zoom.

### The escape-time algorithm and smooth coloring
Iterate up to *N* times and record the first *n* with |*z*ₙ| > *R*. Coloring by the integer *n* gives visible bands. With a large bailout radius (here *R* = 16) the quantity

    μ = n + 1 − log₂(ln |zₙ|)

varies continuously with *c*, because near escape |*z*| roughly squares at every step, so the double logarithm counts the fraction of a step left over. The colors are a function of μ, mixed from the theme's two accent colors.

### Why the zoom stops at 10⁵
The shader computes in 32-bit floats, which carry about 7 significant digits. Near the seahorse valley at *c* ≈ −0.7436 + 0.1318*i*, neighboring floats are about 6 × 10⁻⁸ apart. At a width of 3 × 10⁻⁵ across a 700-pixel box, one pixel is 4 × 10⁻⁸, already finer than the floats can tell apart, so going deeper would show blocks, not detail. Deep-zoom renderers use double precision or perturbation theory: one reference orbit in high precision and small float offsets from it.

### Try this
- Steer it yourself: click (or tap) the piece, then drag to pan and scroll (or pinch) to zoom about the pointer; a double-click zooms in 2×, with Shift out. The view stays where you leave it, and a share link keeps it; **Resume the tour** in the list here, or 0 while the piece is engaged, hands the camera back to the zoom tour.
- Start on the seahorse valley at 300 iterations. Near the deepest point of the zoom, a featureless background-colored blob appears: those points escape, but slowly. Raise the iterations to 1000 and it fills with spirals.
- Switch the target to the Misiurewicz point and to the branch point. These are tips and branch points of filaments, where the set is so thin that almost every pixel escapes.
- Drop the iterations to 50. The overview looks fine, but the zoom shows a blob where the boundary should be: the budget, not the set, decides the picture.
- On a phone this piece runs its mobile version, which iterates on the CPU at half resolution and clamps the budget to at most 200 iterations, whatever the slider says (the readout shows when it is capped). Compare the seahorse valley there with 1000 iterations on a desktop: the blob at the deepest point is the clamp.

**Reference.** H.-O. Peitgen and P. H. Richter, *The Beauty of Fractals*, Springer, 1986, chapters 3 and 4. A. Douady and J. H. Hubbard, "Itération des polynômes quadratiques complexes", *C. R. Acad. Sci. Paris* 294 (1982), 123–126.`
},
{
  id:'hopf-fibers', title:'The Hopf fibration: linked circles filling space', lane:'new',
  hook:'Every point of the 2-sphere lifts to a circle in the 3-sphere, and every two of those circles are linked.',
  author:'@villarceau', license:'MIT', repo:'github.com/loci-viz/hopf-fibers', reviewed:'Oct 2026', likes:4120, t0:0,
  tags:['Topology','Geometry','GPU'],
  alt:'A ring of colored tubes, each a closed circle, wraps around a doughnut shape so that every circle threads through all the others, and the arrangement turns slowly. Engaged, it can be orbited and zoomed, and a clicked circle is labeled with its point on the sphere.',
  // Two targets: desktop is WebGL2 drawn with three.js (the host's pinned '@loci/three'); mobile draws the same fibers
  // in canvas2d, depth-sorted in software. Plus download metadata for an offline copy.
  sources:{ desktop:`// github.com/loci-viz/hopf-fibers/src/index.js · MIT License
// render: "webgl2", drawn with three.js from the host's pinned '@loci/three'.
// pointer: "orbit". Once engaged, the kit's OrbitCamera drives the three.js camera (drag to orbit, right-drag to pan,
// scroll or pinch to zoom, arrow keys, 0 to reset), and a click on a circle selects it and labels its base point on S².
import * as THREE from '@loci/three';
import { fsFor, OrbitCamera, Picker } from '@loci/kit';

const SEG = 160, CYCLE = 40, TILT = 0.42, PICK_STEP = 4;
const r4 = x => Math.round(x * 1e4) / 1e4;
/* the slow turn of the whole group when nobody is steering: [about x, about y] */
const spin = t => [0.25 * Math.sin((2 * Math.PI * t) / CYCLE), (2 * Math.PI * t) / CYCLE];

/* The fiber of the Hopf map over the point of S² at latitude lat and longitude lon, as points of R³:
   (z1, z2) = (cos(ψ/2) e^{iα}, sin(ψ/2) e^{i(α − lon)}) with ψ = π/2 − lat, then stereographic projection
   of S³ from (0, 0, 0, 1). Axes: x1 → X, x3 → Y (up), x2 → Z, so the fiber over the north pole is the
   horizontal unit circle and the fiber over the south pole is the vertical axis. */
function fiber(lat, lon) {
  const psi = Math.PI / 2 - lat, a = Math.cos(psi / 2), b = Math.sin(psi / 2), pts = [];
  for (let i = 0; i < SEG; i++) {
    const al = (2 * Math.PI * i) / SEG;
    const x1 = a * Math.cos(al), x2 = a * Math.sin(al), x3 = b * Math.cos(al - lon), x4 = b * Math.sin(al - lon);
    const k = 1 / (1 - x4);
    pts.push(new THREE.Vector3(x1 * k, x3 * k, x2 * k));
  }
  return pts;
}
/* distance in px from (x, y) to a closed polyline stored as [x0, y0, x1, y1, …] */
function polyDist(xy, x, y) {
  let best = Infinity;
  for (let i = 0, n = xy.length / 2; i < n; i++) {
    const ax = xy[2 * i], ay = xy[2 * i + 1], j = (i + 1) % n, bx = xy[2 * j], by = xy[2 * j + 1];
    const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy, u = L ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L)) : 0;
    best = Math.min(best, Math.hypot(x - ax - u * dx, y - ay - u * dy));
  }
  return best;
}

export default {
  setup({ gl, canvas }) {
    // The host owns the canvas size: never call setSize or setPixelRatio (the pixel ratio stays 1, so the
    // viewport below is in device pixels). The host also clears the canvas, so three.js must not.
    const renderer = new THREE.WebGLRenderer({ canvas, context: gl, antialias: true });
    renderer.autoClear = false;
    const scene = new THREE.Scene(), group = new THREE.Group();
    scene.add(group);
    scene.add(new THREE.AmbientLight(0xffffff, 1.1));
    const sun = new THREE.DirectionalLight(0xffffff, 2.2); sun.position.set(3, 5, 4); scene.add(sun);
    const camera = new THREE.PerspectiveCamera(35, 1, 0.05, 400);
    this.three = { renderer, scene, group, camera, key: '', R: 1, fibers: [], look: '' };
    // dist is in units of the distance that fits the whole picture in the box
    this.orbit = new OrbitCamera({ yaw: 0, pitch: TILT, dist: 1, minDist: 0.3, maxDist: 4 });
    this.pick = new Picker();
    this.g = null;      // the group's turn, frozen the first time the viewer orbits or pans (so the scene holds still)
    this.sel = null;    // the selected fiber's index
    this.hover = null;
  },

  // the view a share link keeps: camera, frozen turn, selection (null while all three are the defaults)
  getView() {
    if (this.orbit.isHome() && !this.g && this.sel == null) return null;
    return { cam: this.orbit.getState(), g: this.g, sel: this.sel };
  },
  setView(v) {
    this.orbit.setState(v && v.cam);
    this.g = v && Array.isArray(v.g) && v.g.length === 2 && v.g.every(Number.isFinite) ? v.g.slice() : null;
    this.sel = v && Number.isInteger(v.sel) && v.sel >= 0 ? v.sel : null;
  },

  rebuild(params, theme) {
    const S = this.three, lat = (params.lat * Math.PI) / 180, n = params.count;
    for (const m of S.group.children) { m.geometry.dispose(); m.material.dispose(); }
    S.group.clear(); S.fibers = [];
    const rings = [{ lat: params.lat, c0: theme.a1, c1: theme.a2 }];
    if (params.second) rings.push({ lat: Math.min(85, params.lat + 35), c0: theme.fg, c1: theme.a2 });
    let R = 0;
    for (const ring of rings) for (let j = 0; j < n; j++) {
      const lon = (2 * Math.PI * j) / n, pts = fiber((ring.lat * Math.PI) / 180, lon);
      for (const p of pts) R = Math.max(R, p.length());
      const col = new THREE.Color(ring.c0).lerp(new THREE.Color(ring.c1), 0.5 - 0.5 * Math.cos(lon));
      S.fibers.push({ pts, col, lat: ring.lat, lon: (360 * j) / n, xy: new Float32Array((2 * SEG) / PICK_STEP) });
    }
    R = Math.min(R, 12);
    for (const f of S.fibers) {
      const tube = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(f.pts, true), SEG, 0.022 * R, 8, true);
      S.group.add(new THREE.Mesh(tube, new THREE.MeshLambertMaterial({ color: f.col })));
    }
    S.R = R; S.look = '';
    if (this.sel != null && this.sel >= S.fibers.length) this.sel = null;
  },

  /* the selected fiber stands out: full color plus a glow; the others fade toward the background */
  restyle(theme) {
    const S = this.three, look = JSON.stringify([this.sel, theme.bg]);
    if (look === S.look) return; S.look = look;
    const bg = new THREE.Color(theme.bg);
    S.group.children.forEach((m, i) => {
      const f = S.fibers[i], on = this.sel === i;
      m.material.color.copy(f.col); if (this.sel != null && !on) m.material.color.lerp(bg, 0.7);
      m.material.emissive.copy(on ? f.col : new THREE.Color(0)).multiplyScalar(on ? 0.55 : 0);
    });
  },

  draw({ t, box, viewport, theme, params, events, engaged }) {
    const S = this.three, r = S.renderer, cam = S.camera, O = this.orbit;
    const key = JSON.stringify([params.lat, params.count, params.second, theme.fg, theme.a1, theme.a2]);
    if (key !== S.key) { this.rebuild(params, theme); S.key = key; }
    const aspect = box.w / box.h, half = (cam.fov * Math.PI) / 360;
    const fit = S.R / Math.tan(Math.min(half, Math.atan(Math.tan(half) * aspect))) * 1.12;
    O.unit = fit; O.pxScale = (2 * Math.tan(half)) / box.h;   // pan: one CSS px is this much of the view at distance 1

    // input since the last frame
    let hoverAt = null;
    for (const e of events) {
      const was = [O.yaw, O.pitch, ...O.target].join();
      O.handle(e);
      if (!this.g && was !== [O.yaw, O.pitch, ...O.target].join()) this.g = spin(t).map(r4);  // hold the scene still from here on
      if (e.type === 'click') this.sel = this.pick.pick(e.x, e.y);
      if (e.type === 'keydown' && e.key === '0') { this.g = null; this.sel = null; }
      if (e.type === 'pointermove' && !e.buttons) hoverAt = e;
    }
    if (hoverAt) this.hover = this.pick.pick(hoverAt.x, hoverAt.y);
    this.restyle(theme);

    // The host set viewport, scissor and clear color behind three.js's back: resync its state cache first.
    r.resetState();
    r.setViewport(...viewport); r.setScissor(...viewport); r.setScissorTest(true);
    const [rx, ry] = this.g || spin(t);
    S.group.rotation.set(rx, ry, 0);
    cam.aspect = aspect; O.applyTo(cam);
    cam.near = fit * 0.02; cam.far = fit * (O.dist + 3); cam.updateProjectionMatrix();
    r.render(S.scene, cam);

    // screen-space hit targets for the next events: every fourth point of each fiber, projected
    S.group.updateMatrixWorld(); cam.updateMatrixWorld();
    const v = new THREE.Vector3(); this.pick.clear();
    S.fibers.forEach((f, i) => {
      for (let k = 0; k < SEG / PICK_STEP; k++) {
        v.copy(f.pts[k * PICK_STEP]).applyMatrix4(S.group.matrixWorld).project(cam);
        f.xy[2 * k] = box.x + ((v.x + 1) / 2) * box.w; f.xy[2 * k + 1] = box.y + ((1 - v.y) / 2) * box.h;
      }
      this.pick.addHit(i, (x, y) => polyDist(f.xy, x, y), 9);
    });

    const fs = fsFor(box), n = params.count * (params.second ? 2 : 1);
    const labels = [
      { text: 'Hopf fibration, stereographically projected', x: box.x, y: box.y + fs, size: fs + 1, weight: 700 },
      { text: \`\${n} fibers over latitude \${params.lat}°\${params.second ? \` and \${Math.min(85, params.lat + 35)}°\` : ''}\`, x: box.x, y: box.y + fs * 2.3, size: fs, alpha: 0.8 },
    ];
    const f = this.sel != null && S.fibers[this.sel];
    if (f) {
      // the label sits above the top of the selected circle on screen
      let top = 0; for (let k = 1; k < f.xy.length / 2; k++) if (f.xy[2 * k + 1] < f.xy[2 * top + 1]) top = k;
      const la = (f.lat * Math.PI) / 180, lo = (f.lon * Math.PI) / 180, P = [Math.cos(la) * Math.cos(lo), Math.cos(la) * Math.sin(lo), Math.sin(la)];
      const lx = Math.max(box.x + 4, Math.min(box.x + box.w - 4, f.xy[2 * top])), ly = Math.max(box.y + fs * 3.6, f.xy[2 * top + 1] - 10);
      labels.push({ text: \`the fiber over (\${f.lat}°, \${+f.lon.toFixed(1)}°)\`, x: lx, y: ly - fs * 1.2, size: fs, weight: 700, color: 'a2', align: 'center' });
      labels.push({ text: \`base point (\${P.map(c => c.toFixed(2)).join(', ')}) on S²\`, x: lx, y: ly, size: fs, align: 'center' });
    }
    labels.push({ text: f ? 'it links every other circle exactly once' : engaged ? 'click a circle to see the point of S² it lies over' : 'every two circles link exactly once', x: box.x, y: box.y + box.h - 6, size: fs, weight: 700, color: 'a1' });
    return { labels, cursor: O.drag ? 'grabbing' : this.hover != null ? 'pointer' : 'grab' };
  },

  dispose() {
    const S = this.three; if (!S) return;
    for (const m of S.group.children) { m.geometry.dispose(); m.material.dispose(); }
    S.renderer.dispose();
  },
};
`,
  mobile:`// github.com/loci-viz/hopf-fibers/src/mobile.js · MIT License
// The mobile target: render "canvas2d", no GPU. The same fibers, rotation and camera tilt as the three.js version,
// drawn in software: each fiber is 64 points in R³, cut into short arcs that are depth-sorted and stroked back to
// front, each over a background-colored halo so that a nearer circle visibly passes over a farther one.
// pointer: "orbit". Once tapped, one finger orbits (the kit's OrbitCamera, used for its rotation only: the
// projection stays orthographic), two fingers pinch to zoom, and a tap on a circle selects it, as on desktop.
import { hex, mix, fsFor, label, clipBox, OrbitCamera, Picker } from '@loci/kit';

const SEG = 64, CHUNK = 8, CYCLE = 40, TILT = 0.42;
const r4 = x => Math.round(x * 1e4) / 1e4;
const spin = t => [0.25 * Math.sin((2 * Math.PI * t) / CYCLE), (2 * Math.PI * t) / CYCLE];   // [about x, about y]

/* The fiber over the point of S² at latitude lat and longitude lon, as in the desktop version:
   (z1, z2) = (cos(ψ/2) e^{iα}, sin(ψ/2) e^{i(α − lon)}), ψ = π/2 − lat, stereographically projected from (0, 0, 0, 1).
   Axes: x1 → X, x3 → Y (up), x2 → Z. Returns a flat [x, y, z, x, y, z, …] array of SEG points. */
function fiber(lat, lon) {
  const psi = Math.PI / 2 - lat, a = Math.cos(psi / 2), b = Math.sin(psi / 2), pts = new Float64Array(SEG * 3);
  for (let i = 0; i < SEG; i++) {
    const al = (2 * Math.PI * i) / SEG;
    const x1 = a * Math.cos(al), x2 = a * Math.sin(al), x3 = b * Math.cos(al - lon), x4 = b * Math.sin(al - lon);
    const k = 1 / (1 - x4);
    pts[3 * i] = x1 * k; pts[3 * i + 1] = x3 * k; pts[3 * i + 2] = x2 * k;
  }
  return pts;
}

function build(params, theme) {
  const n = params.count, fibers = [];
  const rings = [{ lat: params.lat, c0: theme.a1, c1: theme.a2 }];
  if (params.second) rings.push({ lat: Math.min(85, params.lat + 35), c0: theme.fg, c1: theme.a2 });
  let R = 0;
  for (const ring of rings) for (let j = 0; j < n; j++) {
    const lon = (2 * Math.PI * j) / n, pts = fiber((ring.lat * Math.PI) / 180, lon);
    for (let i = 0; i < SEG; i++) R = Math.max(R, Math.hypot(pts[3 * i], pts[3 * i + 1], pts[3 * i + 2]));
    fibers.push({ pts, col: mix(hex(ring.c0), hex(ring.c1), 0.5 - 0.5 * Math.cos(lon)), lat: ring.lat, lon: (360 * j) / n });   // color by longitude, as on desktop
  }
  return { fibers, R: Math.min(R, 12) };
}
/* distance in px from (x, y) to fiber f's projected polyline */
function fiberDist(xy, f, x, y) {
  let best = Infinity;
  for (let i = 0; i < SEG; i++) {
    const a = f * SEG + i, b = f * SEG + ((i + 1) % SEG), ax = xy[2 * a], ay = xy[2 * a + 1], dx = xy[2 * b] - ax, dy = xy[2 * b + 1] - ay;
    const L = dx * dx + dy * dy, u = L ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L)) : 0;
    best = Math.min(best, Math.hypot(x - ax - u * dx, y - ay - u * dy));
  }
  return best;
}

export default {
  setup() {
    this.orbit = new OrbitCamera({ yaw: 0, pitch: TILT, dist: 1, minDist: 0.3, maxDist: 4 });
    this.pick = new Picker();
    this.g = null; this.sel = null;
  },
  getView() {
    if (this.orbit.isHome() && !this.g && this.sel == null) return null;
    return { cam: this.orbit.getState(), g: this.g, sel: this.sel };
  },
  setView(v) {
    this.orbit.setState(v && v.cam);
    this.g = v && Array.isArray(v.g) && v.g.length === 2 && v.g.every(Number.isFinite) ? v.g.slice() : null;
    this.sel = v && Number.isInteger(v.sel) && v.sel >= 0 ? v.sel : null;
  },

  draw({ ctx, t, box, theme, params, state, events, engaged }) {
    const key = JSON.stringify([params.lat, params.count, params.second, theme.fg, theme.a1, theme.a2]);
    if (state.key !== key) { state.key = key; Object.assign(state, build(params, theme)); state.xy = null; }
    const { fibers, R } = state, nf = fibers.length, nc = SEG / CHUNK, O = this.orbit;
    if (this.sel != null && this.sel >= nf) this.sel = null;
    if (!state.xy) { state.xy = new Float64Array(nf * SEG * 2); state.z = new Float64Array(nf * SEG); state.order = new Array(nf * nc); }
    // orthographic: the shorter side of the box spans the fibers' radius with the desktop's 12% margin, divided by the zoom
    const sc0 = Math.min(box.w, box.h) / 2 / (R * 1.12);
    O.pxScale = 1 / sc0;   // pan: one CSS px is 1/scale world units at zoom 1

    for (const e of events) {
      const was = [O.yaw, O.pitch, ...O.target].join();
      O.handle(e);
      if (!this.g && was !== [O.yaw, O.pitch, ...O.target].join()) this.g = spin(t).map(r4);   // hold the scene still
      if (e.type === 'click') this.sel = this.pick.pick(e.x, e.y);
      if (e.type === 'keydown' && e.key === '0') { this.g = null; this.sel = null; }
    }

    // the desktop group rotation (three.js Euler XYZ: first about y, then about x), then the orbit camera's rotation
    const [rx, ry] = this.g || spin(t), V = O.view(), [Rt, Up, Bk] = V.rot, T = V.target;
    const cy = Math.cos(ry), sy = Math.sin(ry), cx = Math.cos(rx), sx = Math.sin(rx);
    const sc = sc0 / O.dist, ox = box.x + box.w / 2, oy = box.y + box.h / 2;
    const xy = state.xy, zz = state.z;
    let zmin = Infinity, zmax = -Infinity;
    for (let f = 0; f < nf; f++) {
      const p = fibers[f].pts;
      for (let i = 0; i < SEG; i++) {
        const X = p[3 * i], Y = p[3 * i + 1], Z = p[3 * i + 2];
        const x1 = X * cy + Z * sy, z1 = -X * sy + Z * cy;          // about y
        const y2 = Y * cx - z1 * sx, z2 = Y * sx + z1 * cx;         // about x
        const qx = x1 - T[0], qy = y2 - T[1], qz = z2 - T[2], o = f * SEG + i;
        xy[2 * o] = ox + sc * (qx * Rt[0] + qy * Rt[1] + qz * Rt[2]); xy[2 * o + 1] = oy - sc * (qx * Up[0] + qy * Up[1] + qz * Up[2]);
        const d = qx * Bk[0] + qy * Bk[1] + qz * Bk[2]; zz[o] = d;     // toward the camera
        if (d < zmin) zmin = d; if (d > zmax) zmax = d;
      }
    }
    // arcs of CHUNK segments, sorted back to front by mean depth
    const order = state.order;
    for (let f = 0, k = 0; f < nf; f++) for (let c = 0; c < nc; c++, k++) {
      let s = 0; for (let i = 0; i <= CHUNK; i++) s += zz[f * SEG + ((c * CHUNK + i) % SEG)];
      order[k] = { f, c, d: s / (CHUNK + 1) };
    }
    order.sort((a, b) => a.d - b.d);
    clipBox(ctx, box);
    ctx.lineJoin = 'round';
    const lw = theme.lw * 2 * Math.max(0.8, Math.min(2, Math.min(box.w, box.h) / 400)), bg = hex(theme.bg), span = Math.max(1e-6, zmax - zmin);
    for (const { f, c, d } of order) {
      ctx.beginPath();
      for (let i = 0; i <= CHUNK; i++) { const o = f * SEG + ((c * CHUNK + i) % SEG); i ? ctx.lineTo(xy[2 * o], xy[2 * o + 1]) : ctx.moveTo(xy[2 * o], xy[2 * o + 1]); }
      const on = this.sel === f, dim = this.sel != null && !on;
      ctx.lineCap = 'butt'; ctx.strokeStyle = theme.bg; ctx.lineWidth = (on ? lw * 1.8 : lw) + 3; ctx.stroke();   // the halo: nearer arcs cut farther ones (butt: never its own neighbours)
      const near = (d - zmin) / span, col = mix(bg, fibers[f].col, (0.45 + 0.55 * near) * (dim ? 0.35 : 1)); // farther arcs fade toward the background
      ctx.lineCap = 'round'; ctx.strokeStyle = \`rgb(\${col[0] | 0},\${col[1] | 0},\${col[2] | 0})\`; ctx.lineWidth = on ? lw * 1.8 : lw; ctx.stroke();
    }
    // hit targets for the next events: the projected fibers
    this.pick.clear();
    for (let f = 0; f < nf; f++) this.pick.addHit(f, (x, y) => fiberDist(xy, f, x, y), 14);

    const fs = fsFor(box), n = params.count * (params.second ? 2 : 1);   // labels inside the same clip
    label(ctx, theme, 'Hopf fibration, stereographically projected', box.x, box.y + fs, { size: fs + 1, weight: 700 });
    label(ctx, theme, \`\${n} fibers over latitude \${params.lat}°\${params.second ? \` and \${Math.min(85, params.lat + 35)}°\` : ''}\`, box.x, box.y + fs * 2.3, { size: fs, alpha: 0.8 });
    const F = this.sel != null && fibers[this.sel];
    if (F) {
      let top = 0; for (let i = 1; i < SEG; i++) if (xy[2 * (this.sel * SEG + i) + 1] < xy[2 * (this.sel * SEG + top) + 1]) top = i;
      const o = this.sel * SEG + top, la = (F.lat * Math.PI) / 180, lo = (F.lon * Math.PI) / 180;
      const P = [Math.cos(la) * Math.cos(lo), Math.cos(la) * Math.sin(lo), Math.sin(la)];
      const lx = Math.max(box.x + 4, Math.min(box.x + box.w - 4, xy[2 * o])), ly = Math.max(box.y + fs * 3.6, xy[2 * o + 1] - 10);
      label(ctx, theme, \`the fiber over (\${F.lat}°, \${+F.lon.toFixed(1)}°)\`, lx, ly - fs * 1.2, { size: fs, weight: 700, color: theme.a2, align: 'center' });
      label(ctx, theme, \`base point (\${P.map(c => c.toFixed(2)).join(', ')}) on S²\`, lx, ly, { size: fs, align: 'center' });
    }
    label(ctx, theme, F ? 'it links every other circle exactly once' : engaged ? 'tap a circle to see the point of S² it lies over' : 'every two circles link exactly once', box.x, box.y + box.h - 6, { size: fs, weight: 700, color: theme.a1 });
    ctx.restore();
    return { cursor: O.drag ? 'grabbing' : 'grab' };
  },
};
` },
  manifest:{ api:1, id:'hopf-fibers', title:'The Hopf fibration: linked circles filling space', runtime:'js',
    targets:[
      {id:'desktop', render:'webgl2', entry:'index.js', requires:['webgl2'], pointer:{mode:'orbit', hint:'Drag to orbit · right-drag to pan · scroll to zoom · click a circle'}},
      {id:'mobile', render:'canvas2d', entry:'mobile.js', params:['lat','count','second'], pointer:{mode:'orbit', hint:'Drag to orbit · pinch to zoom · tap a circle'}},
      {id:'download', format:'html', url:'https://github.com/loci-viz/hopf-fibers/releases/download/v1.0.0/hopf-fibers.html', size:688128, note:'One self-contained HTML file with three.js inlined, for a lecture room without a network.'}
    ],
    params:[
      {key:'lat', type:'range', label:'Latitude on S²', min:-40, max:80, step:1, default:0, format:'0°'},
      {key:'count', type:'range', label:'Fibers', min:8, max:64, step:1, default:24, format:'0'},
      {key:'second', type:'toggle', label:'Second ring, 35° north', default:false}
    ],
    presets:[
      {label:'One latitude = one torus', params:{lat:0, count:64, second:false}, note:'Fibers over the equator of S² fill out the projected Clifford torus.'},
      {label:'Two latitudes link', params:{lat:10, count:16, second:true}, note:'The inner torus comes from latitude 45°. Every one of its circles links every circle of the outer torus.'},
      {label:'Near the pole', params:{lat:75, count:24, second:false}, note:'Close to the north pole the fibers hug the unit circle, the fiber over the pole itself.'},
      {label:'Look down the axis', params:{lat:0, count:24, second:false}, view:{cam:{yaw:0, pitch:1.5, dist:1, target:[0,0,0]}, g:[0,0], sel:0}, note:'From above, the fibers over the equator are circles that all pass through the unit circle: the selected one goes once around it.'},
      {label:'Back to the turning view', params:{}, view:null, note:'The camera, the slow turn and the selection go back to how the piece starts.'}
    ], cycle:40, motion:'pause' },
  md:`## The Hopf fibration

The 3-sphere *S³* is the set of pairs (*z*₁, *z*₂) of complex numbers with |*z*₁|² + |*z*₂|² = 1. The Hopf map sends it to the ordinary 2-sphere:

    h(z₁, z₂) = (2 z₁ z̄₂, |z₁|² − |z₂|²) ∈ ℂ × ℝ.

Multiplying both coordinates by the same unit complex number *e^{iα}* does not change *h*, and these are the only points with the same image. So the preimage of every point of *S²*, its fiber, is a circle: the great circle {(*z*₁*e^{iα}*, *z*₂*e^{iα}*)}. *S³* is the disjoint union of these circles, one for each point of *S²*.

### What you're seeing
The piece picks evenly spaced points around one circle of latitude on *S²* and draws their fibers. To show circles in *S³* in ordinary space it uses stereographic projection from the point (0, 0, 0, 1), which sends circles to circles (or to a line, for the circle through the projection point). The fiber over the north pole is the horizontal unit circle; the fiber over the south pole is the vertical axis. Fibers over one latitude sweep out a torus. Each fiber goes once around the torus the long way and once the short way, and these tilted circles are the Villarceau circles of that torus. Colors follow the longitude of the base point, so neighbors on *S²* are neighbors in the picture. On a phone the same fibers are drawn without the GPU, as lines sorted by depth instead of shaded tubes.

### Linking
Any two fibers are linked exactly once: you cannot pull one off the other without cutting it. That is why the fibration cannot be untwisted into a product *S²* × *S¹*, and it is the geometric content of the statement that *h* generates π₃(*S²*) ≅ ℤ. The Hopf invariant of *h*, which is the linking number of two fibers, is 1.

### Try this
- Turn it yourself: click the piece, then drag to orbit, right-drag (or Shift-drag) to pan and scroll to zoom; the arrow keys orbit and 0 resets. On a phone, tap it, then drag with one finger and pinch with two. The slow turn stops the moment you take the camera.
- Click (or tap) a circle: it lights up, the others fade, and the label gives the point of *S²* it lies over, (cos φ cos λ, cos φ sin λ, sin φ) for latitude φ and longitude λ. Its neighbors in the picture are its neighbors on the sphere.
- One latitude, one torus: at latitude 0° the fibers lie on the image of the Clifford torus. Raise the fiber count to 64 and the torus fills in.
- Two latitudes link: turn on the second ring, 35° further north. It is a thinner torus nested inside the first, and every one of its circles passes through every circle of the outer one.
- Near the pole: at 75° the fibers hug the unit circle, the fiber over the north pole. Move toward −40° and the circles grow large, because their fibers pass close to the projection point.

**Reference.** D. W. Lyons, "An elementary introduction to the Hopf fibration", *Mathematics Magazine* 76 (2003), 87–98. H. Hopf, "Über die Abbildungen der dreidimensionalen Sphäre auf die Kugelfläche", *Math. Ann.* 104 (1931), 637–665.`
}
];

/* The ES module each JS piece runs as (for target tid, when it has targets): its own source text, or generated from its catalog entry. The worker resolves '@loci/kit',
   so this exact text is what the Source tab shows and what draws the slide. The helpers and draw() are the
   entry's own; the default export adapts the module API (theme + params) to draw(ctx, w, h, t, P, S, B). */
function moduleSource(v,tid){
  const t=v.manifest.targets?(tid&&targetById(v.manifest,tid))||runnableTargets(v.manifest)[0]:null;
  if((t?t.runtime:v.manifest.runtime)!=='js') return null;
  if(v.sources) return v.sources[t.id]??null; // one module per target (docs/module-api.md, "Targets")
  if(typeof v.source==='string') return v.source; // pieces written directly against the module API
  const key=v.manifest.params[0].key, helpers=(v.helpers||[]).map(String).join('\n\n');
  return `// ${v.repo}/src/index.js · ${v.license} License
import { hex, mix, rgba, label, clipBox, fsFor, mulberry32 } from '@loci/kit';

${helpers?helpers+'\n\n':''}function ${v.draw.toString()}

// The legacy theme object P is the host theme plus this piece's one parameter as P.param.
const legacyP = (theme, params) => ({ ...theme, param: params.${key} });

export default {
  draw({ ctx, t, box, theme, params, state }) {
    const d = ctx.getTransform().a, w = ctx.canvas.width / d, h = ctx.canvas.height / d;
    return draw(ctx, w, h, t, legacyP(theme, params), state, box);
  }
};
`;
}
VIZ.forEach(v=>validateManifest(v.manifest));

const POSTS = [
{
  id:'top-october-2026', title:'The October 2026 distinctions', date:'Oct 28, 2026', author:'The EigenReel editors', read:'3 min read',
  vizIds:['times-table','elliptic-group-law','riemann-sums'],
  excerpt:'Three citations from a jury of three reviewers, chosen from the piece and its explanation, not from likes or views. A sample of the format.',
  md:`**Sample.** The citations below were written for this prototype to show what a monthly distinction looks like. No jury has met and no nominations were collected; the jurors named are catalog authors standing in for a real rotation. How distinctions work is in [docs/distinctions.md](docs/distinctions.md).

Each month a jury of three reviewers reads the pieces that were Community reviewed that month and awards at most one distinction per category, each with a two-sentence citation they sign. The jury never sees like counts, save counts or watch time, and a juror's own pieces are not eligible. This month's jury: @may.iterates, @levien.tan and @fatou.dust.

### Best teaching piece: Multiplication tables on a circle
*By @circle-mod-n.* “Set *n* = 101 and wait for *k* = 51: since 51 · 2 ≡ 1 (mod 101), the cardioid’s chords come back, and a class meets inverses mod *n* before anyone names them. The same slide then carries the envelope of a family of chords to an epicycloid with *k* − 1 cusps, so one picture serves a number theory lesson and a geometry one.”

### Research picture: The group law on an elliptic curve
*By @kmoreau.geom.* “Lower *b* below 2/(3√3) ≈ 0.385 and the real curve splits into an oval and an unbounded branch; put *P* on the oval and *Q* on the branch, and *P* + *Q* lands back on the oval, so the oval is visibly a coset of the identity component. It is the picture of *E*(ℝ) ≅ S¹ × ℤ/2ℤ we would put on a slide in a talk.”

### Clearest single idea: Riemann sums and their errors
*By @calc-commons.* “One knob, the sample point, and the log–log inset answers the question it raises: the left-rule error falls with slope −1 and the midpoint error with slope −2. A student sees that where you sample decides how fast the sum converges, not whether it does.”

### Not awarded this month
**Craft** (the GPU, WebAssembly or a mobile version used to show more mathematics) and **Best explanation** went unawarded. The pieces that would compete for Craft are still in the New lane, checked by machine but not yet reviewed, so they are not eligible. An empty category is said plainly rather than filled.

Every distinguished piece is open source. Fork it, restyle it, and send us what you build.`
},
{
  id:'calculus-ten', title:'10 best visuals for teaching calculus', date:'Oct 14, 2026', author:'@calc-commons, guest curator', read:'7 min read',
  vizIds:['riemann-sums','fourier-square','himmelblau-descent'],
  excerpt:'From Riemann sums to Lagrange multipliers: the visuals that make a first-year student say “oh, that’s what it means.”',
  md:`I've taught first-year calculus for eleven years. These are the ten pictures I'd keep if I could only keep ten. Three are already in the EigenReel catalog; the other seven are in the review queue and should land over the next two months.

### 1. Riemann sums and their errors
*In the catalog.* Students see the definition of the integral and the speed of convergence at once. The log–log inset is the part that sticks.

### 2. A square wave from spinning circles
*In the catalog.* Not first-semester material, but I show it on the last day as a preview of where series go.

### 3. Four valleys of Himmelblau
*In the catalog.* The cleanest picture I know of the gradient being perpendicular to level curves.

### 4. Secants becoming a tangent
*In review.* A point slides toward another along a curve while the slope readout converges.

### 5. Taylor polynomials of sin x
*In review.* Watch each new term bend the polynomial to hug the curve a little further out.

### 6. Volumes by disks and washers
*In review.* A region spins around an axis, and the slices stack into a solid.

### 7. Newton's method and its basins
*In review.* Converging in two steps, or bouncing off to infinity, depending on where you start.

### 8. Slope fields and Euler's method
*In review.* The step size slider makes the error of Euler's method visible.

### 9. Lagrange multipliers on a level set
*In review.* A level curve of the objective slides until it just touches the constraint.

### 10. The ε–δ game
*In review.* You pick ε, the student picks δ, and the band either contains the graph or it doesn't.`
},
{
  id:'how-we-curate', title:'How a visualization gets into EigenReel', date:'Sep 30, 2026', author:'The EigenReel editors', read:'5 min read',
  vizIds:[],
  excerpt:'An open-source license, a reviewed explanation, and a module that follows the module contract. Our checklist, in full.',
  md:`EigenReel is curated by people. Every visualization in the feed was submitted as an open-source repository, read line by line, and checked by two mathematicians before it went live. Here is the checklist we use.

### 1. An OSI-approved license
MIT, BSD, Apache-2.0 and GPL-3.0 are the common ones. If readers can't fork it, we don't host it.

### 2. A manifest and a module that follow the module contract
Each piece is a small package: a \`loci.json\` manifest that declares its runtime, parameters and "Try this" presets, and one module, an ES module or a WebAssembly binary. The site never runs it on the page: it runs in a sandboxed Web Worker that owns an OffscreenCanvas, with no network and no storage. The host owns the canvas, the clock, the seed and the theme, renders the Customize controls from the manifest and validates every value, and the module draws a pure function of them, so a share link reproduces exactly what the sharer saw.

    // loci.json
    { "api": 1, "id": "times-table", "runtime": "js", "render": "canvas2d",
      "params": [{ "key": "n", "type": "range", "label": "Points on the circle",
                   "min": 20, "max": 400, "step": 1, "default": 200 }],
      "motion": "pause" }

    // index.js
    import { label, fsFor } from '@loci/kit';
    export default {
      draw({ ctx, t, box, theme, params, seed, state }) {
        // theme = { bg, fg, a1, a2, font, lw, labels }: read-only, owned by the site
      }
    };

The full contract, including the WebAssembly exports and what the worker enforces, is in [docs/module-api.md](docs/module-api.md).

### 3. An explanation a referee would sign
The explanation.md must say what is on screen, state the mathematics precisely, and give the reader something to try. Two reviewers check every claim. One works in the area; one teaches it.

### 4. Accessible by default
Labels can be turned off, animation speed can go to zero, and every palette is checked for contrast against its background.

### 5. Credit stays with the author
The author's handle sits on every slide, and the repository link goes to their repo, not a copy of it.`
},
{
  id:'chaos-and-randomness', title:'New this week: chaos and randomness', date:'Oct 29, 2026', author:'The EigenReel editors', read:'4 min read',
  vizIds:['logistic-bifurcation','double-pendulum','lorenz-butterfly','galton-board'],
  excerpt:'Four new pieces on how simple rules produce unpredictable behavior, and how unpredictable steps add up to a bell curve.',
  md:`Four visualizations cleared review this week, and they pair up. Two show deterministic rules that behave randomly. Two show randomness that behaves very regularly.

### Deterministic, yet unpredictable
**The road to chaos in the logistic map.** One parabola and one knob. Set *r* = 3.2 for a 2-cycle, push it past 3.5699 and the cycles stop, then find the period-3 window near 3.83. Reviewers asked for the cobweb because the bifurcation diagram alone hides what a single orbit does.

**Two double pendulums, one thousandth apart.** The most-watched piece we have accepted. Drop θ₁ to 20° and the two copies never separate, because small oscillations are linear. Raise it and they part within seconds.

**The Lorenz butterfly, two runs at once.** The same lesson in three dimensions. With ρ = 10 both runs fall into the same fixed point. With ρ = 28 they separate and visit the two wings on their own schedules.

### Random, yet regular
**A Galton board and the bell curve.** Each ball makes *n* fair coin-flips. The histogram is binomial, and as rows increase it approaches the normal curve drawn on top of it. This is the de Moivre–Laplace theorem you can watch.

### How to use them together
Sensitive dependence is the common thread: a tiny difference at the start and no memory of it at the end. In the pendulum and the Lorenz system, that comes from the equations. In the Galton board it comes from the coins. Ask students which of the four they would be able to predict a minute ahead, and why.

All four are open source. Send us the ones you remix.`
}
];
