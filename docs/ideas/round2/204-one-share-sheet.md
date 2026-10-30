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
