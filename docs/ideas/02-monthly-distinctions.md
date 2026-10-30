# 02 · Monthly distinctions (badges that are citations, not trophies)

## Pitch
Each month a rotating jury of reviewers awards a handful of named distinctions ("Clearest single idea", "Best teaching piece", "Best use of the GPU", "Best phone version") to pieces published or substantially revised that month, each with a two-sentence written citation. The badge is the citation: something an author can quote, link and put in a teaching portfolio, chosen by people who checked the mathematics rather than by likes.

## Why mathematicians would care
- **Authors** share a citation the way they share a paper acceptance: to their department, on their homepage, in a tenure or teaching dossier ("Loci distinction, Oct 2026, Best teaching piece: *…the clearest picture of inverses mod n we have seen…*"). A like count is not quotable; a sentence from named reviewers is.
- **Instructors** browsing for material get a filter that means something: "distinguished for teaching" is a better prior than "most liked", which on a feed skews to the prettiest fractal.
- **Reviewers** get a visible, rotating role with judgment in it, which is the reward most volunteers actually want.

## What exists today in the prototype that it builds on
- The **Picks** lane and "Editor's pick" badge in `docs/review-pipeline.md` section 3 (described, not yet rendered). Distinctions are the structured, monthly version of Picks.
- `POSTS[0]` (`top-october-2026`) is already a monthly roundup, but it ranks by "completed views": that is exactly the popularity contest to avoid. Distinctions replace its ranking with the jury's citations, and the post keeps its playlist (`vizIds`).
- `laneBadge` and the `.who` row in `slideHTML` (where the badge appears), `cardHTML` (Browse cards), `renderUser` in `users.js` (profile), `renderCatGrid` (filter).
- The review form's facts (two approvals, the mobile/desktop "same mathematics" comparison) give eligibility for free.

## Design
**Categories (fixed list, at most one award each per month, any may go unawarded):**
| id | name | what the jury looks for |
|---|---|---|
| `clear` | Clearest single idea | one idea, one knob, the moment it clicks is in a preset |
| `teach` | Best teaching piece | nominated by someone who used it with students, and says how |
| `research` | Research picture | shows something a working mathematician would put in a talk |
| `craft` | Craft | the GPU, WASM or a mobile sibling used to show *more mathematics*, not more glitter |
| `explain` | Best explanation | the explanation.md: precise hypotheses, checkable references |

**Eligibility:** Community reviewed (two approvals), and published, or re-reviewed after an explanation change, in that calendar month. Pieces that won anything in the last 12 months are not eligible in the same category. A juror's own pieces are ineligible that month.

**Cadence:** nominations open the 1st to the 25th; jury decides by the last day; announced in the roundup post on the 1st, which becomes the first item of the "Best of the month" newsletter (`NL_LISTS`).

**Nomination:** any viewer, from a "Nominate" item in the Share dialog (`#sharemodal`): pick a category and write **one required sentence of reason** (≥ 60 chars). A nomination without a reason is not a nomination. `teach` additionally asks "where did you use it?" (course, level). Reasons, not counts, go to the jury.

