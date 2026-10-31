## Multiplication tables on a circle

Place *n* points evenly around a circle and label them 0, 1, …, *n* − 1. For a multiplier *k*, draw a chord from every point *i* to the point *k·i* mod *n*.

### What you're seeing
The multiplier *k* sweeps slowly upward from 2. At **k = 2** the chords envelope a **cardioid**; at **k = 3**, a **nephroid**. For integer *k*, as *n* → ∞ the envelope is an **epicycloid with k − 1 cusps**: the path of a point on a circle of radius *r* rolling around a fixed circle of radius (*k* − 1)*r*.

### Why it works
The chord joins the points at angles *θ* and *kθ*. The envelope of the family of lines through *e^{iθ}* and *e^{ikθ}* is the epicycloid traced by

*z(θ) = (k e^{iθ} + e^{ikθ}) / (k + 1)*.

### Try this
- Set *n* = 101 and wait for *k* = 51. Since 51 · 2 ≡ 1 (mod 101), multiplying by 51 inverts multiplying by 2: you get the cardioid's chords again.
- Lower *n* to 30 and the envelope dissolves into a visible chord diagram. Where does the picture stop looking like a curve?

### In the classroom
One picture covers modular arithmetic, the units of ℤ/*n*ℤ, and envelopes of line families. The construction was popularized by Mathologer's video *Times Tables, Mandelbrot and the Heart of Mathematics*.
