# Practice repositories for the review dry run

These files set up the wishlist's review process on GitHub, using the production rules (`DEMO_PLAN.md` section 8) and the submission format in `docs/submission-spec-slop.md`. They live here so they're versioned with the demo; you copy them into two new repositories.

| Folder | Copy into | Visibility |
|---|---|---|
| `registry/` | `EigenReel/registry` | **public** (free Actions minutes; submitters fork it) |
| `moderation-practice/` | a new repo, e.g. `your-org/moderation-practice` | **private** (account flags are about people) |
| `rulesets/` | imported into `registry` (step 5 below) | |

## How a submission flows

1. **A submission is one piece's files** (spec, sections 1 and 11):
   - `entries/<slug>.js`, the piece: `COLORS` first, then one literal `export default { … }` with `setup`, `draw` and optionally `onMode`;
   - `entries/<slug>.md`, its explanation (150 to 1200 words, with "What you're seeing", "Try this" and a Reference line);
   - optionally `entries/<slug>.wasm`, with its source and a `BUILD` file under `sources/<slug>/`.

   The slug is lowercase letters, digits and dashes, at most 40 characters. Authors usually make the files in the site's **Chalkboard**, which runs the same checks live and exports them as a zip laid out as they go here. Then they fork this repository, add the files on a branch of the fork (GitHub's web upload is enough) and open a pull request. Technical users write the files by hand and do the same; the same checks run. The site never pushes, opens, comments on or merges anything for anyone.
2. **What a pull request may change:** only `entries/<slug>.js`, `entries/<slug>.md`, `entries/<slug>.wasm` and `sources/<slug>/**`. Anything else (`.github/`, `.eigenreel/`, `tags.json`, `reviewers.yml`, this README) fails the check, whoever opens the pull request: the checker never knows who is a maintainer. Maintainers change the registry's own files by pushing to `main`, or by merging such a pull request over the failing check with the admin bypass (step 5). An author withdraws a piece by removing all of its files in one pull request; that is not checked further.
3. **check** (the required job in `check.yml`) runs `.eigenreel/check-entries.mjs` from the base branch, against the pull request's files as data. For each piece it reads the files and calls `spec.js`, the same static gate the Chalkboard runs: slug, file names and sizes; literal metadata and every field (license, tags from `tags.json`, `alt`); `COLORS` and its contrast; params and presets; the explanation's sections, length, TeX (parsed by the pinned KaTeX) and links; pinned imports only; bundled libraries' licenses; the `.wasm` and its `BUILD`; no `webgl2` on phones; and no source identical to another piece's. Submitted code is parsed, never run. Errors fail the job. Warnings pass and go to the reviewers:
   - **forbidden APIs**: the source names something the sandbox blocks (`fetch`, `eval`, …);
   - **ownership**: a piece's GitHub author is whoever opened the pull request that first added `entries/<slug>.js`, by **numeric user id** (ids survive renames; logins do not). The workflow looks that up with the read-only token (the oldest commit to the file on the base branch, then its pull request) and passes it to the checker in `first-author.json`. When a later pull request for the same slug comes from another account, the check warns, and the reviewers decide whether the change is welcome.
4. **dynamic** (a second job in `check.yml`, best effort, `continue-on-error`, not a required check) plays each changed piece in headless Chromium with the site's `scripts/check-entry.mjs`, in the same sandboxed worker as the feed, at the spec's phone and desktop sizes, windowed and full screen: setup time, a blank box, time purity, `setParam` honesty, flashing. It uploads a `dynamic-result` artifact and writes a summary on the run. It needs the repository variable `EIGENREEL_SITE_REPO` (and optionally `EIGENREEL_SITE_REF`); without it the job records that it was skipped.
5. **triage** (the bot) runs after both:
   - check failed: posts a "Request changes" review listing the problems (and the warnings and dynamic summary, if any);
   - check passed: dismisses its own earlier change request, requests **two random reviewers** from `reviewers.yml` (moderators and admins, never the author), and turns on **auto-merge**;
   - either way, if the check had warnings (the ownership warning included) or the dynamic job left a result, one comment lists them for the reviewers. Dynamic results never change what the bot does.
