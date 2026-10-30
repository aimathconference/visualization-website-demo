# 18 · "Found by": viewer-discovered states become credited presets

## Pitch
Let any viewer propose a state they found ("r = 3.8284: a period-3 window appears out of chaos") as a candidate "Try this" preset; the author accepts the good ones into the manifest, and the preset carries "found by @viewer" forever. This is the gamification that fits mathematicians: credit for a discovery, attributed and permanent, the same currency as a named lemma or an OEIS contribution, with no points, levels or streaks.

## Why mathematicians would care
- **The finder** shares the slide with "my preset is in this now" to friends and their class; a student who found the period-3 window has a public, specific, mathematically meaningful credit.
- **The author** gets better presets than they would find alone, from people who poked at the piece seriously.
- **Everyone** gets presets that encode real discoveries. Presets are already where the "aha" lives (submitting.md: "your presets should take people straight to them").

### Why not streaks, points or levels
Streaks punish exactly the behaviour this audience values (thinking for a week and coming back with something), and mathematicians' schedules are bursty around teaching terms and deadlines; a broken streak is a reason to leave. Points and levels for likes or watch time reward consumption, which the review pipeline already refuses to let affect lanes ("Metrics are not review"). The motivators that work for mathematicians are **attribution** (this idea, 17, 02), **puzzles** (16, 01), and **being useful to students** (03, 04). Every gamified element here should be something you would put on a CV or tell a colleague about without embarrassment.

## What exists today in the prototype that it builds on
- `manifest.presets` (`{label, params, t?, note}`), `presetPills`, `applyPreset`, `showCallout`, and the Customize "Try this" list in `renderCustomize`.
- `stateOf(v)` for capturing what the viewer is looking at; `normalizeParams` so a proposal is always a valid state.
- The review rules (docs/review-pipeline.md section 6): a manifest change that adds a preset is a code-or-metadata change; presets are validated by the static "Presets" check (`normalizeParams` on each, at least one).
- Questions (11): "Make a preset" from an answered question is the same accept flow.

## Design
**Manifest:** presets gain an optional `foundBy: "@handle"` (and `foundAt: "2026-10"`). `manifest.js` accepts it; checks validate that it is a handle-like string.

**Propose (viewer):** in Customize under "Try this", **Suggest this as a preset**: captures `stateOf(v)` (params and *t*), asks for a label with the value in it (the same rule as authored presets: "r = 3.83, period 3") and a one-sentence note on what to look for. Stored in `loci:proposals:<id>`; production: an issue on the piece's repo (stub link "Send to the author on GitHub" with a prefilled issue body containing the JSON).

**Accept (author view, toggled in the keys dialog as in 11):** the Customize "Try this" list shows pending proposals in a separate group with Accept / Decline; Accept appends the preset (prototype: to the in-memory manifest and `loci:accepted:<id>`), shows "Copy JSON for loci.json" so the real author can paste it into their repo.

**Display:** an accepted preset's pill reads "r = 3.83, period 3" with a small "found by @may.iterates" in the callout and in the Customize preset card (`<small>`); the finder's profile (`renderUser`) gets a "Found" section listing their accepted presets with links that apply them.

**Limits:** a piece shows at most 6 presets in the pill row (the rest in Customize), so accepted ones do not crowd the slide; the author orders them.

## Risks / what a skeptic would say
- **Authors won't triage.** Then proposals stay pending and visible only to their proposer; nothing breaks. Editors can nudge authors in the monthly email.
- **Credit for trivial states** ("n = 200, default"). The proposal form refuses a state equal to the defaults or to an existing preset, and the author decides.
- **Manifest changes re-trigger review?** Per review-pipeline.md section 6, human review re-runs only when explanation, alt, title or hook change; a preset-only change keeps its lane, but the "Try this" section of the explanation should mention the new preset, which would re-run review. Decide: presets with `foundBy` may be added without touching the explanation.

## Effort
**S–M** (1 day). Touches `manifest.js` (`foundBy`), `checks.js` (validate it), `app.js` (Suggest button, author accept group, callout/credit text in `showCallout` and `renderCustomize`), `users.js` (Found section), `catalog.js` (one seeded accepted preset, e.g. the logistic period-3 window), `docs/module-api.md` and `docs/submitting.md`.

