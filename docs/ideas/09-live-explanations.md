# 09 · Live explanations: symbols and steps that drive the picture (the proof-sketch layer)

## Pitch
Let an explanation link its words to the running piece: a symbol bound to a param shows its current value on hover and scrubs it on drag, a phrase can jump to a preset or a moment *t*, and a "Why it works" section can be stepped through as a proof sketch, each step setting up the picture it talks about. The explanation stops being a caption beside the animation and becomes the way you operate it.

## Why mathematicians would care
- **Readers** keep their eyes on the argument. "As *k* passes 2 the envelope is a cardioid": hovering *k* shows "k = 1.84", clicking "cardioid" seeks to *k* = 2. That is the difference between reading about a picture and checking a claim against it.
- **Teachers** get a proof sketch they can step through in class, where each step is a state of the picture: the natural format for "here is why the group law is associative, in four pictures".
- **Authors** finally have a place to put the *why*, which the feed format (one idea, one knob) has no room for. The step-through is what distinguishes Loci from a GIF gallery for a research audience.

## What exists today in the prototype that it builds on
- The Explanation tab in `renderDrawer` already injects tappable preset pills after the "Try this" heading (`xpresets`, `presetPills`). This generalizes that injection to inline links.
- `applyPreset`, `seekViz`, `pushParams`, `normalizeParams` (every value a link sets is validated), `showCallout`.
- `paramControls` (labels and formats for each param, used for the hover readout); `getSettings(v).params` for live values.
- `times-table`'s explanation already has a "Why it works" section; `elliptic-group-law` has the associativity story implicit in its presets.
- Lessons (03): a proof sketch is an author-written lesson embedded in the explanation.

## Design
**Markdown syntax (links with reserved schemes, so the raw file stays plain Markdown and renders harmlessly elsewhere):**
- `[*n*](#param:n)` → a **live symbol**: dotted underline; hover or focus shows a tooltip "n = 200 (Points on the circle)"; click opens Customize with that slider focused; horizontal drag on the symbol scrubs the value (step-snapped, through `normalizeParams`), Tangle-style; arrow keys adjust it when focused.
- `[the cardioid](#preset:0)` → applies preset 0 (same path as the pills).
- `[at t = 271 s](#t:271)` → seeks there and pauses.
- `[k = 51, n = 101](#state:n=101;t=271)` → an ad hoc state.

**Proof sketch layer:** an optional section `### Why it works` whose top-level ordered list items each end with a state link become **steps**. The Explanation tab shows a "Step through (4 steps)" button over that section: it highlights step 1, applies its state, pauses, and shows the step text as the callout; Next/Previous (and `←`/`→` while the drawer is open) move through steps. Leaving the drawer exits the step-through.

**Checks (`checks.js`):** every `#param:` key exists; every `#preset:` index exists; every `#state:` validates; a `Why it works` step list with links is counted and reported ("proof sketch: 4 steps"). Unknown `#…:` schemes are a warning.

**Persists:** nothing; it is all in `explanation.md`.