6. Reviewers approve or request changes. Authors leave "Allow edits by maintainers" on, so a reviewer can push a small fix. A new push dismisses earlier approvals and goes back through the check, and the bot re-requests the same two reviewers.
7. When both approve, GitHub merges automatically. The demo server polls the registry and imports the piece as reviewed. It appears within about a minute.
8. **stale** closes pull requests after 120 days without activity (warning at 113). There's no "deny"; a closed pull request can be reopened. Its branch lives in the author's fork, so there is nothing to clean up here.

**The tag vocabulary** is `registry/tags.json`, a JSON array of strings, one per line; it starts as `spec.js`'s `DEFAULT_TAGS`. The check reads it from the base branch, so a piece may use only tags already on `main`. Maintainers add or rename tags by a pull request to `main` (which fails the check by design and is merged with the admin bypass) or by pushing to `main`.

Flags are issues. The demo's Flag button opens these forms prefilled:
- `flag-removal` and `flag-changes` in `registry`;
- `flag-account` in the private `moderation-practice`.

Admins find all flags by searching for the `flag:` labels.

## Setup (about 30 minutes)

1. **Organization.** Create a GitHub organization for the trial, or use an existing one. Organization owners are the admins.
2. **Teams.** Create a `moderators` team. Create a `blog` team and set its parent to `moderators`, so blog maintainers are moderators too.
3. **Repositories.** Create `registry` (public) and `moderation-practice` (private), and copy each folder's contents into its repo's default branch (`main`). Include the dot-folders. `registry/.eigenreel/node_modules/` is not copied (it is gitignored; the workflow runs `npm ci`).
4. **Access.**
   - `registry`: give `moderators` the **Write** role. Approvals only count toward the merge rule from people with write access.
   - `moderation-practice`: give `moderators` the **Read** role (or Triage), so they can open and read flags.
5. **Rulesets** (`registry` → Settings → Rules → Rulesets → New ruleset → Import a ruleset):
   - import `rulesets/two-approvals.json`;
   - import `rulesets/automated-check.json`;
   - on both, **check that the bypass list shows "Organization admin"**. That bypass is how maintainers change the registry's own files (workflows, `.eigenreel/`, `tags.json`, `reviewers.yml`): the check fails every pull request that touches them, so an admin merges those over the failing check, or pushes to `main` directly.

   If an import complains about a field, recreate the same settings by hand: 2 approvals, dismiss stale approvals, require approval of the most recent push on the first; required status check `check` on the second; admin bypass on both.

   Require only `check`. The `dynamic` job is best effort (a browser on a shared runner is slower and flakier than the gate should be), so it must not be added as a required check.
6. **Settings → General:** turn on **Allow auto-merge**.
7. **Settings → Actions → General:**
   - Workflow permissions: **Read repository contents** (the workflows ask for what they need).
   - Turn on **Allow GitHub Actions to create and approve pull requests**. The bot never approves, but posting change requests needs it on some accounts.
   - Fork pull request workflows: **Require approval for all outside collaborators**. For a fork's pull request GitHub runs the workflow files as the pull request has them, so one that edits `check.yml` could make its own check pass. The maintainer who clicks "Approve and run" first looks at the pull request's files for changes under `.github/`, and does not approve a run that has any (`docs/sandbox.md`, "The check workflow").
