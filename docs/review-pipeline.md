# How a visualization gets into Loci

Design note for the submission and review pipeline. The author-facing version
is [submitting.md](submitting.md); the module contract is
[module-api.md](module-api.md).

## Principle

Machines check everything about a package except two things: whether the
mathematics in the explanation is true, and whether the piece is worth
featuring. So:

* **Automated checks gate publication.** Nothing a machine can verify is left
  to a person.
* **Humans review the mathematics only**, from a short structured checklist,
  after an LLM pre-pass has done the legwork.
* **Curation never blocks.** A piece that passes the checks is live within
  minutes. Human review decides which lane it is in, not whether it exists.

## 1. Before upload: the checks run locally

The Submit page runs the whole automated suite in the author's browser, using
the same worker runtime the feed uses. The author sees a pass/fail report with
the failing frame or line before anything is sent. The server re-runs the same
suite on receipt, so a tampered client gains nothing.

## 2. The automated gate

### Static

| Check | Rule |
|---|---|
| Manifest | validates against `loci.json` schema v1 (`manifest.js`) |
| Size | JS ≤ 200 KB, WASM ≤ 2 MB, package ≤ 4 MB |
| License | `license` is an OSI identifier (MIT, BSD-2/3, Apache-2.0, GPL-3.0, MPL-2.0, ISC, CC0) and a LICENSE file is present |
| Imports | JS imports only `@loci/kit`; WASM imports only `Math.*` |
| Forbidden APIs | source does not reference `fetch`, `XMLHttpRequest`, `WebSocket`, `importScripts`, `indexedDB`, `localStorage`, `FontFace`, `Image`, `eval`, `Function(` (best-effort lint; the sandbox removes them anyway) |
| Explanation | `explanation.md` has the sections `What you're seeing`, `Try this`, and a `Reference` line; 150 to 1200 words |
| Alt text | `alt` is 1 to 2 sentences, 40 to 300 characters, and is not the title or the hook |
| Presets | every preset validates with `normalizeParams`; at least one preset |
| Metadata | title ≤ 60 characters, hook ≤ 160, 2 to 6 tags from the vocabulary |
| Duplicates | package hash and module hash are new; near-duplicate module text is flagged for the reviewer |

### Dynamic (in the sandbox)

Each check runs at three box sizes (335×490 phone, 700×300 landscape,
1100×700 desktop), two pixel ratios, and three palettes (night, graph, high
contrast). A failure reports the size, palette and `t`.

| Check | Rule |
|---|---|
| Setup | `setup` resolves within 8 s with no error |
| Budget | over 20 s of frames: p95 frame time < 12 ms, max < 40 ms on the reference machine |
| Memory | WASM memory stays under 64 MiB; JS heap growth over 60 s under 32 MB |
| Stays in the box | pixels outside `box` equal `theme.bg` at every sampled frame |
| Not blank | at least 2% of box pixels differ from `bg` at t = 2, 10, 30 |
| Params matter | each param at min, default and max renders without error; min and max produce frames that differ from default |
| Theme honored | swapping the palette changes the frame; with `labels:false` no text is drawn (commands mode: host-enforced; pixels mode: OCR spot check on the frame) |
| Deterministic | two fresh instances at the same `t`, params and seed produce identical pixels at t = 3, 11, 29 |
| Time jumps | seeking backwards (t = 30 → 2) renders without error and matches a fresh instance at t = 2 within tolerance |
| No flashing | over any 1 s window, box-average luminance crosses a 10% change no more than 3 times (WCAG 2.3.1) |
| Reduced motion | `motion: "static"` pieces render a non-blank frame at `t = 0` |

### Content

| Check | Rule |
|---|---|
| Frames | an image-safety classifier scores captures at t = 1, 5, 15, 45 and at each preset; above threshold → held for an editor |
| Text | explanation, title, hook and alt pass text moderation |
| Links | explanation links resolve (200) and are not shorteners |

A package that fails any gate check is returned to the author with the report.
Nothing is queued for a person.

## 3. Lanes and badges

| Lane | Badge | How a piece gets there |
|---|---|---|
| **New** | Checked by machine | passes the gate; visible in Browse, the New chip and tag feeds immediately |
| **Feed** | Community reviewed | two reviewer approvals of the mathematics |
| **Picks** | Editor's pick | editorial; monthly roundups draw from here |

Everything is published. Review only changes the lane.

## 4. Human review of the mathematics

Reviewers are community members with at least two Community-reviewed pieces
of their own, or an invited editor. A review is a ten-minute pass over a
structured form, not a referee report:

1. Does the picture show what the explanation says it shows?
2. Is every stated fact correct? (Mark any that are not, with the line.)
3. Do the references exist and say what is claimed?
4. Is anything overstated, or missing a hypothesis that matters?
5. Free text: one suggestion to the author (optional).

Before a reviewer opens the form they see an **LLM pre-pass report**: a list
of the explanation's checkable claims, each marked supported / unsupported /
could not verify, with a citation check on each reference (does it exist,
does the page or chapter match). The pre-pass is an aid. It cannot approve or
reject, and reviewers are asked to disagree with it when they know better.

Two approvals move the piece to the Feed lane. One rejection with a marked
fact goes back to the author with the note; the author resubmits. A split
goes to an editor. Reviewers never see each other's answers before submitting.

Target: a median of 48 hours from New to Feed.

## 5. After publication

* Every slide has **Report**, with reasons: mathematics is wrong, not a
  visualization of mathematics, offensive, license problem, copies another
  piece. A report with a reason opens a thread with the author.
* A piece with an unresolved report leaves the Feed lane after 72 hours and
  returns when the thread is closed. Three upheld reports retire it.
* **Metrics are not review.** Likes and saves drive For You, never the lane.

## 6. Versions

* A resubmission is a new package hash. Old share links keep working because
  they name the hash (module-api.md, section 5). The feed shows the newest
  approved version.
* The gate re-runs on every version. Human review re-runs only when
  `explanation.md`, `alt`, `title` or `hook` changed; a code-only change keeps
  its lane.
* Authors may yank a version. Links to a yanked hash show the next approved
  version with a note.

## 7. What this costs us

Per submission: a sandbox run of about 90 s of CPU for the dynamic suite, one
classifier pass on about eight frames, one LLM pre-pass over about 800 words,
and twenty minutes of volunteer time. Nothing in the pipeline requires an
editor unless two reviewers disagree or a content check fires.
