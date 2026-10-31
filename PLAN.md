# Loci: plan for building it for real

This plan turns the `index.html` mockup into a production site. It covers where to host it, how the front end and back end fit together, the order to build things in, and what servers cost at three sizes. Product requirements, including the four roles (user, moderator, blog maintainer, admin), come from `Wishlist.md`.

**Recommendation in one line:** host everything on Cloudflare (Workers for the site and API, R2 for visualization files, D1 for the database). Run each visualization inside a sandboxed iframe on a separate domain.
- Readers can make an account with just an email address, to like visualizations and keep a list of their likes.
- Contributors and the moderation roles use GitHub. A public "registry" repository is the submission and review queue.
- Hosting costs about $5–35/month across the three tiers in this plan, including the email that sends sign-in links.

---

## 1. What shapes the infrastructure

Four facts about the product decide most of the architecture:

1. **Visualizations are other people's code.** Every slide runs a JavaScript module written by a contributor. Even after review, that code must not be able to read cookies, call the API as the viewer, or reach the network. This is the most important technical constraint in the project.
2. **Rendering happens in the browser.** The server never draws anything. It hands out small files (a 10–50 KB module, an explanation, a thumbnail) and some metadata. So the bulk of traffic is cacheable static files, and **bandwidth (egress) is the cost that grows with popularity**, not compute.
3. **The catalog is curated and open source, and all submission and review happens on GitHub** (wishlist, "Review"). Submissions are pull requests. The wishlist's process maps onto GitHub:
   - a bot verifies each submission and requests changes if it fails;
   - only then are two reviewers assigned, from moderators and admins;
   - changes requested go back to the author, and their edits return to review;
   - the visualization publishes automatically once both reviewers approve;
   - flags.

   Pull requests, reviews, issues and Actions (plus a small bot) do all of this, so the site doesn't need its own moderation system. **Readers are the exception:** someone who only wants to like and save visualizations shouldn't need a GitHub account (section 4).
4. **Writes are rare and small.** Likes, saved settings and profile edits are tiny. Even at 2,000 users the database load is light.

## 2. Hosting: recommendation and alternatives

### Recommended: Cloudflare

| Piece | Cloudflare product | What it does here |
|---|---|---|
| Site + API | **Workers** (with static assets) | Serves the app shell, server-renders shareable pages, runs the JSON API |
| Visualization files | **R2** (object storage) behind a custom domain with caching | Stores bundles, explanations, thumbnails, share images, preview videos |
| Database | **D1** (managed SQLite) | Users, visualizations, tags, likes, saved settings, reviews metadata |
| Sandbox origin | A **second domain** (e.g. `lociusercontent.net`) on the same account | Hosts the iframe runner that executes visualization code |
| Scheduled jobs | **Cron Triggers** | Recomputes feed ranking, exports backups |
| View counting | **Workers Analytics Engine** | Records completed views without a database write per view |
| Email | An outside **transactional email** provider (e.g. Resend or Postmark) | Sends sign-in links to readers without GitHub. Review notifications come from GitHub itself. |

Why Cloudflare:

- **No egress fees.** R2 and Workers don't charge for bandwidth. That covers the cost that grows with traffic (section 1, point 2), and it's the main reason costs stay flat.
- **Low fixed cost.** The Workers Paid plan is $5/month for the account and includes 10M requests. D1 and R2 have free allowances that cover tiers 1 and 2 entirely.
- **Running a second domain for the sandbox is easy**, with the same deploy tooling (`wrangler`).
- **Lock-in stays modest.** D1 is SQLite, so the schema and queries are standard SQL. R2 speaks the S3 API. Moving to Postgres plus S3 later is a migration, not a rewrite.

Known limits to plan around:

