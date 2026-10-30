# 06 · Compare: the same piece at two parameter values, side by side

## Pitch
Split the stage into two synchronized copies of one piece, A and B, with independent parameters and a shared clock, so a viewer can see what one knob changes while everything else stays fixed. "What changes between r = 3.2 and r = 3.5" is the question most pieces are built around, and today you can only answer it from memory by moving the slider back and forth.

## Why mathematicians would care
- **Teaching:** comparison is the core move in explaining a bifurcation, a convergence rate or a sensitivity result. "Left: midpoint rule, right: trapezoid, same n" makes a point a single slider cannot.
- **Research conversations:** "here is the Julia set at c and at c + ε" sent as one link is a precise question to a colleague.
- **It is a share format:** a compare link (`&cmp=…`) is a self-explanatory picture; a still of it (via capture) is a figure for a paper or slide.
- **Reviewers already need it:** review-pipeline.md section 4 has reviewers compare desktop and mobile targets "side by side at the same params and *t*". The same component serves both.

## What exists today in the prototype that it builds on
- `LociHost.mount` (`runtime.js`): mounting is per canvas, and determinism (`(t, params, theme, box, seed)` → pixels) means two mounts with the same `t` agree exactly; `h.seek`, `h.setParams`, `h.play/pause` give synchronization.
- `mountSlide`, `freshCanvas`, `boxOf`, `layoutBox`, `placeOverlays` in `app.js`.
- The three-worker cap (`mountPolicy` keeps current ± 1): compare uses two workers for the current slide, so neighbours are unmounted while comparing.
- `renderCustomize` / `paramField` / `paramControls` for the A/B controls; `stateOf` / `readLink` / `b64u` for links.
- The double-pendulum and Lorenz pieces already show "two runs at once" inside one module; compare generalizes that to every piece without author work.

## Design
**Entry:** a "Compare" toggle at the top of Customize (`renderCustomize`), key `x` in the feed.

**Layout:** the stage splits into two canvases (side by side when the slide is wider than tall, stacked otherwise), each with its own labels overlay and an "A" / "B" corner tag outside the box. Each half gets its own box via `boxFor` on its half. Both run the same target (`chooseTarget` once, used twice).

**Controls:** Customize shows each param once with two values (two sliders labelled A and B, B initially = A); a "differs" dot marks params where A ≠ B; a **Swap** button and **Link** toggle per param (linked params move together). Theme, speed and *t* are always shared: one clock drives both (`seek` and `play/pause` applied to both handles; scrub on either half scrubs both).

**Optional difference view (v2):** for `canvas2d` and `pixels` pieces, a third mode draws `|A − B|` per pixel on the page from two `capture()`s while paused. Only when paused; it is a capture, not a live mode, so it costs nothing per frame.

**Link form:** `?v=<id>&p=<A state>&cmp=<base64url {p: B params}>`; `readLink` validates B with `normalizeParams` like A.

**Persists:** nothing beyond the link; compare is off on reload unless `cmp` is in the URL.

## Risks / what a skeptic would say
- **Half a phone screen is tiny.** Stacked halves on a 335×490 box give two 335×230 boxes; many pieces stay legible, some will not. Respect each target's `minBox`: if a half is smaller, show "Compare needs a wider screen" and offer landscape.
- **Cost doubles.** The budget (`STEP_MS`, `SLOW_MS`) applies per worker; a GPU piece at 16 ms twice may step down to 30 fps. Acceptable; say so in the badge.
- **Seeds:** with a `seed` param, A and B share it by default (otherwise random differences swamp the param difference); unlinking it is an explicit choice.
- **"Authors could just build this in."** Two of them did (pendulums, Lorenz), at the cost of a second simulation in their module. Host-level compare is free for every piece and keeps modules simple.

## Effort
**M** (2 days). Touches `app.js` (compare state per slide, second canvas/overlay in `slideHTML`, `mountSlide`/`unmount`/`syncPlay`/`seekViz` over both handles, Customize A/B fields, `readLink`/`shareURL`), `styles.css` (split stage), `docs/module-api.md` section 5 (`cmp`). No module changes.

