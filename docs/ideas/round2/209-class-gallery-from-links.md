# 209 · New: "Find a moment" assignments and a gallery of the class's answers, with no server

## Pitch
A teacher ends a lesson with a **"Your turn" stop**: a prompt, with no state ("At k = 4, find an n where the picture is exactly 3-fold symmetric"). A student explores, writes one sentence and presses **Copy my answer**, which gives a link with their moment and sentence. They paste it into the LMS, a form or an email. The teacher pastes the column of links into **Gallery** (`#gallery`) and sees every answer as a thumbnail at its exact state, grouped by params. Selected answers become next lecture's list (201).

## Why mathematicians would care
"Find a parameter where X happens" is the exercise these pictures are best at. Thirty answers side by side show the structure: here, rotation by m is a symmetry iff (k − 1)m ≡ 0 mod n, so exactly the answers with 3 | n line up. No single picture shows that. It needs no accounts, server or moderation: everything moves through the class's own channels.

## What exists today
- The question of the week's "Answer with this moment" captures `{p, t, view}` plus a sentence (questions.js).
- `Lesson.capture`, `shareURL`, `readLink`; `renderThumb` and `paintThumbs` for grids (`renderThumb` ignores `view`; fix that here).

## Design (smallest real version)
1. **Format.** A stop `{ask: "<prompt>"}` with no `p`/`t`. The player shows the prompt and a sentence box. "Copy my answer" produces `?v=…&p=<state>&a=<base64url sentence ≤ 280>`, and a copy is kept under Yours (202).
2. **Gallery.** A textarea takes links, one per line or as a CSV column. Each line goes through `readLink`, and bad lines are listed with reasons. A lazy thumbnail grid shows each sentence under its thumbnail, with **Group by** (each param, or "same picture" by hashing 160 px thumbnails). Identical answers collapse into one card with a count.
3. Tick answers → "Make a list" → a 201 list titled "Answers, Week 7".
4. Nothing is uploaded; the data lives in the textarea and the URL hash. The page says so.

## Risks
- Rendering 120 thumbnails is slow, so render lazily with an IntersectionObserver and cap at 200.
- Names: links carry none, and the LMS knows who sent what. That's the right place for it.
- Skeptic: "Google Forms does this." Forms neither renders a live picture per answer nor groups answers by state, and that grouping is the mathematical content.

## Effort
M (2 days).

## How to verify
1. Make a times-table lesson with that "your turn" stop.
2. Paste 30 generated answers (half with 3 | n, some without, two malformed): the grouping is right and the malformed lines are reported.
3. Select 4 → Make a list → it plays.
4. Pilot with one class section: count the returned links, and ask the instructor whether the grid changed the next lecture.