- A D1 database is capped at 10 GB. Tier 3 is estimated at about 2 GB, so it fits. If it outgrows that, move to Postgres (Neon or Supabase) and connect it through Cloudflare **Hyperdrive**. The API layer stays the same.
- Full-text search would use SQLite FTS5. Community reports say FTS5 works on D1, but I couldn't find it in Cloudflare's official docs. **Verify this before building search on it.** The fallback is a hosted search service such as Typesense or Meilisearch Cloud.

### Alternatives considered

| Option | Good at | Why not first choice |
|---|---|---|
| **Vercel + Supabase** | Excellent developer experience, real Postgres, built-in auth | About $45/month minimum (Vercel Pro $20/seat + Supabase Pro $25). Vercel bills bandwidth past 1 TB/month (third-party sources cite about $0.15/GB), so a popular month gets expensive. Workable if R2 serves the visualization files. |
| **AWS** (CloudFront, S3, Lambda, RDS) | Most flexible, institution-friendly | Most operations work for a small team. A managed database alone costs more than the whole Cloudflare stack here. |
| **A single VPS** (e.g. Hetzner, DigitalOcean) | Cheap and simple to reason about | You own patching, backups and uptime. It still needs a CDN in front and a second domain for the sandbox. |

---

## 3. Front end plan

### Stack

- **Astro** with TypeScript, deployed to Workers through Astro's Cloudflare adapter.
  - Static or server-rendered pages for everything that needs a URL and a link preview: visualization pages (`/v/:slug`), user pages (`/u/:handle`), browse, blog.
  - The **feed** and the **Customize/Explanation drawer** are interactive "islands" in plain TypeScript or Preact. Most of the mockup's feed code (snap scrolling, `IntersectionObserver`, keyboard shortcuts, drawer) ports over directly.
- **Blog** posts are MDX files in the site repo, using Astro content collections.
  - Blog maintainers (a GitHub team, section 4) write a post as a pull request. The preview deploy shows it rendered, and merging publishes it.
  - A post's front matter lists its curated collection of visualizations, which becomes its "Watch these in the feed" playlist, as in the mockup.
  - No CMS until editors outside GitHub need one.
- **Styling** keeps the mockup's design-token approach (CSS custom properties per theme). Decide whether one style ships as *the* look, or whether the six mockup styles become a reader-selectable theme. The token system supports either.

### The visualization runtime (the core piece)

Each slide hosts an `<iframe>` pointing at a tiny runner page on the sandbox domain:

```
https://lociusercontent.net/run/<viz-id>/<version-sha>/
```

- `sandbox="allow-scripts"` **without** `allow-same-origin`, so the frame gets an opaque origin: no cookies, no storage, and no access to the parent page.
- The runner's Content-Security-Policy blocks all network access, e.g. `default-src 'none'; script-src https://lociusercontent.net; connect-src 'none'; img-src data: blob:`. Even reviewed code can't phone home.
- A separate *registrable* domain, not a subdomain of the main site, so it is a different site to the browser and can never share cookies with it.
- **Parent ⇄ runner protocol** over `postMessage`, using the draw contract from the mockup:
  - Parent → runner: `init {theme, params, box, dpr, reducedMotion}`, `set {params|theme}`, `pause`, `resume`, `seek {t}`.
  - Runner → parent: `ready`, `error {message}`, `perf {avgFrameMs}`.
- **Virtualize the feed.** Keep at most three live iframes (previous, current, next). Other slides show their thumbnail image. Pause anything off screen.
- **Watchdog.** If a visualization throws, or averages more than about 40 ms per frame on the viewer's device, swap in its thumbnail (or preview video) with a "paused: tap to retry" note, and report the error with its ID.
- **Later optimization:** inside the runner, draw on an `OffscreenCanvas` in a worker so heavy visualizations don't block the frame's main thread.

### Features, mapped from the mockup

