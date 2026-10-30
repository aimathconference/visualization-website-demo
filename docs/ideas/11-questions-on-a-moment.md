# 11 · Questions pinned to a moment, answered by the author

## Pitch
A per-piece questions thread where every question is attached to the exact state the asker was looking at (params, *t*, theme), so "why does it jump here?" carries *here*. Authors answer, the best answers get folded into the explanation or a preset, and a "Questions" count on the rail tells viewers that someone is home.

## Why mathematicians would care
- **A student** asks "why are there two components when b < 0.385?" from the exact frame, and the author (a real arithmetic geometer) answers. That exchange is the most shareable thing on the site after the piece itself, because it is a small, true piece of mathematical conversation with a picture.
- **Authors** learn where their explanation fails, with a pointer to the frame; review only checks what is written, questions find what is missing.
- **Mathematicians as an audience** value talking to the person who made something far more than reacting to it; Q&A is the social layer that fits them, where likes and comments under a TikTok do not.

## What exists today in the prototype that it builds on
- `stateOf(v)` / `shareURL` / `readLink`: a question's anchor is a state, exactly as a share link is.
- review-pipeline.md section 5: "Report … opens a thread with the author". Threads with authors are already in the plan for errors; this generalizes them to questions.
- `renderDrawer` tabs (Explanation · Customize · Source): a fourth tab, **Questions**, fits the drawer.
- `userLink`, `pfp`, `USERS` (`users.js`) for bylines; `rbtn` for a rail count.
- PLAN.md: GitHub is the system of record for review and flags; a GitHub Discussion per piece is the production backend (owned by PLAN.md), stubbed locally here.

## Design
**Data:** `{id, v, state:<stateOf>, by, at, text, answers:[{by, at, text, folded?:'explanation'|'preset'}], status:'open'|'answered'}`. Text ≤ 1000 chars, Markdown with KaTeX (08) if available.
- Prototype: `loci:questions` in localStorage, plus a few seeded Q&As in `catalog.js` (`QUESTIONS`) so the tab is not empty, written by the fictional authors.
- Production stub: a "Continue on GitHub" link per question pointing at the piece's repo discussions; not built here.

**UI:**
- Drawer: a **Questions** tab (`data-dtab="questions"`, key `q`). Each question shows a small thumbnail of its anchored frame (rendered with `renderThumb` at the anchored `t` and params), the text, and answers. "Show me" applies the state to the slide behind the drawer (`applyPreset` path).
- **Ask:** a text box with "Attach this moment: n = 101, t = 271.0 s" pre-checked; the state is captured when the box is focused, so pausing then asking is natural.
- Author view (when acting as the author in the prototype, via a "View as author" toggle in the keys dialog): Answer, and **Fold into explanation** / **Make a preset** buttons that mark the question resolved and point at what changed (the actual change is a resubmission in the real pipeline).
- Rail: the Explain button shows a small dot when a piece has answered questions; the drawer's tab shows a count.

**Moderation:** questions go through the same text moderation as explanations (review-pipeline.md "Content"); Report on a question uses the existing reasons.

## Risks / what a skeptic would say
- **Authors go silent** and the tab becomes a graveyard of unanswered questions. Show "usually answers within N days" from history, let reviewers and other viewers answer (marked as such), and let an author turn questions off.
- **Comment sections rot.** Constraints help: questions only (no top-level "nice!"), anchored to a state, one level of answers, no votes on questions.
- **Without accounts it is fake.** Yes: the prototype demonstrates the interaction; identity and storage are PLAN.md's (or GitHub Discussions').

## Effort
**M** (2 days). Touches `index.html` (fourth drawer tab), `app.js` (`renderDrawer` questions branch, ask form, "show me", author toggle, rail dot, key `q`), `catalog.js` (`QUESTIONS` seeds), `users.js` (bylines reuse), `styles.css`, `docs/review-pipeline.md` section 5.

## How to verify
1. elliptic-group-law → Questions: two seeded Q&As with thumbnails at their frames; "Show me" sets b = 0.30 on the slide.
2. Pause at some *t*, ask a question with the moment attached; reload: it persists, with the right thumbnail.
3. Toggle "View as author", answer and "Make a preset": the question shows "answered · became a preset".
4. Keyboard: `q` opens the tab; the ask box is reachable and labelled.

## Review

**Verdict:** build smaller. A question anchored to the exact state is the right social primitive for this audience, but in a localStorage prototype a thread is a diary. Demonstrate the anchor and the hand-off, not a fake conversation.

**Strongest objection:**
- "Questions with no one to answer them, stored only in my browser, are a mock comment section. Seeded Q&As written by fictional authors, shown to real mathematicians, look like astroturf."
- "Every comment section I've seen rots."

**What to cut:**
- The "View as author" toggle.
- The Answer, Fold into explanation and Make a preset buttons.
- The rail dot, the "usually answers within N days" line, and the moderation and Report wiring.
- What stays:
  - A read-only Questions tab with 2–3 seeded Q&As, visibly labelled "sample". Each has its anchored thumbnail and a "Show me" button.
  - An Ask box that builds the question text with the state link attached and copies it, or opens a prefilled discussion URL on the piece's `repo`.
  - localStorage keeps only your own drafts.

**Must be true to keep it:**
- PLAN.md (or the collaborators) commits to a backend for threads (GitHub Discussions per piece repo), and authors agree to answer.
- The seeded Q&As are mathematically correct and genuinely the kind of question a student asks at that frame. elliptic-group-law's "two components when b < …" has to state its *a* and be right.

**Feasibility check:**
- The names exist: `stateOf`/`shareURL`/`readLink` (app.js 106–123), `renderDrawer`, the three `data-dtab` tabs (index.html 68–70; a fourth fits), `userLink`/`pfp`/`USERS` (users.js), `rbtn`, `applyPreset`. review-pipeline.md section 5's "opens a thread with the author" exists.
- `renderThumb(cv,v,t)` (app.js 870) renders with the *current* `getSettings(v).params` and no view. Thumbnails anchored to a question's params need a params (and view) override, plus a poster cache key that includes them; the cache key already includes params.
- `stateOf` now includes `view`, so anchors capture the camera for interactive pieces. Good, but "Show me" must call `setView` too, not only the `applyPreset` path.
- The question text depends on KaTeX (08) only optionally.
- The effort (M, 2 days) is honest for the full design. The cut version is about 1 day.

**Verification script:**
1. elliptic-group-law → Questions: 2–3 Q&As marked "sample", each with a thumbnail showing its own b (not the current slider value).
2. "Show me" on one: the slide behind the drawer sets b and *t* to the anchor, and Customize reflects it.
3. Pause at some *t*, focus Ask: the label reads "Attach this moment: b = …, t = …". Submit: the copied text or opened URL contains a share link that reproduces that frame when opened in a new tab.
4. Keyboard: `q` opens the tab, and the Ask box is labelled and reachable.
