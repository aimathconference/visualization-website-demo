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
