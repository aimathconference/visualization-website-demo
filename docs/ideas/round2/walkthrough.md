# Loci walkthrough as three users (Oct 30, 2026, branch overnight-ideas)

I used the site at http://localhost:8765/ while merges kept landing. At the start it had 03, 02, 04, 08, 01, 15, 07, 14 and 09. During the walkthrough 10, 18, 17, 16, 11 and finally 05 (Present) arrived. Most steps ran in the Browser pane. Once another agent began driving the shared front tab, I moved to headless Chromium over CDP; the scripts are in `scripts/`. Screenshots in this folder are named `aN` (professor), `bN` (student) and `cN` (phone).

For about two minutes during the walkthrough, a merge left conflict markers in `app.js` and `index.html` in the served tree. In that window the site failed to boot (`SyntaxError: Unexpected token '<<'`, zero slides). Anyone visiting at that moment saw a blank feed. The cause is merging in the served tree; it is not an app bug.

Housekeeping note: to get a fresh phone user, I cleared `localStorage` for the origin localhost:8765 in the pane. Other agents testing on that origin lost their local drafts and likes at that moment.

---

## (a) Professor preparing a lecture

**Path:** Browse → search "logistic" → open → Customize → Your lesson (3 stops) → Copy lesson link → open it → Present → Share → Record clip → Customize → Embed snippet → `?embed=1`.

What worked well: search, the presets, the stop format, the lesson card's ← →, Present's caption and progress strip, and the GIF recorder (60 frames in 1.5 s, 145 KB, with a correct watermark). The KaTeX explanation is credible.

Friction and bugs, roughly in order of how much they hurt:

1. **Building a lesson hides the picture.** Customize opens as a drawer that covers the whole stage on an 800 px window (`a0`). To add a stop you click a preset, scroll back down to "Your lesson", type the note and click Add, and you can't see the moment you're capturing. The *t* of each stop is whatever the clock says (72.61 s, 88.51 s); there is no "set *t*" field. Stops can't be edited or reordered, only deleted.
2. **Every kind of callout covers the thing it describes.** The lesson card sits on the cobweb plot the note is about ("the cobweb is a rectangle", `a1`, `c5`). The same happens with the collection callout (`a6`, `c3`) and with Present's caption (`a8`, bottom of the cobweb). There are now six callout variants: the preset toast (6 s), the lesson card (with buttons), the collection callout (sticky, no buttons), the Why-it-works step, the question "Show me", and the Present subtitle. Each has different dismissal and navigation.
3. **Leaving a lesson leaves its state behind (bug).** Press `j` to move on from a lesson's slide: `lessonPlay` stays set, the global pause stays on, and the next piece (double pendulum) sits paused with a Play button (`scripts/s7.mjs`; `a7`). The lesson card reappears when you come back. Nothing tells you that you are still "in" a lesson.
4. **Leaving a collection leaves its params behind (bug).** Open a collection that sets logistic r = 3.20, then press All: the logistic slide still runs at r = 3.20, with no "modified" mark (`a5`). Save → Add to a collection then captures r = 3.20, someone else's state, as "This moment". `Collection.applyAll` writes into the user's own `getSettings(v).params`.
5. **Share doesn't know about the lesson.** The Share dialog shows "Link to this view" (one state) and says to go to Customize to build a lesson, even when a lesson draft exists or a lesson is playing. The GIF watermark is the single-state link, not the lesson.
6. **Present's QR is one stop, not the lesson.** With a lesson playing, Q encodes `?v=…&p=…` for the current stop. The room gets one moment and none of the notes (`a8`). In a collection, Present ignores the collection's notes and steps the author's presets instead ("Presets · 0 of 3", then "r = 3.20, a 2-cycle · 1 of 3", `a9`).
7. **Embeds silently drop lessons (bug).** `?embed=1&lesson=…` renders the plain piece at its default r = 3.83, with no stops and no warning. "Open in Loci ↗" links to a single state, so the lesson is lost there too (`a3`). The embed also shows two Play buttons (`a4`).
8. **The GIF watermark is an 80-character base64 URL** (`a2`). It works as a link in a PDF, but nobody can type it from a projected slide, and on a 592 px GIF it shrinks to near-illegible mono.
9. **The tools for sending things out live in different places.** Share has link, PNG, clip, Present and (now) "Propose this moment as a preset". Customize has Embed config, embed snippet, static image, Your lesson and Add to a collection. Save's toast has Add to a collection. A professor looking for "embed" will open Share first.
10. Small issues: the clip estimate says "roughly 3.4 MB" and the result was 145 KB (23× off); the clip panel says "the slide keeps playing" while the lesson has it paused; every re-render of Customize spawns a poster worker for the static-image snippet (five `mounted … (poster)` lines while I added three stops); `favicon.ico` 404s.

