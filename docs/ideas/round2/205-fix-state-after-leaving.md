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
