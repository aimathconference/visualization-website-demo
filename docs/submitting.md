# Submitting a visualization to Loci

This guide takes you from an idea to a published piece. The short version:
one moving picture of one mathematical idea, one knob that matters, an
explanation someone could check, and a package that passes the automated
checks. The checks run in your browser before you open a pull request to the
registry on GitHub (section 8), so you will know before we do.

If you only want the contract, read [module-api.md](module-api.md). If you
want to know what happens to the pull request, read
[review-pipeline.md](review-pipeline.md).

## 1. What makes a good piece

Scroll the feed for ten minutes first. The pieces that work share a shape:

* **One idea.** The multiplication table on a circle shows one thing: the
  map i ↦ k·i mod n. It does not also explain modular arithmetic.
* **It moves for a reason.** Time should reveal structure (the cardioid
  appearing as k passes 2), not just decorate. If a still image would do, it
  is a figure, not a Loci piece.
* **One knob that changes the mathematics.** Your main parameter should
  have at least two settings where something qualitatively different happens,
  and your presets should take people straight to them.
* **It survives the phone.** Most viewers see a 335×490 box, held in one
  hand, often with the sound off and the labels on. Big strokes, few words.
* **The explanation is checkable.** Every fact in it should be something a
  reviewer can verify from your reference.

Things that get returned: slide decks of formulas, simulations with no
mathematics in the explanation, pieces whose parameter changes nothing you can
see, anything that flashes.

## 2. Package layout

```
my-piece/
  loci.json          manifest
  index.js           JavaScript module  (or module.wasm for WebAssembly)
  mobile.js          optional: a second module for phones (section 5)
  explanation.md     what the viewer reads in the Explanation tab
  LICENSE            an OSI license
  poster.png         optional; otherwise we capture one at t = t0 + 6
```

Total size under 4 MB; JavaScript under 200 KB (2 MB for a `desktop` target, section 5); WebAssembly under 2 MB.

## 3. Prototype in the Remix editor

You do not need a local setup to start. Open any piece in the feed, choose
**Source → Remix**, and replace the module with your own. The editor runs your
code in the same sandbox the site uses, shows errors inline, and keeps your
draft in this browser (localStorage, per piece) until you press **Revert**,
so it survives a reload; a remix you **Run** lasts for the tab.
**Download .js** when it works.

**Check this remix** runs the whole automated gate of section 8 on the
editor's code without leaving the editor, with the same progress bar and
grouped report as the Submit page, under the editor. It checks the remix as
a new package of yours: id `<parent>-remix-<hash>` (the hash is of your
code), `"remixOf": "<parent>"` in `loci.json`, author `@you`, the parent's
license, with the parent's author kept on the LICENSE copyright line and
credited at the end of `explanation.md`. The report says it is for your
remix, not the published piece. Expect one warning while your module is
still close to its parent: *Near-duplicate of …*, which reviewers read. An
unchanged module fails as an exact duplicate. For a piece with desktop and
mobile targets, the target you are not editing ships its original module
(or your remix of it, if you made one), and an unchanged module is an exact
duplicate there too. When nothing fails, **Prepare pull request** hands the
package and its report to the Submit page's "Submit on GitHub" section
(section 8). WebAssembly pieces are read-only in the editor and have no
Check this remix.

The editor has three files: the module, **loci.json** and
**explanation.md**. The loci.json tab holds the fields a remix may change
(title, hook, alt, tags, params, presets, `after`, `bounty`) as raw JSON,
validated as you type by the same validator as the gate; the param keys
are fixed for remixes (labels, ranges and defaults may change, keys may not
be added, removed or renamed), so Customize and share links keep working,
and a loci.json with problems blocks Run and Check this remix. **Run**
applies the title, hook and presets to the slide's caption and pills, in
this tab only. The explanation.md tab has an Edit / Preview switch that
typesets it as the Explanation tab would. All three drafts are kept in this
browser. Check this remix packages all three, and warns when the module
changed but the presets or the explanation are still the parent's. On the
Wanted page, **Make this** opens the editor with `"bounty"` set to the
request, and the gate confirms the id names a request on the Wanted page.

The default export you need:

