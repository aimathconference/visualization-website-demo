## The Hopf fibration

The 3-sphere $S^3$ is the set of pairs $(z_1, z_2)$ of complex numbers with $|z_1|^2 + |z_2|^2 = 1$. The Hopf map
sends it to the ordinary 2-sphere:

$$h(z_1, z_2) = \left(2 z_1 \bar z_2,\ |z_1|^2 - |z_2|^2\right) \in \mathbb{C} \times \mathbb{R}.$$

Multiplying both coordinates by the same unit complex number $e^{i\alpha}$ does not change $h$, and these are the
only points with the same image. So the preimage of every point of $S^2$, its fiber, is a circle: the great circle
$\{(z_1 e^{i\alpha}, z_2 e^{i\alpha})\}$. $S^3$ is the disjoint union of these circles, one for each point of $S^2$.

## What you're seeing

The piece picks evenly spaced points around one circle of latitude on $S^2$ and draws their fibers. To show circles
in $S^3$ in ordinary space it uses stereographic projection from the point $(0, 0, 0, 1)$, which sends circles to
circles (or to a line, for the circle through the projection point). The fiber over the north pole is the
horizontal unit circle; the fiber over the south pole is the vertical axis. Fibers over one latitude sweep out a
torus. Each fiber goes once around the torus the long way and once the short way, and these tilted circles are the
Villarceau circles of that torus. Colors follow the longitude of the base point, so neighbors on $S^2$ are neighbors
in the picture. The whole arrangement turns once around the vertical axis every forty seconds, rocking gently as it
goes.

## Linking

Any two fibers are linked exactly once: you cannot pull one off the other without cutting it. That is why the
fibration cannot be untwisted into a product $S^2 \times S^1$, and it is the geometric content of the statement
that $h$ generates $\pi_3(S^2) \cong \mathbb{Z}$. The Hopf invariant of $h$, which is the linking number of two
fibers, is $1$.

## Try this

- [One latitude = one torus](#preset:one-torus): at latitude $0°$ with $64$ fibers, the fibers over the equator of
  $S^2$ fill out the image of the Clifford torus.
- [Two latitudes link](#preset:two-latitudes): the second ring, $35°$ further north, is a thinner torus nested
  inside the first, from latitude $45°$. Every one of its circles passes through every circle of the outer torus.
- [Near the pole](#preset:near-pole): at $75°$ the fibers hug the unit circle, the fiber over the north pole. Move
  the latitude toward $-40°$ and the circles grow large, because their fibers pass close to the projection point.
- [Look down the axis](#preset:down-the-axis): from above, the fibers over the equator are circles that all pass
  through the unit circle, and the highlighted one goes once around it. Its label gives the point of $S^2$ it lies
  over, $(\cos\varphi \cos\lambda, \cos\varphi \sin\lambda, \sin\varphi)$ for latitude $\varphi$ and longitude
  $\lambda$. [Back to the turning view](#preset:turning) restores the camera and clears the highlight.
- In interact mode, drag up or down to tilt the camera, and click a circle to highlight it and label its base
  point; click empty space to clear it. Its neighbors in the picture are its neighbors on the sphere. The camera
  elevation and the highlighted fiber are also ordinary settings, so a shared link keeps them.

This piece runs on the GPU with three.js, so it is shown on computers only.

Reference: D. W. Lyons, "An elementary introduction to the Hopf fibration", *Mathematics Magazine* 76 (2003),
87–98. H. Hopf, "Über die Abbildungen der dreidimensionalen Sphäre auf die Kugelfläche", *Math. Ann.* 104 (1931),
637–665. See also [Hopf fibration](https://en.wikipedia.org/wiki/Hopf_fibration) on Wikipedia.
