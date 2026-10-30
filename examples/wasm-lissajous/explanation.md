## Lissajous figures

Two simple harmonic oscillators at right angles, one driving *x* and one driving *y*:

    x(u) = sin(a u + δ),   y(u) = sin(b u),   a = 3

The point (*x*, *y*) traces a **Lissajous figure**. Jules Antoine Lissajous made them in 1857 by bouncing light off mirrors on two tuning forks; today an oscilloscope in X–Y mode draws them from two signals.

### What you're seeing
The faint curve is the whole figure. The bright point moves along it, and the two small dots on the edges are the two oscillators on their own: one sliding left and right, one up and down. With the inscribed square on, the dots on the square mark where the curve touches it.

### Why the ratio matters
- If *a* : *b* is rational, say *p* : *q* in lowest terms, the curve closes after one common period and touches the left and right sides *p* times and the top and bottom *q* times. Counting the touch points reads the frequency ratio off the picture.
- If the ratio is irrational the curve never closes and fills the square densely. Here *b* moves in steps of 0.05, so every figure closes eventually, but a ratio like 3 : 3.05 takes 20 turns.

### One oscillator
With *b* = *a*, the curve is (sin(*au* + δ), sin(*au*)): an ellipse, and a circle when δ = 90°. That is the phase portrait of a single harmonic oscillator, position against velocity, since the velocity of sin is a quarter period ahead of it.

### Try this
- Set *b* = 2 and sweep δ. The figure seems to rotate in three dimensions: changing the phase is the same as turning a curve drawn on a cylinder.
- Set *b* = 1 and δ = 0. The curve collapses onto the graph *x* = 3*y* − 4*y*³, because sin 3*u* = 3 sin *u* − 4 sin³ *u*. That is −T₃(*y*), a Chebyshev polynomial up to sign.

### Built in WebAssembly
This piece is written in C with no standard library and compiled with `clang --target=wasm32`. Each frame it returns a list of drawing commands, and the site replays them on the canvas, so lines stay sharp at any pixel ratio and labels use the site's font.
