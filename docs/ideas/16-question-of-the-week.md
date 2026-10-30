# 16 · Question of the week: one piece, one question, answers as states

## Pitch
Each week the editors pin one piece with one question that the picture can answer ("For which n does the cardioid come back at some k < n? Find the smallest k for n = 97."), and viewers answer by submitting a *state* (params + *t*) plus a sentence; the next week the editors reveal the answer, credit the clearest responses, and pin the next question. It is the puzzle column, the format mathematicians have shared with each other for a century, built on the thing Loci does that no puzzle column can: the answer is a live, checkable picture.

## Why mathematicians would care
- **It is the thing you forward.** "This week's Loci question" is a link a professor posts in the class channel on Monday and discusses on Friday; a seminar organizer opens tea with it. Puzzles are mathematicians' native social object.
- **It rewards understanding, not attendance:** you answer when you have something, there is no penalty for skipping a week.
- **It gives every piece a second life** and shows newcomers how to *use* a piece (change the knob, find the moment), which is the core skill the app teaches.

## What exists today in the prototype that it builds on
- Presets with `t` (`applyPreset`) and the times-table preset "n = 101, wait for k = 51" (already a worked example of exactly this kind of question).
- `stateOf` / `readLink` for answers; lessons (03) if an answer needs more than one state.
- `POSTS` and `renderBlog` for the weekly reveal post; `nlForm` / `NL_LISTS` ("Best of the month"; the newsletter already promises "one open problem with a picture").
- The feed end card (`endHTML`) and Browse page head as pin locations.

## Design
**Data:** `WEEKLY = [{id:'2026-w44', v:'times-table', q:'…', hint:'…', opens:'2026-10-26', reveal:'2026-11-02', answer:{text:'…', state:{p:{n:97}, t:…}}, credited:['@may.iterates'], picks:[{by, state, text}]}]` in `catalog.js`. Answers in the prototype: `loci:weekly:<id>` = `{state, text, at}`.

**UI:**
- A "This week" card at the top of the feed's first slide caption area (dismissible per week) and at the top of Browse: the question, the piece's thumbnail, **Try it** (jumps to the piece with Customize open).
- While on that piece, a slim bar above the caption: "This week's question · Answer with this moment". **Answer** captures `stateOf(v)` and asks for one sentence (≤ 280 chars).
- Your answer shows as "Answered · revealed Monday" with Edit until the reveal.
- **Reveal:** the weekly post (a `POSTS` entry, `kind:'weekly'`) shows the question, the answer as a state link ("Show me"), 2–3 credited responses quoted with their states, and links last week's discussion. Answers are self-checked in the prototype: after the reveal date (or a "Reveal now" debug toggle), your stored answer is shown beside the official one.
- Archive: Blog → "Questions" list; each question stays answerable forever, with the answer behind a "Show answer" button.

**What it is not:** not scored, no leaderboard, no streak. Credit is a quoted, named response in the reveal post, chosen for clarity.

## Risks / what a skeptic would say
- **Weekly is a lot of editorial work.** One question takes 20 minutes to write if the piece is good; the author of the piece can be asked to write it (a nice reason to contact them), and monthly is the fallback cadence.
- **Answers are not automatically gradable.** Some are (a param value, a *t*), most are a sentence; the editors read them. At prototype scale that is fine; at scale, credit the first ten clear ones.
- **Overlap with bounties (01).** Bounties ask for *new pieces*; the question asks for *understanding of an existing one*. Different people, different effort.

## Effort
**S–M** (1 day). Touches `catalog.js` (`WEEKLY`, one reveal post), `app.js` (This week card, answer bar, capture/edit, reveal view in `renderBlog`), `styles.css`.

## How to verify
1. Feed: the first slide shows "This week" with the question; Try it opens times-table with Customize.
2. Set n = 97, scrub to the moment you believe, Answer with a sentence; reload: "Answered", editable.
3. Toggle Reveal now (keys dialog, debug): your state and the official answer side by side; "Show me" on the official answer applies its state.
4. Blog → Questions: last week's question with credited responses quoted.

## Review
**Verdict:** build smaller. The puzzle column is the most forwardable format on this list. In a static prototype, though, answers go nowhere, so ship one question with a self-check reveal and leave out the weekly machinery.

**Strongest objection:** "I submitted my answer and it went into my own browser's localStorage. No editor will ever read it, credit it or reply to it. That is a quiz pretending to be a column. And the sample question is weak: 'for which *n* does the cardioid come back' is answered by 'odd *n*, at *k* = (*n*+1)/2', which the existing n = 101 preset's note already gives away."

**What to cut:**
- The weekly cadence, the archive, `opens`/`reveal` dates, `credited`/`picks` and the "Reveal now" debug toggle. With 13 pieces, a weekly question exhausts the catalog in a quarter, and the editorial cost is real.
- Ship **one** pinned question as a blog post (`kind:'question'`) plus a slim on-piece bar. **Answer** stores `{state, text}`, and **Show answer** compares the stored state with the official one.
- For real submissions in the prototype, **Send to the editors** opens a prefilled GitHub Discussion or issue link containing the share URL and the sentence. That is honest, and it is the only channel that reaches a person.
- No card on the feed's first slide. It competes with the piece. Use the Browse head and the end card (`endHTML`).

**Must be true to keep it:**
- The question cannot be answered from the existing preset notes or the explanation, and its answer is a *state* (a param and a *t*), not just a number you could type. Pick a question where finding the moment is the work.
- Editors must name who writes question 2 before question 1 ships.

**Feasibility check:**
- Verified to exist: `applyPreset`, `stateOf`, `readLink`, `POSTS`, `renderBlog`, `openPost`, `endHTML`, `nlForm`/`NL_LISTS`. The newsletter blurb does say "one open problem with a picture" (app.js:927).
- The times-table preset `{label:'n = 101, wait for k = 51', t:271}` is real, so *k* is driven by *t* and an answer state can encode it.
- There is no post URL (`?post=`). The blog is an in-app view, and the hash is taken by site styles. A forwardable "this week's question" link must be `?v=times-table&q=<id>` or a new `?post=` boot path (shared with 13).
- It touches no part of the module API, worker or checks.
- The 1-day estimate is plausible for the cut version. The full version (archive, reveal view, editing) is 2 days.

**Verification script:**
1. Browse: a "Question" head card with the question and a thumbnail. **Try it** opens times-table with Customize open and the question bar above the caption.
2. Set *n* = 97, scrub to the moment you believe, click **Answer**, and type a sentence. Reload: "Answered", editable.
3. **Show answer**: the official state appears beside yours. **Show me** applies it (params and *t*), and the callout explains why.
4. **Send to the editors** opens github.com with the share URL and your sentence prefilled. Nothing is sent from Loci.
5. Read the times-table explanation and preset notes: none of them states the answer.
