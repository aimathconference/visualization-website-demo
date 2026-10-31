# Running EigenReel on the demo server

The front end in this folder runs two ways:

- **As static files** (`python3 -m http.server`, GitHub Pages, any file server). Everything you make or mark stays in
  this browser's localStorage. Nothing is shared.
- **On the demo server** in `demo/` (Tommy's Hono + SQLite server; see `demo/README.md` and `DEMO_PLAN.md`). Likes,
  saved pieces, lists of moments, drafts, proposals, answers, profiles and Chalkboard pieces are stored in SQLite under
  each person's profile. Likes and profiles are visible to everyone; a Chalkboard piece is visible only to its author, who can edit and delete it.

The front end decides at boot: `api.js` fetches `api/whoami`. As static files that is the file `api/whoami` in this
folder, which says `{"server": false}`. On the server the route answers `{"server": true, ...}`.

## Run it

```sh
cd demo
npm ci
AUTH_MODE=dev npm run dev                 # http://127.0.0.1:3000
AUTH_MODE=dev PORT=3100 npm run dev       # another port
```

In dev mode you are `dev@example.com`, an admin. To be someone else, open **My Account** (top bar menu), type any login in
**Acting as (dev mode)** and press Switch: the page reloads as that person (a `dev_login` cookie, kept for a year;
empty it to go back). Use a second browser profile to be two people at once. The first visit of a login creates
its profile with a suggested handle (the part of the login before `@`) and a curve avatar; the handle editor on
My Account changes it.

In production (`npm start`, Tailscale identity) see `demo/SPARK_SETUP.md`. The server always listens on 127.0.0.1.

### Environment

All of `demo/README.md`'s variables apply. Added:

| Variable | Default | Meaning |
|---|---|---|
| `FRONTEND` | `loci` | `loci` serves this front end at `/`. `legacy` serves the demo's own front end in `demo/public` (kept for reference). |
| `FRONTEND_DIR` | the repository root | Where this front end is |
| `RUNNER_URL` | | Where `runner.html` is served from when it has its own domain ("The sandbox" below). Empty: beside the front end, still sandboxed. |

`DATA_DIR` (default `demo/data`) holds the database. Delete it to start over.

`REGISTRY_REPO` (e.g. `EigenReel/registry`) and `REGISTRY_BRANCH` (default `main`), from `demo/README.md`, matter
twice here. The server polls that repository and imports what is merged (`demo/server/registry.js`): single-file entries
as before, and package folders `entries/<id>/` as reviewed pieces this front end runs in its sandbox with their
manifest. And the Submit page links its "Open the registry" step to GitHub's upload page in that repository (through
`/api/registry`). Without `REGISTRY_REPO` nothing is imported and the Submit page says the registry is not set up yet.
As static files, the Submit page reads `REGISTRY` in `config.js` instead. Setting up the repository:
`demo/github/README.md`.

## What the server serves

Only the front end: `index.html` and the top-level `.html`/`.js`/`.css` files, and the folders `v/` (share pages),
`og/`, `docs/` and `examples/`. `.wasm` is served as `application/wasm`, `.md` as `text/markdown`. Nothing else at the
repository root (`demo/` with the database, dotfiles, `scripts/`, the plans) can be fetched. In dev mode files are
sent with `Cache-Control: no-store`.

The page gets its own Content-Security-Policy: it loads KaTeX, marked, DOMPurify and three.js from cdnjs and its fonts
from Google Fonts, and has inline scripts. It has no `unsafe-eval`, no `blob:` scripts, and no images from other servers,
because modules never run on it. The API keeps the demo's stricter policy. The demo's iframe runner (`/run/*`, `runner-template.js`, `guard.js`) is untouched but
unused by this front end.

### The sandbox

Visualizations run in `runner.html`, one sandboxed frame per mount (`docs/module-api.md`, section 4). The file's own
`<meta>` policy allows no network and no eval on any host, static files included. This server also sends that policy as
a header, with `sandbox allow-scripts`, so the file is sandboxed even when opened directly, and with `frame-ancestors`.

**For production, serve `runner.html` from a domain of its own** (`PLAN.md` calls it `lociusercontent.net`), so browsers
give it a separate process, and set `RUNNER_URL=https://that-domain/runner.html` here or `RUNNER_URL` in `config.js`
for static files. It needs no other file. Send it with this header if the host allows, replacing `<site>` with the
site's origin:

```
Content-Security-Policy: sandbox allow-scripts; <the policy in the file's meta tag>; frame-ancestors <site>
```

