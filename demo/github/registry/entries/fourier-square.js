const COLORS = {
  main: '#38bdf8',
  secondary: '#fb923c',
  bg: '#050508',
  fg: '#ecebf5',
};

import { rgba, label, fsFor } from '@eigenreel/kit';

export default {
  title: 'A square wave from spinning circles',
  hook: 'Each epicycle is one odd harmonic. Add more and watch the Gibbs overshoot refuse to shrink.',
  alt: "On the left, a chain of rotating circles, each smaller and faster than the last. On the right, the height of the chain's tip is traced as a wave that approximates a square wave, with ripples that squeeze toward the jumps as more circles are added.",
  tags: ['Harmonic analysis', 'Fourier series', 'Teaching'],
  license: 'MIT',
  author: { name: 'epicycle.lab' },

  modes: { desktop: true, phone: true },
  time: { length: 30, loop: true },
  context: '2d',
  libraries: [],

  params: [
    { key: 'N', type: 'range', label: 'Number of terms N', min: 1, max: 40, step: 1, default: 6 },
  ],
  presets: [
    { id: 'n-1', label: 'N = 1, a pure sine', params: { N: 1 } },
    { id: 'n-40', label: 'N = 40, Gibbs overshoot', params: { N: 40 } },
    { id: 'six-at-jump', label: 'N = 6, just after a jump', params: { N: 6 }, t: 3.2 },
    { id: 'forty-at-jump', label: 'N = 40, just after a jump', params: { N: 40 }, t: 3.2 },
  ],

  draw(ctx, t, params, env, S) {
    const { w, h } = env.box, C = env.colors;
    const N = params.N, fs = fsFor(env.box);
    const lw = env.device === 'phone' ? 1.6 : 2;
    // θ turns once every 6 seconds, five turns per loop
    const om = 2 * Math.PI * t / 6;
    const R = Math.min(h * 0.2, w * 0.15), cx = R * 1.45, cy = h / 2;
    const wx0 = cx + R * 1.65, wx1 = w, dth = 0.022;
    const S_N = th => { let s = 0; for (let k = 1; k <= N; k++) { const n = 2 * k - 1; s += 4 / (n * Math.PI) * Math.sin(n * th); } return s; };

    // the square wave itself, dashed, and the axis
    ctx.setLineDash([4, 5]);
    ctx.strokeStyle = rgba(C.fg, 0.35);
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = wx0, i = 0; x <= wx1; x += 2, i++) { const y = cy - R * Math.sign(Math.sin(om - i * dth)); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = rgba(C.fg, 0.18);
    ctx.beginPath(); ctx.moveTo(wx0, cy); ctx.lineTo(wx1, cy); ctx.stroke();

    // the epicycles, tip to tail
    let x = cx, y = cy;
    for (let k = 1; k <= N; k++) {
      const n = 2 * k - 1, r = R * 4 / (n * Math.PI), nx = x + r * Math.cos(n * om), ny = y - r * Math.sin(n * om);
      ctx.strokeStyle = rgba(C.fg, 0.22); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(x, y, r, 0, 2 * Math.PI); ctx.stroke();
      ctx.strokeStyle = rgba(C.fg, 0.85); ctx.lineWidth = Math.max(1, lw * 0.9);
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(nx, ny); ctx.stroke();
      x = nx; y = ny;
    }

    // the tip, joined to the newest point of the trace
    ctx.setLineDash([3, 4]);
    ctx.strokeStyle = rgba(C.main, 0.7); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(wx0, y); ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath(); ctx.arc(x, y, 3.5, 0, 2 * Math.PI); ctx.fillStyle = C.main; ctx.fill();

    // the partial sum S_N, newest at the left
    ctx.strokeStyle = C.main; ctx.lineWidth = lw * 1.5; ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let xx = wx0, i = 0; xx <= wx1; xx += 2, i++) { const yy = cy - R * S_N(om - i * dth); i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); }
    ctx.stroke();

    label(ctx, env, 'S_N(θ) = (4/π) Σ sin((2k−1)θ) / (2k−1)', 0, fs * 1.1, { size: fs + 1, weight: 700 });
    label(ctx, env, `N = ${N} term${N > 1 ? 's' : ''}`, 0, fs * 2.4, { size: fs, alpha: 0.75 });
    if (N >= 8) label(ctx, env, 'Gibbs overshoot ≈ 1.179, about 9% of the jump', 0, h - 6, { size: fs, weight: 700, color: C.secondary });
  },
};
