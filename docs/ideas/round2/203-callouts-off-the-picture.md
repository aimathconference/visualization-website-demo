# 203 · Callouts off the picture, and a drawer that peeks on phones

## Pitch
One callout with one rule: **text never sits on the picture.** It docks under the box: on phones as a strip right below the stage, and on desktop in the caption area. On phones, any drawer action that changes the picture shrinks the drawer to a 35 % **peek**, so the picture and its note are visible together. That covers Try-this pills, `#preset:`, `#t:` and `#state:` links, Why-it-works steps, "Show me" and "Show my moment".

## Why mathematicians would care
- A lesson note says "the cobweb is a rectangle", and the card sits on the cobweb (`a1`, `c5`).
- The explanation says "Tap one to set it up on the slide", but on a phone the slide is behind an 82 %-high drawer (`c2`, `c6`).

Tonight's best features all assume you can see the picture while you read. On a phone you can't.

## What exists today
- Six callout variants, each positioned over the stage by `placeOverlays`, each with different dismissal:
  - `showCallout` (a 6 s toast)
  - `lessonCard`
  - the collection callout
  - the Why-it-works callout
  - the question "Show me" callout
  - Present's `.pz-note`
- A bottom-sheet drawer with a drag handle and no intermediate height.

## Design (smallest real version)
1. **`Callout.show(sl, {kicker, text, controls?, sticky?})`** renders into a slot outside `boxOf(sl)`: under the box on phones (re-run `layoutBox` so the box shrinks by the slot height), and in the caption block on desktop. The six variants become calls to it. Present's caption moves into its bottom strip.
2. **Peek.** On screens narrower than 768 px the drawer gets a `peek` snap at 35vh. `runLive`, `whyGo`, drawer-originated `applyPreset` and `qwApply` call `peekDrawer()`. Tapping the header restores full height, and the scroll position is kept.
3. **Touch copy.** On `(pointer: coarse)`, the instruction strings swap ", . [ ] Esc Click" for "drag sideways, tap outside, tap". Each string is stored in two versions (in questions.js and in explanations, using the manifest's existing touch `hint` pattern).

## Risks
- The phone box loses about 70 px of 490. That is fine: pieces handle any box, and checks run at 335×490.
- Long notes reflow the caption on desktop. Notes are already capped at 140 characters; clamp to 2 lines with "more".
- Peek against drag-to-close: snap points at 35 % and 85 %, close below 15 %.

## Effort
M (1.5 days).

## How to verify
1. Phone: elliptic → Explain → first question's "Show me". The drawer peeks, the waist near x ≈ 0.58 is visible, and the note is under the box.
2. Phone lesson link: the whole cobweb is visible at every stop (compare `c5`).
3. Desktop 800×946: Customize → preset, and the stage stays visible.
4. Automated: for all six uses at 375×812, the callout rectangle doesn't intersect `boxOf(sl)`.

## Review

**Verdict: build. Split it, and ship the phone peek first.** It is the one change that makes tonight's guided features work for half the audience.

**Reproduced.** I used my own headless Chromium at 375×812 (`review-scripts/r3.mjs`):
- **Elliptic → Explain → Show me.** The drawer top is at 146 px. The drawing box spans 112–504 px, so **8.7 %** of the box is visible. The Show-me callout (397–462 px) sits behind the drawer.
- **Lesson link on logistic.** The lesson card is 118 px tall and lies **100 % inside** the box, over the cobweb (`review-scripts/phone-lesson.png`).

**Strongest objection.** Moving the callout under the box shrinks the box (`layoutBox`). That has two costs:
- It resizes the canvas, and therefore the worker, on every show and hide. Pieces with accumulated state (trails, Galton counts) can visibly reset or jump.
- `targetFor(manifest, capsFor(box))` chooses the target from the box size. Shrinking it by about 70 px on a phone can push a piece below a target's `minBox`, so it switches targets or shows the can't-run card mid-lesson.

**What to cut.**
- **Phase 1, about half a day.**
  - **Peek.** Under `isSheet()` (the existing 699 px breakpoint, not 768), drawer actions that change the picture call `peekDrawer()`: `runLive`, `whyGo`, `qwApply`, and `applyPreset` when it starts in the drawer. Peek sets the drawer's transform to about 35vh, the same mechanism as the existing drag (`drawer.style.transform`).
  - **Touch copy** for the three strings the walkthrough found.
- **Phase 2.**
  - **A reserved note slot, not a per-callout resize.** While a lesson or list plays on a phone, the slide gets a fixed slot under the box for as long as the guided mode lasts, so the box changes size once on entry and once on exit, never per step.
  - **Leave the 6 s preset toast on the picture,** but bottom-anchored and dismissible. It is transient by design.
  - **On desktop, move the lesson card into the caption column** (or the Present strip, which is already outside the box). Don't build a general `Callout.show` until two callers share it.
- The "six into one" refactor is the gold-plated part. Unify the lesson card and the collection callout (201 makes them one), Why-it-works and Show me. Leave Present's `.pz-note` as it is.

**Must be true to keep it.**
- At 375×812, no guided callout rectangle intersects `boxOf(sl)`.
- The box doesn't change size between stops.
- No piece changes target or falls back when the slot appears.

**Feasibility check.**
- Overlays are positioned by `placeOverlays(sl)` against `boxOf(sl)`. The caption height is already a CSS var (`--cap-h`, set by the ResizeObserver in `buildFeed`), so a slot can follow the same pattern.
- Compare (06) already re-lays out a stage when the drawer opens (`if(cmpSl) sizeCanvas(cmpSl)` in `openDrawer` and `closeDrawer`). Reuse that hook for peek.
- The gate runs modules at fixed boxes, so checks.js is unaffected.
- No link changes.

**Verification script.**
1. Phone: elliptic → Explain → the first sample question's "Show me". The drawer drops to a peek, the curve and the note are both visible, and tapping the drawer header restores it at the same scroll position.
2. Phone: the logistic lesson link. At stops 1 and 2 the whole cobweb is visible and the note sits under it.
3. Phone: times-table → Explain → tap the Try-this pill "n = 30". The peek shows the chord diagram.
4. Automated: run `r3.mjs` again and assert `visibleBoxFrac > 0.9` and an overlap of 0.
