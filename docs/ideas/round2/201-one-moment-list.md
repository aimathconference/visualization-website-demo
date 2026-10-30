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
