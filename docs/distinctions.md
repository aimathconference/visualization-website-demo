# Monthly distinctions

A distinction is a citation, not a trophy: two sentences, signed by the
reviewers who wrote them, saying what a piece shows and why it matters. It
replaces the "Editor's pick" that `review-pipeline.md` section 3 used to
describe. There is no third lane; a distinction sits on top of the Feed
lane.

## Categories

At most one award per category per month. Any category may go unawarded,
and the roundup says so rather than filling it.

| id | Name | What the jury looks for |
|---|---|---|
| `clear` | Clearest single idea | one idea, one knob, and the moment it clicks is in a preset |
| `teach` | Best teaching piece | used with students, and the nomination says how |
| `research` | Research picture | something a working mathematician would put in a talk |
| `craft` | Craft | the GPU, WebAssembly or a mobile version used to show more mathematics, not more glitter |
| `explain` | Best explanation | precise hypotheses and references a reader can check |

## Cadence

Nominations open on the 1st and close on the 25th. The jury decides by the
last day of the month. Awards are announced in the monthly roundup post on
the 1st, which is also the first item of the "Best of the month"
newsletter.

## Eligibility

* The piece is **Community reviewed** (two approvals of the mathematics),
  and reached that lane, or was re-reviewed after an explanation change,
  in that calendar month. Pieces in the New lane, checked by machine only,
  are not eligible.
* A piece that won a category in the last 12 months is not eligible for
  the same category again.
* A juror's own pieces are not eligible in the month they serve.

## The jury

Three reviewers, rotating monthly, at least one working outside the
piece's tags so the citation reads to a non-specialist. Each scores
independently before seeing the others, as in review.

**The jury is blind to likes.** The jury form never shows like counts, save
counts or watch time; this is the "Metrics are not review" rule of
`review-pipeline.md` section 5. Nominations need one sentence of reason;
reasons go to the jury, and nomination counts only decide whether a piece
reaches the shortlist (one reasoned nomination is enough). The categories
reward different things, so one striking piece cannot sweep the month.

A citation must name the thing seen, a parameter and why it matters. It is
public and signed, so a bad call is visible and can be argued with.

## Where it shows

* On the slide, after the lane: a text mark such as "◆ Teaching · Oct 2026",
  whose accessible name is "Distinction: Best teaching piece, October 2026".
  It opens the Explanation tab. On a phone it drops the month ("◆ Teaching")
  and sits beside the author, so the caption's author row stays at two
  lines.
* At the top of the Explanation tab: the category, the citation, "Cited by"
  the jurors, and the month.
* In the monthly roundup post (`top-october-2026`), whose playlist plays
  the distinguished pieces.

The data is the `DISTINCTIONS` array in `distinctions.js`, loaded after
`catalog.js` and before `app.js`:

```js
{ month:'2026-10', cat:'teach', viz:'times-table', jury:['@a','@b','@c'], sample:true,
  citation:'Two sentences: what is seen, at which parameter, and why it matters.' }
```

## Nothing here is invented activity

The prototype has no nominations, no jury and no history of awards. The
three October 2026 distinctions are **samples** written to show the
format; the jurors named are catalog authors standing in for a rotation
that has not happened. Every seeded entry has `sample:true`, and the UI
says so: a "sample" note on the citation in the Explanation tab and a
"Sample" paragraph at the top of the roundup post. Remove the flag only
for a citation a real jury wrote.

Not built yet: the nomination form, the jury page, a "Distinguished" filter
in Browse, and a Distinctions row on profiles.
