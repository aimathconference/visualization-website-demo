## Multiplication tables on a circle

Place $n$ points evenly around a circle and label them $0, 1, \dots, n - 1$. For a multiplier $k$, draw a chord
from every point $i$ to the point $k i \bmod n$. Each chord is one line of the multiplication table for $k$,
read modulo $n$.

## What you're seeing

The multiplier $k$ sweeps slowly upward from $2$ to $62$ over the five-minute loop, a fifth of a unit per
second, so most of the time it is not a whole number and the chords drift between pictures. At $k = 2$ the
chords envelope a **cardioid**; at $k = 3$, a **nephroid**. For a whole number $k$, as $n \to \infty$ the
envelope is an **epicycloid with $k - 1$ cusps**: the path of a point on a circle of radius $r$ rolling around
a fixed circle of radius $(k - 1) r$. The label in the corner names the curve whenever $k$ is close to a whole
number. The chords are colored by where their starting point sits around the circle, so you can see which part
of the table draws which part of the curve.

## Why it works

The chord joins the points at angles $\theta$ and $k\theta$. The envelope of the family of lines through
$e^{i\theta}$ and $e^{ik\theta}$ is the epicycloid traced by

$$z(\theta) = \frac{k\,e^{i\theta} + e^{ik\theta}}{k + 1}.$$

The point $z(\theta)$ divides the chord in the ratio $1 : k$, which is why the cusps sit where the chord
shrinks to a point: there $e^{i\theta} = e^{ik\theta}$, that is $(k - 1)\theta \in 2\pi\mathbb{Z}$, which
happens $k - 1$ times around the circle.

## Try this

- Start at [the cardioid](#preset:cardioid), $k = 2$, and then jump to [the nephroid](#preset:nephroid),
  $k = 3$. Count the cusps.
- Jump to [$n = 101$, $k = 51$](#preset:inverse-of-two). Since $51 \cdot 2 \equiv 1 \pmod{101}$, multiplying
  by $51$ undoes multiplying by $2$: the chord from $i$ to $51 i$ is the chord from $2j$ to $j$ with $j = 51 i$,
  so you get the cardioid's chords back, and the label's "50 cusps" is wrong for this $n$.
- Lower the points to [$n = 30$](#preset:thirty) and the envelope dissolves into a visible chord diagram.
  Raise $n$ step by step: where does the picture start to look like a curve?
- Pause [at t = 40](#t:40), where $k = 10$, and check the nine cusps. Then try [at t = 42.5](#t:42.5), halfway
  between whole numbers, where the picture is a blur of two curves.

## In the classroom

One picture covers modular arithmetic, the units of $\mathbb{Z}/n\mathbb{Z}$, and envelopes of line families.
Students can predict when two multipliers give the same picture (they are equal modulo $n$) and when one undoes
another (they are inverses modulo $n$). The construction was popularized by Mathologer's video.

References: Mathologer (B. Polster), *Times Tables, Mandelbrot and the Heart of Mathematics*, video, 2015,
[on YouTube](https://www.youtube.com/watch?v=qhbuKbxJsk8); see also
[Epicycloid](https://en.wikipedia.org/wiki/Epicycloid) on Wikipedia.