## Risks / what a skeptic would say
- **Authors won't write it.** Most won't, and do not need to; the catalog editors should retrofit three pieces (times-table, elliptic-group-law, fourier-square) to show the format, and the remix templates (15) should include it.
- **A "proof sketch" that is just pictures can mislead.** The reviewers' form already asks "is anything overstated, or missing a hypothesis"; add "does each step's picture show what the step claims". Name the section "Why it works", not "Proof".
- **Drag-to-scrub on text** conflicts with text selection; scrub only after a 6 px horizontal move (the same threshold idea as the stage's `SCRUB_PX`), and keyboard arrows are the accessible path.
- **Hash links in other renderers** (GitHub) just jump nowhere; harmless.

## Effort
**M** (2 days). Touches `app.js` (post-process `article.md` links in `renderDrawer`, tooltip, drag-scrub, step-through controller), `checks.js` (link validation), `catalog.js` (retrofit three explanations), `docs/submitting.md` section 6 (syntax), `docs/review-pipeline.md` section 4 (one form question), `styles.css`.

## How to verify
1. times-table → Explanation: hover *n*: "n = 200"; drag it left: the slide's chords thin out live and Customize (if open) follows.
2. Click "the cardioid": the slide seeks to *k* = 2 and pauses with a callout.
3. "Step through": four steps; each sets params and *t*; `→` advances; Esc exits and the piece resumes.
4. Submit a sample with `[x](#param:nope)`: the report fails "explanation: link to unknown param nope".
5. Keyboard only: Tab to a live symbol, arrow keys change it, the live region announces the value.

## Review

**Verdict:** build smaller. Inline state links plus a "Why it works" step-through are what separate Loci from a GIF gallery for a research audience. Tangle-style drag-scrub on text is the expensive, fragile part, and it's the part to drop.

**Strongest objection:**
- "A sequence of pictures labelled 'Why it works' is not an argument. It will read as proof by animation, and readers will trust it more than they should."
- "Most of your pieces are driven by *t*, not by the parameter, so the symbol I care about (*k* in times-table) isn't something you can bind."

**What to cut:**
- Drag-to-scrub on symbols, and its 6 px threshold and text-selection conflict.
- The arrow-key adjusting of symbols.
- `#state:` ad hoc strings. Use `#preset:N` and `#t:` only; a step that needs a new state should be a preset.
- Keep: `#preset:`/`#t:` links, a hover/focus readout for `#param:`, and Step through with Next/Previous over an ordered "Why it works" list.
- Retrofit only times-table and elliptic-group-law.

**Must be true to keep it:**
- At least two retrofitted step-throughs where each step's picture shows what the step claims. A mathematician on the morning review should judge it an explanation, not captions.
- The review form gains the question "does each step's picture show what it claims".

**Feasibility check:**
- The names exist: `presetPills` and the `xpresets` injection (app.js 215, 696–699), `applyPreset` (521), `seekViz` (346), `pushParams` (345), `showCallout` (530), `normalizeParams` (manifest.js), `paramControls`, `getSettings`, `SCRUB_PX`.
- The headline example does not work. times-table's only param is `n` (catalog.js 78). *k* is driven by time ("the multiplier *k* sweeps slowly upward from 2"), so "hover *k* shows k = 1.84" needs a module-to-host readout channel that the module API does not have. worker.js `takeOutputs` carries only `cursor` and `view`.
  - Either restrict live symbols to declared params, or propose a separate `out.readouts` API change (which needs a module-api.md section and a check).
  - "Click 'cardioid' seeks to k = 2" must be written as `#t:0`.
- Conflict with the check suite: `linkCheck` (checks.js 626) collects every `](…)` target and runs `new URL(u)`. `#param:n` is not absolute, so every live link would warn "not a well-formed absolute URL". Exempt the reserved `#param:`/`#preset:`/`#t:` schemes there and validate them in the new check.
- times-table's "Why it works" is prose with an italic formula, not an ordered list, so the retrofit is a rewrite. That's fine, but it counts as editorial work.
- With the in-progress view work, `stateOf` now includes `view`. A step that needs a camera (hopf-fibers) needs a preset carrying a view, and presets don't carry one today.
- The effort (M, 2 days) is honest for the cut version. The full design with drag-scrub and an accessible live region is 3 or more days.

**Verification script:**
1. times-table → Explanation: hover *n*. A tooltip reads "n = 200 (Points on the circle)". Change n in Customize and hover again: it updates.
2. Click the "n = 101, wait for k = 51" inline link: the slide seeks to t = 271, pauses and shows the callout.
3. Press "Step through": the step count matches the list. `→` advances, and each step changes the picture (pause and compare). Esc exits and the piece resumes.
4. Submit a sample with `[x](#param:nope)`: fail "link to unknown param nope". `[y](#preset:9)`: fail. The Links check does not warn about either.
5. Keyboard only: Tab reaches each live link and Enter activates it.
