# How faithfully could existing research visualizations run on Loci?

An assessment of three bodies of work against the current module API
([module-api.md](module-api.md)): a 2D canvas in a worker, params from a
manifest, no DOM, no WebGL, no pointer input beyond the host's scrub and
long-press. Nothing here is being ported; the point is to see where the API
is too small and by how much.

Sources surveyed on Oct 29, 2026:

* **GeometryLab** (`~/Documents/GeometryLab`): six browser pages in `labs/*/viz`
  on a shared `viz-kit` (2D pan/zoom canvas with an optional GLSL mode,
  sliders, JSON/npy loader, a three.js scene helper).
* **Steve Trettel** (stevejtrettel.site): interactive demos and software
  (TypeScript + three.js + custom GLSL, Vite bundles of 560–630 KB with
  OrbitControls and ShaderMaterials) and a large graphics gallery that is
  mostly offline path-traced and relativistic ray-traced stills.
* **Nic Brody** (nbrody.github.io/GeometryofLinearGroups): a mix of three.js
  tools (trees of hyperbolic planes, 4D Kleinian limit sets), 2D canvas tools
  (Riley slice, pseudomodular groups, Penrose tilings), a d3 tree page, with
  MathJax, MathQuill matrix entry and jQuery in the DOM.

## 1. What each piece needs

| Piece | Stack | Lines | Needs beyond Loci today | Fidelity today | With gaps closed |
|---|---|---|---|---|---|
| GeometryLab · Mandelbrot/Julia | GLSL fragment shader, pan/zoom, click to pick c, iteration slider to 2048 | 217 + kit | GPU shader, pan/zoom pointer | picture at ~200 iterations in WASM pixels mode, no deep zoom | full |
| GeometryLab · SNF polylines | three.js, orbit, 10 KB npy | 152 + kit | 3D or software projection, package data | full via software projection, yaw/pitch as params | full |
| GeometryLab · Ephemera | 2D canvas, drag points with snapping, two linked views, 339 KB JSON, heavy `fillText`, export | 1077 | drag points, package data, two views | picture yes; exploration reduced to presets | full except export |
| GeometryLab · Laminations | 2D canvas + custom WebGL lines + three.js torus, 92 KB JSON, ~2.4k lines | ~2400 | GL lines, 3D, package data | base-path view only, software-rendered | near full |
| GeometryLab · Hurwitz orbits | SVG, forms, Python backend for exact arithmetic, O(n²) layout | 354 + server | precomputed orbits, DOM forms | a few precomputed orbits as a `select` param | partial: no free input |
| GeometryLab · Points, forces, moduli | 2D canvas sphere projection, physics in 98 dense lines, optional WebGL landscape, click to place | ~300 | click to place, seed instead | full with seed/count params | full |
| Trettel · 2026 demos (Borsuk–Ulam, Brouwer, hairy ball, disk map, O(2,2), hypergeometric atlas) | three.js + ShaderMaterial, OrbitControls, SDF raymarching in places | 560–630 KB bundles | WebGL in the worker, trusted three.js, orbit pointer, size limit | not reproducible: 3D scenes and shaders | full, GPU permitting |
| Trettel · software (limit sets, homogeneous spaces, coxeter-viz, elliptic-curve-viz, geodesic boards) | TypeScript + three.js + GLSL | repos | same as above | not reproducible | full |
| Trettel · graphics gallery (≈120 pieces) | offline path tracers, relativistic ray tracers, a few live shaders | n/a | a pre-rendered runtime | stills and loops only | the ~10 "Shader" pieces live; the rest as loops |
| Brody · Trees of hyperbolic planes | three.js, 17 ES modules of exact Laurent/rational arithmetic (95 KB), MathQuill matrix input, click-to-navigate, up to 30k planes | ~3000 | WebGL, orbit, free matrix entry | not reproducible at 30k planes on a CPU canvas | picture full; input reduced to presets |
| Brody · 4D Kleinian limit sets | three.js | module | WebGL | no | full |
| Brody · Riley slice, pseudomodular explorer | 2D canvas, classic scripts, MathJax readouts, Tailwind | medium | formula readouts | pictures full; formulas move to the explanation | full |
| Brody · Penrose tiling generator | 2D canvas | small | nothing | full | full |
| Brody · p-adic trees | d3 + SVG + MathQuill | medium | SVG layout, DOM input | redraw in canvas; input reduced to presets | partial |