```js
import { hex, mix, rgba, label, clipBox, fsFor, mulberry32 } from '@loci/kit';

export default {
  setup({ ctx, env }) {},                     // optional
  draw({ ctx, t, dt, box, theme, params, seed, state }) {
    ctx.fillStyle = theme.bg; ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    clipBox(ctx, box);                        // stay inside the box
    // ... draw with theme.fg, theme.a1, theme.a2 and theme.lw ...
    ctx.restore();
    label(ctx, theme, 'y = f(x)', box.x, box.y + fsFor(box));   // honors theme.labels
  }
};
```

Rules the sandbox enforces, so design around them from the start:

* **Draw only inside `box`.** Controls overlay the rest of the canvas.
* **Colors come from `theme`.** Use `bg`, `fg`, `a1`, `a2` and nothing else,
  so the piece works on the night, chalk and graph styles and in high
  contrast. Mix them with `mix()` if you need more.
* **Text goes through `label()`.** It respects the viewer's font and the
  labels switch. Do not call `fillText` directly.
* **Scale strokes from `theme.lw`.**
* **Be a function of `t`.** Same `t`, same params, same seed → same pixels.
  `t` jumps backwards when someone scrubs; if you integrate, detect that and
  recompute from the cycle start. Use `mulberry32(seed)` instead of
  `Math.random`. Do not advance state by `dt`: a seek draws with `dt = 0`,
  and so does every frame of a recorded clip (Share, Record clip renders
  offscreen by seeking frame by frame). The "Played vs seeked" check plays
  one instance to t ≈ 3 at real time and seeks another to the same `t`; the
  two frames must match, or the clip would be a still and a share link would
  land on a different picture.
* **Cache expensive work in `state`,** keyed on the box size and palette.
  Budget: under 12 ms per frame on a 2020 phone.
* **No network, storage, DOM or timers.** They are removed from the sandbox;
  referencing them fails the static check.
* **Imports:** `@loci/kit`, and `@loci/three` for three.js. Nothing else.

### WebAssembly

Write to the exports in module-api.md section 3 and prefer `render:
"commands"`: lines stay crisp on every screen and labels use the viewer's
font. `examples/wasm-lissajous/` is a complete C example with its build
command. Pixel mode is fine for raster work such as escape-time fractals.

### Using the GPU

Set `"render": "webgl2"` and the module gets a WebGL2 context as `gl`
instead of `ctx`. Before each `draw` the host has cleared the canvas to
`theme.bg` and set the viewport and scissor to the box; after it, the host
clears anything outside the box. A WebGL canvas cannot draw text, so return
your labels and the host draws them in the viewer's font (and drops them when
labels are off). The full contract is module-api.md section 3.

A raw GLSL piece, minimal:

```js
import { hex } from '@loci/kit';

const FRAG = `#version 300 es
precision highp float;
#define MAX_ITER 500                         // the literal cap
uniform vec4 u_vp; uniform int u_iter; uniform vec3 u_ink;
out vec4 color;
void main() {
  vec2 c = (gl_FragCoord.xy - u_vp.xy) / u_vp.zw * 3.0 - vec2(2.0, 1.5), z = vec2(0.0);
  int n = 0;
  for (int i = 0; i < MAX_ITER; i++) {
    if (i >= u_iter) break;                  // the real bound is a uniform
    z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
    if (dot(z, z) > 4.0) break;
    n = i;
  }
  color = vec4(u_ink * float(n) / float(u_iter), 1.0);
}`;
const VERT = `#version 300 es
in vec2 p; void main() { gl_Position = vec4(p, 0.0, 1.0); }`;

export default {
  setup({ gl }) {
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.bindAttribLocation(prog, 0, 'p'); gl.linkProgram(prog);
    const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    this.gpu = { prog, vao };
  },
  draw({ gl, box, viewport, theme, params }) {
    const { prog, vao } = this.gpu;
    gl.useProgram(prog); gl.bindVertexArray(vao);
    gl.uniform4f(gl.getUniformLocation(prog, 'u_vp'), ...viewport);
    gl.uniform1i(gl.getUniformLocation(prog, 'u_iter'), params.iter);
    gl.uniform3f(gl.getUniformLocation(prog, 'u_ink'), ...hex(theme.a1).map(x => x / 255));
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    return { labels: [{ text: `${params.iter} iterations`, x: box.x, y: box.y + 16, weight: 700 }] };
  }
};
```

A three.js piece, minimal. Import three.js from `@loci/three` (a pinned
build the site provides; do not bundle your own):

