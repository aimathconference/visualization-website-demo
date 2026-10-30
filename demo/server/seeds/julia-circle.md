## Julia sets of z² + c

For a complex parameter *c*, iterate *f_c(z) = z² + c*. The **filled Julia set** *K_c* is the set of starting points whose orbit stays bounded. Its boundary *J_c* is the **Julia set**, where the dynamics is chaotic.

### What you're seeing
The parameter travels around the circle |*c*| = 0.7885. Each pixel is colored by a smoothed escape time

    μ = n + 1 − log₂ log |zₙ|

and points that never escape within the iteration limit are left in the interior tint.

### Connected, or dust
Fatou and Julia showed that *J_c* is connected exactly when the critical orbit 0, *c*, *c*² + *c*, … stays bounded, which is the definition of *c* lying in the **Mandelbrot set** *M*. Otherwise *J_c* is a Cantor set. This circle crosses the boundary of *M* several times, so you see the set break apart and reconnect. The label in the corner tells you which side you're on.

### Try this
- Raise the iteration limit to resolve thin filaments when *c* is near the boundary of *M*.
- Notice the 180° symmetry. Since *f_c(−z) = f_c(z)*, the set satisfies *K_c* = −*K_c*.

### Research connections
Whether *M* is locally connected (the MLC conjecture) is still open. Douady and Hubbard showed that MLC would imply that hyperbolic parameters are dense in the quadratic family.