| Mockup feature | Production version |
|---|---|
| Feed with topic chips | Server returns a ranked list per tag (section 4). The client keeps the next page prefetched. |
| Explanation drawer | `explanation.md` rendered at publish time to sanitized HTML and stored next to the bundle. Raw `.md` stays viewable. |
| Customize panel | Generated from the parameter schema in the visualization's manifest (range, select, toggle, color). Settings are saved per user when signed in, otherwise in `localStorage`. |
| Source tab | Links to the exact commit on GitHub and shows the published bundle's source. |
| Share / embed | `/v/:slug` with a share image. `/embed/:slug?cfg=…` is an iframe snippet for course pages and LMSs. |
| Likes | Any signed-in account (email or GitHub). Updated optimistically in the UI. The total is shown on every slide in the feed. |
| **My likes** (new, from the wishlist) | `/me/likes`: a grid of everything you've liked, with **"Play in the feed"**. This uses the same playlist mechanism the mockup's blog posts already use. |
| User pages | Contributors: GitHub avatar, username, bio, homepage, GitHub link, their visualizations and posts. Fields come from GitHub and can be edited. Email-only readers have a private account page and no public profile, because they haven't published anything. |
| How to submit (new) | `/submit`: a guide to the registry's format and code requirements, with a link to open a pull request on GitHub. Submitting itself happens on GitHub (wishlist). |
| **My submissions** (new) | `/me/submissions`, for accounts with GitHub linked: each submission's status, mirrored from GitHub (checks failed, in review, changes requested, published, closed), with a link to the pull request. |
| **Account settings** (new) | `/me/settings`: **newsletter preferences** (wishlist), link or unlink GitHub, change email, delete account. |
| Moderator tools (new) | For signed-in moderators, a **Flag** button on slides and profiles with three choices: *flag for removal*, *request changes* (on a published visualization), *flag account*. Each opens a prefilled issue (section 4). Reviewing happens on GitHub. |
| Newsletter (inline forms) | Anyone can subscribe from the inline forms without an account. The forms subscribe to **Best of the month** by default, with checkboxes for the other two lists. Signed-in users manage their subscription in Account settings. No popup. |

### Quality bars

- **Accessibility:** full keyboard support, `prefers-reduced-motion` respected (animations start paused), a text alternative for each canvas (title plus the first paragraph of the explanation), and color palettes checked for contrast.
- **Performance budget:** app shell under 150 KB gzipped; first visualization drawing within 2 s on a mid-range phone over 4G.
- **Analytics:** Cloudflare Web Analytics (cookieless) for traffic. Completed-view and drop-off events go to Analytics Engine, and those feed the ranking.

---

## 4. Back end plan

### API (Workers + Hono router)

| Endpoint | Purpose |
|---|---|
| `GET /api/feed?tag=&cursor=` | Ranked page of visualization summaries |
| `GET /api/viz/:slug` | Metadata, current version, file URLs |
| `GET /api/users/:handle` | Profile + their visualizations and posts |
| `GET /api/search?q=` | Full-text search over titles, tags, authors, explanations |
| `POST/DELETE /api/viz/:id/like` | Like / unlike (signed in) |
| `PUT /api/viz/:id/settings` | Save Customize settings (signed in) |
| `PATCH /api/me` | Edit own bio, homepage, avatar |
| `GET /api/me/likes` | Your liked visualizations (also used as a feed playlist) |
| `GET /api/me/submissions` | Your submissions and their review status (mirrored from GitHub) |
| `GET/PUT /api/me/newsletter` | Read and change your newsletter preferences (synced to the newsletter provider) |
| `POST /auth/email/start`, `GET /auth/email/verify` | Send and redeem an email sign-in link |
| `GET /auth/github`, `GET /auth/github/callback` | GitHub sign-in, or linking GitHub to an existing email account |
| `DELETE /api/me` | Delete your own account |
| `POST /api/admin/hide/:id`, `DELETE /api/admin/users/:id` | Admin: immediate takedown, account removal |
| `POST /api/newsletter` | Forward an email address to the newsletter provider |
| `POST /internal/publish` | Called by the trusted publish workflow only (signed token) |
| `POST /internal/github-webhook` | Pull request and review events, used to mirror review status and team membership |
| `POST /internal/newsletter-webhook` | Unsubscribes and preference changes made from links in the emails themselves |

