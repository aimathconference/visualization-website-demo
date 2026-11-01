const COLORS = {
  main: '#5eead4',
  secondary: '#ff9f68',
  bg: '#050508',
  fg: '#ecebf5',
};

import { rgba, label, fsFor } from '@eigenreel/kit';

/* y² = x³ + A x + b, with A = −1 and b a param. */
const A = -1;
const LW = 2;
const PERIOD = 14;   // seconds for P to slide out along the branch and back

/* The real roots of x³ − x + b, ascending (one or three). The curve lives where the cubic is ≥ 0:
   [r1, r2] ∪ [r3, ∞) with three roots, [r1, ∞) with one. */
function roots(b) {
  const p = A, q = b, D = -(4 * p * p * p + 27 * q * q);
  if (D > 0) {
    const m = 2 * Math.sqrt(-p / 3), th = Math.acos((3 * q) / (2 * p) * Math.sqrt(-3 / p)) / 3;
    return [0, 1, 2].map(k => m * Math.cos(th - (2 * Math.PI * k) / 3)).sort((u, v) => u - v);
  }
  const s = Math.sqrt(q * q / 4 + p * p * p / 27);
  return [Math.cbrt(-q / 2 + s) + Math.cbrt(-q / 2 - s)];
}
/* the nearest x where the curve exists */
function snapX(x, rs) {
  if (rs.length === 1) return Math.max(x, rs[0]);
  const [r1, r2, r3] = rs;
  if (x < r1) return r1;
  if (x > r2 && x < r3) return x - r2 < r3 - x ? r2 : r3;
  return x;
}
const pointOf = (x, s, b) => [x, s * Math.sqrt(Math.max(0, x * x * x + A * x + b))];
/* P's x while it slides with t: out along the unbounded branch and back, once per PERIOD */
const slideX = (t, r0) => r0 + 0.04 + 1.9 * (1 - Math.cos(2 * Math.PI * t / PERIOD)) / 2;

