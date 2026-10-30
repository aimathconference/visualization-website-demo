# 208 · New: export a list as Beamer frames and a printable handout, with a citation

## Pitch
From any lesson or list (201), **Export → Beamer** downloads a zip:
- `lesson.tex`: one frame per moment, with the still (or `\animategraphics` frames), the note, and a link and QR code to that moment
- the image files
- `loci.bib`: one entry per piece, *at the version used*

**Export → Handout** opens a print view (still, note, short id line and QR code per moment) that the browser saves as PDF.

## Why mathematicians would care
Mathematicians teach and give talks from Beamer and handouts, not websites. Today a 3-stop lesson becomes slides by recording three GIFs one at a time, retyping the notes into LaTeX and pasting base64 links. A finished `.tex` file is what they keep and forward, and every copy links back. The bib entry answers the referee's question "how was this figure made, and can I reproduce it?". It works because modules are deterministic in (t, params, seed).

## What exists today
- The clip recorder, which renders offscreen by seek and capture. It already offers "PNG frames (.zip) for Beamer's animate" and has the `played-vs-seeked` check.
- `stillFor`/`LociHost.poster` for stills, `qr.js` from Present, and a zip writer.
- Lists carry `{v, p, t, view, note}`. The manifest has author, license, repo and reviewers, and `sha256` exists in checks.js.

## Design (smallest real version)
1. **Stills by default:** for each moment, a 1200×750 PNG from `stillFor`. A fixed, pdflatex-safe template: frame title "k. <piece title>", the note in a `block` (escaped; TeX in notes passes through), plus `\href` and the QR code image.
2. **Animated option:** 2 s per moment through `recordClip`'s frame loop, with `\animategraphics[loop,autoplay]{12}{s1-}{0}{23}`. 720 px by default.
3. **Citation:** `@software{loci-<id>, author, title, version = {<sha256 of module, 12 hex>}, url, note = {r = 3.20, t = 72.6 s}}`, and a `\cite` in each frame footer.
4. **Handout:** `?m=…&print=1` renders a static page with `@media print`. It needs no worker after the stills are drawn.

## Risks
- Beamer users customise everything. A minimal template that compiles as-is still saves 90 % of the work.
- An animated zip can reach about 30 MB, so stills are the default.
- A version hash promises permanence. Production must keep old modules fetchable, or the entry should say "version at export".

## Effort
M (2–3 days). The template, escaping and bib take a day; the plumbing exists; the print view takes half a day.

## How to verify
1. Export the 3-stop logistic lesson and run `pdflatex lesson.tex` on stock TeX Live: 3 frames, the notes match, and the QR codes decode with zbarimg to the moments.
2. The animated frames match the GIF recorder's frames one for one.
3. The handout prints on 1–2 A4 pages with legible stills.
4. Show it to two working mathematicians and record whether they would use it in their next talk.

## Review

**Verdict: build smaller, after 205 and 201.** A stills-only Beamer zip from a lesson is the round's best bet on "would mathematicians share it". Cut the animated frames, the version hash and the handout.

**Strongest objection.** "Compiles with `pdflatex` on stock TeX Live" is false for this content as proposed:
- **Unicode.** Notes are Unicode mathematics (√, ≡, ℂ, ℘′, −). pdflatex fails on them without a mapping. Either emit for `lualatex` with `unicode-math` (and say so in the README), or run notes through a small Unicode→TeX table and wrap them in `$…$`.
- **QR images.** `qr.js` outputs SVG (`QR.svg`), which pdflatex can't `\includegraphics`. Emit the QR as TikZ `\fill` squares from `QR.encode(...).modules`. That is pure TeX, needs no image, and is about 20 lines.
- **Version claim.** The citation's "version = sha256 of module" promises reproducibility the prototype can't honour: there are no versioned module URLs. `sha256` lives in checks.js for the gate. Write "state at export" and the share link, nothing more.

**What to cut.**
- Keep:
  - Export → Beamer (zip) from a playing lesson or list
  - one frame per stop: the still (PNG), the note, a `\href` to the stop's share link, and a TikZ QR
  - a `README.txt` naming the engine
  - one plain `@misc` bib entry per piece with author, license, URL and "state: r = 3.20, t = 72.6 s"
- Cut:
  - the `\animategraphics` option. The clip recorder already makes a PNG-frames zip for Beamer's animate; link to it from the README.
  - the print handout. Beamer's `handout` option plus `pgfpages` is the handout mathematicians already use.
  - the sha256 version field.

**Must be true to keep it.**
- The zip compiles unmodified with the documented engine on a stock TeX Live 2024+.
- The QR codes decode to the stops.
- Two working mathematicians say they'd use it for their next talk, which is the proposal's own test.

**Feasibility check.**
- `stillFor(v, t, view)` renders at a fixed `STILL = 480` and reads `getSettings(v).params`. It needs a size argument (and the size in its cache key) and per-stop params. Apply each stop with `Lesson.apply`, or better, pass params through, which depends on 205's snapshot/restore so export doesn't leave the user's settings changed.
- A zip writer exists (the PNG-frames path in app.js and gif.js).
- QR: `QR.encode(url)` returns `modules` or null. Past 666 bytes, fall back to the bare stop link (see 206).
- Links: every frame uses the existing `shareURL` / `Lesson.url` forms, so nothing new.
- The gate is unaffected.

**Verification script.**
1. Play the 3-stop logistic lesson → Share → Export → Beamer. A zip downloads.
2. `unzip && lualatex lesson.tex` (or the documented engine). Three frames; the notes match, including √8.
3. `zbarimg` on a page render of frame 2 decodes the stop-2 link, and opening it lands on r = 4.00.
4. In Customize, logistic's r is still your own value after the export.
