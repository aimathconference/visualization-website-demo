# Submitting a visualization to Loci

This guide takes you from an idea to a published piece. The short version:
one moving picture of one mathematical idea, one knob that matters, an
explanation someone could check, and a package that passes the automated
checks. The checks run in your browser before you upload, so you will know
before we do.

If you only want the contract, read [module-api.md](module-api.md). If you
want to know what happens after you upload, read
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
  explanation.md     what the viewer reads in the Explanation tab
  LICENSE            an OSI license
  poster.png         optional; otherwise we capture one at t = t0 + 6
```

Total size under 4 MB; JavaScript under 200 KB; WebAssembly under 2 MB.

## 3. Prototype in the Remix editor

You do not need a local setup to start. Open any piece in the feed, choose
**Source → Remix**, and replace the module with your own. The editor runs your
code in the same sandbox the site uses, shows errors inline, and keeps your
draft in the tab. **Download .js** when it works. The default export you
need:

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
  `Math.random`.
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

## 5. Write `explanation.md`

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
* **Notation:** Markdown with Unicode math (*y² = x³ + ax + b*, ∇f, 𝔽_p).
  Indent display formulas four spaces. No LaTeX, no images.
* **Voice:** second person, present tense, short sentences. Say what
  happens, not how exciting it is.
* **Numbers you quote** (Feigenbaum's constant, a Lyapunov exponent) need
  the reference that computed them.

The explanation is shown as written and also as `explanation.md` raw, so
keep it clean.

## 6. Accessibility checklist

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

## 7. Run the checks and submit

Open **Browse → Submit a visualization**, drop your folder or zip, and wait
about a minute. You get a report with every check from
review-pipeline.md section 2, and for any failure the size, palette, `t` and
frame where it happened. Fix and re-drop; nothing is uploaded until all
checks pass and you press Submit.

Then:

1. **Within minutes** your piece is live in the **New** lane: it appears in
   Browse, under its tags, and in the New chip, with a "Checked by machine"
   badge. Share links work from this moment.
2. **Within about two days** two community reviewers check the mathematics
   in the explanation (and only that) against a short form. You will see
   their notes. Two approvals move the piece into the main feed with a
   "Community reviewed" badge. A marked error comes back to you with the
   line; fix it and resubmit the explanation.
3. **Any time after,** editors may add it to a roundup or the picks lane.
   That is editorial and you do not need to do anything.

### Updating a piece

Resubmit the package. The checks run again. If only the code changed, the
piece keeps its lane; if the explanation, alt, title or hook changed, it is
reviewed again. Old share links keep showing the version they named.

### Licensing

Your code stays yours under the OSI license you chose. By submitting you
agree that Loci may run it in the feed, show its source in the Source tab,
let viewers remix it in their browser under that license, and capture frames
for thumbnails and roundups. Explanations are published under CC BY 4.0 with
your name on them.

## 8. Common reasons a package is returned

| Report line | What it means | Fix |
|---|---|---|
| `outside box at (x,y)` | you drew under the controls | `clipBox(ctx, box)` and compute from `box`, not the canvas |
| `budget p95 18.4 ms @ 1100×700 night` | too slow on desktop | cache the heavy part in `state`; lower resolution for the background pass |
| `nondeterministic at t=11` | `Math.random`, `Date`, or state that depends on frame rate | use `mulberry32(seed)`; integrate with a fixed step from the cycle start |
| `param r: min == default` | the slider does nothing visible at one end | widen the range or pick a better parameter |
| `labels off: text detected` | `fillText` called directly | use `label()` |
| `line 41: while loop in GLSL` | an unbounded shader loop | `for` with a literal cap and `if (i >= u_n) break;` |
| `line 52: for (i<u_n) has no literal bound` (warning) | the loop bound is a uniform with no cap | add the literal cap and the break |
| `flash 5/s @ t=3.2` | luminance flicker | fade instead of toggling; slow the cycle |
| `explanation: missing Reference` | no reference line | add one; it is required |
| `alt == hook` | you reused the hook | describe the picture instead |
