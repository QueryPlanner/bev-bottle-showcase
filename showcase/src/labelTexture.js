// Builds the wrap-around label texture for a themed bottle.
//
// computeLabelLayout() is pure data — no canvas, no DOM — so it's the part
// that's actually worth unit testing. drawLabelTexture() just walks that data
// and calls canvas APIs; it isn't tested directly (see test/labelTexture.test.js
// for why), only exercised by loading the page in a browser.
//
// UV convention (must match jarGeometry.js's ringAt/loft): u = i/NSEG runs
// around the body starting from the +X axis; the geometry's "front" (the
// thumb-notch side) sits at u = 0.25. Text is centered there, 90° from the
// u=0/u=1 seam, so the seam only ever crosses plain band color.

const CREAM = '#F2EFE8';
const INK = '#0F131D';

function hexToRgb(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return { r: 0, g: 0, b: 0 };
  return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
}

// WCAG-ish relative luminance, enough to pick a readable text color.
export function relativeLuminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  const chan = (c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * chan(r) + 0.7152 * chan(g) + 0.0722 * chan(b);
}

export function pickTextColor(bgHex) {
  return relativeLuminance(bgHex) > 0.4 ? INK : '#FFFFFF';
}

export function isValidHexColor(hex) {
  return /^#[0-9a-f]{6}$/i.test(hex);
}

// Returns plain layout data: canvas size, the band's vertical extent in UV
// v-space (0 = base of body, 1 = seam), and a list of text/shape elements to
// draw, each already positioned in canvas pixel space.
export function computeLabelLayout(theme, opts = {}) {
  const width = opts.width || 2048;
  const height = opts.height || 1024;
  const centerX = width * 0.25; // matches the geometry's front, u = 0.25
  const bandVStart = 0.08;
  const bandVEnd = 0.87;
  const textColor = pickTextColor(theme.color);

  // v -> canvas y (v=1 is the seam, i.e. the top of the body, i.e. y=0)
  const yAt = (v) => (1 - v) * height;

  const elements = [
    { type: 'wordmark', x: centerX, y: yAt(0.775), size: height * 0.052, color: textColor },
    { type: 'text', text: 'WATER FLAVOUR ENHANCER', x: centerX, y: yAt(0.685), size: height * 0.028, weight: 700, letterSpacing: 0.08, color: textColor, font: 'label' },
    { type: 'pill', text: 'WITH ELECTROLYTES', x: centerX, y: yAt(0.615), size: height * 0.02, color: textColor },
    { type: 'text', text: theme.name.toUpperCase(), x: centerX, y: yAt(0.46), size: height * 0.145, weight: 900, color: textColor, font: 'display' },
    { type: 'text', text: theme.flavor, x: centerX, y: yAt(0.31), size: height * 0.032, weight: 600, letterSpacing: 0.05, color: textColor, font: 'label' },
    { type: 'rule', x: centerX, y: yAt(0.24), width: width * 0.14, color: textColor },
    { type: 'text', text: theme.documented ? theme.pillar.toUpperCase() : 'SECONDARY PALETTE', x: centerX, y: yAt(0.175), size: height * 0.022, weight: 700, letterSpacing: 0.1, color: textColor, font: 'label' },
  ];

  return {
    width,
    height,
    bandColor: theme.color,
    marginColor: CREAM,
    bandVStart,
    bandVEnd,
    textColor,
    elements,
  };
}

let fontsReady = null;
function ensureFonts() {
  if (!fontsReady) {
    fontsReady = Promise.all([
      document.fonts.load('900 100px Anton'),
      document.fonts.load('700 40px Poppins'),
      document.fonts.load('600 40px Poppins'),
    ]).catch(() => {});
  }
  return fontsReady;
}

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawWordmark(ctx, el) {
  const s = el.size;
  const pieceW = s * 0.62, pieceH = s * 0.82, gap = s * 0.14;
  const colors = ['#1C00FF', '#FE412E', '#FED403'];
  const totalPieces = pieceW * 3 + gap * 2;
  let px = el.x - (totalPieces + s * 2.1) / 2;
  const py = el.y - pieceH / 2;
  colors.forEach((c) => {
    ctx.fillStyle = c;
    roundRectPath(ctx, px, py, pieceW, pieceH, pieceW * 0.32);
    ctx.fill();
    px += pieceW + gap;
  });
  ctx.fillStyle = el.color;
  ctx.font = `700 ${s}px Poppins, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('bev.', px + s * 0.18, el.y + s * 0.02);
}

export async function drawLabelTexture(theme, THREE, opts = {}) {
  await ensureFonts();
  const layout = computeLabelLayout(theme, opts);
  const canvas = document.createElement('canvas');
  canvas.width = layout.width;
  canvas.height = layout.height;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = layout.marginColor;
  ctx.fillRect(0, 0, layout.width, layout.height);
  const bandY = (1 - layout.bandVEnd) * layout.height;
  const bandH = (layout.bandVEnd - layout.bandVStart) * layout.height;
  ctx.fillStyle = layout.bandColor;
  ctx.fillRect(0, bandY, layout.width, bandH);

  for (const el of layout.elements) {
    if (el.type === 'wordmark') {
      drawWordmark(ctx, el);
      continue;
    }
    if (el.type === 'rule') {
      ctx.strokeStyle = el.color;
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(el.x - el.width / 2, el.y);
      ctx.lineTo(el.x + el.width / 2, el.y);
      ctx.stroke();
      ctx.globalAlpha = 1;
      continue;
    }
    if (el.type === 'pill') {
      ctx.font = `700 ${el.size}px Poppins, sans-serif`;
      const padX = el.size * 0.9, padY = el.size * 0.55;
      const w = ctx.measureText(el.text).width + padX * 2;
      const h = el.size + padY * 1.4;
      ctx.strokeStyle = el.color;
      ctx.globalAlpha = 0.65;
      ctx.lineWidth = 2;
      roundRectPath(ctx, el.x - w / 2, el.y - h / 2, w, h, h / 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillStyle = el.color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(el.text, el.x, el.y + el.size * 0.04);
      continue;
    }
    // text
    const family = el.font === 'display' ? 'Anton' : 'Poppins';
    ctx.font = `${el.weight || 400} ${el.size}px ${family}, sans-serif`;
    ctx.fillStyle = el.color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (el.letterSpacing) {
      ctx.letterSpacing = `${el.letterSpacing * el.size}px`;
    }
    ctx.fillText(el.text, el.x, el.y);
    ctx.letterSpacing = '0px';
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}
