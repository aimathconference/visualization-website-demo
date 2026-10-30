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
