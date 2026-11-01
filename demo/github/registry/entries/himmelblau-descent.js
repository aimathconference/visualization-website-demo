const COLORS = {
  main: '#a3e635',
  secondary: '#d8b4fe',
  bg: '#050508',
  fg: '#ecebf5',
};

import { hex, mix, rgba, label, fsFor } from '@eigenreel/kit';

const RUN = 10;          // seconds per run; the loop holds four runs from rotated start circles
const RATE = 45;         // descent steps per second
const MAX_STEPS = 360;   // each run stops after this many steps
const WALKERS = 12;
const BETA = 0.85;
const LW = 2;
const MINIMA = [[3, 2], [-2.805118, 3.131312], [-3.779310, -3.283186], [3.584428, -1.848126]];

function himmelblau(x, y) { return (x * x + y - 11) ** 2 + (x + y * y - 7) ** 2; }
function himmelGrad(x, y) { const A = x * x + y - 11, C = x + y * y - 7; return [4 * x * A + 2 * C, 2 * A + 4 * y * C]; }

function makeCanvas(w, h) {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; return cv;
}

/* The contour map on [−5, 5]², n × n pixels: shaded by log(1 + f), with a line where the band changes. */
function himmelField(n, C) {
  n = Math.max(60, Math.min(640, n));
  const cv = makeCanvas(n, n);
  const c = cv.getContext('2d'), img = c.createImageData(n, n), d = img.data;
  const vals = new Float32Array(n * n), bands = new Int16Array(n * n), L = Math.log(891);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const x = -5 + 10 * (i + 0.5) / n, y = 5 - 10 * (j + 0.5) / n, v = Math.min(1, Math.log(1 + himmelblau(x, y)) / L);
    vals[j * n + i] = v; bands[j * n + i] = Math.floor(v * 18);
  }
  const bg = hex(C.bg), lo = hex(C.secondary), fg = hex(C.fg);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const k = j * n + i, v = vals[k], b = bands[k];
    let col = mix(bg, lo, 0.6 * Math.pow(1 - v, 1.6));
    if ((i < n - 1 && bands[k + 1] !== b) || (j < n - 1 && bands[k + n] !== b)) col = mix(col, fg, 0.32);
    d[k * 4] = col[0]; d[k * 4 + 1] = col[1]; d[k * 4 + 2] = col[2]; d[k * 4 + 3] = 255;
  }
  c.putImageData(img, 0, 0);
  return cv;
}

/* Heavy-ball descent for run `cycle` with step size eta, advanced to `steps` steps. The cache S.sim is a pure
   function of (eta, cycle, steps): it is extended forward as t grows and rebuilt when eta or the run changes or
   t goes backwards. */
function simulate(S, eta, cycle, steps) {
  let sim = S.sim;
  if (!sim || sim.eta !== eta || sim.cycle !== cycle || sim.steps > steps) {
    const walkers = [];
    for (let i = 0; i < WALKERS; i++) {
      const a = 2 * Math.PI * i / WALKERS + cycle * 0.37, x = 4.6 * Math.cos(a), y = 4.6 * Math.sin(a);
      walkers.push({ x, y, vx: 0, vy: 0, trail: [[x, y]] });
    }
    sim = S.sim = { eta, cycle, steps: 0, walkers };
  }
  while (sim.steps < steps) {
    for (const p of sim.walkers) {
      const g = himmelGrad(p.x, p.y), gn = Math.hypot(g[0], g[1]);
      if (gn > 60) { g[0] *= 60 / gn; g[1] *= 60 / gn; }
      p.vx = BETA * p.vx - eta * g[0]; p.vy = BETA * p.vy - eta * g[1];
      p.x = Math.max(-6, Math.min(6, p.x + p.vx)); p.y = Math.max(-6, Math.min(6, p.y + p.vy));
      p.trail.push([p.x, p.y]);
    }
    sim.steps++;
  }
  return sim;
}

