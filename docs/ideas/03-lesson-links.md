# 03 · Lesson links: "explain this to my students"

## Pitch
Let anyone turn a piece into a short guided sequence of stops (parameter values, a moment *t*, and one sentence each) and share it as a single link that plays the stops in order with the existing callouts. It is the share link, extended from one state to a few states with words, which is what a teacher actually sends.

## Why mathematicians would care
- **An instructor** sends one link to a class or posts it in the LMS: "Stop 1: n = 30, it's just chords. Stop 2: n = 200, a curve appears. Stop 3: n = 101 at k = 51, why did the cardioid come back? Answer in section." Today they would have to send three share links and write the text elsewhere.
- **A researcher** sends a collaborator "look at these three parameter values" with the observation attached, reproducible exactly because modules are pure functions of `(t, params, theme, box, seed)`.
- **The author** learns how their piece is used (lesson links are a stronger signal than likes), and the best stops can be promoted into presets (see 18-found-by-presets).

## What exists today in the prototype that it builds on
- `stateOf`, `shareURL`, `readLink`, `b64u` in `app.js`: one serialized state per link, validated through `normalizeParams` and the theme checks. A stop is exactly a `stateOf` object.
- `applyPreset`, `showCallout`, `hideCallout`: a preset is already "params + optional t + a note", shown as a callout over the stage. A stop is a preset written by the viewer.
- `seekViz`, `pushParams`, keyboard handler (`,` `.` `[` `]`): stepping through stops reuses these.
- The Share dialog (`openShare`, `#sharemodal`).

## Design
**Data:** a lesson is `{v, title?, stops:[{p, t, note}], theme?}`; `p` holds only non-default params (as in `stateOf`). Encoded as `?v=<id>&L=<base64url json>`; at most 8 stops, notes ≤ 200 characters (a lesson link stays under ~2 KB, safe for every LMS and chat client).

**Authoring (in Customize):** a "Lesson" field at the bottom of `renderCustomize`: **Add this moment as a stop** captures the current params and `timeOf(v)`, with a one-line note input; stops are listed, reorderable with up/down buttons, deletable; a title field. The draft is in `localStorage` under `loci:lesson:<id>`. **Copy lesson link** puts the URL on the clipboard (and the share dialog gets a "Copy as lesson" button when a draft exists).

**Playing:** `readLink` recognises `L`; the slide shows a small stepper bar over the stage ("Stop 2 of 4 · ‹ ›"), each step calls the `applyPreset` path (params via `normalizeParams`, `seekViz` to `t`, pause, `showCallout` with the note, kept open rather than timing out). Keys: `←`/`→` while a lesson is active (the feed's `j`/`k` still move slides). The stop's note is also announced through `announce` for screen readers. "Exit lesson" returns to the free piece.

**What persists where:** the lesson lives entirely in the URL (nothing server-side needed, so it works in the static prototype and survives as a format into production); drafts in localStorage.

## Risks / what a skeptic would say
- **"That's just presets."** Presets are the author's; lessons are the viewer's and are about *their* students. The overlap is intentional: same code path, different owner.
- **Links rot when a module changes.** module-api.md section 5 already handles it: params are validated against the version named, unknown keys dropped. Production links should carry the hash `h`.
- **Notes are unmoderated text in a URL.** They are only shown to whoever opens that link, and escaped (`esc`); no worse than a chat message.
- **Pausing at each stop fights the feed's motion.** That is right for teaching; "play from here" is one key (`p`).

## Effort
**S–M** (1 day). Touches `app.js` (`readLink`, a `lesson` state, stepper overlay next to `showT`/`showCallout`, Customize field, share dialog button, keyboard), `index.html` (one button in `#sharemodal`), `styles.css`, `docs/module-api.md` section 5 (the `L` form).

## How to verify
1. Open times-table → Customize: set n = 30, Add stop "just chords"; n = 200, seek to t = 20, Add stop; apply the "wait for k = 51" preset, Add stop "why did it come back?". Copy lesson link.
2. Paste the link into a private window: the piece opens at stop 1 paused, with the note; `→` goes to stop 2 with params and *t* exact; at stop 3 the cardioid is back.
3. Tamper with the `L` payload (n = 9999): it snaps to 400, nothing breaks.
4. Screen reader / live region: each stop's note is announced.

## Review

**Verdict:** build. It is the smallest idea here that creates a new thing a teacher or collaborator would actually paste into a message, and it needs no server.

**Strongest objection:** "Two of the three example stops in the pitch (n = 30, and n = 101 at k = 51) are already author presets on times-table. A teacher can just say 'click the second pill'. You are building a second, viewer-owned preset system with a reorderable list UI to save typing one sentence in an email."

**What to cut:**
- Cut up/down reordering (delete and re-add is enough for at most 8 stops).
- Cut the title field, or make it optional with no UI beyond one input.
- Cut the share-dialog "Copy as lesson" button. Customize's **Copy lesson link** is the only entry point.
- Keep the stepper, the persistent callout, `←`/`→`, the announcements and Exit.
- Add `view` to each stop. `stateOf` already serializes the module camera or selection (§5), and without it a stop on hopf-fibers, elliptic-group-law (dragged points) or any orbit/pan piece is not the moment the teacher saw.
- Design the payload so 04 can reuse it: `{title?, stops:[{v?, p, t, view, note}]}`, with `v` per stop optional and defaulting to the link's `v`.

**Must be true to keep it:**
- A stop reproduces the frame exactly: same params, `t` and view. Check it by comparing a captured frame at the stop with a direct share link of the same state.
- The link opens correctly in a fresh profile with no localStorage.
- Lesson playback does not leak into the feed after Exit: callouts go away, and the arrow keys stop stepping.

**Feasibility check:**
- Every cited name exists: `stateOf`, `shareURL`, `readLink`, `b64u`, `normalizeParams`, `applyPreset`, `showCallout`, `hideCallout`, `seekViz`, `pushParams`, `renderCustomize`, `timeOf`, `announce`, `esc`, `openShare`, `#sharemodal`.
- `showCallout` hard-codes a 6 s `setTimeout`, so it needs a "keep open" option.
- `readLink` runs once, at boot (app.js around line 1255). The `L` branch belongs there, and must set `sl.t` and `sl.view` before `mountPolicy` mounts the slide.
- `←`/`→` are unused by the feed keydown handler, but an engaged piece receives them first. That is fine, just note it.
- `p` toggles the global `paused`, so pausing at a stop pauses the whole feed. That is acceptable.
- The size claim is low. At 8 × 200 characters, notes with math symbols (≡, π, ², ·; 2–3 bytes each in UTF-8) push base64 to about 4–6 KB, not 2 KB. Either cap notes at 140 characters or state ~6 KB.
- The tamper case is real: times-table `n` is a range of 20–400, so 9999 snaps to 400.
- Effort: S–M (1 day) is honest without reordering.

**Verification script:**
1. times-table → Customize: set n = 30 and add a stop "just chords". Set n = 200, press `]` ×20 and add a stop. Click the "n = 101, wait for k = 51" pill and add a stop. Copy the lesson link.
2. Open the link in a private window: stop 1 is paused at n = 30 and the note stays up past 6 s. Press `→`: stop 2 at t = 20.00. `→`: stop 3 at t = 271 with the cardioid visible.
3. elliptic-group-law: drag a point, add a stop, copy, reopen. The point is where you left it.
4. Edit the `L` payload to n = 9999: it opens at 400 without errors in the console.
5. Exit the lesson: the callout is gone, `→` does nothing, and `j`/`k` scroll the feed.
6. With a screen reader or the `#announcer` live region: each step announces "Stop k of N" and the note.
