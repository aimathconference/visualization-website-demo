const COLORS = {
  main: '#34d399',
  secondary: '#fca5a5',
  bg: '#050508',
  fg: '#ecebf5',
};

import { rgba, label, fsFor } from '@eigenreel/kit';

export default {
  title: 'Riemann sums and their errors',
  hook: 'Rectangles refine from 2 to 64. The inset shows left sums converge like 1/n and midpoints like 1/n².',
  alt: 'A wavy curve with bars under it that are refined from a few wide rectangles to many thin ones, filling the area under the curve more and more tightly. Numbers show the running error, and a small log-log graph shows the error shrinking.',
  tags: ['Calculus', 'Integration', 'Numerical analysis', 'Teaching'],
  license: 'Apache-2.0',
  author: { name: 'calc-commons' },

  modes: { desktop: true, phone: true },
  time: { length: 18.2, loop: true },
  context: '2d',
  libraries: [],

  params: [
    { key: 'rule', type: 'select', label: 'Sample point', options: [['left', 'Left'], ['midpoint', 'Midpoint'], ['right', 'Right']], default: 'left' },
  ],
  presets: [
    { id: 'left', label: 'Left rule', params: { rule: 'left' } },
    { id: 'right', label: 'Right rule', params: { rule: 'right' } },
    { id: 'midpoint', label: 'Midpoint rule', params: { rule: 'midpoint' } },
    { id: 'left-coarse', label: 'Left rule, n = 4', params: { rule: 'left' }, t: 2.6 },
    { id: 'right-coarse', label: 'Right rule, n = 4', params: { rule: 'right' }, t: 2.6 },
  ],

  draw(ctx, t, params, env, S) {
    const { w, h } = env.box, C = env.colors;
    const f = x => 1.2 + Math.sin(1.5 * x) + x / 4, a = 0, b = 5, exact = 6 + (1 - Math.cos(7.5)) / 1.5 + 25 / 8;
    // n steps through these values, 1.3 seconds each, once per 18.2-second loop
    const NS = [2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24, 32, 48, 64];
    const n = NS[Math.min(NS.length - 1, Math.floor(t / 1.3))];
    const rule = params.rule, off = rule === 'midpoint' ? 0.5 : rule === 'right' ? 1 : 0;
    const fs = fsFor(env.box), lw = env.device === 'phone' ? 1.6 : 2;
    const sumFor = m => { const dx = (b - a) / m; let s = 0; for (let i = 0; i < m; i++) s += f(a + (i + off) * dx) * dx; return s; };

    const L = 30, Rr = w - 6, T = fs * 6, Bt = h - 20;
    const X = x => L + (x - a) / (b - a) * (Rr - L), Y = y => Bt - (y / 3.8) * (Bt - T);
    ctx.strokeStyle = rgba(C.fg, 0.12); ctx.lineWidth = 1; ctx.beginPath();
    for (let gy = 1; gy <= 3; gy++) { ctx.moveTo(L, Y(gy)); ctx.lineTo(Rr, Y(gy)); }
    ctx.stroke();

    // the rectangles
    const dx = (b - a) / n;
    let sum = 0;
    for (let i = 0; i < n; i++) {
      const x0 = a + i * dx, fy = f(x0 + off * dx);
      sum += fy * dx;
      ctx.fillStyle = rgba(C.secondary, 0.26); ctx.fillRect(X(x0), Y(fy), X(x0 + dx) - X(x0), Bt - Y(fy));
      ctx.strokeStyle = rgba(C.secondary, 0.9); ctx.lineWidth = 1; ctx.strokeRect(X(x0), Y(fy), X(x0 + dx) - X(x0), Bt - Y(fy));
    }

    // the curve and the sample points
    ctx.strokeStyle = C.fg; ctx.lineWidth = lw * 1.4; ctx.beginPath();
    for (let i = 0; i <= 200; i++) { const x = a + (b - a) * i / 200; i ? ctx.lineTo(X(x), Y(f(x))) : ctx.moveTo(X(x), Y(f(x))); }
    ctx.stroke();
    if (n <= 32) for (let i = 0; i < n; i++) {
      const xs = a + (i + off) * dx;
      ctx.beginPath(); ctx.arc(X(xs), Y(f(xs)), 2.6, 0, 2 * Math.PI); ctx.fillStyle = C.main; ctx.fill();
    }

    // axes
    ctx.strokeStyle = rgba(C.fg, 0.6); ctx.lineWidth = 1; ctx.beginPath();
    ctx.moveTo(L, T); ctx.lineTo(L, Bt); ctx.lineTo(Rr, Bt); ctx.stroke();
    for (let gx = 0; gx <= 5; gx++) label(ctx, env, String(gx), X(gx), Bt + fs + 2, { size: fs - 2, align: 'center', alpha: 0.7 });
    for (let gy = 0; gy <= 3; gy++) label(ctx, env, String(gy), L - 8, Y(gy) + 4, { size: fs - 2, align: 'right', alpha: 0.7 });

    // the readout
    label(ctx, env, `n = ${n}  ·  ${rule} rule`, 0, fs * 1.1, { size: fs + 1, weight: 700 });
    label(ctx, env, `Σ f(xᵢ*) Δx = ${sum.toFixed(4)}`, 0, fs * 2.4, { size: fs });
    label(ctx, env, `∫₀⁵ f(x) dx = ${exact.toFixed(4)}`, 0, fs * 3.7, { size: fs, alpha: 0.8 });
    label(ctx, env, `error = ${sum - exact >= 0 ? '+' : '−'}${Math.abs(sum - exact).toFixed(4)}`, 0, fs * 5, { size: fs, weight: 700, color: C.main });

    // the inset: |error| against n on log-log axes, for every n in the cycle
    if (w >= 300) {
      if (S.rule !== rule) { S.rule = rule; S.errs = NS.map(m => Math.max(1e-7, Math.abs(sumFor(m) - exact))); }
      const errs = S.errs;
      const iw = Math.min(150, Math.round(w * 0.42)), ih = fs * 4.6, ix = w - iw, iy = 0;
      const lmin = Math.log10(Math.min(...errs)), lmax = Math.log10(Math.max(...errs));
      const nx = m => ix + 8 + (Math.log(m) - Math.log(2)) / (Math.log(64) - Math.log(2)) * (iw - 16);
      const ny = e => iy + ih - 8 - (Math.log10(e) - lmin) / Math.max(0.5, lmax - lmin) * (ih - fs - 14);
      ctx.strokeStyle = rgba(C.fg, 0.3); ctx.strokeRect(ix + 0.5, iy + 0.5, iw - 1, ih - 1);
      label(ctx, env, '|error| vs n, log–log', ix + 8, iy + fs, { size: fs - 3, alpha: 0.8 });
      ctx.strokeStyle = rgba(C.fg, 0.5); ctx.beginPath();
      NS.forEach((m, i) => i ? ctx.lineTo(nx(m), ny(errs[i])) : ctx.moveTo(nx(m), ny(errs[i])));
      ctx.stroke();
      NS.forEach((m, i) => {
        ctx.beginPath(); ctx.arc(nx(m), ny(errs[i]), m === n ? 4 : 2, 0, 2 * Math.PI);
        ctx.fillStyle = m === n ? C.main : rgba(C.fg, 0.7); ctx.fill();
      });
    }
  },
};
