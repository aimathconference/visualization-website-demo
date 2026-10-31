// Seed visualization (from the mockup). Same module format as the Playground and the practice registry.
const COLORS = { main: '#ff8a1f', secondary: '#2dd4a7', bg: '#050508', fg: '#ecebf5' };
function himmelblau(x, y) { return (x * x + y - 11) ** 2 + (x + y * y - 7) ** 2; }
function himmelGrad(x, y) { const A = x * x + y - 11, C = x + y * y - 7; return [4 * x * A + 2 * C, 2 * A + 4 * y * C]; }
function himmelField(n, P) {
  n = Math.max(60, Math.min(640, n));
  const cv = document.createElement('canvas'); cv.width = cv.height = n;
  const c = cv.getContext('2d'), img = c.createImageData(n, n), d = img.data;
  const vals = new Float32Array(n * n), bands = new Int16Array(n * n), L = Math.log(891);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const x = -5 + 10 * (i + .5) / n, y = 5 - 10 * (j + .5) / n, v = Math.min(1, Math.log(1 + himmelblau(x, y)) / L);
    vals[j * n + i] = v; bands[j * n + i] = Math.floor(v * 18);
  }
  const bg = hex(P.bg), lo = hex(P.a2), fg = hex(P.fg);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const k = j * n + i, v = vals[k], b = bands[k];
    let col = mix(bg, lo, 0.6 * Math.pow(1 - v, 1.6));
    if ((i < n - 1 && bands[k + 1] !== b) || (j < n - 1 && bands[k + n] !== b)) col = mix(col, fg, 0.32);
    d[k * 4] = col[0]; d[k * 4 + 1] = col[1]; d[k * 4 + 2] = col[2]; d[k * 4 + 3] = 255;
  }
  c.putImageData(img, 0, 0); return cv;
}

export default {
  title: 'Four valleys of Himmelblau',
  hook: 'Twelve gradient-descent walkers with momentum race toward the four minima of a nonconvex function.',
  tags: ['Optimization', 'Gradient descent', 'Multivariable calculus', 'Teaching'],
  license: 'MIT',
  t0: 4,
  param: { key: 'eta', label: 'Step size η', min: 1, max: 12, step: 1, value: 4, scale: 1000, digits: 3 },
  draw(ctx, w, h, t, P, S, B) {
    ctx.fillStyle = P.bg; ctx.fillRect(0, 0, w, h);
    const fs = fsFor(B), top = P.labels ? fs * 1.6 : 0;
    const s = Math.min(B.w, B.h - top * 2), ox = B.x + (B.w - s) / 2, oy = B.y + top + (B.h - top * 2 - s) / 2;
    const X = x => ox + (x + 5) / 10 * s, Y = y => oy + (5 - y) / 10 * s;
    const key = [Math.round(s), P.bg, P.fg, P.a2].join();
    if (S.key !== key) { S.key = key; S.field = himmelField(Math.round(s), P); }
    ctx.imageSmoothingEnabled = true; ctx.drawImage(S.field, ox, oy, s, s);
    ctx.strokeStyle = rgba(P.fg, 0.3); ctx.lineWidth = 1; ctx.strokeRect(ox + .5, oy + .5, s - 1, s - 1);
    const lr = P.param / 1000, cycle = Math.floor(t / 10), local = t - cycle * 10;
    if (S.cycle !== cycle || S.lr !== lr) {
      S.cycle = cycle; S.lr = lr; S.steps = 0;
      S.walkers = Array.from({ length: 12 }, (_, i) => { const a = 2 * Math.PI * i / 12 + cycle * 0.37; const x = 4.6 * Math.cos(a), y = 4.6 * Math.sin(a); return { x, y, vx: 0, vy: 0, trail: [[x, y]] }; });
    }
    const target = Math.min(360, Math.floor(local * 45));
    while (S.steps < target) {
      for (const p of S.walkers) {
        const g = himmelGrad(p.x, p.y), gn = Math.hypot(g[0], g[1]); if (gn > 60) { g[0] *= 60 / gn; g[1] *= 60 / gn; }
        p.vx = 0.85 * p.vx - lr * g[0]; p.vy = 0.85 * p.vy - lr * g[1];
        p.x = Math.max(-6, Math.min(6, p.x + p.vx)); p.y = Math.max(-6, Math.min(6, p.y + p.vy));
        p.trail.push([p.x, p.y]);
      }
      S.steps++;
    }
    clipBox(ctx, { x: ox, y: oy, w: s, h: s });
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    for (const p of S.walkers) {
      ctx.strokeStyle = rgba(P.a1, 0.9); ctx.lineWidth = P.lw * 1.3; ctx.beginPath();
      p.trail.forEach(([x, y], i) => i ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y))); ctx.stroke();
    }
    for (const p of S.walkers) { ctx.beginPath(); ctx.arc(X(p.x), Y(p.y), 3 + P.lw, 0, Math.PI * 2); ctx.fillStyle = P.fg; ctx.fill(); ctx.strokeStyle = P.a1; ctx.lineWidth = 2; ctx.stroke(); }
    ctx.strokeStyle = P.fg; ctx.lineWidth = 1.5;
    for (const [mx, my] of [[3, 2], [-2.805, 3.131], [-3.779, -3.283], [3.584, -1.848]]) {
      ctx.beginPath(); ctx.moveTo(X(mx) - 5, Y(my)); ctx.lineTo(X(mx) + 5, Y(my)); ctx.moveTo(X(mx), Y(my) - 5); ctx.lineTo(X(mx), Y(my) + 5); ctx.stroke();
    }
    ctx.restore();
    label(ctx, P, 'f(x, y) = (x² + y − 11)² + (x + y² − 7)²', ox, oy - fs * 0.6, { size: fs, weight: 700 });
    label(ctx, P, `η = ${lr.toFixed(3)}  ·  β = 0.85  ·  step ${S.steps}`, ox, oy + s + fs * 1.3, { size: fs, alpha: .75 });
  },
};