### Accounts

There are two ways in. Both lead to the same kind of account, and the two can be linked.

- **Email sign-in link, for readers.** Enter an email address and click a one-time link valid for 15 minutes. No password or GitHub needed. This is enough to like visualizations, keep and play a likes list, and save Customize settings.
- **GitHub, for contributors and the moderation roles.** Signing in with GitHub, or **linking and authenticating GitHub** from account settings, connects your GitHub submissions to your site account (wishlist). A reader who later becomes a contributor keeps their likes.
  - Visualizations from GitHub users who never linked an account still publish. They're credited to an unclaimed profile under the GitHub handle, which becomes theirs as soon as they link GitHub.
- Use a small OAuth library (e.g. Arctic) for GitHub. Store email sign-in tokens hashed and single-use. Sessions live in D1, and the session cookie is HttpOnly, Secure and SameSite=Lax, on the main domain only.
- Without signing in, anyone can browse, customize, embed and join the newsletter.
- **Newsletter preferences** (wishlist). In Account settings, signed-in users choose any combination of three lists, or none:
  - **Best of the month:** the monthly roundup of top visualizations, like the mockup's "Monthly Locus".
  - **Development blog:** news about the site and its development.
  - **Miscellany:** everything else.
  - The newsletter provider stays the source of truth: the site writes through its subscriber API, and a webhook catches unsubscribes made from links in the emails.
  - Choose a provider with both a subscriber API and webhooks.
  - Accounts signed up with GitHub use the verified primary email GitHub returns, if the person agrees, or one they enter.
  - Someone who subscribed before making an account is matched to it by email.
- Anyone can delete their own account, which also deletes their likes and saved settings.
- *Optional later:* passkeys as a third way to sign in, for readers who'd rather not wait for an email.

### Roles: the wishlist's four roles, mapped to GitHub

Roles form a strict hierarchy, as the wishlist describes. Every role above **User** is held through membership of a GitHub team in the `loci-viz` organization. The site reads team membership at sign-in and from webhooks to decide what to show.

| Wishlist role | Granted by | Where they act |
|---|---|---|
| **User** | Any account (email or GitHub) | Site: like, my likes, saved settings, newsletter preferences. Anyone can submit on GitHub; linking GitHub attaches those submissions to the site account. |
| **Moderator** | `@loci-viz/moderators` team | Registry pull requests they're assigned to: approve or request changes. Flag issues: removal, changes to a published visualization, accounts. |
| **Blog maintainer** | `@loci-viz/blog` team, set up as a **child team of moderators** so it inherits everything moderators can do | Site repo: blog posts via pull requests to `content/blog/` |
| **Admin** | Organization owners, or an `@loci-viz/admins` team that's a child of `blog` | Everything above, plus the flag queue, removing any visualization or account, and the site's admin endpoints. **No review bypass in production** (wishlist: bypass is for the demo only). |

Nested teams in GitHub inherit their parent team's repository access, which gives the hierarchy. Moderators need write access to the registry so their approvals count toward the merge rule. The review bot picks reviewers itself (section 4), so it doesn't depend on GitHub's own team-assignment settings.

### Data model (D1 / SQLite)

