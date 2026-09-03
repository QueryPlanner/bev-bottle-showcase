/**
 * export_mesh.mjs — write the jar geometry out as OBJ + STL.
 *
 * The geometry is NOT duplicated here. This script lifts the block marked
 *   GEOMETRY:BEGIN ... GEOMETRY:END
 * straight out of ../index.html and evaluates it, so the mesh you export can
 * never drift from the mesh the viewer draws.
 *
 *   node tools/export_mesh.mjs        (Three.js is vendored, no install needed)
 *
 * Output: mesh/jar.obj, mesh/jar.stl  (millimetres, Y-up, lid closed)
 */

import * as THREE from '../vendor/three.module.js';   // or 'three/build/three.module.js' if installed
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');

/* ---- 1. lift the shared geometry block out of the viewer ---- */
const html = readFileSync(resolve(root, 'index.html'), 'utf8');
const begin = html.indexOf('GEOMETRY:BEGIN');
const end = html.indexOf('GEOMETRY:END');
if (begin < 0 || end < 0) throw new Error('geometry markers not found in index.html');
const block = html.slice(html.indexOf('\n', begin) + 1, html.lastIndexOf('\n', end));

const build = new Function('THREE', block + `
  return {
    parts: [
      { name: 'body', geos: [bodySide, bodyBase, bodyTop] },
      { name: 'cap',  geos: [capSide, deck, capBottom] },
      { name: 'spout_inner', geos: [spout, spoutFloor] },
      { name: 'lid',  geos: [lidSide, lidTop, lidUnder,
                             plugGeo.clone().translate(PLUG_AT.x, PLUG_AT.y, PLUG_AT.z),
                             hingeGeo.clone().translate(HINGE_AT.x, HINGE_AT.y, HINGE_AT.z)] }
    ],
    stats: {
      bodyEnvelopeMl: +(bodyVol / 1000).toFixed(2),
      interiorMl: +capacityMl.toFixed(2),
      seamY: SEAM_Y, deckY: DECK_Y, totalH: TOTAL_H,
      halfWidth: HW, halfDepth: HD,
      sectionExponentBody: N_BODY, sectionExponentDeck: N_DECK,
      slantDeg: +(SLANT * 180 / Math.PI).toFixed(2),
      wallMm: WALL, ringSegments: NSEG
    }
  };
`);

const { parts, stats } = build(THREE);

/* ---- 2. OBJ, one group per moulded part ---- */
let obj = '# Flip-top squircle jar — reconstructed from product photography\n';
obj += '# millimetres, Y-up, origin at the centre of the base, lid closed\n';
obj += `# body envelope ${stats.bodyEnvelopeMl} ml | interior at ${stats.wallMm} mm walls ${stats.interiorMl} ml\n`;
let vOffset = 1, triCount = 0;
const allTris = [];

for (const part of parts) {
  obj += `\ng ${part.name}\n`;
  for (const geo of part.geos) {
    const g = geo.index ? geo.toNonIndexed() : geo;
    if (!g.attributes.normal) g.computeVertexNormals();
    const pos = g.attributes.position, nor = g.attributes.normal;
    let v = '', n = '', f = '';
    for (let i = 0; i < pos.count; i++) {
      v += `v ${fmt(pos.getX(i))} ${fmt(pos.getY(i))} ${fmt(pos.getZ(i))}\n`;
      n += `vn ${fmt(nor.getX(i))} ${fmt(nor.getY(i))} ${fmt(nor.getZ(i))}\n`;
    }
    for (let i = 0; i < pos.count; i += 3) {
      const a = vOffset + i, b = a + 1, c = a + 2;
      f += `f ${a}//${a} ${b}//${b} ${c}//${c}\n`;
      allTris.push([
        [pos.getX(i), pos.getY(i), pos.getZ(i)],
        [pos.getX(i+1), pos.getY(i+1), pos.getZ(i+1)],
        [pos.getX(i+2), pos.getY(i+2), pos.getZ(i+2)],
        [nor.getX(i), nor.getY(i), nor.getZ(i)]
      ]);
      triCount++;
    }
    obj += v + n + f;
    vOffset += pos.count;
  }
}
function fmt(x){ return (Math.round(x * 10000) / 10000).toString(); }

mkdirSync(resolve(root, 'mesh'), { recursive: true });
writeFileSync(resolve(root, 'mesh/jar.obj'), obj);

/* ---- 3. binary STL (all parts fused, for CAD / print import) ---- */
const buf = Buffer.alloc(84 + triCount * 50);
buf.write('jar 68x57x30mm reconstructed from photos'.padEnd(80, ' '), 0, 80, 'ascii');
buf.writeUInt32LE(triCount, 80);
let o = 84;
for (const [p1, p2, p3, nrm] of allTris) {
  for (const c of nrm) { buf.writeFloatLE(c, o); o += 4; }
  for (const p of [p1, p2, p3]) for (const c of p) { buf.writeFloatLE(c, o); o += 4; }
  buf.writeUInt16LE(0, o); o += 2;
}
writeFileSync(resolve(root, 'mesh/jar.stl'), buf);

/* ---- 4. verify the exported mesh against the labelled dimensions ---- */
const bb = { min: [ Infinity,  Infinity,  Infinity], max: [-Infinity, -Infinity, -Infinity] };
for (const [p1, p2, p3] of allTris)
  for (const p of [p1, p2, p3])
    for (let i = 0; i < 3; i++) {
      bb.min[i] = Math.min(bb.min[i], p[i]);
      bb.max[i] = Math.max(bb.max[i], p[i]);
    }
const size = bb.max.map((v, i) => +(v - bb.min[i]).toFixed(2));
console.log(`triangles      ${triCount}`);
console.log(`bounding box   ${size[0]} × ${size[2]} × ${size[1]} mm  (W × D × H)`);
console.log(`target (label) 57 × 30 × 68 mm`);
console.log(`body envelope  ${stats.bodyEnvelopeMl} ml`);
console.log(`interior       ${stats.interiorMl} ml at ${stats.wallMm} mm walls`);
console.log('wrote mesh/jar.obj, mesh/jar.stl');
writeFileSync(resolve(root, 'mesh/mesh-report.json'),
  JSON.stringify({ triangles: triCount, boundingBoxWDH_mm: [size[0], size[2], size[1]], ...stats }, null, 2));
