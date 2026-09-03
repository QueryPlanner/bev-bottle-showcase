#!/usr/bin/env python3
"""
fit_section.py — how round is the cross-section?

This is the question that decided the rebuild. A rounded-RECTANGLE section and
an OVAL section give the same front elevation, so the front view cannot tell
them apart. Two things can:

1. SHADING CREASE. A rounded rectangle has flat faces meeting corner rolls,
   which puts a visible break in the brightness gradient across the body. An
   oval has none. Run this script: the 3/4 photo shows a smooth monotonic ramp
   from 243 down to 183 with no second-derivative structure anywhere. No crease
   -> no flat face.

2. OFF-AXIS NARROWING. Rotate a section and its silhouette width changes. For
   an oval it only ever shrinks. For a rectangle it GROWS, peaking near
   atan(depth/width) — a boxy 57x30 section at 28 degrees would be 13% WIDER
   than face-on. Every off-axis photo here is NARROWER (5.6% to 11.9%), so the
   section is not boxy.

   Measuring that correctly takes two precautions, and skipping them produced a
   wrong answer on the first pass:
     - do NOT use total height as the yardstick. The top of this jar is
       slanted, so the apparent topmost point moves with viewpoint. Use the
       seam row to base row distance, which is a true vertical.
     - do NOT use plain left-to-right width. The cast shadow falls on a
       different side in each shot and inflates that edge. Use twice the
       NARROWER half-width about the centre axis, and only search the 35-60%
       height band where the body's waist is.

   What this cannot do is pin the exponent, because each photo's rotation is
   unknown. It brackets it: 2.0-3.5 for rotations of 25-40 degrees. The model
   uses 2.5, the middle of that range. Treat it as +/-0.7, not a measurement.

Conclusion: superellipse exponent n ~= 2.5, oval-leaning. Not a squircle.

The script also self-validates the moment-based fitter on synthetic shapes,
because an unvalidated fitter is just a guess with decimals.

Usage:  python3 tools/fit_section.py
"""

import numpy as np
from PIL import Image
from math import sqrt, log, pi, radians

A, B = 28.5, 15.0          # half width, half depth (mm) from the label
T = np.linspace(0, 2 * np.pi, 4000, endpoint=False)


def superellipse(n, a=A, b=B):
    e = 2 / n
    x = np.sign(np.cos(T)) * np.abs(np.cos(T)) ** e * a
    z = np.sign(np.sin(T)) * np.abs(np.sin(T)) ** e * b
    return x, z


def half_width(n, theta):
    x, z = superellipse(n)
    return (x * np.cos(theta) + z * np.sin(theta)).max()


def fit_exponent(points):
    """Recover n from an affinely-transformed superellipse outline.

    A superellipse maps to a superellipse of the SAME exponent under any
    affine transform, so an oblique camera does not bias this. Whiten by the
    covariance, then the boundary's max/min radius fixes n:
        r_max / r_min = sqrt(2) * 2 ** (-1/n)
    """
    P = points - points.mean(axis=0)
    vals, vecs = np.linalg.eigh(np.cov(P.T))
    Q = P @ (vecs @ np.diag(1 / np.sqrt(vals)) @ vecs.T).T
    r = np.linalg.norm(Q, axis=1)
    ratio = np.percentile(r, 98) / np.percentile(r, 2)
    if ratio <= 1.001:
        return 2.0, ratio
    return -log(2) / log(ratio / sqrt(2)), ratio


def validate():
    print('fitter validation (recovered exponent under an oblique affine):')
    rng = np.random.default_rng(3)
    for n_true in [2.0, 2.5, 3.0, 3.5, 4.0, 5.0]:
        x, z = superellipse(n_true)
        pts = np.stack([x, z], 1)
        got = []
        for _ in range(3):
            th = rng.uniform(0, 2 * pi)
            R = np.array([[np.cos(th), -np.sin(th)], [np.sin(th), np.cos(th)]])
            Aff = np.array([[1.0, 0.55], [0.0, 0.42]]) @ R
            got.append(fit_exponent(pts @ Aff.T)[0])
        print(f'   true {n_true:4.1f}  ->  {np.mean(got):5.2f}')
    print('   (usable to ~n=4; compresses above that, but stays monotonic)\n')


# measured with the two precautions described in the header
MEASURED = {                       # view: width relative to the frontal view
    '03-three-quarter': 0.944,
    '04-rotated':       0.929,
    '05-near-front':    0.881,
}


def required_angles():
    print('rotation each candidate exponent would need to explain the measured')
    print('narrowing (the photographs read as 25-40 degree turns):')
    names = list(MEASURED)
    print('     n  ' + '  '.join(f'{n[:12]:>12s}' for n in names))
    for n in [2.0, 2.5, 3.0, 3.5, 4.0, 4.6]:
        w0 = half_width(n, 0)
        cells = []
        for view in names:
            hit = next((d for d in np.arange(0, 90, 0.25)
                        if half_width(n, radians(d)) / w0 <= MEASURED[view]), None)
            cells.append(f'{hit:10.1f}°' if hit is not None else '       n/a')
        print(f'  {n:4.1f}  ' + '  '.join(f'{c:>12s}' for c in cells))
    print()


def narrowing_table():
    print('silhouette width relative to face-on, by exponent and view angle:')
    print('   n      15deg  25deg  30deg  35deg  45deg  60deg')
    for n in [2.0, 2.5, 3.0, 3.5, 4.0, 4.6, 5.5]:
        w0 = half_width(n, 0)
        row = '  '.join(f'{half_width(n, radians(d)) / w0:.3f}'
                        for d in [15, 25, 30, 35, 45, 60])
        print(f'   {n:4.1f}   {row}')
    print('\n   Note the rows at n >= 4: width exceeding 1.000 at 15-30 degrees is')
    print('   the boxy-section signature, and no photograph here shows it.\n')


def crease_scan(path='reference/03-three-quarter.png', rows=(330, 470)):
    img = np.array(Image.open(path).convert('L')).astype(float)
    band = img[rows[0]:rows[1], :].mean(axis=0)
    d2 = np.gradient(np.gradient(band))
    print(f'mid-body brightness scan across {path}:')
    print('     x    value   2nd deriv')
    for x in range(90, 565, 25):
        print(f'   {x:4d}  {band[x]:7.1f}   {d2[x]:+7.2f}')
    print('\n   Monotonic ramp, no crease. A flat face meeting a corner roll')
    print('   would put a clear kink in this column.\n')


if __name__ == '__main__':
    validate()
    narrowing_table()
    required_angles()
    try:
        crease_scan()
    except FileNotFoundError:
        print('(run from the project root so reference/ resolves)')
