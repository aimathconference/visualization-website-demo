// Template for contributing a visualization. It's a complete, working example: copy it to
// entries/<your-slug>.js (lowercase letters, numbers and dashes), then change whatever you like.
// You can also add entries/<your-slug>.md, a longer explanation in Markdown.
//
// The code runs in a sandbox. Imports and network access aren't allowed, and a frame that runs over
// 250 ms is stopped. The helpers hex, mix, rgba, label, clipBox and fsFor are available without importing.

// COLOR PALETTE (required). This must be the first statement in the file, and it should list every color
// the piece uses, as six-digit hex. While someone is looking at your piece, the site takes on its main and
// secondary colors. You can add other colors with any names you like, and use them as COLORS.yourName.
const COLORS = {
  main: '#ff8a1f',       // P.a1
  secondary: '#2dd4a7',  // P.a2
  bg: '#050508',         // P.bg, the background
  fg: '#ecebf5',         // P.fg, text and thin lines
};

// INTERACTION. Everything here is optional, and each listener only runs if its flag below is true.
// Mouse and keyboard are desktop only; tapping works everywhere. The feed already uses these, so leave them
// alone: up and down arrows, Page Up, Page Down, Esc, and the keys j, k, f, e, c and l. Double-clicking likes
// the piece. Vertical swipes scroll the feed, so on phones use taps rather than drags.
function listen(canvas, interact, S) {
  S.paused = false;
  S.mouse = 0;
  S.nudge = 0;
  const desktop = matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (interact.tap) {
    // A tap is a press and release in about the same spot, so swiping to scroll doesn't count.
    let down = null;
    canvas.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY]; });
    canvas.addEventListener('pointerup', e => {
      if (down && Math.hypot(e.clientX - down[0], e.clientY - down[1]) < 10) S.paused = !S.paused;
      down = null;
    });
  }
  if (interact.mouse && desktop) {
    canvas.addEventListener('pointermove', e => { S.mouse = (e.offsetX / canvas.clientWidth - 0.5) * Math.PI; });
  }
  if (interact.keys && desktop) {
    addEventListener('keydown', e => {
      if (e.key === 'ArrowLeft') S.nudge -= 0.1;
      if (e.key === 'ArrowRight') S.nudge += 0.1;
    });
  }
}

export default {
  // DESCRIPTION. How the piece is listed. The hook is one line, at most 160 characters.
  title: 'Lissajous curves',
  hook: 'Two perpendicular oscillations trace a closed curve whenever their frequencies have a rational ratio.',

  // TAGS. Up to 4 topics, at most 30 characters each.
  tags: ['Geometry', 'Trigonometry', 'Teaching'],

  // LICENSE. One of MIT, Apache-2.0, BSD-2-Clause, BSD-3-Clause, GPL-3.0-or-later, MPL-2.0, CC0-1.0.
  license: 'MIT',

  // USER DATA. Who made this. The site credits the GitHub account that opens the pull request, so add that
  // username to your profile on the site; this block is a record in your source file.
  author: { name: 'Your name', github: 'your-github-username' },

  // DEVICE MODES. Which devices the piece is meant for.
  modes: { desktop: true, mobile: true },

  // INTERACT MODE. Set any of these to false to turn it off. listen() above reads them.
  interact: { tap: true, mouse: true, keys: true },

  // TIME. t0 is the value of t, in seconds, when the piece starts. Optional.
  t0: 0,

  // PARAMETER. One slider in the viewer's Customize panel, read in draw() as P.param. Optional.
  param: { key: 'a', label: 'Horizontal frequency a', min: 1, max: 8, step: 1, value: 3 },

  // draw() runs every frame:
  //   ctx   canvas 2D context        w, h  size in CSS pixels        t  time in seconds
  //   P     theme: P.bg, P.fg, P.a1, P.a2 (colors), P.font, P.lw (line width),
  //         P.labels (show text?), P.param (the value of your slider)
  //   S     an object kept between frames (cache expensive work here)
  //   B     the drawing box {x, y, w, h} inside the padding
  // Draw with P's colors rather than COLORS, so viewers' Customize color schemes still apply.
  draw(ctx, w, h, t, P, S, B) {
    if (!S.ready) { S.ready = true; listen(ctx.canvas, this.interact, S); }

    // Advance by the time since the last frame, so pausing doesn't make the curve jump when it resumes.
    const dt = t - (S.last ?? t);
    S.last = t;
    if (!S.paused) S.phase = (S.phase ?? 0) + dt * 0.5;
    const phi = S.phase + S.mouse + S.nudge;

    ctx.fillStyle = P.bg;
    ctx.fillRect(0, 0, w, h);

    const a = P.param, b = 2, fs = fsFor(B);
    const top = P.labels ? fs * 3 : 0;
    const cx = B.x + B.w / 2, cy = B.y + top + (B.h - top) / 2;
    const R = Math.min(B.w, B.h - top) * 0.46;

    ctx.strokeStyle = rgba(P.fg, 0.2);
    ctx.lineWidth = 1;
    ctx.strokeRect(cx - R, cy - R, 2 * R, 2 * R);

    ctx.strokeStyle = P.a1;
    ctx.lineWidth = P.lw * 1.6;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let i = 0; i <= 1000; i++) {
      const th = 2 * Math.PI * i / 1000;
      const x = cx + R * Math.sin(a * th + phi), y = cy + R * Math.sin(b * th);
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke();

    label(ctx, P, `x = sin(${a}θ + φ),  y = sin(${b}θ)`, B.x, B.y + fs, { size: fs + 1, weight: 700 });
    label(ctx, P, S.paused ? 'paused: tap to resume' : 'tap to pause', B.x, B.y + fs * 2.3, { size: fs, alpha: 0.75, color: P.a2 });
  },
};
