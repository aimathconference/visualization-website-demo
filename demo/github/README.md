# Practice repositories for the review dry run

These files set up the wishlist's review process on GitHub, using the production rules (`DEMO_PLAN.md` section 8). They live here so they're versioned with the demo; you copy them into two new repositories.

| Folder | Copy into | Visibility |
|---|---|---|
| `registry-practice/` | a new repo, e.g. `your-org/registry-practice` | **public** (free Actions minutes; submitters fork it) |
| `moderation-practice/` | a new repo, e.g. `your-org/moderation-practice` | **private** (account flags are about people) |
| `rulesets/` | imported into `registry-practice` (step 5 below) | |

## How a submission flows

1. Someone opens a pull request adding `entries/<slug>.js` (and optionally `entries/<slug>.md`). The demo's Playground has a "Submit for review" button that opens GitHub's new-file page for this.
2. **check** runs `.loci/check-entries.mjs` from the base branch against the pull request's files. It uses the same `guard.js` as the demo server: parses the code (never runs it), rejects imports, enforces the 50 KB limit, needs a title and an allowed license. It also refuses changes outside `entries/` from non-members.
3. **triage** (the bot) runs after the check:
   - check failed: posts a "Request changes" review listing the problems;
   - check passed: dismisses its own earlier change request, requests **two random reviewers** from `reviewers.yml` (moderators and admins, never the author), and turns on **auto-merge**.
4. Reviewers approve or request changes. A new push dismisses earlier approvals and goes back through the check, and the bot re-requests the same two reviewers.
5. When both approve, GitHub merges automatically. The demo server polls the registry and the piece appears in the main feed within about a minute.
6. **stale** closes pull requests after 120 days without activity (warning at 113). There's no "deny"; a closed pull request can be reopened.

Flags are issues. The demo's Flag button opens these forms prefilled:
- `flag-removal` and `flag-changes` in `registry-practice`;
- `flag-account` in the private `moderation-practice`.

Admins find all flags by searching for the `flag:` labels.

## Setup (about 30 minutes)

1. **Organization.** Create a GitHub organization for the trial, or use an existing one. Organization owners are the admins.
2. **Teams.** Create a `moderators` team. Create a `blog` team and set its parent to `moderators`, so blog maintainers are moderators too.
3. **Repositories.** Create `registry-practice` (public) and `moderation-practice` (private), and copy each folder's contents into its repo's default branch (`main`). Include the dot-folders.
4. **Access.**
   - `registry-practice`: give `moderators` the **Write** role. Approvals only count toward the merge rule from people with write access.
   - `moderation-practice`: give `moderators` the **Read** role (or Triage), so they can open and read flags.
5. **Rulesets** (`registry-practice` → Settings → Rules → Rulesets → New ruleset → Import a ruleset):
   - import `rulesets/two-approvals.json`, then **check that the bypass list shows "Organization admin"**;
   - import `rulesets/automated-check.json` (no bypass).

   If an import complains about a field, recreate the same settings by hand: 2 approvals, dismiss stale approvals, require approval of the most recent push, admin bypass on the first; required status check `check` with no bypass on the second.
6. **Settings → General:** turn on **Allow auto-merge**. Optionally turn on "Automatically delete head branches".
7. **Settings → Actions → General:**
   - Workflow permissions: **Read repository contents** (the workflows ask for what they need).
   - Turn on **Allow GitHub Actions to create and approve pull requests**. The bot never approves, but posting change requests needs it on some accounts.
   - Fork pull request workflows: **Require approval for first-time contributors who are new to GitHub**. The stricter default stalls every first submission until someone clicks "Approve and run".
8. **Labels:** `flag:removal`, `flag:changes`, `flag:account`, `stale`. The issue forms add them; create them first if GitHub doesn't.
9. **Reviewer pool:** edit `reviewers.yml` and replace the placeholder logins with the moderators' and admins' GitHub usernames.
10. **Point the demo at it:** set `REGISTRY_REPO=your-org/registry-practice` and `MODERATION_REPO=your-org/moderation-practice` in the demo's environment (see `SPARK_SETUP.md`). Optionally set `GITHUB_TOKEN` to a fine-grained token with read-only "Contents" access to `registry-practice`, which raises the API limit so the demo can poll every minute instead of every five.

## Before the trial: test it end to end

- [ ] A non-member's pull request with an `import` gets a bot change request and no reviewers.
- [ ] Fixing it clears the change request and assigns two reviewers from `reviewers.yml`.
- [ ] One approval doesn't merge; the second merges automatically; the piece shows up in the demo.
- [ ] After a "Request changes" review and a new push, earlier approvals are dismissed.
- [ ] An organization owner can merge without approvals but not with a failing check.
- [ ] The Flag buttons open the right forms, and account flags are invisible to non-members.

Things only a live test can confirm:
- that a "Request changes" review from `github-actions[bot]` blocks the merge until the bot dismisses it;
- that the ruleset JSON imports cleanly.

## Keeping the checker in sync

`registry-practice/.loci/guard.js` is a copy of `demo/server/guard.js`. After changing the demo's guard, copy it again:

```sh
cp demo/server/guard.js demo/github/registry-practice/.loci/guard.js
```

…then commit it to the registry repo as well.