```sql
users(id, email UNIQUE NULL, github_id UNIQUE NULL, github_login NULL,
      handle UNIQUE NULL /* set when GitHub is linked */, claimed /* 0 for unclaimed contributor profiles */,
      avatar_url, bio, homepage, role /* user | moderator | blog | admin, synced from GitHub teams */,
      newsletter_json /* {subscribed, lists: ["best-of-month", "dev-blog", "miscellany"]}, mirrored from the provider */, removed_at, joined_at)
login_tokens(token_hash PRIMARY KEY, email, expires_at, used_at)
sessions(id, user_id → users, expires_at)
submissions(id, viz_slug, author_id → users, pr_number, status /* checks_failed | in_review |
            changes_requested | published | closed */, reviewers_json, updated_at)   -- mirrored from GitHub webhooks
blocked_identities(kind /* email | github */, value, reason, created_at)
visualizations(id, slug UNIQUE, author_id → users, title, hook, license, repo_url,
               current_version_id, status /* reviewed | community | hidden */, created_at)
versions(id, viz_id → visualizations, commit_sha, bundle_key, files_json,
         param_schema_json, explanation_html_key, published_at)
tags(id, name UNIQUE);  viz_tags(viz_id, tag_id)
likes(user_id, viz_id, created_at, PRIMARY KEY(user_id, viz_id))
saved_settings(user_id, viz_id, settings_json, updated_at)
reviews(id, viz_id, version_id, reviewer_id, verdict, pr_url)   -- who approved each published version
posts(id, slug, title, published_at)  -- body lives in MDX in the site repo
post_authors(post_id, user_id, position, PRIMARY KEY(post_id, user_id))  -- one or more per post
feed_rank(tag_id, viz_id, score, computed_at)    -- rebuilt by a cron job
viz_search  -- FTS5 virtual table over title, hook, tags, author, explanation text
```

Versions are **immutable**. Updating a visualization publishes a new version and moves `current_version_id`, so rollback is a single update.

### Submission, review and publishing pipeline

The **registry** is a public repo (`loci-viz/registry`) with one small JSON file per visualization, pointing at the contributor's repo and a pinned commit:

```json
{ "id": "times-table", "repo": "https://github.com/someone/times-table",
  "commit": "3f2a9c1…", "entry": "src/index.js", "explanation": "explanation.md" }
```

1. **Submit.** The contributor opens a pull request adding or updating their entry. The site's `/submit` page explains the format and links there.
2. **Untrusted check job** (GitHub Actions, no secrets, read-only token). These checks are the "code requirements" the wishlist says are still to come; the list below is a starting point.
   - checks the license is OSI-approved (SPDX id) and validates the manifest against a JSON Schema;
   - checks the only import is `@loci/kit` and the bundle is under the size cap (e.g. 200 KB);
   - bundles with esbuild;
   - in headless Chromium, loads the bundle **inside the real sandbox runner**: it must draw non-blank frames, throw no errors and stay within a frame-time budget;
   - renders the thumbnail, share image and optional 6-second preview video;
   - posts a preview link on the PR.
3. **The review bot** (a GitHub App, run by a `workflow_run` workflow after the check job finishes). It runs with the base repository's permissions, so it **never checks out or runs the submitted code**. It only reads the check job's result file, and treats that as untrusted data.
   - **Checks failed:** the bot posts a **"Request changes"** review listing what failed (wishlist). Nobody else is assigned yet.
   - **Checks passed:** the bot dismisses any earlier change request of its own. It then requests **two reviewers**, drawn at random from the moderators and admins listed in `reviewers.yml` in the registry, never the author. On a revision it re-requests the same two.
   - **Later:** reviewers list their areas in `reviewers.yml`, and the bot prefers moderators whose areas overlap the submission's tags, falling back to random (wishlist). It can also skip people with many open reviews.
