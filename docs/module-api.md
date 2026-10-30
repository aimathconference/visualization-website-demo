# Loci module API (v1)

A Loci visualization is an untrusted, user-uploaded module: either an ES module
(JavaScript) or a WebAssembly binary. The site never runs it on the page. It
runs in a dedicated Web Worker that owns an `OffscreenCanvas`, and the only
thing it shares with the site is the contract below.

## 1. Package layout

```
my-viz/
  loci.json        manifest (required)
  index.js         entry for runtime "js"   (ES module, default export)
  module.wasm      entry for runtime "wasm"
  explanation.md   markdown shown in the Explanation tab
```

Uploads are content-addressed. The hash of the package is what reviewers sign
off on and what the feed loads, so "reviewed Oct 2026" refers to exact bytes.

## 2. Manifest: `loci.json`

```jsonc
{
  "api": 1,
  "id": "elliptic-group-law",
  "title": "The group law on an elliptic curve",
  "runtime": "js",                 // "js" | "wasm"
  "entry": "index.js",
  "render": "canvas2d",            // js: "canvas2d" | "webgl2". wasm: "pixels" | "commands"
  "params": [                      // host renders the Customize controls from this
    { "key": "b", "type": "range", "label": "Coefficient b",
      "min": 0.05, "max": 2, "step": 0.05, "default": 1, "format": "0.00" },
    { "key": "mode", "type": "select", "label": "Mode",
      "options": [["cobweb","Cobweb"],["orbit","Orbit"]], "default": "cobweb" },
    { "key": "showGrid", "type": "toggle", "label": "Grid", "default": true },
    { "key": "seed", "type": "seed" }
  ],
  "presets": [                     // the "Try this" list, tappable
    { "label": "Split the curve", "params": { "b": 0.3 },
      "note": "Below 2/(3√3) the real curve has two components." },
    { "label": "Wait for k = 51", "params": { "n": 101 }, "t": 271 },  // optional t: also seek there
    { "label": "P on the oval", "params": { "b": 30 }, "view": { "P": [-0.95, 1] } },  // optional view (section 5); null resets it
    { "label": "n = 50, wait for k = 49", "params": { "n": 50 }, "t": 258, "foundBy": "@kmoreau.geom" }  // optional credit, see below
  ],
  "pointer": { "mode": "custom", "wheel": false, "hint": "Drag P or Q along the curve" },  // optional, see "Pointer"
  "cycle": 24,                     // optional: seconds after which the piece repeats
  "motion": "pause"                // what reduced-motion users get: "pause" | "static"
}
```

Param types are a closed set. The host validates every value, clamps ranges,
drops unknown keys and fills defaults. A module never receives an invalid value.

| type     | fields                              | value   |
|----------|-------------------------------------|---------|
| `range`  | min, max, step, default, format     | number  |
| `toggle` | default                             | boolean |
| `select` | options `[[value,label],…]`, default| string  |
| `color`  | default (`#rrggbb`)                 | string  |
| `seed`   | (none; host supplies a 32-bit int)  | integer |

Ranges snap to the grid `min + k·step` (so a value can only ever be one the
slider could produce), seeds are reduced to unsigned 32-bit integers, colors are
lowercased `#rrggbb`. If a manifest has a `seed` param, its value is also what
the module receives as `seed`. `format` is a pattern: the run of zeros sets the
decimals and the text around it is kept (`"0.00"`, `"0°"`, `"0.0 s"`). Catalog
entries built into the site may use a `fmt(value)` function instead, for display
only; it never reaches the worker. The reference implementation is `manifest.js`
(`validateManifest`, `normalizeParams`, `paramControls`).

**Optional metadata: `bounty`.** A piece that answers a request on the
Wanted page may name it: `"bounty": "riemann-order"`, the challenge's id
(lowercase letters, digits and dashes; `validateManifest` refuses anything
else). It changes nothing about how the piece runs or is checked. The site
shows a small "Answers: *challenge title*" line at the top of the piece's
Explanation tab, linking to the challenge; an id the site does not know is
shown as "Answers an unknown challenge". How challenges are posted and picked
is in `bounties.md`.

