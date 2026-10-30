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
  "render": "canvas2d",            // js: "canvas2d". wasm: "pixels" | "commands"
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
  setup({ ctx, env }) {},
  // every frame. Draw inside `box` only; the host overlays controls outside it.
  draw({ ctx, t, dt, box, theme, params, seed, state }) {},
  // optional
  resize({ box, dpr }) {},
  dispose() {}
};
```

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
  text or bytes, imported only from a Blob URL. In production, modules are also
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
  40 ms it is paused with a notice and a Restart button. Errors thrown from
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
* **Posters.** Thumbnails of reviewed JS pieces are drawn on the page. Other
  pieces get a poster: one frame rendered in a worker and captured as PNG
  (`handle.capture()`).

### Host API (`runtime.js`)

```js
const h = LociHost.mount(canvas, moduleSpec, { theme, params, box, dpr, seed,
  t, speed, playing, onError(kind, message), onStats({t, ms, avg, step}) });
h.play(); h.pause(); h.seek(t); h.setSpeed(x); h.setTheme(theme);
h.setParams(params); h.resize(box, dpr); await h.capture(); h.getTime(); h.dispose();
```

`moduleSpec` is `{runtime: 'js', source, manifest}` or
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
The URL form is `?v=<id>&p=<base64url json>`.
