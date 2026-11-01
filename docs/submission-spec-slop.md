# Submission spec (draft)

This is the working spec for visualization submissions and the API a piece is written against. It replaces
both earlier formats: the demo's single-file template (`Visualizations.md`,
`demo/github/registry/template/visualization.js`) and the mockup's package format (`docs/module-api.md`,
`docs/submitting.md`), both now removed. The site, the registry's checker and the server implement it, and the
catalog's pieces are written to it (`demo/github/registry/entries/`).

This spec says what a submission must be. How it should read and look (the title, hook, `alt` and
explanation, and choosing a palette) is in the style guide (`docs/style-guide.md`, not written yet). The style
guide is advice: the checks enforce only what this spec states.

## 1. What a submission is

Two files, `entries/<slug>.js` and its explanation `entries/<slug>.md` (section 7), and optionally
`entries/<slug>.wasm` with its source under `sources/<slug>/` (section 5). Everything the site needs to list,
check or link the piece is a plain literal, so the site reads it without running the code.

```js
const COLORS = { main: '#ff8a1f', secondary: '#2dd4a7', bg: '#050508', fg: '#ecebf5' };

export default {
  title: 'Rose curves',                  // at most 60 characters
  hook: 'r = cos(kθ) draws k petals when k is odd and 2k when k is even.',   // at most 160
  alt: 'A flower-shaped curve traced in orange on a dark background, its petals opening and closing.',
  tags: ['Geometry', 'Polar coordinates'],   // 1 to 4, from the vocabulary
  license: 'MIT',
  author: { name: 'Your name' },

  modes: { desktop: true, phone: true },     // at least one true
  time: { length: 24, loop: true },          // required (section 3)
  context: '2d',                             // or 'webgl2' (section 5); default '2d'
  libraries: [],                             // bundled libraries, if any (section 5)

  params: [
    { key: 'k', type: 'range', label: 'Petal number k', min: 1, max: 12, step: 1, default: 5 },
    { key: 'trace', type: 'toggle', label: 'Show the traced path', default: true },
  ],
  presets: [
    { id: 'eight', label: 'k = 4, eight petals', params: { k: 4 }, t: 6 },
  ],

  interact: { hint: 'Drag a petal · use the panel' },   // at most 60; omit for a feed-only piece

  setup(env, S) {},                      // once, may be async
  draw(ctx, t, params, env, S) {},       // every frame
  onMode(env, S) {},                     // optional
};
```

`S` is a plain object that lives as long as the instance and is passed to all three functions: the place for
caches and for anything `setup` builds. `this` is not bound.

`modes` says where the piece appears: a piece without `phone: true` is left out of the phone feed, and its
share link opens on a phone as its title, hook and `alt` with a note to open it on a computer (the same the
other way round for `desktop`).

**The slug** matches `^[a-z0-9][a-z0-9-]{0,39}$`. It names the files and the share links. Later changes to a
merged piece come from the account that first submitted it, and reviewers check that (section 11).

**Metadata is literal.** Every field above except the three functions is a JSON-like literal: strings without
`${…}`, numbers, booleans, arrays and objects with plain keys. Getters, computed keys, spreads and references
to other variables fail the check. `COLORS` follows the same rule. The site uses only the metadata it read
from the source. What the running module's object says, or turns into after `setup`, is ignored.

**Who wrote it.** `author.name` is the byline. `author.email` is optional: give it only if you are willing to be
emailed about the piece, and the Explanation shows it as a "Suggest an edit" link. The GitHub account is never
declared in the file: it is the account that opened the pull request, recorded by its numeric id (section 11).

**Limits.** The `.js` file is at most 200 KB, bundled libraries included, the `.md` at most 64 KB and the
`.wasm` at most 2 MB. `license` is one of MIT,
BSD-2-Clause, BSD-3-Clause, Apache-2.0, GPL-3.0, MPL-2.0, ISC and CC0-1.0. `alt` is 1 or 2 sentences, 40 to
300 characters, and is neither the title nor the hook.

## 2. Colors

- `COLORS` is the first statement of the file. `main` and `secondary` are required; every value is a six-digit
  hex color. Other names are allowed.
- The palette is **final in the feed**: the piece always draws with it, and while it is on screen the page
  around it takes on its colors. Viewers cannot change it.
- Because the page's own text and buttons take these colors, `fg` on `bg` needs a contrast ratio of at least
  4.5:1. Where `bg` or `fg` is missing, the site's own value is used.
