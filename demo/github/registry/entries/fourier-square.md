## Building a square wave from circles

The square wave $\operatorname{sq}(\theta) = \operatorname{sign}(\sin\theta)$ has the Fourier series

$$\operatorname{sq}(\theta) = \frac{4}{\pi} \sum_{k=1}^{\infty} \frac{\sin\big((2k - 1)\theta\big)}{2k - 1}.$$

Only odd harmonics appear, because the square wave is odd and has the half-wave symmetry
$\operatorname{sq}(\theta + \pi) = -\operatorname{sq}(\theta)$.

## What you're seeing

Each term is a rotating vector, an **epicycle**, of radius $4/((2k - 1)\pi)$ spinning at frequency $2k - 1$.
The chain on the left puts $N$ of them tip to tail. The height of the last tip, plotted against time, is the
partial sum

$$S_N(\theta) = \frac{4}{\pi} \sum_{k=1}^{N} \frac{\sin\big((2k - 1)\theta\big)}{2k - 1},$$

drawn to the right. The dashed line is the square wave itself. The newest point of the trace is its left end,
joined to the tip by the dotted line. The angle runs at $\theta = 2\pi t / 6$, one turn every six seconds and
five turns per loop, so a jump of $\operatorname{sq}$ enters the trace whenever $\theta$ passes a multiple of
$\pi$, every three seconds. Pause [at t = 3.2](#t:3.2), just after $\theta$ passes $\pi$, and the jump sits
just inside the left end of the trace.

## Gibbs phenomenon

The partial sums converge to $\operatorname{sq}$ in $L^2$ and at every point (to $0$ at the jumps), but not
uniformly. Near each jump, $S_N$ overshoots to about

$$\frac{2}{\pi} \int_0^{\pi} \frac{\sin x}{x}\, dx \approx 1.179,$$

roughly 9% of the jump height of $2$. As $N$ grows the overshoot moves closer to the jump, but its height
never shrinks. The label at the bottom appears once $N \ge 8$, when the overshoot is close to its limit.

## Try this

- [Set $N = 1$](#preset:n-1). One circle gives a pure sine, the best single-frequency approximation to the
  square wave in $L^2$.
- [Set $N = 40$](#preset:n-40) and watch the ripples squeeze toward the jump while their peak stays at about
  $1.179$.
- Compare the same moment with [six terms](#preset:six-at-jump) and with [forty terms](#preset:forty-at-jump):
  the first ripple beside the jump is narrower at forty and just as tall.

## In the classroom

Orthogonal decomposition, the difference between $L^2$ and uniform convergence, and why sharp corners need
high frequencies, all from one animation.

Reference: E. Hewitt and R. E. Hewitt, The Gibbs–Wilbraham phenomenon: an episode in Fourier analysis,
*Archive for History of Exact Sciences* 21 (1979), 129–160; see also
[Gibbs phenomenon](https://en.wikipedia.org/wiki/Gibbs_phenomenon) on Wikipedia.
