# 17 · Reviewer credit: named reviews, errata found, and a reviewer page (not a leaderboard)

## Pitch
Show who reviewed each piece ("Mathematics checked by @a and @b, Oct 2026"), give every reviewer a section on their profile listing what they reviewed and which marked facts were fixed because of them, and thank reviewers by name in each monthly roundup. Two-reviewer human review is the product's main promise and its scaling bottleneck (PLAN.md estimates 160,000 reviewer-hours at tier 3), so credit for that work is the incentive that matters most.

## Why mathematicians would care
- **Refereeing is invisible labour** in academia; mathematicians know it and resent it. A public, specific record ("reviewed 14 pieces; 6 errata fixed, including a missing multiplicity hypothesis in the group law") is something a reviewer can point to, and that a department can count as service.
- **Readers** trust "checked by @kmoreau.geom (arithmetic geometry)" more than "Community reviewed", and can follow a reviewer whose taste they share.
- **Authors** see that the reviewer of their piece is a real person in their field, which makes a marked fact a conversation rather than a rejection.

## What exists today in the prototype that it builds on
- `laneBadge` ("Community reviewed · Oct 2026") in `slideHTML`, and the review form in docs/review-pipeline.md section 4 (marked facts with lines, one suggestion), plus "Reviewers never see each other's answers".
- PLAN.md data model: `reviews(id, viz_id, version_id, reviewer_id, verdict, pr_url)` already records who approved each version; this idea is the UI for that table.
- `renderUser`, `USERS`, `userLink`, `pfp` in `users.js`; the Explanation tab footer in `renderDrawer` ("The mathematics was checked by two Loci community reviewers.").
- Monthly roundup posts (`POSTS`).

## Design
**Data (prototype, `catalog.js`):** per piece `reviews:[{by:'@kmoreau.geom', at:'2026-10-12', marked:1, fixed:1, note:'asked for the b slider'}]`; the October roundup already says "The author added the b slider after a reviewer asked to see the curve split", which becomes a credited fact.

**On the piece:** the Explanation footer names the reviewers with profile links and dates; the caption badge's accessible name includes them; a reviewer who marked a fact that was fixed gets "found 1 erratum" in that footer. Reviewers may opt to be listed as "an anonymous reviewer" (some will want that, as in journals); the count still accrues privately.

**On the profile:** a "Reviews" section in `renderUser`, beside Visualizations and Writing: count, areas (tags of reviewed pieces), a list of reviewed pieces with date and "erratum fixed" marks, and the one-line suggestions the author accepted (opt-in by both).

**In the roundup:** a "Thanks to this month's reviewers" paragraph listing names and counts, alphabetically.

**Deliberately absent:** no ranking of reviewers by count, no "top reviewer" badge, no points. Counting reviews rewards rubber-stamping; the signal shown is *errata found and fixed*, which can only come from a careful review, and even that is not ranked.

**Eligibility rule visible:** the profile states "Reviewers have at least two Community-reviewed pieces of their own, or were invited" (review-pipeline.md section 4), so the credential is legible.

## Risks / what a skeptic would say
- **Named reviewers face pressure** from authors (retaliation, friendship). Anonymity opt-out per review, and reviewers never assigned to people they flag as conflicts.
- **"Errata found" can be gamed** by marking trivial facts. The author has to fix it and the second reviewer independently saw the same version; an editor resolves disputes. It is still a far better signal than a count.
- **Prototype data is fictional.** Yes; the point is the layout and the policy, which PLAN.md's `reviews` table can feed directly.

## Effort
**S** (half a day to a day). Touches `catalog.js` (`reviews` on reviewed pieces), `app.js` (`laneBadge` accessible name, Explanation footer in `renderDrawer`), `users.js` (`renderUser` Reviews section, `contributorsHTML` counts reviewers too), roundup post text, `docs/review-pipeline.md` section 4 (credit and anonymity).

