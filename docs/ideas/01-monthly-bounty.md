# 01 · Monthly bounty: "Picture this"

## Pitch
Anyone can post a challenge ("show me why the Hopf fibration links every pair of fibres", "make the Riemann–Hurwitz count visible"), the community votes, the editors pick one challenge each month, and the best piece answering it wins a named prize and a month at the top of the feed. It turns the request list mathematicians already keep in their heads ("I wish someone had drawn X") into a public, dated, citable queue.

## Why mathematicians would care
- **The poster** is usually a teacher or researcher who needs a picture for a course or a talk and cannot make it. They share the challenge link with colleagues and their department ("vote for this, I want it for MATH 412 in January"). That is recruitment with a concrete ask, the best kind.
- **The solver** is a grad student or postdoc who can code. A bounty win is a line on a CV that is *dated and specific* ("Loci bounty, Nov 2026: the Weierstrass ℘ function as a torus cover"), and it comes with an audience that was already waiting for exactly this piece. They share the winning link because people asked for it.
- **Everyone else** gets a monthly reason to come back that is about mathematics, not about the app: what was asked, what got built, which answer won and why.
- Unpicked challenges do not disappear: they are a standing "wanted" list that any author can answer any month, so the list has value even when the prize is small.

## What exists today in the prototype that it builds on
- `POSTS` in `catalog.js` and `renderBlog` / `openPost` in `app.js`: the announcement and the results are blog posts, and a post's `vizIds` already becomes a "Watch these in the feed" playlist (`data-playlist` → `setFilter({type:'playlist', …})`). The results post plays all entries.
- `renderSubmit`, `loadPkg`, `LociChecks.run` (`checks.js`): the in-browser gate. A bounty entry is an ordinary package with one extra manifest field.
- Lanes in `docs/review-pipeline.md` section 3 and `laneBadge` in `app.js`: an entry must reach **Community reviewed** to be judged, so the mathematics is checked by the existing two-reviewer form before any judge looks at it.
- `NL_LISTS` / `nlForm`: "Best of the month" already exists; the bounty winner and next month's challenge are its natural first item.
- `store` (localStorage wrapper) for votes in the prototype.

## Design
**Data model** (`catalog.js`, a new `BOUNTIES` array, plus votes in `localStorage`):
```js
{ id:'2026-11', status:'open',            // proposed | shortlisted | open | judging | closed
  title:'The Weierstrass ℘ function as a torus cover',
  ask:'Show that ℘ is doubly periodic and that z ↦ (℘, ℘′) lands on y² = 4x³ − g₂x − g₃.',
  reference:'Silverman, The Arithmetic of Elliptic Curves, 2nd ed., VI.3',
  postedBy:'@kmoreau.geom', tags:['Complex analysis','Elliptic curves'],
  opens:'2026-11-01', closes:'2026-11-30', judged:'2026-12-07',
  prize:'A printed A2 poster of the winning frame and $150 (sponsor: TBD)',
  jury:['@fatou.dust','@villarceau','The Loci editors'],
  entries:['weierstrass-torus'], winner:null, honorable:[], citation:null }
```
`loci:bounty-votes` = `{ "<proposal id>": true }` in localStorage.

