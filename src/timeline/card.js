import * as THREE from 'three';
import { CARD } from './clock.js';
import { pick } from '../i18n/lang.js';

// Carte d'une étape : logo, intitulé, rôle, lieu et dates, puis 2-3 réalisations avec un mot-clé
// en évidence. Elle est dessinée dans une texture posée sur la face de la trotteuse.
const KIND = {
  experience: { label: pick('Expérience', 'Experience'), color: '#ffd89a' },
  formation: { label: pick('Formation', 'Education'), color: '#9fd3ff' },
};

const PX = 2048; // résolution le long de la trotteuse
const FONT = '"Space Grotesk", system-ui, sans-serif';
const INK = '#1d2433';

function roundRect(ctx, x, y, w, h, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
}

// Coupe le texte en lignes de largeur maximale ; la dernière ligne autorisée finit par une ellipse si ça déborde.
function wrap(ctx, text, maxWidth, maxLines = Infinity) {
  const lines = [];
  let line = '';
  for (const word of text.split(' ')) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width <= maxWidth || !line) line = next;
    else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    lines.length = maxLines;
    let last = lines[maxLines - 1];
    while (last && ctx.measureText(`${last}…`).width > maxWidth) last = last.slice(0, -1);
    lines[maxLines - 1] = `${last.trimEnd()}…`;
  }
  return lines;
}

function fillLines(ctx, lines, x, y, lineHeight) {
  lines.forEach((line, i) => ctx.fillText(line, x, y + i * lineHeight));
  return y + lines.length * lineHeight;
}

// Logos chargés une fois ; la carte se redessine quand l'image arrive.
const logos = new Map();
function logoImage(src, onLoad) {
  let img = logos.get(src);
  if (!img) {
    img = new Image();
    img.src = src;
    logos.set(src, img);
  }
  if (!img.complete) img.addEventListener('load', onLoad, { once: true });
  return img;
}

function logo(ctx, entry, cx, cy, r, redraw) {
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  if (!entry.logo) return;
  const img = logoImage(entry.logo, redraw);
  if (!img.complete || !img.naturalWidth) return;
  // Le logo tient dans le carré inscrit dans le disque, avec une petite marge.
  const box = r * 1.3;
  const scale = Math.min(box / img.naturalWidth, box / img.naturalHeight);
  const w = img.naturalWidth * scale;
  const h = img.naturalHeight * scale;
  ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h);
}

// Pastille du mot-clé, à la largeur de son texte.
function keyPill(ctx, key, x, y, color, size) {
  ctx.font = `700 ${size}px ${FONT}`;
  const width = ctx.measureText(key).width + size * 1.1;
  roundRect(ctx, x, y, width, size * 1.7, size * 0.4, color);
  ctx.fillStyle = INK;
  ctx.textBaseline = 'middle';
  ctx.fillText(key, x + size * 0.55, y + size * 0.87);
  ctx.textBaseline = 'top';
  return width;
}

function kindPill(ctx, kind, x, y, size) {
  ctx.font = `600 ${size}px ${FONT}`;
  const label = kind.label.toUpperCase();
  const width = ctx.measureText(label).width + size * 1.6;
  roundRect(ctx, x, y, width, size * 1.8, size * 0.9, kind.color);
  ctx.fillStyle = INK;
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + size * 0.8, y + size * 0.92);
  ctx.textBaseline = 'top';
}

function drawHorizontal(ctx, w, h, entry, index, total, redraw) {
  const kind = KIND[entry.kind] ?? KIND.experience;
  const pad = 40;
  roundRect(ctx, 8, 8, w - 16, h - 16, 36, 'rgba(0, 0, 0, 0.3)');

  const r = (h - pad * 2) / 2 - 30;
  logo(ctx, entry, pad + r + 10, h / 2, r, redraw);

  // Intitulé, rôle, lieu et dates, type.
  const x = pad + r * 2 + 60;
  const colWidth = 600;
  ctx.textBaseline = 'top';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.font = `700 30px ${FONT}`;
  ctx.fillText(`${String(index + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`, x, pad + 4);
  ctx.fillStyle = '#ffffff';
  ctx.font = `700 52px ${FONT}`;
  let y = fillLines(ctx, wrap(ctx, entry.org, colWidth, 1), x, pad + 48, 60);
  ctx.font = `500 36px ${FONT}`;
  y = fillLines(ctx, wrap(ctx, entry.role, colWidth, 2), x, y + 8, 42);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.font = `500 30px ${FONT}`;
  fillLines(ctx, [`${entry.place} · ${entry.dates}`], x, y + 8, 36);
  kindPill(ctx, kind, x, h - pad - 46, 25);

  // Séparateur, puis une ligne par réalisation : le mot-clé à gauche, le texte à droite sur deux lignes au plus.
  const sx = x + colWidth + 40;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.fillRect(sx, pad, 4, h - pad * 2);
  const items = entry.highlights ?? [];
  const rowH = (h - pad * 2) / 3;
  const pillX = sx + 40;
  const textX = pillX + 250;
  const textWidth = w - pad - 20 - textX;
  items.forEach((item, i) => {
    const mid = pad + rowH * i + ((3 - items.length) * rowH) / 2 + rowH / 2;
    keyPill(ctx, item.key, pillX, mid - 26, kind.color, 30);
    ctx.fillStyle = '#ffffff';
    ctx.font = `500 34px ${FONT}`;
    const lines = wrap(ctx, item.text, textWidth, 2);
    fillLines(ctx, lines, textX, mid - (lines.length * 40) / 2 + 2, 40);
  });
}