## How to verify
1. elliptic-group-law → Explanation footer: "Mathematics checked by @… and @…, Oct 2026 · 1 erratum found and fixed", names link to profiles.
2. Open a reviewer's profile: a Reviews section listing the pieces, areas from their tags, and the erratum note.
3. Browse → Contributors: reviewers who have no pieces of their own still appear.
4. The October roundup ends with the reviewer thanks paragraph; there is no ranking anywhere.

## Review
**Verdict:** build smaller. Naming reviewers on the piece is cheap and raises reader trust. The profile "Reviews" section and the errata counts depend on a reviewer population and review depth that do not exist, so they mostly add fictional data.

**Strongest objection:** "review-pipeline.md section 4 calls this 'a ten-minute pass over a structured form, not a referee report'. No department counts a ten-minute form as service, and pretending otherwise cheapens real refereeing. Publicly naming a reviewer of a ten-minute check also attaches my name to mathematics I did not referee."

**What to cut:**
- The errata count, "found 1 erratum" and accepted suggestions on profiles.
- The roundup thanks paragraph (keep it as plain prose in the October post if wanted).
- Anonymity plumbing beyond a single `anon:true` flag.

Ship: `reviews:[{by, at}]` on Feed-lane pieces. The Explanation footer becomes "Mathematics checked by @a and @b, Oct 2026", with links, replacing the generic sentence at app.js:695. Add a minimal "Reviewed" list on profiles. Keep the policy text (eligibility, anonymity) in review-pipeline.md.

**Must be true to keep it:**
- The owner settles **who reviewers are**. The prototype docs say "community members with at least two Community-reviewed pieces of their own, or an invited editor" (review-pipeline.md section 4). PLAN.md and Wishlist.md on origin/main say reviewers are **moderators and admins**, drawn from `reviewers.yml`. If reviewers are staff, "credit as the incentive that scales review" is the wrong argument: staff are not recruited by profile badges.
- Fixture reviewers must be plausible under whichever rule is chosen. Today no author has two pieces (13 authors, 13 pieces), so under the docs' rule every reviewer must be an "invited editor".

**Feasibility check:**
- Verified to exist: `laneBadge`, `slideHTML`, `renderDrawer` and its footer string, `renderUser`, `USERS`, `userLink`, `pfp`, `contributorsHTML`, `POSTS`. The October roundup sentence "The author added the *b* slider after a reviewer asked…" is at catalog.js:1467.
- `contributorsHTML` builds handles only from `VIZ` authors and post authors. Reviewers without pieces must be added to that set. `userOf` generates a placeholder profile (pic, generic bio) for an unknown handle, so they render without `USERS` entries but read as fake. That is a small change, but it means inventing 4–6 more fictional people.
- `renderUser`'s pstats line ("N visualizations · likes · Joined") assumes an author. A reviewer-only profile reads "0 visualizations", so it needs a variant.
- 4 of 13 pieces have `lane:'new'` and must show no reviewers, even though they carry `reviewed:'Oct 2026'`. That field's meaning is ambiguous and should be renamed or ignored.
- PLAN's `reviews(viz_id, version_id, reviewer_id, verdict, pr_url)` table supports the cut version directly. On GitHub, approvals are public on the PR anyway, so anonymity is only cosmetic unless reviews move off GitHub. Flag this.
- The estimate of half a day is honest for the cut version.

**Verification script:**
1. elliptic-group-law → Explanation: the footer reads "Mathematics checked by @x and @y, Oct 2026", and both names open profiles.
2. galton-board (New lane) → Explanation: the footer still says "Checked by machine…", with no reviewer names.
3. Open @x: a "Reviewed" section lists the pieces. The stats line does not say "0 visualizations" as the headline.
4. Browse → Contributors: @x appears, with a count that is not labelled as visualizations.
5. Search the page and the docs for "top reviewer", rank or points: none.
