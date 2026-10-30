# Morning review: the overnight branch (Oct 30, 2026)

Branch `overnight-ideas`, cut from `loci-prototype` (pushed to origin) after the
targets, pointer-interactivity and user-pages work landed. Everything below is
one commit per idea, so you can keep, drop or push each one:

```bash
git log --oneline loci-prototype..overnight-ideas
```

`docs/ideas/LOG.md` is the ledger (idea, verdict, commit, one-line note).
`docs/ideas/NN-*.md` and `docs/ideas/round2/2NN-*.md` hold each proposal with
the independent review appended. `docs/ideas/round2/walkthrough.md` is the
three-user walkthrough that drove round two.

## What I'd keep, drop, or push further

**Keep as is (they make the product feel like one thing).**
- 03 lesson links → 201 one moment list: moments `{p,t,view,note}` are now the
  unit everything shares (share, lists, Present, embeds, Beamer). Links from
  earlier tonight still open.
- 205/206/203: the fixes a mathematician would hit in the first five minutes
  (state leaking after a lesson, embeds dropping lessons, the phone drawer
  hiding the picture).
- 08 KaTeX, 09 live links, 14 embed mode, 204 one Share sheet, 207 trust pass.
- 15 + 210 check-this-remix and whole-package remix: the contributor loop now
  runs end to end in the browser.

**Keep, but decide the policy.**
- 01 bounties and 02 distinctions (your seeded ideas): built as the smallest
  honest versions, all marked "sample". They need: who the jury is, whether
  there is a prize and its legality, and the GitHub org for proposals.
- 17 reviewer credit: the docs disagree on who reviewers are (community in
  review-pipeline.md vs moderators/admins in Wishlist.md). Pick one.
- 18 found-by presets and 16/11 questions: all proposals route to prefilled
  GitHub issues on repos that do not exist yet.

**Push further.**
- 07 clip recorder (GIF only now; MP4 was cut on purpose).
- 208 Beamer export: compiles here with lualatex; worth showing to two
  mathematicians before adding handouts or animation.
- 05 Present: a phone has no tap-to-step; the laser pointer was cut.
- 06 compare: pointer input reaches A only.

**Consider dropping or parking.**
- 12 following and 13 Atom feeds were parked by the reviewers (too few pieces;
  no public origin). 209 class gallery parked (thumbnails cannot show a state).

## Final QA
A read-only sweep at 02:40 (docs/ideas/round2/QA.md) found no console errors and six small failures; all six are fixed in the last commit, `qa: fix the six sweep findings`. The Submit sample passes 31/31 on a quiet machine.

## Known rough edges (all logged by the agents, none fixed)
- Callouts still sit inside the drawing box on phones (203 phase 2 would dock a
  note slot under the box).
- Why-it-works and `#state:` links overwrite your params outside a lesson; the
  "modified" dot shows it but nothing restores them.
- Compare's A/B tags take 26 px from the top of each half.
- The first clip-size estimate before any recording is still a dense-picture
  guess; later estimates are calibrated.
- Sample content: one cast of handles plays author, reviewer, juror, finder and
  question-answerer. Marking them "sample" or renaming is your call.
- The seminar QR encodes localhost until the site has a public origin.

## Process notes
- Reviewer agents rejected or shrank every idea at least once; nothing was
  built as first proposed.
- Merging into the served tree twice left conflict markers in the live page
  for a minute or two; serve the morning review from a worktree.
- One `git filter-branch` to fix trailers accidentally covered Tommy's commits
  and was reverted via the reflog; the branch still contains origin/main.
