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
      "note": "Below 2/(3√3) the real curve has two components." }
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

* `ctx` is a `CanvasRenderingContext2D` already scaled for device pixel ratio.
  `box = {x, y, w, h}` is the safe drawing area in CSS pixels.
* `theme = { bg, fg, a1, a2, font, lw, labels }`. Honor `labels`: when false,
  draw no text. Use `theme.lw` as the base stroke width.
* `state` is a plain object that persists between frames for caching. Key
  caches on what they depend on (size, palette) as the built-in pieces do.
* `t` is seconds and may jump backwards (scrub, restart). Modules that integrate
  over time must detect that and recompute from the cycle start.
* `import { hex, mix, rgba, label, clipBox, fsFor } from '@loci/kit'` is
  resolved by the worker. Any other import is refused.
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

* `render: "pixels"`: `frame` returns a pointer to a `w*h*4` RGBA buffer the
  host blits with `putImageData`. Simplest and language-agnostic.
* `render: "commands"`: `frame` returns a pointer to a command list of `f32`
  values beginning with its length. Opcodes: `0 end, 1 fill(rgba), 2 stroke(rgba, lw),
  3 moveTo(x,y), 4 lineTo(x,y), 5 arc(x,y,r,a0,a1), 6 close, 7 begin, 8 fillPath,
  9 strokePath, 10 label(utf8-ptr,len,x,y,size,align)`. The host replays them
  on the canvas, so lines stay crisp at any pixel ratio and labels use the theme
  font. Strings for `select` params are passed by `set_param` as the option index.

`examples/wasm-lissajous/` is a complete C example built with
`clang --target=wasm32 -nostdlib`.

## 4. What the host guarantees and enforces

* **Isolation.** One worker per mounted slide. No DOM, no cookies, no storage.
  The worker's CSP forbids network. In production, modules are served from a
  separate origin.
* **Watchdog.** A frame that has not returned within 500 ms terminates the
  worker; the slide shows a "this piece stalled" card with a Restart button.
* **Budget.** The host measures frame time. A module averaging over 12 ms is
  stepped down to 30 fps; over 40 ms it is paused with a notice.
* **Memory.** WASM memory is instantiated with a maximum of 64 MiB.
* **Fallback.** Browsers without `OffscreenCanvas` run the module on the main
  thread with the same contract (reviewed catalog pieces only).

## 5. Serialized state (share links, embeds, presets)

```json
{ "v": "elliptic-group-law", "h": "sha256:…", "p": { "b": 0.3 },
  "t": 4.2, "theme": { "palette": "viridis", "font": "stix", "lw": 2 } }
```

`p` is validated against the manifest of the version named by `h`, so links
survive a module update: unknown keys are dropped and missing ones default.
The URL form is `?v=<id>&p=<base64url json>`.
