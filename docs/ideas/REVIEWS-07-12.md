# Reviews: ideas 07–12

| # | Idea | Verdict | One line |
|---|------|---------|----------|
| 07 | Clip recorder | build smaller | GIF only (plus an optional PNG-sequence zip for Beamer), no sweep. `seek`+`capture` is frame-exact only for pieces whose state is a function of *t*, and the suite doesn't currently enforce that (both checks seek; dt = 0 on seek). |
| 08 | KaTeX in explanations | build | About one day. KaTeX lives on the page (lazy) and the worker is untouched. The gate and `md()` must share one math tokenizer and one pinned KaTeX, and the collaborators must reverse "No LaTeX". |
| 09 | Live explanations | build smaller | Keep `#preset:`/`#t:` links, `#param:` readouts and the "Why it works" step-through; cut drag-scrub. times-table's *k* is time, not a param. `linkCheck` would warn on every `#…:` link until it is exempted. |
| 10 | Prerequisite links | build smaller | `after` edges plus a derived Next row in the Explanation tab, with only defensible edges (logistic → julia → mandelbrot). Cut the map and path play. |
| 11 | Questions on a moment | build smaller | A read-only sample thread with anchored thumbnails, "Show me", and an Ask that hands a state-linked question to GitHub. A localStorage-only Q&A would look fake. |
| 12 | Follow authors and tags | park | Meaningless at 13 pieces, the counts would be invented, and Atom feeds (13) serve the specialist better. Revisit at about 50 pieces. |

## Recommended build order
1. **08 KaTeX.** Cheapest, raises credibility on every explanation, and 09 and 11 benefit from it.
2. **07 Clip recorder (GIF).** The most directly shareable output. First add a played-vs-seeked check so exports can't freeze.
3. **09 Live explanations (cut).** The research-audience differentiator. Needs the `linkCheck` exemption.
4. **10 Prerequisite links (cut).** Half a day once edges are agreed.
5. **11 Questions (cut).** Only after a thread backend is committed in PLAN.md.
6. **12 Follow.** Parked.

## Cross-cutting findings for the morning review
- **Exports can freeze, and the suite misses it.** `checks.js` "Deterministic" and "Time jumps" both drive instances by seeking, and the worker draws seeks and captures with `dt = 0`. A module that integrates with `dt` passes both checks and exports frozen frames. Add a check that compares a played frame with a seeked frame. It matters for 07, and for any feature that seeks: 09 steps, 11 anchors, lessons.
- **The uncommitted pointer/view work changes these features.** `stateOf` now carries `view`. 07 (offscreen mount), 09 (steps) and 11 (Show me, thumbnails) must pass or restore it. `renderThumb` and `poster` currently ignore it.
