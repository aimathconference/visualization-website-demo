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
| `by` | who wrote it (the editors, or the piece's author on request) |
| `q` | the question, one or two sentences, at most 200 characters |
| `how` | how to answer on this piece: which knob, how to scrub, what to send |
| `reveal.state` | `{p, t, view?}`, a lesson stop without a note (module-api.md section 5, "Lessons"); it goes through `Lesson.stop`, so bad params are snapped and bad views dropped |
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