## (b) Graduate student contributing

**Path:** times-table → Source → Remix → edit (integer *k*) → Run → Check this remix → Open in Submit → Submit; Browse → Read the submission guide; Wanted → Propose a challenge.

What worked well: the gate is excellent. It produced 29 checks in about 35 s with readable reasons; flagged the near-duplicate (96 % shingles) honestly; and the report states that it covers the remix, not the published piece.

1. **The remix can't change anything but `index.js`.** Title, presets, params and explanation are inherited and can't be edited. My remix makes *k* an integer, yet it shipped the parent's explanation ("k sweeps slowly upward") and a preset "wait for k = 51" that no longer means anything. The gate passed all of it: "3 presets, every one valid as written".
2. **Wanted challenges can't be answered from the browser.** Wanted says to add `"bounty": "weierstrass-torus"` to loci.json, and the remix editor can't edit loci.json. So the in-browser contributor path and the bounty never meet.
3. **Submit claims something false.** It says "Your remix is live in the New lane with a 'Checked by machine' badge (mockup: nothing was uploaded)". The New chip still says 4 and the remix is nowhere in it.
4. **The submission guide opens as raw Markdown with mojibake.** The server sends `text/markdown` with no charset, so "i â¦ kÂ·i mod n" appears (`b1`). That is about 5,000 words of unrendered Markdown with fenced code, from the site's main call to action.
5. **Every "send" button ends at a 404.** "Send to the editors" (Wanted, question of the week), "Open a prefilled issue" (presets), "Ask on GitHub" (questions) and "Suggest an edit with a pull request" all point at `github.com/loci-viz/*`. I checked: `loci-viz`, `loci-viz/registry` and `loci-viz/times-table` all return 404. The page warns about the registry in small print, but not about the piece repos, which are presented as real.
6. **There are three identities.** The remix is credited to "author @you", Wanted says "proposed by you", and "Propose this moment as a preset" asks for "Your handle" (stored as `loci:handle`, used only there).
7. **The published source contradicts the guide.** times-table's module uses a "legacy P" wrapper, `ctx.lineWidth=1` and `P.bg`, against "Scale strokes from theme.lw". That is the first source a would-be author reads.
8. **Math is typeset in only one place.** KaTeX works in explanations only. Wanted text, lesson notes, collection notes, question text and preset notes are plain text, so authors write ℘′, `->` or `1+√8` by hand.

## (c) Casual mathematician on a phone (375×812, touch)

**Path:** scroll → like → save → Explain (formulas, Try this, Questions, Show me) → collection link → lesson link.

What worked well: scrolling and the one-hand rail, and KaTeX at phone size (`c2`: the epicycloid formula renders cleanly). The elliptic-curve slide shows Δ = −368, which is correct for y² = x³ − x + 1.

