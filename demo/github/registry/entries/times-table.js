const COLORS = {
  main: '#ffc857',
  secondary: '#7cc6fe',
  bg: '#050508',
  fg: '#ecebf5',
};

import { hex, mix, rgba, label, fsFor } from '@eigenreel/kit';

export default {
  title: 'Multiplication tables on a circle',
  hook: 'Connect i to k·i mod n and a cardioid appears. Keep going and it grows cusps.',
  alt: 'A circle with evenly spaced points joined by straight chords. As the multiplier slowly grows, the chords form a glowing heart-shaped curve, then a two-lobed one, then curves with more and more cusps.',
  tags: ['Number theory', 'Modular arithmetic', 'Geometry', 'Teaching'],
  license: 'MIT',
  author: { name: 'circle-mod-n' },

  modes: { desktop: true, phone: true },
  time: { length: 300, loop: true },
  context: '2d',
  libraries: [],

  params: [
    { key: 'n', type: 'range', label: 'Points on the circle', min: 20, max: 400, step: 1, default: 200 },
  ],
  presets: [
    { id: 'cardioid', label: 'k = 2, the cardioid', params: { n: 200 }, t: 0 },
    { id: 'nephroid', label: 'k = 3, the nephroid', params: { n: 200 }, t: 5 },
    { id: 'inverse-of-two', label: 'n = 101, k = 51', params: { n: 101 }, t: 245 },
    { id: 'thirty', label: 'n = 30, chords not a curve', params: { n: 30 }, t: 0 },
  ],

  draw(ctx, t, params, env, S) {
    const { w, h } = env.box, C = env.colors;
    const n = params.n;
    // k sweeps from 2 to 62 over the 300-second loop, 0.2 per second
    const k = 2 + 0.2 * t;
    const fs = fsFor(env.box);
    const top = fs * 2.8;
    const cx = w / 2, cy = top + (h - top) / 2;
    const R = Math.max(10, Math.min(w, h - top) * 0.46);
    const pt = a => [cx + R * Math.cos(a - Math.PI / 2), cy + R * Math.sin(a - Math.PI / 2)];

    ctx.strokeStyle = rgba(C.fg, 0.35);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, 2 * Math.PI);
    ctx.stroke();

    // chords in ten batches, colored from secondary at the ends of the labelling to main in the middle
    const c1 = hex(C.main), c2 = hex(C.secondary), batches = 10;
    ctx.lineWidth = env.device === 'phone' ? 0.8 : 1.1;
    for (let b = 0; b < batches; b++) {
      const c = mix(c1, c2, Math.abs(b - (batches - 1) / 2) / ((batches - 1) / 2));
      ctx.strokeStyle = `rgba(${c.map(Math.round).join()},0.62)`;
      ctx.beginPath();
      for (let i = Math.floor(b * n / batches); i < Math.floor((b + 1) * n / batches); i++) {
        const p1 = pt(2 * Math.PI * i / n), p2 = pt(2 * Math.PI * ((k * i) % n) / n);
        ctx.moveTo(p1[0], p1[1]);
        ctx.lineTo(p2[0], p2[1]);
      }
      ctx.stroke();
    }

    label(ctx, env, 'i ↦ k·i mod n', 0, fs * 1.1, { size: fs + 1, weight: 700 });
    label(ctx, env, `k = ${k.toFixed(2)}    n = ${n}`, 0, fs * 2.4, { size: fs, alpha: 0.75 });
    const m = Math.round(k);
    if (Math.abs(k - m) < 0.07) {
      const name = m === 2 ? 'cardioid' : m === 3 ? 'nephroid' : `epicycloid, ${m - 1} cusps`;
      label(ctx, env, name, w - 2, fs * 1.1, { size: fs + 1, weight: 700, color: C.main, align: 'right' });
    }
  },
};
