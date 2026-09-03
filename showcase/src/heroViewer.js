// The big interactive bottle: drag to orbit, scroll to zoom, switch themes,
// open the lid. One dedicated WebGLRenderer — it's the only view that needs
// pointer interaction, so it can't share the gallery's scissored context.
import * as THREE from 'three';
import { THEMES } from './themes.js';
import { buildJarMesh, createSharedMaterials, createStudioEnvironment, addStudioLighting, addGround } from './scene.js';

export async function createHeroViewer(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(19, 1, 1, 4000);
  scene.environment = createStudioEnvironment(renderer);
  addStudioLighting(scene);
  addGround(scene);

  const shared = createSharedMaterials();
  const jars = new Map(); // themeId -> { group, lidPivot, scale-tween state }
  await Promise.all(
    THEMES.map(async (theme) => {
      const jar = await buildJarMesh(theme, shared);
      jar.group.visible = false;
      jar.group.scale.setScalar(1);
      scene.add(jar.group);
      jars.set(theme.id, jar);
    })
  );

  let currentId = THEMES[0].id;
  jars.get(currentId).group.visible = true;

  const target = new THREE.Vector3(0, 33, 0);
  const sph = { r: 370, theta: 0.62, phi: 1.3 };
  function updateCam() {
    camera.position.set(
      target.x + sph.r * Math.sin(sph.phi) * Math.sin(sph.theta),
      target.y + sph.r * Math.cos(sph.phi),
      target.z + sph.r * Math.sin(sph.phi) * Math.cos(sph.theta)
    );
    camera.lookAt(target);
  }
  updateCam();

  let drag = false, lx = 0, ly = 0;
  canvas.addEventListener('pointerdown', (e) => { drag = true; lx = e.clientX; ly = e.clientY; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointerup', () => { drag = false; });
  canvas.addEventListener('pointercancel', () => { drag = false; });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    sph.theta -= (e.clientX - lx) * 0.0065;
    sph.phi = Math.min(Math.max(sph.phi - (e.clientY - ly) * 0.0065, 0.22), 2.55);
    lx = e.clientX; ly = e.clientY; updateCam();
  });
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    sph.r = Math.min(Math.max(sph.r + e.deltaY * 0.42, 210), 900);
    updateCam();
  }, { passive: false });

  let spin = true, lidOpen = false, lidAngle = 0;
  let popT = 1; // 0..1 progress of the "swap" pop animation on theme change

  function setTheme(id) {
    if (id === currentId || !jars.has(id)) return;
    jars.get(currentId).group.visible = false;
    currentId = id;
    const jar = jars.get(currentId);
    jar.group.visible = true;
    jar.group.scale.setScalar(0.86);
    popT = 0;
  }

  function setLidOpen(open) { lidOpen = open; }
  function setSpin(on) { spin = on; }
  function resize() {
    const w = canvas.clientWidth || canvas.parentElement.clientWidth;
    const h = canvas.clientHeight || canvas.parentElement.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  let running = true;
  function tick() {
    if (!running) return;
    requestAnimationFrame(tick);
    const goal = lidOpen ? 1.98 : 0;
    const jar = jars.get(currentId);
    lidAngle += (goal - lidAngle) * 0.12;
    jar.lidPivot.rotation.x = -lidAngle;

    if (popT < 1) {
      popT = Math.min(1, popT + 0.06);
      const eased = 1 - Math.pow(1 - popT, 3);
      jar.group.scale.setScalar(0.86 + 0.14 * eased);
    }

    if (spin && !drag) { sph.theta += 0.0028; updateCam(); }
    renderer.render(scene, camera);
  }

  resize();
  tick();

  return {
    setTheme,
    setLidOpen,
    setSpin,
    resize,
    getCurrentThemeId: () => currentId,
    pause: () => { running = false; },
    resume: () => { if (!running) { running = true; tick(); } },
  };
}
