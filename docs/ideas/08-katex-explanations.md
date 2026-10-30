# 08 · TeX in explanations, typeset by KaTeX on the page

## Pitch
Allow `$…$` and `$$…$$` in `explanation.md`, typeset with KaTeX in the Explanation tab (never in the worker), and validated by the in-browser checks. Mathematicians write TeX; asking them to hand-write *z(θ) = (k e^{iθ} + e^{ikθ}) / (k + 1)* in Unicode italics is friction at the exact moment they decide whether to contribute.

## Why mathematicians would care
- **Authors** can paste the formula from their notes or paper. The catalog's own explanations show the strain: `times-table` writes `*e^{iθ}*` with literal braces, which is TeX that nobody renders.
- **Readers** get formulas that look like mathematics, which matters for credibility with exactly the audience the product wants to impress ("this looks like a toy" is the first objection).
- **Reviewers** check facts more easily in typeset notation, and the raw `explanation.md` view stays readable because TeX source is the lingua franca.

## What exists today in the prototype that it builds on
- `md()` in `app.js` (marked 12 from cdnjs) and the Explanation tab in `renderDrawer` with its Rendered / `explanation.md` toggle (`explainRaw`).
- The Explanation static check in `checks.js` (`sharedStatic`: sections, word count) and the link check; a TeX parse check fits beside them.
- docs/fidelity-assessment.md section 2.5: "typeset formulas belong in the explanation" and the worker has no MathJax. This idea agrees and puts typesetting exactly there.
- docs/submitting.md section 6 currently says "No LaTeX, no images": this idea changes that rule, so it needs the collaborators' sign-off.

## Design
**Rendering:** load KaTeX (`katex.min.js`, `katex.min.css`, and `contrib/auto-render`) from cdnjs, lazily on first Explanation open. After `md()` produces HTML, run auto-render on the `article.md` with delimiters `$$…$$` (display) and `$…$` (inline), `throwOnError:false`, `trust:false`, `strict:'warn'`, `maxExpand:1000`, macros disabled from source (`\def`, `\newcommand` rejected by the checker). Before marked runs, protect math spans from Markdown (underscores and asterisks inside `$…$` must not become emphasis): a small pre-pass replaces math with placeholders and restores them after.

**Fonts and theme:** KaTeX inherits `color` from the drawer, so it follows the site style; chalk style keeps KaTeX's own fonts (do not try to set formulas in Kalam).

**Accessibility:** KaTeX's MathML output (`output:'htmlAndMathml'`) is read by screen readers; the raw view keeps the TeX.

**Checks (`checks.js`, static, per package):** parse every math span with `katex.renderToString` in a try/catch (KaTeX runs in the checker page, not in the worker); a parse error is a **fail** with the line and the KaTeX message; an unknown macro is a fail; more than 40 display formulas or any formula over 400 characters is a warning ("is this a slide deck of formulas?", which submitting.md section 1 already returns).

**Content rules (submitting.md section 6, rewritten):** TeX allowed in `$…$` / `$$…$$`; Unicode still fine; no `\href`, no `\includegraphics`, no custom macros; every displayed formula should say in words what it is.

**Catalog migration:** convert the existing explanations' pseudo-TeX (`e^{iθ}`, `y² = x³ + ax + b`) where it reads better; leave Unicode where it is already clean.

## Risks / what a skeptic would say
- **Weight:** KaTeX is ~280 KB JS + fonts; lazy-loading on first Explanation open keeps it off the feed's critical path (PLAN.md's 150 KB app-shell budget).
- **XSS:** KaTeX with `trust:false` does not emit links or raw HTML; marked's output is already inserted as HTML today (worth sanitizing anyway, e.g. DOMPurify from cdnjs, independent of this idea).
- **Slide decks of formulas.** The warning above and the human review form catch them.
- **Dollar signs in prose** ("costs $5") get typeset by accident. Require `\$` for literal dollars, and the checker warns on unmatched `$`.

## Effort
**S–M** (1 day). Touches `app.js` (`md()` pre/post pass, lazy KaTeX load, auto-render call in `renderDrawer`), `checks.js` (TeX parse check), `catalog.js` (a few explanations), `docs/submitting.md` section 6, `docs/review-pipeline.md` (Explanation row), `index.html` (no change if loaded lazily).