**How it avoids being a popularity contest:**
1. The jury form never shows like counts, save counts or watch time (the same rule as "Metrics are not review" in review-pipeline.md section 5).
2. Nomination counts only gate the shortlist (≥ 1 reasoned nomination, or a reviewer's own nomination); beyond that they are not shown to jurors.
3. Three jurors, rotating monthly from the reviewer pool, at least one outside the piece's tags (so it reads to a non-specialist); each scores independently before seeing the others, as in review.
4. Citations are public and signed by the jury: a bad call is visible and arguable.
5. Categories reward different things, so the same flashy piece cannot sweep.

**Data model** (`catalog.js`):
```js
const DISTINCTIONS = [
  { month:'2026-10', cat:'teach', viz:'times-table', jury:['@calc-commons','@kmoreau.geom','@may.iterates'],
    citation:'The cleanest picture of inverses mod n we know: pause at k = 51 with n = 101 and the class asks the right question.' } ];
```
Nominations in the prototype: `loci:nominations` = `[{viz, cat, reason, where?, at}]`, shown on a jury page reachable from the roundup post (a mock of what jurors would see, with metrics hidden).

**Where badges show:** a small glyph-and-word mark after `laneBadge` in the caption ("◆ Teaching · Oct 2026"), which opens the citation in the Explanation tab; a "Distinctions" row on the profile (`renderUser`) above Visualizations; a "Distinguished" chip in Browse (`#cat-tags`); the roundup post lists each award with its citation and plays them all.

## Risks / what a skeptic would say
- **"A badge on a math site is childish."** That is why it is a citation with a sentence and named jurors, styled like a journal's "Editor's suggestion", not a coloured medal. No points, no levels.
- **Too few eligible pieces** in early months. Then most categories go unawarded, said plainly. That is better than inflation.
- **Jury cliques.** Rotation, a reviewer pool that grows with the two-approvals rule, and public citations are the checks. An author can see who judged.
- **Jury load.** Five categories × a shortlist of at most five each is about an hour per juror per month.

## Effort
**M** (1–2 days). Touches `catalog.js` (`DISTINCTIONS`, rewrite the October roundup's ranking text as citations), `app.js` (badge in `slideHTML`, citation block in `renderDrawer` explain tab, nominate flow in the share dialog, Distinguished chip in `renderBrowse`/`renderCatGrid`), `users.js` (`renderUser` row), `index.html` (nominate controls in `#sharemodal`), `styles.css`, `docs/review-pipeline.md` (section 3: distinctions).

## How to verify
1. Feed: the times-table slide shows "◆ Teaching · Oct 2026" next to "Community reviewed"; tapping it opens Explanation scrolled to the citation and jurors.
2. Share → Nominate: try to submit with no reason (refused); nominate a New-lane piece (refused: not yet reviewed); nominate with a reason (accepted, persists on reload).
3. Browse: the Distinguished chip filters to awarded pieces.
4. Profile of @circle-mod-n: a Distinctions row with the citation.
5. Blog → October roundup: each award with citation; "Watch these" plays them. The jury mock page shows nominations with reasons and **no like counts**.

## Review

**Verdict:** build smaller. Seed one month of citations and show them as a caption mark and as the roundup post. Leave the nomination flow, the jury page and the Browse/profile surfaces for later.

**Strongest objection:** "With 9 reviewed pieces and the same handful of reviewers judging each other's friends, a 'distinction' is a clique handing out ribbons. And another badge in the caption is noise between me and the picture. Journals' 'Editor's suggestion' works because the journal has standing. Loci has none yet."

**What to cut:**
- Cut nominations in `#sharemodal`, the jury mock page and `loci:nominations`. They demonstrate process, not value, and the Share dialog is the wrong place: nominating is not sharing.
- Cut the "Distinguished" chip in `#cat-tags` and the Distinctions row in `renderUser`.
- Cut the category table down to the awards actually given: seed 2–3 awards for Oct 2026, and leave the other categories unawarded, said plainly.
- Keep: a `DISTINCTIONS` array; one small mark after `laneBadge` that opens Explanation at a citation block naming the jurors; and the `top-october-2026` post rewritten from "ranked by completed views" to the citations, keeping its playlist.
- Merge with the Picks lane. `docs/review-pipeline.md` §3 describes an "Editor's pick" badge that is not rendered. Distinctions should *replace* Picks, not add a fourth badge type.

**Must be true to keep it:**
- The citation is a specific mathematical sentence that an author would quote (it names the thing seen, a parameter and why it matters), not adjectives.
- On a 375 px phone the `.who` row (author, lane, targets, remixed badge, distinction) still fits in at most 2 lines.
- The distinctions do not reproduce popularity: at least one award goes to a piece outside the top 3 by likes.

**Feasibility check:**
- Every cited name exists. `renderUser` is in `users.js`, not `app.js`. `#cat-tags`, `renderCatGrid`, `renderDrawer` and `cardHTML` exist.
- The Picks lane exists only in the doc.
- `POSTS[0]` does rank by completed views, as stated.
- Eligible pool: 13 pieces, 4 of them in the New lane (ineligible), so 9 candidates. That is enough to seed one month and not enough to run five categories.
- `.who` is `flex-wrap:wrap`, so the badge wraps instead of overflowing. Check it visually in the minimal and vaporwave styles.
- Effort: M (1–2 days) is honest for the full design. The cut version is half a day.

**Verification script:**
1. Feed: times-table shows "◆ Teaching · Oct 2026" after "Community reviewed". At 375×812 the caption row wraps to at most 2 lines.
2. Tap the mark: the Explanation tab opens scrolled to the citation, with the jurors named.
3. Blog → October roundup: no "ranked by completed views"; each award carries its citation; "Watch these" plays them.
4. A New-lane piece (galton-board) carries no mark. Every awarded piece's lane is Community reviewed.
5. The keys dialog, the Share dialog and Browse are unchanged.
