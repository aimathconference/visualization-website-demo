const COLORS = { main: '#facc15', secondary: '#60a5fa', bg: '#050508', fg: '#ecebf5' };

import { rgba, label, fsFor, mulberry32 } from '@eigenreel/kit';

// The loop is 60 s: ball i is released at i·GAP (the last at 44.9 s), falls SPEED rows a second, and lands
// (rows + 1)/SPEED seconds later. After the last one lands the full histogram holds until the loop wraps.
const N = 600, GAP = 0.075, SPEED = 8;

// Every ball's path is decided up front by mulberry32 seeded from (seed, rows), so the board at t is the set
// of balls released by t: those that have landed, in their bins, and those still in flight. The cache in S
// depends on the params alone.
function paths(S, rows, seed) {
  const key = rows + ':' + seed;
  if (S.key === key) return;
  S.key = key;
  const W = rows + 1, rnd = mulberry32(seed * 131 + rows);
  S.off = new Int8Array(N * W);   // S.off[i·W + k]: rightward bounces of ball i after k rows
  S.fin = new Int16Array(N);      // its bin
  for (let i = 0; i < N; i++) {
    let s = 0;
    for (let k = 0; k < rows; k++) { s += rnd() < 0.5 ? 1 : 0; S.off[i * W + k + 1] = s; }
    S.fin[i] = s;
  }
  S.pmf = new Float64Array(W);
  let c = 1;
  for (let j = 0; j <= rows; j++) { S.pmf[j] = c / Math.pow(2, rows); c = c * (rows - j) / (j + 1); }
  S.cnt = new Int32Array(W);
}

export default {
  title: 'A Galton board and the bell curve',
  hook: 'Each ball bounces left or right at every peg. Pile up enough of them and the histogram becomes a Gaussian.',
  alt: 'A triangle of pegs with small balls bouncing down through it, one after another. At the bottom the balls stack into blue bins that gradually form a symmetric bell shape matching a yellow curve drawn over them.',
  tags: ['Probability', 'Statistics', 'Teaching'],
  license: 'MIT',
  author: { name: 'demoivre.hall' },
  modes: { desktop: true, phone: true },
  time: { length: 60, loop: true },
  context: '2d',
  libraries: [],
  params: [
    { key: 'rows', type: 'range', label: 'Rows of pegs', min: 4, max: 16, step: 1, default: 12 },
    { key: 'seed', type: 'range', label: 'Random seed', min: 1, max: 9999, step: 1, default: 1 },
  ],
  presets: [
    { id: 'early', label: '12 rows, the first 60 balls', params: { rows: 12 }, t: 6.5 },
    { id: 'sixteen', label: '16 rows, all 600 balls', params: { rows: 16 }, t: 55 },
    { id: 'pascal', label: "4 rows, Pascal's row", params: { rows: 4 }, t: 55 },
    { id: 'another-seed', label: '16 rows, another seed', params: { rows: 16, seed: 2024 }, t: 55 },
  ],

  draw(ctx, t, params, env, S) {
    const C = env.colors, { w, h } = env.box, L = params.rows, W = L + 1;
    paths(S, L, params.seed);
    const off = S.off, cnt = S.cnt, pmf = S.pmf;

    const fs = fsFor(env.box), top = fs * 3, foot = fs * 1.8, avail = h - top - foot;
    const cx = w / 2, sx = Math.min(w / (L + 2), 28), sy = avail * 0.5 / (L + 1), y0 = top;
    const hTop = y0 + (L + 1) * sy, hBase = h - foot, hH = Math.max(1, hBase - hTop), pegR = Math.max(1.5, sx * 0.09);

    ctx.fillStyle = rgba(C.fg, 0.45);
    ctx.beginPath();
    for (let r = 0; r < L; r++) for (let j = 0; j <= r; j++) {
      const px = cx + (j - r / 2) * sx, py = y0 + (r + 1) * sy;
      ctx.moveTo(px + pegR, py); ctx.arc(px, py, pegR, 0, Math.PI * 2);
    }
    ctx.fill();

    // landed balls: released at i·GAP, landed once (L + 1)/SPEED seconds have passed
    const tLand = (L + 1) / SPEED;
    cnt.fill(0);
    let landed = 0;
    for (let i = 0; i < N; i++) {
      const tf = t - i * GAP;
      if (tf < 0) break;
      if (tf >= tLand) { cnt[S.fin[i]]++; landed++; }
    }
    const unit = hH / (N * pmf[L >> 1] * 1.12), bw = sx * 0.86;
    ctx.fillStyle = rgba(C.secondary, 0.75);
    for (let j = 0; j <= L; j++) {
      const bh = Math.min(hH, cnt[j] * unit);
      ctx.fillRect(cx + (j - L / 2) * sx - bw / 2, hBase - bh, bw, bh);
    }
    ctx.strokeStyle = rgba(C.fg, 0.5); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cx - (L / 2 + 1) * sx, hBase + 0.5); ctx.lineTo(cx + (L / 2 + 1) * sx, hBase + 0.5); ctx.stroke();

    // the normal density with the binomial's mean and variance, scaled to the balls landed so far
    if (landed > 3) {
      const sg = Math.sqrt(L) / 2, amp = landed / (Math.sqrt(2 * Math.PI) * sg);
      ctx.strokeStyle = C.main; ctx.lineWidth = 2; ctx.lineJoin = 'round';
      ctx.beginPath();
      for (let i = 0; i <= 60; i++) {
        const u = (i / 60 - 0.5) * (L + 2), y = hBase - Math.min(hH * 1.1, amp * Math.exp(-u * u / (2 * sg * sg)) * unit);
        i ? ctx.lineTo(cx + u * sx, y) : ctx.moveTo(cx + u * sx, y);
      }
      ctx.stroke();
    }

    // balls in flight, easing sideways between pegs
    const br = Math.max(2, sx * 0.2);
    ctx.fillStyle = C.fg;
    ctx.beginPath();
    for (let i = 0; i < N; i++) {
      const tf = t - i * GAP;
      if (tf < 0) break;
      const q = tf * SPEED;
      if (q >= L + 1) continue;
      const r = q - 1;
      let bx = cx;
      if (r >= 0) {
        const k = Math.floor(r), f = r - k, sm = f * f * (3 - 2 * f);
        const a = off[i * W + k] - k / 2, b = off[i * W + k + 1] - (k + 1) / 2;
        bx = cx + (a + (b - a) * sm) * sx;
      }
      const by = y0 + q * sy;
      ctx.moveTo(bx + br, by); ctx.arc(bx, by, br, 0, Math.PI * 2);
    }
    ctx.fill();

    label(ctx, env, `Galton board, ${L} rows`, 0, fs * 1.2, { size: fs + 1, weight: 700 });
    label(ctx, env, `${landed} of ${N} balls landed · seed ${params.seed}`, 0, fs * 2.5, { size: fs, alpha: 0.75 });
    label(ctx, env, `Binomial(${L}, ½) ≈ N(${L / 2}, ${L / 4}),  σ = ${(Math.sqrt(L) / 2).toFixed(2)} bins`, 0, h - 6, { size: fs - 1, weight: 700, color: C.main });
  },
};