After any change to the script in `runner.html`, update the hash in its `<meta>` tag. `demo/test/sandbox.test.js` fails until
they match. `node scripts/check-sandbox.mjs` runs hostile modules and explanations against the server and against static
files in headless Chrome.

### The kill switch

An admin can stop any piece by its id from the Admin tab (Stopped pieces). It stops in every open browser within a minute,
including signed-out visitors, and will not start again until an admin restarts it. Its likes and links stay. As static
files the list is `blocked.json` at the site's root, `{"items": [{"id": "some-piece", "reason": "why"}]}`, so stopping a
piece is a deploy; serve that file without long caching. A browser keeps the last list it read, so a stopped piece stays
stopped when the list can't be reached.

At startup every catalog piece with a share page (`v/<id>.html`) gets a viz row if it has none, so it can be liked:
reviewed, with its author as a placeholder user. The registry's importer takes that row over, keeping its likes. See `demo/server/catalog.js`.

## Endpoints added

All in `demo/server/routes/loci.js`. Writes need the `x-loci: 1` header and a same-origin request, like every write
to the demo server, and a finished profile.

| Method and path | What |
|---|---|
| `GET /api/blocked` | `{items: [{id, reason}]}`: the stopped pieces. Public, because signed-out browsers must stop them too. |
| `GET /api/admin/blocked`, `PUT` and `DELETE /api/admin/blocked/:slug` | Admins: list, stop (`{reason}` required) and restart a piece. Both changes go in the audit log. In `routes/admin.js`. |
| `GET /api/whoami` | `{server: true, authMode, siteName, pageTheme, runnerUrl, identified, needsSetup, user, devLogin, signedOut}`. `pageTheme`: the moderators' site-wide page colors, or null. `devLogin` only in dev mode; `signedOut: true` when this browser signed out (below). |
| `PUT /api/me` (from the demo's API) | `{bio, homepage, github, avatar}`: the **Your bio and links** form on My Account, sending your avatar as it is. A GitHub username held by an unclaimed registry author takes over their pieces, with no check that the username is yours. |
| `PUT /api/me/handle` | `{handle}`: change your handle (same rules as profile setup: 3 to 20 of `a-z 0-9 . _ -`, unique, not reserved). |
| `GET /api/me/kv` | `{items: {key: value}}`: everything you keep, by front-end storage key |
| `PUT /api/me/kv/:key` | `{value}`: store one value (any JSON, at most 256 KB; at most 500 keys). Keys are `loci:...` |
| `DELETE /api/me/kv/:key` | Remove one |
| `GET /api/playground` | Your Chalkboard (the API and the schema keep the older name), newest first, each a viz (as in `/api/feed`) plus `files`. A piece is private to its author on every route, admins included; `/api/admin/viz` lists them so admins can moderate. |
| `DELETE /api/viz/:id` | Delete a piece: its author, or an admin |
| `PUT /api/playground/:id` | `{files}`: replace a saved piece's files (the Chalkboard's Save), with the same checks as posting. Its author only; for anyone else it does not exist (404). |
| `POST /api/playground` | `{parent: <piece id>, files: {name: text}}`: save a copy of a piece. `parent: null` saves a new piece of yours (the New button), with its tags, license and colors from its `loci.json`. `files` has `loci.json`, `explanation.md` and the module (`index.js`, or one file per target). Modules naming network or storage APIs are refused. |
| `GET /api/registry` | `{repo, branch, items, singles}`: the registry (`REGISTRY_REPO`, `REGISTRY_BRANCH`; `repo` is null without one) and the package folders imported from it, newest first, each a viz plus `files` and `registryPath`; `singles`, the single-file entries, each a viz plus `registryPath`, `code` (as written), `guarded` (as `guard.js` prepared it) and `meta: {t0, param}` |
| `GET /api/page-theme` | `{theme}`: the site-wide page colors `{bg, fg, accent, accent2}`, or null (in `routes/page-theme.js`) |
| `PUT /api/page-theme` | `{theme}` or `{theme: null}`: set them for everyone (moderator, blog or admin) |

Also used, from the demo's own API: `GET /api/me`, `PUT /api/me` (profile setup on first visit), `GET /api/feed`
(counts and your likes), `PUT`/`DELETE /api/viz/:id/like`, `GET /api/users`, `DELETE /api/viz/:id`, and
`POST /api/sign-out` / `POST /api/sign-in` (the **Sign out** button on My Account: a `signed_out` cookie makes the server
ignore this browser's identity, so the page falls back to this browser's storage until **Sign in**).

