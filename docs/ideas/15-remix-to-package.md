# 15 · Remix → package → checks: templates, "Check this remix", and a fork-to-GitHub stub

## Pitch
Close the loop from "I tweaked this in the browser" to "I submitted a piece": a template gallery in Remix for starting from a pattern rather than someone else's piece, a "Check this remix" button that runs the full in-browser gate on the remix, and "Download as package" / "Fork to GitHub" that produce a ready-to-submit folder (`loci.json`, module, `explanation.md` skeleton, `LICENSE`). Ease of contribution is the bottleneck for a catalog that depends on mathematicians writing pieces.

## Why mathematicians would care
- **The would-be author** is a mathematician who can write 80 lines of JavaScript but will not set up a repo, read a manifest spec and debug a checker to find out whether their idea "counts". If the path is Remix → Check → Download package → Submit, all in the tab, they finish.
- **Templates** encode the hard-won patterns: an ODE integrator that handles `t` jumping backwards (the "Time jumps" check), a seeded random process (`mulberry32`), a cached escape-time raster, a three.js scene with the host's GL rules, a WebGL fragment shader with the literal loop cap. These are exactly the things the checks fail people on (submitting.md section 9).
- **Teachers** remix for a class (change the function, the range, the labels) and can share or keep the result, instead of being told "Remixes are not shareable in this mockup".

## What exists today in the prototype that it builds on
- `renderRemix`, `runRemix`, `drafts`, `remixes`, `unremix`, the Download .js button, and the error display (`showRemixError`).
- `LociChecks.samplePackage(v, failing)` (`checks.js`): already builds a full package (`loci.json`, entries per target, `explanation.md`, `LICENSE` via `licenseText`) from a catalog piece. A remix package is that with the remix source substituted.
- `LociChecks.run` / `runChecks` / `renderReport` (`app.js`): the whole gate, in the browser, with a report UI.
- `loadPkg` and the Submit page: a package object can be handed straight to it.
- The Source tab's disabled line, "Fork on GitHub is disabled in this mockup."
- PLAN.md's "remixes as configs" (a remix as a small settings file pointing at its parent): this idea covers code remixes; config remixes are the share link.

## Design
**Templates (Remix → "Start from a template"):** a `TEMPLATES` array in a new `templates.js` (or in `catalog.js`): `{id, title, blurb, render, source, manifest, explanation}` for six patterns: *Parametric curve* (canvas2d, one range param), *Iterated map* (cobweb + orbit, seeded), *ODE flow* (RK4 from the cycle start, caches by `t` window, survives seeks), *Escape-time raster* (ImageData cached by size and palette, half resolution), *Fragment shader* (webgl2, the `MAX_ITER` pattern from submitting.md), *three.js scene* (the submitting.md minimal piece). Each template's explanation is the section skeleton with comments ("One or two paragraphs: what object this is…"). Choosing a template mounts it on the current slide as a remix and opens the editor; the manifest is editable in a second textarea (JSON, validated live with `validateManifest`).

**Check this remix:** a button in the Remix editor that builds a package from the current draft (`samplePackage` with the source, manifest and explanation replaced), switches to Submit with that package loaded (`loadPkg(()=>pkg)`), and runs the gate. The report links back ("Edit remix").

**Download as package:** a `.zip` with the folder (the zip writer: `checks.js` already has `unzip`; writing a store-only zip is ~60 lines, or `fflate` from jsdelivr). The `LICENSE` uses the parent's license and adds the remixer to the copyright line; `loci.json` gets `"remixOf": "<parent id>@<hash>"` so lineage is recorded.

