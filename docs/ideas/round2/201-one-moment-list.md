# 201 · One moment list: lessons and collections become the same thing

## Pitch
Make lessons and collections one object: an ordered list of **moments** `{v, p, t, view, note}` with a title and an optional intro, where the same piece may appear more than once. One player steps through it everywhere (feed, Present, embed). "Moment" becomes the only user-facing word for a captured state, replacing *view*, *stop* and *item*.

## Why mathematicians would care
A lecture uses one piece at several values, then another piece. Today a professor has to choose: a lesson is one piece with stops, and a collection is several pieces with one moment each. Real lectures need both. With one format, a link behaves the same whether it is opened, presented, embedded or recorded.

## What exists today
- `Lesson.stop/parse/compact/apply`. Collections already reuse `Lesson.stop` per item, plus `v` and `mode`.
- Two players: `lessonCard` (‹ ›, ← →) and `Collection.arrive` (a sticky callout; you move by scrolling the feed).
- `Collection.parse` refuses a second item for the same piece. That one rule is why there are two formats.
- Present steps lessons or presets and ignores collection notes (walkthrough `a9`).

## Design (smallest real version)
1. **Format.** `?m=<base64url {title, intro?, items}>`, at most 12 items. `?lesson=` and `?collection=` parse into it, and the once-per-piece rule goes.
2. **One player.** A docked step bar ("Week 7 · 2 of 5 · ‹ › · Leave"; placement in 203). › goes to the next moment, scrolling to another piece if needed. Scrolling the feed still browses.
3. **Present** steps through the list, and uses presets only when no list is playing. Its QR code encodes the list from the current item (206).
4. **Authoring.** One "Add this moment to…" picker listing your lists plus "New list". Per-piece lesson drafts migrate into lists.
5. **Vocabulary.** Share: "Link to this moment". Clip: "Link to the first frame". module-api section 5 describes one format.

## Risks
- Collections lose some of their "playlist in the feed" feel. Keep scrolling for browsing and ‹ › for the author's order.
- Link size: 12 moments with notes is about 3 KB, fine for chat and LMSs. QR codes need the start-at-item fallback.
- Old links must keep working; test with the links in ideas 03 and 04.
- Skeptic: "a rename." It isn't: it removes one rule, one player and one store, and it is the basis for 205 and 206.

## Effort
M (1.5–2 days), mostly deleting code.

## How to verify
1. Build "Week 7": logistic at r = 3.2 and r = 4, then double pendulum at t = 3. Open the link privately, step with ›, and check each moment and note.
2. Tonight's `?lesson=` and `?collection=` links still play.
3. Present: → crosses pieces, and the decoded QR code is a `?m=` URL.
4. A tampered item (unknown `v`, r = 9999) is dropped or clamped, with a toast.

## Review

**Verdict: build smaller.** Let a list hold consecutive runs of the same piece, play every run with the existing lesson player, and keep the two link formats tonight's users already have instead of adding a third (`?m=`).

**Strongest objection.** The once-per-piece rule is not arbitrary. The feed has one slide per piece, and params live in `settings[v.id]` (`getSettings`). `Collection.applyAll` writes each item into that per-piece object, so two items for the same piece would overwrite each other. A list like "logistic, pendulum, logistic" needs either two slides of one piece with separate state (an overlay such as 205's `sl.over`, which does not exist yet) or a player that re-applies state on every step. The proposal calls this "mostly deleting code". In practice it is a state-model change, and it depends on 205.

**What to cut.**
- No `?m=` parameter. Emit `?v=<id>&lesson=` when the list is one piece and `?collection=` otherwise. Both decoders already exist. Lesson links keep `v=`, so the `v/<id>.html` preview stubs (`scripts/gen-share-pages.mjs`, which forwards the whole query) still unfurl with the right piece.
- Repeats only as **consecutive runs**: `Collection.parse` groups adjacent items with the same `v` into one run, and a run plays as a lesson on that piece's slide (`Lesson.play`). Non-adjacent repeats are still dropped with the existing warning. This covers "logistic at 3.2 and 4, then pendulum", the walkthrough's example, without duplicate slides.
- One player: the lesson card's ‹ › step through runs. Past the last stop, › calls `goTo` on the next item's slide and `Lesson.play`s its run. The sticky `Collection.arrive` callout goes away.
- Present steps the list (`presentSteps` gets a `kind:'list'`), which fixes `a9`.
- The vocabulary change ("moment") is copy only, so do it in 204.
- No per-piece draft migration and no "Add to…" picker yet. The Collections panel already appends to a list.

**Must be true to keep it.**
- Every `?lesson=` and `?collection=` link made tonight plays exactly as before.
- Limits don't shrink. Today a collection allows 30 items (`Collection.MAX_ITEMS`) and a lesson 8 stops (`Lesson.MAX_STOPS`). The proposed cap of 12 would truncate valid collection links made tonight.
- A professor builds "Week 7" (two logistic moments, then the pendulum) in under a minute.

**Feasibility check.**
- `Lesson.parse` drops stops whose `v` differs ("this player plays one piece"). Keep that for `?lesson=`.
- `Collection.parse` (the `at` map) is the single place to relax: allow adjacent repeats.
- `Collection.filter` builds `ids` from items, so de-duplicate ids for runs.
- `Collection.applyAll` should apply only a run's first stop.
- The compare feature (06, landed during this review as ab66a2d) adds `&b=`. A run's stop has no `b`, so a list can't carry a comparison. Say so in module-api §5 rather than silently ignoring it.
- Update module-api §5 "Collections": "a collection holds each piece once" becomes "adjacent items of one piece play as stops".
- The gate (checks.js) is unaffected.

**Verification script.**
1. Open tonight's collection link from `a5` and a `?lesson=` link from `a1`. Both play as before (the regression guard).
2. In the Collections panel, add logistic at r = 3.20, logistic at r = 4.00, then double pendulum. Copy the link and open it in a private window.
3. Press › twice. The second press scrolls to the pendulum, and the card reads "3 of 3".
4. Shift+F (Present), then →, ←. The strip reads "Week 7 · k of 3" and the notes are the list's, not the presets.
5. Tamper with the link (`v:"nope"`, r = 9999). The bad item is dropped with the "no longer available" toast, and r is clamped.