- The page applies only values that match `^#[0-9a-fA-F]{6}$` when it sets them, whatever the check said.
- The only place to change it is the chalkboard, whose color picker rewrites the `COLORS` statement in the source.

## 3. Time

Every piece declares `time`:

- `length`: seconds, more than 0 and at most 3600. The scrubber covers 0 to `length`.
- `loop: true`: playback wraps around at `length`. `loop: false`: it plays once and holds the last frame.

The piece must be a **function of `(t, params)`**: the same `t` and params give the same frame. Do not advance
state by frame time; a piece that integrates must recompute from `t = 0` (caching in `S` is fine). This is
what makes a link with a time in it reproducible. A piece sets its own pace through `length`.

Randomness comes from the kit's seeded random (section 5) with a fixed seed, so every viewer sees the same
instance. A piece that wants viewers to try other instances declares an ordinary `range` param for the seed.

## 4. Params

**Types** are a closed set: `range`, `toggle`, `select`.

| type     | fields                                 | value   |
|----------|----------------------------------------|---------|
| `range`  | label, min, max, step, default, format | number  |
| `toggle` | label, default                         | boolean |
| `select` | label, options `[[value, label], …]`, default | string |

A param is valid when:

- `key` matches `^[A-Za-z][A-Za-z0-9_]{0,31}$`, is unique, and is not a name on `Object.prototype`
  (`constructor`, `toString`, `valueOf`, `hasOwnProperty`, …);
- `label` is required and at most 40 characters;
- for `range`: all numbers are finite, `min < max`, `step > 0`, and `default` and `max` are on the grid
  `min + k·step`. "On the grid" allows a rounding error of `step · 1e-9`, so `step: 0.1` works;
