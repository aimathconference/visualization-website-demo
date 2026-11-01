## Gradient descent on Himmelblau's function

$$f(x, y) = (x^2 + y - 11)^2 + (x + y^2 - 7)^2$$

Himmelblau's function has four local minima, all with $f = 0$, at $(3, 2)$ and roughly $(-2.805, 3.131)$,
$(-3.779, -3.283)$ and $(3.584, -1.848)$. It also has one local maximum near $(-0.271, -0.923)$ and four saddle
points. The four minima are marked with small crosses.

## What you're seeing

Twelve walkers start on a circle of radius $4.6$ and follow heavy-ball (momentum) descent,

$$v \leftarrow \beta v - \eta \nabla f(p), \qquad p \leftarrow p + v,$$

with $\beta = 0.85$, forty-five steps a second, for at most 360 steps. Where the gradient is very steep it is
capped at length $60$, so a walker that starts on a cliff does not fly off the map. The contours are drawn at
evenly spaced levels of $\log(1 + f)$, so the shading is darkest in the four valleys.

The loop holds four runs of ten seconds each. Each run starts from the same circle turned a little further
($0.37$ radians per run), so the walkers start at new places and some of them end in different valleys.

Which valley a walker ends in depends on where it starts. For plain gradient flow, $\dot p = -\nabla f(p)$, the
boundaries between the basins of the four minima are the stable manifolds of the saddle points: a walker that
starts exactly on one creeps toward the saddle and stays. Momentum lets a walker coast across these boundaries,
so with heavy-ball descent the basins are no longer the ones the contour map suggests.

The trails also show the geometry of the gradient. $\nabla f$ is orthogonal to the level sets of $f$, so a walker
moving slowly, with little momentum, crosses every contour at a right angle. With more momentum the walker keeps
part of its old direction and the trail cuts the contours at a slant, or overshoots the valley floor and swings
back.

## Try this

- [Overshoot](#preset:overshoot): raise $\eta$ to $0.010$. Momentum turns into overshoot, and walkers ricochet
  between valleys before settling, or never settle.
- [Steepest descent](#preset:steepest): lower $\eta$ to $0.001$. Paths hug the curves of steepest descent, which
  cross every contour at a right angle.
- Compare the runs: pause [at t = 9](#t:9) and [at t = 19](#t:19), the ends of the first two runs, and count how
  many walkers each valley caught.
- Look for a walker that passes close to a saddle, between two valleys, and slows down there before choosing a
  side.

## In the classroom

A concrete picture of $\nabla f$ being orthogonal to level sets, and of why "the minimum" is the wrong phrase for
a nonconvex function: here there are four, all equally deep, and which one you find depends on where you start
and how you walk.

References: D. M. Himmelblau, *Applied Nonlinear Programming*, McGraw-Hill, 1972. For momentum: B. T. Polyak,
Some methods of speeding up the convergence of iteration methods, *USSR Computational Mathematics and
Mathematical Physics* 4 (1964), no. 5, 1–17. See also
[Himmelblau's function](https://en.wikipedia.org/wiki/Himmelblau%27s_function) on Wikipedia.