```js
import * as THREE from '@loci/three';

export default {
  setup({ gl, canvas }) {
    const renderer = new THREE.WebGLRenderer({ canvas, context: gl, antialias: true });
    renderer.autoClear = false;                          // the host clears to theme.bg
    const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    const knot = new THREE.Mesh(new THREE.TorusKnotGeometry(1, 0.3, 160, 16), new THREE.MeshNormalMaterial());
    scene.add(knot); camera.position.set(0, 0, 6);
    this.s = { renderer, scene, camera, knot };
  },
  draw({ t, box, viewport }) {
    const { renderer, scene, camera, knot } = this.s;
    renderer.resetState();                               // the host touched GL state: resync three's cache
    renderer.setViewport(...viewport); renderer.setScissor(...viewport); renderer.setScissorTest(true);
    camera.aspect = box.w / box.h; camera.updateProjectionMatrix();
    knot.rotation.y = t * 0.5;                           // a function of t: no OrbitControls in a worker
    renderer.render(scene, camera);
  }
};
```

Never call `renderer.setSize` or `setPixelRatio`: the host owns the canvas.

**The shader-loop rule.** A worker that hangs is stopped after half a
second; a GPU stuck in a shader is not, and can freeze the viewer's browser.
So every GLSL loop must be bounded where a machine can see it: a `for` whose
bound is an integer literal or a `const`/`#define`, or, when the real bound
is a uniform, a literal cap plus `if (i >= u_n) break;` as above. `while`
and `do` loops fail the checks. Keep the phone in mind: a shader that takes
3 ms on a laptop can take 60 ms on a phone, and phones throttle when hot.

### Pointer interaction

A piece can be explored with the mouse, a finger and the keyboard: orbit a
3D scene, pan and zoom a fractal, drag points along a curve. Declare it in
`loci.json` (or on one target, which wins over the top level):

```jsonc
"pointer": { "mode": "orbit", "hint": "Drag to orbit · scroll to zoom" }
// mode: "orbit" | "pan-zoom" | "custom" ("none" is the default)
// drag, click, keys, wheel: each true unless you set it to false
```

**What the host enforces.** The feed is scrolled by dragging, so a piece
never takes input by surprise. Your slide shows "Click to interact"; only
after the viewer clicks or taps the stage (or presses Enter on its canvas)
is it *engaged*. Then, and only then:

* drags, the wheel over the stage, keys and right-clicks go to your module
  (the context menu is suppressed, so right-drag can pan);
* the site's scrub-by-drag, long-press and feed scrolling over the stage are
  off; on a phone one finger drags, two fingers pinch, a double tap is a
  double-click;
* the hint shows your `hint` and "Esc to release".

Esc, a click outside the stage, moving to another slide, opening a panel or
leaving the feed releases it. You never see Esc, Tab or Ctrl/⌘/Alt
shortcuts; they stay with the page. You do hear `engage` and `release`, and
`draw` gets `engaged`. Without a declaration nothing changes and you get no
events.

**What you write.** `draw` receives `events`, the input since the last frame
(usually empty), already in CSS px relative to the canvas like `box`, with
moves coalesced to one per frame. Hand them to a kit helper, draw, and
return a cursor. Keep what the input changed in plain JSON and expose it as
the **view** with `getView()` and `setView(view)`: share links, embeds,
presets and lists of moments carry it, so "look at this" links land on exactly
the viewer's camera, and a recorded clip (Share, Record clip) is rendered
from it too, frame by frame on a hidden copy of the piece, so the GIF shows
the viewer's camera and its watermark links back to that view. A list of moments (module API section 5, "Moments") is a
viewer's sequence of moments of your piece and others, each params, *t*, view
and one sentence; every moment goes through the same validation as a share
link, so keep `setView` tolerant of views your module would not produce.
**Present** (`Shift+F`, Present in the Share dialog, or `&present=1` on a
link) shows your piece full screen for a talk: a clicker steps the lesson's
stops (or, without one, your presets) with each note shown large, `B`
blacks out the screen and pauses, and `Q` puts a QR code of the share link
for the current stop in a corner, so the room opens your piece in that
exact state. Your module needs nothing new for it; a view that survives a
share link survives a QR code.

*An orbit camera with software projection* (canvas2d, works on phones):

