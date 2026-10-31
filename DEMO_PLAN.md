# Loci: plan for a working demo hosted locally

This plan covers a working version of Loci for a 30-person trial team. It runs on the team's **NVIDIA DGX Spark** and is reached over **Tailscale** from everyone's own phones and laptops. People can browse the feed, like things and replay their likes, customize and remix visualizations, write their own, and try the wishlist's review process on a practice GitHub repository.

This is a demo, not the production build in `PLAN.md`. It skips cloud hosting, email sign-in and GitHub sign-in. It keeps the parts that would be expensive to get wrong later:
- the sandbox that runs visualization code;
- the data model;
- an API shaped so it can move to Cloudflare Workers + D1 with little rewriting;
- the GitHub review setup, which is the real one, pointed at a practice repo.

**In one line:** a single Node.js server (Hono + SQLite) on the Spark serves the existing mockup turned into a real app. `tailscale serve` publishes it on the team's tailnet at a stable HTTPS address, and Tailscale tells the server who each visitor is, so the demo needs no login system of its own.

> **Revision notes.**
> - **Spark and Tailscale:** an always-on Spark serving over Tailscale replaces a laptop and Cloudflare Tunnel. Tailscale identity replaces handle-and-cookie accounts. Two optional features use the Spark's hardware (section 7).
> - **`Wishlist.md`:**
>   - A **My likes** page with "Play in the feed".
>   - The four **roles** (user, moderator, blog maintainer, admin).
>   - Separate places for **reviewed** and **unreviewed** work: the main feed shows only reviewed pieces, and Playground posts appear in a labelled Playground tab, visible only to their author.
>   - A **review dry run** on a practice GitHub repo using the production rules: two reviewers, both approve, request changes, flags, admin bypass (section 8).
>   - **Blog posts** written by blog maintainers as pull requests.
> - **Amended `Wishlist.md`:**
>   - A **review bot** checks each submission first and requests changes if it fails.
>   - Only then does it assign two **random** reviewers from the moderators and admins, and it **auto-merges** after both approve.
>   - There's no "deny".
>   - Moderators can **request changes on published pieces**.
>   - Users can set **newsletter preferences**.
>   - **Admin bypass is demo-only.**
> - **Built on the `demo` branch** (code in `demo/`; hosting steps in `demo/SPARK_SETUP.md`):
>   - Only the mockup's **Night feed** style ships. The other five styles and their fonts were removed, along with the style switcher.
>   - Writes require an `X-Loci` header and a same-origin request. `tailscale serve` attaches identity to every request from a member's device, so without this any website they visit could act as them (cross-site request forgery).
>   - A visualization's title, description, tags and license come from its code, in the Playground as in the registry.
>   - Thumbnails are rendered in an admin's or the author's browser and uploaded; the optional server-side headless check (layer 4) isn't built yet.
>   - No blog-pull timer: an automatic `git pull` would also pull code changes into a running server. After merging a post, run `git pull` and then **Admin → Reload blog posts**.

---

## 1. What people can do in the demo

| # | Feature | Who | Notes |
|---|---|---|---|
| 1 | **Browse the feed, catalog and blog** | everyone | The main feed shows **reviewed** pieces only: the six seed visualizations from the mockup, plus anything approved in the review dry run. The demo uses the mockup's Night feed style only. |
| 2 | **Set up a profile** | everyone | On the first visit, Tailscale has already identified the person. They choose a `@handle`, pick a generated curve avatar (or use their Tailscale profile picture), and optionally add a homepage and GitHub username. The same account works on every device they've signed into Tailscale with. |
| 3 | **Like** | user | Counts show on every slide and update on everyone's screen within a few seconds. |
| 4 | **My likes** | user | A grid of everything you've liked, with **"Play in the feed"**. This reuses the playlist mechanism the mockup already has for blog posts. |
| 5 | **Customize and save as a remix** | user | Change palette, font, speed and the visualization's parameter, then "Save as remix". Remixes appear on your profile and in the Playground tab, not in the reviewed feed. |
| 6 | **Write visualizations in the Playground** | user | A code editor with live preview, starting from a template. **"Post to Playground"** puts it in your Playground tab right away, labelled *not reviewed*: only you can see it, and you can delete it. **"Submit for review"** sends it to the practice registry (section 8). If approved there, it appears in the main feed. |
| 7 | **Review submissions** | moderator | On the practice GitHub repo, a bot checks each submission and requests changes if it fails. If it passes, the bot assigns two random reviewers from the moderators and admins. They approve or request changes, and two approvals publish it automatically (section 8). |
| 8 | **Flag** | moderator | A **Flag** button on slides and profiles with three choices, each opening a prefilled GitHub issue: *removal* and *request changes* (practice registry), *account* (private practice repo). |
| 9 | **Write blog posts** | blog maintainer | Posts are Markdown files in the demo's repo, added by pull request. The Spark picks them up after merge (section 8). |
| 10 | **Newsletter preferences** | user | An Account settings page with checkboxes for the three lists (**Best of the month**, **Development blog**, **Miscellany**), and an inline signup form for anyone. The demo **stores preferences but sends nothing**, so the trial tests the controls only. |
| 11 | **Admin** | admin | Hide or remove any visualization; remove an account (blocks that Tailscale login); **promote a Playground piece straight to the main feed**; assign roles; pin items; export all data; reset to seed data. Promoting is the wishlist's review bypass, which exists **only in the demo**. |

Stretch goals, if time allows:

- **Projector "wall" view** (`/wall`): a big-screen page cycling through the newest and most-liked pieces.
- **Feedback box:** a short form on every page whose answers land in the admin export.
- **AI help in the Playground:** section 7. It's the main use for the Spark's GPU.

