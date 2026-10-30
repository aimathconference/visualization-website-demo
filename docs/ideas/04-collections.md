# 04 · Collections: playlists by mathematicians

## Pitch
Let anyone make a named, ordered collection of pieces, each optionally pinned to a state (params, *t*) with a one-line annotation, and share it as one link that plays in the feed. Editors and guest curators already do this as blog posts; collections make it a first-class, lightweight object anyone can make in a minute.

## Why mathematicians would care
- **"Ten pictures for a first course in dynamical systems"** is the unit people actually share between colleagues, on course pages and in reading-group channels. A single piece is a curiosity; a curated sequence is a syllabus.
- **Guest curators** (`@calc-commons`'s "10 best visuals for teaching calculus" post) get a format that does not need a blog maintainer to merge a post.
- **Authors** get discovered through someone else's list, with that person's endorsement attached, which is the strongest kind of share.
- Saved (`sig.saves`) is a private pile; a collection is a public argument about order and context.

## What exists today in the prototype that it builds on
- The **playlist filter**: `filter.type==='playlist'` in `feedList`, `renderChips` (the "▶ name ✕" chip), `endHTML` ("from “…”"), and the `data-playlist` handler that builds `{type:'playlist', ids, name}` from `POSTS[].vizIds`. A collection is that filter with per-item state and notes.
- `sig.saves` and the Saved chip; `toggleSave`.
- `stateOf` / `readLink` / `b64u` for per-item states; lessons (03) for per-item notes.
- `cardHTML`, `paintThumbs`, `renderUser` (a profile can list collections), `contributorsHTML`.

## Design
**Data:** `{id, title, by, blurb, items:[{v, s?:<stateOf minus v>, note?}]}`; ≤ 30 items, notes ≤ 160 chars.
- Prototype persistence: `loci:collections` in localStorage (the viewer's own), plus editor collections as a `COLLECTIONS` array in `catalog.js`.
- Share form: `?c=<base64url json>` (self-contained, like lesson links; ~3 KB at 30 items). Production would give it an id (PLAN.md's data model can add `collections(id, owner, json)`); the URL form stays as the export.

**UI:**
- Rail: long-press or right-click on **Save** (or a "Save to…" item in the Share dialog) opens a small menu: Saved · each of your collections · New collection. Plain Save keeps today's behavior.
- Browse gets a **Collections** section above Contributors: cards with a 2×2 thumbnail mosaic (`renderThumb` on four canvases), title, curator, count.
- Opening a collection: a page (reuse the blog article layout in `renderBlog`) with the blurb, the items as rows with notes, **▶ Play in the feed** (the existing playlist filter, now applying each item's state on arrival via `onActiveChange`), Copy link, Edit (if yours).
- In the feed, the item's note shows as a callout when the slide becomes active (`showCallout`).
- Profiles: a "Collections" row in `renderUser` for the profile owner's collections.

## Risks / what a skeptic would say
- **Empty-room problem:** user collections are worthless until people make them. Seed with 4–5 editor collections derived from the existing posts and tags (Dynamics, Teaching calculus, Complex dynamics, GPU pieces).
- **Overlap with blog posts.** Yes, deliberately: a blog post is a collection with an essay. Convert `POSTS[].vizIds` to reference collections, so there is one mechanism.
- **Stale items** when a piece is retired: drop missing ids on load (`idList` already does this for saves) and show "1 piece no longer available".

## Effort
**M** (2 days). Touches `app.js` (Save-to menu, collection page, playlist filter carrying states/notes, Browse section), `catalog.js` (`COLLECTIONS`), `users.js` (`renderUser` row), `index.html` (menu markup), `styles.css`.

## How to verify
1. On two slides, Save to… → New collection "Chaos in four pictures", add notes; reload: persists.
2. Browse → Collections: it appears with a 4-thumbnail mosaic beside the editor collections.
3. Play in the feed: the chip reads "▶ Chaos in four pictures ✕", each slide opens at the saved params and *t* with its note as a callout, end card says "from “Chaos in four pictures”".
4. Copy link, open in a private window: the same collection plays, read-only.

## Review

**Verdict:** build smaller. Build it as 03's lesson-link format with a per-stop `v` (a multi-piece lesson), played through the existing playlist filter. Leave out the Save-to menu, the Browse mosaics and the profile rows.

**Strongest objection:** "The catalog has 13 pieces and 3 of them are dynamics. 'Ten pictures for a first course' is impossible today, and the blog posts already are editor collections with a 'Watch these' button. Without accounts a user collection is just a long URL, which is what 03 already makes."

**What to cut:**
- Cut the long-press/right-click Save-to menu. Long-press on a touch rail fights the OS context menu and text selection, and it hides the feature. Use one "Add to collection" button in Customize, next to 03's "Add this moment as a stop", using the same draft list.
- Cut the Browse → Collections section with the 2×2 `renderThumb` mosaics and the `COLLECTIONS` editor seed. `POSTS[].vizIds` already plays as a playlist, and seeding 4–5 more lists from 13 pieces is mostly repetition.
- Cut the profile Collections row. `renderUser` only renders seeded contributors (`USERS` in users.js), and the viewer has no profile, so "your collections on your profile" has nowhere to live without accounts.
- Cut the edit page. A collection is edited the same way a lesson is.
- Keep: `?L=` (or `?c=`) with stops `{v, p, t, view, note}`; playback through `setFilter({type:'playlist', ids, name})`, so the chip, the counter and `endHTML` ("from “…”") work unchanged; the note shown as a callout when the slide becomes active.

**Must be true to keep it:**
- It is one mechanism with 03, not two: one payload, one draft, one player.
- Each item opens in its saved state on arrival, with no visible jump from default to saved state.
- A retired or unknown id is dropped with a one-line notice, not a broken slide.

**Feasibility check:**
- Every cited name exists: `feedList`, `renderChips`, `endHTML`, `data-playlist`, `sig.saves`, `toggleSave`, `idList`, `cardHTML`, `paintThumbs`, `renderThumb`, `renderUser` (users.js), `contributorsHTML`.
- The design is wrong to apply each item's state "on arrival via `onActiveChange`". `mountPolicy` mounts the active slide ±1, so the next slide mounts with default params before it becomes active, then jumps. Write `settings[v.id].params`, `sl.t` and `sl.view` when the filter is built (in `buildFeed`, or right after `setFilter`). Show only the callout in `onActiveChange`.
- Settings are per piece (`settings[v.id]`), so the same piece twice in one collection at two states cannot both hold. Either forbid duplicates or apply state on activation for duplicates only. (A piece at two states is 06's job anyway.)
- Effort: M (2 days) is honest for the full design. Built on 03, the cut version is about half a day.

**Verification script:**
1. On logistic-bifurcation (r = 3.20 pill) and double-pendulum, "Add to collection" with notes. Copy the link.
2. Open it in a private window: the chip reads "▶ <title> ✕" and the counter reads "1 / 2". Slide 1 is at r = 3.20 with its note as a callout.
3. Scroll to slide 2: it is already at its saved `t`, with no visible jump, and its note shows.
4. End card: "from “<title>”". Clicking ✕ on the chip returns to All.
5. Edit the payload to add a nonexistent id: the collection plays the other 2 and says "1 piece no longer available".
