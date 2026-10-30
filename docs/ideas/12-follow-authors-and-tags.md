# 12 · Follow authors and topics, with a "Following" feed

## Pitch
A Follow button on profiles and tag chips, and a "Following" chip in the feed that shows new and updated pieces from the people and topics you follow, newest first, with an unseen count. Mathematicians follow people and subfields, not trends, and For You (tag affinity from likes and watch time) is the wrong instrument for "what has @fatou.dust made lately".

## Why mathematicians would care
- **Colleagues follow colleagues.** When a known geometer posts, people in their area want to see it, and will then share it onward with their own students. Follow turns one author's audience into a distribution channel for every piece they make.
- **Specialists follow a subfield** ("Elliptic curves", "Complex dynamics") and want completeness, not ranking: "everything new in my area this month" is arXiv's model, which this audience already lives in.
- **Authors** get a visible follower count that grows with sustained good work, a better long-term incentive than per-piece likes.

## What exists today in the prototype that it builds on
- `renderUser` / `openUser` (`users.js`) and the profile header (`pstats`): the Follow button goes beside the homepage/GitHub buttons.
- `renderChips`, `makeFilter`, `setFilter`, `feedList` (`app.js`): Following is one more chip like Saved and For You, with `filter.ids` as a snapshot.
- `sig` and `store` (localStorage signals), the keys dialog's "Stored only in this browser" summary (`renderSignals`) and Reset.
- Catalog fields `lane`, `reviewed`, and `USERS[*].joined`; the New lane semantics.

## Design
**Data:** `loci:follows` = `{authors:['@fatou.dust'], tags:['Elliptic curves']}`; `loci:seen` = `{<viz id>: <version or reviewed date seen>}`.
- Each catalog entry gets a `published` date (and `updated` when re-reviewed) so ordering is real; today only `reviewed:'Oct 2026'` exists.

**UI:**
- Profile: **Follow** / **Following** toggle button (`aria-pressed`), with "N followers" in `pstats` (prototype: a seeded base count plus yours).
- Tag chips: in the feed's `#chips` a long-press/right-click menu, and in Browse's `#cat-tags` a small ☆ toggle on each chip; tag filter view (`filter.type==='tag'`) shows a "Follow #elliptic curves" button in the end card (`endHTML`).
- Feed: a **Following** chip (shown once you follow anything) after For You, with a badge "3 new". The list is pieces by followed authors or with a followed tag, newest `published`/`updated` first; unseen ones get a small "New to you" mark in the caption; marking seen happens when a slide has been active for 3 s.
- Keys dialog: the signals summary includes follows; Reset clears them.

**Privacy:** follows stay in the browser in the prototype; in production they are per account (PLAN.md's `users` table gains `follows`), and follower lists are counts only, not public lists of who follows whom.

## Risks / what a skeptic would say
- **At 13 pieces, Following is trivially the whole feed.** It shows its value at hundreds; in the prototype the seeded `published` dates and "N new" are what demonstrate it.
- **Follower counts become a status game.** Show counts on profiles only, never in the feed, and never rank by them.
- **Overlap with the Atom feeds (13).** Same subscription, different delivery: in-app vs. in your reader. Build both on one `followsMatch(v)` predicate.

## Effort
**S–M** (1 day). Touches `users.js` (Follow button, counts), `app.js` (`makeFilter('following')`, chip, unseen marking, tag follow controls, signals summary/reset), `catalog.js` (`published` dates), `styles.css`.

## How to verify
1. Open @fatou.dust's profile → Follow; follow the tag "Dynamics" from Browse.
2. Feed: a Following chip appears with "N new"; it lists julia-circle and the Dynamics pieces, newest first.
3. Watch one for 3 s: the count drops by one; reload: persists.
4. `?` dialog: the summary mentions follows; Reset signals clears them and hides the chip.

## Review

**Verdict:** park. At 13 pieces by roughly 10 authors, Following is the whole feed, the follower counts would be invented, and the specialist use case ("everything new in my area") is better served by Atom feeds (13), which arXiv-native readers already use.

**Strongest objection:** "I don't want another place to follow people; I have a feed reader and arXiv listings. A follower count on a math site is a status game, and a seeded one is a fake number."

**What to cut:**
- If it is ever built, cut follower counts entirely.
- Cut the long-press menu on chips and the "N new" badge.
- Keep only a ☆ on Browse tag chips and author profiles, which together define a Following filter. Build it on the same `followsMatch(v)` predicate as 13, after 13 ships.

**Must be true to keep it:**
- The catalog has enough pieces per author and per tag that Following differs visibly from All. Roughly 50 or more pieces would be the bar.
- Real `published`/`updated` dates exist.

**Feasibility check:**
- The names exist: `renderUser`/`openUser`/`pstats` (users.js), `makeFilter` (app.js 202, a string-kind switch; adding `'following'` is trivial), `setFilter`, `feedList`, `renderChips`, `renderSignals` (1105), `endHTML`.
- No `published` field exists. Only `reviewed:'Oct 2026'`, at month granularity, and `USERS[*].joined`. "Newest first" needs invented dates in catalog.js.
- Follows and seen-state in localStorage are fine.
- Nothing on the Wishlist (origin/main) asks for following. Its social features are likes, saved lists and the newsletter.
- The effort (S–M, 1 day) is honest. The value at this catalog size is the problem, not the cost.

**Verification script (if built later):**
1. @fatou.dust's profile → Follow: the button shows `aria-pressed="true"`.
2. Browse → ☆ on "Dynamics": the feed gains a Following chip.
3. Following lists julia-circle, mandelbrot-zoom (if by @fatou.dust) and the four Dynamics pieces (logistic-bifurcation, double-pendulum, lorenz-butterfly, wasm-lissajous), and nothing else.
4. Reload: the follows persist. `?` → Reset signals: the Following chip disappears.