4. **Review: the wishlist's rules, implemented with GitHub settings.**

   | Wishlist rule | GitHub setting |
   |---|---|
   | A bot verifies the code requirements and requests changes if they fail | The check job (step 2) and the review bot (step 3). A ruleset requires the check to pass, with **no bypass for anyone**. |
   | Two moderators (admins included) are assigned once it verifies | The review bot (step 3). |
   | Both reviewers must approve | A ruleset on `main` requires **2 approving reviews** from people with write access (the moderator and admin teams). Optionally the bot also checks that both approvals come from the two assigned reviewers. |
   | Request changes, sent to the author, edits go back into review | A **"Request changes"** review notifies the author on GitHub. The author updates the pinned commit in the same pull request. The checks run again. "Dismiss stale approvals when new commits are pushed" plus "require approval of the most recent push" mean both reviewers must approve the revision. |
   | Automatically uploaded once both approve | When checks pass, the bot turns on **auto-merge** for the pull request. GitHub merges it as soon as the two approvals arrive, and the merge triggers publishing (step 5). |
   | Flag a published visualization for changes | The site's **Flag → Request changes** button (moderators only) opens an issue in the registry labelled `flag:changes`, which @-mentions the author. Their fix is a new pull request that goes through steps 2–4 like any submission. |
   | Flag a visualization for removal | The **Flag → Removal** button opens an issue in the registry labelled `flag:removal`, with the reason. |
   | Flag an account for removal | An issue in a **private** `loci-viz/moderation` repo, labelled `flag:account`. It's private so discussions about people aren't public. |
   | Admin sees all flagged visualizations | Saved issue searches on the `flag:*` labels across both repos. |
   | Admin removes any visualization | Immediate: `POST /api/admin/hide/:id` takes it down at once. Permanent: a pull request removing the entry. It goes through normal review, because production has no bypass. |
   | Admin removes any account | Readers: `DELETE /api/admin/users/:id` (hides content, ends sessions, blocks the identity). Contributors: the same, plus **blocking the user** in the GitHub organization. |
   | Admin uploads bypassing review | **Demo only** (wishlist). In production, neither ruleset has bypass actors, so admins' submissions get the same bot check and two reviews as everyone's. |

   **There is no "deny" in the wishlist.** A submission that isn't accepted stays in "changes requested". Proposal: the bot closes pull requests with no activity for 120 days, with a note that they can be reopened. Admins can close spam immediately, as normal GitHub moderation.

   GitHub webhooks update `submissions.status`, so contributors with a linked account also see where their submission stands on the site's "My submissions" page.

5. **Publish on merge.** A trusted workflow (the only one holding the R2 and API tokens) **rebuilds from the pinned commit** rather than reusing the untrusted job's output. It uploads content-addressed files to R2 (`v/<id>/<sha>/…`, cached forever) and calls `POST /internal/publish`.
6. **Takedown.** Hiding is instant through the admin endpoint. Removing the entry from the registry makes it permanent. Either way the API stops serving it, and the runner refuses IDs on a deny-list.

Since the registry repo holds the whole catalog, **the database can always be rebuilt from it**, which doubles as disaster recovery.

### Ranking, search, counters

- **Feed ranking:** a cron job runs hourly and scores each visualization from recency, likes and completion rate (from Analytics Engine), with a boost for reviewed items. Results are written to `feed_rank` per tag.
- **Search:** FTS5 in D1 (verify support first; see section 2). Reconsider a dedicated search service past roughly 1M rows or if typo tolerance becomes important.
- **Views** go to Analytics Engine, not row-per-view writes in D1. Like counts are cached on the visualization row.

### Operations

- **Environments:** each PR gets a preview deploy; there's also staging and production, all deployed with `wrangler` from GitHub Actions.
- **Backups:** D1's built-in point-in-time restore, plus a nightly SQL export to R2. The registry repo is the catalog's source of truth anyway.
- **Monitoring:** Workers Logs; Sentry (free tier at first) for front-end errors; runner errors tagged with the visualization ID so authors can be notified.
- **Moderation:** handled on GitHub (section 4), plus a published contact address for takedown requests from the public. Optionally, a "Report" button for all signed-in users that opens a flag issue for moderators to triage. The wishlist only gives flagging to moderators, so this is an addition to decide on.

---

## 5. Build phases

