# bev. bottle theme showcase

One measured 3D reconstruction of the bev. hydration jar (see `../MEASUREMENTS.md`
and `../README.md` for how the shape itself was built), re-skinned in five
colorways and shown together: a big interactive hero viewer plus a grid of all
five bottles auto-rotating at once.

```
npm install
npm run dev      # http://localhost:5173
npm run build    # writes dist/
npm run test     # vitest
```

## Layout

```
src/jarGeometry.js    the measured profile + superellipse lofting, ported from
                       ../index.html's GEOMETRY block and extended with UVs so
                       a label texture can wrap the body. Deliberately
                       duplicated rather than shared — see the comment at the
                       top of the file for why.
src/themes.js          the 5 colorways: 3 are the brand book's own documented
                       pillars (Hydrate/Perform/Recover), 2 are honest
                       extensions from its secondary swatches, labeled as such.
src/labelTexture.js     canvas-drawn label per theme. computeLabelLayout() is
                       pure data (unit tested); drawLabelTexture() just walks
                       that data with canvas calls (not unit tested — see below).
src/scene.js            shared Three.js scene-assembly helpers (materials,
                       lighting, studio environment, jar mesh assembly).
src/heroViewer.js       the big interactive viewer: one dedicated WebGLRenderer,
                       drag-to-orbit, lid toggle, theme switching.
src/gallery.js          the 5-card grid: one small WebGLRenderer per card.
                       (A single shared/scissored renderer was tried first to
                       avoid six total WebGL contexts, but had a rendering bug
                       not worth chasing under time pressure — see the comment
                       at the top of the file. Six contexts is still under
                       typical mobile browser caps; revisit if this ever needs
                       many more cards.)
src/main.js             wires the DOM to the two viewers.
```

## What's tested, and what isn't

Every pure function got a unit test: the spline/superellipse profile math
(`test/jarGeometry.test.js`, including a volume cross-check against the
labelled 40&nbsp;ml capacity, the same kind of check `../tools/compare_render.py`
does for the original model), the theme config data (`test/themes.test.js`),
and the label layout math (`test/labelTexture.test.js` — including a check
that every label element sits at the geometry's front, 90°+ from the UV
wraparound seam, not on it).

`scene.js`, `heroViewer.js`, and `gallery.js` are **not** unit tested. They're
WebGL scene wiring — renderer setup, animation loops, scissor rects — where a
unit test would either mock so much of Three.js/Canvas that it stops proving
anything, or need a real GPU. That's a real gap, not a hidden one: verify them
by running `npm run dev` and checking, by eye, that all five themes render,
the hero's theme switch/lid-open/orbit controls work, and the gallery grid's
five cards all animate independently.

## Deploying

A `vercel.json` at the repo root (`../vercel.json`) builds this subfolder and
points Vercel at its `dist/` output, so importing the repo into Vercel needs
no dashboard configuration — Root Directory can stay at the repo root.
