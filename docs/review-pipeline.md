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
| Explanation | `explanation.md` has the sections `What you're seeing`, `Try this`, and a `Reference` line; 150 to 1200 words |
| Alt text | `alt` is 1 to 2 sentences, 40 to 300 characters, and is not the title or the hook |
| Presets | every preset validates with `normalizeParams`; at least one preset |
| Metadata | title ≤ 60 characters, hook ≤ 160, 2 to 6 tags from the vocabulary |
| Duplicates | package hash and module hash are new; near-duplicate module text is flagged for the reviewer |

Size, Imports, Forbidden APIs, Shader loops and Duplicates read one entry,
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