| Phase | Scope | Rough effort (1–2 engineers) |
|---|---|---|
| **0. Decisions** | Final look (one style or reader themes), domain names, draw-contract v1 and `@loci/kit`, license policy, the first moderators, blog maintainers and admins, the GitHub organization's teams and rulesets | 1–2 weeks |
| **1. Read-only MVP** | Registry and publish pipeline; **review bot** (check results as change requests, random assignment of two reviewers, auto-merge, closing stale pull requests); rulesets; flag issue templates; sandbox runner, feed, explanation, customize (local only), browse, visualization pages, user pages (from GitHub data, unclaimed profiles), MDX blog via pull requests, share images. No site accounts yet: contributors and moderators already work on GitHub. | 7–9 weeks |
| **2. Accounts and community** | Email sign-in links and GitHub sign-in with account linking and profile claiming, likes, **my likes + play in feed**, saved settings, **account settings with newsletter preferences** (provider API + webhook), profile editing, role sync from GitHub teams, admin takedown and account removal, "My submissions" status page, Flag button (removal / request changes / account), `/submit` guide, embeds, search | 5–7 weeks |
| **3. Scale** | **Tag-based reviewer assignment**, ranking v2, `OffscreenCanvas` runner, LMS embedding, and the review-capacity options below | Ongoing |

**A scaling question for tier 3, beyond servers:** the wishlist's rule of two reviewers per submission means 250,000 visualizations is about 500,000 reviews. At 20 minutes per review, that is more than 160,000 reviewer-hours. The options:

- **Grow the moderator pool** in step with submissions. At tier 3 that means hundreds of active moderators. Tag-based assignment helps them review faster, because each piece reaches someone who knows the area.
- **Two catalog tiers.** "Reviewed" items make up the curated feed. "Community" items publish after passing the automated checks, run in the same sandbox, are labelled as unreviewed, and can be promoted later. This bends the wishlist's rule that everything is reviewed, so it's a product decision.
- **Remixes as configs.** If most of the 250,000 are variations of existing pieces (an average of 125 per user suggests they will be), store a remix as a small settings file pointing at its parent's bundle, not as new code needing review. A remix then costs about 1 KB and no review.

---

## 6. Server cost estimates

### Assumptions

"Users" means registered accounts. Most cost comes from **viewers**, including anonymous ones, so each tier assumes a traffic level. Those traffic numbers are my guesses, not given figures. Costs scale roughly linearly with them.

| | Tier 1 | Tier 2 | Tier 3 |
|---|---|---|---|
| Registered users | 10 | 100 | 2,000 |
| Visualizations | 100 | 10,000 | 250,000 |
| Monthly visitors (assumed) | ~200 | ~5,000 | ~100,000 |
| Feed sessions / month (assumed) | ~1,000 | ~20,000 | ~500,000 |
| Bandwidth (≈3 MB per session) | ~3 GB | ~60 GB | ~1.5 TB |
| API / page requests (≈11 per session) | ~11 K | ~220 K | ~5.5 M |
| Stored files (≈0.77 MB per visualization × 1.5 versions kept) | ~0.1 GB | ~12 GB | ~290 GB |
| New or updated visualizations / month | ~10 | ~400 | ~10,000 |

Per-visualization files assumed: bundle about 40 KB, explanation 5 KB, thumbnail 40 KB, share image 80 KB, optional preview video 600 KB. Without preview videos, tier 3 storage drops to about 60 GB.

### Recommended stack (Cloudflare)

| Line item | Tier 1 | Tier 2 | Tier 3 |
|---|---|---|---|
| Workers Paid plan (10M requests included) | $0–5 ¹ | $5 | $5 |
| Workers request / CPU overage | $0 | $0 | ~$0–1 |
| R2 storage ($0.015/GB-month after 10 GB free) | $0 | ~$0.03 | ~$4.20 |
| R2 operations (1M writes, 10M reads free/month; reads mostly served from cache) | $0 | $0 | $0 |
| D1 (5 GB, 25B row reads, 50M row writes included) | $0 | $0 | $0 |
| Bandwidth | $0 | $0 | $0 |
| Build CI (GitHub Actions, **public** registry repo) | $0 | $0 | $0 |
| Transactional email for sign-in links ² | $0 | $0 | ~$0–20 |
| Two domain names (~$10–15/year each) | ~$2 | ~$2 | ~$2 |
| **Total per month** | **~$2–7** | **~$7** | **~$12–35** |

