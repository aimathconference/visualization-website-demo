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
    { "label": "Wait for k = 51", "params": { "n": 101 }, "t": 271 }   // optional t: also seek there
  ],
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
  draw({ ctx, gl, canvas, t, dt, box, viewport, theme, params, seed, state, dpr }) {},
  // optional
  resize({ box, dpr }) {},
  dispose() {}
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
* `import { hex, mix, rgba, label, clipBox, fsFor, mulberry32 } from '@loci/kit'`
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
function of `t` and params; three's `Color` takes the theme's hex strings
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
  t, speed, playing, overlay, target, onError(kind, message), onStats({t, ms, cpu?, gpu?, avg, step}) });
LociHost.caps();   // {webgl2, coarsePointer, viewportW, viewportH, saveData}, for targetFor
h.play(); h.pause(); h.seek(t); h.setSpeed(x); h.setTheme(theme);
h.setParams(params); h.resize(box, dpr); await h.capture(); h.getTime(); h.dispose();
```

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
  "t": 4.2, "theme": { "palette": "viridis", "font": "stix", "lw": 2 } }
```

`p` is validated against the manifest of the version named by `h`, so links
survive a module update: unknown keys are dropped and missing ones default.
`theme.palette` and `theme.font` are the site's ids (`style` means the current
site style's default). The Customize panel's embed config is this object,
without `h` in the mockup.
The URL form is `?v=<id>&p=<base64url json>`, optionally with
`&mode=desktop|mobile`: the preferred target for that load (honored only if
it can run on the device). Share links add it when the sharer chose a mode
explicitly.