```js
import { clipBox, fsFor, label, OrbitCamera } from '@loci/kit';

const cube = [];   // the 12 edges of a cube, as pairs of corners
for (let i = 0; i < 8; i++) for (const b of [1, 2, 4]) if (!(i & b))
  cube.push([i, i | b].map(k => [k & 1 ? 1 : -1, k & 2 ? 1 : -1, k & 4 ? 1 : -1]));

export default {
  setup() { this.cam = new OrbitCamera({ yaw: 0.6, pitch: 0.4, dist: 1, minDist: 0.3, maxDist: 4 }); },
  getView() { return this.cam.isHome() ? null : this.cam.getState(); },
  setView(v) { this.cam.setState(v); },             // null resets it
  draw({ ctx, t, box, theme, events }) {
    for (const e of events) this.cam.handle(e);       // drag orbits, wheel and pinch zoom, 0 resets
    const { rot } = this.cam.view(), s = Math.min(box.w, box.h) / 4 / this.cam.dist;
    const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
    const P = p => [cx + s * (rot[0][0] * p[0] + rot[0][1] * p[1] + rot[0][2] * p[2]),
                    cy - s * (rot[1][0] * p[0] + rot[1][1] * p[1] + rot[1][2] * p[2])];
    ctx.fillStyle = theme.bg; ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    clipBox(ctx, box);
    ctx.strokeStyle = theme.a1; ctx.lineWidth = theme.lw * 1.5; ctx.beginPath();
    for (const [a, b] of cube) { ctx.moveTo(...P(a)); ctx.lineTo(...P(b)); }
    ctx.stroke(); ctx.restore();
    label(ctx, theme, 'a cube, orthographic', box.x, box.y + fsFor(box));
    return { cursor: this.cam.drag ? 'grabbing' : 'grab' };
  },
};
```

With three.js, call `this.cam.applyTo(camera)` instead of projecting, and set
`this.cam.unit` to the distance that frames your scene so `dist` stays near 1
(`hopf-fibers` does this, and also freezes its slow spin the moment the
viewer starts orbiting, so the scene holds still under the mouse).

*Draggable points with a Picker* (the pattern `elliptic-group-law` uses):

```js
import { clipBox, Picker, PanZoom } from '@loci/kit';

export default {
  setup() { this.pick = new Picker(); this.view = new PanZoom({ scale: 80 }); this.pts = [[-1, 0], [1, 0.5]]; },
  getView() { return { pts: this.pts }; },
  setView(v) { this.pts = v && Array.isArray(v.pts) ? v.pts.map(p => p.slice(0, 2)) : [[-1, 0], [1, 0.5]]; },
  draw({ ctx, box, theme, events }) {
    const V = this.view.setBox(box), toWorld = (x, y) => V.toWorld(x, y);
    for (const e of events) {
      const hit = this.pick.handle(e, toWorld);       // begin / move / end, or null
      if (hit && hit.pos) this.pts[hit.id] = hit.pos;  // hit.id is what you registered below
    }
    ctx.fillStyle = theme.bg; ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    clipBox(ctx, box);
    const S = this.pts.map(([x, y]) => V.toScreen(x, y));
    ctx.strokeStyle = theme.fg; ctx.lineWidth = theme.lw; ctx.beginPath(); ctx.moveTo(...S[0]); ctx.lineTo(...S[1]); ctx.stroke();
    this.pick.clear();                                 // hit targets for the next frame's events
    S.forEach(([x, y], i) => {
      ctx.fillStyle = theme.a1; ctx.beginPath(); ctx.arc(x, y, 6, 0, 2 * Math.PI); ctx.fill();
      this.pick.add(i, x, y, 16);                      // 16 px: comfortable for a finger
    });
    ctx.restore();
    return { cursor: this.pick.cursor() || 'default' };
  },
};
```

Things that make interaction work well:

* **Keep the piece good untouched.** Most viewers will never engage it.
  Animate as before when there is no view, and decide what happens once there
  is one: `mandelbrot-zoom` stops its zoom tour where the viewer left it and
  offers a **Resume the tour** preset with `"view": null`.
* **Hold still while engaged** if something the viewer may grab is moving:
  `elliptic-group-law` stops P sliding on `engage` and lets it go on
  `release`, unless the viewer dragged it.
* **Stay deterministic.** Handle events as a function of the events and `t`
  only; the checks replay the same input on a fresh instance and compare
  pixels.
* **Make `setView` restore everything.** The checks give the view from one
  instance to a fresh one and require the identical frame, so do not round
  it, and keep transient state (hover, a drag in progress) out of it.
* **Write a `hint`** of a few words ("Drag to orbit · scroll to zoom"), and
  a touch version on the mobile target ("pinch to zoom", "tap a circle").