**Optional credit on a preset: `foundBy`.** A preset that a viewer found and
proposed (Share, "Propose this moment as a preset", which opens a prefilled
issue on the piece's repository) may credit them: `"foundBy": "@handle"`, an
`@` and up to 39 letters, digits, dots, dashes or underscores;
`validateManifest` refuses anything else, naming `presets[i].foundBy`. The
pill, the Customize preset and the callout say "found by @handle", the
preset's accessible name and announcement include it, and the handle links to
the finder's profile, which lists the preset under "Found". Adding a preset
changes `loci.json` only, so it keeps the piece's review lane
(review-pipeline.md section 6). There are no points, streaks or counts: the
credit is the reward (docs/ideas/18-found-by-presets.md).

**Optional metadata: `after`.** The pieces this one builds on, by id, at most
three: `"after": ["logistic-bifurcation"]`. List a piece only if you would
assign it first ("helps to have seen"), not because it shares a topic; the
prose version belongs in explanation.md's "Where it leads". `validateManifest`
refuses anything but an array of ids (lowercase letters, digits and dashes),
duplicates, and the piece's own id. The static check **Builds on (after)**
warns, without failing, when an id is not a piece it knows, since only the
catalog bundled with the page is visible in the browser and the server gate
resolves ids against the published index; it also warns when following
`after` leads back to the piece (a cycle). The Explanation tab shows the listed
pieces as "Before this" cards. "Next" is never authored: it is derived from
the other pieces whose `after` names this one, so nobody can write another
piece's Next list. Nothing is gated on these links: every piece stays playable
on its own, in any order.

### Targets

A piece may ship one module per device class. The targets share the
manifest's `id`, `title`, `params`, `presets`, explanation, likes and saves;
each names its own module.

```jsonc
"runtime": "js",                   // top-level runtime/render/entry: defaults every target inherits
"targets": [
  { "id": "desktop", "render": "webgl2", "entry": "index.js", "requires": ["webgl2"] },
  { "id": "mobile", "render": "canvas2d", "entry": "mobile.js",
    "params": ["iter", "target"], "note": "On the CPU at half resolution, at most 200 iterations." },
  { "id": "download", "format": "html", "url": "https://…/piece.html", "size": 688128, "note": "…" }
]
```

| field | for | meaning |
|---|---|---|
| `id` | all | `"desktop"`, `"mobile"` or `"download"`; each at most once |
| `runtime`, `render`, `entry` | desktop, mobile | required, after inheriting the top-level ones |
| `requires` | desktop, mobile | capabilities the target needs: `["webgl2"]` (implied by `render: "webgl2"`) |
| `minBox` | desktop, mobile | `[w, h]`, the smallest drawing box in CSS px the target is usable at |
| `params` | desktop, mobile | the param keys this target honors (a subset of the piece's); others are shown disabled |
| `pointer` | desktop, mobile | this target's pointer declaration (below); overrides the manifest's |
| `note` | all | one line shown with the Mode control (or the download link) |
| `format`, `url`, `size` | download | `zip`, `html` or `app`; a URL; the size in bytes. Metadata only: never run or fetched |

Rules (`targetProblems` in `manifest.js`): ids unique; at least one of
`desktop` and `mobile`; a **mobile** target may only use `canvas2d` or WASM
`pixels`/`commands` and may not require `webgl2`, and keeps the JS entry
limit of 200 KB; a **desktop** target may use `webgl2` and `@loci/three`, with
a 2 MB JS limit; a download target has `url` and `format` and nothing
runnable. **Without `targets`** the manifest is one target with id `"any"`,
from its top-level `runtime`, `render` and `entry`: every manifest written
before targets existed is still valid and means what it meant. With
`targets`, the top-level `render` and `entry` are optional.

`targetFor(manifest, caps)` picks the target to run, with
`caps = {webgl2, coarsePointer, viewportW, viewportH, saveData, preferred?, box?}`:

1. a `preferred` target (the viewer's Mode choice, or `?mode=` in a link)
   wins if it exists and can run here (its `requires` and `minBox` are met);
2. on a phone (coarse pointer, viewport under 700 px wide, Save-Data, or no
   WebGL2 when the desktop target requires it) the mobile target;
3. otherwise the desktop target, then whichever target can run;
4. if none can, the result carries `fallback: {reason: 'webgl2' | 'minBox',
   message}` and the host shows a poster and a card instead of mounting.

Each target's module receives the same normalized params (including keys it
does not honor) and the same theme; `manifestForTarget(manifest, target)` is
the manifest view a target's worker gets.

### Pointer

A piece may take mouse, touch and keyboard input. The manifest, or a desktop
or mobile target (whose declaration wins), declares it:

```jsonc
"pointer": {
  "mode": "orbit",          // "none" (default) | "orbit" | "pan-zoom" | "custom"
  "drag": true,             // pointer drags (and presses) go to the module   } each defaults to true;
  "click": true,            // clicks and double-clicks                        } false leaves that input
  "keys": true,             // keydown / keyup                                 } with the page
  "wheel": true,            // the scroll wheel and trackpad scrolling         }
  "hint": "Drag to orbit · scroll to zoom"   // ≤ 80 characters, shown on the slide while engaged
}
```

`mode` says what the input means, for the hint and for reviewers: `orbit`
(a 3D camera), `pan-zoom` (a 2D view), `custom` (anything else: dragged
points, clicks that place things). The host treats all three the same; the
module does the work, usually with the kit's `OrbitCamera`, `PanZoom` and
`Picker` (section 3). Without `hint` the host shows a default per mode.
`pointerProblems` and `pointerFor` in `manifest.js` validate and fill it in.

**Engagement.** The feed is scrolled by dragging, so a piece never takes
input by surprise. With `mode` other than `"none"` the slide is
*engageable*: it shows "Click to interact" ("Tap to interact" on touch), and
its canvas is focusable with an `aria-label` that says so. A click or tap on
the stage, or Enter on the focused canvas, *engages* it: the hint becomes the
declared `hint` plus "Esc to release", an outline marks the box, the live
region announces it, and until release

* pointer drags go to the module (with pointer capture), and the host's
  scrub-by-drag and long-press are off; on touch the stage stops panning the
  feed, so one finger drags, two pinch, and a double tap is a `dblclick`;
* the wheel over the stage goes to the module instead of scrolling the feed
  (when `wheel` is declared);
* keys go to the module, except Esc (which releases), Tab (which moves focus
  away, and so releases) and shortcuts with Ctrl, ⌘ or Alt;
* the context menu is suppressed, so right-drag can pan.

Esc, a press outside the stage, scrolling to another slide, opening a panel
or dialog, or leaving the feed releases it. The module hears `engage` and
`release` as events. With `mode: "none"`, or no declaration, nothing
changes: the slide scrubs time by horizontal drag as before and the module
gets no events. A double-click no longer likes an engageable piece (the
Like button and L still do).

**Theme is not a param.** Palette (`bg, fg, a1, a2`), font family, line width,
label visibility and animation speed are owned by the host, shared across every
piece, and passed to the module read-only. This is what lets a viewer apply one
look to the whole feed.

## 3. Runtime contract

The host owns the clock, the random seed and the canvas size. The module must
be a pure function of `(t, params, theme, box, seed)`: the same inputs give the
same picture, so a share link reproduces exactly what the sharer saw.

### JavaScript (`runtime: "js"`)

```js
export default {
  // once, after the worker has the canvas. Return nothing or a Promise.
  setup({ ctx, gl, canvas, env }) {},
  // every frame. Draw inside `box` only; the host overlays controls outside it.
  // May return { labels: [...] } (below).
  draw({ ctx, gl, canvas, t, dt, box, viewport, theme, params, seed, state, dpr, events, engaged }) {},
  // optional
  resize({ box, dpr }) {},
  dispose() {},
  onEvent(e, { box, t, params, theme, state, dpr, engaged }) {},   // pointer input as it arrives (below)
  getView() {}, setView(view) {}                                   // the view a share link keeps (section 5)
};
```

`ctx` is set for `render: "canvas2d"`, `gl` and `viewport` for `render: "webgl2"`
(the other is `null`/absent). `canvas` is the worker's `OffscreenCanvas` and
`dpr` the device pixel ratio, in both modes.

* `ctx` is a `CanvasRenderingContext2D` (an `OffscreenCanvasRenderingContext2D`
  in the worker) already scaled for device pixel ratio, with its state reset
  every frame. `box = {x, y, w, h}` is the safe drawing area in CSS pixels; the
  canvas itself covers the whole slide, and its CSS size is
  `ctx.canvas.width / ctx.getTransform().a` by the same for height.
* `document.createElement('canvas')` works in the worker and returns an
  `OffscreenCanvas`, so offscreen buffers written for the page keep working.
  Nothing else of `document` exists.
* `theme = { bg, fg, a1, a2, font, lw, labels }`. Honor `labels`: when false,
  draw no text. Use `theme.lw` as the base stroke width.
* `state` is a plain object that persists between frames for caching. Key
  caches on what they depend on (size, palette) as the built-in pieces do.
* `t` is seconds and may jump backwards (scrub, restart). Modules that integrate
  over time must detect that and recompute from the cycle start.
* `import { hex, mix, rgba, label, clipBox, fsFor, mulberry32, OrbitCamera, PanZoom, Picker } from '@loci/kit'`
  is resolved by the worker (`kit.js`). Any other `import`, `import()` or
  `export … from` is refused before the module runs.
* No `Math.random` for anything that affects the picture: use `mulberry32(seed)`
  from the kit.
* **Labels as data.** `draw` may return `{ labels: [{ text, x, y, size?,
  weight?, color?, align?, alpha?, halo? }] }`. Coordinates are CSS pixels relative to
  the canvas (so include `box.x`, `box.y`), `y` is the alphabetic baseline,
  `size` defaults to 13 (clamped to 6–96), `weight` is 400 or 700, `color` is
  `"fg"`, `"bg"`, `"a1"`, `"a2"` or a `#rrggbb`, `align` is `left`, `center`
  or `right`. At most 64 labels of 200 characters each. The host draws them
  on a transparent overlay canvas above the stage in the viewer's font,
  clipped to the box, drops them all while `theme.labels` is false, and
  composites them into `capture()` PNGs. Every label gets a readable halo, a
  2.5 px stroke in `theme.bg` at 70% opacity under the glyphs, unless it has
  `halo: false`; the kit's `label(ctx, theme, text, x, y, {halo})` does the
  same on a 2D canvas. This is the only way a `webgl2`
  module shows text; `canvas2d` modules may use it too (or keep `label()`).

#### Pointer events

A target that declares `pointer` (section 2) gets input while the viewer has
engaged it. The host normalizes every event to one shape, with every field
present:

```js
{ type,              // 'pointerdown' | 'pointermove' | 'pointerup' | 'pointercancel' | 'click' | 'dblclick'
                     // | 'wheel' | 'keydown' | 'keyup' | 'engage' | 'release'
  x, y,              // CSS px relative to the canvas, like box (so compare with box.x, box.y)
  dx, dy,            // movement since this pointer's last event (summed over a frame)
  button, buttons,   // as in DOM PointerEvent: button 0 left, 1 middle, 2 right; buttons a bit mask (touch: 1)
  deltaX, deltaY,    // wheel, in CSS px (line and page modes converted)
  key, code, repeat, // keyboard
  shift, ctrl, alt, meta,
  pointerType,       // 'mouse' | 'pen' | 'touch'
  pointers,          // [{id, x, y}] every pointer that is down (two while pinching)
  t }                // the piece's time when the event happened
```

* **Coalesced per frame.** The host sends at most one `pointermove` per
  animation frame (positions are the latest, `dx`/`dy` summed) and one
  `wheel` (deltas summed); presses, releases, clicks and keys keep their
  order. At most 64 events wait between frames.
* **Clicks are synthesized** by the host from a press and release of the
  primary button that moved less than 6 px within 600 ms; two within
  350 ms and 24 px also give a `dblclick`. A drag therefore never clicks.
* **Two ways to read them.** `draw` receives `events`, the list since the
  last frame (empty most frames), and `engaged`, whether the viewer has the
  piece engaged now. If the module defines `onEvent(e, info)`, the worker
  also calls it for each event as it arrives, before the next draw. A paused
  piece is redrawn after each batch, so input works while the clock is
  stopped.
* **Cursor.** `draw` (or `onEvent`) may return `{ cursor }`, one of
  `default`, `pointer`, `grab`, `grabbing`, `crosshair`, `move`, `none`,
  `zoom-in`, `zoom-out`, `ew-resize`, `ns-resize`; the host sets it on the
  canvas (alongside `labels`, which `draw` returns as before).
* **Determinism.** Input is part of the picture's inputs: the same events at
  the same `t` from a fresh instance must give the same frame. Keep what
  input changes (a camera, a selection, dragged points) in plain JSON and
  report it as the **view**: return `{ view }` from `draw`, or define
  `getView()`. To restore it the worker calls `setView(view)` after `setup`
  (from a share link, an embed or a preset) and whenever the host changes
  it; `setView(null)` means the default view. A view is at most 2 KB of JSON;
  a larger one is ignored with a console warning. The checks (review
  pipeline, "Pointer events", "View round-trip") replay a scripted sequence
  and restore the resulting view on a fresh instance.
* WASM modules get no events in API v1.

**Kit helpers.** Three small classes in `@loci/kit` do the common work. Each
has `handle(e)` (true when its state changed) and `getState()` /
`setState(s)` with plain-JSON state, exact rather than rounded, so a view
built from them restores the identical frame.

* `new OrbitCamera({ yaw, pitch, dist, target, minDist, maxDist })`: left
  drag orbits (pitch clamped to ±1.5 rad), right drag or Shift-drag pans the
  target in the view plane, wheel and pinch zoom `dist` exponentially, arrow
  keys orbit (Shift+arrows pan), `+`/`-` zoom, `0` resets. `view()` returns
  `{ rot, eye, target, right, up, back, dist }`, where `rot` is the 3×3
  world-to-camera rotation with rows right, up and back, for software
  projection (`p_cam = rot · (p − eye)`, the camera looking along −back);
  `applyTo(camera)` points a three.js camera. Set `cam.unit` to scale `dist`
  to the scene and `cam.pxScale` to the world size of one CSS px at distance
  1 for exact panning; `isHome()` says whether it is still where it started.
* `new PanZoom({ center: [x, y], scale, minScale, maxScale })` for 2D views,
  `scale` in CSS px per world unit, y up: drag pans, wheel and pinch zoom
  about the pointer, `dblclick` zooms in 2× there (Shift: out), arrow keys
  pan, `+`/`-` zoom, `0` resets. Call `setBox(box)` each frame;
  `toWorld(px, py)` and `toScreen(wx, wy)` convert.
* `new Picker()`: hit targets in CSS px, registered every frame after
  drawing: `add(id, x, y, r)` for a disc, `addHit(id, fn, r)` for a hit
  function returning a distance. `pick(x, y)` is the nearest id within its
  radius, or null. For draggable points `handle(e, toWorld)` returns
  `{ type: 'begin' | 'move' | 'end', id, pos }` with `pos` the grabbed point's
  new position through `toWorld` (it keeps the offset between the pointer and
  the point's centre); `cursor()` is `'grab'`, `'grabbing'` or null.

`docs/submitting.md`, "Pointer interaction", has worked examples.

#### `render: "webgl2"`

The worker calls `canvas.getContext('webgl2', { antialias: true, alpha: false,
preserveDrawingBuffer: false, powerPreference: 'low-power' })` and passes the
context as `gl`. If the browser has no WebGL2, setup fails with an error card.

* **Host guarantees, before every `draw`:** the default framebuffer is bound;
  the whole canvas is cleared to `theme.bg` (color, depth 1, stencil 0);
  `SCISSOR_TEST` is enabled; `gl.viewport` and `gl.scissor` are the box in
  device pixels. `viewport` is that rectangle as `[x, y, w, h]` in GL
  convention (origin bottom left), ready for `gl.viewport(...viewport)` or a
  `u_vp` uniform. **After every `draw`** the host clears everything outside
  the box back to `theme.bg`, so nothing a module does leaks under the
  controls.
* **State.** GL objects (programs, buffers, textures, VAOs) persist between
  frames; build them in `setup` or cache them in `state`. Pipeline state does
  not: the host changes the bound framebuffer, viewport, scissor, clear color
  and write masks around each draw, so set what you depend on every frame.
* **Text.** A WebGL canvas has no `fillText`; return labels (above).
* **Capture.** The host draws and snapshots the frame in the same task, so
  `preserveDrawingBuffer: false` is fine; do not read the drawing buffer
  yourself across frames.
* **Context loss** (`webglcontextlost`) is reported as
  `{type: 'error', message: 'GPU context lost'}`; the slide shows the stopped
  card with Restart, which mounts a fresh worker and context.
* **Timing.** The host measures CPU time per draw as for canvas2d. If the
  browser exposes `EXT_disjoint_timer_query_webgl2`, the worker also wraps
  each draw in a `TIME_ELAPSED` query and reports GPU time; the budget then
  uses CPU + GPU. Do not issue your own `TIME_ELAPSED` queries.

**GPU caveats.** The watchdog terminates a stalled worker, but it cannot stop
a GPU that is stuck in a long shader: the browser may hang or reset the GPU
process first. So every loop in GLSL must be visibly bounded: a `for` with an
integer-literal (or `const`/`#define`) trip count, or `if (i >= N) break;`
with a literal `N` when the real bound is a uniform; never `while`. The
submission checks enforce this (review-pipeline.md, "Shader loops"). Phone
GPUs are often 10–30× slower than a laptop's and throttle when hot: budget
for the phone box (335×490 at dpr 2–3), and prefer fewer iterations to a
raymarcher with an unbounded step count.

#### Trusted import: `@loci/three`

```js
import * as THREE from '@loci/three';     // or import { Mesh, ... } from '@loci/three'
```

Besides `@loci/kit`, this is the only import a module may use. The host
resolves it to one pinned three.js ES module build,
`https://cdnjs.cloudflare.com/ajax/libs/three.js/0.170.0/three.module.min.js`
(r170, checked against a SHA-384 SRI hash), fetched once per page and handed
to each worker as text, which imports it from a Blob URL; a worker started
without it fetches it itself before lockdown. Authors do not bundle three.js,
so a three.js piece stays a few KB. Use it with the host's context:

```js
setup({ gl, canvas }) {
  this.renderer = new THREE.WebGLRenderer({ canvas, context: gl, antialias: true });
  this.renderer.autoClear = false;          // the host already cleared to theme.bg
},
draw({ viewport, box, theme, t }) {
  const r = this.renderer;
  r.resetState();                           // the host changed GL state behind three's back
  r.setViewport(...viewport); r.setScissor(...viewport); r.setScissorTest(true);
  camera.aspect = box.w / box.h; camera.updateProjectionMatrix();
  r.render(scene, camera);
}
```

Gotchas: never call `renderer.setSize` or `setPixelRatio` (the host owns the
canvas size; the pixel ratio stays 1, so `viewport` is already in device
pixels); call `resetState()` first in every draw; there is no DOM, so no
`OrbitControls`, loaders that use `Image`, or `CSS2DRenderer`: the camera is a
function of `t`, params and the view (use the kit's `OrbitCamera` and
`applyTo(camera)` for an orbit camera); three's `Color` takes the theme's hex strings
directly. Only the core build is available, not `three/addons`.

Two catalog pieces are complete examples: `mandelbrot-zoom` (raw GLSL, one
full-box triangle) and `hopf-fibers` (three.js). Their source is in
`catalog.js` and in each slide's Source tab.

### WebAssembly (`runtime: "wasm"`)

Exports, all plain numbers (`f64` unless noted):

```
memory
init(w: i32, h: i32, dpr: f64)          -> i32   0 on success
set_param(index: i32, value: f64)                 index into manifest.params
set_theme(bg: u32, fg: u32, a1: u32, a2: u32, lw: f64, labels: i32)
resize(w: i32, h: i32)
frame(t: f64) -> i32                              pointer into memory
```

* `w, h` (in `init` and `resize`) are the size of the drawing **box**, not the
  canvas: CSS pixels for `"commands"`, device pixels for `"pixels"`. The host
  fills the canvas with `theme.bg`, then places the module's output at the box
  origin and clips it to the box.
* `set_theme` colors are `0xRRGGBB`. `set_param` values: ranges as numbers,
  toggles as 0/1, `select` as the option index, colors as `0xRRGGBB`, seeds as
  the integer. The host calls `set_theme` and every `set_param` after `init`,
  and again whenever they change.
* `render: "pixels"`: `frame` returns a pointer to a `w*h*4` RGBA buffer the
  host blits with `putImageData`. Simplest and language-agnostic.
* `render: "commands"`: `frame` returns a pointer (4-byte aligned) to a list of
  `f32` values. The first is the number of values that follow. Then opcodes, each
  followed by its operands:

  | op | name       | operands                         |
  |----|------------|----------------------------------|
  | 0  | end        |                                  |
  | 1  | fill       | r, g, b (0–255), a (0–1)         |
  | 2  | stroke     | r, g, b, a, lineWidth            |
  | 3  | moveTo     | x, y                             |
  | 4  | lineTo     | x, y                             |
  | 5  | arc        | x, y, r, a0, a1                  |
  | 6  | close      |                                  |
  | 7  | begin      |                                  |
  | 8  | fillPath   |                                  |
  | 9  | strokePath |                                  |
  | 10 | label      | ptr, len, x, y, size, align      |

  `fill` and `stroke` set the style for the following paths. A label is `len`
  bytes of UTF-8 at byte offset `ptr` (an `f32`, so strings must live below
  16 MiB), drawn in the current fill color and the theme font; `align` is
  0 left, 1 center, 2 right, plus 4 for bold. The host drops labels when
  `theme.labels` is false. The host replays the list on the canvas, so lines stay
  crisp at any pixel ratio. Out-of-range pointers, unknown opcodes and truncated
  lists are errors.
* Imports: only functions from `"env"` named after `Math` (`sin`, `cos`,
  `atan2`, `fmod`, … and their `f`-suffixed forms), which the host supplies. Any
  other import fails instantiation with a clear message.

`examples/wasm-lissajous/` is a complete C example built with
`clang --target=wasm32 -nostdlib`.

## 4. What the host guarantees and enforces

* **Isolation.** One worker per mounted slide, and at most three at a time (the
  slide on screen and its neighbours). No DOM, no cookies, no storage. Before
  module code runs, the worker removes `fetch`, `XMLHttpRequest`, `WebSocket`,
  `EventSource`, `importScripts`, nested workers, `BroadcastChannel`,
  `indexedDB` and `caches`; the host fetches module code and passes it in as
  text or bytes, imported only from a Blob URL. The one exception is the
  pinned `@loci/three` build, fetched by the host (or by the worker before
  lockdown) and also imported from a Blob URL. In production, modules are also
  served from a separate origin with a no-network CSP, which a page-origin
  mockup cannot set.
* **Watchdog.** The worker drives its own frame loop and posts a heartbeat
  `{t, ms}` after every frame. While a piece is playing (or a paused piece owes
  a redraw), a heartbeat older than 500 ms terminates the worker and the slide
  shows a "this piece stalled" card with a Restart button. Time when the page
  itself produces no frames (hidden, occluded) does not count. Setup (import,
  compile, `setup()`) gets 8 s.
* **Budget.** The host measures draw time, skipping the first frames after a
  mount or a change (caches rebuild there). Averaging over 12 ms, a module is
  stepped down to 30 fps (it draws every other frame; back up under 6 ms); over
  40 ms it is paused with a notice and a Restart button. For `webgl2` pieces
  with a GPU timer the frame time is CPU + GPU. Errors thrown from
  `setup` or `draw` are reported (`{type: 'error', message, stack}`) and stop
  the piece with the same card.
* **Memory.** WASM memory may not exceed 64 MiB: the host checks after every
  frame (and a module that imports its memory gets one with that maximum).
* **Fonts.** The worker loads the theme's font family from the site's font
  stylesheet into its own `FontFaceSet`. Until a family has loaded, the module
  receives the rest of the font stack in `theme.font`, because Chromium never
  revisits a worker's fallback for a family once text was drawn without it.
* **Fallback.** Browsers without `OffscreenCanvas` run the module on the main
  thread with the same contract and the same engine (`worker.js` evaluated in
  the page), reviewed catalog pieces only. Add `?fallback=1` to force it.
  `webgl2` pieces run there too, on the page's own canvas, if it has WebGL2.
* **Posters.** Thumbnails of reviewed JS pieces are drawn on the page. Other
  pieces get a poster: one frame rendered in a worker and captured as PNG
  (`handle.capture()`).

### Host API (`runtime.js`)

```js
const h = LociHost.mount(canvas, moduleSpec, { theme, params, box, dpr, seed,
  t, speed, playing, overlay, target, view, onView(view), onError(kind, message), onStats({t, ms, cpu?, gpu?, avg, step}) });
LociHost.caps();   // {webgl2, coarsePointer, viewportW, viewportH, saveData}, for targetFor
h.play(); h.pause(); h.seek(t); h.setSpeed(x); h.setTheme(theme);
h.setParams(params); h.resize(box, dpr); await h.capture(); h.getTime(); h.dispose();
h.pointer;          // the target's pointer declaration, filled in ({mode: 'none', …} without one)
h.input(e);         // a DOM PointerEvent, WheelEvent or KeyboardEvent, or a normalized plain event
h.flush();          // send queued input now (capture() does this first)
h.resetPointers();  // forget pointers the host thinks are down (the page calls it on release)
h.getView(); h.setView(view);   // the module's last reported view; replace it (null: the default)
```

The page decides when input is forwarded (engagement, section 2, "Pointer");
`h.input` normalizes, synthesizes clicks, coalesces per animation frame (or
within 50 ms when the page draws no frames) and posts the batch to the
worker. `view` restores a view after setup; `onView` hears each change the
module reports. The module's cursor is applied to `canvas.style.cursor`.

`overlay` is an optional 2D canvas layered over `canvas` (same CSS box,
`pointer-events: none`, `aria-hidden`); the host sizes it and draws returned
labels on it, and clears it when labels are off or the piece is disposed.
With a GPU timer, `ms` in `onStats` is `cpu + gpu`. `target` is the target id
the spec belongs to; the host logs `loci: mounted <id> in worker (<target>, <render>)`.
`moduleSpec` is `{runtime: 'js', render: 'canvas2d' | 'webgl2', source, manifest}` or
`{runtime: 'wasm', bytes | url, render, manifest}`, plus `trusted: true` for
reviewed pieces that may use the main-thread fallback. `onError` kinds are
`stalled`, `slow`, `error` and `unsupported`. A canvas can be mounted once
(`transferControlToOffscreen` is one-way); mount a fresh canvas to restart.

## 5. Serialized state (share links, embeds, presets)

```json
{ "v": "elliptic-group-law", "h": "sha256:…", "p": { "b": 0.3 },
  "t": 4.2, "theme": { "palette": "viridis", "font": "stix", "lw": 2 },
  "view": { "P": [-0.95, 1] } }
```

`view` is the module's view (section 3, "Pointer events"): its camera,
selection or dragged points, at most 2 KB of plain JSON, present only when
the module reported one. Loading the link passes it to `setView` after
`setup`; a malformed or oversized view is dropped with a console warning. A
preset's `view` is applied the same way when the preset is tapped (`null`
returns to the module's default view), and Reset to defaults in Customize
clears it.

`p` is validated against the manifest of the version named by `h`, so links
survive a module update: unknown keys are dropped and missing ones default.
`theme.palette` and `theme.font` are the site's ids (`style` means the current
site style's default). The Customize panel's embed config is this object,
without `h` in the mockup.
The URL form is `?v=<id>&p=<base64url json>`, optionally with
`&mode=desktop|mobile`: the preferred target for that load (honored only if
it can run on the device). Share links add it when the sharer chose a mode
explicitly.

A comparison adds `&b=<base64url json>`: the params of copy B, non-default
keys only (`{}` when B is all defaults), next to A's state in `p`. Opening the
link on a screen at least 900 px wide splits the stage into A and B (the
Compare action in Customize, key `x`): one clock, and the same seed, theme,
speed and view, so only the params differ. `b` goes through `normalizeParams`
like `p`; a malformed `b` is ignored with a console warning and the link opens
A alone, as it does on a narrower screen. Example: riemann-sums, left rule (A)
against midpoint rule (B), is `?v=riemann-sums&b=eyJydWxlIjoxfQ`.

### Embeds and link previews

`&embed=1` on a share link is the embed form: the page renders only the piece
named by `v` (with `p`'s params, theme, `t` and `view`), in a frame of its
own, and never builds the feed. The Customize panel's embed snippet is

```html
<iframe src="…?v=<id>&p=…&embed=1" title="<title> on Loci" width="480" height="480"
  style="border:0" allow="fullscreen" loading="lazy"></iframe>
```

- **Click to play.** The stage starts as a still: one frame at `t`, rendered
  once by `LociHost.poster` (one short-lived worker, disposed after the
  capture). The live worker starts only when the viewer clicks the still or
  its Play button, or presses Enter or Space. A page of ten embeds therefore
  runs ten brief poster workers at load and no live ones. With
  `prefers-reduced-motion` the click shows a paused frame and Play stays
  visible.
- **Chrome.** The canvas fills the frame. Under it, a bar holds the title, the
  author, Pause/Play and "Open in Loci ↗", the full share link at the current
  moment (without `embed`), in a new tab. A piece that declares pointer input
  receives the pointer and wheel once it is live; there is no separate engage
  step, since the frame is the piece. Keys: Space, `K` or `P` pause and play.
- **Off screen.** A started embed pauses when scrolled out of view and gives
  its worker back after 8 s; it remounts at the same moment when it returns.
- **Targets.** The target is chosen for the frame's size and the browser, as in
  the feed: a WebGL2 piece with a mobile target runs that target where WebGL2
  is missing; one without shows the can't-run card and the Open link.
- **Messages to the parent page** (`postMessage`, target origin `*`):
  `{type:'loci:ready', v}` once the still (or the card) is up, and
  `{type:'loci:size', height, v}`, the height the frame wants at its current
  width (a square stage plus the bar), sent again when it changes. An LMS
  page can set the iframe's height from it.

Where a course site strips iframes, Customize offers a separate static image
snippet: `<a href="<share link>"><img src="data:image/jpeg;base64,…"
alt="<the piece's alt text>" width="480" height="480"></a>`, the same moment
rendered once at 480 × 480. It is never nested inside the iframe: browsers do
not render an iframe's children.

Link previews: `index.html` carries site-wide OpenGraph and Twitter tags with
`og/default.png`. `node scripts/gen-share-pages.mjs [--origin https://…]`
writes `v/<id>.html` per piece, with that piece's title, hook and
`og/<id>.png` (or the default image), which redirects to `../?v=<id>` and
keeps any `&p=`. Unfurlers need an absolute image URL, so pass `--origin` for
a deployment. Previews per state (`&p=`) need a server.

### Lessons

A lesson is a few stops of one piece in one link: what a teacher sends a
class, or a researcher a collaborator. Viewers build one under Customize,
**Your lesson**: *Add this moment as a stop* captures the piece's state with
a one-sentence note, stops can be deleted (not reordered), and **Copy lesson
link** copies the URL. The draft is kept in `localStorage` under
`loci:lesson:<id>`, so it survives reloads.

```json
{ "title": "Two components",
  "stops": [
    { "p": { "b": 30 }, "t": 22.95, "note": "Below b ≈ 0.385 the curve splits." },
    { "p": { "b": 30 }, "t": 28.2, "view": { "P": [-0.79, 1] },
      "note": "With P on the oval, P + Q lands on the oval too." } ] }
```

The URL form is `?v=<id>&lesson=<base64url json>`. Each stop is the
serialized state above without `theme`: `p` holds only non-default params,
`t` is omitted at 0, and `view` is omitted when the module reported none (the
module's default view). A stop may name its piece with `v`; it defaults to
the link's `v`, and this player plays one piece, so a stop naming another
piece is dropped with a console warning. `title` is optional.

Limits: at most 8 stops (sharing needs at least 2), notes and titles cut to
140 and 80 characters, and a `lesson` value over 16 KB is ignored. A typical
three-stop lesson is about 500 characters of URL; eight stops with full
notes in non-ASCII mathematics stay around 4 to 6 KB.

Every stop is validated like a share link: `p` through `normalizeParams` for
the manifest named (unknown keys dropped, ranges snapped), `view` through the
same check as above (a bad view becomes the default view, with a warning),
`t` must be a finite number ≥ 0. A malformed `lesson` value is ignored with a
console warning and the piece opens as an ordinary link.

Opening the link plays stop 1: the piece pauses, takes the stop's params,
seeks to `t` and sets the view, and the stop's note stays up over the stage
with Previous, Next and Exit lesson; ← and → step (after an engaged piece,
which receives keys first), and each step is announced as "Stop k of N" with
the note. Esc or Exit lesson leaves it: the card goes away, the arrows stop
stepping, `lesson` is dropped from the address bar and playback resumes if
it was running. A preset tapped during a lesson also ends it.

In `app.js`, `Lesson.stop`, `capture`, `compact`, `parse`, `encode`,
`decode`, `url` and `apply` are the format; collections (below) reuse them,
and seminar mode and the clip recorder are meant to.

### Collections

A collection is several pieces in order, each at a moment with a sentence,
in one link: the syllabus version of a lesson. It is the lesson format with
a `v` on every stop, played through the feed's playlist filter (the same
path as a blog post's "Watch these in the feed"). Viewers build one in the
**Collections** panel, opened from the toast after **Save** ("Add to a
collection…") or from Customize, **Your lesson**, "Add this moment to a
collection…". The panel adds the piece's current moment with a note to a
new or existing collection, removes items, edits the title and intro, copies
the link and plays it. Collections are kept in this browser only, in
`localStorage` under `loci:collections`; nothing is published, and only
people who are sent the link see it.

```json
{ "title": "Three shapes of space",
  "intro": "A curve with a group law, circles that link, and a bell curve.",
  "items": [
    { "v": "elliptic-group-law", "p": { "b": 30 }, "t": 9.68,
      "view": { "P": [0.04, 1] }, "note": "With P on the oval, P + Q lands on the oval too." },
    { "v": "hopf-fibers", "t": 54.83, "mode": "mobile", "note": "Seen from above…" },
    { "v": "galton-board" } ] }
```

The URL form is `?collection=<base64url json>`. An item is a lesson stop
(`p`, `t`, `view`, `note`, compact as above) with a required `v`, plus an
optional `mode` (`desktop` or `mobile`): the target it was captured in,
recorded when the viewer had chosen a mode explicitly, and preferred for
that piece while the collection plays (honored only if it can run). An item
that is only `{ "v": … }` plays the piece as the feed would; that is what a
blog post's `vizIds` become. `title` (80 characters) names the playlist;
`intro` is one optional paragraph of at most 280 characters.

Every item is validated like a lesson stop (params through
`normalizeParams`, the view through the share-link check, `t` finite and
≥ 0, notes cut to 140 characters). Items that are not objects, name a piece
this catalog does not have, or repeat a piece already in the collection are
dropped with a console warning; a piece appears once per collection, since
params are kept per piece. Unknown pieces are also counted in a one-line
notice ("1 piece is no longer available"). At most 30 items are kept; a
link over 16 KB, one that does not decode, or one with no playable items is
ignored with a warning and the ordinary feed opens.

Opening the link builds the feed from the items in order, with the chip
"▶ title ✕", the counter, j/k and the end card ("from “title”") of any
playlist. Each item's params, `t`, `view` and mode are written when the feed
is built, before anything mounts, because the slide after the active one
mounts early: an item arrives already in its state, with no jump. A
neighbouring item holds at its `t` until it becomes the active slide, then
plays (unless the feed is paused). On arrival the item's note, and on the
first item the intro, shows as a callout that stays until tapped and is
announced with the slide. `collection` stays in the address bar while the
collection plays; clearing the chip drops it.

In `app.js`, `Collection.parse`, `compact`, `encode`, `decode`, `url`,
`capture`, `filter`, `play` and `applyAll` are the format; items go through
`Lesson.stop` and `Lesson.compact`.
