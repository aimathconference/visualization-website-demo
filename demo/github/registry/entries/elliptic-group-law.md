## The chord-and-tangent law

An **elliptic curve** over $\mathbb{R}$ is the set of solutions of a Weierstrass equation

$$y^2 = x^3 + ax + b, \qquad 4a^3 + 27b^2 \neq 0,$$

together with a point at infinity $\mathcal{O}$. Here $a = -1$ and you control $b$.

## What you're seeing

Draw the line through **P** and **Q**. By Bézout's theorem a line meets a cubic in three points counted with
multiplicity, so it hits the curve once more, at **P∗Q** (the hollow dot). Reflect that point across the
$x$-axis, along the dashed line, to get **P + Q** (the orange dot).

With $\mathcal{O}$ as the identity and reflection as negation, this rule makes the curve an **abelian group**.
Commutativity is obvious: the line through P and Q does not care which you name first. Associativity is the hard
part; one classical proof uses the Cayley–Bacharach theorem for cubics through eight points.

While the piece plays, P slides out along the unbounded branch and back once every fourteen seconds, and Q sits
still below the axis. The readout at the top gives the equation and its discriminant
$\Delta = -16(4a^3 + 27b^2)$; the one at the bottom gives the coordinates of the sum.

## The formulas

For $P \neq \pm Q$, write $P = (x_P, y_P)$, $Q = (x_Q, y_Q)$ and $P + Q = (x_3, y_3)$. With the slope
$\lambda = (y_Q - y_P)/(x_Q - x_P)$ of the chord,

$$
\begin{aligned}
x_3 &= \lambda^2 - x_P - x_Q, \\
y_3 &= \lambda\,(x_P - x_3) - y_P.
\end{aligned}
$$

When $P = Q$ the chord becomes the tangent, and its slope is $\lambda = (3x_P^2 + a)/(2y_P)$, found by
differentiating the equation implicitly. When $x_P = x_Q$ but $P \neq Q$, the line is vertical, its third point
is $\mathcal{O}$, and $P + Q = \mathcal{O}$: so $Q = -P$.

## Try this

- In interact mode, drag **P** or **Q** along the curve. The pointer's $x$ snaps onto the curve, and dragging
  above or below the axis picks the branch. Grabbing P stops its sliding; the panel's two sliders move the
  $x$-coordinates of P and Q too. A share link keeps the points where you left them.
- [Split the curve](#preset:split): below $b = 2/(3\sqrt{3}) \approx 0.385$ the real curve has two components,
  an oval and an unbounded branch. The unbounded one is the identity component, and a subgroup.
- [Put P on the oval](#preset:oval): with P on the oval and Q on the unbounded branch, P + Q lands back on the
  oval. The oval is a coset of the identity component.
- [Let P equal Q](#preset:double): the chord becomes the tangent at P and the readout shows 2P.
- Watch [at t = 7](#t:7), when P is furthest out, and then as P passes back over Q's $x$-coordinate: the line
  turns vertical, and P + Q runs off to $\mathcal{O}$.
- [Let P slide again](#preset:slide) to put P back on its animation and Q back in its place.

## Where it leads

Over a finite field $\mathbb{F}_p$ the same formulas give elliptic-curve cryptography. Over $\mathbb{Q}$, the
Mordell–Weil theorem says $E(\mathbb{Q})$ is finitely generated, and the Birch and Swinnerton-Dyer conjecture
predicts its rank from an $L$-function.

Reference: J. H. Silverman and J. Tate, *Rational Points on Elliptic Curves*, chapter 1; see also
[Elliptic curve](https://en.wikipedia.org/wiki/Elliptic_curve) on Wikipedia.
