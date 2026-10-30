/* ---------- kit: helpers every visualization may import ---------- */
function hex(h){ h=h.replace('#',''); if(h.length===3) h=h.split('').map(c=>c+c).join(''); const n=parseInt(h,16); return [n>>16&255, n>>8&255, n&255]; }
function mix(a,b,t){ return [a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t, a[2]+(b[2]-a[2])*t]; }
function rgba(h,a){ const c=hex(h); return `rgba(${c[0]},${c[1]},${c[2]},${a})`; }
function label(ctx,P,str,x,y,o={}){
  if(!P.labels) return;
  ctx.save(); ctx.globalAlpha=o.alpha??1; ctx.fillStyle=o.color||P.fg;
  ctx.font=`${o.weight||400} ${o.size||13}px ${P.font}`; ctx.textAlign=o.align||'left'; ctx.textBaseline='alphabetic';
  ctx.fillText(str,x,y); ctx.restore();
}
function clipBox(ctx,B){ ctx.save(); ctx.beginPath(); ctx.rect(B.x,B.y,B.w,B.h); ctx.clip(); }
function fsFor(B){ return Math.round(Math.max(12, Math.min(16, B.w/34))); }

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

/* ---------- the catalog ---------- */
const VIZ = [
{
  id:'times-table', title:'Multiplication tables on a circle',
  hook:'Connect i to k·i mod n and a cardioid appears. Keep going and it grows cusps.',
  author:'@circle-mod-n', license:'MIT', repo:'github.com/loci-viz/times-table', reviewed:'Oct 2026', likes:12400, t0:0,
  tags:['Number theory','Modular arithmetic','Geometry','Teaching'],
  param:{key:'n', label:'Points on the circle', min:20, max:400, step:10, value:200, fmt:v=>String(v)},
  md:`## Multiplication tables on a circle

Place *n* points evenly around a circle and label them 0, 1, …, *n* − 1. For a multiplier *k*, draw a chord from every point *i* to the point *k·i* mod *n*.

### What you're seeing
The multiplier *k* sweeps slowly upward from 2. At **k = 2** the chords envelope a **cardioid**; at **k = 3**, a **nephroid**. For integer *k*, as *n* → ∞ the envelope is an **epicycloid with k − 1 cusps**: the path of a point on a circle of radius *r* rolling around a fixed circle of radius (*k* − 1)*r*.

### Why it works
The chord joins the points at angles *θ* and *kθ*. The envelope of the family of lines through *e^{iθ}* and *e^{ikθ}* is the epicycloid traced by

*z(θ) = (k e^{iθ} + e^{ikθ}) / (k + 1)*.

### Try this
- Set *n* = 101 and wait for *k* = 51. Since 51 · 2 ≡ 1 (mod 101), multiplying by 51 inverts multiplying by 2: you get the cardioid's chords again.
- Lower *n* to 30 and the envelope dissolves into a visible chord diagram. Where does the picture stop looking like a curve?

### In the classroom
One picture covers modular arithmetic, the units of ℤ/*n*ℤ, and envelopes of line families. The construction was popularized by Mathologer's video *Times Tables, Mandelbrot and the Heart of Mathematics*.`,
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
  author:'@kmoreau.geom', license:'GPL-3.0', repo:'github.com/loci-viz/elliptic-group-law', reviewed:'Oct 2026', likes:8930, t0:2.2,
  tags:['Algebraic geometry','Number theory','Elliptic curves','Research','Teaching'],
  param:{key:'b', label:'Coefficient b', min:5, max:200, step:5, value:100, fmt:v=>(v/100).toFixed(2)},
  md:`## The chord-and-tangent law

An **elliptic curve** over ℝ is the set of solutions of a Weierstrass equation

*y² = x³ + ax + b*,  with  *4a³ + 27b² ≠ 0*,

together with a point at infinity 𝒪. Here *a* = −1 and you control *b*.

### What you're seeing
Draw the line through **P** and **Q**. By Bézout's theorem a line meets a cubic in three points counted with multiplicity, so it hits the curve once more, at **P∗Q**. Reflect that point across the *x*-axis to get **P + Q**.

With 𝒪 as the identity and reflection as negation, this rule makes the curve an **abelian group**. Commutativity is obvious. Associativity is the hard part; one classical proof uses the Cayley–Bacharach theorem for cubics through eight points.

### The formulas
For P ≠ ±Q, with slope *λ = (y_Q − y_P)/(x_Q − x_P)*:

    x₃ = λ² − x_P − x_Q
    y₃ = λ(x_P − x₃) − y_P

### Try this
- Lower *b* below 2/(3√3) ≈ 0.385. The real curve splits into an oval and an unbounded branch. The unbounded branch is the identity component, and it is a subgroup.
- Watch what happens as P passes under Q: the line turns vertical, and P + Q runs off to 𝒪.

### Where it leads
Over 𝔽_p the same formulas give elliptic-curve cryptography. Over ℚ, the Mordell–Weil theorem says *E*(ℚ) is finitely generated, and the Birch and Swinnerton-Dyer conjecture predicts its rank from an *L*-function.

**Reference.** Silverman and Tate, *Rational Points on Elliptic Curves*, chapter 1.`,
  draw(ctx,w,h,t,P,S,B){
    ctx.fillStyle=P.bg; ctx.fillRect(0,0,w,h);
    const a=-1, b=P.param/100, rhs=x=>x*x*x+a*x+b, fs=fsFor(B);
    const xm=0.3, k=Math.min(B.w/5.8, B.h/9);
    const ox=B.x+B.w/2, oy=B.y+B.h/2;
    const px=x=>ox+(x-xm)*k, py=y=>oy-y*k;
    const xl=xm-B.w/2/k, xr=xm+B.w/2/k, yt=B.h/2/k;
    clipBox(ctx,B);
    ctx.strokeStyle=rgba(P.fg,0.1); ctx.lineWidth=1; ctx.beginPath();
    for(let g=Math.ceil(xl); g<=xr; g++){ ctx.moveTo(px(g),B.y); ctx.lineTo(px(g),B.y+B.h); }
    for(let g=Math.ceil(-yt); g<=yt; g++){ ctx.moveTo(B.x,py(g)); ctx.lineTo(B.x+B.w,py(g)); }
    ctx.stroke();
    ctx.strokeStyle=rgba(P.fg,0.38); ctx.beginPath();
    ctx.moveTo(B.x,py(0)); ctx.lineTo(B.x+B.w,py(0)); ctx.moveTo(px(0),B.y); ctx.lineTo(px(0),B.y+B.h); ctx.stroke();
    const root=(lo,hi)=>{ for(let i=0;i<40;i++){ const mid=(lo+hi)/2; if((rhs(lo)<0)===(rhs(mid)<0)) lo=mid; else hi=mid; } return (lo+hi)/2; };
    const segs=[]; let cur=null; const dx=(xr-xl)/900;
    for(let x=xl; x<=xr+dx; x+=dx){
      const v=rhs(x);
      if(v>=0){ if(!cur){ cur=[]; if(x>xl) cur.push([root(x-dx,x),0]); segs.push(cur); } cur.push([x,Math.sqrt(v)]); }
      else if(cur){ cur.push([root(x-dx,x),0]); cur=null; }
    }
    ctx.strokeStyle=P.fg; ctx.lineWidth=P.lw*1.6; ctx.lineJoin='round';
    for(const s of segs) for(const sg of [1,-1]){
      ctx.beginPath(); s.forEach(([x,y],i)=> i? ctx.lineTo(px(x),py(sg*y)) : ctx.moveTo(px(x),py(sg*y))); ctx.stroke();
    }
    const r0=segs.length? segs[segs.length-1][0][0] : 0;
    const xP=r0+0.04+1.9*(1-Math.cos(t*0.45))/2, yP=Math.sqrt(Math.max(0,rhs(xP)));
    const xQ=r0+0.85, yQ=-Math.sqrt(Math.max(0,rhs(xQ)));
    const dot=(x,y,r,fill,stroke)=>{ ctx.beginPath(); ctx.arc(px(x),py(y),r,0,Math.PI*2); if(fill){ctx.fillStyle=fill; ctx.fill();} if(stroke){ctx.strokeStyle=stroke; ctx.lineWidth=2; ctx.stroke();} };
    let sumTxt='P + Q = 𝒪';
    if(Math.abs(xP-xQ)>1e-4){
      const m=(yQ-yP)/(xQ-xP), x3=m*m-xP-xQ, y3=yP+m*(x3-xP);
      ctx.strokeStyle=rgba(P.fg,0.55); ctx.lineWidth=P.lw; ctx.beginPath();
      ctx.moveTo(px(xl),py(yP+m*(xl-xP))); ctx.lineTo(px(xr),py(yP+m*(xr-xP))); ctx.stroke();
      ctx.setLineDash([5,5]); ctx.strokeStyle=P.a2; ctx.lineWidth=P.lw*1.2;
      ctx.beginPath(); ctx.moveTo(px(x3),py(y3)); ctx.lineTo(px(x3),py(-y3)); ctx.stroke(); ctx.setLineDash([]);
      dot(x3,y3,5,P.bg,P.fg); dot(x3,-y3,7,P.a2);
      label(ctx,P,'P∗Q',px(x3)+10,py(y3)+(y3>0?-8:16),{size:fs,weight:700});
      label(ctx,P,'P + Q',px(x3)+12,py(-y3)+(y3>0?18:-10),{size:fs+1,weight:700,color:P.a2});
      sumTxt = Math.abs(m)>9 ? 'P + Q → 𝒪, the point at infinity' : `P + Q = (${x3.toFixed(2)}, ${(-y3).toFixed(2)})`;
    }
    dot(xP,yP,6,P.a1); dot(xQ,yQ,6,P.a1);
    label(ctx,P,'P',px(xP)-6,py(yP)-12,{size:fs+1,weight:700,color:P.a1,align:'right'});
    label(ctx,P,'Q',px(xQ)+10,py(yQ)+18,{size:fs+1,weight:700,color:P.a1});
    ctx.restore();
    const disc=27*b*b-4;
    label(ctx,P,`y² = x³ − x + ${b.toFixed(2)}`,B.x,B.y+fs,{size:fs+1,weight:700});
    label(ctx,P,`Δ = ${(-16*disc).toFixed(1)}  ·  ${disc>0?'one real component':disc<0?'two real components':'singular'}`,B.x,B.y+fs*2.3,{size:fs,alpha:.75});
    label(ctx,P,sumTxt,B.x,B.y+B.h-6,{size:fs,color:P.a2,weight:700});
  }
},
{
  id:'himmelblau-descent', title:'Four valleys of Himmelblau',
  hook:'Twelve gradient-descent walkers with momentum race toward the four minima of a nonconvex function.',
  author:'@sofia.opt', license:'MIT', repo:'github.com/loci-viz/himmelblau-descent', reviewed:'Oct 2026', likes:6120, t0:4,
  tags:['Optimization','Gradient descent','Multivariable calculus','Teaching'],
  helpers:[himmelblau, himmelGrad, himmelField],
  param:{key:'eta', label:'Step size η', min:1, max:12, step:1, value:4, fmt:v=>(v/1000).toFixed(3)},
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
  author:'@fatou.dust', license:'BSD-3-Clause', repo:'github.com/loci-viz/julia-circle', reviewed:'Sep 2026', likes:10300, t0:6,
  tags:['Complex dynamics','Fractals','Research'],
  param:{key:'iter', label:'Iteration limit', min:20, max:200, step:10, value:70, fmt:v=>String(v)},
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
  author:'@epicycle.lab', license:'MIT', repo:'github.com/loci-viz/fourier-square', reviewed:'Oct 2026', likes:7740, t0:1,
  tags:['Harmonic analysis','Fourier series','Teaching'],
  param:{key:'N', label:'Number of terms N', min:1, max:40, step:1, value:6, fmt:v=>String(v)},
  md:`## Building a square wave from circles

The square wave *sq(θ) = sign(sin θ)* has the Fourier series

    sq(θ) = (4/π) Σ sin((2k − 1)θ) / (2k − 1),   k = 1, 2, 3, …

Each term is a rotating vector, an **epicycle**, of radius 4/((2*k* − 1)π) spinning at frequency 2*k* − 1. Chain *N* of them tip to tail. The height of the last tip, plotted against time, is the partial sum *S_N(θ)*, drawn to the right. The dashed line is the square wave itself.

### Gibbs phenomenon
The partial sums converge to *sq* in *L²* and at every point (to 0 at the jumps), but not uniformly. Near each jump, *S_N* overshoots to about 1.179, roughly 9% of the jump height. As *N* grows the overshoot moves closer to the jump, but its height never shrinks.

### Try this
- Set *N* = 1. One circle gives a pure sine.
- Set *N* = 40 and watch the ripples squeeze toward the jump while their peak stays put.

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
  author:'@calc-commons', license:'Apache-2.0', repo:'github.com/loci-viz/riemann-sums', reviewed:'Oct 2026', likes:5210, t0:0,
  tags:['Calculus','Integration','Numerical analysis','Teaching'],
  param:{key:'rule', label:'Sample point', min:0, max:2, step:1, value:0, fmt:v=>['left','midpoint','right'][v]},
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
}];

const POSTS = [
{
  id:'top-october-2026', title:'The top visualizations of October 2026', date:'Oct 28, 2026', author:'The Loci editors', read:'4 min read',
  vizIds:['times-table','elliptic-group-law','julia-circle','fourier-square','himmelblau-descent'],
  excerpt:'Five pieces that readers watched to the end, forked, and brought into class this month.',
  md:`October was the busiest month since launch: 41 submissions, 9 accepted after review, and more than 300 forks of catalog pieces. These are the five that readers watched to the end most often, ranked by completed views.

### 1. Multiplication tables on a circle
The most-forked piece on Loci. Several instructors told us they pause it at *k* = 51 with *n* = 101 and ask students why the cardioid came back. That's a lesson on inverses mod *n* in under a minute.

### 2. The group law on an elliptic curve
New this month. The author added the *b* slider after a reviewer asked to see the curve split into two components. Lower *b* below 0.385 and watch the oval appear.

### 3. Julia sets on a circle of parameters
A favorite with research audiences. The corner label tells you whether *c* is in the Mandelbrot set, which makes the connected-versus-dust dichotomy hard to miss.

### 4. A square wave from spinning circles
Turn *N* up to 40 and the Gibbs overshoot stays at about 9%. Readers in signal processing sent us three suggested edits to the explanation, all merged.

### 5. Four valleys of Himmelblau
Our first optimization piece. Push the step size past 0.010 to see why momentum needs a learning-rate schedule.

Every one of these is open source. Fork them, restyle them, and send us what you build.`
},
{
  id:'calculus-ten', title:'10 best visuals for teaching calculus', date:'Oct 14, 2026', author:'@calc-commons, guest curator', read:'7 min read',
  vizIds:['riemann-sums','fourier-square','himmelblau-descent'],
  excerpt:'From Riemann sums to Lagrange multipliers: the visuals that make a first-year student say “oh, that’s what it means.”',
  md:`I've taught first-year calculus for eleven years. These are the ten pictures I'd keep if I could only keep ten. Three are already in the Loci catalog; the other seven are in the review queue and should land over the next two months.

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
  id:'how-we-curate', title:'How a visualization gets into Loci', date:'Sep 30, 2026', author:'The Loci editors', read:'5 min read',
  vizIds:[],
  excerpt:'An open-source license, a reviewed explanation, and a draw function that accepts a theme. Our checklist, in full.',
  md:`Loci is curated by people. Every visualization in the feed was submitted as an open-source repository, read line by line, and checked by two mathematicians before it went live. Here is the checklist we use.

### 1. An OSI-approved license
MIT, BSD, Apache-2.0 and GPL-3.0 are the common ones. If readers can't fork it, we don't host it.

### 2. A draw function that accepts a theme
Each piece exports one module. The site owns the canvas, the clock and the theme; the visualization only draws. That contract is what lets every slide be restyled from the same Customize panel.

    export default {
      id: 'times-table',
      title: 'Multiplication tables on a circle',
      tags: ['Number theory', 'Modular arithmetic'],
      license: 'MIT',
      param: { key: 'n', min: 20, max: 400, value: 200 },
      draw(ctx, w, h, t, theme, state, box) {
        // theme = { bg, fg, a1, a2, font, lw, labels, param }
      }
    };

### 3. An explanation a referee would sign
The explanation.md must say what is on screen, state the mathematics precisely, and give the reader something to try. Two reviewers check every claim. One works in the area; one teaches it.

### 4. Accessible by default
Labels can be turned off, animation speed can go to zero, and every palette is checked for contrast against its background.

### 5. Credit stays with the author
The author's handle sits on every slide, and the repository link goes to their repo, not a copy of it.`
}];