* **Put the gestures in "Try this"** and in the alt text, in one clause.
* **Keyboard:** the kit's helpers answer arrow keys, + and −, and 0; give a
  custom piece a few keys too, and say which in the explanation.

## 4. Write `loci.json`

```jsonc
{
  "api": 1,
  "id": "my-piece",                          // lowercase, hyphens, unique
  "title": "Short and specific",             // ≤ 60 characters
  "hook": "One sentence that makes a stranger stop scrolling.",   // ≤ 160
  "alt": "What a screen-reader user should know the picture shows.",
  "author": "@you", "license": "MIT",
  "tags": ["Dynamics", "Teaching"],          // 2 to 6, from the vocabulary
  "runtime": "js", "entry": "index.js", "render": "canvas2d",   // or "webgl2"
  "params": [
    { "key": "r", "type": "range", "label": "Growth rate r",
      "min": 2.5, "max": 4, "step": 0.01, "default": 3.83, "format": "0.00" }
  ],
  "presets": [
    { "label": "r = 3.20, a 2-cycle", "params": { "r": 3.2 },
      "note": "The cobweb settles onto a rectangle." }
  ],
  "cycle": 16,                               // seconds, if the piece repeats
  "motion": "pause"                          // or "static" if t = 0 is a good still
}
```

* **Params** are what the viewer can change in Customize. Keep it to one
  to three. Types: `range`, `toggle`, `select`, `color`, `seed`.
* **Presets are your "Try this" list.** Each one needs a label with the
  value in it, the params it sets, and a one-sentence note on what to look
  for. At least one is required; three is usual.
* **Alt text** describes the moving picture, not the mathematics: "Twelve
  dots slide downhill on a shaded landscape and settle into four valleys."
  It is read aloud instead of the canvas.
* **Colors** are optional: `"colors": {"main": "#ff8a1f", "secondary": "#2dd4a7", "bg": …, "fg": …}`,
  the package form of the demo's `COLORS` block (`demo/github/README.md`, "The contributor template"). With
  them, `main` and `secondary` are required, and on the default palette in the Night style the piece draws
  with them as `a1` and `a2`. Without them it draws with the style's palette, as before.
* **Pointer input** is optional: `"pointer": {"mode": …, "hint": …}`, see
  "Pointer interaction" above. A preset may also carry a `"view"` (or
  `null` to reset it).

## 5. Desktop and mobile targets

A piece can ship **one module per device class** and still be one piece:
one id, one explanation, one set of params and presets, one count of likes
and saves. Each module is a **target** in `loci.json`.

**Why.** The feed is watched on phones as much as on laptops, and a phone is
a different machine: a GPU 10 to 30 times slower that throttles when hot, a
smaller box, sometimes no WebGL2 at all. A three.js scene that is the right
way to show something on a 1100×700 desktop box can be the wrong way on a
335×490 phone box. Targets let you write both, instead of shrinking the
desktop version until it fits everywhere.

| target    | what it may use | entry size | checked at |
|-----------|-----------------|------------|------------|
| `desktop` | the full API: `canvas2d`, `webgl2`, `@loci/three`, WASM | JS ≤ 2 MB, WASM ≤ 2 MB | 1100×700 and 700×300, pixel ratio 1; p95 < 16 ms, CPU + GPU |
| `mobile`  | `canvas2d`, or WASM `pixels`/`commands`; **no `webgl2`** | JS ≤ 200 KB, WASM ≤ 2 MB | 335×490 and 700×300, pixel ratio 1 and 2; p95 < 12 ms |
| `download`| nothing runs: metadata for an offline copy | none | not run |

```jsonc
{
  "api": 1, "id": "hopf-fibers", "title": "…", "runtime": "js",
  "params": [ … ], "presets": [ … ], "motion": "pause",
  "targets": [
    { "id": "desktop", "render": "webgl2", "entry": "index.js", "requires": ["webgl2"] },
    { "id": "mobile", "render": "canvas2d", "entry": "mobile.js",
      "params": ["lat", "count", "second"], "note": "Lines sorted by depth instead of shaded tubes." },
    { "id": "download", "format": "html", "url": "https://…/hopf-fibers.html",
      "size": 688128, "note": "One self-contained HTML file for a room without a network." }
  ]
}
```

A manifest without `targets` is exactly what it was before: one target
that runs everywhere and is checked against the full matrix. You need
targets only when one module cannot serve both.