export default {
  title: 'Four valleys of Himmelblau',
  hook: 'Twelve gradient-descent walkers with momentum race toward the four minima of a nonconvex function.',
  alt: 'A contour map of a landscape with four dark valleys. Twelve dots start on a ring around the middle and roll downhill, leaving trails that curve and settle into the four valleys.',
  tags: ['Optimization', 'Gradient descent', 'Multivariable calculus', 'Teaching'],
  license: 'MIT',
  author: { name: 'sofia.opt' },

  modes: { desktop: true, phone: true },
  time: { length: 40, loop: true },
  context: '2d',
  libraries: [],

  params: [
    { key: 'eta', type: 'range', label: 'Step size η', min: 0.001, max: 0.012, step: 0.001, default: 0.004 },
  ],
  presets: [
    { id: 'overshoot', label: 'Overshoot: η = 0.010', params: { eta: 0.01 }, t: 4 },
    { id: 'steepest', label: 'Steepest descent: η = 0.001', params: { eta: 0.001 }, t: 9 },
  ],

  draw(ctx, t, params, env, S) {
    const B = env.box, C = env.colors, fs = fsFor(B), top = fs * 1.6;
    const s = Math.max(40, Math.min(B.w, B.h - top * 2)), ox = (B.w - s) / 2, oy = top + (B.h - top * 2 - s) / 2;
    const X = x => ox + (x + 5) / 10 * s, Y = y => oy + (5 - y) / 10 * s;

    // the contour map, rebuilt only when its size or colors change
    const n = Math.round(s), key = [n, C.bg, C.fg, C.secondary].join();
    if (S.fieldKey !== key) { S.fieldKey = key; S.field = himmelField(n, C); }
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(S.field, ox, oy, s, s);
    ctx.strokeStyle = rgba(C.fg, 0.3); ctx.lineWidth = 1; ctx.strokeRect(ox + 0.5, oy + 0.5, s - 1, s - 1);

    // which run, and how far into it
    const eta = params.eta, tt = Math.min(Math.max(t, 0), 4 * RUN - 1e-9);
    const cycle = Math.floor(tt / RUN), local = tt - cycle * RUN;
    const sim = simulate(S, eta, cycle, Math.min(MAX_STEPS, Math.floor(local * RATE)));

    ctx.save();
    ctx.beginPath(); ctx.rect(ox, oy, s, s); ctx.clip();
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.strokeStyle = rgba(C.main, 0.9); ctx.lineWidth = LW * 1.3;
    for (const p of sim.walkers) {
      ctx.beginPath();
      p.trail.forEach(([x, y], i) => i ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y)));
      ctx.stroke();
    }
    for (const p of sim.walkers) {
      ctx.beginPath(); ctx.arc(X(p.x), Y(p.y), 3 + LW, 0, Math.PI * 2);
      ctx.fillStyle = C.fg; ctx.fill(); ctx.strokeStyle = C.main; ctx.lineWidth = 2; ctx.stroke();
    }
    ctx.strokeStyle = C.fg; ctx.lineWidth = 1.5;
    for (const [mx, my] of MINIMA) {
      ctx.beginPath();
      ctx.moveTo(X(mx) - 5, Y(my)); ctx.lineTo(X(mx) + 5, Y(my));
      ctx.moveTo(X(mx), Y(my) - 5); ctx.lineTo(X(mx), Y(my) + 5);
      ctx.stroke();
    }
    ctx.restore();

    const narrow = B.w < 420;
    label(ctx, env, narrow ? 'f = (x² + y − 11)² + (x + y² − 7)²' : 'f(x, y) = (x² + y − 11)² + (x + y² − 7)²', ox, oy - fs * 0.6, { size: fs, weight: 700 });
    label(ctx, env, `η = ${eta.toFixed(3)}  ·  β = ${BETA}  ·  run ${cycle + 1} of 4  ·  step ${sim.steps}`, ox, oy + s + fs * 1.3, { size: fs, alpha: 0.75 });
  },
};
