const COLORS = { main: '#fb7185', secondary: '#93c5fd', bg: '#050508', fg: '#ecebf5' };

import { rgba, label, fsFor } from '@eigenreel/kit';

// Equal masses, rods of length 1, g = 9.81. State y = (θ₁, θ₂, θ₁′, θ₂′).
const G = 9.81, DT = 0.005, NMAX = 4800;   // NMAX = 24 s / DT: the whole loop
const EVERY = 3, TRAIL = 360;                       // the trail: one point every 3 steps, the last 360 of them

function deriv(y, o) {
  const d = y[0] - y[1], den = 3 - Math.cos(2 * d), s = Math.sin(d), c = Math.cos(d);
  o[0] = y[2]; o[1] = y[3];
  o[2] = (-3 * G * Math.sin(y[0]) - G * Math.sin(y[0] - 2 * y[1]) - 2 * s * (y[3] * y[3] + y[2] * y[2] * c)) / den;
  o[3] = (2 * s * (2 * y[2] * y[2] + 2 * G * Math.cos(y[0]) + y[3] * y[3] * c)) / den;
}

function rk4(y, dt, K) {
  const [k1, k2, k3, k4, u] = K;
  deriv(y, k1);
  for (let i = 0; i < 4; i++) u[i] = y[i] + dt / 2 * k1[i];
  deriv(u, k2);
  for (let i = 0; i < 4; i++) u[i] = y[i] + dt / 2 * k2[i];
  deriv(u, k3);
  for (let i = 0; i < 4; i++) u[i] = y[i] + dt * k3[i];
  deriv(u, k4);
  for (let i = 0; i < 4; i++) y[i] += dt / 6 * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]);
}

// The cache holds the angles of both pendulums at every step from 0 to S.n. It depends on th alone: a new th
// starts it again from t = 0, a later t extends it forward, an earlier t just reads what is already there.
function advance(S, th, n) {
  if (S.th !== th) {
    const a = th * Math.PI / 180;
    S.th = th; S.n = 0;
    S.A = new Float64Array([a, 0, 0, 0]);
    S.B = new Float64Array([a + 0.001, 0, 0, 0]);
    S.K = [0, 1, 2, 3, 4].map(() => new Float64Array(4));
    S.ang = new Float64Array(4 * (NMAX + 1));
    S.ang[0] = S.A[0]; S.ang[1] = S.A[1]; S.ang[2] = S.B[0]; S.ang[3] = S.B[1];
  }
  while (S.n < n) {
    rk4(S.A, DT, S.K); rk4(S.B, DT, S.K); S.n++;
    const j = 4 * S.n;
    S.ang[j] = S.A[0]; S.ang[j + 1] = S.A[1]; S.ang[j + 2] = S.B[0]; S.ang[j + 3] = S.B[1];
  }
}

export default {
  title: 'Two double pendulums, one thousandth apart',
  hook: 'Start two double pendulums 0.001 rad apart. For a few seconds they agree. Then they have nothing to do with each other.',
  alt: 'Two double pendulums hang from one pivot, drawn in pink and blue, one on top of the other. At first they swing together; after a few seconds they part and the glowing trails behind their tips tangle apart.',
  tags: ['Dynamics', 'Chaos', 'Mechanics', 'Teaching'],
  license: 'BSD-3-Clause',
  author: { name: 'levien.tan' },
  modes: { desktop: true, phone: true },
  time: { length: 24, loop: true },
  context: '2d',
  libraries: [],
  params: [
    { key: 'th', type: 'range', label: 'Initial angle θ₁', min: 20, max: 175, step: 5, default: 135, format: '{}°' },
  ],
  presets: [
    { id: 'small-swings', label: 'θ₁ = 20°, small swings', params: { th: 20 }, t: 12 },
    { id: 'parting', label: 'θ₁ = 135°, the moment they part', params: { th: 135 }, t: 9 },
    { id: 'over-the-top', label: 'θ₁ = 175°, nearly upside down', params: { th: 175 }, t: 6 },
  ],

  draw(ctx, t, params, env, S) {
    const C = env.colors, { w, h } = env.box, phone = env.device === 'phone';
    const n = Math.max(0, Math.min(NMAX, Math.floor(t / DT + 1e-6)));
    advance(S, params.th, n);
    const ang = S.ang;

    const fs = fsFor(env.box), top = fs * 3, foot = fs * 1.8, avail = h - top - foot;
    const k = Math.max(10, Math.min(w, avail) / 4 * 0.96), ox = w / 2, oy = top + avail / 2;
    const tip = (m, o) => {
      const j = 4 * m + o;
      return [ox + (Math.sin(ang[j]) + Math.sin(ang[j + 1])) * k, oy + (Math.cos(ang[j]) + Math.cos(ang[j + 1])) * k];
    };

    // trails of the lower bobs: sample steps aligned to multiples of EVERY, oldest first, fading in
    const last = n - n % EVERY, count = Math.min(TRAIL, Math.floor(last / EVERY) + 1);
    const trail = (o, col) => {
      if (count < 2) return;
      const chunks = 4, per = Math.ceil(count / chunks);
      ctx.lineWidth = 1.5; ctx.lineJoin = 'round';
      for (let c = 0; c < chunks; c++) {
        const i0 = c * per, i1 = Math.min(count - 1, (c + 1) * per);
        if (i1 <= i0) break;
        ctx.strokeStyle = rgba(col, 0.12 + 0.22 * c);
        ctx.beginPath();
        for (let i = i0; i <= i1; i++) {
          const [x, y] = tip(last - (count - 1 - i) * EVERY, o);
          i === i0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    };
    trail(2, C.secondary); trail(0, C.main);

    const rod = (o, col) => {
      const j = 4 * n + o;
      const x1 = ox + Math.sin(ang[j]) * k, y1 = oy + Math.cos(ang[j]) * k;
      const x2 = x1 + Math.sin(ang[j + 1]) * k, y2 = y1 + Math.cos(ang[j + 1]) * k;
      ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(x1, y1, 4.5, 0, Math.PI * 2); ctx.arc(x2, y2, 5.5, 0, Math.PI * 2); ctx.fill();
      return [x2, y2];
    };
    const q2 = rod(2, rgba(C.secondary, 0.85)), q1 = rod(0, C.main);
    ctx.fillStyle = C.fg;
    ctx.beginPath(); ctx.arc(ox, oy, 4, 0, Math.PI * 2); ctx.fill();

    const sep = Math.hypot(q1[0] - q2[0], q1[1] - q2[1]) / k;
    label(ctx, env, phone ? 'θ₁ differs by 0.001 rad' : 'Two double pendulums, θ₁ differs by 0.001 rad', 0, fs * 1.2, { size: fs, weight: 700 });
    label(ctx, env, `θ₁(0) = ${params.th}°   t = ${(n * DT).toFixed(1)} s`, 0, fs * 2.5, { size: fs, alpha: 0.75 });
    label(ctx, env, `tip separation ${sep.toFixed(3)} rod lengths`, 0, h - 6, { size: fs, weight: 700, color: sep > 0.2 ? C.main : C.secondary });
  },
};
