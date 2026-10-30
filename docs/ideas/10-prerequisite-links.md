# 10 · Prerequisite and "leads to" links between pieces

## Pitch
Let a piece declare which pieces it builds on and which it leads to, show "Before this" and "Next" cards at the end of each explanation and as an optional path through the feed, and draw the whole catalog as a small map in Browse. A feed is a random walk; mathematics is a directed graph, and the graph is what makes the catalog a curriculum rather than a pile.

## Why mathematicians would care
- **Learners** following a link from a friend land on the Julia set piece; "Before this: the logistic map's road to chaos" and "Next: the Mandelbrot zoom" turn one share into a session.
- **Instructors** get a path to assign ("start at Riemann sums, follow Next three times"), and see where the catalog has holes.
- **Authors** get inbound links from related pieces, which is how their piece is found after its week in New, and an incentive to build *on* existing pieces (cite them) rather than duplicate them.
- It is the "Where it leads" section of explanation.md (submitting.md section 6), made machine-readable.

## What exists today in the prototype that it builds on
- `explanation.md`'s optional "Where it leads" section (submitting.md section 6), and tags (`tagCounts`, `renderChips`).
- `renderDrawer` (Explanation tab), `cardHTML`/`paintThumbs` (mini cards), `jumpToViz`, the playlist filter (a path is a playlist).
- `checks.js` static metadata checks (title, hook, tags), where link validation goes.
- `catalog.js` already has natural edges: logistic-bifurcation → julia-circle → mandelbrot-zoom; riemann-sums → fourier-square; double-pendulum → lorenz-butterfly; galton-board stands alone; times-table → elliptic-group-law (curves from chords/lines).

## Design
**Manifest:** `"related": { "after": ["logistic-bifurcation"], "next": ["mandelbrot-zoom"], "see": [] }`, at most 3 each, ids of published pieces. Only `after` is authored by the piece's author; `next` lists on other pieces are *derived* (if B says it comes after A, A shows B under Next), so an author cannot hijack another piece's Next list. `next` in a manifest is a suggestion the editors can confirm.

**Checks:** every id exists and is published; no self-links; warn if it creates a cycle in `after` edges (a cycle means the order is wrong somewhere).

**UI:**
- Explanation tab: after the Reference, a "Before this" row and a "Next" row of mini cards (`cardHTML`-style, with thumbnails); tapping one jumps to it (`jumpToViz`).
- Feed end-of-slide: when a viewer has watched a piece for ≥ 20 s (`sig.watch`), a small "Next: …" pill appears in the caption's `.tries` row.
- **Path play:** from any piece, "Follow the path" builds a playlist by walking `next` edges (breadth-first, ≤ 10 pieces) and plays it with the existing playlist chip.
- **Browse → Map:** a toggle over the grid shows the DAG laid out by depth (longest-path layering, ≤ 50 nodes, plain SVG on the page), nodes as thumbnails with titles, edges as arrows, tags as colour bands. Click a node to open it.

**Data in the prototype:** add `related` to the catalog manifests; the derived reverse index is built at boot.

## Risks / what a skeptic would say
- **Prerequisites are personal.** A topologist and a first-year student need different paths. Keep edges coarse ("helps to have seen"), allow several, and never gate anything on them.
- **The map is a hairball at 500 pieces.** At that size it becomes per-tag maps; at the prototype's 13 pieces it is legible and makes the point.
- **Editorial disputes over edges.** Edges are in the author's manifest and reviewed with it; reviewers can mark a wrong edge as a marked fact.

## Effort
**M** (1–2 days). Touches `manifest.js` (accept `related`), `checks.js` (validate ids, cycle warning), `catalog.js` (edges for the 13 pieces), `app.js` (Explanation rows, Next pill, path playlist, Browse map), `styles.css`, `docs/module-api.md` section 2, `docs/submitting.md`.

## How to verify
1. julia-circle → Explanation: "Before this: The road to chaos in the logistic map", "Next: A zoom into the Mandelbrot set".
2. logistic-bifurcation's Explanation shows julia-circle under Next even though logistic's manifest does not list it (derived edge).
3. Follow the path from riemann-sums: a playlist chip "▶ Path from Riemann sums" plays riemann-sums → fourier-square.
4. Browse → Map: an SVG with 13 nodes; arrows go from logistic → julia → mandelbrot.
5. Submit a sample whose `related.after` names `nope`: fail; a sample that creates a cycle: warning.

## Review

**Verdict:** build smaller. Author-declared `after` edges and a derived "Next" row in the Explanation tab make one shared link turn into a session. The map and path play are demo theatre at 13 pieces.

**Strongest objection:**
- "Your edges aren't prerequisites. Riemann sums don't lead to Fourier series in any sense a teacher would assign. Chord envelopes aren't the chord-tangent group law. Double pendulum → Lorenz is 'both chaotic', not 'needed first'."
- "A curriculum graph with wrong edges is worse than none, and 'Where it leads' already says this in prose."

**What to cut:**
- Browse → Map (the longest-path layout, the SVG and the tag bands).
- "Follow the path" playlists.
- The feed "Next" pill gated on `sig.watch`.
- `next` and `see` in the manifest; derive Next only.
- Seed only the edges a reviewer would defend: logistic-bifurcation → julia-circle → mandelbrot-zoom. Maybe also riemann-sums → fourier-square, framed as "see also".

**Must be true to keep it:**
- Every seeded edge passes a mathematician's "would I assign B after A" test.
- The Explanation tab of julia-circle shows a Before and a Next that a reader actually taps.
- Never gate anything on edges.

**Feasibility check:**
- The names exist: `renderDrawer`, `cardHTML`/`paintThumbs` (users.js, app.js), `jumpToViz` (app.js 1097), `sig.watch`, `renderChips`/`tagCounts`.
- manifest.js has no top-level unknown-key rejection, so `related` is accepted silently today. That also means a typo like `relatd` passes. The new check should validate the shape, not just the ids.
- "Is published" needs the published index inside the CI gate (review-pipeline.md section 2). Locally it can only check the bundled catalog. Say so in the check message, as `linkCheck` does for server-side link resolution.
- The cycle warning is trivial at this size.
- The effort (M, 1–2 days) is honest for the full design. The cut version is about half a day.

**Verification script:**
1. julia-circle → Explanation: below the Reference line, "Before this: The road to chaos in the logistic map" and "Next: A zoom into the Mandelbrot set", as mini cards with thumbnails.
2. Tap the Next card: the feed jumps to mandelbrot-zoom (`jumpToViz`).
3. logistic-bifurcation → Explanation: julia-circle appears under Next, though logistic's manifest lists no `next` (a derived edge).
4. galton-board → Explanation: no empty "Before/Next" rows.
5. Submit a sample with `related.after: ["nope"]`: fail. `related.after: ["<its own id>"]`: fail. `relatd: {}`: warn about an unknown field.