- `format`, if present, is a string of at most 16 characters where `{}` stands for the value (`'{}°'`,
  `'{} px'`). It is never a function: readouts are drawn by the page (the chalkboard's params panel), which runs no
  piece code;
- for `select`: the options are non-empty, their values are distinct strings of at most 32 characters, labels
  are at most 40 characters, and `default` is one of them.

The site validates every value: ranges round to the nearest grid point and then clamp to `[min, max]`, a
`select` value that is not an option takes the default, unknown keys are dropped, missing ones take their
defaults. `draw` never receives an invalid value.

**Writing params.** `env.setParam(key, value)` is the only way a piece changes a declared param.

- It returns the validated value (snapped or clamped); the new value arrives in `params` on the next frame.
- **Required:** if the piece's own UI or a gesture changes something that is a declared param, it calls
  `setParam`. A piece that keeps its own copy of a param in `S` and changes that is flagged by the dynamic
  checks (section 10), and reviewers send it back.
- Undeclared state (hover, an open panel, a selection) is the piece's own. It is lost on remount and is not
  in share links.

**Sharing.** Share captures what the viewer is looking at: the current params, including any the piece changed
with `setParam` in interact mode, and the current `t`. Set the params, hit Share, and the link reproduces that
frame. A share link holds `{ slug, params, t }`, with only non-default params, and is at most 2 KB. Params
are validated against the current version of the piece, so old links survive updates. A `t` that is not a finite
number is dropped; the rest is clamped to `[0, length]`.

**Export.** Share also exports the same state as a file: the current frame as an image, or a stretch of `t` as a
GIF or video. The page renders it offline by seeking frame by frame, not by recording the screen, which works
because every piece is a function of `(t, params)` (section 3). The piece does nothing to support it.

**Presets** are `{ id, label, params, t }`. `id` matches `^[a-z0-9][a-z0-9-]{0,31}$` and is unique; `label` is
at most 40 characters; `params` holds values that validation would not change; `t` is optional and within
`[0, length]`. Applying a preset sets its params and, if it has a `t`, seeks there and pauses, like `#t:`.

## 5. Runtime environment

The piece runs in a worker (section 10). It draws on an `OffscreenCanvas` and sees the world only through
`env` and the stand-in `document` (section 6):

```js
env = {
  device: 'desktop' | 'phone',
  mode: 'feed' | 'interact',
  fullscreen: boolean,
  box: { x, y, w, h },   // the drawing area within the canvas, CSS px
  w, h,                  // the canvas, CSS px; it has w·dpr × h·dpr pixels
  dpr,
  colors,                // COLORS
  font,                  // the site's font
  ui,                    // the piece's UI root (section 6); present only while mode === 'interact'
  setParam(key, value),
  wasm(),                // the .wasm's bytes, as a promise; only if the piece ships one
  overlay,               // a 2D context over the canvas, for text; only with context: 'webgl2'
}
```

**The box** is the part of the canvas the page leaves free of its own controls. With `context: '2d'`, before
every `draw` the context is reset, scaled by `dpr` so its units are CSS px, translated so `(0, 0)` is the box's
top-left corner, cleared to `bg` and clipped to the box. Input coordinates use the same origin (section 6).

`onMode(env, S)` is called whenever `mode` or `fullscreen` changes and on every resize. It is where a piece
builds its UI in `env.ui` when `mode` becomes `'interact'`. **Every piece supports full screen**: it must lay
out correctly in full screen at both desktop and phone sizes. There is no flag to opt out.

### What a piece can use

The worker has no network. Everything a piece runs is in its submission or is handed in by the page.

**Pinned libraries.** A piece may import these, and nothing else:

| Import | What it is |
|---|---|
| `@eigenreel/kit` | the site's helpers (`kit.js`): color mixing, labels with a halo, a seeded random, the orbit camera, pan and zoom |
| `@eigenreel/three` | three.js 0.170.0, the core build only (no `three/addons`); with `context: 'webgl2'` |

```js
import { mix, OrbitCamera } from '@eigenreel/kit';
import * as THREE from '@eigenreel/three';
```

The kit and every pinned library are files in the site's repository. The page hands them to the worker as text,
and the worker resolves the import to that copy. A pinned library runs inside the same locked-down worker as the
piece, so it is contained like the piece's own code. The list grows on request: a maintainer pins a version. A
later version gets its own name (`@eigenreel/three@0.180`), so a published piece never sees its library change.

**Bundled libraries.** Anything else is bundled into the piece's file and counts toward its 200 KB. Each one is
declared, so reviewers know what they are looking at:

```js
libraries: [{ name: 'd3-scale', version: '4.0.2', license: 'ISC' }],
```

A bundled library's license is on the list in section 1 and permits the piece's own license. Libraries that need
what the worker lacks will not work, pinned or bundled: timers and `requestAnimationFrame` (animation and
scheduling libraries), `new Function` or `eval` (some template engines and expression compilers), and anything
that loads further files.

**WebAssembly.** A piece may ship one module, `entries/<slug>.wasm`. The page hands its bytes in, and the piece
instantiates it itself:

```js
async setup(env, S) {
  const { instance } = await WebAssembly.instantiate(await env.wasm(), { env: { sin: Math.sin } });
  S.wasm = instance.exports;
},
```

- The module can call only what the JS passes it as imports, and runs in the same worker, so the watchdog
  stops a looping module like a looping script. There are no threads: no workers and no `SharedArrayBuffer`.
- The worker watches every memory the piece creates or a module exports, and stops the piece once one is over
  64 MiB.
- The JS half is the piece: the time, params and colors rules apply to what it draws, however the work is split.
- Toolchains' generated JS fetches the `.wasm` by default; pass the bytes in instead (`wasmBinary` or
  `instantiateWasm` for Emscripten, `init(bytes)` for wasm-bindgen).
- The source is in the pull request, under `sources/<slug>/`, with a `BUILD` file giving the command that
  produces the `.wasm`. Reviewers read the source; the check does not rebuild it.

**Contexts.** `context` picks what `draw` receives as `ctx`:

- `'2d'`: an `OffscreenCanvasRenderingContext2D`. The default.
- `'webgl2'`: a `WebGL2RenderingContext`, desktop only (`modes.phone` is false). Before every `draw` the default
  framebuffer is bound, the canvas is cleared to `bg`, and the viewport and scissor are the box. After it, the
  page clears everything outside the box. GL objects persist between frames; pipeline state does not, so set
  what you depend on every frame. There is no `fillText`: draw labels in the 2D overlay the page provides as
  `env.overlay`, which uses the same box and scaling as a `'2d'` context.
- The watchdog cannot stop a GPU stuck in a shader, so keep every GLSL loop visibly bounded: a `for` with a
  literal or `const` trip count. Reviewers look for it.
- WebGPU is not offered.

**Fonts, images and data.**

- **Fonts:** only the site's font. `env.font` is its family name, for `ctx.font`. The page hands in its bytes
  and the worker loads them before lockdown; `FontFace` is not available to the piece.
