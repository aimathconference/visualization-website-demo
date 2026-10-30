// Seed visualization (from the mockup). Same module format as the Playground and the practice registry.
export default {
  title: 'Julia sets on a circle of parameters',
  hook: 'As c circles the origin, the Julia set of z² + c shatters into dust and reassembles.',
  tags: ['Complex dynamics', 'Fractals', 'Research'],
  license: 'BSD-3-Clause',
  t0: 6,
  param: { key: 'iter', label: 'Iteration limit', min: 20, max: 200, step: 10, value: 70 },
  draw(ctx, w, h, t, P, S, B) {
    ctx.fillStyle = P.bg; ctx.fillRect(0, 0, w, h);
    const cols = Math.max(90, Math.min(260, Math.round(B.w / 2.6))), rows = Math.max(60, Math.round(cols * B.h / B.w));
    if (!S.cv || S.cv.width !== cols || S.cv.height !== rows) {
      S.cv = document.createElement('canvas'); S.cv.width = cols; S.cv.height = rows; S.c = S.cv.getContext('2d'); S.img = S.c.createImageData(cols, rows);
    }
    const lk = [P.bg, P.fg, P.a1, P.a2].join();
    if (S.lk !== lk) {
      S.lk = lk; S.lut = new Uint8ClampedArray(256 * 3);
      const st = [[0, hex(P.bg)], [.32, hex(P.a2)], [.68, hex(P.a1)], [1, hex(P.fg)]];
      for (let i = 0; i < 256; i++) {
        const v = i / 255; let j = 0; while (j < st.length - 2 && v > st[j + 1][0]) j++;
        const c = mix(st[j][1], st[j + 1][1], (v - st[j][0]) / (st[j + 1][0] - st[j][0])); S.lut[i * 3] = c[0]; S.lut[i * 3 + 1] = c[1]; S.lut[i * 3 + 2] = c[2];
      }
      S.inner = mix(hex(P.bg), hex(P.fg), 0.09);
    }
    const th = 0.6 + t * 0.12, cr = 0.7885 * Math.cos(th), ci = 0.7885 * Math.sin(th);
    const maxIt = P.param, sc = 3.1 / Math.min(cols, rows), d = S.img.data, lut = S.lut, inn = S.inner;
    let p = 0;
    for (let j = 0; j < rows; j++) {
      const y0 = (j - rows / 2) * sc;
      for (let i = 0; i < cols; i++) {
        let x = (i - cols / 2) * sc, y = y0, x2 = x * x, y2 = y * y, n = 0;
        while (n < maxIt && x2 + y2 < 16) { y = 2 * x * y + ci; x = x2 - y2 + cr; x2 = x * x; y2 = y * y; n++; }
        if (n >= maxIt) { d[p] = inn[0]; d[p + 1] = inn[1]; d[p + 2] = inn[2]; }
        else { const mu = n + 1 - Math.log(Math.log(Math.sqrt(x2 + y2))) / Math.LN2; const v = Math.min(1, Math.max(0, Math.sqrt(Math.max(0, mu) / maxIt) * 1.15)); const li = (v * 255 | 0) * 3; d[p] = lut[li]; d[p + 1] = lut[li + 1]; d[p + 2] = lut[li + 2]; }
        d[p + 3] = 255; p += 4;
      }
    }
    S.c.putImageData(S.img, 0, 0); ctx.imageSmoothingEnabled = true; ctx.drawImage(S.cv, B.x, B.y, B.w, B.h);
    let zr = 0, zi = 0, n = 0; while (n < maxIt && zr * zr + zi * zi < 4) { const tmp = zr * zr - zi * zi + cr; zi = 2 * zr * zi + ci; zr = tmp; n++; }
    const fs = fsFor(B);
    label(ctx, P, 'z ↦ z² + c', B.x, B.y + fs, { size: fs + 1, weight: 700 });
    label(ctx, P, `c = ${cr.toFixed(3)} ${ci < 0 ? '−' : '+'} ${Math.abs(ci).toFixed(3)}i`, B.x, B.y + fs * 2.3, { size: fs, alpha: .8 });
    label(ctx, P, n >= maxIt ? 'c ∈ M  ·  J_c connected' : 'c ∉ M  ·  J_c is a Cantor set', B.x, B.y + B.h - 6, { size: fs, weight: 700, color: n >= maxIt ? P.a2 : P.a1 });
  },
};
