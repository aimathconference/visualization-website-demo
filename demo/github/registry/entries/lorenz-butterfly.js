const COLORS = { main: '#fdba74', secondary: '#a5b4fc', bg: '#050508', fg: '#ecebf5' };

import { rgba, label, fsFor } from '@eigenreel/kit';

// σ = 10, β = 8/3, RK4 with dt = 0.005 at 250 steps per second of playback: 40 s of loop = 50 time units.
const DT = 0.005, RATE = 250, NMAX = 10000;   // NMAX = 40 s × RATE
const EVERY = 2, TRAIL = 900;                // the trail: one point every 2 steps, the last 900 of them

function lorenzStep(s, o, dt, rho) {
  const sg = 10, be = 8 / 3, h = dt / 2, x = s[o], y = s[o + 1], z = s[o + 2];
  const ax = sg * (y - x), ay = x * (rho - z) - y, az = x * y - be * z;
  let X = x + h * ax, Y = y + h * ay, Z = z + h * az;
  const bx = sg * (Y - X), by = X * (rho - Z) - Y, bz = X * Y - be * Z;
  X = x + h * bx; Y = y + h * by; Z = z + h * bz;
  const cx = sg * (Y - X), cy = X * (rho - Z) - Y, cz = X * Y - be * Z;
  X = x + dt * cx; Y = y + dt * cy; Z = z + dt * cz;
  const ex = sg * (Y - X), ey = X * (rho - Z) - Y, ez = X * Y - be * Z;
  s[o] = x + dt / 6 * (ax + 2 * bx + 2 * cx + ex);
  s[o + 1] = y + dt / 6 * (ay + 2 * by + 2 * cy + ey);
  s[o + 2] = z + dt / 6 * (az + 2 * bz + 2 * cz + ez);
}

// The cache holds both runs at every step from 0 to S.n (6 numbers a step: run A then run B). It depends on rho
// alone: a new rho starts it again from t = 0, a later t extends it forward, an earlier t reads what is there.
function advance(S, rho, n) {
  if (S.rho !== rho) {
    S.rho = rho; S.n = 0;
    S.p = new Float64Array(6 * (NMAX + 1));
    S.p.set([1, 1, 1, 1.001, 1, 1]);
    S.cur = new Float64Array([1, 1, 1, 1.001, 1, 1]);
  }
  const p = S.p, c = S.cur;
  while (S.n < n) {
    lorenzStep(c, 0, DT, rho); lorenzStep(c, 3, DT, rho); S.n++;
    p.set(c, 6 * S.n);
  }
}

export default {
  title: 'The Lorenz butterfly, two runs at once',
  hook: 'Two points that start 0.001 apart ride the same three equations and end up on opposite wings of the attractor.',
  alt: 'A slowly rotating butterfly-shaped curve of looping orange and violet lines, traced from two nearly identical starting points. The two trails loop together at first, then drift apart and switch wings at different times.',
  tags: ['Dynamics', 'Chaos', 'Research', 'Teaching'],
  license: 'Apache-2.0',
  author: { name: 'ed.lorenz.fan' },
  modes: { desktop: true, phone: true },
  time: { length: 40, loop: true },
  context: '2d',
  libraries: [],
  params: [
    { key: 'rho', type: 'range', label: 'Rayleigh number ρ', min: 5, max: 50, step: 1, default: 28 },
  ],
  presets: [
    { id: 'fixed-point', label: 'ρ = 10, a fixed point', params: { rho: 10 }, t: 12 },
    { id: 'butterfly', label: 'ρ = 28, the butterfly', params: { rho: 28 }, t: 20 },
    { id: 'transient', label: 'ρ = 20, transient chaos', params: { rho: 20 }, t: 10 },
  ],

  draw(ctx, t, params, env, S) {
    const C = env.colors, { w, h } = env.box, phone = env.device === 'phone', rho = params.rho;
    const n = Math.max(0, Math.min(NMAX, Math.floor(t * RATE + 1e-6)));
    advance(S, rho, n);
    const p = S.p;

    const fs = fsFor(env.box), top = fs * 3, foot = fs * 1.8, avail = h - top - foot;
    const H = 2.7 * Math.sqrt(8 / 3 * (rho - 1)) + 2, sc = Math.max(0.5, Math.min(w / (2 * H), avail / (1.75 * rho)) * 0.97);
    const cx = w / 2, cy = top + avail / 2, zc = 0.87 * rho, ph = t * 0.12, ca = Math.cos(ph), sa = Math.sin(ph);
    const X = j => cx + sc * (p[j] * ca + p[j + 1] * sa), Y = j => cy - sc * (p[j + 2] - zc);

    const last = n - n % EVERY, count = Math.min(TRAIL, Math.floor(last / EVERY) + 1);
    const trail = (o, col) => {
      if (count < 2) return;
      const chunks = 5, per = Math.ceil(count / chunks);
      ctx.lineWidth = 1.2; ctx.lineJoin = 'round';
      for (let c = 0; c < chunks; c++) {
        const i0 = c * per, i1 = Math.min(count - 1, (c + 1) * per);
        if (i1 <= i0) break;
        ctx.strokeStyle = rgba(col, 0.1 + 0.22 * c);
        ctx.beginPath();
        for (let i = i0; i <= i1; i++) {
          const j = 6 * (last - (count - 1 - i) * EVERY) + o;
          i === i0 ? ctx.moveTo(X(j), Y(j)) : ctx.lineTo(X(j), Y(j));
        }
        ctx.stroke();
      }
    };
    trail(3, C.secondary); trail(0, C.main);
    const head = (o, col) => {
      const j = 6 * n + o;
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(X(j), Y(j), 4.5, 0, Math.PI * 2); ctx.fill();
    };
    head(3, C.secondary); head(0, C.main);

    const j = 6 * n, gap = Math.hypot(p[j] - p[j + 3], p[j + 1] - p[j + 4], p[j + 2] - p[j + 5]);
    label(ctx, env, phone ? 'Lorenz, σ = 10, β = 8/3' : 'Lorenz system, σ = 10, β = 8/3', 0, fs * 1.2, { size: fs + 1, weight: 700 });
    label(ctx, env, `ρ = ${rho}   t = ${(n * DT).toFixed(1)}`, 0, fs * 2.5, { size: fs, alpha: 0.75 });
    label(ctx, env, `gap between the two runs: ${gap.toFixed(3)}`, 0, h - 6, { size: fs, weight: 700, color: gap > 1 ? C.main : C.secondary });
  },
};
