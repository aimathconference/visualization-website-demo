## Riemann sums and their errors

Take *f(x) = 1.2 + sin(1.5x) + x/4* on [0, 5]. Split the interval into *n* pieces of width Δ*x* = 5/*n*, pick a sample point *x*ᵢ* in each, and add up *f(x*ᵢ*)Δx*. The exact value is

*∫₀⁵ f(x) dx = 6 + (1 − cos 7.5)/1.5 + 25/8 ≈ 9.5606*.

### What you're seeing
The number of rectangles cycles through 2, 3, 4, …, 64. The readout shows the sum, the exact integral, and the signed error. The inset in the corner plots |error| against *n* on log–log axes, so a power law shows up as a straight line.

### Rate of convergence
- **Left and right rules** have error about ∓(*f(b) − f(a)*)Δ*x*/2, which is *O*(1/*n*). The inset line has slope −1.
- **Midpoint rule** has error about (*f′(b) − f′(a)*)Δ*x*²/24, which is *O*(1/*n*²). The slope is −2.

### Try this
- Switch between left and right. The errors have opposite signs, and their average is the trapezoid rule.
- Switch to midpoint and compare the inset's slope with the left rule's.

### In the classroom
Students see the definition of the integral and a first lesson in numerical analysis on the same screen: the limit exists, and how fast you get there depends on where you sample.
