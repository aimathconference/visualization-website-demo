## The logistic map

$$x_{n+1} = r\,x_n(1 - x_n), \qquad 0 \le x \le 1, \quad 0 \le r \le 4.$$

Robert May used this one-line model of a population with limited resources to show that very simple rules can
behave unpredictably.

## What you're seeing

**Top.** For each $r$ from $2.5$ to $4$, start at $x = 0.5$, discard 300 iterates, and plot the next 400. Brighter
pixels are visited more often. The vertical line marks the $r$ you chose; small ticks on the lower edge mark
$r = 3$, the onset of chaos and the period-3 window.

**Bottom.** A cobweb diagram. From the point $(x, x)$ on the diagonal go vertically to the parabola, which gives
$f(x)$, then horizontally back to the diagonal. Each corner on the diagonal is one iterate, four of them per
second, up to 60. The path starts from $x_0 = 0.2$ at the beginning of the sixteen-second loop; pause
[at t = 2](#t:2) to see only the first eight.

## Period doubling

For $1 < r < 3$ the fixed point $x^\star = 1 - 1/r$ attracts, because $|f'(x^\star)| = |2 - r| < 1$. At $r = 3$
the slope reaches $-1$ and a 2-cycle takes over; further splits happen at $r = 1 + \sqrt{6} \approx 3.4495$,
$3.5441$, $3.5644$, … and pile up at $r_\infty \approx 3.5699$. The gaps between splits shrink by the Feigenbaum
constant $\delta \approx 4.6692$, and the same $\delta$ appears in every smooth one-hump map.

## Why it works

1. For $r < 3$ the fixed point attracts: $f'(x^\star) = 2 - r$, and $|2 - r| < 1$, so each iterate shrinks the
   distance to $x^\star$ by about that factor. The slope is negative, so the cobweb spirals in, landing on
   alternate sides of $x^\star$. [See it at r = 2.8, after 60 iterates](#preset:r-2-80).
2. At $r = 3$ the slope is exactly $-1$ and the linear term no longer contracts. The orbit still converges, but
   only through the higher-order terms, so slowly that after 60 iterates the spiral is still open.
   [See it at r = 3](#preset:r-3-00).
3. Past 3, $x^\star$ repels. Look at $f \circ f$ instead: its slope at $x^\star$ is $f'(x^\star)^2$, which passes
   1, and two new fixed points of $f \circ f$ split off on either side, a pair $p, q$ with $f(p) = q$ and
   $f(q) = p$. That pair is the 2-cycle the cobweb settles onto: [r = 3.2](#preset:r-3-20).
4. The 2-cycle attracts while $|f'(p) f'(q)| < 1$, the slope of $f \circ f$ at $p$. The product reaches $-1$ at
   $r = 1 + \sqrt{6}$, and the argument of step 3, applied to $f \circ f$, gives a 4-cycle:
   [see it at r = 3.5](#preset:r-3-50).
5. The same step repeats for each composite, which is why the splits come one after another. Why their gaps
   shrink by the same $\delta$ in every one-hump map is the deep part (Feigenbaum's renormalization, proved by
   Lanford in 1982), and nothing in this picture shows it.

## Order inside chaos

Past $r_\infty$ the picture is mostly chaotic, but not entirely. At $r = 1 + \sqrt{8} \approx 3.8284$ a stable
3-cycle appears; the piece opens just inside that window, at $r = 3.83$. By the Li–Yorke theorem and
Sharkovskii's ordering, a period-3 orbit forces orbits of every other period.

## Try this

- [Set r = 3.2](#preset:r-3-20). The cobweb settles onto a rectangle: a 2-cycle.
- [Set r = 3.5](#preset:r-3-50). Past $1 + \sqrt{6}$ the 2-cycle has doubled: the cobweb visits four corners
  before it repeats.
- [Set r = 4](#preset:r-4). With $x = \sin^2(\pi\theta)$ the map becomes $\theta \mapsto 2\theta \bmod 1$, so the
  dynamics is as random-looking as coin flips.
- [Sit just left of 3.8284](#preset:r-3-82) and watch the orbit idle near a 3-cycle, then burst away. That is
  intermittency.

References: R. May, Simple mathematical models with very complicated dynamics, *Nature* 261 (1976). S. Strogatz,
*Nonlinear Dynamics and Chaos*, chapter 10. O. Lanford, A computer-assisted proof of the Feigenbaum conjectures,
*Bull. AMS* 6 (1982). See also [Logistic map](https://en.wikipedia.org/wiki/Logistic_map) on Wikipedia.