---

## 2. Architecture

```
  phones / laptops of the 30 trial users (each running Tailscale)
        │  HTTPS over the tailnet  →  https://spark.<tailnet>.ts.net
        ▼
  ┌────────────────────────────── DGX Spark (DGX OS, arm64) ──────────────────────────────┐
  │  tailscale serve  :443  ── TLS, adds Tailscale-User-* identity headers ──┐            │
  │                                                                           ▼            │
  │  one Node.js process, listening on 127.0.0.1:3300 only  (systemd service)              │
  │   Hono app                                                                             │
  │    ├─ static files: /           app shell, CSS, vendored fonts                         │
  │    ├─ JSON API:     /api/*      feed, users, likes, playground, admin…                 │
  │    └─ runner:       /run/:id    sandboxed page that runs one visualization's code      │
  │   SQLite (better-sqlite3, WAL mode)   data/loci.db                                     │
  │   Thumbnails on disk                  data/thumbs/*.webp                               │
  │   Blog posts                          content/blog/*.md (from the demo repo)           │
  │   Registry importer ── polls GitHub every 60 s ──► practice registry repo (section 8)  │
  │                                                                                        │
  │  optional: headless Chromium (publish-time checks)   optional: local model (GPU)       │
  └────────────────────────────────────────────────────────────────────────────────────────┘
```

Why this stack:

- **Hono** runs on Node now (`@hono/node-server`) and on Cloudflare Workers later, so the routes carry over to the production plan.
- **SQLite** is the same database engine as Cloudflare D1, so the schema and queries carry over too. `better-sqlite3` is fast, synchronous and needs no separate server. WAL mode lets reads continue during writes.
- **One process behind `tailscale serve`** is easy to run as a service. Thirty people is a tiny load: about 6 requests per second from polling, plus page loads.
- **No front-end build step.** The mockup is already plain JavaScript. Splitting it into ES modules served as-is keeps iteration fast. A framework (Astro, per `PLAN.md`) can come with the production build.
- **Review lives on GitHub, as in production.** The demo doesn't build its own review system. It only imports what the practice registry approves, so the trial tests the real workflow without code that would be thrown away.

**What the Spark adds, and what it doesn't.** The Spark is far more machine than the core demo needs. A laptop would serve 30 people fine. Its real advantages here:

- it's always on, so the trial can run for weeks;
- it has spare CPU for publish-time checks in a headless browser;
- it has a GPU with 128 GB of unified memory, which could run an AI assistant locally.

**The GPU does nothing for the visualizations themselves.** They draw in each viewer's own browser, so a slow phone is still a slow phone.

---

## 3. Hosting and network

### Primary: `tailscale serve` on the Spark

The Spark runs NVIDIA DGX OS, which is based on Ubuntu 22.04, on an **arm64** CPU. One-time setup:

```sh
# Node 22 for arm64 (NodeSource or nvm), plus build tools in case better-sqlite3 has no arm64 prebuild
sudo apt install -y build-essential python3
# app
git clone … && cd demo && npm ci && npm run seed
sudo cp deploy/loci-demo.service /etc/systemd/system/ && sudo systemctl enable --now loci-demo
# publish on the tailnet with HTTPS (needs MagicDNS + HTTPS certificates enabled in the Tailscale admin console)
sudo tailscale serve --bg 3300
# → https://spark.<tailnet>.ts.net
```

What this gives you:

- **A stable HTTPS address** with a real certificate. Browser features that need a secure context work everywhere: clipboard copy, `crypto.randomUUID`, fullscreen on browsers that support it.
- **Only the trial team can reach it.** Nothing is exposed to the internet, unlike a public tunnel URL. A QR code is still handy for phones.
- **Wi-Fi restrictions don't matter.** Tailscale connects devices even when the local network blocks device-to-device traffic, falling back to Tailscale's relay servers if needed. It does need internet access on both ends.
- **Identity for free** (section 5): `tailscale serve` tells the app which Tailscale user sent each request.

### Giving the 30 people access

The steps depend on whether the trial team shares a tailnet with the Spark:

- **Same tailnet** (e.g. an organization tailnet): add an access rule letting a `group:loci-trial` reach the Spark on port 443 only. The trial users' devices must be **personal (untagged) devices**, because Tailscale sends no identity for requests from tagged devices.
- **Their own personal tailnets:** **share the Spark** with each person from the admin console. They accept the invite, and the Spark appears in their tailnet. Tailscale's docs say identity headers are still provided for users of a shared device, which is what this demo needs. Confirm it with one external tester early.

### Fallback: no internet at a live session

Tailscale needs internet to set up connections. If a session happens somewhere with no internet:

- Bring a travel router, put the Spark and the devices on it, and use `http://<spark-ip>:3300`. Without `tailscale serve` there are **no identity headers**.
- Start the server with `AUTH_MODE=local`, which enables a simple fallback: pick a handle, and the account is kept in a cookie.
- Plain HTTP on a LAN IP is not a secure context, so copy-to-clipboard needs its select-the-text fallback.
- The review dry run needs GitHub, so it pauses while offline. Everything else keeps working.

Treat this as an emergency option. Build the local auth mode last, or skip it if all sessions will have internet.

---

## 4. Front end

Start from `index.html` and split it into files, without changing how it looks:

```
public/
  index.html          app shell + mockup switcher
  styles.css          the Night feed style's tokens and rules, moved out of index.html
  app.js              routing (#/feed, #/playground, #/browse, #/blog, #/u/:handle, #/me/likes, #/play, #/admin) and views
  feed.js             snap feed, drawer, customize panel (from the mockup)
  api.js              fetch wrappers + polling
  avatar.js           the generated curve avatars (pfpURL from the mockup)
  play.js             Playground editor
  vendor/             marked, DOMPurify, self-hosted woff2 fonts (Latin subsets)
```

