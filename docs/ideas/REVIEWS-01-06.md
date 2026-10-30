# Reviews 01–06

| # | Idea | Verdict | One line |
|---|---|---|---|
| 01 | Monthly bounty | build smaller | A Wanted list plus one open challenge, with a 3-vote cap and a required reference. No jury, prize or winner marks, and no invented vote counts or awards. |
| 02 | Monthly distinctions | build smaller | Seed 2–3 signed October citations: a caption mark, a citation block in Explanation, and a rewrite of the roundup away from "completed views". Replaces the unrendered Picks badge. No nomination or jury UI. |
| 03 | Lesson links | build | Stops `{p, t, view, note}` in one URL, played with a persistent callout and `←`/`→`. Add `view`; cap notes, or state the ~6 KB size honestly. |
| 04 | Collections | build smaller | 03's format with a per-stop `v`, played through the existing playlist filter. Apply state when the filter is built, not in `onActiveChange`. No Save-to menu, mosaics or profile rows. |
| 05 | Seminar mode | build smaller | After 03: blackout, stop stepping, a QR corner and a progress strip on the existing full screen. No laser, `labelScale`, preloading or notes window. Fix the `Shift+P`/`p` collision. Verify the QR by decoding it, because in local dev it points to localhost. |
| 06 | Compare two params | build smaller | Two synced halves on wide screens, with an A/B selector over the unchanged Customize and a shared seed and view. About 1.5 days, because `settings[v.id]` and the 26 `sl.host` sites assume one handle. |

## Recommended build order

1. **03 Lesson links.** This sets the shared payload `{title?, stops:[{v?, p, t, view, note}]}` that 04 and 05 reuse, and it is the strongest "send this to someone" format.
2. **04 Collections (small).** About half a day on top of 03: a per-stop `v`, playlist playback and the dropped-id notice.
3. **02 Distinctions (small).** Half a day, mostly data and copy, and the owner's group asked for it. Do it before 01 so the roundup post and the caption mark exist for 01 to reuse later.
4. **01 Bounty (small).** About 1 day. The owner's group asked for it. It depends on nothing above, but it is the most at risk of looking like fabricated activity, so build it once the honest-sample pattern from 02 exists.
5. **05 Seminar (small).** Under a day once 03 exists, and worthless without 03 or 04.
6. **06 Compare (small).** The most invasive change, to the single-handle slide model. Build it last, so it does not destabilize the others.

## Cross-cutting notes for the morning review
- 03, 04 and 05 must share one link format and one player. If they ship as three mechanisms, revert to 03 alone.
- 01 and 02 must not show invented activity (vote counts, winners, nominations) as real. Mark every seeded row "sample".
- None of the six needs a module API change if 05 drops `theme.labelScale`. Keep it that way, so the check suite is untouched.
