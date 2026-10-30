# 205 · Fix: leaving a lesson or collection gives the feed back as it was

## Pitch
Three bugs, one rule: **a list's state belongs to the list.** Leaving it restores the global pause, ends the lesson, and puts back the params you had.

## Why mathematicians would care
- A student follows a lesson link, swipes on, and the whole feed is frozen with a Play button.
- A professor opens a colleague's collection, returns to All, and the logistic map is silently at r = 3.20 instead of 3.83.
- That professor then presses "Add to a collection", which captures the colleague's state as "This moment".

When the site's state differs from what the user believes, a mathematical audience stops trusting it quickly.

## What exists today (reproduced)
- `Lesson.go` pauses. Only Esc, Exit or a preset calls `Lesson.exit`; `goTo`/`onActiveChange` never does. After `j`, `lessonPlay` is still set, `paused` is true, and the next piece shows Play (`scripts/s7.mjs`, `a7`).
- `Collection.applyAll` writes item params into `getSettings(v).params`, the user's own settings. Leaving the filter doesn't restore them (`a5`).
- `Lesson.apply` (stops, `#state:` links, "Show me", the reveal) overwrites the user's params too.

## Design (smallest real version)
1. **An overlay, not an overwrite.** Guided moments set `sl.over = {p, view}`, and one getter `paramsFor(sl)` returns `sl.over?.p ?? getSettings(v).params`. Route `pushParams`, the clip recorder, Present and capture through it. Leaving clears `over`.
2. **Leaving means exiting.** In `onActiveChange`, if the new slide isn't in the playing list, call `exit(true)`. Changing the chip ends a collection.
3. **Pause belongs to the player.** Every exit path restores `wasPaused`; a dev-build assertion checks it.
4. **Show it.** When the effective params come from a list, the caption reads "r = 3.20 · from Week 7 · Keep · Reset". Keep makes them yours, explicitly.

## Risks
- A teacher wants students to keep exploring at the lesson's state. That is what Keep is for: one tap.
- About 26 call sites read params, so grep `getSettings(v).params` and route each read through `paramsFor`.

## Effort
S–M (1 day with tests).

## How to verify
1. Lesson link → `j`: the next piece plays, `lessonPlay === null` and `lesson=` is gone from the URL. `k` returns to logistic at your own r.
2. Collection at r = 3.20 → All: logistic is at 3.83, and Add to a list captures 3.83.
3. In a lesson, drag r in Customize → Keep → Exit: your r stays.
4. Present across a list, Why it works and "Show me" each leave `paused` and the params unchanged after exit.

## Review

**Verdict: build, first.** Both leaks are real and cheap to stop. Use snapshot and restore, not a params overlay, unless 201's repeats force the overlay later.

**Reproduced** in my own headless Chromium (`review-scripts/r1.mjs`, `r2.mjs`):
- **Lesson.** Lesson link → `goTo(activeIdx+1)`. The slide is double pendulum, `lessonPlay` is still set, `paused` is still true, and the address bar was already rewritten to `?v=double-pendulum`, so the URL claims you have left. Going back shows the lesson card again at r = 3.20.
- **Collection.** I opened a collection with logistic at r = 3.20, then `setFilter({type:'all'})`. Logistic's params stay at r = 320 (shown as 3.20); the default is 383. No "modified" text appears anywhere on the slide.

**Strongest objection.** The overlay design, `paramsFor(sl)` routed through every read, touches 23 `getSettings(` call sites. Among them are `stillFor`, `renderThumb`, `stateOf` (and so share links), the Customize sliders, `paramReadout`, `pushParams` and compare's B (`pushB`). Miss one and the bug moves somewhere quieter, for example a share link that encodes the overlay while the slider shows your own value. That is worse than today's visible leak.

**What to cut.** Three small rules:
1. **Leaving means exiting.** In `onActiveChange`, `if(lessonPlay && curSlide() && curSlide().v!==lessonPlay.v) Lesson.exit(true)`. This is a one-line mirror of compare's existing `if(cmpSl && cmpSl!==curSlide()) closeCompare(true)` in the same function.
2. **Snapshot and restore.**
   - `Lesson.play` stores `wasParams = structuredClone(getSettings(v).params)` (and `view`), alongside `wasPaused`. `Lesson.exit` restores them when it is leaving by scroll or Esc.
   - `Collection.applyAll` snapshots each touched `settings[v.id]` into `filter.was`, and `setFilter` restores them when it leaves a playlist.
   - **Exit lesson (the button) keeps the stop's state.** That is what the current announce promises ("is yours to explore"). Say it in the toast: "Kept r = 3.20. Reset in Customize."
3. **The pause belongs to the player.** That already works for `Lesson.exit`. The bug is only that exit is never called on scroll.

Cut the "from Week 7 · Keep · Reset" caption chip and the dev assertion.

**Must be true to keep it.**
- After any guided mode ends, `getSettings(v).params` is either equal to the snapshot, or the user was told it was kept.
- Add to a collection captures the user's own state after leaving a collection.

**Feasibility check.**
- `Lesson.exit(quiet)` already restores the pause and rewrites the URL.
- `buildFeed` calls `Lesson.exit(true)` and then `Collection.applyAll()`. The restore must run before `buildFeed` replaces slides, so do it in `setFilter` before rebuilding.
- `Present`'s `ownLesson` path calls `Lesson.exit(true)`, which then restores too. That is correct.
- Links: none change. A lesson link with `j` drops `lesson=` (already the case, via `syncURL`).
- The gate is unaffected.

**Verification script.**
1. Open the logistic lesson link, then press `j`. The pendulum plays, and in the console `lessonPlay === null` and `paused === false`.
2. Press `k`. Logistic is at your own r (3.83) with no lesson card.
3. Open the collection link (logistic r = 3.20), then tap the All chip. In Customize, logistic shows r = 3.83.
4. Lesson link → Exit lesson. The toast says the stop's r was kept, and Customize shows 3.20.
5. Present across the lesson, then Esc. `paused` and params are back to their pre-Present values.