**Which one runs.** A viewer on a phone (a coarse pointer, a viewport under
700 px wide, Save-Data on, or no WebGL2 when the desktop target needs it)
gets `mobile`; everyone else gets `desktop`. The viewer can switch with
**Mode** in Customize (it remounts the slide with the same params and
time), and a share link may carry `?mode=desktop` or `?mode=mobile`. A
choice wins only if that target can run on the device. If no target can
run (a desktop-only WebGL2 piece on a phone without it, or a `minBox`
larger than the screen), the slide shows a poster and a card with the
share link instead of the piece.

**Writing a mobile sibling.**

* **Same mathematics, same picture.** Reviewers compare the two targets
  side by side (review-pipeline.md, section 4). Same params, same presets,
  same camera path as a function of `t`, same colors from the theme, same
  labels. The mobile version may draw less (lines instead of shaded tubes,
  half resolution, fewer iterations) but never something else.
* **Share the code that defines the picture**, not the renderer: the
  parametrization, the camera as a function of `t`, the color formula. In
  `hopf-fibers` both targets use the same `fiber(lat, lon)` and the same
  rotation; the mobile one projects and depth-sorts in software. In
  `mandelbrot-zoom` both use the same zoom path and the same smooth
  coloring; the mobile one iterates on the CPU into an `ImageData` at half
  the box's resolution, cached by size.