### Changes from the mockup

- **Data comes from the API.** Replace the hard-coded `VIZ`, `POSTS` and `USERS` arrays with `GET /api/feed`, `/api/viz/:id`, `/api/users/:handle` and `/api/posts`.
- **Two feeds.** The main **Feed** tab shows reviewed pieces. A **Playground** tab next to it shows your own unreviewed posts and remixes, which nobody else can see, admins included (the admin table lists their titles for moderation). Every Playground slide carries a "not reviewed" label next to the author line.
- **My likes** (`#/me/likes`): a grid of liked pieces from both feeds, with "Play in the feed". This uses the same playlist filter as the mockup's blog posts, so the feed shows only those slides and a "▶ My likes ✕" chip to clear it.
- **Visualizations run in the sandboxed runner** (section 6), not in the page itself. Each slide's `<canvas>` becomes an `<iframe>`. The parent sends theme, settings and size over `postMessage`.
  - Keep **at most three runner iframes live** (previous, current, next slide). The rest show their thumbnail image. This matters on phones.
- **Thumbnails** in Browse, profiles, My likes and the blog become `<img>` tags pointing at stored WebP files, instead of running every visualization to draw them.
- **First-visit setup sheet:** if `GET /api/me` says the Tailscale user has no profile yet, show a sheet with:
  - handle, prefilled from their Tailscale login name;
  - an avatar picker (curve type + two colors with live preview, or "use my Tailscale picture");
  - homepage and GitHub fields. The GitHub username matters for moderators and for matching review-dry-run submissions to people.
- **No Join or Sign-in buttons**, since everyone arriving over the tailnet is already identified.
- **Account settings** (`#/me/settings`): checkboxes for Best of the month, Development blog and Miscellany, plus profile fields.
- **Role-dependent controls:**
  - moderators and up see a **Flag** button on slides and profiles, with the choices removal, request changes and account;
  - admins see Hide, Remove and **Promote to feed** on Playground slides, and an Admin link in the top bar.
- **Polling for live updates:** every 5 seconds, `GET /api/changes?since=<cursor>` returns new or hidden visualizations and changed like counts. It's simple, works through any proxy, and 30 clients make about 6 requests per second.
- **Self-host the fonts.** The mockup loads 11 font families from Google Fonts. Download only the weights in use, as Latin-subset woff2 files (for example from the Fontsource packages), and serve them from `/vendor/fonts`. That keeps the demo independent of outside services, which the runner's font hand-off (section 6) relies on anyway.
- **Escape all user text** (handles, titles, bios). Render explanations and blog posts with `marked` and sanitize the result with DOMPurify. Accept homepage links only if they start with `http://` or `https://`.

### The Playground editor (`#/play`)

- **Editor:** a `<textarea>` with a monospace font, Tab inserting two spaces, and a line count. CodeMirror is a stretch goal because it needs bundling.
- **Template:** the times-table visualization in the module format the practice registry also uses:
  ```js
  const COLORS = { main, secondary, bg, fg, … };   // first statement: every color the piece uses, as #rrggbb
  export default { title, hook, tags, license, param, draw(ctx, w, h, t, P, S, B) { … } }
  ```
  It has comments explaining the draw contract. While someone is looking at a piece, the page's accent colors become its `main` and `secondary`.
- **Live preview:** typing pauses for about 600 ms, the code is sent to `POST /api/preview`, and the preview iframe loads `/run/preview/:id`. Errors appear under the editor, with line numbers.
- **Post to Playground:** the form takes title, short hook, up to 4 tags, license (default MIT) and an optional explanation in Markdown. The piece appears in the Playground tab at once.
- **Submit for review:** opens the practice registry's "create new file" page on GitHub with the file name (`entries/<slug>.js`) already filled in. Short code goes into the URL too; longer code is copied to the clipboard to paste, because very long URLs can be rejected. GitHub then walks the person through opening a pull request (section 8).
- **Thumbnails** are rendered on the Spark when a piece is posted (section 6, layer 4). If that optional piece isn't built, the preview iframe snapshots one instead.

### Things to know about phones

- **iPhone Safari has no element fullscreen.** The mockup's "immersive" fallback already handles this; keep it.
- **Heavy visualizations** (the Julia set is computed on the CPU every frame) need testing on an older Android phone. The runner's speed check (section 6) pauses anything that's too slow.
- **Tailscale must be connected on the phone.** If the app shows a connection error, the first thing to check is that the Tailscale VPN toggle is on. Put that in the welcome message.
- **Writing code on a phone is painful.** The Playground works there, but suggest laptops for it in the welcome message.

---

## 5. Back end

### API