Schema additions (`demo/server/schema.sql`, additive, `CREATE TABLE IF NOT EXISTS`):

- `user_kv(user_id, key, json, updated_at)`: the stores below that have no table of their own.
- `viz_package(viz_id, files_json)`: a package's files, `{name: text}`. For a copy on the Chalkboard the viz row is
  `kind = 'remix'`, `status = 'playground'`, `source = 'playground'`, with the reviewed piece as `parent_id`. For a
  registry package folder it is `kind = 'code'`, `status = 'reviewed'`, `source = 'registry'`, `registry_path =
  'entries/<id>/'`, no `code` (binary files such as `module.wasm` are stored as `data:` URLs).

## What is shared and what stays in the browser

| Store | Key (static) | On the server |
|---|---|---|
| Likes | `loci:likes` | `likes` table; counts are everyone's |
| Your handle | `loci:handle` | your `users` row (with bio, avatar, links: author profiles merge these over `users.js`) |
| Saved pieces | `loci:saved` | `user_kv`, yours only |
| Watch time (For you) | `loci:watch` | `user_kv`, written at most every 20 s and on leaving the page |
| Lists of moments | `loci:moments` | `user_kv` |
| Remix drafts | `loci:draft:<piece>[@target]`, `loci:draft2:<piece>` | `user_kv` |
| Preset proposals, Wanted proposals and votes | `loci:preset-proposals`, `loci:bounty-proposals`, `loci:bounty-votes` | `user_kv` |
| Question-of-the-week answer, Ask drafts | `loci:question:<id>`, `loci:ask:<piece>` | `user_kv` |
| Chalkboard pieces | (none: saving needs the server; unsaved drafts stay in this browser) | `viz` + `viz_package`, only the author sees them |
| A remix you ran, its loci.json fields, the feed filter | sessionStorage | stays in this tab |
| The Mode preference | `loci.target` | stays in this browser |
| Accent follows the piece (on or off) | `loci:accent-follow` | stays in this browser |
| Page colors | `loci:page-theme` (a copy, so a reload does not flash) | the server's, one for everyone (`api/page-theme`) |

`api.js` keeps the server's copy in memory: reads are synchronous, writes update memory at once and reach the server a
moment later (the last write to a key within 400 ms is the one sent). `app.js` builds the feed once `LociAPI.ready` has
settled. If the server does not answer, or you are not signed in (no Tailscale identity), the page falls back to
localStorage and says so in the console.

## The interface (`api.js`)

```js
await LociAPI.ready            // true on the server, false otherwise
LociAPI.server                 // the same, synchronously after ready
LociAPI.whoami()               // {server, handle, user?, authMode?, devLogin?}
LociAPI.siteName()             // the site's name: the server's siteName, else SITE_NAME in config.js
LociAPI.pageTheme() / .setPageTheme(theme)   // the site-wide page colors (pagecolors.js); set: moderators
LociAPI.role() / .canModerate()  // your role on the server; moderator, blog or admin may set the page colors
LociAPI.likes.get() / .set(ids) / .count(id)       // count: the shared total, or null without a server
LociAPI.saves.get() / .set(ids)
LociAPI.signals.get() / .set({id: seconds})
LociAPI.lists.get() / .put(lists) / .delete()      // lists of moments
LociAPI.drafts, .proposals, .answers               // .get(key, default) / .set(key, value) / .del(key) / .keys(prefix)
LociAPI.handle.get() / .set(h)                     // set: a promise on the server
LociAPI.users.get(handle) / .all()                 // server profiles
LociAPI.playground.list() / .post(parentId, files) / .update(id, files) / .remove(id)   // the Chalkboard
LociAPI.registry.list() / .singles()           // registry packages / single-file entries (single.js runs them)
LociAPI.on('likes', (id, count, liked) => ...)     // the server's answer to a like
LociAPI.signOut() / .signIn()                      // the demo's sign-out cookie; the page reloads
```

## Parity notes (the demo's own front end)

`FRONTEND=legacy` serves the demo's front end in `demo/public` with everything it has. Features it gained after this
front end was wired to the server (merged from the `demo` branch), and where they stand here:

