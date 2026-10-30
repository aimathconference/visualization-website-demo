# 07 · Clip recorder: export a frame-exact GIF or WebM of any range

## Pitch
Let viewers mark an in point and an out point on the timeline (optionally with parameter keyframes between them) and export a frame-exact GIF or WebM, rendered offline by seeking and capturing, not by screen recording. A clip is what people actually paste into slides, papers' supplementary material, Mastodon, Slack and lecture notes, and every exported clip should carry the link back.

## Why mathematicians would care
- **Talks and papers** need a looping figure that works offline in Beamer, Keynote, PowerPoint and PDF supplements. Today the "Frame" button gives one PNG; people screen-record and get dropped frames, cursor, wrong size.
- **Social sharing** of mathematics runs on short loops (math Mastodon, Bluesky, department slides). A clean 6-second loop with a small "loci · times-table" watermark is the most viral artifact this app can produce, and the watermark is the link.
- **Parameter sweeps** ("vary b from 2 to 0.3 over 8 seconds") show the bifurcation in one clip, which no single state link can.

## What exists today in the prototype that it builds on
- `h.seek(t)` and `h.capture()` in `runtime.js` (labels composited into the PNG, GPU pieces included: module-api.md, "Capture"), `LociHost.poster` (an offscreen mount for one frame): offline rendering on a detached canvas already works.
- Determinism (module contract; the "Deterministic" and "Time jumps" checks in `checks.js`): seeking to `t` gives the same pixels as playing to `t`, so frames can be rendered out of real time and in any order.
- `saveFrame` and `download` in `app.js`; `showT` (the *t* chip); scrub gestures for picking in/out points.
- Lessons (03) for keyframes: a sweep is "stop A → stop B, interpolated".

## Design
**Entry:** the **Frame** rail button gets a second action, "Record clip…" (long-press, or a menu in the Share dialog next to "Save frame").

