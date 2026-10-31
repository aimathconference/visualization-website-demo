# Practice repositories for the review dry run

These files set up the wishlist's review process on GitHub, using the production rules (`DEMO_PLAN.md` section 8). They live here so they're versioned with the demo; you copy them into two new repositories.

| Folder | Copy into | Visibility |
|---|---|---|
| `registry/` | `EigenReel/registry` | **public** (free Actions minutes; submitters fork it) |
| `moderation-practice/` | a new repo, e.g. `your-org/moderation-practice` | **private** (account flags are about people) |
| `rulesets/` | imported into `registry` (step 5 below) | |

## How a submission flows

1. Someone opens a pull request adding one entry, in either of two layouts:
   - a **package folder** `entries/<slug>/` with `loci.json`, `index.js` (and/or the targets' entries such as `mobile.js`, or `module.wasm`), `explanation.md` and `LICENSE`: the Loci format (`docs/submitting.md` section 2). The Loci site's **Submit** page runs the whole gate in the author's browser first, then gives them a zip laid out as `entries/<slug>/…`, a link to this repo's upload page (GitHub's drag-and-drop upload makes the branch and the pull request) and the pull request text to paste;
   - a **single file** `entries/<slug>.js` (and optionally `entries/<slug>.md`): the demo Playground's format. Its "Submit for review" button opens GitHub's new-file page for this.
2. **check** (the required job in `check.yml`) runs `.loci/check-entries.mjs` from the base branch against the pull request's files, as data. A single file goes through the same `guard.js` as the demo server: parsed (never run), no imports, at most 50 KB, a title, a `COLORS` block with a main and a secondary color, and an allowed license (the template is `template/visualization.js`). A package folder goes through the **static half of the Loci gate**, the same `checks.js` the Submit page runs, under node: manifest, targets, sizes, license, imports, forbidden APIs, shader loops, explanation (TeX parsed by the pinned KaTeX), alt text, presets, pointer, metadata, duplicates and live links; the folder name must equal the manifest's `id`. Failures fail the job; warnings are reported but pass. Changes outside `entries/` from non-members are refused.
3. **dynamic** (a second job in `check.yml`, best effort, `continue-on-error`, not a required check) plays each changed package in headless Chrome with the site's `scripts/check-package.mjs`, which loads the site's own scripts and runs the dynamic suite (setup, frame budget, box, blank, flashing, params, theme, determinism, seeking, reduced motion, pointer) in the same sandboxed worker as the feed. It uploads its own `dynamic-result` artifact. It needs the repository variable `LOCI_SITE_REPO` (and optionally `LOCI_SITE_REF`); without it the job records that it was skipped.
4. **triage** (the bot) runs after both:
   - check failed: posts a "Request changes" review listing the problems (and the dynamic summary, if there is one);
   - check passed: dismisses its own earlier change request, requests **two random reviewers** from `reviewers.yml` (moderators and admins, never the author), and turns on **auto-merge**;
   - either way, if the check had warnings or the dynamic job left a result, one comment lists them for the reviewers. Dynamic results never change what the bot does.
5. Reviewers approve or request changes. A new push dismisses earlier approvals and goes back through the check, and the bot re-requests the same two reviewers.
6. When both approve, GitHub merges automatically. The demo server polls the registry and imports the entry as reviewed: a package as a piece the Loci front end runs in its worker sandbox with its manifest, a single file through the guard as before. It appears within about a minute.
7. **stale** closes pull requests after 120 days without activity (warning at 113). There's no "deny"; a closed pull request can be reopened.

Flags are issues. The demo's Flag button opens these forms prefilled:
- `flag-removal` and `flag-changes` in `registry`;
- `flag-account` in the private `moderation-practice`.

Admins find all flags by searching for the `flag:` labels.

## Setup (about 30 minutes)

1. **Organization.** Create a GitHub organization for the trial, or use an existing one. Organization owners are the admins.
2. **Teams.** Create a `moderators` team. Create a `blog` team and set its parent to `moderators`, so blog maintainers are moderators too.
3. **Repositories.** Create `registry` (public) and `moderation-practice` (private), and copy each folder's contents into its repo's default branch (`main`). Include the dot-folders.
4. **Access.**
   - `registry`: give `moderators` the **Write** role. Approvals only count toward the merge rule from people with write access.
   - `moderation-practice`: give `moderators` the **Read** role (or Triage), so they can open and read flags.
   - Anyone who will change the repo's own files (workflows, `reviewers.yml`, `.loci/`) must set their organization membership to **Public** under the organization's People tab. The check sees a private member as `CONTRIBUTOR` and refuses those changes, and nobody can bypass the check.
5. **Rulesets** (`registry` → Settings → Rules → Rulesets → New ruleset → Import a ruleset):
   - import `rulesets/two-approvals.json`, then **check that the bypass list shows "Organization admin"**;
   - import `rulesets/automated-check.json` (no bypass).

   If an import complains about a field, recreate the same settings by hand: 2 approvals, dismiss stale approvals, require approval of the most recent push, admin bypass on the first; required status check `check` with no bypass on the second.

   Require only `check`. The `dynamic` job is best effort (a browser on a shared runner is slower and flakier than the gate should be), so it must not be added as a required check.
6. **Settings → General:** turn on **Allow auto-merge**. Optionally turn on "Automatically delete head branches".
7. **Settings → Actions → General:**
   - Workflow permissions: **Read repository contents** (the workflows ask for what they need).
   - Turn on **Allow GitHub Actions to create and approve pull requests**. The bot never approves, but posting change requests needs it on some accounts.
   - Fork pull request workflows: **Require approval for first-time contributors who are new to GitHub**. The stricter default stalls every first submission until someone clicks "Approve and run".
8. **Labels:** `flag:removal`, `flag:changes`, `flag:account`, `stale`. The issue forms add them; create them first if GitHub doesn't.
9. **Settings → Secrets and variables → Actions → Variables:** add `LOCI_SITE_REPO` (the Loci site's repository, e.g. `your-org/visualization-website-demo`) and, if its scripts aren't on `main`, `LOCI_SITE_REF`. The dynamic job checks it out for `scripts/check-package.mjs`. Without it the dynamic job is skipped and everything else works.
10. **Reviewer pool:** edit `reviewers.yml` and replace the placeholder logins with the moderators' and admins' GitHub usernames.
11. **Point the demo at it:** set `REGISTRY_REPO=EigenReel/registry` (and `REGISTRY_BRANCH` if it isn't `main`) and `MODERATION_REPO=your-org/moderation-practice` in the demo's environment (see `SPARK_SETUP.md`). Optionally set `GITHUB_TOKEN` to a fine-grained token with read-only "Contents" access to `registry`, which raises the API limit so the demo can poll every minute instead of every five. The Loci front end's Submit page reads the same two variables (through `/api/registry`) for its "Open the registry" link to GitHub's upload page; opened as static files it reads `REGISTRY` in `config.js`, and says the registry is not set up yet when that is `null`.

## Before the trial: test it end to end

- [ ] A non-member's pull request with an `import` gets a bot change request and no reviewers.
- [ ] A package folder made with the Submit page's "Download for the registry" passes `check`, and the bot's comment shows the dynamic results.
- [ ] A package whose `index.js` calls `fetch` gets a change request naming the file and line.
- [ ] Fixing it clears the change request and assigns two reviewers from `reviewers.yml`.
- [ ] One approval doesn't merge; the second merges automatically; the piece shows up in the demo.
- [ ] After a "Request changes" review and a new push, earlier approvals are dismissed.
- [ ] An organization owner can merge without approvals but not with a failing check.
- [ ] The Flag buttons open the right forms, and account flags are invisible to non-members.

Things only a live test can confirm:
- that a "Request changes" review from `github-actions[bot]` blocks the merge until the bot dismisses it;
- that the ruleset JSON imports cleanly.

## The contributor template and the package equivalent

`registry/template/visualization.js` is a complete single-file entry following `Visualizations.md`: copy it to
`entries/<slug>.js` in the registry. The check runs it through `guard.js` (its own test is in `demo/test/guard.test.js`).
A package folder `entries/<slug>/` expresses the same things in `loci.json` and its module (`docs/submitting.md`,
`docs/module-api.md`):

| In the template (`entries/<slug>.js`) | In a package (`entries/<slug>/`) |
|---|---|
| `const COLORS = { main, secondary, bg, fg, … }`, required | `"colors": { "main": "#…", "secondary": "#…", "bg": "#…", "fg": "#…" }` in `loci.json`: optional; when present, `main` and `secondary` are required and every value is `#rrggbb`. On the default palette in the Night style the piece draws with them as `a1`/`a2`; the server stores them in `colors_json` like a single file's |
| `title`, `hook`, `license` | the same fields in `loci.json` |
| `tags` (up to 4) | `tags` (2 to 6, from the vocabulary) |
| `author: { name, github }` | `"author": "@handle"`; either way the pull request's GitHub account is credited |
| `modes: { desktop, mobile }` | no `targets` (runs everywhere), or `"targets"` with a `desktop` and/or `mobile` entry, one module each |
| `interact: { tap, mouse, keys }` | `"pointer": { "mode": …, "drag", "click", "keys", "wheel", "hint" }` |
| `t0` | the share link's `t` and each preset's `"t"` |
| `param: { key, label, min, max, step, value }` | `"params": [{ "key", "type": "range", "label", "min", "max", "step", "default" }]` (also `toggle`, `select`, `color`, `seed`) |
| `draw(ctx, w, h, t, P, S, B)` | the module API's `draw` in `index.js` |
| `entries/<slug>.md` | `explanation.md` (required) and `LICENSE` |

## The site's catalog

Every piece's code, manifest and explanation live in `entries/` here. `catalog.js` is generated from them, so the site works as static files and the server can start without GitHub. `scripts/catalog-extras.json` lists the pieces the site carries, in feed order, with what a package does not hold: the lane, reviewers, review date and sample like counts.

After a piece in the list changes in the registry, or to add one to the list, run this from the site's repository root, with the registry checked out next to it and up to date:

```bash
node scripts/gen-catalog.mjs ../registry   # catalog.js, and examples/<id>/ for WebAssembly pieces
node scripts/gen-share-pages.mjs           # v/<id>.html
sh scripts/sync-registry-checker.sh        # the checker's copy of the catalog
```

Until then the site shows its generated copy of a listed piece. A merged piece that is not in the list appears on the server as soon as it is imported, but not on the static site.

## Keeping the checker in sync

The registry's checker is copied from this repository, so a pull request is judged by the same rules as the Submit page:

| In `registry/.loci/` | Copied from |
|---|---|
| `guard.js` | `demo/server/guard.js` (single-file entries) |
| `checks.js`, `manifest.js`, `tex.js`, `kit.js` | the site's own files at the repository root (package folders) |
| `catalog-index.json` | generated from `catalog.js` and `bounties.js`: the tag vocabulary, the catalog's ids and modules (for "after" and the duplicate check) and the Wanted list |

After changing any of them, run

```sh
scripts/sync-registry-checker.sh
```

…commit the result here, then copy `demo/github/registry/.loci/` into the registry repo and commit it there as well. KaTeX is pinned in `.loci/package.json` to the version `tex.js` loads (`VER`); change both together.

The dynamic job doesn't need a copy: it checks out the site itself (`LOCI_SITE_REPO`) and runs `scripts/check-package.mjs` from it. To run the same thing locally on a package folder:

```sh
node scripts/check-package.mjs path/to/entries/my-piece          # dynamic checks; --all for every group, --json report.json
node demo/github/registry/.loci/check-entries.mjs <pr-dir> <changed.tsv> NONE   # the required check
```