**Fork to GitHub (stub):** opens `https://github.com/new?name=<id>-remix&description=…` in a new tab and shows a three-step note: create the repo, upload the downloaded package, open a registry PR (link to the registry's new-file page, which PLAN.md and DEMO_PLAN.md section 8 already describe). No OAuth, no API calls: it is honest scaffolding, not a mock success screen.

**Persists:** drafts in `localStorage` (`loci:draft:<rkey>`) instead of per-tab memory, so a remix survives a reload (today `drafts` is a `Map`).

## Risks / what a skeptic would say
- **Templates become the only shapes people make.** Six templates covering techniques, not topics, is the right granularity; they are starting points for the module's structure, not the picture.
- **Remix lineage invites "license laundering".** `remixOf` plus the parent's license carried forward, and the Duplicates check (near-duplicate module text vs. the parent) already flags thin remixes for reviewers.
- **The zip writer and manifest editor are small but fiddly** code. Keep the manifest editor a validated textarea, not a form builder.
- **GitHub stub may confuse** people into thinking it is wired. Label it "opens GitHub; nothing is sent from Loci".

## Effort
**M–L** (3 days). Touches a new `templates.js`, `app.js` (template picker in `renderRemix`, manifest textarea, Check this remix → `loadPkg`, zip download, Fork stub in the Source tab), `checks.js` (export a `packageFrom({manifest, sources, explanation, license, author})` built from `samplePackage`, a zip writer), `manifest.js` (accept `remixOf`), `index.html` (script tag), `styles.css`, `docs/submitting.md` section 3.

## How to verify
1. Any slide → Source → Remix → Start from a template → ODE flow: the slide shows a flow; scrub backwards: no glitch.
2. Edit the manifest's param range; invalid JSON shows an inline error; valid JSON updates Customize.
3. Check this remix: the Submit page runs the gate on the remix; introduce `Math.random()` in the draw and re-check: "nondeterministic at t = …".
4. Download as package: unzip it; drop the folder on Submit: the same report.
5. Reload the tab mid-edit: the draft is still there.
6. Fork to GitHub: opens github.com/new with the name filled; nothing else happens.

## Review
**Verdict:** build smaller. "Check this remix" is about 40 lines on top of code that already exists, and it is the shortest path from tinkering to contributing. Templates, the manifest editor, the zip writer and the GitHub stub together make up the other 90% of the effort.

**Strongest objection:** "Loci's scarce resource is reviewer time, not code. PLAN.md's own answer to the 160,000-hour problem is 'remixes as configs': a 1 KB settings file that needs no review. This idea turns every tweak into a full package that needs two reviewers. And a template gallery of six techniques invites a catalog of six-shaped pieces."

**What to cut:**
- **Templates.** Six modules, each with an explanation skeleton, is the bulk of the 3 days. Ship one, "blank canvas2d with a range param and a seeded RNG", or none. The catalog pieces already serve as templates through Remix.
- **The manifest textarea.** Re-run `validateManifest` on edit only if it is cheap. Otherwise the remix keeps the parent's manifest.
- **The zip writer.** `loadPkg(()=>pkg)` takes the in-memory package directly. A "Download folder" can be N individual file downloads. A store-only zip still needs a CRC32 table, so "~60 lines" is accurate, but it is not needed for v1.
- **Fork to GitHub.** It is a link, and it adds confusion.

Keep: **Check this remix**, and drafts in `localStorage`.

**Must be true to keep it:**
- The checked remix gets a new id (e.g. `<parent>-remix`). The duplicate check (checks.js:323) does `others=ctx.catalog.filter(v=>v.id!==m.id)`. A package with the parent's id is "treated as an update" and is never compared against the parent, so an unmodified remix **passes** "Not a duplicate". The file's claim that "the Duplicates check already flags thin remixes" holds only after the rename. Then an identical module fails on SHA-256, and a ≥80% shingle overlap warns.
- The report must say clearly that it checked a remix, not the original.

**Feasibility check:**
- **The `samplePackage` path takes a remix with no change to checks.js.** Verified under node:
  - `LociChecks.samplePackage({...v, source: remixSrc})` emits the remix as `index.js` for every single-target JS piece. `moduleSource` returns `v.source` when it is a string, before it generates code from `v.draw`.
  - For mandelbrot-zoom and hopf-fibers (multi-target), pass `{...v, sources:{...v.sources, [tid]: remixSrc}}`. The remix belongs to one target (`rkey` = `id@tid`), and the other target ships the original.
  - To rename: `{...v, id:newId, manifest:{...v.manifest, id:newId}}`, because `loci.json` takes `id` from `manifest.id`.
  - `samplePackage` writes `LICENSE` with `v.author` (the parent's), so pass the remixer as author or post-edit the text.
  - It builds `loci.json` from a fixed field list, so `remixOf` is dropped unless added there. The license check does not look at the copyright line.
- **WASM:** `samplePackage(wasm-lissajous)` "succeeds" but writes `runtime:'js'` with a null `index.js`. This is an existing bug. Remix is read-only for WASM anyway (`renderRemix` wasm branch), so hide the button there.
- Remixes already persist in **sessionStorage** (`store.set('loci:remix:'+k,…,true)`, app.js:93/782). Only `drafts` (unrun edits) are a bare `Map`. Moving both to `localStorage` is a one-flag change, but it means remixes survive across sessions forever, so add a "Discard" path.
- The `"Fork on GitHub is disabled in this mockup."` line exists (app.js:721).
- `runChecks` mounts with `trusted:false` in the same worker sandbox, so there is no new sandbox exposure.
- `validateManifest` ignores unknown top-level keys, so `remixOf` passes without touching manifest.js. The file's "manifest.js (accept remixOf)" is unnecessary unless it should be validated.
- The effort is honest only for the full version. The cut version is S, half a day.

**Verification script:**
1. times-table → Source → Remix. Change the chord colour line → Run → **Check this remix**. The Submit page shows "Checking times-table-remix", and the report's "Not a duplicate" row says "Near-duplicate of Multiplication tables on a circle" (warn).
2. Revert to the original source and Check again. The duplicate row **fails** on SHA-256 identity, not "treated as an update".
3. Add `Math.random()` to the draw → Check. "Deterministic" fails with a frame and *t*.
4. hopf-fibers (desktop target) → Remix → Check. The package lists `index.js` (remixed) and `mobile.js` (original), and both targets run.
5. Type in the editor without pressing Run, then reload the tab. The draft text is still there.
6. wasm-lissajous → Source: there is no "Check this remix" button.
