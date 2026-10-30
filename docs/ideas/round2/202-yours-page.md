# 202 · "Yours": one page for everything you made, under one handle

## Pitch
A **Yours** view (top-bar button, `#yours`) lists everything this browser holds for you:
- saved pieces and likes
- lists (lessons and collections)
- remix drafts
- Wanted proposals and votes
- preset proposals
- your question-of-the-week answer
- question drafts

Each row has Open, Copy link and Remove. One **handle** at the top is used wherever a name appears. **Export/Import** moves everything as one JSON file.

## Why mathematicians would care
After an evening on Loci, a professor has a lesson, two collections, a remix and a proposal. They are spread across a Customize sub-section (per piece), a modal dropdown, the Source tab (per piece), the foot of the Wanted page and a `<details>` in Share, with no list anywhere. That work is easy to lose and can't move from the office machine to a laptop. If a prototype keeps everything in localStorage, it owes the user a way to see it and take it with them.

## What exists today
- Thirteen stores, each with its own UI: `loci:saved`, `likes`, `watch`, `lesson:<id>`, `collections`, `draft:<id>`, `remix:<id>`, `bounty-proposals`, `bounty-votes`, `preset-proposals`, `handle`, `question:<id>` and `ask:<id>`.
- "Reset my signals", in the keyboard dialog, clears only likes, saves and watch time.
- Three identities: the remix is authored by "@you", Wanted says "proposed by you", and only preset proposals read `loci:handle`.

## Design (smallest real version)
- A registry, `YOURS = [{key, label, list(), open(), remove()}]`. Each feature registers itself, so new features can't forget to.
- Sections in a fixed order (Lists, Drafts, Proposals, Answers, Saved) with counts. Empty sections collapse to one line.
- **Handle:** validated by `LociManifest.isHandle` and used by Check this remix (`author`), Wanted, preset proposals, the question-of-the-week answer and Ask. With no handle set, everything says "you".
- **Export** writes all `loci:*` keys except `watch`, `filter` and `size`. **Import** passes each item through the feature's existing reader (`Lesson.parse`, `Collection.parse`, `ppLoad`…) and asks before overwriting anything.
- "Reset my signals" moves here and says exactly what it clears.

## Risks
- It could look like accounts. Say so at the top: "Kept in this browser only. Export to move it." No avatar, no counts.
- Import is a way in for crafted data, so it must use the validating readers, never a raw `setItem`.
- Skeptic: "nobody exports." Teachers moving between machines do, and it is about 40 lines.

## Effort
S–M (1 day).

## How to verify
1. Make one of each thing: Yours lists them all with correct counts, and Open works for each.
2. Set the handle to `@prof.k`: the remix package, Wanted text and issue bodies all say `@prof.k`.
3. Export, clear site data, import: everything returns. A tampered file (a 50-stop lesson, a `javascript:` URL) is rejected with a warning.
4. Remove a list in Yours, and it is gone from the "Add this moment to…" picker.

## Review

**Verdict: build smaller.** One handle used everywhere is a fix, and a read-only list of what this browser holds is cheap. Export/import and the per-feature registry can wait.

**Strongest objection.** Nobody shares a "Yours" page, so it does nothing for the owner's test (would mathematicians use and share this?). Import is a new way in for crafted data, through every reader at once (`Lesson.parse`, `Collection.parse`, `ppLoad`, `qwAnswer`, the draft loader). That is a lot of attack surface for a feature the walkthrough never needed. The real pain behind it is (a) three identities and (b) lesson drafts hidden per piece under Customize. 201 already addresses (b) by putting lists in the Collections panel.

**What to cut.**
- Export/Import: park until a teacher asks.
- The `YOURS` registry: a hard-coded list of six readers is enough for the prototype.
- "Reset my signals" stays in the keys dialog (`#sig-reset`). Just add one line to its text saying lists and drafts are not cleared.
- Keep: the handle, read once from `loci:handle` and validated with `LociManifest.isHandle`, used by Check this remix's `author`, Wanted proposals, preset proposals, the question-of-the-week issue body and Ask.
- Keep: a short **Yours** section in the existing Collections panel or the profile view, listing lists, lesson drafts (`loci:lesson:*`), remix drafts (`loci:draft:*`) and proposals, each with Open and Remove.

**Must be true to keep it.**
- After setting `@prof.k` once, no outgoing text says "@you" or "you".
- Remove in Yours deletes exactly one key, and the reader of that key still loads cleanly afterwards.

**Feasibility check.**
- Keys confirmed by `git grep "loci:"`: `likes`, `saved`, `watch`, `draft:`, `remix:`, `lesson:`, `collections`, `preset-proposals`, `handle`, `filter`, `bounty-votes`, `bounty-proposals`, `question:` and `ask:`.
- `loci:remix:` and `loci:filter` are written with the session flag (`store.set(...,true)`), so they are not durable. Don't list them as "yours" or export them.
- The remix author comes from `remixPackage` (checks.js), which needs the handle passed in. That changes nothing in the gate's checks.
- No share-link impact.

**Verification script.**
1. Wanted → propose; Share → Propose this moment (handle `@prof.k`); Customize → add a lesson stop; Source → Remix → edit.
2. Open Yours. All four appear, each with an Open that lands on the right piece and panel.
3. Check this remix → Open in Submit. The package `loci.json` says `"author": "@prof.k"`.
4. Remove the lesson draft in Yours, then open Customize on that piece. "Your lesson" is empty and the console shows no warning.
