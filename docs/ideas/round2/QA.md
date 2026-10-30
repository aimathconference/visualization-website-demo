# QA sweep of overnight-ideas at 4ff3b93 (Oct 30, 2026, 02:40–02:55)

Read-only sweep in headless Chromium with a GPU, at 1280×800 and 375×812. No console errors or exceptions in any run. Screenshots and step scripts are in the session scratchpad (`qa/`).

## Failures, most severe first
1. **Docs view scrolls sideways on a phone.** `openDoc('module-api')` at 375 px: `#docs` is 684 px wide (long code blocks, an inline CDN URL); `fidelity-assessment` overflows by 3 px from a table. Likely 207.
2. **Present shows raw TeX in moment notes.** `presentPaint` sets the note with textContent. Likely 05 + 201; the 2xx TeX-in-notes fix missed Present.
3. **Embeds show raw TeX in lesson notes.** `?embed=1&lesson=` → › → literal `$k=3$`. Likely 206.
4. **Phone: the Try-this pill row stays tappable beside the docked lesson card.** A sliver of a pill shows at x 297–302, y 515–545; tapping it applies a preset and ends the lesson. Likely 203.
5. **Blog "Watch these in the feed" leaves a stale address bar** (`?v=` of the previous piece until the first slide change). Likely 201.
6. **Embed: arrow keys do nothing after Play** (focus stays on the Play button; the key handler ignores keys aimed at a button). Likely 206.

## Looks off
- Why-it-works callout covers the bottom third of the cobweb while the sheet peeks (203 phase 2).
- A list's single-moment slide plays live, so Share/GIF/static image use the drifted t, not the moment's (deliberate in `Collection.arrive`, but surprising).
- Check this remix after a colour change: 0 failures, 2 warnings (near-duplicate; "still described"), as designed.
- Yours: Clear needs a second press; Open on a list opens the Moments panel rather than playing it.

## Passed
Load (13 pieces, 2–3 workers, GPU targets on desktop, mobile targets on phone); Feed (like, save, pause, scrub, engage/drag, j/k exact); Browse (search, contributors, Wanted, Docs); Blog (order, playlist); Submit (31/31, failing sample exactly 4, GPU sample 55/55); Wanted (vote cap, proposals); Yours counts; profiles (Reviews, Found); Explanation (KaTeX, live links, Why it works, Before/Next, questions, reviewer footer); Customize (Mode, presets, modified dot, Compare incl. `&b=` and the 900 px refusal); Moments (237-char list link); Source (three-file remix, locked keys, KaTeX preview); Share (four groups, list pick, embed and static image, 1 s GIF, Beamer zip compiles, Present from Share, Propose); links (old lesson/collection, embed+lesson, `&at=`, `?mode=`, `?present=1`, `v/<id>.html`, `?v&p`); leaving restores params; phone (no sideways scroll except Docs, sheet peek, docked card, 30 sampled controls ≥ 44 px).