function drawVertical(ctx, w, h, entry, index, total, redraw) {
  const kind = KIND[entry.kind] ?? KIND.experience;
  const pad = 36;
  roundRect(ctx, 8, 8, w - 16, h - 16, 36, 'rgba(0, 0, 0, 0.3)');
  const inner = w - pad * 2;

  logo(ctx, entry, w / 2, pad + inner / 2, inner / 2 - 40, redraw);

  let y = pad + inner + 30;
  ctx.textBaseline = 'top';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.font = `700 32px ${FONT}`;
  ctx.fillText(`${String(index + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`, pad, y);
  y += 60;
  ctx.fillStyle = '#ffffff';
  ctx.font = `700 48px ${FONT}`;
  y = fillLines(ctx, wrap(ctx, entry.org, inner, 2), pad, y, 56);
  ctx.font = `500 34px ${FONT}`;
  y = fillLines(ctx, wrap(ctx, entry.role, inner, 3), pad, y + 14, 42);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.font = `500 30px ${FONT}`;
  y = fillLines(ctx, wrap(ctx, `${entry.place} · ${entry.dates}`, inner, 2), pad, y + 12, 36);
  kindPill(ctx, kind, pad, y + 24, 24);

  y += 130;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.fillRect(pad, y, inner, 4);
  y += 50;
  for (const item of entry.highlights ?? []) {
    keyPill(ctx, item.key, pad, y, kind.color, 28);
    ctx.fillStyle = '#ffffff';
    ctx.font = `500 31px ${FONT}`;
    y = fillLines(ctx, wrap(ctx, item.text, inner, 5), pad, y + 64, 38) + 50;
  }
}

// Plan texturé posé sur la face de la trotteuse. vertical : la carte se lit avec la trotteuse debout à l'écran
// (pointe en haut), pour les écrans en portrait.
export function buildCard(vertical) {
  const long = PX;
  const short = Math.round((PX * CARD.height) / CARD.length);
  const canvas = document.createElement('canvas');
  canvas.width = vertical ? short : long;
  canvas.height = vertical ? long : short;
  const ctx = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;

  const geometry = vertical
    ? new THREE.PlaneGeometry(CARD.height, CARD.length)
    : new THREE.PlaneGeometry(CARD.length, CARD.height);
  const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity: 0, depthWrite: false });
  const mesh = new THREE.Mesh(geometry, material);

  // Base du plan dans le repère de la trotteuse : la normale sort de la face +x.
  // À plat, la droite de la carte va vers la pointe (-z) ; debout, le haut de la carte va vers la pointe.
  const right = vertical ? new THREE.Vector3(0, -1, 0) : new THREE.Vector3(0, 0, -1);
  const up = vertical ? new THREE.Vector3(0, 0, -1) : new THREE.Vector3(0, 1, 0);
  const normal = new THREE.Vector3().crossVectors(right, up);
  mesh.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(right, up, normal));
  mesh.position.copy(CARD.center).add(new THREE.Vector3(0.01, 0, 0));

  let shown = { entry: null, index: -1, total: 0 };
  const draw = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (shown.index < 0) return;
    (vertical ? drawVertical : drawHorizontal)(ctx, canvas.width, canvas.height, shown.entry, shown.index, shown.total, draw);
    texture.needsUpdate = true;
  };
  if (document.fonts) {
    Promise.all([document.fonts.load('700 40px "Space Grotesk"'), document.fonts.load('500 40px "Space Grotesk"')]).then(draw, draw);
  }

  return {
    mesh,
    show(entry, index, total) {
      if (index === shown.index) return;
      shown = { entry, index, total };
      draw();
    },
  };
}
