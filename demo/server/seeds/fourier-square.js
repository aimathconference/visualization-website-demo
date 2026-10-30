// Seed visualization (from the mockup). Same module format as the Playground and the practice registry.
const COLORS = { main: '#39e991', secondary: '#ffd166', bg: '#050508', fg: '#ecebf5' };
export default {
  title: 'A square wave from spinning circles',
  hook: 'Each epicycle is one odd harmonic. Add more and watch the Gibbs overshoot refuse to shrink.',
  tags: ['Harmonic analysis', 'Fourier series', 'Teaching'],
  license: 'MIT',
  t0: 1,
  param: { key: 'N', label: 'Number of terms N', min: 1, max: 40, step: 1, value: 6 },
  draw(ctx, w, h, t, P, S, B) {
    ctx.fillStyle = P.bg; ctx.fillRect(0, 0, w, h);
    const N = P.param, fs = fsFor(B), R = Math.min(B.h * 0.2, B.w * 0.15), cx = B.x + R * 1.45, cy = B.y + B.h / 2, om = t * 1.1;
    const wx0 = cx + R * 1.65, wx1 = B.x + B.w, dth = 0.022;
    const S_N = th => { let s = 0; for (let k = 1; k <= N; k++) { const n = 2 * k - 1; s += 4 / (n * Math.PI) * Math.sin(n * th); } return s; };
    ctx.setLineDash([4, 5]); ctx.strokeStyle = rgba(P.fg, 0.35); ctx.lineWidth = 1; ctx.beginPath();
    for (let x = wx0, i = 0; x <= wx1; x += 2, i++) { const y = cy - R * Math.sign(Math.sin(om - i * dth)); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = rgba(P.fg, 0.18); ctx.beginPath(); ctx.moveTo(wx0, cy); ctx.lineTo(wx1, cy); ctx.stroke();
    let x = cx, y = cy;
    for (let k = 1; k <= N; k++) {
      const n = 2 * k - 1, r = R * 4 / (n * Math.PI), nx = x + r * Math.cos(n * om), ny = y - r * Math.sin(n * om);
      ctx.strokeStyle = rgba(P.fg, 0.22); ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = rgba(P.fg, 0.85); ctx.lineWidth = Math.max(1, P.lw * 0.9); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(nx, ny); ctx.stroke();
      x = nx; y = ny;
    }
    ctx.setLineDash([3, 4]); ctx.strokeStyle = rgba(P.a1, 0.7); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(wx0, y); ctx.stroke(); ctx.setLineDash([]);
    ctx.beginPath(); ctx.arc(x, y, 3.5, 0, Math.PI * 2); ctx.fillStyle = P.a1; ctx.fill();
    ctx.strokeStyle = P.a1; ctx.lineWidth = P.lw * 1.5; ctx.lineJoin = 'round'; ctx.beginPath();
    for (let xx = wx0, i = 0; xx <= wx1; xx += 2, i++) { const yy = cy - R * S_N(om - i * dth); i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); }
    ctx.stroke();
    label(ctx, P, 'S_N(θ) = (4/π) Σ sin((2k−1)θ) / (2k−1)', B.x, B.y + fs, { size: fs + 1, weight: 700 });
    label(ctx, P, `N = ${N} term${N > 1 ? 's' : ''}`, B.x, B.y + fs * 2.3, { size: fs, alpha: .75 });
    if (N >= 8) label(ctx, P, 'Gibbs overshoot ≈ 1.179, about 9% of the jump', B.x, B.y + B.h - 6, { size: fs, weight: 700, color: P.a2 });
  },
};
