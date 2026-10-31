## Gradient descent on Himmelblau's function

*f(x, y) = (x² + y − 11)² + (x + y² − 7)²*

Himmelblau's function has four local minima, all with *f* = 0, at roughly (3, 2), (−2.805, 3.131), (−3.779, −3.283) and (3.584, −1.848). It also has one local maximum near (−0.271, −0.923) and four saddle points.

### What you're seeing
Twelve walkers start on a circle of radius 4.6 and follow heavy-ball (momentum) descent:

    v ← β·v − η·∇f(p)
    p ← p + v

with *β* = 0.85. Contours are drawn at evenly spaced levels of log(1 + *f*), so the shading is darkest in the four valleys. The run restarts every ten seconds from a slightly rotated circle.

Which valley a walker ends in depends on where it starts. For plain gradient flow, the basin boundaries are the stable manifolds of the saddle points; momentum lets a walker coast across them.

### Try this
- Raise *η* to 0.010 or more. Momentum turns into overshoot, and walkers ricochet between valleys before settling, or never settle.
- Lower *η* to 0.001. Paths hug the curves of steepest descent, which cross every contour at a right angle.

### In the classroom
A concrete picture of ∇*f* being orthogonal to level sets, and of why "the minimum" is the wrong phrase for a nonconvex function.