**Lifecycle (one month, fixed dates so it is predictable):**
1. **Post** (any time). A "Propose a challenge" form: title (≤ 80 chars), the ask (≤ 600 chars, must say *what should be visible*, not just a topic), a reference (required: the same rule as explanations, it must be checkable), 1–3 tags. Proposals land in the `proposed` list. Prototype: saved to `loci:bounty-proposals`; production: a GitHub issue template in the registry (PLAN.md owns that).
2. **Vote** (continuous). Approval voting, at most **three active votes per person** at a time, so a vote means "of everything here, I want this". Vote counts are shown only as rough buckets ("a few", "many") until the shortlist is cut, to blunt bandwagons.
3. **Pick** (on the 25th). The five most-voted proposals that meet the feasibility bar (fits the module API, including GPU and targets; has a reference; is one idea) become the shortlist; the editors pick one and write two sentences on why. Picking among the top five rather than taking the top one keeps a campaign from deciding it, and lets editors rotate areas (no three geometry months in a row).
4. **Open** (1st to last day of the month). A blog post (`POSTS` entry, `kind:'bounty'`) announces it, goes out on "Best of the month", and pins a "This month's challenge" card at the top of Browse and as the feed's end card (`endHTML`). Entrants add `"bounty": "2026-11"` to `loci.json`; the Submit page shows "Answering: The Weierstrass ℘ function…" in the report header.
5. **Judge** (first week of the next month). Eligible: Community reviewed by the 5th (so two reviewers already confirmed the mathematics is right). A jury of three (one editor, two reviewers from the challenge's tags, none of them entrants) scores a short rubric, blind to likes: *does it show what was asked* (0–3), *one idea, one knob* (0–3), *survives the phone* (0–2), *explanation checkable and clear* (0–2). The challenge poster writes a non-scoring note. Ties go to the earlier submission.
6. **Show the winner.** The winning slide gets a "Bounty winner · Nov 2026" mark in the caption (beside `laneBadge`), the jury's citation in its Explanation tab, a week pinned first in the feed, and the results post plays every entry. Honorable mentions get the mark without the pin. The challenge page keeps every entry forever: it is the canonical answer list for "how do people draw ℘".

**UI placement:** a "Challenges" section in Blog (above the post list) with tabs Open · Proposed · Past; proposals render as rows with a vote toggle and the vote bucket. No new top-level tab.

**Prize:** keep it small and non-cash-first (a printed poster of the winning frame, a book from the reference list, a named mention in the newsletter); cash only with a sponsor. The citation and the pin are the real reward.

## Risks / what a skeptic would say
- **"Nobody will enter."** Likely in the first months. Mitigation: editors seed the first three challenges and line up one entrant each privately; an unpicked or unanswered month is announced honestly ("no winner; the challenge stays open") rather than awarded to a weak entry.
- **Vote brigading** without accounts. The prototype cannot prevent it; production needs PLAN.md's accounts. The top-five-then-editors step limits the damage either way.
- **Prize legality.** A judged contest of skill is generally treated differently from a lottery, but rules vary by country; this needs a short rules page and someone to check it before cash is involved. (Not legal advice.)
- **Judging is work** for volunteers who already do reviews. Keep the rubric to four numbers and cap entries considered at ten (the earliest ten Community-reviewed).
- **It rewards speed over depth.** A month is short for hard mathematics; allow a challenge to be re-opened in a later month with the same id suffix (`2026-11b`).

## Effort
**M** (2–3 days for the prototype). Touches `catalog.js` (`BOUNTIES`, one bounty post), `app.js` (Challenges section in `renderBlog`, vote toggles, proposal form, winner mark in `slideHTML`, end card in `endHTML`), `checks.js` (static check: `bounty` id exists and is open; warn otherwise), `manifest.js` (accept the optional `bounty` field), `styles.css`, `docs/submitting.md` (one paragraph), `docs/review-pipeline.md` (judging section).

## How to verify
1. Blog → Challenges → Proposed: vote on three proposals; the fourth vote is refused with a message; reload and the votes persist.
2. Propose a challenge without a reference: the form refuses it.
3. Open tab: the November challenge, with dates, jury and prize; "Watch entries in the feed" plays the entries.
4. Submit → Try a sample package with `"bounty":"2026-11"` added: the report says "Answering: …"; change it to `"2026-99"`: a warning.
5. Past tab: October's challenge shows the winner; its slide in the feed carries the "Bounty winner" mark and the Explanation tab shows the citation.

## Review

**Verdict:** build smaller. Ship a "Wanted" list plus one open challenge, with honest sample data. Cut the jury, the prize and the winner machinery until a real month has real entries.

**Strongest objection:** "A month-long contest rewards whoever codes fastest, not whoever understands the object. And no hiring committee will read 'Loci bounty, Nov 2026' as a credential, so the CV argument is wishful. What I actually want is the list of requests, so I can see what people need drawn. The prize and the voting are overhead on top of that."

**What to cut:**
- Cut the jury, the rubric, the Past tab and the winner/honorable-mention marks in `slideHTML`. No real piece has won anything, and a "Bounty winner · Oct 2026" mark on a real catalog piece would be a fabricated award.
- Cut the prize text (cash, sponsor, the legality note) and the shortlist-on-the-25th mechanics. Keep those in the doc only.
- Cut the vote buckets for seeded proposals ("a few"/"many"). With localStorage there are no other voters, so any count is invented. Show only *your* votes, cap them at 3, and label seeded proposals "sample".
- Cut the `checks.js` static check. Show "Answering: …" or "unknown challenge" in the `renderSubmit` report header instead (the report is page-side and already has the catalog).
- Cut the end-card pin and the feed pin.
- Keep: a Challenges block at the top of Blog with Open/Proposed tabs; one seeded open challenge with dates and an "entries so far: none" line (honest); 3–5 seeded proposals; a vote toggle (≤3); a Propose form that requires a reference and a "what should be visible" sentence; persistence under `loci:bounty-*`.

**Must be true to keep it:**
- Nothing in the UI implies activity that did not happen: no fake counts, no fake winners, every sample row marked.
- The ask field forces a *visible* claim (refuses a bare topic such as "Hopf fibration").
- The Wanted list is still useful when no month is running.

**Feasibility check:**
- Every cited name exists: `POSTS`, `renderBlog`, `openPost`, `data-playlist`, `setFilter`, `renderSubmit`, `loadPkg`, `LociChecks.run`, `laneBadge`, `NL_LISTS`, `nlForm`, `store`, `slideHTML`, `endHTML`.
- `manifest.js` needs no change. `validateManifest` ignores unknown top-level fields, so `"bounty"` already passes. Add a type check (string matching `^\d{4}-\d{2}[a-z]?$`) only if you want the warning.
- Verification step 4 in the proposal is not doable as written. "Try a sample package" builds its package with `LociChecks.samplePackage`, and the UI cannot edit that package's `loci.json`. You need either a zip fixture or a "Try a bounty entry" sample button.
- `weierstrass-torus` does not exist. The open challenge must show zero entries, or point at an existing piece only as a labelled example.
- Effort: M (2–3 days) is honest for the full design. The cut version is about 1 day.

**Verification script:**
1. Blog: the Challenges block is above the posts. The Open tab shows the November challenge with its dates, the ask, the reference and "No entries yet".
2. Proposed tab: vote on 3 proposals. The 4th is refused with a message. Reload, and the 3 votes persist. No other vote counts appear anywhere.
3. Propose with an empty reference: refused. Propose with a bare topic in the ask: refused or warned. Propose a valid challenge: it appears in Proposed, marked as yours.
4. Submit: load the bounty sample or zip with `"bounty":"2026-11"`. The report header says "Answering: …". With `"2026-99"` it shows a warning, and the package still passes.
5. Feed: no slide carries a bounty or winner mark.
