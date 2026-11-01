const COLORS = {
  main: '#fde047',
  secondary: '#c084fc',
  bg: '#050508',
  fg: '#ecebf5',
};

import { hex, mix, label, fsFor } from '@eigenreel/kit';

export default {
  title: 'Julia sets on a circle of parameters',
  hook: 'As c circles the origin, the Julia set of z² + c shatters into dust and reassembles.',
  alt: 'A detailed fractal shape in warm and cool colors with a two-fold symmetry. As a point moves around a circle, the shape tears apart into scattered dust and then joins back into one connected piece.',
  tags: ['Complex dynamics', 'Fractals', 'Research'],
  license: 'BSD-3-Clause',
  author: { name: 'fatou.dust' },

  modes: { desktop: true, phone: true },
  time: { length: 52, loop: true },
  context: '2d',
  libraries: [],

  params: [
    { key: 'iter', type: 'range', label: 'Iteration limit', min: 20, max: 200, step: 10, default: 70 },
  ],
  presets: [
    { id: 'connected', label: 'c = −0.7885, connected', params: { iter: 70 }, t: 21.034 },
    { id: 'dust', label: 'c = 0.7885, dust', params: { iter: 70 }, t: 47.034 },
    { id: 'edge-70', label: 'Near the edge of M, 70 iterations', params: { iter: 70 }, t: 10.54 },
    { id: 'edge-200', label: 'Same c, 200 iterations', params: { iter: 200 }, t: 10.54 },
  ],

  setup(env, S) {
    // the color ramp: bg, then secondary, main and fg as the escape time grows
    const C = env.colors;
    S.lut = new Uint8ClampedArray(256 * 3);
    const st = [[0, hex(C.bg)], [0.32, hex(C.secondary)], [0.68, hex(C.main)], [1, hex(C.fg)]];
    for (let i = 0; i < 256; i++) {
      const v = i / 255;
      let j = 0;
      while (j < st.length - 2 && v > st[j + 1][0]) j++;
      const c = mix(st[j][1], st[j + 1][1], (v - st[j][0]) / (st[j + 1][0] - st[j][0]));
      S.lut[i * 3] = c[0]; S.lut[i * 3 + 1] = c[1]; S.lut[i * 3 + 2] = c[2];
    }
    S.inner = mix(hex(C.bg), hex(C.fg), 0.09);
  },

  draw(ctx, t, params, env, S) {
    const { w, h } = env.box, C = env.colors;
    // a low-resolution image, scaled up smoothly
    const cols = Math.max(90, Math.min(260, Math.round(w / 2.6)));
    const rows = Math.max(60, Math.round(cols * h / w));
    if (!S.cv || S.cv.width !== cols || S.cv.height !== rows) {
      S.cv = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(cols, rows) : document.createElement('canvas');
      S.cv.width = cols; S.cv.height = rows;
      S.c = S.cv.getContext('2d');
      S.img = S.c.createImageData(cols, rows);
      S.key = '';
    }
    // c goes once around the circle |c| = 0.7885 per loop, starting at angle 0.6
    const th = 0.6 + 2 * Math.PI * t / 52, cr = 0.7885 * Math.cos(th), ci = 0.7885 * Math.sin(th);
    const maxIt = params.iter;
    const key = cols + ',' + rows + ',' + maxIt + ',' + t;
    if (S.key !== key) {
      S.key = key;
      const sc = 3.1 / Math.min(cols, rows), d = S.img.data, lut = S.lut, inn = S.inner;
      let p = 0;
      for (let j = 0; j < rows; j++) {
        const y0 = (j - rows / 2) * sc;
        for (let i = 0; i < cols; i++) {
          let x = (i - cols / 2) * sc, y = y0, x2 = x * x, y2 = y * y, n = 0;
          while (n < maxIt && x2 + y2 < 16) { y = 2 * x * y + ci; x = x2 - y2 + cr; x2 = x * x; y2 = y * y; n++; }
          if (n >= maxIt) { d[p] = inn[0]; d[p + 1] = inn[1]; d[p + 2] = inn[2]; }
          else {
            const mu = n + 1 - Math.log(Math.log(Math.sqrt(x2 + y2))) / Math.LN2;
            const v = Math.min(1, Math.max(0, Math.sqrt(Math.max(0, mu) / maxIt) * 1.15));
            const li = (v * 255 | 0) * 3;
            d[p] = lut[li]; d[p + 1] = lut[li + 1]; d[p + 2] = lut[li + 2];
          }
          d[p + 3] = 255; p += 4;
        }
      }
      S.c.putImageData(S.img, 0, 0);
    }
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(S.cv, 0, 0, w, h);

    // is c in the Mandelbrot set, as far as maxIt iterations of the critical orbit can tell?
    let zr = 0, zi = 0, n = 0;
    while (n < maxIt && zr * zr + zi * zi < 4) { const tmp = zr * zr - zi * zi + cr; zi = 2 * zr * zi + ci; zr = tmp; n++; }
    const inM = n >= maxIt;
    const fs = fsFor(env.box);
    label(ctx, env, 'z ↦ z² + c', 0, fs * 1.1, { size: fs + 1, weight: 700 });
    label(ctx, env, `c = ${cr.toFixed(3)} ${ci < -0.0005 ? '−' : '+'} ${Math.abs(ci).toFixed(3)}i`, 0, fs * 2.4, { size: fs, alpha: 0.8 });
    label(ctx, env, inM ? 'c ∈ M  ·  J_c connected' : 'c ∉ M  ·  J_c is a Cantor set', 0, h - 6,
      { size: fs, weight: 700, color: inM ? C.secondary : C.main });
  },
};