export default {
  title: 'The group law on an elliptic curve',
  hook: 'A line through P and Q meets the cubic once more. Reflect that point and you have P + Q.',
  alt: 'A cubic curve with a line through two points P and Q that crosses it a third time, and a dashed vertical line joining that crossing to its mirror image, the sum P + Q. P slides along the curve, and in interact mode either point can be dragged.',
  tags: ['Algebraic geometry', 'Number theory', 'Elliptic curves', 'Teaching'],
  license: 'GPL-3.0',
  author: { name: 'kmoreau.geom' },

  modes: { desktop: true, phone: true },
  time: { length: 14, loop: true },
  context: '2d',
  libraries: [],

  params: [
    { key: 'b', type: 'range', label: 'Coefficient b', min: 0.05, max: 2, step: 0.05, default: 1 },
    { key: 'slide', type: 'toggle', label: 'P slides along the curve', default: true },
    { key: 'px', type: 'range', label: 'x-coordinate of P', min: -1.6, max: 3, step: 0.01, default: 1 },
    { key: 'pUp', type: 'toggle', label: 'P on the upper half', default: true },
    { key: 'qx', type: 'range', label: 'x-coordinate of Q', min: -1.6, max: 3, step: 0.01, default: -0.5 },
    { key: 'qUp', type: 'toggle', label: 'Q on the upper half', default: false },
  ],
  presets: [
    { id: 'split', label: 'Split the curve: b = 0.30', params: { b: 0.3 } },
    { id: 'oval', label: 'P on the oval', params: { b: 0.3, slide: false, px: -0.95, pUp: true, qx: 1, qUp: false } },
    { id: 'double', label: 'P = Q: the tangent gives 2P', params: { b: 1, slide: false, px: 0.6, pUp: false, qx: 0.6, qUp: false } },
    { id: 'slide', label: 'Let P slide again', params: { slide: true, qx: -0.5, qUp: false }, t: 0 },
  ],

  interact: { hint: 'Drag P or Q along the curve · use the panel' },

  draw(ctx, t, params, env, S) {
    const B = env.box, C = env.colors, fs = fsFor(B);
    const b = params.b, rhs = x => x * x * x + A * x + b, rs = roots(b), r0 = rs[rs.length - 1];
    const xm = 0.3, k = Math.min(B.w / 5.8, B.h / 9), ox = B.w / 2, oy = B.h / 2;
    const px = x => ox + (x - xm) * k, py = y => oy - y * k;
    const xl = xm - B.w / 2 / k, xr = xm + B.w / 2 / k, yt = B.h / 2 / k;

    // P and Q as [x, sign]: P follows t while `slide` is on, otherwise both come from the params
    const cP = params.slide ? [slideX(t, r0), 1] : [snapX(params.px, rs), params.pUp ? 1 : -1];
    const cQ = [snapX(params.qx, rs), params.qUp ? 1 : -1];

    // grid and axes
    ctx.strokeStyle = rgba(C.fg, 0.1); ctx.lineWidth = 1; ctx.beginPath();
    for (let g = Math.ceil(xl); g <= xr; g++) { ctx.moveTo(px(g), 0); ctx.lineTo(px(g), B.h); }
    for (let g = Math.ceil(-yt); g <= yt; g++) { ctx.moveTo(0, py(g)); ctx.lineTo(B.w, py(g)); }
    ctx.stroke();
    ctx.strokeStyle = rgba(C.fg, 0.38); ctx.beginPath();
    ctx.moveTo(0, py(0)); ctx.lineTo(B.w, py(0)); ctx.moveTo(px(0), 0); ctx.lineTo(px(0), B.h); ctx.stroke();

    // the curve, as runs of x where the cubic is ≥ 0, closed at the roots
    const root = (lo, hi) => { for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; if ((rhs(lo) < 0) === (rhs(mid) < 0)) lo = mid; else hi = mid; } return (lo + hi) / 2; };
    const segs = []; let run = null; const dx = (xr - xl) / 900;
    for (let i = 0; i <= 901; i++) {
      const x = xl + i * dx, v = rhs(x);
      if (v >= 0) { if (!run) { run = []; if (i > 0) run.push([root(x - dx, x), 0]); segs.push(run); } run.push([x, Math.sqrt(v)]); }
      else if (run) { run.push([root(x - dx, x), 0]); run = null; }
    }
    ctx.strokeStyle = C.fg; ctx.lineWidth = LW * 1.6; ctx.lineJoin = 'round';
    for (const s of segs) for (const sg of [1, -1]) {
      ctx.beginPath(); s.forEach(([x, y], i) => i ? ctx.lineTo(px(x), py(sg * y)) : ctx.moveTo(px(x), py(sg * y))); ctx.stroke();
    }

    const [xP, yP] = pointOf(cP[0], cP[1], b), [xQ, yQ] = pointOf(cQ[0], cQ[1], b);
    const dot = (x, y, r, fill, stroke) => { ctx.beginPath(); ctx.arc(px(x), py(y), r, 0, Math.PI * 2); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke(); } };

    // the chord through P and Q, or the tangent at P when they coincide
    let m = null, sumTxt = 'P + Q = 𝒪';
    if (Math.abs(xP - xQ) > 1e-4) m = (yQ - yP) / (xQ - xP);
    else if (Math.abs(yP - yQ) < 1e-6 && Math.abs(yP) > 1e-6) m = (3 * xP * xP + A) / (2 * yP);
    if (m !== null) {
      const x3 = m * m - xP - xQ, y3 = yP + m * (x3 - xP);
      ctx.strokeStyle = rgba(C.fg, 0.55); ctx.lineWidth = LW; ctx.beginPath();
      ctx.moveTo(px(xl), py(yP + m * (xl - xP))); ctx.lineTo(px(xr), py(yP + m * (xr - xP))); ctx.stroke();
      if (Math.abs(m) <= 40) {
        ctx.setLineDash([5, 5]); ctx.strokeStyle = C.secondary; ctx.lineWidth = LW * 1.2;
        ctx.beginPath(); ctx.moveTo(px(x3), py(y3)); ctx.lineTo(px(x3), py(-y3)); ctx.stroke(); ctx.setLineDash([]);
        dot(x3, y3, 5, C.bg, C.fg); dot(x3, -y3, 7, C.secondary);
        label(ctx, env, 'P∗Q', px(x3) + 10, py(y3) + (y3 > 0 ? -8 : 16), { size: fs, weight: 700 });
        label(ctx, env, 'P + Q', px(x3) + 12, py(-y3) + (y3 > 0 ? 18 : -10), { size: fs + 1, weight: 700, color: C.secondary });
      }
      sumTxt = Math.abs(m) > 9 ? 'P + Q → 𝒪, the point at infinity'
        : `${Math.abs(xP - xQ) > 1e-4 ? 'P + Q' : '2P'} = (${x3.toFixed(2)}, ${(-y3).toFixed(2)})`;
    }

    // P and Q, with a ring on the one being dragged
    for (const [id, x, y] of [['P', xP, yP], ['Q', xQ, yQ]]) {
      if (S.drag === id) dot(x, y, 11, null, rgba(C.main, 0.55));
      dot(x, y, 6, C.main);
    }
    label(ctx, env, 'P', px(xP) - 6, py(yP) - 12, { size: fs + 1, weight: 700, color: C.main, align: 'right' });
    label(ctx, env, 'Q', px(xQ) + 10, py(yQ) + 18, { size: fs + 1, weight: 700, color: C.main });

    // what the pointer handlers need: where P and Q were drawn (CSS px) and the map back to the plane
    S.hit = { P: [px(xP), py(yP)], Q: [px(xQ), py(yQ)], P0: cP, ox, oy, k, xm };
    S.params = params;

    const disc = 27 * b * b - 4;
    label(ctx, env, `y² = x³ − x + ${b.toFixed(2)}`, 0, fs, { size: fs + 1, weight: 700 });
    label(ctx, env, `Δ = ${(-16 * disc).toFixed(1)}  ·  ${disc > 0 ? 'one real component' : disc < 0 ? 'two real components' : 'singular'}`, 0, fs * 2.3, { size: fs, alpha: 0.75 });
    label(ctx, env, sumTxt, 0, B.h - 6, { size: fs, color: C.secondary, weight: 700 });
  },

  onMode(env, S) {
    if (env.mode !== 'interact' || !env.ui) { S.drag = null; return; }
    const p = S.params || { px: 1, qx: -0.5 };
    const phone = env.device === 'phone';

    // the panel: one slider per point's x-coordinate
    const panel = document.createElement('div');
    panel.style.position = 'absolute';
    panel.style.right = '8px';
    panel.style.bottom = phone ? '30px' : '28px';
    panel.style.padding = '6px 8px';
    panel.style.display = 'flex';
    panel.style.flexDirection = 'column';
    panel.style.gap = '4px';
    const sliders = {};
    for (const id of ['P', 'Q']) {
      const key = id.toLowerCase() + 'x';
      const row = document.createElement('label');
      row.style.display = 'flex';
      row.style.gap = '6px';
      row.style.alignItems = 'center';
      const name = document.createElement('span');
      name.textContent = `x of ${id}`;
      const s = document.createElement('input');
      s.setAttribute('type', 'range');
      s.setAttribute('min', '-1.6');
      s.setAttribute('max', '3');
      s.setAttribute('step', '0.01');
      s.setAttribute('value', String(id === 'P' && p.slide && S.hit ? S.hit.P0[0].toFixed(2) : p[key]));
      s.setAttribute('aria-label', `x-coordinate of ${id}`);
      if (phone) s.style.width = '110px';
      s.addEventListener('input', e => {
        if (id === 'P') env.setParam('slide', false);
        env.setParam(key, +e.value);
      });
      row.appendChild(name);
      row.appendChild(s);
      panel.appendChild(row);
      sliders[id] = s;
    }

    // dragging: hit-test against where draw put P and Q; x follows the pointer, its height picks the branch
    const grab = 22;
    const toWorld = (x, y) => { const H = S.hit; return [H.xm + (x - H.ox) / H.k, (H.oy - y) / H.k]; };
    const move = (id, e) => {
      const [wx, wy] = toWorld(e.x, e.y);
      if (id === 'P') env.setParam('slide', false);
      const v = env.setParam(id.toLowerCase() + 'x', wx);
      env.setParam(id === 'P' ? 'pUp' : 'qUp', wy >= 0);
      if (sliders[id]) sliders[id].setAttribute('value', String(v));
    };
    env.ui.addEventListener('pointerdown', e => {
      if (!S.hit || !Number.isFinite(e.x) || !Number.isFinite(e.y)) return;
      let best = null, bd = grab;
      for (const id of ['P', 'Q']) {
        const d = Math.hypot(e.x - S.hit[id][0], e.y - S.hit[id][1]);
        if (d < bd) { bd = d; best = id; }
      }
      S.drag = best;
      if (best) move(best, e);
    });
    env.ui.addEventListener('pointermove', e => {
      if (!S.drag || !S.hit || !Number.isFinite(e.x) || !Number.isFinite(e.y)) return;
      move(S.drag, e);
    });
    const end = () => { S.drag = null; };
    env.ui.addEventListener('pointerup', end);
    env.ui.addEventListener('pointercancel', end);

    env.ui.replaceChildren(panel);
  },
};
