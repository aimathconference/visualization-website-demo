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

## Review

**Verdict: build, but split it.** The math error, the self-answering question, the like counts, the false Submit claim and the docs rendering are fixes for today. Renaming the cast and adding lints are owner decisions; don't build them blind.

**Checked:**
- **℘ error: real.** `bounties.js` line 13 says "land on the real points of y² = 4x³ − g₂x − g₃". The image of ℂ/Λ under z ↦ (℘(z), ℘′(z)), with 0 sent to the point at infinity, is the complex projective curve E(ℂ). The real points are one or two circles, the image of the real (and half-period-shifted) lines. This is the flagship challenge, so fix it first.
- **Question giveaway: real.** The times-table preset (catalog.js) is "n = 50, wait for k = 49", with the note "every chord joins a point to its mirror image and all of them are parallel". It sits next to a question asking "for which n and k" every chord is parallel.
- **Like counts: real and unlabelled** (the phone screenshot shows 9.5k beside the heart). For you also uses them (`sig` mixing in app.js around line 225).
- **Submit's "is live in the New lane": real.**
- **Repository 404: real.** `curl github.com/loci-viz/times-table` gives 404.
- **Docs content type.** `/docs/submitting.md` is served as `text/markdown` with no charset. That comes from Python's SimpleHTTP; a deployed host may differ. The page still links raw Markdown, which is the real problem.
- **"10 best" post: overstated by the walkthrough.** The post lists ten items, marks three "*In the catalog*" and seven "*In review*", and says so in its first paragraph. The title oversells, but the post doesn't lie. The out-of-date-order blog list is real (Oct 28, Oct 14, Sep 30, Oct 29).

**Strongest objection.** "Give each seeded role a distinct fictional handle" fixes a fiction with more fiction, and a lint ("no handle holds two roles") encodes a rule real communities break all the time: reviewers are authors. The honest fix is one visible statement that the people are sample data. The `sample` label already exists on distinctions; apply it to people, not new names. Likewise, a "repositories aren't public yet" dialog on every GitHub button adds UI. The owner can create the `loci-viz` org and push the 13 module repos in an hour, which turns every 404 into the feature. Ask the owner before building the dialog.

**What to cut.**
- **Keep:**
  - the ℘ text (with a second mathematician's sign-off)
  - move the n = 50/k = 49 preset off times-table, or pin a different question; keep `foundBy` on another preset so the 18 demo survives
  - remove the like counts (keep "You liked this") and drop `likes` from For you scoring
  - Submit copy: "In a live site this would appear in the New lane"
  - render `docs/*.md` through the existing `md()` and `LociTeX.typeset` in a page view instead of linking the raw file
  - sort the blog by date
- **Owner decision:** create the repos, or add the dialog.
- **Cut:** the catalog lint, renaming handles, "reveal differs from every preset" as a check. That last is editorial site data (questions.js), not a module property, so it does not belong in the checks.js gate. Make it a console assertion at load if wanted.
- Optional: retitle the post "Ten visuals for teaching calculus (three are here)".

**Must be true to keep it.**
- A mathematician reading the Wanted page, the question of the week and one profile finds no false statement and no unlabelled invented number.

**Feasibility check.**
- Data and copy only (`bounties.js`, `catalog.js` presets and blog, `questions.js`, the Submit message). The likes appear in `likeLabel` and in the Browse card (`fmtK(v.likes)`).
- Rendering the docs reuses `md`, which already handles fenced code and TeX via tex.js.
- Moving a preset doesn't break share links, which carry params rather than preset indices. `#preset:<label>` links in explanations resolve by label, though, so grep them before renaming. None reference the n = 50 preset today.
- The gate is unaffected.

**Verification script.**
1. Open Wanted → the ℘ challenge. It says the complex points E(ℂ).
2. Times-table → Explain. Neither the question panel nor the pills show n = 50/k = 49.
3. On the feed, Browse and a profile, no `\d+(\.\d)?k` like count is visible.
4. Browse → Read the submission guide. It renders as HTML, and "i → k·i mod n" shows no mojibake.
5. Submit a remix. The message no longer claims it is live.
