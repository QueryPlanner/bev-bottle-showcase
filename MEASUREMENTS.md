# How every number in this model was obtained

Two dimensions were given. Everything else was measured off the photographs or
estimated. This document says which is which, and shows the evidence for the
calls that were not obvious.

---

## 1. What the photographs can and cannot give you

**A brightness threshold does not segment this jar.** It is white, on light
grey, and its shaded right side reads *darker* than the background — 194 vs 215
at mid-body in `01-front.png`. Every row is therefore compared against its own
background value, sampled from the first and last 12 pixels, with a deviation of
more than 9 levels counting as object.

**Widths must be read at the silhouette edges, not across the front face.** The
camera in these shots looks slightly down. That pushes the near side of every
horizontal ring lower in the frame while leaving the left and right extremes at
the ring's true height. The cap seam demonstrates the error directly: it reads at
row 303 on the silhouette edge and row 314 across the front face. Using the
front face would have put the seam 1.1 mm too low and thrown off everything
above it.

**The bottom 3 mm is unrecoverable.** The contact shadow merges with the base
roll, so readings below row ~760 oscillate instead of tapering. The base fillet
is extrapolated from the wall above it rather than measured.

---

## 2. The traced profile

Scale for `01-front.png`: base plane at row 773, topmost point at row 82, so
691 px = 68 mm. Widest half-width 260 px = 28.5 mm.

| Feature | Photo row | Height | As fraction of H |
|---|---|---|---|
| Base plane | 773 | 0.0 mm | 0.000 |
| Widest point | 435 | 32.4 mm | 0.476 |
| Cap / body seam | 303 | 46.2 mm | 0.680 |
| Lid parting line | 146 | 61.3 mm | 0.901 |
| Lid top, back corner | 82 | 68.0 mm | 1.000 |

Half-width by height, as a fraction of 28.5 mm — the numbers in `BODY_KF` and
`CAP_KF`:

| Height | Fraction | | Height | Fraction |
|---|---|---|---|---|
| 4.0 | 0.888 | | 39.4 | 0.988 |
| 7.5 | 0.912 | | 43.0 | 0.969 |
| 11.2 | 0.935 | | 46.2 | 0.937 ← seam |
| 18.2 | 0.965 | | 48.9 | 0.900 |
| 25.3 | 0.988 | | 53.7 | 0.823 |
| 32.4 | 1.000 | | 58.3 | 0.738 |
| 35.9 | 0.996 | | 61.3 | 0.685 ← deck rim |

The body is gently barrelled — widest just above mid-height, drawing in about
11% toward the base roll and 6% toward the seam. The cap tapers almost linearly:
−0.0115 of fraction per 1% of height, essentially a straight cone. The verifying
render reproduces that slope to −0.0113.

The cap skirt is flush with the body at the seam within measurement error
(243.5 px above, ~245 px below), so the two parts are modelled flush with a
0.4 mm parting gap.

---

## 3. The cross-section: measured, not assumed

A rounded rectangle and an oval produce the **same front elevation**. The front
view cannot distinguish them, which is exactly how the first attempt went wrong.
Two independent tests settle it.

### Test 1 — shading crease

A rounded rectangle has flat faces meeting corner rolls. That geometry puts a
visible break in the brightness gradient where one becomes the other. Scanning
mid-body across `03-three-quarter.png`:

```
   x     value   2nd deriv
   90    243.0    -0.07
  165    235.1    +0.11
  240    222.8    +0.01
  315    215.9    -0.12
  390    207.9    -0.03
  465    196.7    +0.06
  540    182.5    +0.14
```

A smooth monotonic ramp, 243 → 183, with no structure in the second derivative
anywhere across the body. There is no flat face and no corner roll.

### Test 2 — off-axis narrowing

Rotating a section changes its silhouette width. For an oval the width only
shrinks. For a rectangle it *grows*, peaking near `atan(depth/width)` — a boxy
57 × 30 section viewed at 28° would be 13% **wider** than face-on.

Measuring this needs care, and a first pass got it wrong. Total height cannot
be the yardstick: the top is slanted, so the apparent topmost point moves with
viewpoint. And plain left-to-right width is contaminated because the cast
shadow falls on a *different side* in each shot, inflating one edge. Both fixed:

* vertical yardstick = **seam row to base row** (a true vertical distance,
  unaffected by turning the jar)
* width = **2 × the narrower half-width** about the silhouette centre axis,
  searched only in the 35–60% height band, which is where the body's waist is
  and where neither shadow nor base reflection reaches

| View | Widest row | seam→base | metric | vs frontal |
|---|---|---|---|---|
| 01 front | 517 px | 470 px | 1.100 | 1.000 |
| 03 three-quarter | 486 px | 468 px | 1.038 | 0.944 |
| 04 rotated | 470 px | 460 px | 1.022 | 0.929 |
| 05 near-front | 440 px | 454 px | 0.969 | 0.881 |