* **Clamps.** If the phone cannot afford a param's full range, clamp it in
  the mobile module, show the clamp in the readout ("200 iterations, capped
  from 1000 on phones"), and say so in the explanation's *Try this*. Do not
  change the param's range in the manifest: it is shared.
* **Params a target ignores.** List the params a target honors in its
  `params`; Customize shows the others disabled with a note ("Not used by
  the mobile version"). Every key must be a param of the piece.
* **Budget** for the phone box at pixel ratio 2. A per-frame cost that
  depends on `t` (a zoom getting deeper) is fine as long as the worst
  stretch stays in budget; lowering resolution as a function of `t` keeps
  frames deterministic.

**Fields.** `id` is `desktop`, `mobile` or `download`, each at most once,
and at least one of `desktop` and `mobile` must exist. `runtime`, `render`
and `entry` default to the top-level ones. `requires: ["webgl2"]` is
implied by `render: "webgl2"`. `minBox: [w, h]` is the smallest box (CSS
px) the target is usable at. `note` is shown under Mode in Customize.

**Download metadata.** A `download` target is not run or fetched by Loci:
it has `format` (`zip`, `html` or `app`), `url`, optionally `size` in bytes
and a `note`, and the Source tab shows it as a plain download link. Use it
for an offline copy for a lecture room, or a native build. The checks only
validate the fields; the file behind the URL is your responsibility and is
not reviewed.

## 6. Write `explanation.md`

Between 150 and 1200 words, in this order:

```markdown
## Title of the idea

One or two paragraphs: what object this is, in precise terms, with the
defining equation or construction.

### What you're seeing
How the picture encodes the mathematics: what the axes, colors and motion
mean, and what the parameter does.

### Try this
- Bulleted. Each bullet matches a preset and says what to notice.

### Where it leads (optional)
One paragraph connecting to something bigger.

**Reference.** Author, *Title*, edition or journal, year, chapter or pages.
```

Writing rules that reviewers check:

* **Every fact is checkable** from your reference or from standard
  undergraduate mathematics. If you cannot cite it, cut it or mark it as a
  conjecture.
* **State hypotheses.** "A line meets a cubic in three points" needs
  "counted with multiplicity, over ℂ".
* **Name things properly** the first time (Bézout's theorem, Mordell–Weil),
  then use them freely.
* **Notation:** Markdown, with formulas either in TeX or in Unicode. No
  images.
  * **TeX** goes between `$…$` (inline) or `$$…$$` (display, best on its
    own lines) and is typeset by KaTeX in the Explanation tab:

    ```markdown
    The epicycloid is traced by

    $$
    z(\theta) = \frac{k\,e^{i\theta} + e^{ik\theta}}{k + 1},
    $$

    where $e^{i\theta}$ runs once around the unit circle.
    ```

    Anything KaTeX supports is allowed except custom macros (`\def`,
    `\newcommand`, `\let` and friends) and the commands that make links,
    images or HTML (`\href`, `\url`, `\includegraphics`, `\html…`). A
    formula KaTeX cannot parse fails the Explanation check with its line;
    one over 400 characters is a warning. Write `\$` for a literal dollar
    sign: a stray `$` is a warning. Math inside code (backticks, fenced or
    indented blocks) is left alone, so do not indent a `$$` block four
    spaces. Formulas do not count toward the 150 to 1200 words, and every
    displayed formula should say in words what it is.
  * **Unicode** is still fine and needs nothing loaded
    (*y² = x³ + ax + b*, ∇f, 𝔽_p); a four-space-indented display shows as
    a code block.

  Both read well in the raw `explanation.md` view, on GitHub and in RSS,
  where TeX shows as source. Pick one per explanation.
* **Voice:** second person, present tense, short sentences. Say what
  happens, not how exciting it is.
* **Numbers you quote** (Feigenbaum's constant, a Lyapunov exponent) need
  the reference that computed them.

The explanation is shown as written and also as `explanation.md` raw, so
keep it clean.

### Live links (optional)

A Markdown link whose target starts with one of four reserved `#scheme:`
prefixes drives the piece from the Explanation tab instead of going
anywhere. The raw file stays plain Markdown; on GitHub or in RSS these links
just jump nowhere.

| Link | What it does |
|---|---|
| `[Set *r* = 3.2](#preset:r-3-20)` | applies a preset, the same as its pill. Name it by its label lowercased with every run of other characters turned into `-` (`"r = 3.20, a 2-cycle"` is `r-3-20-a-2-cycle`), or by a unique leading part of that (`r-3-20`), or by its index from 0 (`#preset:0`) |
| `[pause at t = 2 s](#t:2)` | seeks to that time in seconds and pauses |
| `[see it at r = 3](#state:eyJwIjp7InIiOjMwMH0sInQiOjE1fQ)` | puts the piece at a moment and pauses: base64url JSON of a lesson stop, `{"p": {"r": 300}, "t": 15}`, with optional `view` and `note` (shown in the callout). A state with `p` sets every param (unlisted ones to their defaults); without `p` the params are kept. The `p=` value of a share link works when it has no `theme` |
| `[*r*](#param:r)` | a readout: the link text gets a dotted underline, and hovering or focusing it shows the param's current value and label (`r = 3.83 · Growth rate r`), updated as presets, links and steps change it. Clicking it opens Customize at that control |

`#param:` covers only params declared in `loci.json`. A quantity your
module drives from time (the multiplier *k* sweeping in times-table, say)
is not a param and has no readout; write a `#t:` link to the moment
instead.

**Why it works.** A section headed `### Why it works` whose next element is
a list (numbered or bulleted) becomes a step-through: the tab shows a "Step
through (*n* steps)" button over the list, and then one step at a time with
Back and Next (and ← → while the step has focus). When a step is shown, its
first `#preset:`, `#t:` or `#state:` link is applied, the piece pauses, and
the step's text goes to the slide's callout. "Show all steps", another tab
or closing the panel ends it, and the piece plays again if it was playing.
Make each step's picture show what the step claims, and say so when a step
is something the picture cannot show: reviewers check both. A sequence of
pictures is a sketch, not a proof; name the section "Why it works".

The Links check validates every live link against your `loci.json` and
fails with the line: an unknown preset label (`#preset:nope`), a time that
is not a number ≥ 0, a state that is not base64url JSON or sets a param to
a value `normalizeParams` would change, or an unknown param. An unknown
`#scheme:` is a warning. The report counts the links and the Why it works
steps.

## 7. Accessibility checklist

The host handles most of it (pause, reduced motion, focus, announcements)
if you follow the contract. What is yours:

* `alt` text, as above.
* Nothing that flashes more than three times a second. The checks measure
  this and it is a hard fail.
* Meaning never carried by color alone: pair `a1` and `a2` with position,
  shape or a label.
* Labels big enough to read at phone size: use `fsFor(box)` for the base
  size and never go below 12 px.
* With `theme.labels` off the piece still makes sense as a picture.

## 8. Run the checks and open a pull request

Submissions are pull requests to the **registry**, a repository on GitHub
(`demo/github/README.md` sets one up). There is no upload on the site.

First, the pre-flight: open **Browse → Submit a visualization**, drop your
folder or zip, and wait about a minute. You get a report with every check from
review-pipeline.md section 2, and for any failure the size, palette, `t` and
frame where it happened. Fix and re-drop until nothing fails. Nothing leaves
your browser.

In the registry, a piece is a folder named after its `id`:

```
entries/my-piece/
  loci.json
  index.js           (or module.wasm; or one entry per target, e.g. index.js and mobile.js)
  explanation.md
  LICENSE
```

When nothing fails, the Submit page's **Submit on GitHub** section walks you
through three steps:

1. **Download for the registry.** A zip of your package laid out as
   `entries/<id>/`. Unzip it.
2. **Open the registry.** The link goes to GitHub's upload page for
   `entries/<id>` in the registry. Drag in the files from inside the unzipped
   folder, choose **Create a new branch** (GitHub makes a fork for you if you
   cannot write to the registry) and press **Propose changes**.
3. **Copy pull request text** and paste it into the pull request's
   description: title, hook, tags, license, your check summary with any
   warnings, and the `?v=` preview link. Then **Create pull request**.

If the page says the registry is not set up yet, it still gives you the zip
and the text; open the pull request by hand with the same folder.

Then:

1. **Within minutes** the registry's `check` runs the static checks again on
   the pull request, and a best-effort dynamic run plays the piece in a
   headless browser. If something fails, the bot requests changes with the
   file and line; push a fix to the same pull request and it reruns. If it
   passes, the bot assigns two moderators and turns on auto-merge.
2. **Within about two days** the two reviewers check the mathematics in the
   explanation (and only that) against a short form (review-pipeline.md
   section 4). A marked error comes back to you on the pull request with the
   line; fix it and push. When both approve, it merges, and within a minute
   the piece is in the feed with a "Community reviewed" badge. Share links
   work from then on.
3. **In the month it is reviewed,** it is eligible for a monthly
   distinction: a signed two-sentence citation from a jury of three
   reviewers who never see likes or views (`docs/distinctions.md`). You do
   not need to do anything.

A remix is submitted the same way: **Check this remix** in the editor, then
**Prepare pull request** takes the remix package (its own id
`<parent>-remix-<hash>`, `"remixOf"` naming the parent) to the same three
steps. **Post to Playground** on the demo server is not a submission: it
shares the remix unreviewed, under the Playground chip.

### Updating a piece

Open a new pull request that changes the files in `entries/<id>/` (the
Submit page's steps work for this too: drag the changed files onto the same
upload page). The checks run again and it needs two approvals like any pull
request. Old share links keep showing the version they named.

### Licensing

Your code stays yours under the OSI license you chose. By opening the pull request you
agree that Loci may run it in the feed, show its source in the Source tab,
let viewers remix it in their browser under that license, and capture frames
for thumbnails and roundups. Explanations are published under CC BY 4.0 with
your name on them.

## 9. Common reasons a package is returned

| Report line | What it means | Fix |
|---|---|---|
| `outside box at (x,y)` | you drew under the controls | `clipBox(ctx, box)` and compute from `box`, not the canvas |
| `budget p95 18.4 ms @ 1100×700 night` | too slow on desktop | cache the heavy part in `state`; lower resolution for the background pass |
| `Played … the frame differs from a fresh instance seeked to the same t` | state advanced by `dt` (velocities added per frame, a particle list stepped each draw) | key the simulation on `t`: step a fixed `dt` from the cycle start up to `t`, caching the last step in `state` |
| `nondeterministic at t=11` | `Math.random`, `Date`, or state that depends on frame rate | use `mulberry32(seed)`; integrate with a fixed step from the cycle start |
| `param r: min == default` | the slider does nothing visible at one end | widen the range or pick a better parameter |
| `labels off: text detected` | `fillText` called directly | use `label()` |
| `line 41: while loop in GLSL` | an unbounded shader loop | `for` with a literal cap and `if (i >= u_n) break;` |
| `line 52: for (i<u_n) has no literal bound` (warning) | the loop bound is a uniform with no cap | add the literal cap and the break |
| `flash 5/s @ t=3.2` | luminance flicker | fade instead of toggling; slow the cycle |
| `explanation: missing Reference` | no reference line | add one; it is required |
| `alt == hook` | you reused the hook | describe the picture instead |
| `declares pointer mode "orbit" … but never reads events` (warning) | `pointer` is set but the module ignores input | read `events` in `draw` (or define `onEvent`), or drop `pointer` |
| `the frame after the scripted input … is identical` | the piece declares pointer but nothing answers a drag, the wheel, a click or a key | handle at least one of them; check `e.x`, `e.y` are compared with `box`, not the box's origin |
| `a fresh instance given the view … draws a different frame` | `setView` does not restore everything, or the view is rounded | report exact values, include everything input changed, keep hover and in-progress drags out |