- **Images:** embed them in the file as base64 and decode with `createImageBitmap(new Blob([bytes]))`. `Image` is
  not available. They count toward the 200 KB.
- **Data:** tables and precomputed values go in the file as literals.
- **Not available:** audio, storage, workers and the network.

## 6. Modes and input

The site has four combinations, feed or interact × desktop or phone, and either can be full screen.

**Feed mode.** The piece draws and receives no input. Drags and swipes scroll the feed, keys are the site's
hotkeys, and `env.ui` is absent.

**Site hotkeys** are kept to a minimum. On desktop they only scroll the feed (the arrow keys, Page Up and Page
Down), and Space is reserved for pause. Nothing else is bound, so a piece cannot count on any other site
shortcut existing. Phones have no keyboard; how a phone viewer pauses is not decided yet (see the open
questions).

**Interact mode.** Only pieces that declare `interact`. The viewer enters with "Click to interact" ("Tap to
interact" on phones). While in it:

- pointer, touch and wheel input over the box go to the piece, as events on `env.ui` itself, and wheel input
  never scrolls the page. A drag that starts in the box keeps sending `pointermove` until `pointerup`, even
  outside it;
- the piece may build its own UI in `env.ui`: buttons, panels, sliders (below);
- every key goes to the piece **except Esc, Tab and Ctrl/⌘/Alt combinations**, which stay with the site and
  the browser. Tab and Shift-Tab move focus through the piece's controls and then back to the page;
- the page shows the piece's `interact.hint`, with "Esc or click outside to leave";
- the viewer leaves with Esc, with the site's Done button, by clicking or tapping outside the piece, or by
  scrolling the feed from outside it. Done is drawn by the page, outside the piece, and stays visible in
  full screen;
- on leaving, the site removes `env.ui`. Param changes made with `setParam` persist.

A piece without `interact` has no interact mode; viewers can still drive it from the explanation.

**`env.ui`.** The piece's code never touches a real document. `env.ui` is a stand-in element inside the
worker with a small DOM-shaped API, covering the box. The worker's global `document` is a stand-in too: its only
member is `createElement`, which makes the elements below, or an `OffscreenCanvas` for `'canvas'` (some
libraries expect that). The runner (section 10) copies what the piece builds into the real page
through an allowlist, and sends the viewer's input back as plain data.

| | Allowed |
|---|---|
| Elements | `div`, `span`, `p`, `button`, `label`, `input` (`range`, `checkbox`, `radio`, `number`, `text`), `select`, `option`, `details`, `summary`, and SVG `svg`, `g`, `path`, `circle`, `rect`, `line`, `polyline`, `text` |
| Building | `document.createElement`, `appendChild`, `insertBefore`, `removeChild`, `replaceChildren`, `textContent`, `classList`. There is no `innerHTML` |
| Attributes | `id`, `class`, `title`, `role`, `aria-*`, `tabindex`, `disabled`, `hidden`, `type`, `name`, `value`, `checked`, `selected`, `min`, `max`, `step`, `placeholder`, `for`, `open`, the geometry and paint attributes of the SVG elements above |
| Style | inline `style` with layout, box, color, font and transform properties. Values containing `url(`, `image-set(`, `@import` or `expression(` are dropped, and so are `animation`, `transition` and `behavior`. Controls without a style get the site's look, colored by `COLORS` |
| Events | `click`, `input`, `change`, `pointerdown`, `pointermove`, `pointerup`, `pointercancel`, `wheel`, `keydown`, `keyup`, `focus`, `blur`. A listener receives `{ type, target, value, checked, key, code, x, y, button, buttons, pointerId, pointerType, deltaX, deltaY, shiftKey, altKey, ctrlKey, metaKey }`, with `x` and `y` in CSS px from the box's top-left corner and `deltaX`/`deltaY` in CSS px. Pinch zoom on a trackpad arrives as `wheel` with `ctrlKey`. There is no `preventDefault` |
| Measuring | `await el.measure()` gives the element's box. Nothing reads layout synchronously |

Anything not in the table is ignored, and the chalkboard says what was dropped. There are no links, forms,
images, frames or scripts.

**Phone concern (no rule yet).** On a phone the piece fills a slide about 335 × 490 px, and a panel built in
`env.ui` may not fit beside the picture. Interact mode does **not** go full screen automatically. Authors should
design phone panels to be small or collapsible (`details` is there for that); the chalkboard's phone preview is
where to check. Revisit if pieces routinely struggle.

**Full screen** is the page's: it puts its own container in full screen. The piece's frame is never granted the
Fullscreen API.

## 7. Explanation

`entries/<slug>.md` is Markdown, with TeX in `$…$` and `$$…$$`, 150 to 1200 words not counting formulas. It
has the sections `What you're seeing` and `Try this`, and a `Reference` line. "Try this" lives here, not in the
feed. The style guide covers how to write it.

Links with these reserved targets drive the piece instead of navigating:

| Link | Effect |
|---|---|
| `[eight petals](#preset:eight)` | applies a preset by its `id` |
| `[at t = 6](#t:6)` | seeks to that time and pauses |

**What an explanation may contain.**

- No raw HTML and no images: an image would tell an outside server who is reading.
- Every other link is `http(s)` and not a shortener. That includes reference-style links. Whether a link
  resolves is reported to reviewers but never fails the check, since a server can be down for a day.
  The page opens these links with `rel="noopener noreferrer"`.
- TeX is rendered by the pinned KaTeX with `trust: false`, `strict: 'error'` and `maxExpand: 1000`. Custom macros
  (`\def`, `\newcommand`, `\let`, …), `\href`, `\url`, `\includegraphics` and `\html…` fail by name.
- The page renders everything through DOMPurify with an allowlist and falls back to escaped text, so a rule
  the check misses still runs no script.

The submission check validates every link against the file: an unknown preset or scheme fails, and so does a
`#t:` outside `[0, length]`. To set a single param from the text, make a preset for it.

## 8. The feed slide

As simple as possible:

- the piece;
- its title and hook;
- Like, Share (with export, section 4), Explanation and Full screen;
- "Click to interact", only if the piece declares `interact`.

No Customize, no preset pills, no color controls. A feed viewer changes a param only through the piece's own UI
in interact mode, or through the explanation's links. The Explanation is the only panel that slides over the
feed; everything else is a button or opens elsewhere.

## 9. Chalkboard

The chalkboard is the editor, replacing Playground.

- **Default view:** the live render, with panels for colors, params and presets, metadata, and the explanation.
- **Source:** hidden by default, one click to show.
- **Preview switch:** feed or interact, desktop or phone, windowed or full screen.
- **Checks:** run live as you edit (section 10).
- **Export:** the submission's files as a zip, ready to add to a fork of the registry (section 11).

The chalkboard runs the piece in the same sandbox as the feed. Nothing the piece sends can start an Export or
change what the report says. The chalkboard's report is advice for the author; the check on the pull request
is the one that counts.

The chalkboard is optional: technical users can write the files in their own editor and open the pull request
directly (section 11).

## 10. Sandbox and checks

Safety comes from limits the browser enforces, so a piece that passes review and then misbehaves can still do
little. The checks and the review catch mistakes; they are not the defense.

**What an author needs to know.** The piece runs in a worker inside a sandboxed frame, with no network,
storage or access to the page. How that is built is in `docs/sandbox.md`. What it means for a piece:

- the watchdog stops the piece when `setup` takes over 8 s, or a single `draw`, event handler or `onMode` call
  takes over 250 ms (the first three frames get setup's budget, for shader compilation and caches);
- Esc is handled before the piece sees it, so a piece cannot keep the viewer in interact mode;
- a call to a blocked API (the network, storage, timers) fails silently. The forbidden-API warning below is how
  an honest author hears about it;
- maintainers can stop a piece for everyone with the kill switch, and a piece that crashed the tab is skipped on
  reload.

**The gate.** These checks run in the chalkboard and again on the pull request, from the registry's base branch,
reading the files as data. The pull request needs them all to pass.

- the pull request changes only the piece's own files (section 11);
- slug, file names and sizes (section 1);
- metadata is literal and every field is valid, including license, tags and alt;
- `COLORS` is first, valid and has the contrast in section 2;
- params and presets are valid (section 4); a preset's `t` is within `[0, length]`;
- the explanation's sections, length, TeX and links (section 7);
- imports: only the pinned libraries (section 5), each by its exact name;
- bundled libraries: each declared one has an allowed license;
- WebAssembly: the `.wasm` is a valid module of at most 2 MB, and `sources/<slug>/BUILD` exists;
- a `webgl2` piece does not declare `modes.phone`;
- duplicates: the source is not identical (SHA-256) to another piece's.

**Warnings** show in the same report but never fail it:

- forbidden APIs: the source refers to one of the globals `fetch`, `XMLHttpRequest`, `WebSocket`,
  `importScripts`, `indexedDB`, `localStorage`, `FontFace`, `Image`, `eval` or `Function`, or has an
  `import()` expression. The match is on identifiers, so `createImageBitmap` and a method named `fetch` are
  fine. The sandbox blocks all of these anyway; the warning tells an honest author why something does nothing;
- ownership: a change to an existing slug comes from someone other than the author of the pull request that
  first added it (section 11).

**Dynamic checks.** These run the piece in the sandbox at a phone size (335×490) and a desktop size
(1100×700), windowed and full screen. On the pull request they are best effort: a shared runner is not a
reference machine, so the results go to the reviewers and never block. A piece can also tell it is being
checked, so these catch mistakes, not malice.

- `setup` resolves with no error within 4 s, half the watchdog's limit, so slower machines have room;
- at least 2% of the box differs from `bg` (counted on 4 px blocks, so thin lines count; at t = 2 or at `length`/2,
  since a loop may start from nothing);
- **time purity:** a fresh instance played to `t` and one seeked to `t` give the same frame, and two fresh
  instances agree at the same `t` and params, allowing for small GPU differences with `'webgl2'`;
- **`setParam` honesty:** the checker drives every control in `env.ui` and a few drags and wheel turns over the
  box, then remounts the piece with the resulting params at the same `t`. A frame that differs after the
  remount means the piece kept state outside `params`. Reviewers judge whether it is hover-like state, which is
  fine, or a param kept in `S`, which is not;
- no flashing more than three times a second, measured on the composited frame, `env.ui` included;
- content: frames and text through image safety and text moderation (needs a service; not run yet).

## 11. Submitting

Every submission is a pull request from the author's own fork of the registry. The registry has no submission
branches of its own. The site holds no GitHub credentials, and it never pushes, opens, comments on or merges
anything on anyone's behalf.

**From the chalkboard.** "Export" gives the author a zip of the submission's files, laid out as they go in the
registry, and the chalkboard's check report. A page on the site walks through the rest: fork the registry, add
the files on a branch of the fork (GitHub's web upload is enough), and open a pull request. Authors may paste
the report into the description, but reviewers go by the check on the pull request.

**Directly.** Technical users skip the chalkboard and do the same by hand. The same checks run.

**What a pull request may change.** Only `entries/<slug>.js`, `entries/<slug>.md`, `entries/<slug>.wasm` and
`sources/<slug>/`. The check fails anything else.

**Authorship.** A piece's GitHub author is whoever opened the pull request that first added it, by numeric user
id (ids survive renames; logins do not). The site already looks this up when it imports a piece. When a later
pull request for the same slug comes from someone else, the check warns, and the reviewers decide whether
the change is welcome.

**The check workflow** runs the checker from the base branch with a read-only token and no secrets. A
maintainer approves the run for outside contributors, after checking that the pull request leaves `.github/`
alone. How that is set up is in `docs/sandbox.md`.

**Review** is by people: the bot's checks, then two reviewers (`docs/review-pipeline.md`). Authors leave "Allow
edits by maintainers" on, so a reviewer can push a small fix to the pull request's branch. Branch protection on
`main` requires the check and two approvals, and the pull request merges automatically once it has both. Branch
protection also dismisses approvals when new commits are pushed, so nothing pushed after the second approval,
by the author or a reviewer, merges without being approved again. The stale workflow closes abandoned pull
requests; their branches live in forks, so the registry has nothing to clean up.

## Open questions

- **Authors without git** (section 11): whether GitHub's web upload is easy enough for them, or whether the
  site's how-to page needs screenshots or a video.
- **The `env.ui` allowlist** (section 6): check that it is enough by rewriting two or three existing pieces'
  panels against it before the spec settles.
- **WebGL2 on phones** (section 5): desktop only for now, because phone GPUs are 10 to 30 times slower and a
  stuck shader cannot be stopped. Revisit with measurements.
- **Which libraries to pin next** (section 5): likely candidates are whatever authors bundle most.
- **Phone interact panels** (section 6): watch, and decide later whether a rule is needed.
- **Hotkeys** (section 6): scrolling only for now, with Space reserved for pause. Still open: how pause works on
  phones, and whether Space stays with the site in interact mode or goes to the piece like other keys.
- **Migration** of the existing pieces: after the spec settles.
