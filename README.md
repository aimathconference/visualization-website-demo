# Loci

A short-video-style feed of live, open-source mathematical visualizations.
Static site, no build step: serve the folder and open `index.html`.

```bash
python3 -m http.server 8765
```

- [docs/module-api.md](docs/module-api.md): the manifest and runtime contract for JavaScript and WebAssembly modules
- [docs/submitting.md](docs/submitting.md): how to write and submit a visualization
- [docs/review-pipeline.md](docs/review-pipeline.md): automated checks, lanes, and the scope of human review

## Run with the server

The same front end also runs on the demo server in `demo/` (Hono + SQLite, Tailscale identity; see
[demo/README.md](demo/README.md)). There, likes, saved pieces, lists of moments, drafts, proposals, answers,
profiles and Playground posts are stored in SQLite and shared between people; opened as static files (above)
everything stays in this browser's localStorage, exactly as before.

```bash
cd demo
npm ci
AUTH_MODE=dev npm run dev     # http://127.0.0.1:3000, signed in as dev@example.com (an admin)
```

In dev mode, the "Acting as" box on the Yours page switches who you are. [docs/server.md](docs/server.md)
lists the endpoints and what is shared versus kept in the browser.