¹ Tier 1 fits within the Workers free plan (100K requests/day). The $5 plan removes daily caps and is worth it once anything is public.

² Assumes up to 2 sign-in emails per registered user per month: about 20, 200 and 4,000 emails. Resend's free tier is reported at 3,000 emails a month (and 100 a day), so tiers 1–2 are free, and tier 3 may need its entry paid plan, reported at about $20/month. Longer sessions (e.g. 90 days) or passkeys reduce the volume. GitHub sends review notifications at no cost to the site.

**If the registry repo were private,** Actions minutes would be billed. Tier 3's ~10,000 builds at ~2 minutes each is about 20,000 minutes, roughly $120–160/month at GitHub's hosted Linux rates. Keeping the registry public fits the open-source premise and avoids this cost.

### Same tiers on Vercel + Supabase, for comparison

| | Tier 1 | Tier 2 | Tier 3 |
|---|---|---|---|
| Vercel Pro ($20/seat, 1 seat) + Supabase Pro ($25) | $45 | $45 | $45 |
| Bandwidth past Vercel's 1 TB (~$0.15/GB) | $0 | $0 | ~$75 |
| Larger Supabase compute (likely at tier 3) | $0 | $0 | ~$5–50 |
| Transactional email (same as above) | $0 | $0 | ~$0–20 |
| **Total per month** | **~$45** | **~$45** | **~$125–190** |

### If it goes viral

Suppose tier 3's traffic is 10 times higher for a month (5M sessions, about 15 TB):

- **Cloudflare:** about $35–45/month. That's roughly 45M extra requests, extra CPU time and some cache-miss reads from R2, still with no bandwidth charges.
- **Vercel bandwidth alone:** about $2,000 or more. This risk is why section 2 recommends serving visualization files from R2 even on a Vercel setup.

### Costs that aren't servers

| Item | Notes |
|---|---|
| Newsletter provider | Free at small subscriber counts. Tens of dollars a month at several thousand subscribers. |
| Error monitoring (Sentry) | Free tier likely covers tiers 1–2. |
| **Reviewer time** | Much bigger than every server line combined at tier 3 (see section 5). |

### Pricing sources

Checked October 29, 2026. Prices change, so confirm on the vendors' pages before committing a budget. Workers overage rates ($0.30 per extra million requests, $0.02 per extra million CPU-ms) and GitHub Actions per-minute rates are from memory and were not re-verified.

- [Cloudflare R2 pricing](https://developers.cloudflare.com/r2/pricing/): storage, operation classes, free allowance, free egress.
- [Cloudflare D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/) and [D1 limits](https://developers.cloudflare.com/d1/platform/limits): included rows and storage, 10 GB per-database cap.
- [Cloudflare Workers pricing (docs)](https://6e8c1c3a.previews.developers.cloudflare.com/workers/platform/pricing/index.md) and [Cloudflare Workers pricing summary (third-party)](https://costbench.com/software/cloud-infrastructure/cloudflare-pages-workers/): $5 minimum, 10M requests, no egress charges.
- [Vercel cost guide (third-party)](https://makerkit.dev/blog/saas/vercel-cost) and [Supabase pricing (third-party)](https://www.budgetforge.dev/tools/supabase-pricing-2026): $20/seat, $25 Pro, compute tiers, bandwidth overage.
- [Resend pricing (third-party)](https://costbench.com/software/email-api/resend/) and [Postmark vs Resend pricing (third-party)](https://costbench.com/compare/postmark-vs-resend/): free-tier email allowances and entry paid plans. Checked October 30, 2026.
