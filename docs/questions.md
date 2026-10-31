# Questions a picture answers

## The pinned question

One question at a time, pinned on one piece, that the picture itself
answers. The answer is a **state** (the piece's parameters and a moment *t*,
plus its view if it has one), not a number you could type: finding the moment
is the work. It is a puzzle column, not a quiz: no scores, no streaks, no
leaderboard.

The record is `QUESTION` in `questions.js`:

| field | rule |
|---|---|
| `id` | the week it was posted, `YYYY-wNN`; never reused |
| `v` | the piece id the question is pinned on |
| `posted` | `YYYY-MM-DD` |
| `by` | the user who wrote it, by @handle (an editor, or the piece's author on request) |
| `q` | the question, one or two sentences, at most 200 characters |
| `how` | how to answer on this piece: which knob, how to scrub, what to send |
| `reveal.state` | `{p, t, view?}`, a moment without a note (module-api.md section 5, "Moments"); it goes through `Lesson.stop`, so bad params are snapped and bad views dropped |
| `reveal.text` | one paragraph: why the state answers the question |
| `sample` | `true` while the record is written for the prototype |

**The question must not be answered by the piece's own explanation or
preset notes.** (Times-table's "n = 101, wait for k = 51" preset already
answers "when does the cardioid come back", so the first question asks
something else: when are all the chords parallel?)

Where it shows: a small card in that piece's caption ("This week's
question"), and a block at the top of its Explanation tab with **Answer with
this moment** (captures the slide's state and your sentence, at most 280
characters), **Your answer** (with Show my moment, Send to the editors and
Delete), and the reveal behind **Show the reveal**.

Answers are kept in this browser only (`loci:question:<id>` =
`{st, url, text, at}`). **Send to the editors** opens a new issue on
`github.com/loci-viz/registry` with the question, the sentence and the state
link filled in; nothing is filed until the viewer presses Submit there, and
nothing is public from Loci. Credit, if any, is a quoted response in a later
post, chosen for clarity.

Not built: a weekly cadence, an archive, reveal dates, credited picks. Before
a second question ships, the editors name who writes it (the piece's author
is the natural person to ask).

## Questions on a moment

A "Questions" section at the bottom of every piece's Explanation tab. A
question is pinned to the **state** it was asked about, so "why does it jump
here?" carries *here*.

The prototype's section is read-only. `SAMPLE_QUESTIONS` in `questions.js`
maps a piece id to a list of `{state, q, a}`: `state` is a lesson stop
without a note (`{p, t, view?}`, through `Lesson.stop`), `q` the question and
`a` the author's answer. elliptic-group-law has three and riemann-sums two.
They are **samples written for the prototype, not by the pieces' authors**,
and the page labels each one "sample". **Show me** puts the slide behind the
panel at the question's state (params, *t* and view) and pauses it.

**Ask about this moment** is a text box. Clicking into it attaches the
moment the slide is at (shown as "Attach this moment: …"), and **Ask on
GitHub** opens a new issue on the piece's own repository with the question
and the state link filled in. The draft (`loci:ask:<piece id>` =
`{text, st, url}`) stays in this browser. Nothing is stored or shown as if it
were a public thread.

A sample answer must be mathematically right at its state and must be the
kind of thing a student asks at that frame. Folding an answer into the
explanation or a preset is a resubmission (review-pipeline.md).

Not built: a thread backend (GitHub Discussions per piece repo is the plan,
PLAN.md), author answering, "fold into explanation", a rail count,
moderation, and thumbnails of the anchored frames. Thumbnails were cut
because `renderThumb` draws with the piece's current params and no view.
