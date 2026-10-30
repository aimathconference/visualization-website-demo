# 05 · Seminar mode: present a collection from the keyboard

## Pitch
A presenter mode for talks and lectures: full screen, keyboard-only navigation through a collection or lesson, a laser pointer driven by the mouse, a black-out key, larger labels, and a QR code corner so the room can open the exact state on their phones. Mathematicians give talks constantly, and a live, scrubbable picture in a seminar is the most persuasive share this product can get.

## Why mathematicians would care
- **Speakers** at seminars, colloquia and lectures currently embed GIFs in Beamer because live demos are fragile. Seminar mode is a live demo that is robust: deterministic, offline-capable (the download target already exists for "a room without a network"), and driven by the same keys as a slide clicker (PageDown/PageUp, `B` for black).
- **The audience** scans the QR code and has the piece, at that parameter, on their phone, during the talk. That is the single highest-conversion share moment: 40 mathematicians in a room, each now holding a Loci link.
- **Teachers** use it in class with a lesson link (03), stepping stops with the clicker.

## What exists today in the prototype that it builds on
- `enterFull` / `exitFull` and the `immersive` body class; `boxFor(w,h,full)` (the full-screen box with 28 px padding).
- The keydown handler in `app.js` (`j/k`, PageUp/PageDown, `f`, `p`, `,` `.` `[` `]`, `0`): most presenter keys exist; seminar mode remaps a few.
- Collections (04) and lessons (03) for the sequence; `applyPreset` and `showCallout` for stops.
- `theme.labels`, `fsFor(box)`, and the host-drawn label overlay (`placeOverlays`, labels canvas) so label size can be scaled by the host without module changes (label `size` is clamped 6–96).
- `shareURL(v)` for the QR payload; the `download` target (`targetById(v.manifest,'download')`) for offline rooms.

