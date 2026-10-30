# 206 · Fix: a lesson link survives embedding, presenting and recording

## Pitch
Wherever a link leaves Loci (an embed, Present's QR code, a GIF watermark, "Open in Loci"), it carries what the viewer was looking at: the lesson or list, not just the current stop. Where it can't, the UI says so instead of dropping it silently.

## Why mathematicians would care
Embedding on a course page and presenting in a lecture are how a professor *publishes* a lesson, and today both lose it:
- `?embed=1&lesson=…` shows the default piece (r = 3.83), with no stops and no warning (`a3`).
- The embed's "Open in Loci" links to one state.
- Present's QR code encodes only the current stop (`a8`).
- The GIF watermark is an 80-character base64 URL nobody can type from a slide (`a2`).

## What exists today
- `bootEmbed(readLink())` ignores `link.lesson`.
- `presentQR` encodes `shareURL(v)`, and `QR.encode` already reports "too long".
- `paintClipStrip` shrinks the link and falls back to the bare `?v=` link.
- The embed shows two Play buttons (`a4`).

## Design (smallest real version)
1. **The embed plays lists.** The bottom bar gets ‹ 2 / 3 ›, the note shows in a strip under the box (203), the still is stop 1, and "Open in Loci" keeps the whole query minus `embed`. Drop the centre Play button. The snippet suggests `height="560"` for lists.
2. **The QR code is the list.** It encodes the playing list from the current item (`&at=2`). Past QR capacity (about 1.2 KB), it encodes the moment instead and says under the code: "This code is stop 2 only; the lesson is too long for a QR code."
3. **A typeable watermark.** Until there is a short-link service, print values, not base64: `loci/logistic-bifurcation · r = 4.00 · t = 88.5`. The full URL goes in the zip's README and on the Share sheet.
4. **A self-test.** Dev-only `?selftest=links` round-trips lesson → embed URL → parse and list → QR → `QR` decode → parse, and logs the results.

## Risks
- A 480 px embed with a bar and a note strip leaves about 380 px for the box. Acceptable, and the snippet can suggest a taller frame.
- The real fix for QR codes and watermarks is a short-link server (PLAN.md). This is the honest bridge.

## Effort
S–M (1 day). The embed reuses 201's player.

## How to verify
1. A 480×480 embed of the 3-stop lesson shows "1 / 3", r = 3.20 and the note under the box. › goes to r = 4.00, and Open in Loci lands on the same stop of the lesson.
2. Present → Q: decode a screenshot with zbarimg, and the URL contains the list and `at=`.
3. A GIF at r = 4 shows a legible `loci/… · r = 4.00 · t = 88.5` at 592 px.
4. `?selftest=links` passes.

## Review

**Verdict: build smaller.** Stop the silent drops first. A full lesson player inside the embed is a second project.

**Reproduced** (`review-scripts/r2.mjs`): `?v=logistic-bifurcation&lesson=…&embed=1` renders at r = 3.83 (default) with no stops. The embed's Open link is `?v=logistic-bifurcation&p=…` with no lesson, and it has **2** Play buttons.

**Two factual corrections to the proposal.**
- **QR capacity is 666 bytes, not about 1.2 KB.** qr.js does versions 1–20 at level M (`QR.maxBytes()` returns 666). My 3-stop lesson with short notes is 376 characters at `localhost:8765`. With a real origin and the allowed 140-character notes (base64 grows them by 4/3), a 3-stop lesson exceeds the cap. So "QR code = the whole lesson" is the exception, not the rule.
- **The embed can't "reuse 201's player".** `bootEmbed` renders into its own `#embed` root with its own host and no `slides`. `Lesson.apply` and `lessonCard` iterate `slides`, so neither reaches the embed.

**Strongest objection.** It promises three transports (embed, QR, watermark) for a format that doesn't fit two of them. Without a short-link service, the honest bridge is to say what was dropped and link to the full thing.

**What to cut.**
1. **Embed.**
   - When `link.lesson` is set, render stop 1's state (not the default) and show "Stop 1 of 3 · the full lesson opens in Loci ↗".
   - Open in Loci keeps `&lesson=` (the whole query minus `embed`).
   - `?collection=…&embed=1` currently falls into "This embed does not name a Loci piece". Make it say "Collections can't be embedded yet" with an Open link.
   - Remove the duplicate Play button.
   - No ‹ › inside embeds this round.
2. **QR.** Try the lesson link starting at the current stop.
   - If it is too long, try the same link **without notes**: stops cost about 60 bytes each, so 8 stops fit.
   - Only then fall back to the single moment, and say which you used under the code.
3. **Watermark.** Use the existing preview stubs as the short link: `<origin>/v/logistic-bifurcation · r = 4.00 · t = 88.5`.
   - `v/<id>.html` exists (`scripts/gen-share-pages.mjs`) and redirects to `?v=<id>`, keeping the query, so the typed text actually leads somewhere. The extensionless path needs the host to serve `.html` without its extension. GitHub Pages does; the local Python server doesn't (`/v/logistic-bifurcation` gives 404, `/v/logistic-bifurcation.html` gives 200). So either deploy that way or print the `.html` form.
   - Without the origin, `loci/…` is not a URL anyone can type.
4. Cut `?selftest=links`. Put the round-trip in the verification script instead.

**Must be true to keep it.**
- No path from a lesson link silently yields the default state.
- Every QR code decodes to a URL that opens, and its caption says what it contains.

**Feasibility check.**
- `bootEmbed(readLink())`: `readLink` already returns `lesson`, so stop 1 is `Lesson.stop` of `link.lesson.stops[0]`, applied to `settings[v.id]` before the still.
- `presentQR` uses `shareURL(P.sl.v)`; build the lesson variant with `Lesson.url` plus `&at=`.
- `&at=` is a **new** query key. `readLink` must accept and clamp it, and old links without it start at stop 1.
- `paintClipStrip` takes `link` and `bare` already.
- The gate is unaffected. Old links keep working, and `&at=` only adds.

**Verification script.**
1. Open `?v=logistic-bifurcation&lesson=<a1 link>&embed=1`. The still shows r = 3.20, with "Stop 1 of 3", and exactly one Play button.
2. Click Open in Loci. The new tab plays the lesson at stop 1.
3. Present the lesson → → (stop 2) → Q. Decode the code with `zbarimg`: it is a `&lesson=…&at=2` URL, or a stated fallback.
4. Record a GIF at stop 2. The strip reads `localhost:8765/v/logistic-bifurcation · r = 4.00 · t = …`, and typing that host/path opens the piece.
