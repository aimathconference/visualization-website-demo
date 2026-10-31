## The chord-and-tangent law

An **elliptic curve** over ℝ is the set of solutions of a Weierstrass equation

*y² = x³ + ax + b*,  with  *4a³ + 27b² ≠ 0*,

together with a point at infinity 𝒪. Here *a* = −1 and you control *b*.

### What you're seeing
Draw the line through **P** and **Q**. By Bézout's theorem a line meets a cubic in three points counted with multiplicity, so it hits the curve once more, at **P∗Q**. Reflect that point across the *x*-axis to get **P + Q**.

With 𝒪 as the identity and reflection as negation, this rule makes the curve an **abelian group**. Commutativity is obvious. Associativity is the hard part; one classical proof uses the Cayley–Bacharach theorem for cubics through eight points.

### The formulas
For P ≠ ±Q, with slope *λ = (y_Q − y_P)/(x_Q − x_P)*:

    x₃ = λ² − x_P − x_Q
    y₃ = λ(x_P − x₃) − y_P

### Try this
- Lower *b* below 2/(3√3) ≈ 0.385. The real curve splits into an oval and an unbounded branch. The unbounded branch is the identity component, and it is a subgroup.
- Watch what happens as P passes under Q: the line turns vertical, and P + Q runs off to 𝒪.

### Where it leads
Over 𝔽_p the same formulas give elliptic-curve cryptography. Over ℚ, the Mordell–Weil theorem says *E*(ℚ) is finitely generated, and the Birch and Swinnerton-Dyer conjecture predicts its rank from an *L*-function.

**Reference.** Silverman and Tate, *Rational Points on Elliptic Curves*, chapter 1.
