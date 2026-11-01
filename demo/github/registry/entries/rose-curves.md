## Rose curves

A **rose** is the polar curve $r = \cos(k\theta)$. For a whole number $k$ it closes up into evenly spaced petals,
and how many petals there are depends on whether $k$ is odd or even: $k$ petals when $k$ is odd, $2k$ when it is
even.

## What you're seeing

The orange curve is traced as $\theta$ runs from $0$ until the curve closes, over six seconds, and then erased
over the next six. The green segment is the radius to the tracing point, so you can watch $r$ shrink to zero
between petals and turn negative. The faint circle is $r = 1$, which every petal touches at its tip. The label
names the curve and counts its petals.

When $r$ is negative, the point $(r, \theta)$ lies on the opposite side of the origin, at angle $\theta + \pi$.
That is the whole reason odd and even differ. Replacing $\theta$ with $\theta + \pi$ gives

$$\cos(k\theta + k\pi) = (-1)^k \cos(k\theta).$$

- **Odd $k$:** $r(\theta + \pi) = -r(\theta)$, so the second half-turn lands exactly on the points of the first.
  The curve closes after $\theta = \pi$ with $k$ petals.
- **Even $k$:** $r(\theta + \pi) = r(\theta)$, so the second half-turn draws the first half's petals on the
  opposite side. It takes the full turn to close, with $2k$ petals.

## Try this

- Jump to [eight petals](#preset:eight): $k = 4$ is even, so the tracing needs the full turn of $\theta$ and
  finds eight petals.
- Stop the tracing [at t = 6](#t:6), the moment the curve is complete, and count the petals against the label.
- In interact mode, move $k$ from $1$ to $12$ with the panel and predict each petal count before the curve
  finishes. Notice that $k = 2$ gives more petals than $k = 3$.

A first polar graph with a surprise in it: students can guess the rule from the picture, then prove it with the
one line of trigonometry above.

Reference: J. D. Lawrence, *A Catalog of Special Plane Curves*, Dover, 1972; see also
[Rose (mathematics)](https://en.wikipedia.org/wiki/Rose_(mathematics)) on Wikipedia.
