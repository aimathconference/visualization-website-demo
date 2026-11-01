## Lissajous figures

Two simple harmonic oscillators at right angles, one driving $x$ and one driving $y$:

$$x(u) = \sin(a u + \delta), \qquad y(u) = \sin(b u), \qquad a = 3.$$

The point $(x, y)$ traces a **Lissajous figure**. Jules Antoine Lissajous made them in 1857 by bouncing light off
mirrors on two tuning forks; today an oscilloscope in X–Y mode draws them from two signals.

## What you're seeing

The faint curve is the whole figure. The bright point moves along it with a fading tail, and the two small dots on
the edges are the two oscillators on their own: one sliding left and right along the bottom, one up and down along
the left side. With the inscribed square on, the dots on the square mark where the curve touches it. The label at
the bottom says after how many turns of $u$ the curve closes, and the ratio it closes with.

## Why the ratio matters

- If $a : b$ is rational, say $p : q$ in lowest terms, the curve closes after one common period and touches the
  left and right sides $p$ times and the top and bottom $q$ times. Counting the touch points reads the frequency
  ratio off the picture.
- If the ratio is irrational the curve never closes and fills the square densely. Here $b$ moves in steps of
  $0.05$, so every figure closes eventually, but a ratio like $3 : 3.05$ takes $20$ turns.

## One oscillator

With $b = a$, the curve is $(\sin(a u + \delta), \sin(a u))$: an ellipse, and a circle when $\delta = 90°$. That is
the phase portrait of a single harmonic oscillator, position against velocity, since the velocity of $\sin$ is a
quarter period ahead of it.

## Try this

- Start with [3 : 2, the classic figure](#preset:classic): three lobes across, two up and down. The curve touches
  the left and right sides three times and the top and bottom twice.
- Then sweep the phase $\delta$ with $b = 2$. The figure seems to rotate in three dimensions: changing the phase is
  the same as turning a curve drawn on a cylinder.
- [b = a, one oscillator](#preset:one-oscillator): equal frequencies with a quarter-period phase give a circle, the
  phase portrait of a single harmonic oscillator.
- [Collapse to a curve](#preset:collapse): with $b = 1$ and $\delta = 0$ the curve traces $x = \sin 3u$ against
  $y = \sin u$, so it collapses onto the graph $x = 3y - 4y^3$, traced back and forth, because
  $\sin 3u = 3 \sin u - 4 \sin^3 u$. That is $-T_3(y)$, a Chebyshev polynomial up to sign.
- [Nearly 3 : 3](#preset:detuned): a slightly detuned ratio. The circle slowly shears through ellipses, and the
  curve only closes after $20$ turns. Watch the tracer [at t = 30](#t:30) and [at t = 90](#t:90): it is on different
  lobes of the same closed curve.

## Built in WebAssembly

The drawing is computed in C with no standard library, compiled with `clang --target=wasm32`; the source and the
build command are in the registry next to the piece. Each frame the module returns a list of drawing commands, and
the JavaScript half replays them on the canvas, so lines stay sharp at any pixel ratio and labels use the site's
font. The tracer's speed is rounded so that it goes round the closed curve a whole number of times per two-minute
loop, which is why the loop has no seam.

Reference: J. A. Lissajous, Mémoire sur l'étude optique des mouvements vibratoires, *Annales de Chimie et de
Physique* (3) 51 (1857), 147–231; see also [Lissajous curve](https://en.wikipedia.org/wiki/Lissajous_curve) on
Wikipedia.
