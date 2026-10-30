# Loci demo

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
npm test           # server, guard and registry tests (node:test)
```

## What's where

| Path | What |
|---|---|
| `server/index.js` | Entry point. Always binds 127.0.0.1 (in production every request comes through `tailscale serve`). |
| `server/app.js` | Configuration (environment variables), security headers, cross-site request protection, static files |
| `server/auth.js` | Tailscale identity headers → user; roles |
| `server/guard.js` | Checks visualization code and inserts loop guards. The practice registry's check runs a copy. |
| `server/runner-template.js` | The sandboxed runner page (kit helpers + runtime + guarded code, strict CSP) |
| `server/routes/` | API: feed and visualizations, users and newsletter, admin |
| `server/registry.js` | Imports entries approved in the practice registry |
| `server/seeds/` | The six mockup visualizations (one module + explanation each) and their fictional authors |
| `content/blog/` | Blog posts (Markdown with front matter), added by pull request |
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
| `SITE_NAME` | `Loci` | Name in the top bar (a placeholder; see `../NAMES.md`) |
| `REGISTRY_REPO`, `REGISTRY_BRANCH`, `MODERATION_REPO` | | Practice repos for the review dry run |
| `GITHUB_TOKEN` | | Optional read-only token; lets the importer poll every minute instead of every five |

## Writing a visualization

A visualization is one module, the same format in the Playground, the registry and `server/seeds/`:

```js
export default {
  title: 'Rose curves', hook: 'One line about it', tags: ['Geometry'], license: 'MIT',
  param: { key: 'k', label: 'Petals', min: 1, max: 12, step: 1, value: 5 },   // optional slider
  draw(ctx, w, h, t, P, S, B) { /* draw one frame */ },
};
```

`P` has the theme colors (`bg`, `fg`, `a1`, `a2`), `font`, line width `lw`, `labels` and `param`. `S` persists between frames. `B` is the drawing box inside the padding. The kit helpers `hex`, `mix`, `rgba`, `label`, `clipBox` and `fsFor` are globals.

Imports, network access and anything outside the canvas aren't available. A frame that runs over 250 ms is stopped.

## Temporary: moderators' page colors

Moderators and above get a **Page colors** panel (account menu → Page colors, or the bottom of Settings). It recolors the whole site, including visualizations on the default palette, for that person only. The choice is saved to their account in the `kv` table.

To remove it, delete `server/routes/page-theme.js` and `public/js/page-theme.js`, then the lines marked `page theme (temporary)` in `server/app.js`, `public/js/main.js`, `public/js/pages.js`, `public/js/theme.js` and `public/styles.css`, and the last test in `test/api.test.js`. Saved choices can stay in the database; nothing reads them.
