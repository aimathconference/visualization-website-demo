# EigenReel demo

The working demo described in `../DEMO_PLAN.md`: a Node.js server (Hono + SQLite) that serves the mockup's Night feed as a real app. Visualizations run in sandboxed iframes, and identity comes from Tailscale.

- **Hosting it on the Spark:** `SPARK_SETUP.md`
- **The GitHub review dry run:** `github/README.md`

## Run it on your laptop

```sh
cd demo
npm ci
npm run dev        # http://127.0.0.1:3300
```

Dev mode fakes the Tailscale identity:
- the default login (`dev@example.com`) is an admin;
- to act as someone else, type any login into the **Acting as** box at the top of the page, then switch back the same way;
- use two browsers to try two people at once.

Data goes to `demo/data/`. Delete that folder to start over.

```sh
npm test           # server, spec, guard and registry tests (node:test)
```

## What's where

| Path | What |
|---|---|
| `server/index.js` | Entry point. Always binds 127.0.0.1 (in production every request comes through `tailscale serve`). |
| `server/app.js` | Configuration (environment variables), security headers, cross-site request protection, static files |
| `server/auth.js` | Tailscale identity headers → user; roles |
| `server/guard.js` | Legacy: checks the old single-file format and inserts loop guards, for the legacy front end's Playground (`routes/viz.js`, `/run/*`). Registry entries no longer go through it. |
| `server/runner-template.js` | The sandboxed runner page (kit helpers + runtime + guarded code, strict CSP) |
| `server/routes/` | API: feed and visualizations, users and newsletter, admin |
| `server/registry.js` | Imports entries merged in the practice registry (`entries/<slug>.js`, `.md`, optional `.wasm`) as written, reading their metadata with `spec.js`; credits the pull request's author by numeric GitHub id |
| `test/fixtures/seeds/` | Test fixtures: six single-file visualizations and their fictional authors |
| `content/blog/` | Blog posts (Markdown with front matter naming one or more `authors`, by handle), added by pull request |
| `public/` | The front end: plain ES modules, no build step |
| `github/` | Files for the practice registry and moderation repos |
| `deploy/` | systemd unit and environment template for the Spark |

## Environment variables

| Variable | Default | Meaning |
|---|---|---|
| `AUTH_MODE` | `tailscale` | `dev` fakes identity (never on the Spark) |
| `PORT` | `3300` | Port on 127.0.0.1 |
| `DATA_DIR` | `demo/data` | Database, thumbnails, backups |
| `ADMIN_LOGINS` | (dev login in dev mode) | Comma-separated Tailscale logins that are admins |
| `SITE_NAME` | `EigenReel` | Name in the top bar and browser tab |
| `REGISTRY_REPO`, `REGISTRY_BRANCH`, `MODERATION_REPO` | | Practice repos for the review dry run |
| `GITHUB_TOKEN` | | Optional read-only token; lets the importer poll every minute instead of every five |
| `RUNNER_URL` | | `runner.html` on its own domain, for production (`docs/server.md`, "The sandbox") |

## Writing a visualization

The format is in `../docs/submission-spec-slop.md`. A piece is two files in the registry, `entries/<slug>.js` and
its explanation `entries/<slug>.md` (optionally `entries/<slug>.wasm`, with its source under `sources/<slug>/`). The
slug matches `^[a-z0-9][a-z0-9-]{0,39}$`. A minimal piece:

```js
const COLORS = { main: '#ff8a1f', secondary: '#2dd4a7' };   // first statement in the file

export default {
  title: 'Rose curves',
  hook: 'r = cos(kθ) draws k petals when k is odd and 2k when k is even.',
  alt: 'A flower-shaped curve traced in orange on a dark background.',
  tags: ['Geometry'], license: 'MIT', author: { name: 'Your name' },
  modes: { desktop: true, phone: true },
  time: { length: 24, loop: true },
  draw(ctx, t, params, env, S) { /* draw the frame at time t */ },
};
```

Everything but `setup`, `draw` and `onMode` is a plain literal, so the site reads it without running the code
(`../spec.js`, shared by the site and the registry's check). The author's GitHub account is never in the file: it is
the account that opened the pull request.

What the server does with a merged entry (`server/registry.js`): it reads the file with `spec.js` (an entry it
cannot read is reported and skipped; the registry's check should already have refused it), stores the code as
written with its metadata, colors, explanation and WebAssembly module, and credits the pull request's author by
numeric GitHub id (a profile with that id, else one with that GitHub username, else a placeholder the person can
claim by setting the username on their profile). Later changes keep the first author. `GET /api/registry` serves
the entries to the front end, which runs them in its worker sandbox (`../docs/sandbox.md`); the server never runs them.

## Signing out

**Sign out** in the account menu makes that browser anonymous: you can browse, but not like, remix or post. Tailscale attaches your identity to every request from the device, so there's no session to end. A `signed_out` cookie tells the server to ignore the identity, and **Sign in** removes the cookie, with no password. It doesn't protect a shared device; only turning off Tailscale does, and that also cuts off the site.

## Temporary: moderators' page colors (legacy front end only)

Only `FRONTEND=legacy` has this; the site's front end has light and dark mode instead (`mode.js`). There, moderators and above get a **Page colors** panel (account menu → Page colors, or the bottom of Settings). It recolors the whole site for that person only, and takes priority over each visualization's own colors, on the canvas and on the page. The choice is saved to their account in the `kv` table.

To remove it, delete `server/routes/page-theme.js` and `public/js/page-theme.js`, then the lines marked `page theme (temporary)` in `server/app.js`, `public/js/main.js`, `public/js/pages.js`, `public/js/theme.js` and `public/styles.css`, and the last test in `test/api.test.js`. Saved choices can stay in the database; nothing reads them.
