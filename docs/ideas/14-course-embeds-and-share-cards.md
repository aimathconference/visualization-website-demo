# 14 · Course-page embeds with a poster fallback, and share cards from captures

## Pitch
Make the existing embed snippet real: an `?embed=1` mode with minimal chrome that shows a static poster until clicked (so a course page with ten embeds does not start ten workers), degrades to the poster plus a link where scripts or iframes are blocked, and prints. Pair it with a "share card": a 1200 × 630 image composed from the current capture, title, author and short link, for the places that show images but not live content (slides, Slack, social posts, LMS announcements).

## Why mathematicians would care
- **Instructors** put pictures on course pages, in Canvas/Moodle modules and in lecture notes. An embed that is light, accessible and does not break the page is how Loci gets in front of every student in a course, each of whom can click through. Today the Customize panel offers an `<iframe>` of the full feed, which is the whole app in a 480 × 640 box.
- **Speakers and posters** at conferences want a still with a link; the share card is that, with the right attribution baked in.
- **Social shares** without a preview image are ignored; every link pasted in Slack, Zulip, Mastodon or Discord should unfurl with the picture. A static site cannot do per-URL OpenGraph tags, but it can hand the user the image.

## What exists today in the prototype that it builds on
- `embedHTML(v)` and `cfgJSON(v)` in `renderCustomize` ("Embed config", "Embed snippet", "Copy embed"): the snippet exists; the embed target page does not.
- `shareURL`, `readLink`, `stateOf`: the embed URL is a share link plus `&embed=1`.
- `LociHost.poster` and `h.capture()` (`runtime.js`), `saveFrame`, `download`; `paintPoster`/`showFallback` in `app.js` (the poster-and-card path for pieces that cannot run).
- The `motion` field and reduced-motion handling (`reduceMotion`, `paused`): embeds should respect them by default.
- PLAN.md's `/embed/:slug?cfg=…` and "share image" (section 3 table): this is the static-prototype version of both.

