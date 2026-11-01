const COLORS = {
  main: '#f87171',
  secondary: '#67e8f9',
  bg: '#050508',
  fg: '#ecebf5',
};

import { hex, mix, rgba, label, fsFor } from '@eigenreel/kit';

const LW = 2;
const RATE = 4;        // cobweb iterates per second
const MAX_ITER = 60;   // the cobweb stops after this many iterates
const X0 = 0.2;

function makeCanvas(w, h) {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; return cv;
}

/* The bifurcation diagram, w × h pixels: for each column's r in [2.5, 4], start at x = 0.5, discard 300 iterates and
   count where the next 400 land. Brighter pixels are visited more often; the hue runs from secondary to main. */
function logisticField(w, h, C) {
  const cv = makeCanvas(w, h);
  const c = cv.getContext('2d'), img = c.createImageData(w, h), d = img.data, cnt = new Uint16Array(w * h);
  for (let i = 0; i < w; i++) {
    const r = 2.5 + 1.5 * i / (w - 1); let x = 0.5;
    for (let k = 0; k < 300; k++) x = r * x * (1 - x);
    for (let k = 0; k < 400; k++) { x = r * x * (1 - x); cnt[Math.max(0, Math.min(h - 1, Math.floor((1 - x) * h))) * w + i]++; }
  }
  const bg = hex(C.bg), c1 = hex(C.secondary), c2 = hex(C.main);
  for (let i = 0; i < w; i++) {
    const hue = mix(c1, c2, i / (w - 1));
    for (let j = 0; j < h; j++) {
      const k = j * w + i, v = Math.min(1, Math.pow(cnt[k] / 14, 0.45)), col = mix(bg, hue, v);
      d[k * 4] = col[0]; d[k * 4 + 1] = col[1]; d[k * 4 + 2] = col[2]; d[k * 4 + 3] = 255;
    }
  }
  c.putImageData(img, 0, 0);
  return cv;
}

export default {
  title: 'The road to chaos in the logistic map',
  hook: 'One parabola, one knob. Turn r up and a steady state splits into 2, 4, 8 cycles, then chaos, then a window of order.',
  alt: 'Top: a bifurcation diagram, a branching tree of dots that splits from one curve into two, four, then a dense cloud, with a vertical marker at the chosen r. Bottom: a parabola and a diagonal line with a staircase path that bounces between them.',
  tags: ['Dynamics', 'Chaos', 'Teaching', 'Research'],
  license: 'MIT',
  author: { name: 'may.iterates' },

  modes: { desktop: true, phone: true },
  time: { length: 16, loop: true },
  context: '2d',
  libraries: [],

  params: [
    { key: 'r', type: 'range', label: 'Growth rate r', min: 2.5, max: 4, step: 0.01, default: 3.83 },
  ],
  presets: [
    { id: 'r-2-80', label: 'r = 2.80, a spiral in', params: { r: 2.8 }, t: 15 },
    { id: 'r-3-00', label: 'r = 3.00, the first split', params: { r: 3 }, t: 15 },
    { id: 'r-3-20', label: 'r = 3.20, a 2-cycle', params: { r: 3.2 } },
    { id: 'r-3-50', label: 'r = 3.50, a 4-cycle', params: { r: 3.5 }, t: 15 },
    { id: 'r-3-82', label: 'r = 3.82, intermittency', params: { r: 3.82 } },
    { id: 'r-4', label: 'r = 4.00, coin flips', params: { r: 4 } },
  ],

  draw(ctx, t, params, env, S) {
    const B = env.box, C = env.colors, r = params.r, fs = fsFor(B), top = fs * 2.8, foot = fs * 1.8;
    const avail = B.h - top - foot, hb = Math.max(40, Math.round(avail * 0.44)), bw = Math.max(60, Math.round(B.w)), by = top;

    // the bifurcation diagram, rebuilt only when its size or colors change
    const key = [bw, hb, C.bg, C.main, C.secondary].join();
    if (S.fieldKey !== key) { S.fieldKey = key; S.field = logisticField(bw, hb, C); }
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(S.field, 0, by, B.w, hb);
    ctx.strokeStyle = rgba(C.fg, 0.3); ctx.lineWidth = 1; ctx.strokeRect(0.5, by + 0.5, B.w - 1, hb - 1);
    const RX = q => (q - 2.5) / 1.5 * B.w;
    ctx.strokeStyle = rgba(C.fg, 0.2); ctx.beginPath();
    for (const q of [3, 3.5699, 3.8284]) { ctx.moveTo(RX(q), by + hb); ctx.lineTo(RX(q), by + hb - 6); }
    ctx.stroke();
    ctx.strokeStyle = C.fg; ctx.lineWidth = Math.max(1, LW * 0.8);
    ctx.beginPath(); ctx.moveTo(RX(r), by); ctx.lineTo(RX(r), by + hb); ctx.stroke();
    label(ctx, env, 'chaos begins', RX(3.5699) - 4, by + fs, { size: fs - 3, alpha: 0.7, align: 'right' });
    label(ctx, env, 'period 3', RX(3.8284) + 5, by + hb - 9, { size: fs - 3, alpha: 0.7, align: 'left' });

    // the cobweb: four iterates a second from x0 = 0.2, up to 60
    const cy0 = by + hb + fs * 1.2, hc = B.h - foot - cy0, sc = Math.max(30, Math.min(hc, B.w)), cx0 = (B.w - sc) / 2;
    const X = x => cx0 + x * sc, Y = y => cy0 + sc - y * sc;
    ctx.strokeStyle = rgba(C.fg, 0.3); ctx.lineWidth = 1; ctx.strokeRect(cx0 + 0.5, cy0 + 0.5, sc - 1, sc - 1);
    ctx.beginPath(); ctx.moveTo(X(0), Y(0)); ctx.lineTo(X(1), Y(1)); ctx.stroke();
    ctx.strokeStyle = C.fg; ctx.lineWidth = LW * 1.3; ctx.beginPath();
    for (let i = 0; i <= 60; i++) { const x = i / 60, y = r * x * (1 - x); i ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y)); }
    ctx.stroke();
    const steps = Math.max(0, Math.min(MAX_ITER, Math.floor(t * RATE)));
    let x = X0;
    ctx.strokeStyle = rgba(C.main, 0.9); ctx.lineWidth = Math.max(1, LW * 0.9); ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(X(x), Y(0));
    for (let i = 0; i < steps; i++) { const y = r * x * (1 - x); ctx.lineTo(X(x), Y(y)); ctx.lineTo(X(y), Y(y)); x = y; }
    ctx.stroke();
    ctx.beginPath(); ctx.arc(X(x), Y(steps ? x : 0), 4, 0, Math.PI * 2); ctx.fillStyle = C.main; ctx.fill();

    const reg = r < 3 ? 'one stable fixed point' : r < 3.4495 ? 'period 2' : r < 3.5441 ? 'period 4'
      : r < 3.5699 ? 'period 8, 16, …' : (r > 3.8284 && r < 3.8415) ? 'period-3 window' : 'mostly chaotic';
    label(ctx, env, 'xₙ₊₁ = r·xₙ(1 − xₙ)', 0, fs, { size: fs + 1, weight: 700 });
    label(ctx, env, `r = ${r.toFixed(2)}   iterate ${steps}`, 0, fs * 2.3, { size: fs, alpha: 0.75 });
    label(ctx, env, reg, 0, B.h - 6, { size: fs, weight: 700, color: C.secondary });
  },
};
