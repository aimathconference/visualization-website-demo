# Running Loci on the demo server

The front end in this folder runs two ways:

- **As static files** (`python3 -m http.server`, GitHub Pages, any file server). Everything you make or mark stays in
  this browser's localStorage. Nothing is shared.
- **On the demo server** in `demo/` (Tommy's Hono + SQLite server; see `demo/README.md` and `DEMO_PLAN.md`). Likes,
  saved pieces, lists of moments, drafts, proposals, answers, profiles and Playground posts are stored in SQLite under
  each person's profile. Likes and profiles are visible to everyone; Playground posts are visible to everyone signed in.

The front end decides at boot: `api.js` fetches `api/whoami`. As static files that is the file `api/whoami` in this
folder, which says `{"server": false}`. On the server the route answers `{"server": true, ...}`.

## Run it

```sh
cd demo
npm ci
AUTH_MODE=dev npm run dev                 # http://127.0.0.1:3000
AUTH_MODE=dev PORT=3100 npm run dev       # another port
```

In dev mode you are `dev@example.com`, an admin. To be someone else, open **Yours** (top bar menu), type any login in
**Acting as (dev mode)** and press Switch: the page reloads as that person (a `dev_login` cookie, kept for a year;
empty it to go back). Use a second browser profile to be two people at once. The first visit of a login creates
its profile with a suggested handle (the part of the login before `@`) and a curve avatar; the handle editor on
Yours changes it.

In production (`npm start`, Tailscale identity) see `demo/SPARK_SETUP.md`. The server always listens on 127.0.0.1.

### Environment

All of `demo/README.md`'s variables apply. Added:

| Variable | Default | Meaning |
|---|---|---|
| `FRONTEND` | `loci` | `loci` serves this front end at `/`. `legacy` serves the demo's own front end in `demo/public` (kept for reference). |
| `FRONTEND_DIR` | the repository root | Where this front end is |

`DATA_DIR` (default `demo/data`) holds the database. Delete it to start over.

`REGISTRY_REPO` (e.g. `your-org/registry-practice`) and `REGISTRY_BRANCH` (default `main`), from `demo/README.md`, matter
twice here. The server polls that repository and imports what is merged (`demo/server/registry.js`): single-file entries
as before, and package folders `entries/<id>/` as reviewed pieces this front end runs in its worker sandbox with their
manifest. And the Submit page links its "Open the registry" step to GitHub's upload page in that repository (through
`/api/registry`). Without `REGISTRY_REPO` nothing is imported and the Submit page says the registry is not set up yet.
As static files, the Submit page reads `REGISTRY` in `config.js` instead. Setting up the repository:
`demo/github/README.md`.

## What the server serves

Only the front end: `index.html` and the top-level `.html`/`.js`/`.css` files, and the folders `v/` (share pages),
`og/`, `docs/` and `examples/`. `.wasm` is served as `application/wasm`, `.md` as `text/markdown`. Nothing else at the
repository root (`demo/` with the database, dotfiles, `scripts/`, the plans) can be fetched. In dev mode files are
sent with `Cache-Control: no-store`.

The page gets its own Content-Security-Policy: it runs modules in a `blob:` worker with `new Function`, loads KaTeX
and three.js from cdnjs and its fonts from Google Fonts, and has inline scripts. The API keeps the demo's stricter
policy. Visualizations still run in the front end's worker sandbox (`runtime.js`, `worker.js`); the demo's iframe
runner (`/run/*`, `runner-template.js`, `guard.js`) is untouched but unused by this front end.

At startup every catalog piece with a share page (`v/<id>.html`) gets a viz row if it has none, so it can be liked:
reviewed, with its author as a placeholder user (the six seed pieces already have rows). See `demo/server/catalog.js`.

## Endpoints added

All in `demo/server/routes/loci.js`. Writes need the `x-loci: 1` header and a same-origin request, like every write
to the demo server, and a finished profile.

| Method and path | What |
|---|---|
| `GET /api/whoami` | `{server: true, authMode, siteName, identified, needsSetup, user, devLogin}`. `devLogin` only in dev mode. |
| `PUT /api/me/handle` | `{handle}`: change your handle (same rules as profile setup: 3 to 20 of `a-z 0-9 . _ -`, unique, not reserved). |
| `GET /api/me/kv` | `{items: {key: value}}`: everything you keep, by front-end storage key |
| `PUT /api/me/kv/:key` | `{value}`: store one value (any JSON, at most 256 KB; at most 500 keys). Keys are `loci:...` |
| `DELETE /api/me/kv/:key` | Remove one |
| `GET /api/playground` | Playground remixes posted from the front end, newest first, each a viz (as in `/api/feed`) plus `files` |
| `POST /api/playground` | `{parent: <piece id>, files: {name: text}}`: post a remix. `files` has `loci.json`, `explanation.md` and the module (`index.js`, or one file per target). Modules naming network or storage APIs are refused. |
| `GET /api/registry` | `{repo, branch, items}`: the registry (`REGISTRY_REPO`, `REGISTRY_BRANCH`; `repo` is null without one) and the package folders imported from it, newest first, each a viz plus `files` and `registryPath` |

Also used, from the demo's own API: `GET /api/me`, `PUT /api/me` (profile setup on first visit), `GET /api/feed`
(counts and your likes), `PUT`/`DELETE /api/viz/:id/like`, `GET /api/users`, `DELETE /api/viz/:id`.

Schema additions (`demo/server/schema.sql`, additive, `CREATE TABLE IF NOT EXISTS`):

- `user_kv(user_id, key, json, updated_at)`: the stores below that have no table of their own.
- `viz_package(viz_id, files_json)`: a package's files, `{name: text}`. For a Playground remix the viz row is
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
| Playground posts | (none) | `viz` + `viz_package`, everyone signed in sees them |
| A remix you ran, its loci.json fields, the feed filter | sessionStorage | stays in this tab |
| The Mode preference | `loci.target` | stays in this browser |

`api.js` keeps the server's copy in memory: reads are synchronous, writes update memory at once and reach the server a
moment later (the last write to a key within 400 ms is the one sent). `app.js` builds the feed once `LociAPI.ready` has
settled. If the server does not answer, or you are not signed in (no Tailscale identity), the page falls back to
localStorage and says so in the console.

## The interface (`api.js`)

```js
await LociAPI.ready            // true on the server, false otherwise
LociAPI.server                 // the same, synchronously after ready
LociAPI.whoami()               // {server, handle, user?, authMode?, devLogin?}
LociAPI.likes.get() / .set(ids) / .count(id)       // count: the shared total, or null without a server
LociAPI.saves.get() / .set(ids)
LociAPI.signals.get() / .set({id: seconds})
LociAPI.lists.get() / .put(lists) / .delete()      // lists of moments
LociAPI.drafts, .proposals, .answers               // .get(key, default) / .set(key, value) / .del(key) / .keys(prefix)
LociAPI.handle.get() / .set(h)                     // set: a promise on the server
LociAPI.users.get(handle) / .all()                 // server profiles
LociAPI.playground.list() / .post(parentId, files)
LociAPI.on('likes', (id, count, liked) => ...)     // the server's answer to a like
```
