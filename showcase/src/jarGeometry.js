// Ported from ../index.html's GEOMETRY:BEGIN/END block (the measured bev. jar
// reconstruction — see ../MEASUREMENTS.md). Deliberately duplicated rather than
// shared: index.html is a zero-build, double-click deliverable, and
// ../tools/export_mesh.mjs extracts that exact block by regex, so turning it
// into a shared ES module would break both contracts. The one change here is
// additive — loft() can now emit UVs so a label texture can wrap the body —
// the numeric profile itself is untouched. If the jar is re-measured, port the
// change to both places by hand.
import * as THREE from 'three';

export const HW = 28.5;
export const HD = 15.0;
export const TOTAL_H = 68.0;
export const SEAM_Y = 46.2;
export const DECK_Y = 61.3;
const FILLET_R = 4.5;
const SLANT = (10 * Math.PI) / 180;
const N_BODY = 2.5;
const N_DECK = 2.15;
export const NSEG = 192;

export const BODY_KF = [
  [4.0, 0.888], [5.2, 0.896], [7.5, 0.912], [11.2, 0.935],
  [14.7, 0.950], [18.2, 0.965], [21.8, 0.977], [25.3, 0.988],
  [28.8, 0.992], [32.4, 1.000], [35.9, 0.996], [39.4, 0.988],
  [43.0, 0.969], [45.4, 0.950], [46.2, 0.937],
];
export const CAP_KF = [
  [46.2, 0.937], [46.5, 0.935], [48.9, 0.900], [51.3, 0.862],
  [53.7, 0.823], [56.0, 0.781], [58.3, 0.738], [60.1, 0.704],
  [61.3, 0.685],
];

export function splineAt(kf, h) {
  const n = kf.length;
  if (h <= kf[0][0]) return kf[0][1];
  if (h >= kf[n - 1][0]) return kf[n - 1][1];
  let i = 0;
  while (i < n - 2 && kf[i + 1][0] < h) i++;
  const p0 = kf[Math.max(0, i - 1)][1], p1 = kf[i][1], p2 = kf[i + 1][1], p3 = kf[Math.min(n - 1, i + 2)][1];
  const t = (h - kf[i][0]) / (kf[i + 1][0] - kf[i][0]);
  const t2 = t * t, t3 = t2 * t;
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}

function capMix(y) {
  const t = Math.max(0, Math.min(1, (y - SEAM_Y) / (DECK_Y - SEAM_Y)));
  return t * t * (3 - 2 * t);
}
export function widthFrac(y) {
  return y <= SEAM_Y ? splineAt(BODY_KF, y) : splineAt(CAP_KF, y);
}
export function depthFrac(y) {
  const w = widthFrac(y);
  if (y <= SEAM_Y) return w;
  return w + (1 - w) * 0.45 * capMix(y);
}
export function expAt(y) {
  if (y <= SEAM_Y) return N_BODY;
  return N_BODY + (N_DECK - N_BODY) * capMix(y);
}

export function sectionPoint(t, a, b, n) {
  const c = Math.cos(t), s = Math.sin(t), e = 2 / n;
  return {
    x: (c < 0 ? -1 : 1) * a * Math.pow(Math.abs(c), e),
    z: (s < 0 ? -1 : 1) * b * Math.pow(Math.abs(s), e),
  };
}

const NOTCH_DEPTH = 1.7, NOTCH_ARC = 0.22, NOTCH_FADE = 4.5;
function notchInset(t, y) {
  let hFall = (y - (DECK_Y - NOTCH_FADE)) / NOTCH_FADE;
  if (hFall <= 0) return 0;
  hFall = Math.min(1, hFall);
  hFall = hFall * hFall * (3 - 2 * hFall);
  const dt = t - Math.PI / 2;
  const d = Math.abs(Math.atan2(Math.sin(dt), Math.cos(dt)));
  if (d > NOTCH_ARC) return 0;
  const aFall = Math.cos(0.5 * Math.PI * (d / NOTCH_ARC));
  return NOTCH_DEPTH * hFall * aFall * aFall;
}

function ringAt(y, opts = {}) {
  const scale = opts.scale === undefined ? 1 : opts.scale;
  const inset = opts.inset || 0;
  const a = widthFrac(y) * HW * scale - inset;
  const b = depthFrac(y) * HD * scale - inset;
  const n = expAt(y);
  const pts = [];
  for (let i = 0; i < NSEG; i++) {
    const t = (i / NSEG) * Math.PI * 2;
    let p = sectionPoint(t, a, b, n);
    let yy = y;
    if (opts.slantFrom !== undefined) {
      for (let k = 0; k < 3; k++) {
        yy = opts.slantFrom - p.z * Math.tan(SLANT);
        p = sectionPoint(t, widthFrac(yy) * HW * scale - inset, depthFrac(yy) * HD * scale - inset, expAt(yy));
      }
      yy = opts.slantFrom - p.z * Math.tan(SLANT);
    }
    if (opts.notch) p.z -= notchInset(t, yy);
    pts.push({ x: p.x, y: yy, z: p.z });
  }
  return pts;
}