## How to verify
1. Open times-table → Explanation: *z(θ) = (k e^{iθ} + e^{ikθ}) / (k + 1)* is typeset as a display formula; toggle `explanation.md` shows the TeX source.
2. Switch styles (night, chalk, graph): formulas follow the text color in each.
3. Submit → sample package, edit its explanation to contain `$\frac{1}{$`: the report fails "explanation line 12: KaTeX parse error …".
4. With a screen reader (or the accessibility tree), the formula has a MathML reading.
5. Network panel: no KaTeX requests until the first Explanation open.

## Review

**Verdict:** build. It's about a day of work, it removes the "this looks like a toy" objection exactly where mathematicians read closely, and the worker stays untouched.

**Strongest objection:**
- "Unicode math was a deliberate choice (submitting.md section 6: 'No LaTeX, no images'). Once TeX is allowed, explanations become formula dumps instead of pictures-first prose."
- "You're adding a second dialect that the raw view, GitHub and RSS won't render."

**What to cut:**
- auto-render. Write one small math tokenizer that both `md()` and the check use, so the gate and the renderer can never disagree about what counts as math.
- The formula-count and length heuristics. One warning (over 400 characters) is enough.
- DOMPurify. It's a real gap, but a separate change.
- Most of the catalog migration. Convert only times-table's `*z(θ) = …*` and `*e^{iθ}*`.
- Leave blog posts (app.js 937 also calls `md()`) on Unicode for now.

**Must be true to keep it:**
- The collaborators explicitly reverse the "No LaTeX" rule in submitting.md section 6.
- The feed's first load makes no KaTeX request.
- The check fails exactly the spans the renderer would show red.

**Feasibility check:**
- The names exist: `md()` (app.js 59, `marked.parse`), `explainRaw` and the Rendered/explanation.md toggle (693–694), `sharedStatic` → the Explanation check (checks.js 258–277), `linkCheck` (622).
- The "fidelity-assessment.md section 2.5" citation is item 5 of section 2 ("Formulas in the picture… typeset formulas belong in the explanation"), which supports this idea. The PLAN.md 150 KB shell budget is on main, line 116.
- KaTeX is loaded on the page (lazily, from cdnjs, version-pinned with SRI) and never in the worker. checks.js runs in the page (and in headless Chromium in the CI gate), so the same pinned KaTeX is available to the check. No conflict with the worker sandbox or the module API.
- **What the gate must parse:**
  1. Split `explanation.md` with the same tokenizer as `md()`: skip fenced and indented code and inline code, treat `\$` as a literal, match `$$…$$` before `$…$`, and warn on an unmatched `$`.
  2. Render each span with `katex.renderToString(s, {displayMode, throwOnError:true, trust:false, strict:'error', maxExpand:1000})` and report the line plus `err.message`.
  3. Reject `\def`, `\gdef`, `\edef`, `\newcommand`, `\renewcommand`, `\let`, `\global` and the trust-gated commands (`\href`, `\url`, `\includegraphics`, `\html*`) by name before rendering.
  4. Compute the 150–1200 word count with the math stripped out.
- Two traps the design misses:
  - submitting.md currently says "indent display formulas four spaces", which Markdown makes into `<pre><code>`. auto-render skips code, so existing displays never typeset until they are rewritten as `$$`.
  - marked consumes backslash escapes (`\$` → `$`, `\\` → `\`). So the placeholder pre-pass must run before `marked.parse`, as the file says, and it must also protect `\\` line breaks inside `$$`.
- The effort (S–M, 1 day) is honest for the cut version. The full design is closer to 1.5 days.

**Verification script:**
1. Load the feed with the Network panel open: no `katex` requests.
2. times-table → Explanation: the epicycloid formula is typeset as a display formula, and *e^{iθ}* is inline math rather than italic braces. Toggle `explanation.md`: the TeX source shows.
3. Switch the style to chalk and then graph: the formula color follows the text color.
4. Submit → sample package, add `$\frac{1}{$` on some line: the report fails "explanation line N: KaTeX parse error …". Change it to `\def\x{1}$\x$`: it fails "custom macros not allowed".
5. Write "costs \$5" in the sample: it renders as a literal $5 with no warning. A bare "costs $5": an unmatched-`$` warning.
6. Accessibility tree on the typeset formula: a MathML node is present.
