// Seed visualization (from the mockup). Same module format as the Playground and the practice registry.
const COLORS = { main: '#ffd23f', secondary: '#3a9bff', bg: '#050508', fg: '#ecebf5' };
export default {
  title: 'Riemann sums and their errors',
  hook: 'Rectangles refine from 2 to 64. The inset shows left sums converge like 1/n and midpoints like 1/n².',
  tags: ['Calculus', 'Integration', 'Numerical analysis', 'Teaching'],
  license: 'Apache-2.0',
  t0: 0,
  param: { key: 'rule', label: 'Sample point', min: 0, max: 2, step: 1, value: 0, options: ['left', 'midpoint', 'right'] },
  draw(ctx, w, h, t, P, S, B) {
    ctx.fillStyle = P.bg; ctx.fillRect(0, 0, w, h);
    const f = x => 1.2 + Math.sin(1.5 * x) + x / 4, a = 0, b = 5, exact = 6 + (1 - Math.cos(7.5)) / 1.5 + 25 / 8;
    const NS = [2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24, 32, 48, 64], n = NS[Math.floor(t / 1.3) % NS.length], rule = P.param, fs = fsFor(B);
    const sumFor = m => { const dx = (b - a) / m; let s = 0; for (let i = 0; i < m; i++) s += f(a + i * dx + dx * rule / 2) * dx; return s; };
    const L = B.x + 30, Rr = B.x + B.w - 6, T = B.y + (P.labels ? fs * 6 : 8), Bt = B.y + B.h - 20;
    const X = x => L + (x - a) / (b - a) * (Rr - L), Y = y => Bt - (y / 3.8) * (Bt - T);
    ctx.strokeStyle = rgba(P.fg, 0.12); ctx.lineWidth = 1; ctx.beginPath();
    for (let gy = 1; gy <= 3; gy++) { ctx.moveTo(L, Y(gy)); ctx.lineTo(Rr, Y(gy)); } ctx.stroke();
    const dx = (b - a) / n; let sum = 0;
    for (let i = 0; i < n; i++) {
      const x0 = a + i * dx, xs = x0 + dx * rule / 2, fy = f(xs); sum += fy * dx;
      ctx.fillStyle = rgba(P.a2, 0.26); ctx.fillRect(X(x0), Y(fy), X(x0 + dx) - X(x0), Bt - Y(fy));
      ctx.strokeStyle = rgba(P.a2, 0.9); ctx.lineWidth = 1; ctx.strokeRect(X(x0), Y(fy), X(x0 + dx) - X(x0), Bt - Y(fy));
    }
    ctx.strokeStyle = P.fg; ctx.lineWidth = P.lw * 1.4; ctx.beginPath();
    for (let i = 0; i <= 200; i++) { const x = a + (b - a) * i / 200; i ? ctx.lineTo(X(x), Y(f(x))) : ctx.moveTo(X(x), Y(f(x))); } ctx.stroke();
    if (n <= 32) for (let i = 0; i < n; i++) { const xs = a + i * dx + dx * rule / 2; ctx.beginPath(); ctx.arc(X(xs), Y(f(xs)), 2.6, 0, Math.PI * 2); ctx.fillStyle = P.a1; ctx.fill(); }
    ctx.strokeStyle = rgba(P.fg, 0.6); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(L, T); ctx.lineTo(L, Bt); ctx.lineTo(Rr, Bt); ctx.stroke();
    for (let gx = 0; gx <= 5; gx++) label(ctx, P, String(gx), X(gx), Bt + fs + 2, { size: fs - 2, align: 'center', alpha: .7 });
    for (let gy = 0; gy <= 3; gy++) label(ctx, P, String(gy), L - 8, Y(gy) + 4, { size: fs - 2, align: 'right', alpha: .7 });
    const rn = ['left', 'midpoint', 'right'][rule];
    label(ctx, P, `n = ${n}  ·  ${rn} rule`, B.x, B.y + fs, { size: fs + 1, weight: 700 });
    label(ctx, P, `Σ f(xᵢ*) Δx = ${sum.toFixed(4)}`, B.x, B.y + fs * 2.4, { size: fs });
    label(ctx, P, `∫₀⁵ f(x) dx = ${exact.toFixed(4)}`, B.x, B.y + fs * 3.7, { size: fs, alpha: .8 });
    label(ctx, P, `error = ${(sum - exact >= 0 ? '+' : '−')}${Math.abs(sum - exact).toFixed(4)}`, B.x, B.y + fs * 5, { size: fs, weight: 700, color: P.a1 });
    if (P.labels && B.w >= 420) {
      const iw = 150, ih = fs * 4.6, ix = B.x + B.w - iw, iy = B.y;
      const errs = NS.map(m => Math.max(1e-7, Math.abs(sumFor(m) - exact)));
      const lmin = Math.log10(Math.min(...errs)), lmax = Math.log10(Math.max(...errs)), nx = m => ix + 8 + (Math.log(m) - Math.log(2)) / (Math.log(64) - Math.log(2)) * (iw - 16), ny = e => iy + ih - 8 - (Math.log10(e) - lmin) / Math.max(.5, lmax - lmin) * (ih - fs - 14);
      ctx.strokeStyle = rgba(P.fg, 0.3); ctx.strokeRect(ix + .5, iy + .5, iw - 1, ih - 1);
      label(ctx, P, '|error| vs n, log–log', ix + 8, iy + fs, { size: fs - 3, alpha: .8 });
      ctx.strokeStyle = rgba(P.fg, 0.5); ctx.beginPath(); NS.forEach((m, i) => i ? ctx.lineTo(nx(m), ny(errs[i])) : ctx.moveTo(nx(m), ny(errs[i]))); ctx.stroke();
      NS.forEach((m, i) => { ctx.beginPath(); ctx.arc(nx(m), ny(errs[i]), m === n ? 4 : 2, 0, Math.PI * 2); ctx.fillStyle = m === n ? P.a1 : rgba(P.fg, 0.7); ctx.fill(); });
    }
  },
};
