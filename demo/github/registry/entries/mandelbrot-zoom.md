## Zooming into the Mandelbrot set

The Mandelbrot set $M$ is the set of complex numbers $c$ for which the orbit of $0$ under

$$z \mapsto z^2 + c$$

stays bounded. If $|z|$ ever exceeds $2$ the orbit escapes to infinity, so membership can be tested by iterating
and watching for that moment.

## What you're seeing

Every pixel of the box is one value of $c$, and the GPU runs the iteration for all of them at once in a fragment
shader. Points that have not escaped within the iteration budget are drawn in the background color: as far as this
picture can tell, they are in $M$. Every other point is colored by how fast it escaped, in bands mixed from violet
and gold. Over the thirty-second loop the camera zooms toward a point on the boundary of $M$ and back out, from a
width of $3.2$ down to about $3 \times 10^{-5}$ at $t = 15$, a magnification of $10^5$. The readout shows the budget,
the current zoom and the width of the view; the width turns violet near the deepest point.

## The escape-time algorithm and smooth coloring

Iterate up to $N$ times and record the first $n$ with $|z_n| > R$. Coloring by the integer $n$ gives visible bands.
With a large bailout radius (here $R = 16$) the quantity

$$\mu = n + 1 - \log_2 \ln |z_n|$$

varies continuously with $c$, because near escape $|z|$ roughly squares at every step, so the double logarithm
counts the fraction of a step left over. The colors are a function of $\mu$.

## Why the zoom stops at $10^5$

The shader computes in 32-bit floats, which carry about $7$ significant digits. Near the seahorse valley at
$c \approx -0.7436 + 0.1318i$, neighboring floats are about $6 \times 10^{-8}$ apart. At a width of
$3 \times 10^{-5}$ across a 700-pixel box, one pixel is $4 \times 10^{-8}$, already finer than the floats can tell
apart, so going deeper would show blocks, not detail. Deep-zoom renderers use double precision or perturbation
theory: one reference orbit in high precision and small float offsets from it.

## Try this

- Start on the seahorse valley at $300$ iterations and stop [at t = 15](#t:15), the deepest point of the zoom. A
  featureless background-colored blob appears: those points escape, but slowly. Then open
  [Seahorse valley at 1000 iterations](#preset:seahorse-1000): at zoom $10^{4.9}$ the slow-escaping points near the
  boundary resolve into spirals instead of a blob.
- [50 iterations, the budget shows](#preset:budget-50): too few iterations. The overview looks fine, but the zoom
  shows a blob where the boundary should be, because points that escape late are drawn as if they were in the set.
  The budget, not the set, decides the picture.
- [A Misiurewicz point](#preset:misiurewicz) and [a three-armed branch point](#preset:branch): tips and branch points
  of filaments. Near $c \approx -0.1011 + 0.9563i$ three filaments meet, and almost every pixel escapes: the set is
  very thin here.
- Compare the loop [at t = 5](#t:5) and [at t = 25](#t:25): the zoom out retraces the zoom in, so the two frames are
  the same.

This piece runs on the GPU, so it is shown on computers only.

Reference: H.-O. Peitgen and P. H. Richter, *The Beauty of Fractals*, Springer, 1986, chapters 3 and 4. A. Douady
and J. H. Hubbard, "Itération des polynômes quadratiques complexes", *C. R. Acad. Sci. Paris* 294 (1982), 123–126.
See also [Mandelbrot set](https://en.wikipedia.org/wiki/Mandelbrot_set) on Wikipedia.