(`02-three-quarter.png` was dropped — its background gradient defeats the
row-background segmentation and its silhouette readings are unstable.)

A useful consistency check falls out of this: a frontal view of the labelled
57 mm width over the 46.2 mm seam height would give a metric of 1.234. The
photo-derived aspect (×0.897, see §7) predicts 1.106. Photo 01 measures 1.100 —
so **photo 01 is the frontal view**, and the aspect scaling is self-consistent.

Every off-axis view is therefore *narrower* than frontal, never wider. That
alone rules out a boxy section, which would have to bulge past frontal width
somewhere between 20° and 40°.

What it cannot do is pin the exponent exactly, because the rotation of each
photo is unknown. Solving for the angle each candidate exponent would require:

| n | view 03 | view 04 | view 05 |
|---|---|---|---|
| 2.0 | 23° | 26° | 34° |
| 2.5 | 28° | 32° | 40° |
| 3.0 | 34° | 37° | 45° |
| 3.5 | 38° | 41° | 48° |
| 4.0 | 42° | 44° | 51° |

The photographs read as 25–40° turns, which brackets the exponent at roughly
**2.0–3.5**. Combined with the crease-free shading, which pushes toward the low
end, the model uses **n = 2.5** for the body and 2.15 at the deck — the middle
of the defensible range, not a precise measurement. Treat it as ±0.7.

An earlier pass of this document claimed a single "11.6% narrowing" and a
tighter exponent. That figure came from heights contaminated by the contact
shadow. The corrected spread is 5.6–11.9% across the views; the conclusion
(oval-leaning, not boxy) survived, the false precision did not.

`tools/fit_section.py` also carries a moment-based fitter that recovers the
exponent from an outline under any affine transform (a superellipse maps to a
superellipse of the same exponent, so camera obliquity does not bias it). It
self-validates against synthetic shapes and is accurate to about n = 4. It is
included for reuse; the two tests above are what decided this model.

---

## 4. The closure

From `06-lid-open.png`, which shows the assembly open:

- lid hinged at the **back**, opening ~113°
- **slanted top deck**, back edge high — this is why the topmost point of the
  silhouette (row 82) sits well above the lid's side extremes (row ~144), a gap
  the camera tilt alone cannot explain. Slant estimated at **10°**, giving a
  4.4 mm rise across the deck and putting the lid's back corner at exactly
  68.0 mm.
- **dispensing orifice** in the deck, ~4.8 mm, with a **sealing plug** on the
  lid's underside
- **thumb scoop** pressed into the front of the collar under the lid's edge —
  the low side of the slant, which is the point of slanting it

Slant angle, notch dimensions, orifice diameter and the split between lid wall
and edge roll are **estimates**. No photograph gives a dimension for any of them.

---

## 5. Cross-check: does it hold 40 ml?

An independent test the reconstruction could have failed. Take the traced body,
walk it inward by one wall thickness, and measure the enclosed volume from the
triangles by the divergence theorem:

```
body envelope (outer, below the seam)      60.7 ml
interior at 1.8 mm walls                   48.3 ml
labelled fill                              40 ml
```

48.3 ml of interior for a 40 ml fill is 17% headspace — normal for this kind of
pack. The traced profile is consistent with the label.

---

## 6. Model vs photograph

The model was rendered at the photographed angle and its silhouette extracted
with the same code used on the photos:

```
render, photo aspect, 31.5deg turn      W/H 0.663
photo 03, same bbox method              W/H 0.759
```

These are not directly comparable — a bbox W/H folds in both the view angle
and the tilt-spread of the silhouette extremes, and the render's 31.5° is not
photo 03's (unknown) angle. Judged on the front-on profile instead, where the
comparison is angle-free, agreement across the height is within ~2%, and the
residual is systematic in a telling way: the model runs ~2% narrow below the waist and ~2%
wide above it. That is the signature of a shorter camera-to-subject distance
magnifying the top, not a shape error. The viewer's lens was lengthened to 19°
to reduce it; the rest is inherent to comparing two different lenses.

`renders/photo-vs-render.png` is the same comparison at matched scale for the eye.

---

## 7. The conflict left standing

| | W/H |
|---|---|
| Measured from the photographs | 0.752 |
| Implied by the 40 ml label (57 × 68 mm) | 0.838 |

The photographed jar is ~10% leaner than the spec card describes. Most likely
the photos are of a larger size in the same family. Rather than splitting the
difference, the model uses the label's dimensions and the viewer's **Photo
aspect** toggle scales X and Z by 0.897 to show the photographed proportions.

If you can confirm which size the photos show, set `HW` and `HD` in
`index.html` to that size's real half-width and half-depth; the traced profile
is stored as fractions and will scale to it directly.
