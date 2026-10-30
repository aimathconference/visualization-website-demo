# 204 · One Share sheet for everything that leaves the site

## Pitch
Share becomes the single place for anything outgoing, in four tabs:
- **Link:** this moment, or the playing list (201).
- **Course page:** embed snippet, static image.
- **Slides:** GIF/PNG frames, Present, and export (208).
- **Author:** propose a preset, ask about this moment.

Customize goes back to changing the picture and keeps one line: "Add this moment to a list…".

## Why mathematicians would care
The professor asks "how do I put this on my course page?" and opens Share. The embed isn't there: it is in Customize, below Reset, next to an "Embed config" JSON block. Share explains in prose that lessons are in Customize. With jobs split across two panels, every new user has to go looking.

## What exists today
- **Share:** link, Copy, Save frame, Record clip, Present, and the "Propose this moment as a preset" `<details>`.
- **Customize:** Embed config JSON, embed and static-image snippets, Your lesson, and Add to a collection.
- **Explanation:** the "Ask about this moment" draft box.
- Every Customize render spawns a poster worker for the static-image snippet (5 mounts while I added 3 stops).

## Design (smallest real version)
1. **Tabs** in the Share modal (Link · Course page · Slides · Author). The last tab used is remembered for the session.
   - **Link:** if a list is playing or a draft exists, two radios: "This moment" or "Week 7 (5 moments)". The GIF watermark and Present's QR code follow that choice.
   - **Course page:** snippets, with the still rendered when this tab opens, not on every Customize render.
   - **Author:** preset proposal plus the Ask box. The Explanation keeps the read-only sample thread and an "Ask about this moment…" button that opens this tab.
2. **Customize** drops the snippets. The config JSON moves behind "Developer" in Source.
3. **Labels** use *moment* throughout (201).

## Risks
- A taller modal on phones. Tabs keep each pane short; the clip form, the tallest, is about 600 px.
- Skeptic: "asking isn't sharing." It is outgoing, addressed to a person and anchored to a moment, like a preset proposal. One "send to the author" place matters once 207 makes the destinations real.

## Effort
S–M (1 day). The code moves; little of it changes.

## How to verify
1. From any slide, Share → Course page → Copy embed takes 3 clicks (today, 5 plus scrolling).
2. With a lesson playing, Share → Link offers the list, and the GIF watermark and QR code carry it.
3. Opening Customize logs 0 `mounted … (poster)` lines.
4. Keyboard: arrows move between tabs, Esc closes, and focus returns to Share.

## Review

**Verdict: build smaller.** Move the embed and static-image snippets into Share, and make Share's link aware of a playing lesson or list. Skip the tabs and leave Ask where it is.

**Strongest objection.** Four tabs in a modal is one more navigation layer, and moving "Ask about this moment" out of the Explanation separates the question from the text it is about. The reader who has a question is reading the explanation, not looking for a share button. The real failures are narrower:
- **Share is unaware of lessons.** It offers "Link to this view" (`index.html` line 98), and the fine print sends you to Customize.
- **Embed lives in Customize.**
- **A poster worker runs on every Customize render.**

**What to cut.**
- No tabs. Share gets one `<details>` titled "On a course page" with both snippets, rendered when it is opened, not when Customize renders. That also fixes the five `mounted … (poster)` lines.
- **Link:** when `lessonPlay` is set, or a list is playing, show two radios: "This moment" and "The lesson (3 stops)". The GIF watermark and Present's QR follow the choice. This is the part 206 needs.
- Leave "Propose this moment" in Share and Ask in the Explanation.
- Move Embed config JSON behind "Developer" in Source. That is optional and only one line.

**Must be true to keep it.**
- A professor finds the embed from Share in at most 3 clicks.
- A lesson playing when Share opens is the default link.
- Customize logs no poster mounts.

**Feasibility check.**
- The embed and static-image snippet code moves from `renderCustomize` to the Share open path (`shareSl`). The still comes from `stillFor` (`STILL = 480`, cached in `stills`).
- `Lesson.url(v, lessonPlay.lesson)` and `Collection.url` already exist for the radio.
- The watermark is drawn by `paintClipStrip(c, P, theme, link, bare)`, which already takes the link as an argument.
- No link-format change and no gate impact.

**Verification script.**
1. Any slide → Share → "On a course page" → Copy embed: 3 clicks.
2. Open the logistic lesson link → Share. "The lesson (2 stops)" is preselected, and Copy gives a `&lesson=` URL.
3. With the lesson selected, record a 1 s clip. The watermark strip carries the lesson link (or 206's readable form).
4. Open Customize and add three stops. The console has 0 `(poster)` mount lines.
