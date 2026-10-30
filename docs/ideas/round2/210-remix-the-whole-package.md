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
