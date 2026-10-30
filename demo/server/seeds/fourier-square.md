## Building a square wave from circles

The square wave *sq(θ) = sign(sin θ)* has the Fourier series

    sq(θ) = (4/π) Σ sin((2k − 1)θ) / (2k − 1),   k = 1, 2, 3, …

Each term is a rotating vector, an **epicycle**, of radius 4/((2*k* − 1)π) spinning at frequency 2*k* − 1. Chain *N* of them tip to tail. The height of the last tip, plotted against time, is the partial sum *S_N(θ)*, drawn to the right. The dashed line is the square wave itself.

### Gibbs phenomenon
The partial sums converge to *sq* in *L²* and at every point (to 0 at the jumps), but not uniformly. Near each jump, *S_N* overshoots to about 1.179, roughly 9% of the jump height. As *N* grows the overshoot moves closer to the jump, but its height never shrinks.

### Try this
- Set *N* = 1. One circle gives a pure sine.
- Set *N* = 40 and watch the ripples squeeze toward the jump while their peak stays put.

### In the classroom
Orthogonal decomposition, the difference between *L²* and uniform convergence, and why sharp corners need high frequencies, all from one animation.
