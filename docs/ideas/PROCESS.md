# Overnight iteration process (Oct 30, 2026)

Branch: `overnight-ideas` cut from `iterate-loci-feed` after the prototype is pushed upstream.

Loop, per idea:
1. **Propose.** An idea file in `docs/ideas/NN-slug.md` (pitch, why mathematicians care, design, risks, effort, verification).
2. **Review.** A separate reviewer agent appends a `## Review` section: verdict (build / build smaller / park / reject), the strongest objection, what to cut, and what must be true for it to be worth keeping. The reviewer never sees the proposer's reasoning beyond the file.
3. **Implement** only verdicts of build / build smaller, as ONE atomic commit per idea whose message starts with the idea number and slug, and which includes the idea file. Parked and rejected ideas are committed as docs-only commits so the morning review sees them too.
4. **Verify** in the browser (pane for canvas pieces, headless chromium for GPU) before the commit; a failed verification becomes a "park" with the reason.
5. `docs/ideas/LOG.md` records, in order: idea, verdict, commit SHA or reason, and a one-line note for the morning.

Morning review: `git log --oneline main..overnight-ideas` reads as the list of ideas; each can be kept (cherry-pick), dropped (skip), or pushed further (branch from it).