| Method & path | Who | Purpose |
|---|---|---|
| `GET /api/feed?tab=reviewed\|playground&tag=&cursor=` | anyone | Pinned items first, then newest, with like counts and `likedByMe` |
| `GET /api/viz/:id` | anyone | One visualization (code, settings, explanation, author, remix parent, status) |
| `GET /api/users/:handle` | anyone | Profile + their visualizations and remixes |
| `GET /api/posts`, `/api/posts/:slug` | anyone | Blog posts loaded from `content/blog/` |
| `GET /api/changes?since=` | anyone | Updates since a cursor, for polling |
| `GET /api/me` | identified | Current user's profile and role, or `{needsSetup: true}` |
| `PUT /api/me` | identified | Create or edit own profile (handle, avatar, bio, links) |
| `GET /api/me/likes` | user | Your liked visualizations (also the "My likes" playlist) |
| `GET/PUT /api/me/newsletter` | user | Newsletter preferences (stored only; nothing is sent in the demo) |
| `POST /api/newsletter` | anyone | Inline signup form (stored only) |
| `PUT /api/viz/:id/like`, `DELETE …` | user | Like / unlike |
| `POST /api/preview` | user | Store code temporarily (30 min); returns a preview ID |
| `POST /api/viz` | user | Post code or a remix to the Playground |
| `DELETE /api/viz/:id` | author / admin | Remove |
| `POST /api/admin/viz/:id/{hide,unhide,pin,promote}` | admin | Moderate; `promote` moves a Playground piece into the reviewed feed (bypassing review) |
| `DELETE /api/admin/users/:id` | admin | Remove an account: hides their content and blocks the Tailscale login |
| `PUT /api/admin/users/:id/role` | admin | Set role: `user`, `moderator`, `blog`, `admin` |
| `POST /api/admin/{export,reset,reload-posts,import-registry}` | admin | Maintenance; the last two run the blog loader and registry importer immediately |
| `POST /api/feedback` | user | Stretch: feedback box |
| `POST /api/assist` | user | Optional: AI assistant (section 7) |
| `GET /run/:id`, `/run/preview/:id` | anyone | The sandboxed runner page (section 6) |

"Identified" means the request came through `tailscale serve` from a Tailscale user. "User" means that person has also finished profile setup.

### Accounts from Tailscale identity

`tailscale serve` adds headers describing the person behind each request:

- `Tailscale-User-Login` (their login, e.g. an email address);
- `Tailscale-User-Name`;
- `Tailscale-User-Profile-Pic`.

The app uses these instead of its own login system. This is the demo's version of `PLAN.md`'s "accounts without GitHub". Production replaces it with email sign-in links.

- **The server must listen on `127.0.0.1` only**, so every request has to come through `tailscale serve`. Tailscale's docs recommend this. Serve also strips any identity headers a client tries to send itself, so they can't be faked.
- The first request from an unknown login creates a pending account. `PUT /api/me` completes it with a handle.
- **Signing out** only makes that browser anonymous, using a cookie the server checks. Signing back in needs no password, because Tailscale still identifies the device.
- **Logins are private.** They're used to match accounts, never shown on the site. Profiles show only the handle, avatar and links the person chose.
- **No identity:** requests from **tagged devices** carry no identity headers, so the app shows "Open this from a personal device signed into Tailscale" instead of the setup sheet.
- **Local development:** `AUTH_MODE=dev` with `DEV_LOGIN=you@example.com` fakes the header. The server refuses to start in dev mode unless it's bound to localhost.
- **Non-ASCII names:** check the Serve docs for how `Tailscale-User-Name` encodes non-ASCII characters, and decode it accordingly.
- **Handles:** 3–20 characters from `a-z0-9.-_`, unique, plus a short blocklist of reserved and offensive words.

### Roles

The four wishlist roles form a strict hierarchy. The server compares role ranks (`user` 1, `moderator` 2, `blog` 3, `admin` 4), so each role can do everything below it.

| Role | Granted by | In the demo app | On GitHub (section 8) |
|---|---|---|---|
| User | Everyone after profile setup | Like, My likes, newsletter preferences, remix, Playground, submit for review | Open registry pull requests |
| Moderator | Admin, on the Admin page | Flag button | Member of the practice `moderators` team (write access, so approvals count), listed in `reviewers.yml` so the bot can assign them |
| Blog maintainer | Admin | (inherits moderator) | Member of the `blog` team, a child of `moderators`: can merge blog posts |
| Admin | `ADMIN_LOGINS` environment variable, or another admin | Hide, remove, promote (demo-only bypass), remove accounts, roles, export, reset | Organization owner, also listed in `reviewers.yml` (the wishlist includes admins in the reviewer pool); review bypass on the practice repo; flag triage |

Setting someone's role in the app doesn't change their GitHub team membership. For the trial, an admin does both by hand. Production syncs them automatically (`PLAN.md`).

### Data model (SQLite; mirrors the production plan)

```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  ts_login TEXT UNIQUE NOT NULL,        -- from Tailscale-User-Login; never displayed
  handle TEXT UNIQUE,                   -- NULL until profile setup is finished
  avatar_json TEXT,                     -- {kind, params, bg, fg} curve avatar, or {tailscale: true}
  bio TEXT, homepage TEXT, github TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user','moderator','blog','admin')),
  newsletter_json TEXT,                 -- {subscribed, lists: ["best-of-month", "dev-blog", "miscellany"]}; stored only in the demo
  removed_at TEXT,                      -- set when an admin removes the account; login is then refused
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE viz (
  id INTEGER PRIMARY KEY, slug TEXT UNIQUE NOT NULL, author_id INTEGER NOT NULL REFERENCES users,
  kind TEXT NOT NULL CHECK (kind IN ('code','remix')),
  status TEXT NOT NULL CHECK (status IN ('reviewed','playground')),
  source TEXT NOT NULL CHECK (source IN ('seed','playground','registry','promoted')),
  registry_pr INTEGER,                  -- practice registry pull request number, for imported pieces
  parent_id INTEGER REFERENCES viz,     -- remixes point at the original
  title TEXT NOT NULL, hook TEXT, tags_json TEXT NOT NULL DEFAULT '[]', license TEXT DEFAULT 'MIT',
  code TEXT,                            -- original source (NULL for remixes)
  code_guarded TEXT,                    -- after the loop-guard rewrite (section 6)
  settings_json TEXT,                   -- remix settings / default settings
  explanation_md TEXT, thumb TEXT,      -- thumbnail file name
  pinned INTEGER DEFAULT 0, hidden INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_seq INTEGER NOT NULL
);
CREATE TABLE likes (
  user_id INTEGER REFERENCES users, viz_id INTEGER REFERENCES viz,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (user_id, viz_id)
);
CREATE TABLE previews (id TEXT PRIMARY KEY, user_id INTEGER, code_guarded TEXT, expires_at TEXT);
CREATE TABLE audit_log (id INTEGER PRIMARY KEY, actor_id INTEGER, action TEXT, target TEXT, reason TEXT,
                        created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE feedback (id INTEGER PRIMARY KEY, user_id INTEGER, page TEXT, body TEXT,
                       created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE newsletter_signups (email TEXT PRIMARY KEY, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE seq (n INTEGER NOT NULL);  -- one row; bumped on every change, used as the polling cursor
```

