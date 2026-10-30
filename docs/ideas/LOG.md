# Overnight log (Oct 30, 2026)

Branch `overnight-ideas`, cut from `loci-prototype` (pushed to origin). One commit per idea; see PROCESS.md.

| Idea | Verdict | Commit | Note |
|---|---|---|---|
| 03 lesson-links | build | 84c620f | Stop format `{p,t,view,note}` in `Lesson.*` (app.js); authoring in Customize; playback with cards and arrow keys. Reordering cut. |
| 02 monthly-distinctions | build smaller | e69ce1f | Three sample October citations in distinctions.js, caption mark, Explanation block, roundup rewritten; no jury UI. Citations duplicated in the post text. |
| 04 collections | build smaller | 8d326b1 | Items `{v,p,t,view,note}` via the playlist filter; state applied at build time; panel from Save toast and Customize; neighbours hold their moment. |
| 08 katex-explanations | build | f5bf8ca | Shared tex.js tokenizer for `md()` and the check; KaTeX 0.16.21 lazy on the page; three explanations converted; "No LaTeX" rule reversed in submitting.md. |
| 01 bounty-list | build smaller | 99e34d8 | Wanted page (bounties.js) with six sample challenges, 3-vote cap, local proposals + prefilled GitHub issue; `bounty` manifest field; docs/bounties.md. Sample references need checking. |
| 15 check-this-remix | build smaller | 087e849 | Check this remix runs the gate on a remix package (new id, remixOf); drafts persist; FIXES duplicate check (same-id no longer skipped) and WASM samplePackage. times-table gained a Reference line (Mathologer 2015) to confirm. |
| 07 clip-recorder | build smaller | 0f154cb | GIF (and PNG-frames zip) rendered offscreen by seek+capture, no-dependency gif.js; new `played-vs-seeked` check catches dt-driven modules. WebM cut. |
| 14 embed-mode | build smaller | 46d6f65 | `?embed=1` renders one piece with a click-to-play still and a bottom bar, postMessage ready/size; static-image snippet in Customize; site OG tags + og/default.png; `scripts/gen-share-pages.mjs` writes v/<id>.html stubs. Share-card composer and QR cut. |
| 09 live-explanations | build smaller | 08b5c4f | `#preset:` `#t:` `#state:` `#param:` links parsed by one `liveLink` in manifest.js for page and gate; Why-it-works step-through; logistic and fourier converted. Drag-to-scrub cut. |
| 10 prerequisite-links | build smaller | c0b4e9f | `after` manifest field (≤3), Before/Next cards in Explanation, `related` static check; seeded logistic → julia → mandelbrot. Browse map cut. |
| 18 found-by-presets | build smaller | 01f3178 | `foundBy` on presets with profile credit and a Found section; "Propose this moment" → prefilled issue + local list; seeded times-table n=50, k=49 (all chords parallel) by @kmoreau.geom. |
| 17 reviewer-credit | build smaller | 8367d91 | `reviewers` on Feed-lane pieces, "Mathematics checked by" footer, Reviews section on profiles; no counts or leaderboard; who reviewers are left for the owners to decide. |
| 16 question-of-the-week | build smaller | ce08493 | One pinned question on times-table (questions.js), "Answer with this moment" kept locally + prefilled issue, reveal behind a button. Weekly cadence cut. |
| 11 questions-on-a-moment | build smaller | 2ee1faa | Read-only sample Q&A anchored to states with Show me (elliptic, riemann), Ask box → prefilled issue, draft kept locally. No thread. Seek-while-playing race noted (also affects applyPreset). |
| 12 follow-authors-and-tags | park | — | Reviewer: at 13 pieces Following is the whole feed and follower counts would be invented; revisit at hundreds of pieces. |
| 13 atom-feeds | park | — | Reviewer: needs real per-piece dates, a public origin and posters; build with the share-page generator after deployment. |
| 05 seminar-mode | build smaller | af75209 | Present (Shift+F): full screen, stop/preset stepping, blackout, progress strip, QR corner (qr.js); fixes Shift+P and plain-f full-screen active-slide bug. Laser pointer and label scaling cut. |
| 06 compare-two-params | build smaller | ab66a2d | `x` / Customize splits the stage into A and B with a shared clock, seed, theme and view; B's params in `settingsB`; `&b=` in share links; ≥ 900 px only; neighbours unmounted to stay at 2 workers. Pointer goes to A only. |
| 205 fix-state-after-leaving | build first | see log | Leaving a lesson's slide ends it and restores pause; lessons and collections save/restore params, t, view; "modified" dot on Customize. |
| 206 fix-links-survive | build smaller | see log | Lesson embeds show stop 1 of N with stepping and `&at=`; Open in Loci keeps lesson/collection/b; one Play button; Present QR encodes the lesson (notes dropped over the QR limit); readable clip watermark. |
| 203 callouts-off-the-picture (phase 1) | build, two phases | see log | On phones the sheet peeks to 35% when a drawer action changes the picture; lesson/collection cards dock under the box; touch wording on touch screens. Phase 2 (note slot under the box) parked. |
