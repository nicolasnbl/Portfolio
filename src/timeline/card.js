import * as THREE from 'three';
import { CARD } from './clock.js';

// Carte d'une étape : pastille avec le sigle, intitulé, rôle, lieu et dates, puis 2-3 réalisations avec un mot-clé
// en évidence. Elle est dessinée dans une texture posée sur la face de la trotteuse.
const KIND = {
  experience: { label: 'Expérience', color: '#ffd89a' },
  formation: { label: 'Formation', color: '#9fd3ff' },
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

function logo(ctx, entry, cx, cy, r) {
  ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = INK;
  ctx.font = `700 ${Math.round(r * 0.72)}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(entry.logo ?? '', cx, cy + r * 0.04);
  ctx.textAlign = 'left';
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

function drawHorizontal(ctx, w, h, entry, index, total) {
  const kind = KIND[entry.kind] ?? KIND.experience;
  const pad = 40;
  roundRect(ctx, 8, 8, w - 16, h - 16, 36, 'rgba(0, 0, 0, 0.14)');

  const r = (h - pad * 2) / 2 - 30;
  logo(ctx, entry, pad + r + 10, h / 2, r);

  // Intitulé, rôle, lieu et dates, type.
  const x = pad + r * 2 + 60;
  const colWidth = 640;
  ctx.textBaseline = 'top';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.font = `700 30px ${FONT}`;
  ctx.fillText(`${String(index + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`, x, pad + 4);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.97)';
  ctx.font = `700 50px ${FONT}`;
  let y = fillLines(ctx, wrap(ctx, entry.org, colWidth, 1), x, pad + 50, 58);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.font = `500 32px ${FONT}`;
  y = fillLines(ctx, wrap(ctx, entry.role, colWidth, 2), x, y + 10, 40);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.font = `500 28px ${FONT}`;
  fillLines(ctx, [`${entry.place} · ${entry.dates}`], x, y + 8, 34);
  kindPill(ctx, kind, x, h - pad - 46, 25);

  // Séparateur, puis les réalisations : le mot-clé en évidence et une ligne de texte.
  const sx = x + colWidth + 50;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.fillRect(sx, pad, 4, h - pad * 2);
  const items = entry.highlights ?? [];
  const rowH = (h - pad * 2) / 3;
  const textX = sx + 50;
  const textWidth = w - pad - 20 - textX;
  items.forEach((item, i) => {
    const y0 = pad + rowH * i + ((3 - items.length) * rowH) / 2 + 6;
    keyPill(ctx, item.key, textX, y0, kind.color, 26);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.font = `500 27px ${FONT}`;
    fillLines(ctx, wrap(ctx, item.text, textWidth, 2), textX, y0 + 54, 32);
  });
}

function drawVertical(ctx, w, h, entry, index, total) {
  const kind = KIND[entry.kind] ?? KIND.experience;
  const pad = 36;
  roundRect(ctx, 8, 8, w - 16, h - 16, 36, 'rgba(0, 0, 0, 0.14)');
  const inner = w - pad * 2;

  logo(ctx, entry, w / 2, pad + inner / 2, inner / 2 - 40);

  let y = pad + inner + 30;
  ctx.textBaseline = 'top';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.font = `700 32px ${FONT}`;
  ctx.fillText(`${String(index + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`, pad, y);
  y += 60;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.97)';
  ctx.font = `700 48px ${FONT}`;
  y = fillLines(ctx, wrap(ctx, entry.org, inner, 2), pad, y, 56);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.font = `500 32px ${FONT}`;
  y = fillLines(ctx, wrap(ctx, entry.role, inner, 3), pad, y + 14, 40);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.font = `500 28px ${FONT}`;
  y = fillLines(ctx, wrap(ctx, `${entry.place} · ${entry.dates}`, inner, 2), pad, y + 12, 34);
  kindPill(ctx, kind, pad, y + 24, 24);

  y += 130;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.fillRect(pad, y, inner, 4);
  y += 50;
  for (const item of entry.highlights ?? []) {
    keyPill(ctx, item.key, pad, y, kind.color, 28);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.font = `500 28px ${FONT}`;
    y = fillLines(ctx, wrap(ctx, item.text, inner, 5), pad, y + 64, 36) + 50;
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
    (vertical ? drawVertical : drawHorizontal)(ctx, canvas.width, canvas.height, shown.entry, shown.index, shown.total);
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
