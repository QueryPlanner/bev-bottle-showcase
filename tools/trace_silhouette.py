#!/usr/bin/env python3
"""
trace_silhouette.py — pull the jar's profile out of a product photo.

Method notes (these matter more than the code):

* The jar is white on a light grey ground, and its shaded side is DARKER than
  the background. A brightness threshold therefore does not separate them.
  Instead each row is compared against that row's own background value, taken
  from the first and last 12 px, and anything deviating by more than 9 levels
  is object.

* Widths are read from the SILHOUETTE EDGES, never the front face. The camera
  in these shots looks slightly down, which pushes the front of every
  horizontal ring lower in frame while leaving the left/right extremes at the
  ring's true height. Edge readings are therefore tilt-free; front-face
  readings are not. (The cap seam reads at y=303 on the edge and y=314 on the
  front face in 01-front.png — that 11 px gap is the tilt.)

* Part lines (cap/body seam, lid parting line) are found as dark dips in a
  narrow strip just INSIDE the left silhouette edge, for the same reason.

* The bottom ~3 mm is unusable: the contact shadow merges with the base roll.
  The base fillet is extrapolated from the wall above it instead.

Usage:  python3 tools/trace_silhouette.py reference/01-front.png [center_x]
"""

import sys
import numpy as np
from PIL import Image

DEV = 9          # levels of deviation from the row background that count as object
SUPPORT = 4      # a real edge pixel needs neighbours, to reject speckle


def row_edges(img):
    """{row: (left_x, right_x)} for every row containing the object."""
    out = {}
    for y in range(img.shape[0]):
        r = img[y]
        bg = np.median(np.concatenate([r[:12], r[-12:]]))
        mask = np.abs(r - bg) > DEV
        idx = [i for i in np.where(mask)[0]
               if mask[max(0, i - 3):i + 4].sum() >= SUPPORT]
        if len(idx) >= 6:
            out[y] = (idx[0], idx[-1])
    return out


def part_lines(img, edges):
    """Rows where a dark line crosses the strip just inside the left edge."""
    strip = {}
    for y, (L, R) in edges.items():
        if R - L > 40:
            strip[y] = img[y, L + 6:L + 20].mean()
    hits = []
    for y in sorted(strip):
        near = [strip[t] for t in range(y - 14, y - 5) if t in strip] + \
               [strip[t] for t in range(y + 6, y + 15) if t in strip]
        if len(near) >= 8 and strip[y] < np.mean(near) - 6:
            hits.append((y, strip[y] - np.mean(near)))
    return hits


def main():
    path = sys.argv[1]
    img = np.array(Image.open(path).convert('L')).astype(float)
    edges = row_edges(img)
    ys = sorted(edges)

    widths = np.array([edges[y][1] - edges[y][0] for y in ys])
    med = np.median(widths)
    clean = [y for y in ys if (edges[y][1] - edges[y][0]) < med * 1.15]
    cx = float(sys.argv[2]) if len(sys.argv) > 2 else \
        np.median([(edges[y][0] + edges[y][1]) / 2 for y in clean])

    print(f'{path}: rows {ys[0]}..{ys[-1]}, centre axis x={cx:.1f}')
    print('\npart lines (dark dips just inside the left edge):')
    for y, d in part_lines(img, edges):
        hw = cx - edges[y][0]
        print(f'   y={y:4d}  contrast {d:+6.1f}   half-width {hw:6.1f} px')

    print('\nhalf-width profile (mirror of the left edge about the centre axis):')
    for y in range(ys[0], ys[-1], 6):
        if y in edges:
            print(f'   y={y:4d}  half-width {cx - edges[y][0]:6.1f} px')

    print('\nTo turn these into millimetres: pick the base row and the topmost')
    print('row as 0 and 68 mm, and the widest half-width as 28.5 mm. If those')
    print('two scales disagree, the photographed jar is not the labelled size —')
    print('which is exactly what happened here (see MEASUREMENTS.md).')


if __name__ == '__main__':
    main()