// vs: optional array of v-coordinates, one per ring, for a UV-mapped loft.
function loft(rings, expected, vs) {
  const pos = [], idx = [], uvs = [];
  const n = rings[0].length;
  for (let r = 0; r < rings.length; r++) {
    for (let i = 0; i < n; i++) {
      const p = rings[r][i];
      pos.push(p.x, p.y, p.z);
      // ringAt()'s angle increases counterclockwise viewed from above (+Y),
      // but the camera looks at the body from outside, so raw i/n runs
      // backwards on screen and mirrors any text drawn onto it. Reflect
      // around u=0.25 (the front, i/n=0.25, where the label is centered) so
      // the front still lands at u=0.25 but reads left-to-right correctly.
      if (vs) uvs.push((((0.5 - i / n) % 1) + 1) % 1, vs[r]);
    }
  }
  for (let r = 0; r < rings.length - 1; r++) {
    for (let j = 0; j < n; j++) {
      const a = r * n + j, b = r * n + ((j + 1) % n), c = (r + 1) * n + ((j + 1) % n), d = (r + 1) * n + j;
      idx.push(a, b, c, a, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  if (vs) g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(idx);
  orient(g, expected);
  return g;
}

function fan(ring, apex, expected) {
  const pos = [apex.x, apex.y, apex.z];
  const idx = [];
  const n = ring.length;
  for (let i = 0; i < n; i++) pos.push(ring[i].x, ring[i].y, ring[i].z);
  for (let j = 0; j < n; j++) idx.push(0, 1 + j, 1 + ((j + 1) % n));
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  orient(g, expected);
  return g;
}

function orient(geo, expected) {
  geo.computeVertexNormals();
  const p = geo.attributes.position, nr = geo.attributes.normal;
  let dot = 0;
  for (let i = 0; i < p.count; i++) {
    let ex, ey, ez;
    if (expected === 'radial') { ex = p.getX(i); ey = 0; ez = p.getZ(i); }
    else { ex = 0; ey = expected; ez = 0; }
    const len = Math.sqrt(ex * ex + ey * ey + ez * ez) || 1;
    dot += (nr.getX(i) * ex + nr.getY(i) * ey + nr.getZ(i) * ez) / len;
  }
  if (dot < 0) {
    const a = geo.index.array;
    for (let t = 0; t < a.length; t += 3) { const tmp = a[t + 1]; a[t + 1] = a[t + 2]; a[t + 2] = tmp; }
    geo.index.needsUpdate = true;
    geo.computeVertexNormals();
  }
}

export function volume(geo) {
  const p = geo.attributes.position, a = geo.index.array;
  let v = 0;
  const p1 = new THREE.Vector3(), p2 = new THREE.Vector3(), p3 = new THREE.Vector3(), cr = new THREE.Vector3();
  for (let t = 0; t < a.length; t += 3) {
    p1.fromBufferAttribute(p, a[t]);
    p2.fromBufferAttribute(p, a[t + 1]);
    p3.fromBufferAttribute(p, a[t + 2]);
    cr.copy(p2).cross(p3);
    v += p1.dot(cr) / 6;
  }
  return v;
}

// Builds every geometry the jar needs, plus the hinge/plug placement data.
// UVs are only computed for the body side (bodyUvVMax marks where the label
// texture's v=1 sits, i.e. the seam) since that's the only part that wears a
// themed label; cap and lid keep a plain material across every theme.
export function buildJar() {
  const bodyRings = [];
  const bodyRingYs = [];
  for (let i = 0; i <= 7; i++) {
    const ph = (i / 7) * Math.PI / 2;
    const inset = FILLET_R - FILLET_R * Math.sin(ph);
    const y = FILLET_R - FILLET_R * Math.cos(ph);
    bodyRings.push(ringAt(FILLET_R, { inset }).map((p) => ({ x: p.x, y, z: p.z })));
    bodyRingYs.push(y);
  }
  for (let y2 = FILLET_R; y2 <= SEAM_Y - 0.001; y2 += 0.85) {
    bodyRings.push(ringAt(y2));
    bodyRingYs.push(y2);
  }
  bodyRings.push(ringAt(SEAM_Y - 0.22));
  bodyRingYs.push(SEAM_Y - 0.22);

  // The 0.85mm-step loop above can push a ring slightly past SEAM_Y - 0.22
  // before the exact top ring is appended last, so the fan apex (which must
  // match that last ring's actual height) and the UV v=1 normalizer (which
  // must cover every ring, including that slightly-higher one) are not the
  // same value — keep them as two separate variables.
  const bodyLastRingY = SEAM_Y - 0.22;
  const bodyMaxRingY = Math.max(...bodyRingYs);
  const bodyVs = bodyRingYs.map((y) => y / bodyMaxRingY);

  const bodySide = loft(bodyRings, 'radial', bodyVs);
  const bodyBase = fan(bodyRings[0], { x: 0, y: 0, z: 0 }, -1);
  const bodyTop = fan(bodyRings[bodyRings.length - 1], { x: 0, y: bodyLastRingY, z: 0 }, 1);
  const bodyVol = volume(bodySide) + volume(bodyBase) + volume(bodyTop);

  const WALL = 1.8;
  let capacityMl = 0;
  {
    const inner = [];
    for (let y = WALL; y <= SEAM_Y - 0.3; y += 0.9) inner.push(ringAt(y, { inset: WALL }));
    const side = loft(inner, 'radial');
    const flo = fan(inner[0], { x: 0, y: WALL, z: 0 }, -1);
    const top = fan(inner[inner.length - 1], { x: 0, y: inner[inner.length - 1][0].y, z: 0 }, 1);
    capacityMl = (volume(side) + volume(flo) + volume(top)) / 1000;
  }

  const capRings = [];
  for (let y3 = SEAM_Y + 0.18; y3 < DECK_Y - 2.6; y3 += 0.7) capRings.push(ringAt(y3, { notch: true }));
  capRings.push(ringAt(DECK_Y - 2.6, { notch: true }));
  capRings.push(ringAt(DECK_Y, { slantFrom: DECK_Y - 0.55, notch: true }));
  const rimRing = ringAt(DECK_Y, { slantFrom: DECK_Y, inset: 0.3, notch: true });
  capRings.push(rimRing);
  const capSide = loft(capRings, 'radial');

  const ORIFICE_R = 2.4, SPOUT_DROP = 3.2;
  function orificeRing(scale, dy) {
    const pts = [];
    for (let i = 0; i < NSEG; i++) {
      const t = (i / NSEG) * Math.PI * 2;
      const x = Math.cos(t) * ORIFICE_R * scale, z = Math.sin(t) * ORIFICE_R * scale;
      pts.push({ x, y: DECK_Y - z * Math.tan(SLANT) + dy, z });
    }
    return pts;
  }
  const oTop = orificeRing(1, 0);
  const deck = loft([rimRing, oTop], 1);
  const spout = loft([oTop, orificeRing(0.94, -SPOUT_DROP)], 'radial');
  const spoutFloor = fan(orificeRing(0.94, -SPOUT_DROP), { x: 0, y: DECK_Y - SPOUT_DROP, z: 0 }, 1);
  const capBottom = fan(capRings[0], { x: 0, y: SEAM_Y + 0.18, z: 0 }, -1);

  const LID_GAP = 0.35, LID_WALL = 3.7, LID_ROLL = 0.6;
  const lidBase = DECK_Y + LID_GAP;
  function lidRing(dy, inset) {
    const pts = [];
    for (let i = 0; i < NSEG; i++) {
      const t = (i / NSEG) * Math.PI * 2;
      const a = widthFrac(DECK_Y) * HW * 1.006 - inset;
      const b = depthFrac(DECK_Y) * HD * 1.006 - inset;
      const p = sectionPoint(t, a, b, N_DECK);
      pts.push({ x: p.x, y: lidBase + dy - p.z * Math.tan(SLANT), z: p.z });
    }
    return pts;
  }
  const lidRings = [lidRing(0, 0), lidRing(LID_WALL * 0.55, 0.14), lidRing(LID_WALL, 0.3)];
  for (let k = 1; k <= 6; k++) {
    const ph = (k / 6) * Math.PI / 2;
    lidRings.push(lidRing(LID_WALL + LID_ROLL * Math.sin(ph), 0.3 + LID_ROLL - LID_ROLL * Math.cos(ph)));
  }
  const lidSide = loft(lidRings, 'radial');
  const lidTop = fan(lidRings[lidRings.length - 1], { x: 0, y: lidBase + LID_WALL + LID_ROLL, z: 0 }, 1);
  const lidUnder = fan(lidRings[0], { x: 0, y: lidBase, z: 0 }, -1);

  const plugGeo = new THREE.CylinderGeometry(ORIFICE_R * 0.92, ORIFICE_R * 0.8, 2.6, 40);
  const hingeGeo = new THREE.BoxGeometry(11, 1.1, 2.4);

  const hingeZ = -depthFrac(DECK_Y) * HD * 1.008;
  const hingeY = lidBase - hingeZ * Math.tan(SLANT);
  const PLUG_AT = { x: 0, y: lidBase - 1.2, z: 0 };
  const HINGE_AT = { x: 0, y: hingeY - 0.2, z: hingeZ + 1.0 };

  return {
    parts: { bodySide, bodyBase, bodyTop, capSide, deck, capBottom, spout, spoutFloor, capBottom2: capBottom, lidSide, lidTop, lidUnder, plugGeo, hingeGeo },
    dims: { HW, HD, TOTAL_H, SEAM_Y, DECK_Y },
    hinge: { hingeY, hingeZ, PLUG_AT, HINGE_AT },
    bodyVolumeMl: bodyVol / 1000,
    capacityMl,
  };
}
