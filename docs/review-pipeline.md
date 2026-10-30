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
| Targets | if `targets` is present (module-api.md, "Targets"): ids are `desktop`, `mobile`, `download`, each at most once, and at least one of desktop and mobile; desktop and mobile have a runtime, entry and render; a mobile target uses only `canvas2d` or WASM `pixels`/`commands` and never requires `webgl2`; a download target has `url` and `format` (`zip`, `html`, `app`) and nothing runnable |
| Target params | a target's `params` lists only keys the piece declares |
| Size | per target entry: JS ≤ 200 KB (≤ 2 MB for a `desktop` target), WASM ≤ 2 MB; package ≤ 4 MB |
| License | `license` is an OSI identifier (MIT, BSD-2/3, Apache-2.0, GPL-3.0, MPL-2.0, ISC, CC0) and a LICENSE file is present |
| Imports | JS imports only `@loci/kit` and the pinned `@loci/three`; WASM imports only `Math.*` |
| Forbidden APIs | source does not reference `fetch`, `XMLHttpRequest`, `WebSocket`, `importScripts`, `indexedDB`, `localStorage`, `FontFace`, `Image`, `eval`, `Function(` (best-effort lint; the sandbox removes them anyway) |
| Shader loops | every JS string that looks like GLSL (contains `void main`, `gl_FragCoord` or `#version 300 es`) is scanned: a `while` (or `do … while`) loop fails; every `for` must have a trip count bounded by an integer literal or a `const int`/`#define`, or, when the bound is a uniform, a literal cap with `if (i >= N) break;` (`N` literal or const) in its body, otherwise a warning with the line. The watchdog cannot stop a GPU stuck in a shader, so this is checked before the code runs |
| Explanation | `explanation.md` has the sections `What you're seeing`, `Try this`, and a `Reference` line; 150 to 1200 words, not counting formulas. TeX in `$…$` / `$$…$$` is found by the same tokenizer the Explanation tab renders with (`tex.js`: code is skipped, `\$` is a literal) and every span must parse with the pinned KaTeX (`throwOnError: true`, `strict: "error"`, `trust: false`, `maxExpand: 1000`), otherwise a failure with the line and KaTeX's message; custom macros (`\def`, `\newcommand`, `\let`, …) and `\href`, `\url`, `\includegraphics`, `\html…` fail by name; an unmatched `$` or a formula over 400 characters is a warning |
| Alt text | `alt` is 1 to 2 sentences, 40 to 300 characters, and is not the title or the hook |
| Presets | every preset validates with `normalizeParams`; a preset's optional `view` is plain JSON of at most 2 KB (or `null`); at least one preset |
| Pointer | a `pointer` declaration (module-api.md, "Pointer") has a known `mode` (`none`, `orbit`, `pan-zoom`, `custom`), boolean `drag`/`click`/`keys`/`wheel` and a `hint` of at most 80 characters, on the manifest or on a desktop/mobile target (never on the download target); a module that declares a mode other than `none` should read `events` in `draw` or define `onEvent`, and a module with `getView` should also have `setView`, otherwise a warning. WASM modules receive no events in API v1, so a WASM target that declares pointer is a warning |
| Metadata | title ≤ 60 characters, hook ≤ 160, 2 to 6 tags from the vocabulary |
| Duplicates | a module identical (SHA-256) to any catalog module under another id fails. A package with a catalog piece's id is an update only if at least one of its modules differs from the published ones; an unchanged package under that id fails (a remix or copy needs its own id), and in an update an unchanged entry passes. Near-duplicate module text (≥ 80% of 5-token shingles shared with another piece) is a warning for the reviewer. The Submit page's built-in samples are compared as if their catalog piece were not there yet |

Size, Imports, Forbidden APIs, Shader loops, Pointer and Duplicates read one entry,
so they run once per target (`size@desktop`, `size@mobile`, …); the others
run once per package. A piece without `targets` has one target, `any`.

### Dynamic (in the sandbox)

Each check runs once per runnable target, with that target's matrix. A
failure reports the target, size, palette and `t`.

| target | matrix | budget (p95) |
|---|---|---|
| none (`any`) | 335×490 phone, 700×300 landscape, 1100×700 desktop; three palettes (night, graph, high contrast); one run at pixel ratio 2 | < 12 ms |
| `mobile` | 335×490 and 700×300 at pixel ratio 1 and 2 (night), plus graph and high contrast at ratio 1 | < 12 ms |
| `desktop` | 1100×700 and 700×300 at pixel ratio 1, three palettes | < 16 ms, CPU + GPU |

A target that needs WebGL2 on a machine without it is reported as
**skipped** with that reason, never as failed; the pipeline's runners have a
GPU, and the Submit page asks the author to re-run on one. Params a target
does not list in its `params` are skipped for that target. On a mobile
target, a range param whose min or max renders the same as its default (the
module clamps it, as `mandelbrot-zoom` caps iterations at 200) is a warning,
not a failure; the reviewer checks that the readout and the explanation
state the clamp. The report groups checks by target.

