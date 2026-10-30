# 210 · Remix the whole package: title, presets, explanation and the bounty it answers

## Pitch
The Remix editor gets tabs beside `index.js`:
- **loci.json:** a form for title, hook, params, presets and `bounty`, with raw JSON behind a toggle.
- **explanation.md:** with a live KaTeX preview.
- **Credits:** read-only.

"Check this remix" checks what you edited. Each Wanted request gets **"Make this"**, which opens the editor on a template with `bounty` set.

## Why mathematicians would care
The grad student's real paths are "I can do this better" and "I can answer that request", and today both dead-end in the browser:
- My integer-*k* remix shipped the parent's explanation ("k sweeps slowly upward") and a preset ("wait for k = 51") that now means nothing. The gate passed them ("3 presets, every one valid as written").
- Wanted says to add `"bounty"` to loci.json, which the editor can't edit.

So the contributor submits a package whose words don't match its picture, which is the thing review exists to stop.

## What exists today
- `renderRemix`, `runRemix` and drafts (`loci:draft:<id>`); `remixPackage` builds the four files with a new id and `remixOf`.
- The gate validates the manifest, presets, the explanation (TeX via tex.js, sections, Reference) and the `bounty` syntax. manifest.js doesn't check that the id exists in bounties.js; this adds that check.
- `md()`, `typeset` and `liveify` render explanations.

## Design (smallest real version)
1. **Tabs** over the editor. The draft becomes `{source, manifest, explanation}`, and old drafts load as source-only.
2. **The form is generated from `LociManifest`'s schema,** not written by hand. It includes a params table, "Add the current moment as a preset" (`Lesson.capture`) and a `bounty` select fed from bounties.js. Raw JSON is validated on every input.
3. **Explanation preview** with live links, using 203's peek on phones.
4. **New warning, "Presets still describe the picture".** For each preset with a `t`, render the parent and the remix. If the pixels differ by more than 30 % and the note is unchanged, warn.
5. **"Make this" template:** a module that draws the box and a label; `bounty` set; the request's reference prefilled as the Reference line.

## Risks
- A form duplicating module-api.md would drift, so generate it from the validator.
- The pixel-diff warning may be noisy. It is only a warning, and only for presets with `t`.
- Scope creep: four fixed files, no file tree.

## Effort
M (2–3 days).

## How to verify
1. Remix times-table to integer *k*, leaving the text alone: Check this remix warns on both presets.
2. Edit the hook and explanation and add a preset from the current moment: the report reflects them, and the preview's `#preset:` link drives the slide.
3. Wanted → Riemann–Hurwitz → "Make this": `"bounty": "riemann-hurwitz"` is set, the gate confirms it names an open request, and Open in Submit carries it.
4. An old source-only draft still loads.

## Review

**Verdict: build smaller.** Let the remix editor edit `explanation.md` and `loci.json` (raw, validated) and set `bounty`. Cut the generated form and the pixel-diff warning.

**Strongest objection.** A remix's edited manifest can't travel.
- Customize builds its controls from `v.manifest`, the published one, and every share link's `p` is validated by `normalizeParams` against it. A remix that adds or renames a param would run locally with params that Customize can't show and that any share link silently drops.
- The embed deliberately ignores remixes (`bootEmbed`: `remixes.clear()`).

So editing params invites exactly the "words don't match the picture" failure the proposal wants to stop, just one step later.

The pixel-diff warning costs two poster workers per preset. It is also noisy for any piece whose module change is cosmetic (theme, stroke).

**What to cut.**
- **Tabs:** `index.js` · `loci.json` · `explanation.md`.
  - `loci.json` is raw JSON, validated on input by the same `LociManifest` validator the gate uses. No generated form.
  - The `params` key is **locked** to the parent's keys in this round: you may change labels, ranges and defaults, but not add keys, so Customize and links still work.
- **Explanation:** a live preview via the existing `md()` + `LociTeX.typeset` + `liveify`.
- **A cheap staleness warning instead of pixel diff:** "index.js changed; the presets and explanation are identical to the parent's — check they still describe the picture." This is a string compare in the gate's report.
- **Wanted → "Make this":** it opens the editor on the template with `bounty` set. Add the gate check that the id exists in bounties.js and is open.

**Must be true to keep it.**
- The walkthrough's integer-k remix can't pass Check this remix silently with "k sweeps slowly upward" unchanged.
- An old source-only draft still loads.
- Share links of the published piece are unaffected by any local remix.

**Feasibility check.**
- Drafts are strings today: `setDraft(k, src)` writes `loci:draft:<rkey>`, and the loader at boot checks `typeof d==='string'`. Store new drafts as `{source, manifest, explanation}` under a **new** key (`loci:draft2:`) or detect the type on read. Don't break the string check.
- `remixPackage` (checks.js, around line 985) assembles the four files, so take the edited manifest and explanation from the draft there.
- **Gate impact:** a new check (bounty id exists) needs bounties.js data inside checks.js. Pass it in through the gate's context rather than importing the page global, so the gate stays runnable on its own.
- Links: none, because remixes are local.

**Verification script.**
1. times-table → Source → Remix → make k an integer → Check this remix. The report warns that the presets and explanation are unchanged.
2. Open the explanation.md tab and edit the second paragraph; the preview typesets and its `#preset:` link drives the slide.
3. Open the loci.json tab and add a param key. Validation refuses it with "params keys are fixed for remixes".
4. Wanted → Riemann–Hurwitz → Make this → Check. "bounty: riemann-hurwitz, an open request" passes, and Open in Submit carries it.
5. Reload. Your older string draft of another piece still opens.
