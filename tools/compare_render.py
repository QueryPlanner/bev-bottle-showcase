#!/usr/bin/env python3
"""
compare_render.py — check the model against the photos instead of trusting it.

Drives index.html in headless Chromium, orbits to a chosen angle, screenshots
against a flat magenta ground (so the silhouette extracts cleanly), then:

  * builds renders/photo-vs-render.png at matched scale for eyeballing
  * reports both bounding boxes — as a sanity check, NOT as an error metric

Read that number carefully. A bounding-box W/H folds in the view angle and the
tilt-spread of the silhouette extremes, and the render's angle is not the
photo's (which is unknown — see MEASUREMENTS.md section 3). The meaningful
comparison is the front-on profile, which is angle-free: there the model tracks
the photo silhouette to about 2%, and that residual is a lens artifact rather
than a shape error, since the viewer's camera sits closer than the product
shoot and magnifies the top relative to the base.

Requires:  pip install playwright pillow numpy && playwright install chromium
Usage:     python3 tools/compare_render.py            # 3/4 view, photo aspect
"""

import numpy as np
from PIL import Image
from playwright.sync_api import sync_playwright

# these mirror the viewer's starting camera and drag sensitivity
THETA0, PHI0, PER_PX = 0.62, 1.30, 0.0065
VIEW = (0.55, 1.38)                 # target orbit: azimuth, polar (radians)
PHOTO = 'reference/03-three-quarter.png'
PHOTO_BASE_ROW = 734                # last row of jar before the contact shadow


def shoot(out='renders/render-three-quarter.png'):
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page(viewport={'width': 680, 'height': 820})
        pg.goto('file://' + __import__('os').path.abspath('index.html'))
        pg.wait_for_timeout(1500)
        pg.click('#btn-aspect')     # photographed proportions, hides guides
        pg.wait_for_timeout(2500)
        pg.add_style_tag(content='header,.panel,.dim-label{display:none!important}'
                                 'body{background:#ff00ff!important}')
        dx = (THETA0 - VIEW[0]) / PER_PX
        dy = (PHI0 - VIEW[1]) / PER_PX
        pg.mouse.move(340, 410); pg.mouse.down()
        for i in range(1, 7):
            pg.mouse.move(340 + dx * i / 6, 410 + dy * i / 6)
        pg.mouse.up()
        pg.wait_for_timeout(600)
        pg.screenshot(path=out)
        b.close()
    return out


def render_bbox(path):
    a = np.array(Image.open(path).convert('RGB')).astype(int)
    m = ((a.max(axis=2) - a.min(axis=2)) < 40) & (a.mean(axis=2) > 110)
    ys, xs = np.where(m.any(axis=1))[0], np.where(m.any(axis=0))[0]
    return int(xs[0]), int(ys[0]), int(xs[-1]), int(ys[-1])


def photo_bbox(path, base_row):
    a = np.array(Image.open(path).convert('L')).astype(float)
    rows = {}
    for y in range(a.shape[0]):
        r = a[y]
        bg = np.median(np.concatenate([r[:12], r[-12:]]))
        mask = np.abs(r - bg) > 9
        idx = [i for i in np.where(mask)[0] if mask[max(0, i-3):i+4].sum() >= 4]
        if len(idx) >= 6:
            rows[y] = (idx[0], idx[-1])
    med = np.median([rows[y][1] - rows[y][0] for y in rows if y <= base_row])
    ok = [y for y in sorted(rows)
          if y <= base_row - 30 and (rows[y][1] - rows[y][0]) < med * 1.15]
    return (min(rows[y][0] for y in ok), min(rows), max(rows[y][1] for y in ok), base_row)


def side_by_side(photo, pb, render, rb, out='renders/photo-vs-render.png', h=700):
    def crop(path, bb):
        im = Image.open(path).convert('RGB')
        l, t, r, b = bb
        pad = int((b - t) * 0.05)
        c = im.crop((max(0, l-pad), max(0, t-pad),
                     min(im.width, r+pad), min(im.height, b+pad)))
        k = h / (b - t)
        return c.resize((int(c.width * k), int(c.height * k)), Image.LANCZOS)
    a, b_ = crop(photo, pb), crop(render, rb)
    H = max(a.height, b_.height)
    canvas = Image.new('RGB', (a.width + b_.width + 24, H), (250, 250, 250))
    canvas.paste(a, (0, H - a.height))
    canvas.paste(b_, (a.width + 24, H - b_.height))
    canvas.save(out)
    return out


if __name__ == '__main__':
    shot = shoot()
    rb, pb = render_bbox(shot), photo_bbox(PHOTO, PHOTO_BASE_ROW)
    r_ratio = (rb[2] - rb[0]) / (rb[3] - rb[1])
    p_ratio = (pb[2] - pb[0]) / (pb[3] - pb[1])
    print(f'render bbox W/H {r_ratio:.3f}  (at a {VIEW[0] * 57.2958:.0f}deg turn)')
    print(f'photo  bbox W/H {p_ratio:.3f}  (turn unknown)')
    print('Not an error metric — different angles, and bbox folds in tilt.')
    print('wrote', side_by_side(PHOTO, pb, shot, rb))
