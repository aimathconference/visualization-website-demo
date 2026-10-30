# 207 · Fix: a trust pass (invented numbers, one cast in every role, a math error, dead ends)

## Pitch
Apply tonight's honesty rule ("mark seeded rows *sample*; show no invented activity") to everything it missed, and make every outgoing button land somewhere real.

## Why mathematicians would care
One wrong formula, one impossible number or one 404 can lose a mathematical reader. Each fix is cheap.

## What exists today (found in the walkthrough)
1. **Unlabelled invented likes** (12k, 16k…) on slides, cards and profiles. Wanted, meanwhile, says "there are no vote totals to show".
2. **One cast in every role.** @kmoreau.geom is an author, the reviewer of times-table, the found-by credit on times-table, the challenge proposer and the voice of the sample answers.
3. **A math error:** the ℘ challenge says the cell lands "on the *real* points" of the cubic. It covers E(ℂ); the real locus is one or two circles.
4. **The question of the week is answered on its own slide:** the pill "n = 50, wait for k = 49 … all of them are parallel".
5. **"10 best visuals for teaching calculus"** links 3 pieces, promises Lagrange multipliers, and cites "seven in the review queue". The blog list isn't in date order.
6. **Dead ends:**
   - `github.com/loci-viz`, `/registry` and `/times-table` all return 404.
   - docs are served as raw Markdown with mojibake.
   - Submit says the remix "is live in the New lane", and it isn't.
7. **"◆ Teaching"** (an award) reads as a tag.

## Design (smallest real version)
1. Drop like counts from captions, cards and profiles, and keep "You liked this".
2. Give each seeded role a distinct, clearly fictional handle, or "The Loci editors (sample)". Add a catalog lint: no handle holds two roles on one piece.
3. Change the ℘ text to "the complex points E(ℂ); the real points are the one or two circles…".
4. Pin a question none of the presets answer, and add a check that the reveal state differs from every preset.
5. Retitle the post "Three visuals for teaching calculus (and seven we want)" and sort posts by date.
6. Until `loci-viz` exists, every GitHub button opens a dialog with the prefilled text, Copy, and "The repositories aren't public yet; email this to the editors." Render docs as HTML pages with `charset=utf-8` (marked is already loaded). Change Submit's message to "In a live site this would appear in the New lane."
7. Show the mark as "◆ Oct 2026 · Best teaching piece".

## Risks
- The feed looks less "alive" without counts. For this audience, fake liveliness is the bigger risk.

## Effort
S (about 1 day): data, copy and two small lints.

## How to verify
1. No DOM text matches `/\d+(\.\d)?k\b/` unless it is labelled sample.
2. The catalog lint passes.
3. No `a[href*="github.com/loci-viz"]` remains outside the dialog. Docs are served as `text/html; charset=utf-8`.
4. A second mathematician signs off on the Wanted texts and the citations.