| Demo feature | Here |
|---|---|
| **Sign out / Sign in** (`POST /api/sign-out`, `/api/sign-in`) | Ported: My Account has Sign out (press twice) and, once signed out, Sign in. `api/whoami` says `signedOut`. |
| **Site name EigenReel** (`SITE_NAME`, 22764a5) | Ported. The wordmark, page title, link-preview meta, about texts, embed and Beamer texts, issue bodies and the guides' titles say `LociAPI.siteName()`: the server's `siteName` from `api/whoami`, or `SITE_NAME` in `config.js` (EigenReel) as static files. Share pages (`v/*.html`) are generated with `SITE_NAME`. "Loci" stays in identifiers (`loci:*` keys, `@loci/kit`, `loci.json`, `LociHost`, the module API's title). Still different: `og/default.png` shows the old name in its artwork; the static `<meta>` tags say EigenReel whatever the server's name (unfurl bots do not run the script that updates them). |
| **Page colors for moderators** (temporary; 2644a40) | Ported, site-wide instead of per account: the menu > Page colors (moderator, blog and admin roles only) opens the demo's presets and four colors, and Save sets them for everyone through `GET`/`PUT /api/page-theme` (added next to his per-account `/api/me/page-theme` in `routes/page-theme.js`, which this front end does not use); `api/whoami` carries them as `pageTheme`. `pagecolors.js` maps them onto the theme's tokens (the mapping is written at its top); accents and muted text are adjusted to 4.5:1, and the panel warns and will not save text below 4.5:1 (the demo warns but saves). |
| **Accent follows the piece** (`COLORS`, 1c7c0bc) | Ported. A piece with colors (`loci.json` `"colors"`, or a single file's `COLORS`) lends its main and secondary to the page while on screen: its slide keeps them as it scrolls, the top bar and panels take the active slide's, with a 0.6 s fade (none under reduced motion). Each is clamped to 4.5:1 on the theme's (or the page colors') background and panels; the canvas draws the exact colors. The menu > "Accent follows the piece", on by default, `localStorage` `loci:accent-follow`. Still different: the demo stands the page accents aside while a moderator's page colors are on; here they apply over the page colors. On their default palette pieces draw with their own colors, and with the page colors when there are page colors, as in the demo. |
| **Admin page** (`#/admin` in `demo/public`) | Ported as an Admin tab, shown only to admins (`admin.js`): people with their roles, remove and restore an account, the audit log, import from the registry, export all data. Not ported: the Visualizations table, because this front end shows the catalog whatever a row's hidden or pinned flag says and never shows a promoted post; deleting a catalog piece's row would only lose its likes. Also not ported: Reload blog posts (this front end's blog is `posts.js`) and Generate missing thumbnails. |
| **Single-file registry entries** (`entries/<slug>.js`, guarded) | Ported. `GET /api/registry` lists them as `singles` (the author's code, the code `guard.js` prepared, `meta: {t0, param}`, `colors`); `single.js` wraps the guarded code in a module of the module API (the kit, the loop guard's hooks, `matchMedia` and a window stand-in, events dispatched to the canvas when the entry has `interact`) and generates its `loci.json` (one range param from `param`, no presets, canvas2d). They run untrusted in the worker and show in the feed, Browse and their author's profile. Still different: `S` and `P` behave as in the demo, but the label helper draws the kit's halo; a `param` with `options` becomes a plain range. |
| **New visualization button** (bfd63c5) | Ported. New in the top bar from 900 px, Style menu > New visualization below; it opens the Chalkboard on the contributor template (`examples/template/visualization.js`, kept equal to the demo's by a test), with Run, Check this remix, Prepare pull request and Save (`POST /api/playground` with `parent: null`). His phone top-bar fix (hide the wordmark, tighter tabs) was already here below 540 px. Still different: his button opens his Playground editor with its own starter code; the editor starts with placeholders marked "Replace me" for what only the author can write (a preset, alt text, an explanation with the gate's headings and Reference line), so the untouched package passes the content checks; it still fails Time jumps and Played vs seeked, because the template advances its phase by `dt` (for tap to pause), so Prepare pull request starts disabled until the code draws from `t`; a new piece's param keys are fixed like a remix's. |
| **One look** (the demo ships only the Night style) | Ported: the six mockup styles (Night, Chalkboard, Graph paper, Vaporwave, Minimal, Parallax) are retired; the demo's Night theme is the only look, with its top bar, account-style menu button, caption and rail. A `#night`, `#chalk` ... hash from an old link is ignored. |
| **Contributor template** (`registry/template/visualization.js`) | Runs here as a single-file entry when merged into the registry (above), and starts the New editor. Its package equivalent: `demo/github/README.md`, "The contributor template". |
