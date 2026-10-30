# Loci round two: making tonight's features one product (Oct 30, 2026)

These proposals come from walking the site as a professor, a contributing grad student and a phone reader (see `walkthrough.md`; evidence is in the `a*`, `b*` and `c*` screenshots). Round one added about fifteen features, one commit each. Each works on its own. Together they have:
- three players: lesson, collection and Present
- five places that capture a moment, each with its own note field and store
- six callout styles that cover the picture
- three identities: @you, you, and `loci:handle`
- outbound buttons that all reach GitHub 404s

Round two should mostly join and fix what exists, with only a little that is new.

Effort is for the prototype: **S** ≤ 1 day, **M** 1–3 days.

| # | Slug | One line | Kind | Effort |
|---|---|---|---|---|
| 201 | [one-moment-list](201-one-moment-list.md) | Lessons and collections become one list of moments `{v,p,t,view,note}`, where a piece may repeat, with one player in the feed, Present and embeds; "moment" is the only noun | Consolidation | M |
| 202 | [yours-page](202-yours-page.md) | One "Yours" page for lists, drafts, proposals, answers, saved items and likes, one handle used everywhere, and export/import | Consolidation | S–M |
| 203 | [callouts-off-the-picture](203-callouts-off-the-picture.md) | One callout that docks under the box, never on it, plus a 35 % drawer peek on phones whenever the drawer changes the picture, and touch copy on touch screens | Consolidation · phone bug | M |
| 204 | [one-share-sheet](204-one-share-sheet.md) | Share holds everything outgoing (link or list, course-page embed, slides, to the author); Customize goes back to changing the picture | Consolidation | S–M |
| 205 | [fix-state-after-leaving](205-fix-state-after-leaving.md) | Leaving a lesson or collection restores pause, params and the active lesson; list params become an overlay, not an overwrite of your settings | Bug fix | S–M |
| 206 | [fix-links-survive-embed-present-clip](206-fix-links-survive-embed-present-clip.md) | Embeds play lessons, Present's QR code encodes the list, "Open in Loci" keeps the list, and the GIF watermark prints readable values instead of base64 | Bug fix | S–M |
| 207 | [fix-trust-pass](207-fix-trust-pass.md) | Remove unlabelled like counts and the one-cast-in-every-role pattern; fix the ℘ "real points" error, the question of the week answered by its own preset, the "10 best" post with 3 items, and the 404 and mojibake dead ends | Bug fix · trust | S |
| 208 | [beamer-and-handout-export](208-beamer-and-handout-export.md) | Export a list as a compilable Beamer zip (stills or `animate` frames, notes, QR codes) plus a print handout, with a versioned `.bib` entry per piece | New capability | M |
| 209 | [class-gallery-from-links](209-class-gallery-from-links.md) | A "your turn" stop in a lesson; students return answer links through the LMS; the teacher pastes them into a gallery grouped by state; no server | New · social | M |
| 210 | [remix-the-whole-package](210-remix-the-whole-package.md) | Remix edits loci.json (presets, bounty) and explanation.md, not only index.js, with a warning when inherited preset notes no longer match the picture; Wanted → "Make this" | Contributor path | M |

## Order

1. **205, 207**: about 2 days. These stop the site from misleading people: a frozen feed, borrowed params, invented numbers, a wrong formula, 404s. Do them before anyone outside sees the branch.
2. **201, then 203**: the core of round two. 201 removes the rule that forced two formats; 203 makes every guided feature usable on a phone. 206 falls out of 201's player.
3. **204, 202**: cheap reorganisation once 201's vocabulary exists.
4. **210** for contributors; it closes the Wanted → remix dead end.
5. **208, then 209**: the two new ideas I would bet on. 208 is the artifact mathematicians already make by hand (Beamer slides) and forward to colleagues. 209 turns "find a parameter where X happens", the exercise these pictures are best at, into a class activity with no accounts.

## What I deliberately left out
- No new social surfaces with counts (follow, comments, leaderboards). Round one's reviewers were right that at 13 pieces they would be invented.
- No short-link service or real registry. Both need a server (PLAN.md). 206 and 207 are honest bridges to them.
- No additional callout or panel types. The point of this round is fewer of them.

## Skeptic's note
Most of this round removes things. If the owner wants one change that most improves the site, it is 203: on a phone, the explanation's live controls currently change a picture the reader cannot see.
