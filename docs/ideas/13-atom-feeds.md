# 13 · Atom feeds: per tag, per author, and the blog

## Pitch
Publish Atom feeds for new and newly reviewed pieces (all, per tag, per author) and for blog posts, each entry with the poster image, the hook, the lane and the share link. Mathematicians read arXiv listings, journal tables of contents and blogs through feed readers; a feed is the lowest-effort way for this audience to keep Loci in their week without opening another app.

## Why mathematicians would care
- **Researchers** subscribe to `feeds/tag/complex-dynamics.xml` next to their arXiv math.DS feed. New pieces in their area arrive in the same place as new papers.
- **Department and course sites** embed a feed (many CMS and LMS platforms show an RSS/Atom widget), which advertises Loci to every student who visits.
- **Bloggers and newsletter writers** (math Mastodon, "This Week's Finds"-style blogs) pull from it.
- It needs no account, which matters for a population that resists signing up for things.

## What exists today in the prototype that it builds on
- `VIZ` and `POSTS` in `catalog.js`: every field a feed entry needs (title, hook, author, tags, lane, reviewed, license, alt) is already there.
- `shareURL` format (`?v=<id>`) for entry links; `#blog` view and `openPost` for post links (needs a URL form for posts, e.g. `?post=<id>`).
- Posters: `LociHost.poster` and `renderThumb` produce frames on the page; for a static feed, poster PNGs need to exist as files (see design).
- `catalog.js` is a plain script; `checks.js` and `manifest.js` already work under node (`module.exports`), which shows the pattern for a node build script.

## Design
**Generator:** a dependency-free node script `tools/feeds.mjs` that loads `catalog.js` in a `vm` context (it only defines `VIZ`, `POSTS` and helpers; any canvas helpers it needs at load are stubbed), and writes:
- `feeds/all.xml`: pieces, newest `published`/`reviewed` first, 50 entries;
- `feeds/tag/<slug>.xml` per tag; `feeds/author/<handle>.xml` per author;
- `feeds/blog.xml`: posts.
Each entry: `<title>`, `<link href=".../?v=id">`, `<id>` (a stable tag URI), `<updated>`, `<author><name>`, `<category term>` per tag, `<summary>` = hook, `<content type="html">` = poster `<img>` (with the alt text) + hook + "Community reviewed · Oct 2026" or "Checked by machine" + license.

**Posters as files:** a "Export posters" button in the keys dialog (or a `?posters=1` page) renders each piece's poster at 1200 × 630 via `LociHost.poster` and downloads a zip, committed to `posters/<id>.png`. (The real pipeline renders thumbnails in the check job: PLAN.md section 4, step 2.) The same files serve as share images (14).

**Discovery:** `<link rel="alternate" type="application/atom+xml" href="feeds/all.xml" title="Loci: new visualizations">` in `index.html`; profile pages (`renderUser`) and tag views link their feed with a small "Feed" button; Blog sidebar links `feeds/blog.xml` beside the newsletter form.

**Validity:** run the output through the W3C feed validator by hand once; add a node test that parses each file with a minimal XML well-formedness check.

## Risks / what a skeptic would say
- **"RSS is dead."** Not for academics: arXiv, journals and most math blogs still ship feeds, and feed readers are common in this population. It is also nearly free to build.
- **Static generation drifts** from the catalog if nobody reruns it. Add it to the README's run instructions and, later, to the publish workflow (PLAN.md owns that).
- **No per-user feeds** ("my follows") without accounts. Per tag and per author cover most of it.

## Effort
**S** (half a day to a day). Touches a new `tools/feeds.mjs`, new `feeds/` output, `index.html` (`<link rel=alternate>`), `app.js`/`users.js` (Feed buttons; `?post=` link form in `readLink`/boot), `catalog.js` (`published` dates, shared with 12), README.