## How to verify
1. logistic-bifurcation → Customize: set r to 3.83, Suggest this as a preset, label "r = 3.83, period 3"; reload: pending proposal shown to you.
2. Try suggesting the default state: refused.
3. Toggle author view: Accept; the pill appears on the slide; tapping it shows a callout with "found by @you".
4. The seeded accepted preset shows "found by @may.iterates", and that profile lists it under Found.
5. Submit a sample whose preset has `foundBy: 42`: the Presets check fails.

## Review
**Verdict:** build smaller. "Found by @x" on an accepted preset is the right kind of credit for this audience and costs little. The in-app author triage queue is make-believe without accounts, so make the proposal a prefilled GitHub issue and show only accepted credits.

**Strongest objection:** "Credit means something only if the discovery is real, and your flagship example isn't. The logistic piece's `r` param is integer hundredths (`min:250, max:400, step:1, default:383`). 'r = 3.8284' cannot be represented, r = 3.83 **is the default**, and 'r = 3.82, intermittency' is already an authored preset. A 'found by' badge on the default state is exactly the trivial credit you say you'll refuse."

**What to cut:**
- The author view, Accept/Decline and `loci:accepted:<id>`. A local accept that only the proposer's browser sees demonstrates nothing.
- **Suggest this as a preset** captures `stateOf(v)` plus a label and note, refuses defaults and existing presets, and opens a prefilled GitHub issue on `v.repo` with the preset JSON (with `foundBy` filled in). Keep a local "Suggested" list.
- Ship one seeded accepted preset with `foundBy` that shows real discovery, on a piece whose params can express it. Credit someone **other than the author**: the file's seed, @may.iterates, is the logistic piece's own author, which shows nothing. The pill shows the credit, the callout shows it, and the finder's profile gets a "Found" section.
- The 6-pill cap is fine but unneeded now (no piece has more than 3 presets).

**Must be true to keep it:**
- Someone who has not read the explanation would not find the seeded example within a minute of dragging the default slider.
- The "trivial state" refusal compares **normalized params, ignoring *t***, or say what it compares. `stateOf` adds `t` whenever *t* ≥ 0.005, so "equal to the defaults" never matches unless *t* is excluded. Decide whether a preset's *t* counts as part of a discovery (for times-table it does).
- There is a viewer handle to credit. The prototype has **no sign-in or current-user concept** (no account, `me` or handle in app.js), so "found by @you" needs a "Your handle" field stored locally and used only for the issue text.

**Feasibility check:**
- Verified to exist: `manifest.presets`, `presetPills` (a const arrow, app.js:215), `applyPreset`, `showCallout`, `renderCustomize` "Try this" (app.js:831), `stateOf`, `normalizeParams`, `renderUser`.
- `foundBy` passes **today, unvalidated**. Neither `validateManifest`'s presets loop (manifest.js:52–60) nor the checks.js "Presets" check (checks.js:291) rejects unknown preset fields. Verify step 5 ("`foundBy: 42` fails") needs new code in one of them. Put it in `validateManifest` so the feed and the gate agree.
- `showCallout` renders `label` and `note` only, so the credit needs a third span. The callout is `aria-hidden` and its text goes to the live region through `announce` in `applyPreset`, so the credit must be added there too.
- Review lanes: review-pipeline.md section 6 re-runs human review only on changes to `explanation.md`, `alt`, `title` or `hook`. A preset-only `loci.json` change keeps the lane, so the file's reading is correct. It is a new package hash, so old links still resolve.
- No conflict with the worker sandbox or the module API. The 1-day estimate is honest for the cut version.

**Verification script:**
1. logistic-bifurcation → Customize → **Suggest this as a preset** at the default r = 3.83 → refused with "That is the default state". Repeat at r = 3.82: refused as an existing preset.
2. At r = 3.63 (or another unclaimed window), enter label and note → "Send to the author on GitHub" opens `github.com/<repo>/issues/new` with JSON containing `"foundBy"` and your handle. Reload: the suggestion is listed locally as "Suggested".
3. The seeded accepted preset's pill → the callout shows "found by @<a non-author handle>", and a screen reader announcement includes it.
4. That finder's profile → "Found" lists that preset, and clicking it applies the state on the slide.
5. Submit a sample whose preset has `foundBy: 42` → the manifest or Presets check fails, naming `presets[i].foundBy`.
