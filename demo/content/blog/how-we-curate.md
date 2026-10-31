---
title: How a visualization gets into EigenReel
date: 2026-09-30
authors: loci-editors
read: 5 min read
excerpt: An open-source license, a reviewed explanation, and a draw function that accepts a theme. Our checklist, in full.
viz: 
---

EigenReel is curated by people. Every visualization in the feed was submitted as an open-source repository, read line by line, and checked by two mathematicians before it went live. Here is the checklist we use.

### 1. An OSI-approved license
MIT, BSD, Apache-2.0 and GPL-3.0 are the common ones. If readers can't fork it, we don't host it.

### 2. A draw function that accepts a theme
Each piece exports one module. The site owns the canvas, the clock and the theme; the visualization only draws. That contract is what lets every slide be restyled from the same Customize panel.

    export default {
      id: 'times-table',
      title: 'Multiplication tables on a circle',
      tags: ['Number theory', 'Modular arithmetic'],
      license: 'MIT',
      param: { key: 'n', min: 20, max: 400, value: 200 },
      draw(ctx, w, h, t, theme, state, box) {
        // theme = { bg, fg, a1, a2, font, lw, labels, param }
      }
    };

### 3. An explanation a referee would sign
The explanation.md must say what is on screen, state the mathematics precisely, and give the reader something to try. Two reviewers check every claim. One works in the area; one teaches it.

### 4. Accessible by default
Labels can be turned off, animation speed can go to zero, and every palette is checked for contrast against its background.

### 5. Credit stays with the author
The author's handle sits on every slide, and the repository link goes to their repo, not a copy of it.