## How to verify
1. `node tools/feeds.mjs` writes `feeds/all.xml`, `feeds/blog.xml`, one file per tag and author.
2. Open `feeds/tag/complex-dynamics.xml` in a feed reader (or the W3C validator): valid Atom; entries link to `?v=julia-circle` etc. and show the poster.
3. The page head has the alternate link; a browser extension or reader auto-discovers it.
4. Profile of @escape.time: a Feed button linking `feeds/author/escape-time.xml`.

## Review
**Verdict:** build smaller. A feed for `all` plus one per tag is cheap and is the right channel for this audience; in a prototype with 13 fictional pieces it is plumbing that pays off only once the site is deployed with real content.

**Strongest objection:** "I'd subscribe to a Loci feed only when there's a steady stream in my area. Today there are 13 pieces, 25 tags (15 of them with exactly one piece) and 13 authors with one piece each. A per-author feed holding one entry that never changes is noise. I subscribe to arXiv math.DS because it has 20 new papers a day."

**What to cut:**
- Per-author feeds: every author has exactly one piece today. Add them when someone has three.
- Poster images in entries: no poster files exist (no `v.poster` is set on any piece, and nothing under `posters/`). `LociHost.poster` needs a browser, a worker and, for some pieces, WebGL2, so a node script cannot make them. Ship the entries text-only, with hook, lane and license. Add the `<img>` when 14's poster export exists.
- Per-tag feeds only for tags with at least 2 pieces (10 tags today). One `tag/` file per singleton tag is clutter.
- The W3C validator pass is fine. Drop the "XML well-formedness node test" and use `xmllint --noout` in the README instead.

Keep `all.xml`, `blog.xml`, `<link rel="alternate">` and a Feed link on tag views.

**Must be true to keep it:**
- The site has a fixed public origin to put in absolute `<link href>` and `<id>` values. Atom readers resolve relative links badly, and the prototype is served from wherever `python3 -m http.server` runs.
- Someone commits to re-running the generator on every catalog change. Otherwise the feed shows stale content, which is worse than no feed.

**Feasibility check:**
- Verified: `catalog.js` loads cleanly in a node `vm` context after `kit.js` and `manifest.js` (its `document` uses are all inside functions). So `tools/feeds.mjs` works as described, and no stubs are needed.
- `published` does not exist. Pieces carry only `reviewed:'Oct 2026'` (a month string) and `lane:'new'`. Atom requires an RFC 3339 `<updated>` per entry, so every piece needs a real date added. Shared with 12, as the file says. POSTS `date:'Oct 28, 2026'` parses.
- The `#blog` view is not a URL route: the hash is the site style (`hashchange` → `setStyle`) and the blog is reached through `showView`. `?post=<id>` has to be added to boot, alongside `readLink`. The file lists this, but it is the one non-trivial app change.
- Tag slugs need a slugify step ("Complex dynamics" → `complex-dynamics`). No such helper exists.
- No conflict with the module API, the worker or checks. The S estimate is honest once posters are cut.
- PLAN.md (origin/main) does not mention feeds. The real site (Workers + R2) would generate them in the publish job, so this generator is throwaway, but its output format is not.

**Verification script:**
1. `node tools/feeds.mjs` → lists `feeds/all.xml`, `feeds/blog.xml` and `feeds/tag/<slug>.xml` for the 10 tags with 2 or more pieces, and nothing else.
2. `xmllint --noout feeds/*.xml feeds/tag/*.xml` exits 0. Paste `all.xml` into validator.w3.org/feed: valid Atom, no "relative link" warnings.
3. Open `feeds/tag/complex-dynamics.xml` in a reader: two entries (julia-circle, mandelbrot-zoom), each linking `?v=<id>` on the configured origin. Clicking one opens that slide.
4. An entry in `blog.xml` opens `?post=top-october-2026` with that article showing, not the feed.
5. View source of `index.html`: `<link rel="alternate" type="application/atom+xml">` is present. Browse → filter by a tag: a Feed link to that tag's file.