- **Polling cursor:** every write that viewers should see (post, promote, hide, like) increments `seq` and stamps `viz.updated_seq`. `GET /api/changes?since=n` returns rows with `updated_seq > n`.
- **Blog posts** aren't in the database. The server reads `content/blog/*.md` at startup and on `reload-posts`. Each post's front matter lists its visualization slugs, which become its playlist.
- **Seed script** (`npm run seed`): creates the six mockup users (with their curve avatars and placeholder logins) and the six visualizations as `reviewed` / `seed` (each `draw` function moved into a code string in module form). The three mockup posts become the first files in `content/blog/`.
- **Audit log:** every admin action (hide, remove, promote, role change, account removal) is recorded, along with the reason the admin gives.

### Limits

Only the trial team can reach the server, and everyone is identified, so abuse is less of a concern than with a public link. The limits mainly protect against accidents.

- **Rate limits** per user, kept in memory: 60 previews and 20 Playground posts per user per 10 minutes, 120 likes per minute.
- **Size limits:** code 50 KB, explanation 10 KB, bio 300 characters.
- **Expectations up front:** the setup sheet says "Everything you post is visible to the trial team and will be deleted when the trial ends." Collect nothing beyond the Tailscale login and what people choose to enter.

---

## 6. Running visualization code safely

Thirty people writing code that runs on everyone else's phone is the main technical risk. It's still a risk with a trusted team: an accidental infinite loop would freeze every phone that scrolls to it. The Playground tab, where nothing is reviewed, makes this especially important. Three layers handle it, plus an optional fourth that the Spark makes easy. Reviewed pieces imported from the registry go through the same layers.

### Layer 1: sandboxed iframe with no network access

- Each slide is `<iframe sandbox="allow-scripts" src="/run/:id">`. Without `allow-same-origin`, the frame gets an opaque origin. It can't read the app's cookies or storage, call the API as the viewer, open popups, or navigate the page.
- The server builds `/run/:id` as **one HTML document**: the kit helpers plus the visualization's (guarded) code, inlined in a `<script nonce="…">`. It's sent with this header:
  ```
  Content-Security-Policy: default-src 'none'; script-src 'nonce-<random>'; style-src 'unsafe-inline';
                           img-src data: blob:; connect-src 'none'; font-src 'none'; form-action 'none'
  ```
  `connect-src 'none'` blocks `fetch`, XHR and WebSockets. That matters more on a tailnet than on the open web: without it, code running on a team member's device could reach other machines on the tailnet.
