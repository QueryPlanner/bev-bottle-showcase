# What changed, and what was wrong

## v3 — corrected measurements
Re-measured the off-axis narrowing after the shipped comparison tool disagreed
with the figure in the docs. The original "11.6% narrowing" used object heights
contaminated by the contact shadow, and widths contaminated by the cast shadow —
which falls on a *different side* in each shot. Corrected: the off-axis views run
5.6%, 7.1% and 11.9% narrower than the frontal view. The conclusion held (the
section is oval-leaning, not boxy) but the precision did not: the cross-section
exponent is bracketed at 2.0–3.5 by the unknown view angles, not pinned at 2.5.
The docs, the tools and the viewer's panel now all say that. Geometry unchanged
apart from a 0.2 mm lid adjustment so the exported mesh measures exactly 68 mm.

## v2 — rebuilt from the product views
The first attempt was wrong in three ways, all corrected here:
- the shoulder cap was modelled bulging *outward*; it tapers *inward*, 53 → 39 mm
- the entire closure was missing — hinged flip lid, slanted deck, thumb scoop,
  dispensing orifice, sealing plug
- the cross-section was assumed to be a hard squircle; it is oval-leaning

## v1 — from the spec card alone
Overall dimensions right, shape wrong. Built from one photograph carrying only
three dimensions, with the cap's taper direction guessed — and guessed backwards.