8. **Labels:** `flag:removal`, `flag:changes`, `flag:account`, `stale`. The issue forms add them; create them first if GitHub doesn't.
9. **Settings → Secrets and variables → Actions → Variables:** add `EIGENREEL_SITE_REPO` (the EigenReel site's repository, e.g. `your-org/visualization-website-demo`) and, if its scripts aren't on `main`, `EIGENREEL_SITE_REF`. The dynamic job checks it out for `scripts/check-entry.mjs`. Without it the dynamic job is skipped and everything else works.
10. **Reviewer pool:** edit `reviewers.yml` and replace the placeholder logins with the moderators' and admins' GitHub usernames.
11. **Point the demo at it:** set `REGISTRY_REPO=EigenReel/registry` (and `REGISTRY_BRANCH` if it isn't `main`) and `MODERATION_REPO=your-org/moderation-practice` in the demo's environment (see `SPARK_SETUP.md`). Optionally set `GITHUB_TOKEN` to a fine-grained token with read-only "Contents" access to `registry`, which raises the API limit so the demo can poll every minute instead of every five. The site's how-to page for submitting links to the registry through the same variables (through `/api/registry`); opened as static files it reads `REGISTRY` in `config.js`, and says the registry is not set up yet when that is `null`.

## Before the trial: test it end to end

- [ ] A pull request from a fork waits for "Approve and run"; the approving maintainer sees whether it touches `.github/`.
- [ ] `entries/rose-curves.js` and `.md` exported from the Chalkboard pass `check`, and the bot's comment shows the dynamic results.
- [ ] A pull request that also changes `README.md` or `tags.json` gets a change request naming the file.
- [ ] A piece that imports anything but `@eigenreel/kit` or `@eigenreel/three` gets a change request naming the file and line; one that calls `fetch` passes with a warning.
- [ ] An explanation with HTML, an image or a `javascript:` link gets a change request naming the line.
- [ ] A change to `rose-curves` from a second account passes with the ownership warning in the bot's comment.
- [ ] Fixing a failure clears the change request and assigns two reviewers from `reviewers.yml`.
- [ ] One approval doesn't merge; the second merges automatically; the piece shows up in the demo.
- [ ] After a "Request changes" review and a new push, earlier approvals are dismissed.
- [ ] An organization owner can merge a pull request that changes `tags.json` over the failing check, and push to `main`.
- [ ] The Flag buttons open the right forms, and account flags are invisible to non-members.

Things only a live test can confirm:
- that a "Request changes" review from `github-actions[bot]` blocks the merge until the bot dismisses it;
- that the ruleset JSON imports cleanly;
- that the first-author lookup finds the pull request of a squash-merged commit.

## The contributor template

`registry/template/visualization.js` is the Rose curves example from the spec's section 1, complete and commented field by field: `COLORS`, the metadata, `setup`, a `draw` that is a function of `(t, params)`, and an `onMode` that builds a small panel in `env.ui` and changes `k` through `env.setParam`. Copy it to `entries/<slug>.js` and write `entries/<slug>.md` beside it. `registry/entries/rose-curves.js` and `.md` are the same piece without the tutorial comments, as the registry's first entry. Both pass the check.

## The site's catalog

Every piece's files live in `entries/` of the registry. The site generates `catalog.js` from them, so it works as static files and the server can start without GitHub. From the site's repository root, with the registry checked out next to it:

```bash
node scripts/gen-catalog.mjs ../registry
```

The registry copy versioned here is `demo/github/registry/`.

## Keeping the checker in sync

The registry's checker is copied from this repository, so a pull request is judged by the same rules as the Chalkboard:

| In `registry/.eigenreel/` | What it is |
|---|---|
| `spec.js`, `tex.js` | copies of the site's files at the repository root: the whole static gate, and its TeX tokenizer |
| `check-entries.mjs` | the registry's own driver: which paths a pull request may change, the ownership warning, and one `spec.js` check per piece |
| `triage.cjs` | the review bot |
| `package.json`, `package-lock.json` | `acorn` and `katex`; KaTeX is pinned to the version `tex.js` loads (`VER`) |

After changing `spec.js` or `tex.js`, run

```sh
scripts/sync-registry-checker.sh
```

…commit the result here, then copy `demo/github/registry/.eigenreel/` into the registry repo and commit it there as well (on `main`, with the admin bypass). The script warns when `tex.js`'s KaTeX version and the pin in `package.json` differ; change both together and refresh the lock file with `npm install --package-lock-only --ignore-scripts`.

The dynamic job doesn't need a copy: it checks out the site itself (`EIGENREEL_SITE_REPO`) and runs `scripts/check-entry.mjs` from it. To run both locally:

```sh
npm ci --prefix demo/github/registry/.eigenreel --ignore-scripts
node demo/github/registry/.eigenreel/check-entries.mjs <pr-dir> <changed.tsv> [<author-id> <first-author.json>]   # the required check
node scripts/check-entry.mjs <pr-dir>/entries <slug> --json report.json                                         # the dynamic checks
```

`changed.tsv` has one `<status>\t<path>` line per changed file (`added`, `modified`, `removed`, `renamed`, with the previous path as a third column for renames). The checker takes the tag vocabulary and the pieces already merged from the checkout it lives in (`.eigenreel/..`).