## How to verify
1. logistic-bifurcation → Customize → Compare: two copies; set B's r to 3.5, A at 3.2; both play in lockstep; scrub one, both move.
2. Pause, Frame: the PNG contains both halves with A/B tags.
3. Share: open the link in a private window; it opens in compare mode with both values.
4. On a 375×812 phone viewport: halves stack; on mandelbrot-zoom with a mobile target, both halves run the mobile target.
5. Performance panel: neighbouring slides are unmounted while comparing (only two workers alive).

## Review

**Verdict:** build smaller. Two synced canvases on desktop-width screens, with an A/B selector that drives the existing Customize controls. Leave out per-param link/swap, the phone layout and the difference view.

**Strongest objection:** "The pieces where comparison matters already do it inside the module (double-pendulum, lorenz-butterfly), and do it better because they overlay the two runs in one frame. Two side-by-side halves at half size make each picture worse, and my eye still has to saccade between them. Moving the slider back and forth is a comparison too."

**What to cut:**
- Cut the per-param **Link** and **Swap** toggles and the two-sliders-per-param layout. Use one segmented "Editing: A | B" control above the unchanged `paramControls`. B starts as a copy of A, and a "differs" note lists the keys where A ≠ B.
- Cut stacked phone layout. Below a width where both halves meet the target's `minBox`, show "Compare needs a wider screen" and keep the single view.
- Cut the `|A − B|` difference view (v2).
- Cut the two-half composite Frame for v1. Frame captures the half that has focus.
- Keep: key `x` and a toggle in Customize; one clock (play, pause, seek, scrub on either half drive both); the A/B tags; the `&cmp=` link form; a shared seed; and a shared `view` by default. The proposal omits view: for hopf-fibers or mandelbrot-zoom, two different cameras make the comparison meaningless.

**Must be true to keep it:**
- At the same `t`, the A and B frames differ only where the params differ. Set B = A and the two captures must be byte-identical.
- No more than 3 workers are alive while comparing.
- Leaving compare restores exactly the single-piece state, with neighbours remounted.

**Feasibility check:**
- Every cited name exists: `LociHost.mount`, `mountSlide`, `freshCanvas`, `boxOf`, `layoutBox`, `placeOverlays`, `mountPolicy`, `renderCustomize`, `paramField`, `paramControls`, `chooseTarget`, `syncPlay`, `unmount`, `seekViz`, `readLink`, `shareURL`; `STEP_MS` and `SLOW_MS` are in runtime.js.
- The estimate understates the coupling. Params live per piece in `settings[v.id]`, and `pushParams`, `applyPreset`, `stateOf` and `readLink` all assume one params set. B must live on the slide (for example `sl.cmp={params, host, canvas, overlay}`) and be pushed to its own handle directly.
- `sl.host` appears 26 times in app.js (play sync, seek, unmount, `pieceFailed`, `saveFrame`, engage/release, resize). Each call site needs a decision about the second handle.
- `mountPolicy` always mounts ±1, so it needs an explicit "comparing: active only" branch to stay at 3 workers or fewer.
- Each canvas can hand control to only one worker (`freshCanvas`), so B needs its own canvas and labels canvas in `slideHTML`, or created on demand.
- Pitch example: riemann-sums has left/midpoint/right only, not trapezoid. Use left vs midpoint.
- logistic-bifurcation stores r × 100, so 3.5 is `r: 350`.
- Effort: 2 days is optimistic for the full design (say 3). The cut version is about 1.5 days.

**Verification script:**
1. Desktop width, logistic-bifurcation, press `x`: two halves tagged A and B. Select B, then the "r = 4.00" pill: only B changes, and the differs note says "r".
2. Press play: both run in lockstep. Press `]` ×3: both readouts show the same `t`. Drag-scrub on A: B follows.
3. Set B = A, pause, Frame each half: the two PNGs are identical.
4. Share, then open the link in a private window: it opens in compare mode with r = 3.83 vs 4.00.
5. Performance panel or worker count: 2 workers while comparing on a middle slide. Press `x` again: the neighbours remount and the single view is restored.
6. Resize to 375×812: "Compare needs a wider screen", and nothing breaks.
