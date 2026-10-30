// Seed visualization (from the mockup). Same module format as the Playground and the practice registry.
export default {
  title: 'Multiplication tables on a circle',
  hook: 'Connect i to k·i mod n and a cardioid appears. Keep going and it grows cusps.',
  tags: ['Number theory', 'Modular arithmetic', 'Geometry', 'Teaching'],
  license: 'MIT',
  t0: 0,
  param: { key: 'n', label: 'Points on the circle', min: 20, max: 400, step: 10, value: 200 },
  draw(ctx, w, h, t, P, S, B) {
    ctx.fillStyle = P.bg; ctx.fillRect(0, 0, w, h);
    const n = P.param, k = 2 + (t * 0.18) % 60, fs = fsFor(B);
    const cx = B.x + B.w / 2, cy = B.y + B.h / 2 + (P.labels ? fs : 0), R = Math.min(B.w, B.h - (P.labels ? fs * 2 : 0)) * 0.46;
    const pt = a => [cx + R * Math.cos(a - Math.PI / 2), cy + R * Math.sin(a - Math.PI / 2)];
    ctx.strokeStyle = rgba(P.fg, 0.35); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
    const c1 = hex(P.a1), c2 = hex(P.a2), batches = 10;
    ctx.lineWidth = Math.max(0.4, P.lw * 0.55);
    for (let b = 0; b < batches; b++) {
      const c = mix(c1, c2, Math.abs(b - (batches - 1) / 2) / ((batches - 1) / 2));
      ctx.strokeStyle = `rgba(${c.map(Math.round).join()},0.62)`; ctx.beginPath();
      for (let i = Math.floor(b * n / batches); i < Math.floor((b + 1) * n / batches); i++) {
        const p1 = pt(2 * Math.PI * i / n), p2 = pt(2 * Math.PI * ((k * i) % n) / n);
        ctx.moveTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]);
      }
      ctx.stroke();
    }
    label(ctx, P, 'i ↦ k·i mod n', B.x, B.y + fs, { size: fs + 1, weight: 700 });
    label(ctx, P, `k = ${k.toFixed(2)}    n = ${n}`, B.x, B.y + fs * 2.3, { size: fs, alpha: .75 });
    const m = Math.round(k);
    if (Math.abs(k - m) < 0.07) {
      const name = m === 2 ? 'cardioid' : m === 3 ? 'nephroid' : `epicycloid, ${m - 1} cusps`;
      label(ctx, P, name, B.x + B.w, B.y + fs, { size: fs + 1, weight: 700, color: P.a1, align: 'right' });
    }
  },
};