Reading across the rows: about a third of the material is 2D-canvas work
that fits the API now, a third is three.js or shader work that is simply out
of reach without a GPU path, and a third is *tools* whose value is free-form
input (matrices, dragged points, uploaded data) that a feed slide with
sliders cannot carry.

## 2. The gaps, ranked by what they unlock

1. **A GPU render mode.** `render: "webgl2"` in the worker, where
   `OffscreenCanvas.getContext('webgl2')` already works, plus a host-provided
   trusted import `@loci/three` (pinned version, cached once for the site)
   so modules are not 600 KB bundles. Unlocks every Trettel demo, both Brody
   3D tools, and three GeometryLab pages. Cost: the watchdog cannot kill a
   stalled GPU, so shader loops need a static bound check at submission and a
   per-frame time query; phone GPUs will throttle raymarched pieces.
   Shadertoy has lived with the same risk for a decade.
2. **A pointer channel.** The manifest declares `pointer: "orbit" |
   "pan-zoom" | "points" | "none"`. The host keeps vertical scroll and sends
   normalized pointer events to the worker for the rest, and the Customize
   panel shows the resulting state (yaw/pitch, center/scale, point list) so it
   serializes into share links. Unlocks orbiting, fractal zoom, drag points,
   click to place. Conflicts with scrub-by-drag, which becomes the default
   only for `pointer: "none"`.
   *Status, Oct 30, 2026:* in the API as `pointer: {mode: "none" | "orbit" |
   "pan-zoom" | "custom", …}` (module-api.md, "Pointer"), with
   click-to-engage instead of a permanent channel so the feed keeps its
   gestures, kit helpers (`OrbitCamera`, `PanZoom`, `Picker`) instead of a
   `points` mode, and the state serialized as the module's `view`.
   `hopf-fibers`, `mandelbrot-zoom` and `elliptic-group-law` use it.
3. **Package data files.** `data/` up to 2 MB, exposed as parsed JSON or
   typed arrays at `setup`. Unlocks precomputed orbits, curve tables, npy
   arrays, and the Python-backed page.
4. **A pre-rendered runtime.** `runtime: "video"` with a looping MP4/WebM
   and a poster. Loses live and remix, keeps everything else (explanation,
   presets as timestamps, share links, lanes). It is the only honest home
   for path-traced work, which is also the most beautiful material surveyed.
5. **Formulas in the picture.** Workers have no MathJax. Text through
   `label()` covers labels; typeset formulas belong in the explanation. This
   is a constraint to keep, not a gap to close.

Smaller: a `layout: "split"` for two linked views on one canvas; a
raise of the JS size limit for modules that bundle their own math (Brody's
95 KB of exact arithmetic fits today; Trettel's bundles would not, which is
what the trusted three.js import is for).

## 3. CPU realism

The budget is 12 ms p95 in a 335×490 box. On that box: an escape-time
fractal at 70 iterations costs about 13 ms in JavaScript today, so 200
iterations needs WASM and half-resolution rendering; a software projection of
a few thousand line segments is fine; Brody's 30k hyperbolic planes with
Farey tessellations is not, and never will be without the GPU path.

## 4. What stays a tool

Trettel's and Brody's pages are instruments: you type a matrix, pick a
field, place points, export JSON. Loci's unit is one idea with one knob. The
right relationship is a Loci *piece* cut from a tool (a preset tour of its
most striking states, with the tool linked from the explanation), not a port
of the tool. The pointer channel and data files make such pieces faithful;
nothing makes a feed slide a substitute for the instrument.

## 5. Suggested order

GPU render mode first, since it unblocks the most and costs mostly review
policy; the pointer channel second, since it is what makes 3D pieces feel
right; data files third, a day's work; video runtime when the curation side
wants the gallery material.
