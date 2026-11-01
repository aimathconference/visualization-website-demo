// Template for contributing a visualization (docs/submission-spec-slop.md). It is a complete, working piece:
// copy it to entries/<your-slug>.js, write its explanation in entries/<your-slug>.md, and change whatever you
// like. The slug is lowercase letters, digits and dashes, at most 40 characters; it names both files and the
// piece's share links. The Chalkboard on the site does all of this for you and exports the two files.
//
// The piece runs in a locked-down worker: no network, no storage, no timers, no DOM. It sees the world only
// through `env`. The watchdog stops it when setup takes over 8 s, or one draw, event handler or onMode call
// takes over 250 ms. Everything in `export default` except the three functions must be a plain literal
// (strings, numbers, booleans, arrays, objects): the site reads it from the source without running the code.

// COLOR PALETTE (required). The first statement of the file. `main` and `secondary` are required; every value is
// a six-digit hex color, and you can add more names. `fg` on `bg` needs a contrast of at least 4.5:1, because
// while the piece is on screen the page around it takes on these colors. The palette is final: the piece always
// draws with it (read it as env.colors), and only the Chalkboard's color picker changes it.
const COLORS = {
  main: '#ff8a1f',       // the curve
  secondary: '#2dd4a7',  // the tracing point and the radius
  bg: '#050508',         // the background the box is cleared to before every frame
  fg: '#ecebf5',         // text and thin lines
};

// IMPORTS. Only the pinned libraries, by their exact names: '@eigenreel/kit' (the site's helpers) and
// '@eigenreel/three' (three.js, with context: 'webgl2'). Anything else is bundled into this file and declared in
// `libraries`. label() draws text in the site's font (env.font) with a halo in env.colors.bg.
import { label } from '@eigenreel/kit';

export default {
  // DESCRIPTION. How the piece is listed. The title is at most 60 characters, the hook at most 160. `alt` is
  // 1 or 2 sentences (40 to 300 characters) describing what a viewer sees, for screen readers and for share
  // previews; it is neither the title nor the hook.
  title: 'Rose curves',
  hook: 'r = cos(kθ) draws k petals when k is odd and 2k when k is even.',
  alt: 'A flower-shaped curve traced in orange on a dark background, its petals opening and closing.',

  // TAGS. 1 to 4, from the registry's vocabulary (tags.json). To propose a new tag, ask the maintainers.
  tags: ['Geometry', 'Teaching'],

  // LICENSE. One of MIT, BSD-2-Clause, BSD-3-Clause, Apache-2.0, GPL-3.0, MPL-2.0, ISC, CC0-1.0.
  license: 'MIT',

  // AUTHOR. The byline. Your GitHub account is never written here: it is whoever opens the pull request that
  // first adds the piece, recorded by numeric id. Later changes should come from the same account.
  // Optionally add email: 'you@university.edu' if you are willing to be emailed about the piece; readers see it
  // as a "Suggest an edit" link under the explanation.
  author: { name: 'Your name' },

  // DEVICES. Where the piece appears; at least one is true. Without phone: true it is left out of the phone feed.
  modes: { desktop: true, phone: true },

  // TIME (required). The scrubber runs from 0 to `length` seconds (at most 3600). loop: true wraps around;
  // loop: false plays once and holds the last frame. draw() must be a function of (t, params): the same t and
  // params give the same frame, which is what makes a link with a time in it, and export, reproducible.
  time: { length: 24, loop: true },

  // CONTEXT. '2d' (the default) or 'webgl2' (desktop only).
  context: '2d',

  // BUNDLED LIBRARIES. Each one bundled into this file, e.g. { name: 'd3-scale', version: '4.0.2', license: 'ISC' }.
  libraries: [],

  // PARAMS. The viewer's knobs; draw() receives their validated values in `params`. Types: range (min, max,
  // step, default, and an optional format such as '{}°'), toggle (default) and select (options [[value, label], …]).
  // A range's default and max must be on the grid min + k·step.
  params: [
    { key: 'k', type: 'range', label: 'Petal number k', min: 1, max: 12, step: 1, default: 5 },
    { key: 'trace', type: 'toggle', label: 'Show the traced path', default: true },
  ],

  // PRESETS. Named states, applied from the explanation with [eight petals](#preset:eight). A preset's `t`, if
  // any, is within [0, length]; applying it seeks there and pauses.
  presets: [
    { id: 'eight', label: 'k = 4, eight petals', params: { k: 4 }, t: 6 },
  ],

  // INTERACT MODE. Only pieces that declare it get "Click to interact"; the hint (at most 60 characters) is
  // shown while the viewer is in it. Omit `interact` for a feed-only piece.
  interact: { hint: 'Use the panel to change k' },

  // setup(env, S) runs once, before the first frame, and may be async. S is a plain object that lives as long
  // as this instance and is passed to all three functions: the place for caches. `this` is not bound.
  setup(env, S) {
    S.steps = 720;   // points per full turn of θ
  },

  // draw(ctx, t, params, env, S) runs every frame. With context '2d' the page has already reset the context,
  // scaled it by env.dpr (units are CSS px), moved (0, 0) to the top-left of the box, cleared it to bg and
  // clipped it to the box. The box is env.box.w × env.box.h; the rest of the canvas holds the page's controls.
  // Never keep state from one frame to the next: compute the frame from t and params alone.
  draw(ctx, t, params, env, S) {
    const { w, h } = env.box, C = env.colors;
    const k = params.k;
    S.panelK = k;   // only for onMode, which does not receive params, to start its slider here; draw never reads it
    const fs = Math.round(Math.max(12, Math.min(16, w / 34)));
    const top = fs * 3;
    const cx = w / 2, cy = top + (h - top) / 2;
    const R = Math.max(10, Math.min(w, h - top) * 0.44);

    // The rose closes after θ = π when k is odd and 2π when k is even. Each half of the loop traces it once,
    // then erases it, so the picture at t depends on t alone.
    const period = k % 2 ? Math.PI : 2 * Math.PI;
    const u = (t % 12) / 12;                       // 12 seconds per trace, twice per 24-second loop
    const drawing = u < 0.5;
    const s = drawing ? u * 2 : (u - 0.5) * 2;     // 0..1 within the half
    const from = drawing ? 0 : s * period, to = drawing ? s * period : period;
    const point = th => { const r = Math.cos(k * th); return [cx + R * r * Math.cos(th), cy - R * r * Math.sin(th)]; };

    // the unit circle, faint
    ctx.strokeStyle = C.fg;
    ctx.globalAlpha = 0.18;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, 2 * Math.PI);
    ctx.stroke();
    // the whole rose, faint, so the shape is there before the trace reaches it
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i <= S.steps; i++) {
      const [x, y] = point(period * i / S.steps);
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;

    // the traced path, or with `trace` off only a short stretch next to the tracing point
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

    // the radius to the tracing point
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

  // onMode(env, S) runs whenever env.mode or env.fullscreen changes, and on every resize. In interact mode the
  // piece may build its own UI in env.ui (a stand-in element: createElement, appendChild, textContent, inline
  // style, events; no innerHTML). A control that changes a declared param must call env.setParam, never keep
  // its own copy in S; the new value arrives in `params` on the next frame. Outside interact mode env.ui is
  // absent (the site removes it when the viewer leaves), so there is nothing to do.
  onMode(env, S) {
    if (env.mode !== 'interact' || !env.ui) return;
    const k = S.panelK ?? 5;   // the current k, as the last frame drew it
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
