# Wanted: challenges and the monthly bounty

The Wanted page is a public list of pictures people have asked for and
cannot make themselves: "please visualize X". Any author can answer any
request in any month. Once a month the editors pick one request as the
month's challenge. A future version may add a judged prize for that
challenge; this document describes how that would work. The prototype has
none of the judging.

The list is the part that matters. It should still be useful in a month when
nothing is picked and nobody enters.

## What a challenge is

| field | rule |
|---|---|
| `id` | lowercase letters, digits and dashes; never reused |
| title | at most 80 characters; names the picture, not just the subject |
| description | one paragraph, at most 600 characters, saying **what should be visible** and what the knob is. "The Hopf fibration" is a topic, not a challenge; "any two fibres link exactly once" is a challenge |
| reference | required: a citation (author, title, section) or a URL where the mathematics can be checked. It is the same rule as for explanations |
| tags | one to three, from the tag vocabulary |
| proposer | the handle of the person who asked |
| status | `open`, `month` (this month's challenge; exactly one at a time) or `answered` (with a link to the piece) |

A piece answers a challenge by adding `"bounty": "<challenge id>"` to its
`loci.json` (module-api.md section 2). The field is metadata only: the piece
goes through the automated gate and community review like any other, and its
Explanation tab shows an "Answers: …" line.

## Posting

Anyone may propose a challenge. In production a proposal is a GitHub issue
on the registry (`loci-viz/registry`, PLAN.md) using a "Challenge" issue
template with the fields above; the editors label it `challenge` once it has
a reference and a visible claim, and it then appears on the Wanted page.
Editors close proposals that are a bare topic, have no checkable reference,
or ask for more than one idea; the closing comment says which.

In the prototype, the form on the Wanted page saves a proposal in the
browser (`loci:bounty-proposals` in localStorage) and lists it under "Your
proposals", apart from the samples. Its "Send to the editors" button opens
GitHub's new-issue form on the registry with the text filled in, and an
email link carries the same text to a placeholder address. Nothing is sent
until the person presses Submit on GitHub or sends the email themselves.

## Voting

Approval voting with at most **three active votes per person**, so a vote
means "of everything here, I want this". A vote can be taken back at any
time and spent elsewhere. Production needs accounts (PLAN.md) for votes to
mean anything; until the shortlist is cut on the 25th, totals are not shown
publicly, to blunt bandwagons.

The prototype stores votes in the browser (`loci:bounty-votes`) and shows
only "Your votes: n/3". There are no other voters, so it shows no totals.

## Picking (on the 25th)

1. The five most-voted open challenges that meet the feasibility bar become
   the shortlist. The bar: it fits the module API (including GPU and
   targets), it has a reference, and it is one idea.
2. The editors pick one of the five as next month's challenge and write two
   sentences on why. Picking among the top five, not taking the top one,
   keeps a campaign from deciding it and lets the editors rotate areas (no
   three geometry months in a row).
3. The challenge runs from the 1st to the last day of the month. It is
   announced in a blog post and in the "Best of the month" newsletter.

## Judging (first week of the next month)

- **Eligible:** pieces with the challenge's `bounty` id that reached
  Community reviewed by the 5th, so two reviewers have already confirmed
  the mathematics. At most the ten earliest are considered.
- **Jury:** three people: one editor and two reviewers from the challenge's
  tags, none of them entrants.
- **Blind to likes.** Jurors judge from the piece and its explanation, never
  from like, save or watch counts.
- **Rubric** (out of 10):
  - Does it show what was asked? (0–3)
  - One idea, one knob. (0–3)
  - Does it survive the phone? (0–2)
  - Is the explanation checkable and clear? (0–2)
- The proposer writes a short note that does not count toward the score.
  Ties go to the earlier submission.
- If no entry is good enough, the month is announced as "no winner; the
  challenge stays open" rather than awarded to a weak entry. A challenge
  may be re-opened in a later month under a suffixed id (`riemann-order-b`).

## The winner

- A two-sentence citation from the jury, signed, in the same format as the
  monthly distinctions (distinctions.md), shown in the piece's Explanation
  tab.
- One week pinned first in the feed.
- The challenge page keeps every entry, so it becomes the list of answers
  to "how do people draw this".

## Prizes

To be decided. Keep them small and non-cash first: a printed poster of the
winning frame, a book from the reference list, a named mention in the
newsletter. Cash only with a sponsor. **Before any cash or prize of value is
offered, the contest rules must be written up and checked for legality** in
the countries entrants come from: a judged contest of skill is often treated
differently from a lottery, but the rules vary (this is not legal advice).
The citation and the pin are the real reward.

## What the prototype shows, and what it does not

Shown: the Wanted page (reached from Browse and from the Submit page, not a
top tab), six sample challenges marked "sample" (one is this month's
challenge, with "Entries so far: none"; one is answered by
`riemann-sums`, whose manifest has `"bounty": "riemann-order"`), the vote
button with its cap, the propose form and the prefilled GitHub link.

Not shown: any jury, rubric, score, prize, shortlist, winner mark,
honorable mention, feed pin or public vote count. No real piece has won
anything, and a mark saying otherwise would be a fabricated award.

The checks look at the `bounty` field: "Answers a request (bounty)" passes
when the id is an open request (or this month's challenge) on the Wanted
page, fails when it is not a request at all, and warns when the request is
already answered by another piece, or when the Wanted list is not loaded
(the gate gets it from the page, so it still runs on its own). Each open
request has **Make this**, which opens the remix editor on a starting piece
with `"bounty"` set in its loci.json.