| Check | Rule |
|---|---|
| Setup | `setup` resolves within 8 s with no error |
| Budget | over 20 s of frames: p95 frame time < 12 ms (16 ms for a `desktop` target), max < 40 ms on the reference machine. For `webgl2` pieces the frame time is CPU + GPU when `EXT_disjoint_timer_query_webgl2` is available (the report says which was measured); the reference run also plays them on a mid-range phone GPU |
| Memory | WASM memory stays under 64 MiB; JS heap growth over 60 s under 32 MB |
| Stays in the box | pixels outside `box` equal `theme.bg` at every sampled frame |
| Not blank | at least 2% of box pixels differ from `bg` at t = 2, 10, 30 |
| Params matter | each param at min, default and max renders without error; min and max produce frames that differ from default |
| Theme honored | swapping the palette changes the frame; with `labels:false` no text is drawn (commands mode and returned label lists, including every `webgl2` piece's: host-enforced; `fillText` is also watched; pixels mode: OCR spot check on the frame) |
| Deterministic | two fresh instances at the same `t`, params and seed produce identical pixels at t = 3, 11, 29 |
| Time jumps | seeking backwards (t = 30 → 2) renders without error and matches a fresh instance at t = 2 within tolerance |
| Played vs seeked | a fresh instance played from t = 0 to about t = 3 at real time, then paused and captured, matches a second fresh instance seeked straight to the same `t` (at most 0.5% of sampled pixels differ). A seek, and every frame of a recorded clip, is drawn at an exact `t` with `dt = 0`, so a module that advances its state by `dt` passes the two checks above with identical frozen frames; this one fails it, with a message that recording and share links depend on seek-exactness. Skipped for `motion: "static"` |
| No flashing | over any 1 s window, box-average luminance crosses a 10% change no more than 3 times (WCAG 2.3.1) |
| Reduced motion | `motion: "static"` pieces render a non-blank frame at `t = 0` |
| Pointer events | only for a target that declares pointer input: on the small cell at t = 4, the checker sends a scripted sequence through the host handle (`engage`, a 100 px drag from 50 px left of the box centre, 3 wheel ticks of −100 px, a click, an `ArrowRight` key, `release` as Esc would), each kind only if the declaration asks for it. It requires no error, a frame that differs from the untouched one, and the identical frame when the same sequence is replayed on a fresh instance |
| View round-trip | the view the module reports after that sequence (`getView()` or `{view}` from `draw`) is at most 2 KB, and a fresh instance mounted with it (`setView`) draws the identical frame. No view after the picture changed is a warning: share links would not keep what the viewer did |

### Content

| Check | Rule |
|---|---|
| Frames | an image-safety classifier scores captures at t = 1, 5, 15, 45 and at each preset; above threshold → held for an editor |
| Text | explanation, title, hook and alt pass text moderation |
| Links | explanation links resolve (200) and are not shorteners. Live links (submitting.md section 6, "Live links": `#param:`, `#preset:`, `#t:`, `#state:`) are exempt from that and are checked locally against `loci.json` with `liveLink` (`manifest.js`, the parser the Explanation tab uses): an unknown param, an unknown preset label or index, a time that is not a number ≥ 0, or a state that is not base64url JSON of a valid lesson stop fails with its line; an unknown `#scheme:` is a warning. The detail counts the live links and the "Why it works" steps |

A package that fails any gate check is returned to the author with the report.
Nothing is queued for a person.

## 3. Lanes and badges

| Lane | Badge | How a piece gets there |
|---|---|---|
| **New** | Checked by machine | passes the gate; visible in Browse, the New chip and tag feeds immediately |
| **Feed** | Community reviewed | two reviewer approvals of the mathematics |

Monthly roundups draw from **distinctions** (`docs/distinctions.md`), not
from a third lane or an editor's pick. A distinction sits on top of the
Feed lane rather than beside it:

* A **jury** of three reviewers, rotating monthly, awards at most one
  distinction per category (Clearest single idea, Best teaching piece,
  Research picture, Craft, Best explanation) to pieces that reached the
  Feed lane, or were re-reviewed after an explanation change, that month.
  Any category may go unawarded.
* The jury is **blind to likes**: the jury form never shows like counts,
  save counts or watch time (the rule in section 5).
* **Nominations are reasoned**: one required sentence of why, from any
  viewer or reviewer. Reasons go to the jury; counts only gate the
  shortlist and are not shown.
* Each award is a **citation**: two sentences that name what is seen, a
  parameter and why it matters, signed by the jurors and shown on the
  slide ("◆ Teaching · Oct 2026"), at the top of the Explanation tab and
  in the roundup post. A juror's own pieces are not eligible that month.

Everything is published. Review only changes the lane. A piece with
desktop and mobile targets has one lane: both versions move together, and
both are what the reviewers approve (section 4).

## 4. Human review of the mathematics

Reviewers are community members with at least two Community-reviewed pieces
of their own, or an invited editor. A review is a ten-minute pass over a
structured form, not a referee report:

1. Does the picture show what the explanation says it shows? For a piece
   with desktop and mobile targets, the form shows both side by side at the
   same params and `t`, and the reviewer confirms they show **the same
   mathematics**: the same objects, the same camera path, the same
   readouts. The mobile one may be coarser (lines for tubes, half
   resolution, a clamped iteration count stated in the readout and the
   explanation) but may not show something different. A mismatch is a
   marked fact like any other.
2. Is every stated fact correct? (Mark any that are not, with the line.)
3. Do the references exist and say what is claimed?
4. Is anything overstated, or missing a hypothesis that matters?
   If the explanation has a "Why it works" step-through: does each step's
   picture show what the step claims, and does a step the picture cannot
   show say so?
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

**Reviewers are named on the piece.** Once a piece is in the Feed lane, its
Explanation tab ends with "Mathematics checked by @a and @b in *month*",
each handle linking to the reviewer's profile, and each profile lists the
pieces its owner checked under "Reviews". There are no counts of reviews or
errata and no ranking of reviewers. On GitHub the approvals are public on the
pull request anyway, so naming reviewers adds no exposure the PR does not
already have. The owners must decide who reviewers are before this credit
means anything: this section says community members with two
Community-reviewed pieces of their own or invited editors, while PLAN.md (its
overview: "two reviewers are assigned, from moderators and admins") and
Wishlist.md ("two moderators … are automatically assigned as reviewers") say
moderators and admins.

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
