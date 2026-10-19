import * as THREE from 'three';
import { CARD } from './clock.js';

// Carte provisoire d'une étape, en formes simples : logo, intitulé, rôle, dates, puis 2-3 réalisations chiffrées.
// Elle est dessinée dans une texture posée sur la face de la trotteuse.
const KIND = {
  experience: { label: 'Expérience', color: '#ffd89a' },
  formation: { label: 'Formation', color: '#9fd3ff' },
};

const PX = 2048; // résolution le long de la trotteuse

function roundRect(ctx, x, y, w, h, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
}

function drawHorizontal(ctx, w, h, entry, index, total) {
  const kind = KIND[entry.kind] ?? KIND.experience;
  const pad = 40;
  roundRect(ctx, 8, 8, w - 16, h - 16, 36, 'rgba(0, 0, 0, 0.14)');

  // Logo de l'entreprise ou de l'école.
  const r = (h - pad * 2) / 2 - 10;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
  ctx.beginPath();
  ctx.arc(pad + r + 10, h / 2, r, 0, Math.PI * 2);
  ctx.fill();

  // Intitulé, rôle, dates et type.
  const x = pad + r * 2 + 70;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.font = '700 40px "Space Grotesk", system-ui, sans-serif';
  ctx.textBaseline = 'top';
  ctx.fillText(`${String(index + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`, x, pad + 6);
  roundRect(ctx, x, pad + 70, 520 - (index % 2) * 90, 56, 14, 'rgba(255, 255, 255, 0.95)');
  roundRect(ctx, x, pad + 150, 380 + (index % 3) * 40, 34, 10, 'rgba(255, 255, 255, 0.6)');
  roundRect(ctx, x, h - pad - 46, 220, 46, 23, 'rgba(255, 255, 255, 0.85)');
  roundRect(ctx, x + 240, h - pad - 46, 240, 46, 23, kind.color);
  ctx.fillStyle = '#1d2433';
  ctx.font = '600 26px "Space Grotesk", system-ui, sans-serif';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.fillText(kind.label.toUpperCase(), x + 360, h - pad - 22);
  ctx.textAlign = 'left';

  // Séparateur, puis les réalisations : un chiffre en évidence et une ligne de texte.
  const sx = x + 640;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.fillRect(sx, pad, 4, h - pad * 2);
  const rows = 3 - (index % 2);
  const rowH = (h - pad * 2) / 3;
  for (let i = 0; i < rows; i++) {
    const y = pad + rowH * i + (rowH - 52) / 2 + ((3 - rows) * rowH) / 2;
    roundRect(ctx, sx + 50, y, 130, 52, 12, kind.color);
    roundRect(ctx, sx + 210, y + 12, 620 - ((i + index) % 3) * 110, 28, 10, 'rgba(255, 255, 255, 0.6)');
  }
}

function drawVertical(ctx, w, h, entry, index, total) {
  const kind = KIND[entry.kind] ?? KIND.experience;
  const pad = 36;
  roundRect(ctx, 8, 8, w - 16, h - 16, 36, 'rgba(0, 0, 0, 0.14)');
  const inner = w - pad * 2;

  ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
  ctx.beginPath();
  ctx.arc(w / 2, pad + inner / 2, inner / 2 - 20, 0, Math.PI * 2);
  ctx.fill();

  let y = pad + inner + 40;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.font = '700 40px "Space Grotesk", system-ui, sans-serif';
  ctx.textBaseline = 'top';
  ctx.fillText(`${String(index + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`, pad, y);
  y += 80;
  roundRect(ctx, pad, y, inner, 56, 14, 'rgba(255, 255, 255, 0.95)');
  y += 90;
  roundRect(ctx, pad, y, inner * 0.75, 34, 10, 'rgba(255, 255, 255, 0.6)');
  y += 70;
  roundRect(ctx, pad, y, inner * 0.7, 46, 23, 'rgba(255, 255, 255, 0.85)');
  y += 66;
  roundRect(ctx, pad, y, inner * 0.8, 46, 23, kind.color);
  ctx.fillStyle = '#1d2433';
  ctx.font = '600 24px "Space Grotesk", system-ui, sans-serif';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.fillText(kind.label.toUpperCase(), pad + inner * 0.4, y + 23);
  ctx.textAlign = 'left';

  y += 110;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.fillRect(pad, y, inner, 4);
  y += 60;
  const rows = 3 - (index % 2);
  for (let i = 0; i < rows; i++) {
    roundRect(ctx, pad, y, 130, 52, 12, kind.color);
    roundRect(ctx, pad, y + 76, inner * (0.95 - ((i + index) % 3) * 0.15), 28, 10, 'rgba(255, 255, 255, 0.6)');
    roundRect(ctx, pad, y + 122, inner * 0.6, 28, 10, 'rgba(255, 255, 255, 0.6)');
    y += 230;
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
  document.fonts?.load('700 40px "Space Grotesk"').then(draw, () => {});

  return {
    mesh,
    show(entry, index, total) {
      if (index === shown.index) return;
      shown = { entry, index, total };
      draw();
    },
  };
}
