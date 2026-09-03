# Flip-Top Squircle Jar — 3D reconstruction

A Three.js model of the 40 ml cosmetic jar, reconstructed from seven product
photographs and the two dimensions printed on the spec card.

```
open index.html          # the interactive viewer, no build step, no server
mesh/jar.obj             # the same geometry for CAD / Blender / KeyShot
mesh/jar.stl             # fused triangles for print or import
MEASUREMENTS.md          # how every number was obtained, and what's still a guess
profile.json             # the profile as data, if you want to rebuild it elsewhere
```

## What this is, precisely

Not a scan and not CAD. The silhouette was traced out of the photographs row by
row and scaled to the labelled dimensions. Overall size is exact; the curve
between the measured points is a reconstruction. `MEASUREMENTS.md` separates the
two, and so does the viewer's side panel — measured values carry one tag, label
values another.

**Accuracy, stated plainly:**

| | |
|---|---|
| Overall 57 × 30 × 68 mm | exact — from the label, verified on the exported mesh |
| Seam and deck heights | traced, ±0.5 mm |
| Width profile | traced, agrees with the photo silhouette to ~2% |
| Cross-section roundness | oval-leaning, exponent bracketed 2.0–3.5, 2.5 used |
| Deck slant, notch, orifice | estimated from the photos, no dimension available |
| Wall thickness | assumed 1.8 mm for the capacity cross-check only |

**Not suitable for tooling.** Draft angles, parting-line detail, thread or snap
geometry, and the hinge's real construction are not in here. It is good for
renders, mockups, packaging comps, label layout, and scale checks.

## The viewer

One HTML file plus `vendor/three.min.js`. No build step, no server, no network —
double-click it.

- drag to orbit, scroll to zoom
- **Open lid** swings the lid on its hinge and shows the orifice and sealing plug
- **Dimensions** overlays the labelled dimensions plus the traced seam height
- **Wireframe** exposes the lofted ring structure the model is built from
- **Photo aspect** rescales to the proportions actually photographed (see below)

## The one unresolved conflict

The photographs measure a width-to-height ratio of **0.752**. The 40 ml label
(57 × 68 mm) implies **0.838**. The photographed jar is about 10% leaner than
the spec card describes — most likely a larger size in the same product family,
photographed for the range.

This was not averaged away. The model follows the label's dimensions, and the
**Photo aspect** button shows the photographed silhouette instead. If you know
which size the photos are of, set `HW`/`HD` in `index.html` to that size's real
width and depth and the profile will scale to it cleanly.

## Rebuilding the mesh

```bash
node tools/export_mesh.mjs      # Three.js is vendored, nothing to install
```

The exporter does not carry its own copy of the geometry — it lifts the block
between the `GEOMETRY:BEGIN` / `GEOMETRY:END` markers straight out of
`index.html` and evaluates it, so exported mesh and rendered mesh cannot drift
apart. It prints a bounding-box check against the labelled dimensions on every
run, and writes `mesh/mesh-report.json`.

Current output: 35,116 triangles, bounding box 57 × 30 × 68 mm, one OBJ group
per moulded part (`body`, `cap`, `spout_inner`, `lid`).

## Re-running the measurements

```bash
pip install pillow numpy playwright && playwright install chromium

python3 tools/trace_silhouette.py reference/01-front.png   # profile + part lines
python3 tools/fit_section.py                               # cross-section roundness
python3 tools/compare_render.py                            # model vs photo
```

Each script documents its method in its header, including why edge readings are
used instead of front-face readings, and why a brightness threshold does not
work on a white object photographed on light grey.

## Editing the shape

Everything lives in the `PART 1 — THE MEASURED PROFILE` block near the top of
the script in `index.html`:

- `BODY_KF` / `CAP_KF` — the traced half-width keyframes, `[height mm, fraction of 28.5 mm]`
- `HW`, `HD`, `TOTAL_H` — overall size; change these to retarget another capacity
- `N_BODY`, `N_DECK` — section roundness (2 = ellipse, 4 = squircle, high = rectangle)
- `SEAM_Y`, `DECK_Y`, `SLANT`, `FILLET_R` — part lines and the closure
- `NOTCH_*`, `ORIFICE_R`, `LID_*` — closure detail

The geometry is built by lofting superellipse rings up the profile — the
cross-section is not circular, so a lathe cannot produce it. Ring winding is
verified against expected normal direction at build time rather than assumed,
and enclosed volume is computed from the triangles by the divergence theorem,
which is what makes the capacity cross-check possible.

## Files

```
index.html                    viewer + geometry (the source of truth)
profile.json                  measured profile as data
MEASUREMENTS.md               method, evidence, and the estimate/measurement split
CHANGELOG.md                  what changed between versions, including what was wrong
mesh/jar.obj                  4 groups, per-vertex normals, mm, Y-up
mesh/jar.stl                  binary, fused
mesh/mesh-report.json         dimensions and volumes from the last export
tools/export_mesh.mjs         OBJ + STL writer with dimension verification
tools/trace_silhouette.py     photo → profile
tools/fit_section.py          cross-section roundness, with a self-validating fitter
tools/compare_render.py       render vs photo, numeric and side by side
vendor/                       Three.js r128 (MIT), min + module builds
reference/                    the source photographs
renders/                      verification renders, incl. photo-vs-render.png
```

Reference photographs are the supplied product images, included so the
measurement scripts can be re-run against their actual inputs.
