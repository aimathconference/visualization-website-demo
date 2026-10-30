# Loci: candidate improvements (Oct 30, 2026)

Guiding question: what would make mathematicians want to use Loci and share it with others? Each file proposes the smallest version that actually works in the static prototype (localStorage for anything that needs persistence). Accounts, servers and GitHub bots stay with PLAN.md / DEMO_PLAN.md and appear here only as local stubs.

Effort is for the prototype: **S** ≤ 1 day, **M** 1–3 days, **L** > 3 days. Confidence is how sure I am that it is worth building at all.

| # | Slug | One-line pitch | Category | Effort | Confidence |
|---|---|---|---|---|---|
| 01 | [monthly-bounty](01-monthly-bounty.md) | Post and vote on "please visualize X" challenges; editors pick one a month from the top five; a jury judges reviewed entries; the winner gets a citation, a week pinned in the feed, and a modest prize | Gamification · curation (seeded) | M | Medium |
| 02 | [monthly-distinctions](02-monthly-distinctions.md) | Monthly named distinctions (Clearest idea, Teaching, Research, Craft, Explanation) with a two-sentence jury citation, judged blind to likes from reasoned nominations | Gamification · curation (seeded) | M | Medium–high |
| 03 | [lesson-links](03-lesson-links.md) | Turn a piece into 2–8 stops (params, *t*, one sentence) and share it as one link that plays them as callouts: "explain this to my students" | Social · ease of use | S–M | High |
| 04 | [collections](04-collections.md) | Named, ordered, annotated playlists anyone can make and share as a link; blog posts become collections with essays | Social · curation | M | High |
| 05 | [seminar-mode](05-seminar-mode.md) | Keyboard/clicker-driven full-screen presenter mode with laser pointer, black-out, label scaling and a QR corner so the room opens the exact state | Ease of use · social | M | High |
| 06 | [compare-two-params](06-compare-two-params.md) | Two synchronized copies of one piece at different params, shared clock, A/B controls, shareable | Capability | M | Medium–high |
| 07 | [clip-recorder](07-clip-recorder.md) | Frame-exact GIF/WebM export of an in–out range (with an optional param sweep), rendered by seek + capture, watermarked with the link | Capability · social | M | High |
| 08 | [katex-explanations](08-katex-explanations.md) | Allow TeX in explanation.md, typeset by KaTeX in the drawer (never the worker), parse-checked by the gate | Capability · ease of use | S–M | High |
| 09 | [live-explanations](09-live-explanations.md) | Explanation links that drive the piece: live param symbols (hover value, drag to scrub), preset and *t* links, and a step-through "Why it works" proof-sketch layer | Capability | M | Medium–high |
| 10 | [prerequisite-links](10-prerequisite-links.md) | "Before this" / "Next" edges between pieces, a follow-the-path playlist, and a small DAG map in Browse | Capability · curation | M | Medium |
| 11 | [questions-on-a-moment](11-questions-on-a-moment.md) | A Questions tab where each question is pinned to the asker's exact state, answered by the author, foldable into the explanation or a preset | Social | M | Medium |
| 12 | [follow-authors-and-tags](12-follow-authors-and-tags.md) | Follow people and subfields; a Following chip with "N new" | Social | S–M | Medium (low at 13 pieces) |
| 13 | [atom-feeds](13-atom-feeds.md) | Static Atom feeds per tag, per author and for the blog, from a no-dependency node script, with poster images | Ease of use · social | S | Medium–high |
| 14 | [course-embeds-and-share-cards](14-course-embeds-and-share-cards.md) | A real `?embed=1` mode with click-to-play posters and a static-image fallback for LMSs, plus a 1200 × 630 share card from the current capture | Ease of use · social | M | High |
| 15 | [remix-to-package](15-remix-to-package.md) | Remix templates for common techniques, "Check this remix" through the in-browser gate, Download as package, and an honest Fork-to-GitHub stub | Ease of use · capability | M–L | High |
| 16 | [question-of-the-week](16-question-of-the-week.md) | One pinned piece and one question a week, answered with a state and a sentence; reveal post credits the clearest answers | Curation · gamification | S–M | Medium |
| 17 | [reviewer-credit](17-reviewer-credit.md) | Named reviewers on each piece, a Reviews section on profiles with errata found and fixed, thanks in the roundup; no leaderboard | Curation · gamification | S | Medium–high |
| 18 | [found-by-presets](18-found-by-presets.md) | Viewers propose states as presets; accepted ones carry "found by @handle" forever. Includes the argument against streaks and points | Gamification | S–M | Medium–high |

## Top 8 by value / effort

1. **03 lesson links**: the share link the prototype already has, extended from one state to a few states with words; about a day of work, and it is the exact thing a teacher sends to a class. 04, 05, 07, 16 and 18 all build on it.
2. **08 KaTeX explanations**: a day's work that removes the biggest friction for a mathematician deciding whether to contribute, and the biggest "this looks like a toy" signal for readers. It needs the collaborators to drop submitting.md's "No LaTeX" rule.
3. **07 clip recorder**: deterministic modules make frame-exact export almost free, and a watermarked loop is the most widely shared artifact this app can produce (slides, papers, social posts).
4. **14 course embeds and share cards**: the embed snippet exists but points at the whole app; click-to-play posters and a share image put Loci on course pages and in every chat unfurl.
5. **05 seminar mode**: one speaker plus a QR code turns a room of 40 mathematicians into 40 people holding a link; most of the keyboard handling and full-screen code already exists.
6. **15 remix → package → checks**: the catalog depends on mathematicians writing pieces, and every part of this loop (remix editor, `samplePackage`, the in-browser gate) already exists; it only needs wiring and templates.
7. **04 collections**: the playlist filter and blog `vizIds` already exist; making them user-authored and annotated gives curators and teachers their natural unit of sharing.
8. **17 reviewer credit**: half a day of UI on top of PLAN.md's `reviews` table, aimed at the pipeline's real bottleneck (reviewer time) with the incentive academics actually respond to: named, specific service credit.

**Where the two seeded ideas land.** 02 (distinctions) is ninth, just behind this list: it is worth doing once there are enough reviewed pieces per month to judge, and its design (citations, a jury blind to likes, rotating categories) keeps it from becoming a popularity contest. 01 (bounty) has the highest ceiling of anything here but depends on participation, prize money and jury time, none of which a prototype can show. Run the first two or three months by hand with editor-seeded challenges before building more than the Challenges list and the `bounty` manifest field.

**Suggested build order.** Do 03 first, because it defines the stop/state format that 04, 05, 07, 16 and 18 reuse. Do 13's poster export together with 14, since they share the poster files. Do 08 before 09, which assumes typeset explanations. 12 is only worth building once the catalog has hundreds of pieces.
