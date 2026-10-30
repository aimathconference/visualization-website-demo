# Round two: reviews (Oct 30, 2026)

The reviewer worked read-only on `overnight-ideas`. Evidence comes from my own headless Chromium on port 9411 and is in `review-scripts/`:
- `r1.mjs`: lesson leak, QR capacity
- `r2.mjs`: collection leak, embed, docs content type
- `r3.mjs`: phone drawer and callout geometry, with the screenshots `phone-lesson.png` and `phone-showme.png`

Each proposal file now ends with a `## Review` section.

Note: **06 compare-two-params landed during this review** (ab66a2d). It adds a `&b=` link key and a fourth "mode that owns the slide". Its `onActiveChange` rule ("leaving the slide ends the comparison") is the precedent 205 should copy. None of 201–210 account for `&b=`, so lists and embeds should state that they don't carry it.

## One-line verdicts

| # | Verdict | One line |
|---|---|---|
| 201 one-moment-list | **build smaller** | Lists allow adjacent runs of one piece, played by the lesson player. Keep `?lesson=` and `?collection=` (no `?m=`), and don't cut the 30-item cap to 12. Repeats need per-slide state, so this goes after 205. |
| 202 yours-page | **build smaller** | One handle everywhere (a fix) plus a read-only "Yours" list. Park export/import, which brings crafted-data risk for no sharing value. |
| 203 callouts-off-the-picture | **build (split)** | Phase 1 is the phone peek and touch copy. Phase 2 is a note slot that is fixed for the whole guided mode. Don't resize the box per callout: it can switch targets via `minBox`. |
| 204 one-share-sheet | **build smaller** | Snippets move into Share; the link knows about a playing lesson; no poster worker per Customize render. No tabs, and Ask stays in the Explanation. |
| 205 fix-state-after-leaving | **build first** | Exit the lesson on scroll (copying compare's rule), and snapshot and restore params for lessons and collections. Not the 23-call-site `paramsFor` overlay. |
| 206 fix-links-survive-… | **build smaller** | No silent drops: the embed shows stop 1, Open keeps `&lesson=`, and the duplicate Play goes. The QR cap is 666 B, not 1.2 KB, so add a notes-stripped fallback. The watermark uses the existing `v/<id>.html` stubs. |
| 207 fix-trust-pass | **build (split)** | Fix ℘, the self-answering question, unlabelled likes, the Submit claim, raw docs and blog order now. The owner decides on the GitHub org and on whether to rename the cast; mark people as *sample* instead. |
| 208 beamer-and-handout | **build smaller, after 205/201** | Stills-only Beamer zip with TikZ QR codes and a named engine (Unicode notes break pdflatex). No animate, no handout, no sha256 "version". The best bet for sharing. |
| 209 class-gallery | **park** | Right idea, but `renderThumb` can't draw an arbitrary state (it uses the viewer's settings). Pilot on paper with one instructor first. |
| 210 remix-whole-package | **build smaller** | Raw `loci.json` (param keys locked) and `explanation.md` tabs, a "presets/explanation unchanged" warning instead of pixel diff, and Make this with a bounty-exists check passed in through the gate's context. |

## The walkthrough's top five

| # | Finding | Real? | Covered by |
|---|---|---|---|
| 1 | On a phone, live controls change a picture you can't see, and callouts cover the picture | **Real, reproduced.** Elliptic → Explain → Show me: drawer top at 146 px, **8.7 %** of the drawing box visible, callout behind the drawer. The phone lesson card is 118 px, **100 %** inside the box, on the cobweb (`phone-lesson.png`). | 203 |
| 2 | Three players; state leaks; QR and embed drop the lesson; Present ignores collection notes | **Real, reproduced.** After `goTo(next)` from a lesson, `lessonPlay` is still set, `paused` is true, and the URL is already `?v=double-pendulum`. Collection (r = 3.20) → All leaves logistic at 320 (default 383) with no mark. `?embed=1&lesson=` renders r = 3.83 with no stops, an Open link without the lesson, and 2 Play buttons. Present ignoring collection notes is confirmed in code (`presentSteps` knows only `lesson`/`presets`). | 205 (leaks), 206 (embed/QR), 201 (Present and one player) |
| 3 | Moments captured in five places, three identities, no list of what you made | Real (code: `Lesson.capture`, `Collection.capture`, the preset proposal with `loci:handle`, the question answer, Ask), but **lower severity** for the owner's test. It hurts the maker, not the person a link is shared with. | 202 (handle, list), 201 (fewer formats) |
| 4 | Outward actions 404; the contributor path can't reach a bounty or change title, preset or explanation | **Real.** `github.com/loci-viz/times-table` returns 404. The docs are linked as raw `.md` and served as `text/markdown` without a charset. That part is the Python dev server, but linking raw Markdown is the app's choice. | 207 (dead ends), 210 (remix package) |
| 5 | Trust leaks | **Mostly real.** ℘ "real points" is wrong (it is E(ℂ)). The question's answer is the n = 50/k = 49 preset on the same slide. "9.5k" likes are unlabelled. The blog is out of date order. **Overstated:** the "10 best" post openly marks 3 items "In the catalog" and 7 "In review"; only the title oversells. | 207 |

Walkthrough items **not covered by any proposal**:
- the clip size estimate is 23× high (`clipPlan` `P.bytes`)
- the clip copy says "the slide keeps playing" during a paused lesson
- `favicon.ico` 404s
- times-table's published source uses the legacy P wrapper the guide tells authors not to use (the first source a would-be author reads)
- lesson, collection, question and Wanted text isn't typeset (this also matters for 208's escaping)
- the process issues: merging in the served tree blanked the site for about two minutes, and clearing `localStorage` on the shared origin wiped other agents' state. Serve from a worktree.

## Fixes that should land before any new feature

1. **205:** the lesson exits on scroll; params are snapshotted and restored for lessons and collections.
2. **207, the "now" half:** ℘ text; move the giveaway preset or change the question; remove or label the like counts; the Submit copy; render the docs as HTML; blog order.
3. **206, the "no silent drop" half:** the embed honours `&lesson=` at stop 1, the Open link keeps it, `?collection=&embed=1` says it isn't supported, and the duplicate Play button goes.
4. **203 phase 1:** the phone drawer peeks for every drawer action that changes the picture, plus touch copy.
5. Small fixes: the clip estimate, the favicon, the clip copy during a lesson, the poster worker per Customize render (204's one real bug).

## Build order

1. 205 → 207 (now) → 206 (no silent drop) → 203 phase 1. About 2.5 days. After this, nothing on the site misleads a visitor.
2. 201 smaller (adjacent runs, one player, Present steps lists). It relies on 205's snapshot.
3. 203 phase 2 (the note slot) and 204 smaller (Share knows the lesson; snippets in Share).
4. 208 smaller (Beamer stills zip). Show it to two mathematicians before going further.
5. 210 smaller, then 202 smaller.
6. 209 stays parked until a paper pilot with one instructor says yes.

The owner's test is would mathematicians use this and share it? Steps 1–2 decide whether shared links behave. Step 4 is the one new thing a mathematician would forward. Everything else is maintenance of the maker's experience.
