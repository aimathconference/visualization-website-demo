# Reviews: ideas 13–18

Each idea file has an appended `## Review` section. Repo state was read from the working tree on `iterate-loci-feed` (which another agent is editing) and from origin/main for PLAN.md and Wishlist.md.

| # | Idea | Verdict | One line |
|---|------|---------|----------|
| 13 | Atom feeds | build smaller | `all.xml`, `blog.xml` and tag feeds for the 10 tags with 2 or more pieces; no per-author feeds (every author has one piece) and no posters (none exist, and node can't render them). It needs real per-piece dates and a fixed origin. |
| 14 | Course embeds + share cards | build smaller | `?embed=1` with click-to-play is the best sharing feature here. Cut the iframe-children fallback (browsers never render it) and the share-card composer. `LociHost.poster` spawns a worker, so the "no workers until clicked" claim needs static stills. Static per-piece OG stub pages are possible; per-state OG is not. |
| 15 | Remix → package → checks | build smaller | Ship only "Check this remix" (`samplePackage({...v, source})` already works, verified under node) plus localStorage drafts. The remix **must get a new id**, or the duplicate check skips the parent and an unchanged remix passes. Cut templates, the zip writer and the GitHub stub. |
| 16 | Question of the week | build smaller | One pinned question with a self-check reveal and a "Send to the editors" GitHub link. Drop the weekly cadence and archive. The sample question is given away by the existing n = 101 preset note. |
| 17 | Reviewer credit | build smaller | Name reviewers in the Explanation footer and list them on profiles. Drop the errata counts. First settle the conflict: the docs say community reviewers, PLAN/Wishlist say moderators and admins. |
| 18 | "Found by" presets | build smaller | A credited preset is good. Proposals become a prefilled GitHub issue, with no fake author queue. The flagship example (r = 3.83) is the logistic piece's default, `foundBy` is unvalidated today, and there is no viewer handle in the prototype. |

No idea was rejected or parked outright. Each has a worthwhile core under scope the prototype cannot support honestly.

## Recommended build order (among 13–18)

1. **15, Check this remix.** About half a day on existing code (`samplePackage` → `loadPkg` → `runChecks`). It lowers the barrier for the would-be author, and the catalog depends on that person.
2. **14, `?embed=1` with click-to-play.** It puts Loci on course pages, which is where mathematicians share with students. Resolve the poster question first (it ties to 13).
3. **18, found-by presets (cut version).** Small. It creates CV-grade credit that people forward, and it reuses `stateOf`/`applyPreset`.
4. **17, named reviewers in the footer.** Half a day, once the owner decides who reviewers are.
5. **16, one question.** Cheap once a strong question is written. The question is the bottleneck, not the code.
6. **13, Atom feeds.** Useful only after deployment to a fixed origin with real dates. Build it alongside the static OG stubs from 14, since both come from the same node generator over `catalog.js`.

Shared prerequisites to do once:
- Real per-piece dates (13, 12).
- A fixed public origin (13, 14).
- A node generator over `catalog.js`, verified to load in `vm` after `kit.js` and `manifest.js` (13, 14 OG stubs).
- A local "your handle" setting (16, 18).