## Design
**Embed mode (`?embed=1`):**
- Boot path in `app.js`: when `embed=1`, render only one slide (the linked piece) with no top bar, chips, tabs or rail; a compact footer: title, `@author`, "Open in Loci ↗" (opens the share link in a new tab), and a play/pause button. Explanation opens in a compact overlay if `&explain=1`.
- **Click-to-play:** the stage starts as the poster (`LociHost.poster` at the link's `t` and params); first click or Enter mounts the worker. `&autoplay=1` opts out (for a single embed). Off-screen embeds unmount (an `IntersectionObserver`, as the feed already uses).
- **Fallback chain in the snippet:** the copied HTML becomes
  ```html
  <iframe src="…?v=times-table&p=…&embed=1" title="Multiplication tables on a circle, on Loci" width="480" height="480" loading="lazy" style="border:0">
    <a href="…?v=times-table&p=…"><img src="…/posters/times-table.png" alt="(the piece's alt text)" width="480" height="480"></a>
  </iframe>
  ```
  plus a "Static image only" option for LMSs that strip iframes (just the linked `<img>`), with the poster file from 13's poster export.
- `@media print`: the embed page prints the poster, title, author and the URL as text.

**Share card:** "Share card" button in the Share dialog (`#sharemodal`, beside "Save frame"): capture the current frame (`h.capture()`), compose on a 1200 × 630 page canvas: the frame on the left (box-cropped), title, hook, `@author`, lane, and the short link plus a QR code (shared with seminar mode, 05) on the right, in the current site style's palette and font; download as PNG. Alt text for the card (title + piece alt) is copied alongside for pasting.

**Persists:** nothing new; poster files are static assets (13).

## Risks / what a skeptic would say
- **Same-origin embed of the whole app** in the prototype is heavy; embed mode must skip building the feed (`buildFeed`) entirely, not hide it.
- **Third-party iframes are blocked** on some LMS installs: hence the static image option.
- **Real OpenGraph needs a server** (per-URL meta tags): PLAN.md owns that. The share card is the useful 80% now, and the same 1200 × 630 composition becomes the server's OG image later.
- **Click-to-play is one more click.** For a page of ten embeds it is the only polite option; a single embed can autoplay.

## Effort
**M** (2 days). Touches `app.js` (embed boot path, click-to-play, compact footer, snippet text in `embedHTML`, share card composer), `index.html` (embed layout hooks, Share dialog button), `styles.css` (embed and print styles), docs/module-api.md section 5 (`embed`, `autoplay`, `explain` flags), plus poster files (13).

## How to verify
1. Customize → Copy embed; paste into a local `test.html` with four copies: four posters, no workers until clicked (check `loci: mounted` logs); clicking one plays only that one.
2. Disable JavaScript for the iframe origin (or open the snippet in a viewer that strips iframes): the linked poster image shows with alt text.
3. Print preview of an embed: poster, title, author, URL.
4. Share → Share card: a 1200 × 630 PNG in the current style, with frame, title, author and a scannable QR code to the exact state.
5. Embed with `prefers-reduced-motion`: starts paused even after clicking, with a visible Play.

## Review
**Verdict:** build smaller. Embed mode for one piece is the highest-leverage sharing feature on this list. The share-card composer and the iframe fallback chain are polish built on two wrong assumptions, so cut both.

**Strongest objection:** "When I paste a Loci link into Zulip or Mastodon I get no preview image. The 'share card' fix asks me to download a PNG, attach it and paste the link next to it. Nobody does that twice. And the iframe fallback you describe never shows: browsers ignore an iframe's children."

**What to cut:**
- **The `<a><img></a>` inside `<iframe>`.** HTML5 browsers never render an iframe's child content, with or without scripts. LMS sanitizers that strip `<iframe>` usually strip its children too. Keep the separate "Static image only" snippet as the real fallback, and put a `<noscript>` poster plus link in the embed page itself.
- **The share card composer with QR code** (it depends on 05). Ship static OpenGraph tags instead (below). A plain "Save frame" already exists.
- **`&explain=1` overlay and print styles.** Add them later if instructors ask.

Keep: `?embed=1` boot that skips `buildFeed`, a compact footer with "Open in Loci ↗", click-to-play over a still, reduced motion honored, and a 480 × 480 snippet.

**Must be true to keep it:**
- Embed mode must not construct the feed. Check that only one worker is created per embed after the click, and none before it.
- The click-to-play still must cost no worker. `LociHost.poster` (runtime.js:274) calls `mount()`, which creates a `new Worker` (runtime.js:252), captures one frame and disposes. "Four posters, no workers until clicked" is false if the still comes from `LociHost.poster`. The options are a committed PNG (which does not exist yet), the main-thread `v.draw` that `renderThumb` uses (it covers the legacy pieces only, not the `source`/`sources`/WASM ones), or accepting one short-lived worker per embed at load.

**Feasibility check:**
- Verified to exist: `embedHTML`, `cfgJSON`, `renderCustomize`, `stateOf`, `shareURL`, `readLink`, `saveFrame`, `download`, `paintPoster`, `showFallback`, `reduceMotion`, `IntersectionObserver` (in `buildFeed`), and `h.capture()`.
- The current snippet is the full app in 480 × 640 (app.js:795), as the file says.
- **OpenGraph on a static site, without a server:**
  - (a) Site-wide `og:title`, `og:description` and `og:image` in `index.html` work today. Every link unfurls with the same Loci card, which is better than nothing.
  - (b) Per-piece cards are possible statically. Generate `v/<id>.html` stubs, each holding that piece's `og:*`/`twitter:card` tags with an absolute PNG `og:image`, plus `<meta http-equiv="refresh">` or `location.replace` to `../?v=<id>`. Unfurl bots (Slack, Discord, Mastodon, X) read the meta and do not run JS. This needs the same node generator as 13, the poster PNGs, a fixed origin, and `shareURL` changed to emit `/v/<id>.html?p=…`.
  - (c) Per-state cards (`&p=…`) are impossible without a server. The file's claim that "a static site cannot do per-URL OpenGraph" is wrong for per-piece and right for per-state.
  - SVG `og:image` is not supported by most unfurlers, so use PNG.
- PLAN.md (origin/main) has `/embed/:slug?cfg=…` and share images in phase 1/2, and LMS embedding in phase 3. The prototype version does not conflict with it.
- Location hashes are taken by site styles. The embed URL must not rely on `#`.
- `motion` exists per piece (`pause` for 12, `static` for 1).
- The M estimate is honest for the cut version. The full version is closer to L because of the composer, QR, print and posters.

**Verification script:**
1. Customize → Copy embed. The snippet has `&embed=1`, `width="480" height="480"` and no `<img>` inside the iframe.
2. Paste four copies into `test.html` served locally. DevTools → Application → Frames/Workers shows 0 `loci:` workers. Click one: exactly 1 worker, and the other three stay stills.
3. Inside one embed: no top bar, chips or rail. "Open in Loci ↗" opens the full share link in a new tab with the same params and *t*.
4. With `prefers-reduced-motion` emulated: after the click it shows a frame with a visible Play and does not animate.
5. If the static OG stubs are built: paste `…/v/times-table.html` into the opengraph.xyz preview or a Discord channel. Title, hook and poster unfurl, and clicking lands on the slide.
