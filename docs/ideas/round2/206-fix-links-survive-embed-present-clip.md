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