1. **"Tap one to set it up on the slide," but the slide is behind the drawer.** The Explanation drawer covers 82 % of the screen (top at 146 px of 812). Tapping a Try-this pill, a `#preset:` link, a Why-it-works step or a question's "Show me" changes the picture and shows a callout, and both are behind the drawer. All you see is the label row changing to "n = 30" (`c2`, `c6`).
2. **Desktop instructions on a phone.** The question of the week says "scrub with , and . (or [ and ])". The elliptic Try-this says "Click the piece… Esc (or a click outside)". Questions says "Click in the box".
3. **The question of the week gives away its own answer.** The question asks "for which n and k" every chord is parallel. Slide pill 3 and the Explanation's Try this (in the same panel as the question) are "n = 50, wait for k = 49, found by @kmoreau.geom", with the note "all of them are parallel" (`c1`).
4. **The callouts cover the picture on phones too** (`c3`, `c5`). The collection and lesson cards cover the cobweb completely. The Save toast covers the Share button and the license line.
5. **Same text, different behaviour in collections and lessons.** In a collection you move with a vertical swipe and the callout has no buttons. In a lesson you use ‹ › buttons, or ← → on a keyboard. After swiping away from a lesson's slide, the feed stays paused (bug 3 in (a)).
6. The third preset pill is off-screen with no scroll affordance. "Tap to interact" sits on the curve.

## Things that make a mathematician distrust the site

- **Invented engagement numbers next to careful "sample" labels.** Every slide shows likes (12k, 16k, 8.9k…). These come from `likes:` in catalog.js, are unlabelled, and feed For you. Meanwhile the Wanted page says "there are no vote totals to show" and the distinctions are labelled *sample*. The honesty policy is applied in some places and not others.
- **The same small cast plays every role.** @kmoreau.geom is an author, the reviewer of times-table, the "found by" on times-table, the proposer of the November challenge and the voice of the sample answers. The October jury (@may.iterates, @levien.tan, @fatou.dust) are also authors and each other's reviewers. Each label is honest on its own; together they read as a sock-puppet community.
- **A mathematical error in the Wanted challenge.** It says the period cell under z ↦ (℘(z), ℘′(z)) should "land on the real points of y² = 4x³ − g₂x − g₃". The torus maps onto the *complex* points E(ℂ); the real points are one or two circles inside it.
- **A blog headline that doesn't match its content.** "10 best visuals for teaching calculus … from Riemann sums to Lagrange multipliers" links 3 pieces: Riemann sums, a Fourier square wave and Himmelblau. There is no Lagrange-multiplier piece, and the text refers to "seven in the review queue" that don't exist. The blog list is also out of date order (Oct 28, Oct 14, Sep 30, Oct 29).
- **A distinction badge that collides with tag names.** The caption mark "◆ Teaching" sits next to the tag `#teaching` and the chip "Teaching 10", so it reads as a tag rather than an award.
- **Dead ends.** Every repo and issue link 404s, and the guide is served as mojibake (above).

Checked and correct: Δ for the elliptic curve, the split at b < 2/(3√3), E(ℝ) ≅ S¹ × ℤ/2ℤ and the coset claim; 51·2 ≡ 1 (mod 101); the k ≡ −1 reflection argument; z(θ) = (k e^{iθ} + e^{ikθ})/(k+1) with k − 1 cusps; 1 + √8 ≈ 3.8284 for the period-3 window; Riemann–Hurwitz as stated; and the local minimum b − 2/(3√3) in the sample answer.

## Top five

1. **On a phone, the explanation's live controls change a picture you can't see,** and every callout variant covers the picture it describes. This is the biggest gap between what was built tonight and what a reader experiences.
2. **Lessons, collections and Present are three mechanisms with three players.** State leaks across them: the pause and the lesson outlive their slide, and collection params stay on in All. Present's QR and embeds drop the lesson, and Present ignores collection notes.
3. **Moments are captured in five places** (Customize lesson, collection modal, propose-a-preset, question-of-the-week answer, Ask a question). Each has its own note field, local store and identity (@you, you, `loci:handle`), and nothing lists what you made.
4. **Every outward action ends at a 404,** and the in-browser contributor path can't reach a bounty or change a title, preset or explanation.
5. **Trust leaks:** unlabelled invented like counts, one small cast in every role, a ℘ error in the flagship challenge, a "10 best" post with 3 items, and a question of the week whose answer is a pill on the same slide.
