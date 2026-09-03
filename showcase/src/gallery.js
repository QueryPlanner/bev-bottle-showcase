// All five themed bottles, side by side, each auto-rotating. Originally built
// as one shared WebGLRenderer scissoring into five viewports (to avoid five
// separate GL contexts on top of the hero's), but that path had a rendering
// bug under time pressure to ship that wasn't worth chasing further. Reverted
// to one small WebGLRenderer per card — five extra contexts, plus the hero's
// one, is six total, which is still under typical mobile browser context caps
// (usually 8-16) and is simple and known to work, at the cost of the
// scissor-sharing optimization noted in the original design. Flagging this as
// a real tradeoff, not a silent one: if this page ever needs many more cards,
// revisit the shared-context approach rather than adding more contexts.
import * as THREE from 'three';
import { THEMES } from './themes.js';
import { buildJarMesh, createSharedMaterials, createStudioEnvironment, addStudioLighting, addGround } from './scene.js';

export async function createGalleryRenderer(containerEl, slotEls) {
  const shared = createSharedMaterials();

  const cells = await Promise.all(
    slotEls.map(async (slotEl) => {
      const id = slotEl.dataset.theme;
      const theme = THEMES.find((t) => t.id === id);
      const canvas = document.createElement('canvas');
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.display = 'block';
      slotEl.appendChild(canvas);

      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;

      const scene = new THREE.Scene();
      scene.environment = createStudioEnvironment(renderer);
      addStudioLighting(scene);
      addGround(scene);
      const camera = new THREE.PerspectiveCamera(21, 1, 1, 4000);

      const jar = await buildJarMesh(theme, shared);
      scene.add(jar.group);

      return { slotEl, canvas, renderer, scene, camera, jar, theta: Math.random() * Math.PI * 2, entrance: 0 };
    })
  );

  const target = new THREE.Vector3(0, 33, 0);
  const r = 300, phi = 1.32;
  function aimCamera(cell) {
    cell.camera.position.set(
      target.x + r * Math.sin(phi) * Math.sin(cell.theta),
      target.y + r * Math.cos(phi),
      target.z + r * Math.sin(phi) * Math.cos(cell.theta)
    );
    cell.camera.lookAt(target);
  }

  function resizeCell(cell) {
    const w = cell.slotEl.clientWidth || 1;
    const h = cell.slotEl.clientHeight || 1;
    cell.renderer.setSize(w, h, false);
    cell.camera.aspect = w / h;
    cell.camera.updateProjectionMatrix();
  }
  cells.forEach(resizeCell);
  const ro = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const cell = cells.find((c) => c.slotEl === entry.target);
      if (cell) resizeCell(cell);
    }
  });
  cells.forEach((c) => ro.observe(c.slotEl));

  let running = true;
  let visible = true;

  function render() {
    if (!running || !visible) return;
    requestAnimationFrame(render);
    for (const cell of cells) {
      cell.theta += 0.0035;
      cell.entrance = Math.min(1, cell.entrance + 0.03);
      const eased = 1 - Math.pow(1 - cell.entrance, 3);
      cell.jar.group.scale.setScalar(0.9 + 0.1 * eased);
      cell.jar.group.position.y = (1 - eased) * -8;
      aimCamera(cell);
      cell.renderer.render(cell.scene, cell.camera);
    }
  }

  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.target === containerEl) visible = e.isIntersecting;
    if (visible && running) render();
  }, { threshold: 0.01 });
  io.observe(containerEl);

  render();

  return {
    pause: () => { running = false; },
    resume: () => { if (!running) { running = true; render(); } },
  };
}
