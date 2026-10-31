/* ---------- the blog ---------- */
const POSTS = [
{
  id:'top-october-2026', title:'The October 2026 distinctions', date:'Oct 28, 2026', author:'The EigenReel editors', read:'3 min read',
  vizIds:['times-table','elliptic-group-law','riemann-sums'],
  excerpt:'Three citations from a jury of three reviewers, chosen from the piece and its explanation, not from likes or views. A sample of the format.',
  md:`**Sample.** The citations below were written for this prototype to show what a monthly distinction looks like. No jury has met and no nominations were collected; the jurors named are catalog authors standing in for a real rotation. How distinctions work is in [docs/distinctions.md](docs/distinctions.md).

Each month a jury of three reviewers reads the pieces that were Community reviewed that month and awards at most one distinction per category, each with a two-sentence citation they sign. The jury never sees like counts, save counts or watch time, and a juror's own pieces are not eligible. This month's jury: @may.iterates, @levien.tan and @fatou.dust.

### Best teaching piece: Multiplication tables on a circle
*By @circle-mod-n.* “Set *n* = 101 and wait for *k* = 51: since 51 · 2 ≡ 1 (mod 101), the cardioid’s chords come back, and a class meets inverses mod *n* before anyone names them. The same slide then carries the envelope of a family of chords to an epicycloid with *k* − 1 cusps, so one picture serves a number theory lesson and a geometry one.”

### Research picture: The group law on an elliptic curve
*By @kmoreau.geom.* “Lower *b* below 2/(3√3) ≈ 0.385 and the real curve splits into an oval and an unbounded branch; put *P* on the oval and *Q* on the branch, and *P* + *Q* lands back on the oval, so the oval is visibly a coset of the identity component. It is the picture of *E*(ℝ) ≅ S¹ × ℤ/2ℤ we would put on a slide in a talk.”

### Clearest single idea: Riemann sums and their errors
*By @calc-commons.* “One knob, the sample point, and the log–log inset answers the question it raises: the left-rule error falls with slope −1 and the midpoint error with slope −2. A student sees that where you sample decides how fast the sum converges, not whether it does.”

### Not awarded this month
**Craft** (the GPU, WebAssembly or a mobile version used to show more mathematics) and **Best explanation** went unawarded. The pieces that would compete for Craft are still in the New lane, checked by machine but not yet reviewed, so they are not eligible. An empty category is said plainly rather than filled.

Every distinguished piece is open source. Fork it, restyle it, and send us what you build.`
},
{
  id:'calculus-ten', title:'10 best visuals for teaching calculus', date:'Oct 14, 2026', author:'@calc-commons, guest curator', read:'7 min read',
  vizIds:['riemann-sums','fourier-square','himmelblau-descent'],
  excerpt:'From Riemann sums to Lagrange multipliers: the visuals that make a first-year student say “oh, that’s what it means.”',
  md:`I've taught first-year calculus for eleven years. These are the ten pictures I'd keep if I could only keep ten. Three are already in the EigenReel catalog; the other seven are in the review queue and should land over the next two months.

### 1. Riemann sums and their errors
*In the catalog.* Students see the definition of the integral and the speed of convergence at once. The log–log inset is the part that sticks.

### 2. A square wave from spinning circles
*In the catalog.* Not first-semester material, but I show it on the last day as a preview of where series go.

### 3. Four valleys of Himmelblau
*In the catalog.* The cleanest picture I know of the gradient being perpendicular to level curves.

### 4. Secants becoming a tangent
*In review.* A point slides toward another along a curve while the slope readout converges.

### 5. Taylor polynomials of sin x
*In review.* Watch each new term bend the polynomial to hug the curve a little further out.

### 6. Volumes by disks and washers
*In review.* A region spins around an axis, and the slices stack into a solid.

### 7. Newton's method and its basins
*In review.* Converging in two steps, or bouncing off to infinity, depending on where you start.

### 8. Slope fields and Euler's method
*In review.* The step size slider makes the error of Euler's method visible.

### 9. Lagrange multipliers on a level set
*In review.* A level curve of the objective slides until it just touches the constraint.

### 10. The ε–δ game
*In review.* You pick ε, the student picks δ, and the band either contains the graph or it doesn't.`
},
{
  id:'how-we-curate', title:'How a visualization gets into EigenReel', date:'Sep 30, 2026', author:'The EigenReel editors', read:'5 min read',
  vizIds:[],
  excerpt:'An open-source license, a reviewed explanation, and a module that follows the module contract. Our checklist, in full.',
  md:`EigenReel is curated by people. Every visualization in the feed was submitted as an open-source repository, read line by line, and checked by two mathematicians before it went live. Here is the checklist we use.

### 1. An OSI-approved license
MIT, BSD, Apache-2.0 and GPL-3.0 are the common ones. If readers can't fork it, we don't host it.

### 2. A manifest and a module that follow the module contract
Each piece is a small package: a \`loci.json\` manifest that declares its runtime, parameters and "Try this" presets, and one module, an ES module or a WebAssembly binary. The site never runs it on the page: it runs in a sandboxed Web Worker that owns an OffscreenCanvas, with no network and no storage. The host owns the canvas, the clock, the seed and the theme, renders the Customize controls from the manifest and validates every value, and the module draws a pure function of them, so a share link reproduces exactly what the sharer saw.

    // loci.json
    { "api": 1, "id": "times-table", "runtime": "js", "render": "canvas2d",
      "params": [{ "key": "n", "type": "range", "label": "Points on the circle",
                   "min": 20, "max": 400, "step": 1, "default": 200 }],
      "motion": "pause" }

    // index.js
    import { label, fsFor } from '@loci/kit';
    export default {
      draw({ ctx, t, box, theme, params, seed, state }) {
        // theme = { bg, fg, a1, a2, font, lw, labels }: read-only, owned by the site
      }
    };

The full contract, including the WebAssembly exports and what the worker enforces, is in [docs/module-api.md](docs/module-api.md).

### 3. An explanation a referee would sign
The explanation.md must say what is on screen, state the mathematics precisely, and give the reader something to try. Two reviewers check every claim. One works in the area; one teaches it.

### 4. Accessible by default
Labels can be turned off, animation speed can go to zero, and every palette is checked for contrast against its background.

### 5. Credit stays with the author
The author's handle sits on every slide, and the repository link goes to their repo, not a copy of it.`
},
{
  id:'chaos-and-randomness', title:'New this week: chaos and randomness', date:'Oct 29, 2026', author:'The EigenReel editors', read:'4 min read',
  vizIds:['logistic-bifurcation','double-pendulum','lorenz-butterfly','galton-board'],
  excerpt:'Four new pieces on how simple rules produce unpredictable behavior, and how unpredictable steps add up to a bell curve.',
  md:`Four visualizations cleared review this week, and they pair up. Two show deterministic rules that behave randomly. Two show randomness that behaves very regularly.

### Deterministic, yet unpredictable
**The road to chaos in the logistic map.** One parabola and one knob. Set *r* = 3.2 for a 2-cycle, push it past 3.5699 and the cycles stop, then find the period-3 window near 3.83. Reviewers asked for the cobweb because the bifurcation diagram alone hides what a single orbit does.

**Two double pendulums, one thousandth apart.** The most-watched piece we have accepted. Drop θ₁ to 20° and the two copies never separate, because small oscillations are linear. Raise it and they part within seconds.

**The Lorenz butterfly, two runs at once.** The same lesson in three dimensions. With ρ = 10 both runs fall into the same fixed point. With ρ = 28 they separate and visit the two wings on their own schedules.

### Random, yet regular
**A Galton board and the bell curve.** Each ball makes *n* fair coin-flips. The histogram is binomial, and as rows increase it approaches the normal curve drawn on top of it. This is the de Moivre–Laplace theorem you can watch.

### How to use them together
Sensitive dependence is the common thread: a tiny difference at the start and no memory of it at the end. In the pendulum and the Lorenz system, that comes from the equations. In the Galton board it comes from the coins. Ask students which of the four they would be able to predict a minute ahead, and why.

All four are open source. Send us the ones you remix.`
}
];
