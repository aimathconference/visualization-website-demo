## Julia sets of $z^2 + c$

For a complex parameter $c$, iterate $f_c(z) = z^2 + c$. The **filled Julia set** $K_c$ is the set of starting
points whose orbit stays bounded. Its boundary $J_c$ is the **Julia set**, where the dynamics is chaotic: points
on either side of it have completely different fates, and arbitrarily close to any point of $J_c$ there are
points whose orbits escape.

## What you're seeing

The parameter travels once around the circle $|c| = 0.7885$ every 52 seconds, and the readout gives its
current value. Each pixel is a starting point $z_0$ in the square of side about $3$ around the origin, colored
by a smoothed escape time

$$\mu = n + 1 - \log_2 \log |z_n|,$$

where $n$ is the first step at which $|z_n|$ passes $4$. The smoothing removes the bands that the integer $n$
alone would give. Points that never escape within the iteration limit are left in the dark interior tint.

## Connected, or dust

Fatou and Julia showed that $J_c$ is connected exactly when the critical orbit $0, c, c^2 + c, \dots$ stays
bounded, which is the definition of $c$ lying in the **Mandelbrot set** $M$. Otherwise $J_c$ is a Cantor set:
totally disconnected dust. This circle crosses the boundary of $M$ several times, so you see the set break apart
and reconnect. The label at the bottom tells you which side you're on, judged by iterating the critical orbit
up to the same iteration limit.

## Try this

- Jump to [$c = -0.7885$](#preset:connected). Here $|c + 1| < 1/4$, so $c$ is in the period-2 bulb of the
  Mandelbrot set: the critical orbit settles onto an attracting cycle of period two, stays bounded, and $J_c$
  is connected.
- Jump to [$c = 0.7885$](#preset:dust). On the real axis past $c = 1/4$ the critical orbit escapes, so $c$ is
  outside the Mandelbrot set and $J_c$ is a Cantor set.
- Compare the same parameter near the edge of $M$ with [70 iterations](#preset:edge-70) and with
  [200 iterations](#preset:edge-200). With the lower limit the critical orbit has not escaped yet and the label
  says $c \in M$; with the higher one it has, and thin filaments resolve into dust. Raising the limit is what
  you need whenever $c$ is near the boundary of $M$.
- Notice the 180° symmetry at any moment, for example [at t = 30](#t:30). Since $f_c(-z) = f_c(z)$, the set
  satisfies $K_c = -K_c$.

## Research connections

Whether $M$ is locally connected (the MLC conjecture) is still open. Douady and Hubbard showed that MLC would
imply that hyperbolic parameters are dense in the quadratic family, which in turn would mean that almost every
quadratic map is, in a precise sense, as tame as possible.

Reference: J. Milnor, *Dynamics in One Complex Variable*, 3rd ed., Princeton University Press, 2006; see also
[Julia set](https://en.wikipedia.org/wiki/Julia_set) on Wikipedia.
