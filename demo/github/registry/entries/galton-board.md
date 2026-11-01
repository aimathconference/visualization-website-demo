## The Galton board

A ball falls through $n$ rows of pegs. At each peg it goes right with probability $\tfrac12$ and left with
probability $\tfrac12$, independently. After $n$ rows it lands in bin $k$, where $k$ is the number of rightward
bounces.

## What you're seeing

600 balls are released at a steady rate over the first 45 seconds of the minute-long loop; then the full
histogram holds until the board empties and starts again. Every bounce comes from a seeded random number
generator, so every loop, and every shared link, shows the same balls taking the same paths. Change the seed to
see another run. The blue bars are the bins. The yellow curve is the normal density with the mean and variance
the bars should approach, scaled to the number of balls that have landed so far.

## The mathematics

The bin of a ball is a sum of $n$ independent Bernoulli$(\tfrac12)$ variables, so

$$P(k) = \binom{n}{k} 2^{-n}, \qquad \text{mean } \frac n2, \qquad \text{variance } \frac n4.$$

The de Moivre–Laplace theorem says that for large $n$

$$P(k) \approx \frac{1}{\sqrt{2\pi\sigma^2}} \exp\!\left(-\frac{(k - n/2)^2}{2\sigma^2}\right), \qquad \sigma^2 = \frac n4.$$

This is the first and most concrete case of the central limit theorem: sums of many small independent pieces
look Gaussian, whatever the details of a single piece. The width grows like $\sqrt n$, not like $n$, which is
why a deep board does not spread out as fast as the number of rows suggests.

## Try this

- Look at [the first 60 balls](#preset:early): the histogram is ragged. The relative noise in a bin shrinks like
  $1/\sqrt{\text{count}}$, so it takes a few hundred balls before the bars hug the curve.
- With [16 rows](#preset:sixteen) the tallest bin should hold $\binom{16}{8}/2^{16} \approx 19.6\%$ of the
  balls, about 118 of 600. Compare it with [another seed](#preset:another-seed).
- Drop to [4 rows](#preset:pascal). The histogram follows the row $1, 4, 6, 4, 1$ of Pascal's triangle, and the
  Gaussian is a poor fit. How many rows before the curve looks right?
- Scrub back to [t = 20](#t:20), with about 250 balls down, and watch the bars fill in toward the curve.

Reference: W. Feller, *An Introduction to Probability Theory and Its Applications*, vol. 1, chapter VII; F.
Galton, *Natural Inheritance* (1889); see also [Galton board](https://en.wikipedia.org/wiki/Galton_board) and
the [de Moivre–Laplace theorem](https://en.wikipedia.org/wiki/De_Moivre%E2%80%93Laplace_theorem) on Wikipedia.
