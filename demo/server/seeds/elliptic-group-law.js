// Seed visualization (from the mockup). Same module format as the Playground and the practice registry.
export default {
  title: 'The group law on an elliptic curve',
  hook: 'A line through P and Q meets the cubic once more. Reflect that point and you have P + Q.',
  tags: ['Algebraic geometry', 'Number theory', 'Elliptic curves', 'Research', 'Teaching'],
  license: 'GPL-3.0',
  t0: 2.2,
  param: { key: 'b', label: 'Coefficient b', min: 5, max: 200, step: 5, value: 100, scale: 100, digits: 2 },
  draw(ctx, w, h, t, P, S, B) {
    ctx.fillStyle = P.bg; ctx.fillRect(0, 0, w, h);
    const a = -1, b = P.param / 100, rhs = x => x * x * x + a * x + b, fs = fsFor(B);
    const xm = 0.3, k = Math.min(B.w / 5.8, B.h / 9);
    const ox = B.x + B.w / 2, oy = B.y + B.h / 2;
    const px = x => ox + (x - xm) * k, py = y => oy - y * k;
    const xl = xm - B.w / 2 / k, xr = xm + B.w / 2 / k, yt = B.h / 2 / k;
    clipBox(ctx, B);
    ctx.strokeStyle = rgba(P.fg, 0.1); ctx.lineWidth = 1; ctx.beginPath();
    for (let g = Math.ceil(xl); g <= xr; g++) { ctx.moveTo(px(g), B.y); ctx.lineTo(px(g), B.y + B.h); }
    for (let g = Math.ceil(-yt); g <= yt; g++) { ctx.moveTo(B.x, py(g)); ctx.lineTo(B.x + B.w, py(g)); }
    ctx.stroke();
    ctx.strokeStyle = rgba(P.fg, 0.38); ctx.beginPath();
    ctx.moveTo(B.x, py(0)); ctx.lineTo(B.x + B.w, py(0)); ctx.moveTo(px(0), B.y); ctx.lineTo(px(0), B.y + B.h); ctx.stroke();
    const root = (lo, hi) => { for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; if ((rhs(lo) < 0) === (rhs(mid) < 0)) lo = mid; else hi = mid; } return (lo + hi) / 2; };
    const segs = []; let cur = null; const dx = (xr - xl) / 900;
    for (let x = xl; x <= xr + dx; x += dx) {
      const v = rhs(x);
      if (v >= 0) { if (!cur) { cur = []; if (x > xl) cur.push([root(x - dx, x), 0]); segs.push(cur); } cur.push([x, Math.sqrt(v)]); }
      else if (cur) { cur.push([root(x - dx, x), 0]); cur = null; }
    }
    ctx.strokeStyle = P.fg; ctx.lineWidth = P.lw * 1.6; ctx.lineJoin = 'round';
    for (const s of segs) for (const sg of [1, -1]) {
      ctx.beginPath(); s.forEach(([x, y], i) => i ? ctx.lineTo(px(x), py(sg * y)) : ctx.moveTo(px(x), py(sg * y))); ctx.stroke();
    }
    const r0 = segs.length ? segs[segs.length - 1][0][0] : 0;
    const xP = r0 + 0.04 + 1.9 * (1 - Math.cos(t * 0.45)) / 2, yP = Math.sqrt(Math.max(0, rhs(xP)));
    const xQ = r0 + 0.85, yQ = -Math.sqrt(Math.max(0, rhs(xQ)));
    const dot = (x, y, r, fill, stroke) => { ctx.beginPath(); ctx.arc(px(x), py(y), r, 0, Math.PI * 2); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke(); } };
    let sumTxt = 'P + Q = 𝒪';
    if (Math.abs(xP - xQ) > 1e-4) {
      const m = (yQ - yP) / (xQ - xP), x3 = m * m - xP - xQ, y3 = yP + m * (x3 - xP);
      ctx.strokeStyle = rgba(P.fg, 0.55); ctx.lineWidth = P.lw; ctx.beginPath();
      ctx.moveTo(px(xl), py(yP + m * (xl - xP))); ctx.lineTo(px(xr), py(yP + m * (xr - xP))); ctx.stroke();
      ctx.setLineDash([5, 5]); ctx.strokeStyle = P.a2; ctx.lineWidth = P.lw * 1.2;
      ctx.beginPath(); ctx.moveTo(px(x3), py(y3)); ctx.lineTo(px(x3), py(-y3)); ctx.stroke(); ctx.setLineDash([]);
      dot(x3, y3, 5, P.bg, P.fg); dot(x3, -y3, 7, P.a2);
      label(ctx, P, 'P∗Q', px(x3) + 10, py(y3) + (y3 > 0 ? -8 : 16), { size: fs, weight: 700 });
      label(ctx, P, 'P + Q', px(x3) + 12, py(-y3) + (y3 > 0 ? 18 : -10), { size: fs + 1, weight: 700, color: P.a2 });
      sumTxt = Math.abs(m) > 9 ? 'P + Q → 𝒪, the point at infinity' : `P + Q = (${x3.toFixed(2)}, ${(-y3).toFixed(2)})`;
    }
    dot(xP, yP, 6, P.a1); dot(xQ, yQ, 6, P.a1);
    label(ctx, P, 'P', px(xP) - 6, py(yP) - 12, { size: fs + 1, weight: 700, color: P.a1, align: 'right' });
    label(ctx, P, 'Q', px(xQ) + 10, py(yQ) + 18, { size: fs + 1, weight: 700, color: P.a1 });
    ctx.restore();
    const disc = 27 * b * b - 4;
    label(ctx, P, `y² = x³ − x + ${b.toFixed(2)}`, B.x, B.y + fs, { size: fs + 1, weight: 700 });
    label(ctx, P, `Δ = ${(-16 * disc).toFixed(1)}  ·  ${disc > 0 ? 'one real component' : disc < 0 ? 'two real components' : 'singular'}`, B.x, B.y + fs * 2.3, { size: fs, alpha: .75 });
    label(ctx, P, sumTxt, B.x, B.y + B.h - 6, { size: fs, color: P.a2, weight: 700 });
  },
};
