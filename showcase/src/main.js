import { THEMES } from './themes.js';
import { createHeroViewer } from './heroViewer.js';
import { createGalleryRenderer } from './gallery.js';

function renderThemeSwitch(container, activeId, onSelect) {
  container.innerHTML = '';
  for (const theme of THEMES) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.role = 'tab';
    btn.style.setProperty('--swatch', theme.color);
    btn.setAttribute('aria-selected', String(theme.id === activeId));
    btn.classList.toggle('active', theme.id === activeId);
    btn.innerHTML = `<span class="dot" style="background:${theme.id === activeId ? theme.color : 'currentColor'}"></span>${theme.name}`;
    btn.addEventListener('click', () => onSelect(theme.id));
    container.appendChild(btn);
  }
}

function renderThemeDetail(container, theme) {
  const tagClass = theme.documented ? 'documented' : 'extended';
  const tagText = theme.documented ? 'Documented brand pillar' : 'Extended colorway';
  container.style.setProperty('--swatch-ink', theme.color);
  container.innerHTML = `
    <span class="tag ${tagClass}">${tagText}</span>
    <p class="pillar">${theme.pillar}</p>
    <p class="copy">${theme.copy}</p>
    <p class="source">${theme.source}</p>
  `;
}

function renderGalleryCards(grid) {
  const slots = [];
  for (const theme of THEMES) {
    const card = document.createElement('div');
    card.className = 'card';
    const slot = document.createElement('div');
    slot.className = 'card-slot';
    slot.dataset.theme = theme.id;
    const h3 = document.createElement('h3');
    h3.textContent = theme.name;
    const flavor = document.createElement('p');
    flavor.className = 'flavor';
    flavor.textContent = theme.flavor;
    card.appendChild(slot);
    card.appendChild(h3);
    card.appendChild(flavor);
    grid.appendChild(card);
    slots.push(slot);
  }
  return slots;
}

async function main() {
  const switchEl = document.getElementById('theme-switch');
  const detailEl = document.getElementById('theme-detail');
  const heroCanvas = document.getElementById('hero-gl');
  const galleryGrid = document.getElementById('gallery-grid');

  let activeId = THEMES[0].id;
  renderThemeSwitch(switchEl, activeId, selectTheme);
  renderThemeDetail(detailEl, THEMES[0]);

  const hero = await createHeroViewer(heroCanvas);

  function selectTheme(id) {
    if (id === activeId) return;
    activeId = id;
    hero.setTheme(id);
    renderThemeSwitch(switchEl, activeId, selectTheme);
    renderThemeDetail(detailEl, THEMES.find((t) => t.id === id));
  }

  const btnLid = document.getElementById('btn-lid');
  let lidOpen = false;
  btnLid.addEventListener('click', () => {
    lidOpen = !lidOpen;
    hero.setLidOpen(lidOpen);
    btnLid.textContent = lidOpen ? 'Close lid' : 'Open lid';
    btnLid.classList.toggle('active', lidOpen);
  });

  const btnSpin = document.getElementById('btn-spin');
  let spin = true;
  btnSpin.addEventListener('click', () => {
    spin = !spin;
    hero.setSpin(spin);
    btnSpin.classList.toggle('active', spin);
  });

  const heroObserver = new ResizeObserver(() => hero.resize());
  heroObserver.observe(heroCanvas.parentElement);

  const heroVisibility = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) hero.resume();
      else hero.pause();
    }
  }, { threshold: 0.01 });
  heroVisibility.observe(document.getElementById('hero'));

  const slots = renderGalleryCards(galleryGrid);
  await createGalleryRenderer(galleryGrid, slots);
}

main().catch((err) => {
  console.error('bev. showcase failed to start', err);
  const stage = document.querySelector('.hero-stage');
  if (stage) {
    stage.innerHTML = '<p style="padding:24px;font:14px sans-serif;color:#900">Could not start the 3D viewer. Check the console for details.</p>';
  }
});