## Design
**Entry:** a "Present" button on a collection page and in the Share dialog; key `Shift+P` in the feed; URL `?present=1` (so a speaker can bookmark the talk's collection link with `&present=1`).

**Behavior:**
- Enters full screen on the current slide, hides caption and rail (the `immersive` CSS path), shows nothing but the stage and a 4 px progress strip ("3 / 7").
- Keys: `→`/`PageDown`/`Space` next stop (or next piece when stops are exhausted), `←`/`PageUp` previous, `B` or `.` black screen (the stage is covered; the worker is paused), `W` white screen, `P` play/pause, `[`/`]` scrub ±1 s, `L` toggle labels, `+`/`-` label scale (×1–×2, applied by the host to returned labels and passed as `theme.labelScale`, ignored by modules that do not read it), `Q` toggle the QR corner, `Esc` exit. Clickers that send PageDown/PageUp/`B`/`.` work unmodified.
- **Laser pointer:** while the pointer moves over the stage, draw a red dot with a short fading trail on a separate overlay canvas (`pointer-events:none`) above the labels canvas; hidden after 1.5 s idle. Scrub-by-drag is disabled in this mode so the pointer only points; `Alt`+drag still scrubs.
- **QR corner:** a 120 px QR code of `shareURL(v)` (or the lesson link at this stop) in the bottom-right outside the box, with the short URL under it. QR encoding via a small library from cdnjs (e.g. `qrcode-generator`), loaded only in seminar mode.
- **Presenter notes:** if the stop has a note, it is *not* drawn on the stage (it would be on the projector); with a second window (`window.open('?notes=1')`, synced by `BroadcastChannel` on the page origin), the speaker sees notes and the next stop. The second window is optional; v1 can ship without it.

**Persists:** nothing new beyond the collection/lesson; the last label scale in `localStorage` (`loci:present`).

## Risks / what a skeptic would say
- **"Projectors and conference Wi-Fi."** The piece runs locally once loaded; preload every piece of the collection on entry (mount and dispose each once to warm specs and posters) and show a ✓ when all are ready. Recommend the download target for no-network rooms.
- **Workers cap at three.** Seminar mode only needs the current and next piece mounted; fine.
- **Label scaling is a host feature modules do not know about:** labels returned as data scale cleanly; `canvas2d` pieces drawing via the kit's `label(ctx, P, …)` can be scaled inside `label()`, which already receives the theme (`fsFor(box)` does not, so a module that sizes layout from `fsFor` will not reflow). Document it as best effort.
- **Black-screen key collides** with "save" (`b`) in the normal feed. Seminar mode has its own keymap and says so in the `?` dialog.

## Effort
**M** (2–3 days). Touches `app.js` (mode state, keymap, overlay canvas, QR corner, preload), `runtime.js` (`theme.labelScale` applied when drawing returned labels), `kit.js` (`label()` multiplies `o.size` by `P.labelScale`), `index.html` (keys dialog section), `styles.css`, `docs/module-api.md` (theme field).

## How to verify
1. Open a collection → Present: full screen, no chrome, "1 / 4".
2. With only the keyboard (or a USB clicker): PageDown through every stop and piece; `B` blacks out and pauses; `B` again resumes at the same *t*.
3. Move the mouse: a red dot with a trail, which fades when still; dragging does not scrub.
4. `Q`: QR code; scan it with a phone and the phone opens the same piece at the same params and *t*.
5. `+` twice: labels on `mandelbrot-zoom` (returned labels) are visibly larger and stay inside the box.

## Review

**Verdict:** build smaller, after 03. Add a blackout key, stop stepping and a QR corner to the full screen that already exists. Leave out the laser, the label scaling, the preloading and the notes window.

**Strongest objection:** "Live demos die in talks for reasons this cannot fix: the projector's resolution, a laptop on battery throttling the GPU, conference Wi-Fi. My clicker already has a laser. The feed already goes full screen with `f` and pages with PageDown, so this is a few keys dressed up as a mode."

**What to cut:**
- Cut the laser pointer overlay. Clickers have one, and pointer events over the stage already go to engaged pieces (hopf-fibers orbit, elliptic-group-law drag), so a second pointer meaning is confusing.
- Cut `theme.labelScale` and the `kit.js` `label()` change. The theme is a host-owned contract in module-api.md, and a new field is a module API change that touches the "Theme honored: labels" check. If label size matters, scale returned labels host-side in `runtime.js` `paintLabels` only, and document it later.
- Cut "preload every piece (mount and dispose once)". It fights the 3-worker cap and risks slow/stall cards at the start of a talk.
- Cut the `?notes=1` second window and `BroadcastChannel`, plus the `W` white screen.
- Keep: entry with `Shift+P` and a Present button in Share; the immersive full-screen path; PageDown/PageUp/Space through 03 stops, then pieces; `B` and `.` for blackout, which pauses; `Q` for the QR of the current state; a "3 / 7" progress strip; `Esc`.

**Must be true to keep it:**
- A USB clicker (PageDown/PageUp/`B`/`.`) drives a whole lesson or collection with no mouse.
- Blackout resumes at the same `t`.
- The QR decodes to exactly `shareURL(v)`, or to the lesson link at the current stop.

**Feasibility check:**
- These names exist: `enterFull`, `exitFull`, `immersive`, `boxFor`, `placeOverlays`, `targetById`, `shareURL`, `applyPreset`, `showCallout`. `fsFor` lives in `kit.js`, not in app.js. `theme.labelScale` does not exist.
- Most of this already works. `f` enters full screen, PageDown/`j` call `goTo`, and `goTo` re-requests full screen on the next slide.
- The keydown handler lowercases `e.key`, so `Shift+P` currently toggles pause. Test `e.shiftKey` before the `p` branch.
- `?present=1` cannot call `requestFullscreen` at load (it needs a user gesture), so it falls back to `immersive` with the toast. A bookmarked talk still needs one keypress.
- `shareURL` uses `location.origin`. In the local prototype the QR encodes `localhost:8765`, which audience phones cannot open. The proposal's verification step 4 ("scan it with a phone") only works when the site is served on a LAN IP or deployed. Verify by decoding the QR instead.
- The QR library from cdnjs is allowed: index.html already loads marked from cdnjs.
- Effort: M (2–3 days) is honest for the full design. The cut version is under a day on top of 03.

**Verification script:**
1. Open a lesson link (03) and press `Shift+P`: the page goes full screen (or immersive) with no caption or rail, and the strip reads "1 / N". The animation does not toggle.
2. Press PageDown repeatedly: it steps through every stop, then to the next piece. PageUp goes back.
3. `B`: the screen goes black and the time chip freezes. `B` again: it resumes at the same `t` (check against `]`/`[` readouts).
4. `Q`: a QR appears outside the drawing box. Decode it (a phone on a LAN-served copy, or a decoder on a screenshot): it equals the Share dialog URL for this state.
5. `Esc`: back to the normal feed, and `.` scrubs +0.1 s again.
