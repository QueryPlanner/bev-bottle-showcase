// Three.js scene-assembly helpers shared by the interactive hero viewer and
// the gallery grid's shared-context renderer. This file is intentionally not
// unit-tested — it's WebGL wiring, not logic; see gallery.js's header comment
// and the showcase README for how it was verified instead (loaded in a real
// browser, all five themes checked by eye).
import * as THREE from 'three';
import { buildJar } from './jarGeometry.js';
import { drawLabelTexture } from './labelTexture.js';

const CREAM = 0xf2efe8;
const CAP_CREAM = 0xf6f4ee;
const SPOUT_GREY = 0xb9b2a5;

export function createSharedMaterials() {
  const matCap = new THREE.MeshPhysicalMaterial({ color: CAP_CREAM, roughness: 0.16, metalness: 0, clearcoat: 0.85, clearcoatRoughness: 0.1, envMapIntensity: 1.15 });
  const matIn = new THREE.MeshStandardMaterial({ color: SPOUT_GREY, roughness: 0.85, metalness: 0, side: THREE.DoubleSide });
  return { matCap, matIn };
}

// Builds one themed jar as a Three.js group, ready to add to any scene.
// Geometry is rebuilt per theme (cheap — a few thousand verts) rather than
// shared, because the body needs its own UV-mapped label texture; cap/lid/
// spout reuse the shared, theme-independent materials passed in.
export async function buildJarMesh(theme, { matCap, matIn }) {
  const built = buildJar();
  const { parts, hinge } = built;

  const labelTex = await drawLabelTexture(theme, THREE);
  const matBody = new THREE.MeshPhysicalMaterial({
    map: labelTex,
    roughness: 0.62,
    metalness: 0,
    clearcoat: 0.22,
    clearcoatRoughness: 0.6,
    envMapIntensity: 0.85,
  });

  const group = new THREE.Group();
  function addMesh(geo, mat, parent) {
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = true;
    m.receiveShadow = true;
    (parent || group).add(m);
    return m;
  }

  addMesh(parts.bodySide, matBody);
  addMesh(parts.bodyBase, matBody);
  addMesh(parts.bodyTop, matBody);
  addMesh(parts.capSide, matCap);
  addMesh(parts.deck, matCap);
  addMesh(parts.capBottom, matCap);
  addMesh(parts.spout, matIn);
  addMesh(parts.spoutFloor, matIn);

  const lidPivot = new THREE.Group();
  lidPivot.position.set(0, hinge.hingeY, hinge.hingeZ);
  const lid = new THREE.Group();
  lid.position.set(0, -hinge.hingeY, -hinge.hingeZ);
  lidPivot.add(lid);
  group.add(lidPivot);

  addMesh(parts.lidSide, matCap, lid);
  addMesh(parts.lidTop, matCap, lid);
  addMesh(parts.lidUnder, matCap, lid);
  const plug = addMesh(parts.plugGeo, matCap, lid);
  plug.position.set(hinge.PLUG_AT.x, hinge.PLUG_AT.y, hinge.PLUG_AT.z);
  const hingeMesh = addMesh(parts.hingeGeo, matCap, lid);
  hingeMesh.position.set(hinge.HINGE_AT.x, hinge.HINGE_AT.y, hinge.HINGE_AT.z);

  return { group, lidPivot, dims: built.dims, matBody };
}

// A small canvas-drawn studio reflection environment, cheap enough to build
// per-renderer and good enough for a matte/gloss plastic bottle.
export function createStudioEnvironment(renderer, THREE_) {
  const T = THREE_ || THREE;
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0.0, '#ffffff');
  grad.addColorStop(0.38, '#efece6');
  grad.addColorStop(0.52, '#d5cfc4');
  grad.addColorStop(1.0, '#7d776d');
  g.fillStyle = grad;
  g.fillRect(0, 0, 512, 256);
  g.fillStyle = 'rgba(255,255,255,0.95)';
  g.beginPath();
  g.ellipse(150, 52, 96, 40, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = 'rgba(255,255,255,0.55)';
  g.beginPath();
  g.ellipse(390, 74, 74, 30, 0, 0, Math.PI * 2);
  g.fill();
  const tex = new T.CanvasTexture(c);
  tex.mapping = T.EquirectangularReflectionMapping;
  tex.colorSpace = T.SRGBColorSpace;
  const pmrem = new T.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const envMap = pmrem.fromEquirectangular(tex).texture;
  tex.dispose();
  pmrem.dispose();
  return envMap;
}

export function addStudioLighting(scene) {
  scene.add(new THREE.HemisphereLight(0xfff7ec, 0x3b3327, 0.45));
  const key = new THREE.DirectionalLight(0xfff4e6, 1.5);
  key.position.set(115, 175, 95);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -60;
  key.shadow.camera.right = 60;
  key.shadow.camera.top = 60;
  key.shadow.camera.bottom = -60;
  key.shadow.camera.near = 20;
  key.shadow.camera.far = 420;
  key.shadow.radius = 3;
  key.shadow.bias = -0.0008;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xe4edff, 0.42);
  fill.position.set(-150, 70, 40);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffffff, 0.55);
  rim.position.set(-30, 95, -170);
  scene.add(rim);
}

export function addGround(scene) {
  const ground = new THREE.Mesh(new THREE.CircleGeometry(180, 72), new THREE.ShadowMaterial({ opacity: 0.2 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  return ground;
}