- **Fonts for canvas labels:** with `font-src 'none'` the runner can't load font files itself. Instead, the parent page sends the needed woff2 bytes over `postMessage` once per iframe, and the runner registers them with `new FontFace(name, bytes)`. No network request happens, so CSP isn't involved. Confirm this on iOS Safari early; if it fails, fall back to system fonts for canvas labels in the demo.
- **Module format:** user code is written as `export default { … }`. The server parses it with **acorn**:
  - It rejects any `import` (the kit's helpers `hex`, `mix`, `rgba`, `label`, `clipBox`, `fsFor` are provided as globals).
  - It rewrites `export default` into an assignment the runner can read.

### Layer 2: loop guard against freezing

A `while (true) {}` inside a frame would freeze the iframe. On many phones the iframe shares a thread with the page around it, so the whole app would freeze. When code is saved or previewed, the server inserts a check at the top of every `for`, `while` and `do` loop, the same idea as CodePen's infinite-loop protection:

```js
// inserted by the server (acorn to find the loops, magic-string to edit the source)
if (performance.now() - __frameStart > 250) throw new Error('Frame took over 250 ms; stopped');
```

The runner sets `__frameStart` before each `draw` call. Deep recursion already throws a stack-overflow error on its own.

### Layer 3: runner speed watchdog

- The runner catches errors from `draw`, stops its animation loop and reports `{type: 'error', message, line}` to the parent. The slide shows the thumbnail with "This visualization stopped: <message>".
- The runner reports average frame time once a second. Above about 50 ms per frame, the parent pauses the slide and offers "Tap to run anyway".
- The admin can hide anything instantly, and it disappears from every feed on the next poll.

### Layer 4 (optional, uses the Spark): publish-time check in a headless browser

When something is posted, promoted or imported, the server loads `/run/:id` in headless Chromium on the Spark (via Playwright) before it appears in any feed. It:

- runs the piece for about 3 seconds at phone size;
- rejects it if it throws, draws only blank frames, or averages more than about 30 ms per frame on the Spark (a fast machine, so a slow result there means it will crawl on phones);
- saves frame 60 as the **WebP thumbnail**, so every thumbnail has the same size and quality whatever device the author used.

This is the same check `PLAN.md` runs in GitHub Actions for production. Playwright supports Chromium on Linux arm64, but check that its browser download works on DGX OS before relying on it. Run at most 2–3 checks at once. Effort: about 1 extra day. It replaces the client-side snapshot.

### Parent ⇄ runner messages

| Direction | Message |
|---|---|
| parent → runner | `init {theme, settings, dpr, reducedMotion, fonts}`, `set {settings or theme}`, `pause`, `resume`, `snapshot` |
| runner → parent | `ready {param}` (the code's parameter definition, used to build the Customize slider), `error`, `perf {avgFrameMs}`, `snapshot {webpDataURL}` |

---

## 7. Optional: AI assistant in the Playground (uses the Spark's GPU)

The Spark has 128 GB of memory shared between CPU and GPU, and the visualizations don't use the GPU, so it's free to run a local language model. For an audience working on AI and mathematics, a natural feature is: **describe a visualization in words, get a working draw function in the editor.**

- **Serving:** run an open-weight coding model on the Spark with **Ollama** or **vLLM**. Both provide an OpenAI-compatible HTTP API, bound to localhost.
  - NVIDIA publishes setup recipes ("playbooks") for the DGX Spark. Pick a model that fits comfortably in memory alongside everything else, and check that the serving stack supports the Spark's arm64 + Blackwell setup.
- **`POST /api/assist {prompt, currentCode}`:** the server adds a fixed system prompt (the draw contract, the kit's helper functions, and two seed visualizations as examples) and calls the local model.
- **The suggestion goes into the editor, never straight into a feed.** Generated code passes through the same guard, preview and sandbox as hand-written code. The author still decides whether to post it or submit it for review.
- **Queueing:** at most 2 requests run at once, the rest wait in a queue, and each user gets 10 requests per 10 minutes. Show "Assistant is busy, you're #3 in line" rather than timing out.
- **Effort:** 2–3 days, including prompt tuning against the seed visualizations. Build it only after the core steps are solid.

Nothing leaves the Spark: prompts and code stay on the team's hardware, with no API costs.

---

## 8. Review workflow dry run on GitHub

The wishlist's moderation rules are implemented in production with GitHub settings (`PLAN.md` section 4). The demo uses **those same settings on practice repos**, so the trial tests the real workflow, and the setup carries over to production as-is.

### Setup (about 1.5 days: configuration plus a small bot)

Create a practice GitHub organization (or reuse the real one with `-practice` repos):

| Piece | Setting |
|---|---|
| `registry` repo (public) | One file per submission: `entries/<slug>.js` in the Playground module format, plus optional `entries/<slug>.md` for the explanation. |
| Teams | `moderators` (write access); `blog` (child of `moderators`); admins are organization owners. The trial's moderators, blog maintainers and admins need GitHub accounts. Everyone else only needs one to submit. |
| `reviewers.yml` | The reviewer pool: GitHub usernames of moderators **and admins**, as the wishlist specifies. Each entry can list tags for later tag-based assignment. The bot ignores tags in the demo and picks at random. |
| `check.yml` workflow | Runs on every pull request with no secrets and a read-only token. It runs the demo's own `guard.js` on changed entries: parses, rejects imports, enforces the size limit. The result is saved as a small JSON file. The full headless check stays on the Spark (layer 4). |
| `triage.yml` workflow (the bot) | Runs on `workflow_run` after `check.yml` finishes, with write access to the repo but **without ever checking out the submitted code**. It reads only the result file. **Failed:** posts a "Request changes" review listing the errors. **Passed:** dismisses its own earlier change request, requests **2 random reviewers** from `reviewers.yml` (never the author; the same two on a revision), and **turns on auto-merge**. A daily run closes pull requests with no activity for 120 days. |
| Ruleset 1, required reviews | 2 approvals; dismiss stale approvals on new commits; require approval of the most recent push. **Bypass:** organization owners. This is the wishlist's demo-only admin bypass; production has none. |
| Ruleset 2, required checks | `check.yml` must pass. **No bypass**, not even for admins. |
| Issue forms | In `registry`: `flag-removal.yml` (label `flag:removal`) and `flag-changes.yml` (label `flag:changes`, @-mentions the author). In a **private** `moderation-practice` repo: `flag-account.yml` (label `flag:account`). |

Running the bot as Actions workflows (rather than a GitHub App on a server) keeps the demo self-contained. Its logic carries over to the production GitHub App. Check one detail early: when the submission comes from a fork, a "Request changes" review posted by `github-actions[bot]` should block merging until the bot dismisses it.

### How each wishlist action works in the trial

| Wishlist action | What people do |
|---|---|
| User submits a visualization | Playground → **Submit for review** → GitHub's new-file page opens with the file name filled in → paste code if needed → "Propose changes" opens a pull request. |
| Bot verifies; requests changes if it fails | Automatic. The author sees the bot's review listing what to fix, edits the file in the pull request, and the check runs again. |
| Two moderators (admins included) assigned at random | Automatic, once the check passes. GitHub notifies them. |
| Moderator requests changes | A "Request changes" review. The author is notified and edits the file. The check runs again, stale approvals are dismissed, and the same two reviewers are re-requested. |
| Both approve → uploaded automatically | Auto-merge fires on the second approval. The Spark's registry importer picks up the merge within a minute, and the piece appears in everyone's main feed. |
| Flag a published visualization for changes | **Flag → Request changes** in the demo app opens the `flag-changes` issue form, prefilled and mentioning the author. Their fix is a new pull request through the same process. |
| Flag a visualization for removal | **Flag → Removal** opens the `flag-removal` issue form. |
| Flag an account | **Flag → Account** on a profile opens `flag-account` in the private repo. |
| Admin sees all flagged visualizations | Saved searches for the `flag:*` labels. |
| Admin removes a visualization or account | In the demo app's Admin page (instant), plus closing the flag issue with a note. |
| Admin uploads bypassing review (demo only) | Either **Promote to feed** on a Playground piece in the demo app, or merging a registry pull request with the ruleset bypass. |
| Blog maintainer adds a post | A pull request adding `content/blog/<slug>.md` to the demo app's repo, merged by the `blog` team. On the Spark, `git pull`, then **Admin → Reload blog posts**. |

There's no "deny" step, as in the wishlist. A submission that isn't accepted stays in "changes requested" until the 120-day cleanup closes it, or an admin closes it as spam.

### How approved work reaches the demo

- **Registry importer:** every 60 seconds the server reads the practice registry's `main` branch through the GitHub API, using a read-only fine-grained token.
  - Each new or changed `entries/*.js` goes through the guard (and layer 4, if built) and is stored with `status = 'reviewed'`, `source = 'registry'`.
  - It then appears in everyone's main feed.
  - Authorship comes from the merged pull request's author, matched to a demo profile by its GitHub field. Unmatched authors get a placeholder profile under their GitHub handle.
- **Blog updates:** after a post is merged, run `git pull` on the Spark and click **Admin → Reload blog posts**. An automatic pull isn't used because it would also pull code changes into a running server.

A Playground piece and its registry submission are separate copies in the demo. Approving the pull request doesn't remove the Playground version; the author or an admin can delete it.

---

## 9. Project layout and scripts

```
demo/
  package.json         hono, @hono/node-server, better-sqlite3, acorn, magic-string, marked, qrcode
                       (+ playwright for layer 4)
  server/
    index.js           app setup, static files, security headers; binds 127.0.0.1
    auth.js            Tailscale identity headers → user; roles; dev and local fallback modes
    db.js              opens data/loci.db (WAL), runs schema.sql
    schema.sql
    seed.js            mockup users and visualizations
    posts.js           loads content/blog/*.md
    registry.js        polls the practice registry and imports merged entries
    routes/            feed.js, users.js, viz.js, admin.js, run.js, assist.js
    guard.js           acorn parse → import check, export rewrite, loop guards (also used by the registry's CI)
    runner-template.js builds the /run/:id HTML + CSP nonce
    check.js           optional headless publish check + thumbnail (layer 4)
  public/              front end (section 4)
  content/blog/        blog posts as Markdown, added by pull request
  github/              reviewers.yml, rulesets (JSON export), issue forms, check.yml and triage.yml for the practice repos
  deploy/
    loci-demo.service  systemd unit (restart on failure, runs as an unprivileged user)
    backup.sh          sqlite3 .backup to data/backups/, keeps 14 days (daily cron)
  data/                loci.db, thumbs/, backups/ (git-ignored)
  test/                guard.test.js, api.test.js, auth.test.js, roles.test.js (node:test)
```

| Script | Does |
|---|---|
| `npm start` | Start the server on `127.0.0.1:3300` |
| `npm run dev` | Start with `AUTH_MODE=dev` for local development |
| `npm run seed` | Create the database and load seed data (only if empty) |
| `npm run reset` | Delete all user data and re-seed. Asks for confirmation. |
| `npm run export` | Write `data/export-<date>.json` with everything, including feedback and the audit log |
| `npm run qr -- <url>` | Print a QR code for the URL in the terminal |
| `npm test` | Unit tests for the loop guard, auth, roles and API |

---

## 10. Build order

Estimates are for one developer who already knows the mockup.

| Step | Work | Done when | Estimate |
|---|---|---|---|
| 0 | Spark setup: Node 22 (arm64), `npm ci` builds `better-sqlite3`, systemd unit, `tailscale serve`, access rules or sharing | A "hello" page loads from a team member's phone at `https://spark.<tailnet>.ts.net` and shows their Tailscale login | 0.5 day |
| 1 | Server skeleton, schema, seed script, blog loader; front end split into files and reading from the API | The mockup looks the same, but its data comes from SQLite and `content/blog/` | 2–3 days |
| 2 | Runner + kit + CSP + font hand-off; seed visualizations moved into code strings; three-iframe limit in the feed | All six seeds run sandboxed on desktop and phone | 2–3 days |
| 3 | Tailscale identity, profile setup, avatar picker, profiles, likes, **My likes + Play in the feed**, polling | Two people see each other's likes within 5 s; one person's phone and laptop show the same account; a likes playlist plays | 2 days |
| 4 | Loop guard, Playground editor with preview, Playground tab, remixes | `while(true){}` in the Playground shows an error instead of freezing; a post shows up in the Playground tab on another phone | 3–4 days |
| 5 | Roles, Admin page (hide, remove account, promote, roles, audit log), Flag button with three choices, account settings with newsletter preferences, export/reset, backups, rate limits, vendored fonts | Each role sees exactly its controls; the checklist in section 11 passes | 3 days |
| 6 | Review dry run: practice repos, teams, rulesets, issue forms, `check.yml`, the triage bot (change requests, random assignment, auto-merge, stale cleanup); registry importer; Submit for review; blog pull timer | Failing code gets a bot change request; passing code gets two random reviewers; the second approval publishes it to the main feed within a minute; a merged blog post appears within 5 minutes | 3 days |
| 7 | *Optional:* layer 4 publish check + server thumbnails | Bad code is rejected with a clear message before it reaches any feed | 1 day |
| 8 | *Optional:* AI assistant | A plain-English prompt produces code that runs in the preview | 2–3 days |

**Core total (steps 0–6): about 15–18 working days.** The wishlist features add roughly 4 days over the Spark-only draft, mostly roles, the admin tools and the review bot. Steps 7–8 add 3–4 days. The no-internet fallback mode (section 3) adds about half a day if you decide you need it.

---

## 11. Testing and dry run

**Automated (`npm test`)**

- Loop guard: rewrites nested loops and `do…while`, leaves strings and comments alone, rejects `import`, and reports syntax errors with line numbers.
- Auth: a request without identity headers can't write; a new login is sent to profile setup; logins never appear in API responses; a removed account is refused; dev mode refuses to start unless bound to localhost.
- Roles: each admin endpoint refuses moderators and users; the hierarchy holds (a blog maintainer passes moderator checks); every admin action writes an audit row.
- API: unique handles, like toggling, My likes ordering, the polling cursor, rate limits, Playground pieces never appear in the reviewed feed unless promoted or imported.

**Tailscale checks**

- Access from: a device on the same tailnet; a person **from a different tailnet** using a shared device (confirms identity headers arrive); and a tagged device (should get the "personal device" message, not an error).
- `curl` port 3300 on the Spark's tailnet IP from another machine. It should be refused, proving the server is reachable only through `tailscale serve`.

**Review dry run checks**

- A pull request with an `import` in it gets a bot change request and no reviewers. Fixing it clears the change request and assigns two reviewers.
- Reviewers come from `reviewers.yml`, including admins, never the author, and are random across several submissions.
- One approval doesn't merge. The second approval merges automatically, and the piece reaches the demo feed within a minute.
- After a moderator's "Request changes" and a new commit, earlier approvals are dismissed and the same two reviewers are re-requested.
- An admin can merge without approvals (demo only) but not with failing checks.
- All three Flag choices open the right issue form, prefilled. An account flag is invisible to non-members.

**Device checks**

- iPhone (Safari), an older Android phone (Chrome), and a laptop each:
  - set up a profile, like, open My likes and play it, customize, remix, post to the Playground;
  - see updates from the other devices within 5 seconds.
- Paste known-bad code into the Playground and confirm the page stays responsive:
  - an infinite loop;
  - a `fetch` to another tailnet machine (blocked by CSP);
  - `document.cookie` (empty, because of the opaque origin);
  - `top.location = …` (blocked by the sandbox);
  - a 10-million-iteration loop per frame (stopped by the guard).

**Load:** a script (or `autocannon`) simulates 40 clients polling every 5 seconds and liking at random for 10 minutes against the Spark. Responses should stay under 50 ms. With the AI assistant enabled, also send 10 simultaneous assist requests and confirm the queue holds and the rest of the site stays fast.

**Dry run:** have 5–10 trial members use it for a day before opening it to all 30. Include at least one person who joins through sharing from their own tailnet, and two moderators who review one submission end to end.

---

## 12. Running the trial

The Spark is always on, so the trial can run for as long as it's useful, not just one session.

**Opening day**

1. `npm run reset`, then confirm the service is running: `systemctl status loci-demo`.
2. Set roles: admins come from `ADMIN_LOGINS`. Use the Admin page to make the chosen people moderators and blog maintainers, and add the same people to the matching GitHub teams.
3. Send the team the address `https://spark.<tailnet>.ts.net` with short instructions:
   - turn Tailscale on;
   - open the link;
   - pick a handle;
   - add your GitHub username if you'll submit or review.
   Show a QR code if you're in a room together.
4. Keep `/#/admin` open on a second device for the first hour to hide anything that misbehaves.

**During the trial**

- A daily backup runs from cron (`deploy/backup.sh`).
- Deploy updates from any team laptop over Tailscale SSH: `git pull && npm ci && sudo systemctl restart loci-demo`. That's a 1–2 second blip; polling clients reconnect on their own.
- Each week, review the feedback box, the admin export and the practice registry's pull requests, to see whether reviews were timely and whether the two-reviewer rule felt right.

**When the trial ends**

1. `npm run export` to keep the data and feedback, if wanted.
2. Delete `data/` as promised on the setup sheet.
3. Archive or delete the practice repos.
4. Run `tailscale serve reset` to stop publishing the app.
5. Remove the trial group's access rule or the device shares.

---

## 13. Deliberately left out, and the path to production

| Demo shortcut | Production replacement (`PLAN.md`) |
|---|---|
| Tailscale identity, team-only access | Email sign-in links for readers; GitHub sign-in for contributors and moderation roles |
| Roles set by hand in the app and on GitHub | Roles synced automatically from GitHub team membership |
| Practice registry with entries as single files | The real registry, pointing at contributors' repos and pinned commits |
| Review bot as Actions workflows, random assignment | A GitHub App with the same logic, later assigning by tags |
| Admin review bypass (Promote, ruleset bypass) | **Removed**: no bypass actors in production (wishlist) |
| Newsletter preferences stored, nothing sent | Synced with the newsletter provider's API and webhooks |
| Playground tab of unreviewed pieces | Not in production unless the "community tier" decision in `PLAN.md` says so |
| Registry importer polling every 60 s | Publish workflow on merge, with the full headless check in GitHub Actions |
| Runner on the same host, isolated by sandbox + CSP | Runner on a separate domain, with the same sandbox + CSP |
| SQLite file on the Spark | Cloudflare D1 (same SQL) |
| Blog Markdown pulled by hand, then reloaded | MDX blog deployed on merge |
| Thumbnails on disk | R2 with caching |
| Hono on Node | Hono on Cloudflare Workers (same routes) |
| Plain-JS front end | Astro pages + feed island, reusing the demo's feed, runner and avatar code |
| AI assistant on the Spark | Decide after the trial whether it's worth keeping; it would need hosted inference |

The runner, the guard, the schema, the API and the GitHub review configuration are the parts worth getting right in the demo, because the production build reuses them almost unchanged.
