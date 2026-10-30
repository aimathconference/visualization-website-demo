# Loci: plan for building it for real

This plan turns the `index.html` mockup into a production site. It covers where to host it, how the front end and back end fit together, the order to build things in, and what servers cost at three sizes.

**Recommendation in one line:** host everything on Cloudflare (Workers for the site and API, R2 for visualization files, D1 for the database). Run each visualization inside a sandboxed iframe on a separate domain. Use a public GitHub "registry" repository as the submission and review queue. Server costs stay at roughly $5–15/month across all three tiers in this plan.

---

## 1. What shapes the infrastructure

Four facts about the product decide most of the architecture:

1. **Visualizations are other people's code.** Every slide runs a JavaScript module written by a contributor. Even after review, that code must not be able to read cookies, call the API as the viewer, or reach the network. This is the most important technical constraint in the project.
2. **Rendering happens in the browser.** The server never draws anything. It hands out small files (a 10–50 KB module, an explanation, a thumbnail) and some metadata. So the bulk of traffic is cacheable static files, and **bandwidth (egress) is the cost that grows with popularity**, not compute.
3. **The catalog is curated and open source.** Contributors already work on GitHub, submissions are repositories, and review is two people approving. GitHub's pull requests, required approvals and Actions already do this.
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
- **Blog** posts are MDX files in the site repo, using Astro content collections. No CMS until editors outside the dev team need one.
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
| Likes | Signed-in only. Updated optimistically in the UI. |
| User pages | GitHub avatar by default (the mockup's generated curve avatar as a fallback), username, bio, homepage, GitHub link, their visualizations and posts. Fields come from GitHub at sign-in and can be edited. |
| Newsletter (inline forms only) | The Worker posts to an email provider's API. No popup. |

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
| `POST /api/newsletter` | Forward an email address to the newsletter provider |
| `POST /internal/publish` | Called by the trusted publish workflow only (signed token) |

### Accounts

- **Sign in with GitHub only.** Contributors need GitHub anyway. Readers can browse, customize and embed without an account, and only need one to like, save or contribute.
- Use a small OAuth library (e.g. Arctic) and keep sessions in D1. The session cookie is HttpOnly, Secure and SameSite=Lax, on the main domain only.
- Roles: `reader`, `contributor`, `reviewer`, `editor`, `admin`.

### Data model (D1 / SQLite)

```sql
users(id, github_id UNIQUE, handle UNIQUE, avatar_url, bio, homepage, role, joined_at)
visualizations(id, slug UNIQUE, author_id → users, title, hook, license, repo_url,
               current_version_id, status /* reviewed | community | hidden */, created_at)
versions(id, viz_id → visualizations, commit_sha, bundle_key, files_json,
         param_schema_json, explanation_html_key, published_at)
tags(id, name UNIQUE);  viz_tags(viz_id, tag_id)
likes(user_id, viz_id, created_at, PRIMARY KEY(user_id, viz_id))
saved_settings(user_id, viz_id, settings_json, updated_at)
reviews(id, viz_id, version_id, reviewer_id, kind /* area | teaching */, verdict, pr_url)
posts(id, slug, author_id, title, published_at)  -- body lives in MDX in the site repo
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

1. **Submit.** The contributor opens a PR adding or updating their entry. A "Submit" form on the site can open this PR for them through a GitHub App.
2. **Untrusted check job** (GitHub Actions, no secrets, read-only token):
   - checks the license is OSI-approved (SPDX id) and validates the manifest against a JSON Schema;
   - checks the only import is `@loci/kit` and the bundle is under the size cap (e.g. 200 KB);
   - bundles with esbuild;
   - in headless Chromium, loads the bundle **inside the real sandbox runner**: it must draw non-blank frames, throw no errors and stay within a frame-time budget;
   - renders the thumbnail, share image and optional 6-second preview video;
   - posts a preview link on the PR.
3. **Review.** Branch protection requires **two approvals** from the reviewer team: one subject-area reviewer and one teaching reviewer, as in the mockup's curation checklist. Discussion happens on the PR.
4. **Publish on merge.** A trusted workflow (the only one holding the R2 and API tokens) **rebuilds from the pinned commit** rather than reusing the untrusted job's output. It uploads content-addressed files to R2 (`v/<id>/<sha>/…`, cached forever) and calls `POST /internal/publish`.
5. **Takedown.** Removing or flagging the entry hides it. The API stops serving it, and the runner refuses IDs on a deny-list.

Since the registry repo holds the whole catalog, **the database can always be rebuilt from it**, which doubles as disaster recovery.

### Ranking, search, counters

- **Feed ranking:** a cron job runs hourly and scores each visualization from recency, likes and completion rate (from Analytics Engine), with a boost for reviewed items. Results are written to `feed_rank` per tag.
- **Search:** FTS5 in D1 (verify support first; see section 2). Reconsider a dedicated search service past roughly 1M rows or if typo tolerance becomes important.
- **Views** go to Analytics Engine, not row-per-view writes in D1. Like counts are cached on the visualization row.

### Operations

- **Environments:** each PR gets a preview deploy; there's also staging and production, all deployed with `wrangler` from GitHub Actions.
- **Backups:** D1's built-in point-in-time restore, plus a nightly SQL export to R2. The registry repo is the catalog's source of truth anyway.
- **Monitoring:** Workers Logs; Sentry (free tier at first) for front-end errors; runner errors tagged with the visualization ID so authors can be notified.
- **Moderation:** a report button, an editor queue, and a published contact address for takedown requests.

---

## 5. Build phases

| Phase | Scope | Rough effort (1–2 engineers) |
|---|---|---|
| **0. Decisions** | Final look (one style or reader themes), domain names, draw-contract v1 and `@loci/kit`, license policy, reviewer roster | 1–2 weeks |
| **1. Read-only MVP** | Registry and publish pipeline, sandbox runner, feed, explanation, customize (local only), browse, visualization pages, user pages (from GitHub data), MDX blog, share images. No accounts. | 6–8 weeks |
| **2. Accounts and community** | GitHub sign-in, likes, saved settings, profile editing, embeds, search, newsletter, submit form via GitHub App, reviewer dashboard | 4–6 weeks |
| **3. Scale** | Community (unreviewed) tier, remixes, ranking v2, moderation tools, `OffscreenCanvas` runner, LMS embedding | Ongoing |

**A scaling question for tier 3, beyond servers:** 250,000 visualizations at two human reviews each is about 500,000 reviews. At 20 minutes per review, that is more than 160,000 reviewer-hours. Two decisions would make it workable:

- **Two catalog tiers.** "Reviewed" items make up the curated feed. "Community" items publish after passing the automated checks, run in the same sandbox, are labelled as unreviewed, and can be promoted later.
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
| Two domain names (~$10–15/year each) | ~$2 | ~$2 | ~$2 |
| **Total per month** | **~$2–7** | **~$7** | **~$12–15** |

¹ Tier 1 fits within the Workers free plan (100K requests/day). The $5 plan removes daily caps and is worth it once anything is public.

**If the registry repo were private,** Actions minutes would be billed. Tier 3's ~10,000 builds at ~2 minutes each is about 20,000 minutes, roughly $120–160/month at GitHub's hosted Linux rates. Keeping the registry public fits the open-source premise and avoids this cost.

### Same tiers on Vercel + Supabase, for comparison

| | Tier 1 | Tier 2 | Tier 3 |
|---|---|---|---|
| Vercel Pro ($20/seat, 1 seat) + Supabase Pro ($25) | $45 | $45 | $45 |
| Bandwidth past Vercel's 1 TB (~$0.15/GB) | $0 | $0 | ~$75 |
| Larger Supabase compute (likely at tier 3) | $0 | $0 | ~$5–50 |
| **Total per month** | **~$45** | **~$45** | **~$125–170** |

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