**Dialog:** in = current *t*, out = *t* + 6 s by default (or the piece's `cycle` for a perfect loop: the dialog suggests it when `manifest.cycle` exists); fps 25 or 30; size: the current box, 480 × 480, or 1080 × 1080; format GIF (≤ 8 s, ≤ 480 px) or WebM (any length up to 30 s); theme as currently styled; watermark on/off (on by default, bottom-right outside the box: "loci · <id> · t = 2.0–8.0").

**Keyframes (v1.1):** "Sweep a parameter": choose one range param, start value, end value; values are interpolated per frame and snapped by `normalizeParams` (so each frame is a state a slider could produce).

**Render loop:** mount a hidden detached canvas at the export size (as `poster` does), paused; for each frame `i`: `setParams` if sweeping, `seek(in + i/fps)`, `await capture()`, decode to `ImageBitmap`, hand to the encoder. Progress bar with cancel. A 6 s × 25 fps × 480² clip is 150 captures; at ~20–40 ms each that is 3–6 s.

**Encoders (loaded on demand):** GIF via `gifenc` (npm, served from `cdn.jsdelivr.net/npm/`), with a 64- or 128-colour palette derived from the theme's four colours plus their mixes (quantization stays crisp because every piece draws from `bg, fg, a1, a2`); WebM via the browser's `VideoEncoder` (WebCodecs) and `webm-muxer` (npm). Where WebCodecs is missing, offer GIF only.

**Output:** `times-table-t2.0-8.0.gif`, plus "Copy the link to this clip" (a lesson link with the in point as its first stop) so the caption can carry it.

**Persists:** nothing; last-used settings in `loci:clip` localStorage.

## Risks / what a skeptic would say
- **GIFs of fractals are huge.** Cap GIF at 480 px and 8 s, and default to WebM for raster pieces (`render: 'pixels'` or `webgl2`).
- **Integrating modules** (pendulums, Lorenz) must recompute from the cycle start when `t` jumps; the gate checks this, and the recorder seeks forward monotonically within a clip, so it is the cheap direction.
- **GPU capture** per frame may be slow on weak machines; it is offline, so slow is fine with a progress bar.
- **Licensing of exported media:** the module's code license is not the clip's license. The export dialog should state that frames are derived from an open-source piece by @author and suggest attribution text. Settle the policy alongside the CC BY 4.0 rule for explanations in submitting.md section 8.

## Effort
**M** (2–3 days). Touches `app.js` (dialog, render loop, progress, download), `runtime.js` (none required; maybe a `captureBitmap()` that skips PNG encoding for speed), `index.html` (dialog markup), `styles.css`, docs (submitting.md licensing line).

## How to verify
1. times-table: Record clip, in 0, out 6, GIF 480 px: a 6 s GIF downloads; open it: no dropped frames, watermark present, labels in the viewer's font.
2. Record the same range twice: the files are byte-identical (determinism).
3. logistic-bifurcation: sweep r 2.8 → 3.9 over 8 s as WebM: the period doubling cascade plays in one clip.
4. mandelbrot-zoom (webgl2): WebM export works on a GPU machine; on a machine without WebGL2 the dialog explains why it cannot.
5. Cancel mid-render: no download, the slide keeps playing.

## Review

**Verdict:** build smaller. The clip is the one artifact here that leaves the site carrying a link, but ship one format, no sweep, and an honest note about what "frame-exact" covers.

**Strongest objection:** "I put figures in Beamer, Keynote and PowerPoint. GIF dithers my gradients, and WebM won't play in Keynote, QuickTime or PowerPoint on a Mac. The format you picked for quality is the one my slides can't open. For Beamer I want a PNG sequence for `\animategraphics`, not a video."

**What to cut:**
- WebM. If a video format ships, make it MP4/H.264 through `VideoEncoder` with `mp4-muxer`, since that is what slide software plays.
- The parameter sweep (v1.1). It forces a cache reset on every frame for pieces whose `S.key` includes the param (double-pendulum re-integrates from the cycle start on each frame).
- The 1080 size, the fps choice and the watermark toggle.
- What ships: in/out (defaulting to `manifest.cycle` when it exists), 25 fps, GIF at 480 px or less with `gifenc`, a fixed watermark, and a "Copy link" for the in point.
- Optional: a "PNG frames (.zip)" option for Beamer `animate` users, using `fflate` from jsdelivr. It is cheap and it is the mathematician-specific win.

**Must be true to keep it:**
- On the morning check, a 6 s times-table GIF and a double-pendulum GIF play smoothly with no frozen or repeated frames, and their motion matches what plays live.
- An exported file opens in Keynote/PowerPoint (GIF) and posts to Mastodon.

**Feasibility check:**
- The names exist: `h.seek`/`h.capture`/`getTime` (runtime.js 224–233), `LociHost.poster` (274), `saveFrame` (app.js 546), the Frame rail button (`rbtn('frame'…)`, 239) and the Share dialog's "Save frame as PNG" (index.html 84).
- Frame-exact holds only partly. Messages to the worker are ordered, so `seek(t)` and then `capture()` draws exactly at *t*. But both the worker's `seek` handler and `capture` go through `render()` → `drawFrame(0)`, so **dt = 0**.
  - The built-in integrators are keyed on *t*: double-pendulum steps to `floor(local/dt)`, and himmelblau-descent steps to `floor(local*45)`. So they export correctly.
  - A submitted module that advances state with `dt` would export as frozen frames.
  - The suite does not catch this. "Deterministic" compares two seeked instances (`A.at(t)` vs `B.at(t)`), and "Time jumps" compares seek-back with a fresh seek. A dt-integrator gives identical frozen frames in both, so it passes.
  - The file's claim that "seeking to t gives the same pixels as playing to t" is therefore not what checks.js verifies.
  - Fix: add a check comparing a played instance (`checks` driving `play()` to about t = 3) against a fresh seek within `JUMP_TOL`, and have the recorder warn when consecutive frames are byte-identical.
- Interactive pieces: with the in-progress pointer/view work (worker.js `takeOutputs`/`sendView`, runtime.js `o.view`), the offscreen mount must get the slide's `getView()`. Otherwise orbited or zoomed pieces export the default camera. State built from clicks (`onEvent` with no `getView`) cannot be reproduced from *t* at all.
- Each frame costs a worker PNG encode, plus a page-side decode/composite/PNG re-encode when labels are on (`composite`, runtime.js 67), plus the recorder's decode. That is two to three PNG codecs per frame, and the seek and the capture each call `render()`, so every frame is drawn twice.
  - Estimate 15–40 ms per frame at 480² and 60–150 ms at 1080², not 20–40 ms flat.
  - A `captureBitmap()` is not a runtime.js-only change. It needs a worker.js message (the sandbox file) that posts `createImageBitmap(canvas)`. It's small, but it touches the sandbox.
- Byte-identical repeats are plausible for GIF with a fixed palette, and not guaranteed for `VideoEncoder` output (hardware encoders).
- The effort (M, 2–3 days) is honest for the full design. The cut version is about 1 day.
- Overlap: PLAN.md on main already plans CI-rendered 6-second preview videos. Share the render loop with that, rather than building two.

**Verification script:**
1. times-table → Frame (long-press) → Record clip: in 0, out 6, GIF. A ~6 s GIF downloads, and the watermark reads "loci · times-table · t = 0.0–6.0".
2. Open the GIF frame by frame (any viewer): no two consecutive frames are identical, and the chords match the live slide at t = 3 (pause the slide there and compare).
3. double-pendulum: record 0–6. The pendulums swing in the GIF; they are not frozen at the start pose.
4. Record times-table 0–6 twice and run `cmp` on the two files: identical.
5. Start a 1080-equivalent long render and press Cancel: no download, and the slide keeps playing.
6. Drop the GIF into Keynote or PowerPoint: it loops.
