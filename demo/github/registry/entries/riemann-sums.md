## Riemann sums and their errors

Take $f(x) = 1.2 + \sin(1.5x) + x/4$ on $[0, 5]$. Split the interval into $n$ pieces of width
$\Delta x = 5/n$, pick a sample point $x_i^*$ in each, and add up $f(x_i^*)\,\Delta x$. The exact value is

$$\int_0^5 f(x)\,dx = 6 + \frac{1 - \cos 7.5}{1.5} + \frac{25}{8} \approx 9.5606.$$

## What you're seeing

The number of rectangles steps through $n = 2, 3, 4, 5, 6, 8, \dots, 48, 64$, a new value every 1.3 seconds,
once per loop. The dots mark the sample points (left end, midpoint or right end of each piece, depending on the
rule you pick); they are hidden once the rectangles get too thin to show them. The readout shows the sum, the
exact integral, and the signed error, sum minus integral. The inset in the corner plots $|\text{error}|$ against
$n$ for every $n$ in the cycle on log–log axes, so a power law shows up as a straight line, and the large dot
marks the current $n$.

## Rate of convergence

- **Left and right rules** have error about $\mp\big(f(b) - f(a)\big)\Delta x / 2$, which is $O(1/n)$. Here
  $f(5) > f(0)$, so the left sum comes out low and the right sum high. The inset line has slope $-1$.
- **Midpoint rule** has error about $-\big(f'(b) - f'(a)\big)\Delta x^2 / 24$, which is $O(1/n^2)$. The slope
  is $-2$.

Both estimates come from expanding $f$ in a Taylor series on each piece: the first-order terms cancel for the
midpoint, but not for an endpoint, and summing the leftover terms over the pieces turns into an integral of
$f'$ or $f''$.

## Try this

- Start with the [left rule](#preset:left) and watch the inset: each doubling of $n$ halves the error, slope
  $-1$.
- Switch to the [right rule](#preset:right). The error has the opposite sign to the left rule's. Compare them
  at the same coarse moment, [left with n = 4](#preset:left-coarse) and [right with n = 4](#preset:right-coarse):
  their average is the trapezoid rule, whose error is much smaller.
- Switch to the [midpoint rule](#preset:midpoint) and compare the inset's slope with the left rule's: each
  doubling of $n$ now divides the error by four.
- Pause [at t = 17](#t:17), where $n = 64$, and compare how many correct digits each rule gives.

## In the classroom

Students see the definition of the integral and a first lesson in numerical analysis on the same screen: the
limit exists, and how fast you get there depends on where you sample.

Reference: P. J. Davis and P. Rabinowitz, *Methods of Numerical Integration*, 2nd ed., Academic Press, 1984;
see also [Riemann sum](https://en.wikipedia.org/wiki/Riemann_sum) on Wikipedia.
