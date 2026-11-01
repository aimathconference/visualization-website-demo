const COLORS = {
  main: '#ff8a1f',
  secondary: '#2dd4a7',
  bg: '#050508',
  fg: '#ecebf5',
};

import { label } from '@eigenreel/kit';

export default {
  title: 'Rose curves',
  hook: 'r = cos(kθ) draws k petals when k is odd and 2k when k is even.',
  alt: 'A flower-shaped curve traced in orange on a dark background, its petals opening and closing.',
  tags: ['Geometry', 'Teaching'],
  license: 'MIT',
  author: { name: 'tbrazel' },

  modes: { desktop: true, phone: true },
  time: { length: 24, loop: true },
  context: '2d',
  libraries: [],

  params: [
    { key: 'k', type: 'range', label: 'Petal number k', min: 1, max: 12, step: 1, default: 5 },
    { key: 'trace', type: 'toggle', label: 'Show the traced path', default: true },
  ],
  presets: [
    { id: 'eight', label: 'k = 4, eight petals', params: { k: 4 }, t: 6 },
  ],

  interact: { hint: 'Use the panel to change k' },

  setup(env, S) {
    S.steps = 720;
  },

  draw(ctx, t, params, env, S) {
    const { w, h } = env.box, C = env.colors;
    const k = params.k;
    S.panelK = k;
    const fs = Math.round(Math.max(12, Math.min(16, w / 34)));
    const top = fs * 3;
    const cx = w / 2, cy = top + (h - top) / 2;
    const R = Math.max(10, Math.min(w, h - top) * 0.44);

    const period = k % 2 ? Math.PI : 2 * Math.PI;
    const u = (t % 12) / 12;
    const drawing = u < 0.5;
    const s = drawing ? u * 2 : (u - 0.5) * 2;
    const from = drawing ? 0 : s * period, to = drawing ? s * period : period;
    const point = th => { const r = Math.cos(k * th); return [cx + R * r * Math.cos(th), cy - R * r * Math.sin(th)]; };

    ctx.strokeStyle = C.fg;
    ctx.globalAlpha = 0.18;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.globalAlpha = 1;

    const [a, b] = params.trace ? [from, to]
      : drawing ? [Math.max(0, to - period / 10), to] : [from, Math.min(period, from + period / 10)];
    const n = Math.max(2, Math.ceil(S.steps * (b - a) / (2 * Math.PI)));
    ctx.strokeStyle = C.main;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const [x, y] = point(a + (b - a) * i / n);
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke();

    const th = drawing ? to : from;
    const [px, py] = point(th);
    ctx.strokeStyle = C.secondary;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(px, py);
    ctx.stroke();
    ctx.fillStyle = C.secondary;
    ctx.beginPath();
    ctx.arc(px, py, 4, 0, 2 * Math.PI);
    ctx.fill();

    const petals = k % 2 ? k : 2 * k;
    label(ctx, env, `r = cos(${k}θ)`, 0, fs * 1.2, { size: fs + 2, weight: 700 });
    label(ctx, env, `${petals} petal${petals === 1 ? '' : 's'}: k is ${k % 2 ? 'odd' : 'even'}`, 0, fs * 2.5, { size: fs, alpha: 0.75, color: C.secondary });
  },

  onMode(env, S) {
    if (env.mode !== 'interact' || !env.ui) return;
    const k = S.panelK ?? 5;
    const panel = document.createElement('div');
    panel.style.position = 'absolute';
    panel.style.right = '12px';
    panel.style.bottom = '12px';
    panel.style.padding = '8px 10px';
    panel.style.display = 'flex';
    panel.style.gap = '8px';
    panel.style.alignItems = 'center';

    const name = document.createElement('label');
    name.textContent = 'k';
    name.setAttribute('for', 'rose-k');
    const slider = document.createElement('input');
    slider.setAttribute('id', 'rose-k');
    slider.setAttribute('type', 'range');
    slider.setAttribute('min', '1');
    slider.setAttribute('max', '12');
    slider.setAttribute('step', '1');
    slider.setAttribute('value', String(k));
    slider.addEventListener('input', e => { env.setParam('k', +e.value); });

    const reset = document.createElement('button');
    reset.textContent = 'Reset';
    reset.addEventListener('click', () => { env.setParam('k', 5); slider.setAttribute('value', '5'); });

    panel.appendChild(name);
    panel.appendChild(slider);
    panel.appendChild(reset);
    env.ui.replaceChildren(panel);
  },
};
