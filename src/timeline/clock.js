import * as THREE from 'three';
import { TIMELINE } from '../config.js';

// Rayon du cadran : la trotteuse va jusqu'au bord.
export const DIAL_RADIUS = 20;
const S = DIAL_RADIUS / 20; // échelle des détails (lunette, couronne, aiguilles), réglés pour un rayon de 20

// Sens de rotation de la trotteuse d'une étape à l'autre : -1, antihoraire, on remonte le temps.
export const DIRECTION = TIMELINE.direction;

// Angle de chaque étape sur le cadran, compté dans le sens horaire depuis le 12.
export const ENTRY_ANGLES = TIMELINE.entries.map((_, i) => DIRECTION * THREE.MathUtils.degToRad(TIMELINE.stepAngle) * i);

// Premier plan, face à l'horloge : hauteur de la caméra au-dessus du cadran (paysage, portrait) et point visé,
// proportionnels au rayon. La transition de l'intro vers la timeline reprend ce cadrage.
export const OPENING_VIEW = {
  height: DIAL_RADIUS * 3.8,
  portraitHeight: DIAL_RADIUS * 6.2,
  lookZ: -DIAL_RADIUS * 0.06,
};

// Trotteuse : une barre épaisse aux arêtes arrondies, posée au-dessus du cadran, qui va presque jusqu'au bord.
// Dans son repère, elle pointe vers -z (vers le 12 quand elle n'a pas tourné) ; la face +x, côté où elle avance,
// porte la carte de la timeline. Distances le long de la trotteuse comptées depuis le centre, vers la pointe.
export const HAND = {
  halfWidth: 0.35, // demi-largeur de la barre, arrondi en plus : 0,9 en tout, comme l'aiguille des heures
  height: 2.0, // hauteur de la face plate
  bevel: 0.1, // arrondi des arêtes, sur le côté
  bevelHeight: 0.12, // arrondi des arêtes, en haut et en bas
  base: 0.4, // hauteur du dessous de la trotteuse au-dessus du cadran
  shoulder: DIAL_RADIUS - 1, // fin de la partie droite
  tip: DIAL_RADIUS - 0.25, // pointe, juste avant le bord intérieur de la lunette
  tail: 1.6, // centre du contrepoids
  tailRadius: 1.0,
};

// Zone de la face où s'affiche la carte, le long de la trotteuse : vers la pointe, là où passent les chiffres.
export const CARD = {
  near: -(DIAL_RADIUS - 9.8),
  far: -(DIAL_RADIUS - 2.1),
  height: 1.84,
};
CARD.length = CARD.near - CARD.far;
CARD.center = new THREE.Vector3(
  HAND.halfWidth + HAND.bevel,
  HAND.base + HAND.bevelHeight + HAND.height / 2,
  (CARD.near + CARD.far) / 2,
);

const flat = (color, extra = {}) =>
  new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.6, ...extra });

// Position sur le cadran pour un angle compté dans le sens horaire depuis le 12.
const onDial = (angle, radius, y = 0) =>
  new THREE.Vector3(Math.sin(angle) * radius, y, -Math.cos(angle) * radius);

function dialTexture() {
  const size = 2048;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const c = size / 2;
  const draw = () => {
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = '#f4efe4';
    ctx.beginPath();
    ctx.arc(c, c, c, 0, Math.PI * 2);
    ctx.fill();

    // Graduations : une par seconde, plus marquées à chaque heure.
    ctx.strokeStyle = '#1d2433';
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * Math.PI * 2;
      const hour = i % 5 === 0;
      const r0 = c * (hour ? 0.86 : 0.9);
      const r1 = c * 0.96;
      ctx.lineWidth = hour ? 18 : 6;
      ctx.beginPath();
      ctx.moveTo(c + Math.sin(a) * r0, c - Math.cos(a) * r0);
      ctx.lineTo(c + Math.sin(a) * r1, c - Math.cos(a) * r1);
      ctx.stroke();
    }

    // Chiffres couchés le long du cercle : ils se lisent droits depuis la caméra posée à côté de la trotteuse.
    ctx.fillStyle = '#1d2433';
    ctx.font = '700 170px "Space Grotesk", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let h = 1; h <= 12; h++) {
      const a = (h / 12) * Math.PI * 2;
      ctx.save();
      ctx.translate(c + Math.sin(a) * c * 0.7, c - Math.cos(a) * c * 0.7);
      ctx.rotate(a - Math.PI / 2);
      ctx.fillText(String(h), 0, 12);
      ctx.restore();
    }
    texture.needsUpdate = true;
  };
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  draw();
  // Redessine une fois la police chargée.
  document.fonts?.load('700 170px "Space Grotesk"').then(draw, () => {});
  return texture;
}

// Contour de la trotteuse vu de dessus (x sur le côté, y vers la pointe) : contrepoids rond, barre, pointe effilée.
function secondHandOutline() {
  const { halfWidth: w, shoulder, tip, tail, tailRadius: r } = HAND;
  const neck = Math.sqrt(r * r - w * w); // là où la barre rejoint le contrepoids
  const side = Math.atan2(neck, w);
  const shape = new THREE.Shape();
  shape.moveTo(w, shoulder);
  shape.lineTo(0.12, tip);
  shape.lineTo(-0.12, tip);
  shape.lineTo(-w, shoulder);
  shape.lineTo(-w, -tail + neck);
  shape.absarc(0, -tail, r, Math.PI - side, Math.PI * 2 + side, false);
  shape.lineTo(w, shoulder);
  return shape;
}

function buildSecondHand() {
  const hand = new THREE.Group();
  const geometry = new THREE.ExtrudeGeometry(secondHandOutline(), {
    depth: HAND.height,
    bevelEnabled: true,
    bevelThickness: HAND.bevelHeight,
    bevelSize: HAND.bevel,
    bevelSegments: 3,
    curveSegments: 32,
  });
  // Le contour est dans le plan XY, extrudé selon +z : on le couche, la pointe vers -z et l'épaisseur vers le haut.
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, HAND.base + HAND.bevelHeight, 0);
  const bar = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: '#d4483b', roughness: 0.45 }));
  hand.add(bar);

  // Axe central : un chapeau rouge foncé surmonté d'une goupille dorée.
  const top = HAND.base + HAND.height + HAND.bevelHeight * 2;
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.85, 0.35, 32), flat('#b83a2f'));
  cap.position.y = top + 0.17;
  const pin = new THREE.Mesh(
    new THREE.CylinderGeometry(0.32, 0.32, 0.2, 24),
    new THREE.MeshStandardMaterial({ color: '#d9a441', metalness: 0.6, roughness: 0.35 }),
  );
  pin.position.y = top + 0.44;
  hand.add(cap, pin);
  return hand;
}

// Profil de la lunette et du boîtier (rayon, hauteur), tourné autour de l'axe : un mur intérieur qui monte du
// cadran, un dessus arrondi, puis le flanc du boîtier jusqu'au fond, à 1,4 sous le cadran.
function bezelProfile() {
  const R = DIAL_RADIUS;
  const points = [
    [R - 0.02, -0.02],
    [R, 1.2 * S],
    [R + 0.18 * S, 1.6 * S],
  ];
  // Dessus en demi-rond.
  const steps = 10;
  for (let i = 0; i <= steps; i++) {
    const a = Math.PI * (1 - i / steps);
    points.push([R + (1.1 + Math.cos(a) * 0.92) * S, (1.6 + Math.sin(a) * 0.45) * S]);
  }
  points.push([R + 2.1 * S, 1.3 * S], [R + 2.25 * S, 0.9 * S], [R + 2.25 * S, -1.2], [R + 2.05 * S, -1.4], [0, -1.4]);
  return points.map(([x, y]) => new THREE.Vector2(x, y));
}

function buildFlatHand(length, width, y, color) {
  const pivot = new THREE.Group();
  const bar = new THREE.Mesh(new THREE.BoxGeometry(width, 0.1, length + 1), flat(color));
  bar.position.set(0, y, -length / 2 + 0.5);
  pivot.add(bar);
  return pivot;
}

// Horloge en formes simples, cadran à plat dans le plan XZ, le 12 vers -z. Les étapes viennent de la config.
export function buildClock() {
  const clock = new THREE.Group();

  const bezel = new THREE.Mesh(
    new THREE.LatheGeometry(bezelProfile(), 160),
    new THREE.MeshStandardMaterial({ color: '#3a4358', metalness: 0.5, roughness: 0.35, side: THREE.DoubleSide }),
  );
  clock.add(bezel);

  // Filet doré au pied du mur intérieur.
  const bead = new THREE.Mesh(
    new THREE.TorusGeometry(DIAL_RADIUS - 0.04, 0.07, 8, 160),
    new THREE.MeshStandardMaterial({ color: '#d9a441', metalness: 0.6, roughness: 0.35 }),
  );
  bead.rotation.x = Math.PI / 2;
  bead.position.y = 0.05;
  clock.add(bead);

  const dial = new THREE.Mesh(
    new THREE.CircleGeometry(DIAL_RADIUS, 128),
    new THREE.MeshStandardMaterial({ map: dialTexture(), roughness: 0.9 }),
  );
  dial.rotation.x = -Math.PI / 2;
  clock.add(dial);

  // Couronne et poussoir, à 12 h : un chronomètre.
  const crown = new THREE.Group();
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.75 * S, 0.75 * S, 2 * S, 16), flat('#3a4358', { metalness: 0.4 }));
  stem.rotation.x = Math.PI / 2;
  stem.position.z = -(DIAL_RADIUS + 2.9 * S);
  const knob = new THREE.Mesh(new THREE.CylinderGeometry(1.7 * S, 1.7 * S, 1.2 * S, 24), flat('#d4483b'));
  knob.rotation.x = Math.PI / 2;
  knob.position.z = -(DIAL_RADIUS + 4.3 * S);
  crown.add(stem, knob);
  crown.position.y = -0.3;
  clock.add(crown);

  // Arc de progression le long du bord, du 12 jusqu'à l'étape courante, dans le sens de rotation des étapes.
  const segments = 360;
  const arc = new THREE.Mesh(
    new THREE.RingGeometry(DIAL_RADIUS * 0.965, DIAL_RADIUS * 0.995, segments, 1, (-DIRECTION * Math.PI) / 2, Math.PI * 2),
    new THREE.MeshBasicMaterial({ color: '#ffb347', side: THREE.DoubleSide }),
  );
  // Couché à +90°, l'angle de l'anneau augmente dans le sens horaire vu d'en haut ; à -90°, dans le sens antihoraire.
  arc.rotation.x = (DIRECTION * Math.PI) / 2;
  arc.position.y = 0.02;
  arc.geometry.setDrawRange(0, 0);
  clock.add(arc);
  const setProgress = (angle) => {
    const k = THREE.MathUtils.clamp(angle / (Math.PI * 2), 0, 1);
    arc.geometry.setDrawRange(0, Math.round(k * segments) * 6);
  };

  // Un repère par étape de la timeline, au bord du cadran.
  const markerGeo = new THREE.CylinderGeometry(0.6 * S, 0.6 * S, 0.12, 20);
  const markers = ENTRY_ANGLES.map((angle) => {
    const marker = new THREE.Mesh(markerGeo, flat('#ffb347', { emissive: '#ffb347', emissiveIntensity: 0 }));
    marker.position.copy(onDial(angle, DIAL_RADIUS * 0.8, 0.06));
    clock.add(marker);
    return marker;
  });

  // Heures et minutes figées sur 10 h 10, sous la trotteuse.
  const hourHand = buildFlatHand(10 * S, 0.9 * S, 0.1, '#1d2433');
  hourHand.rotation.y = -((10 + 10 / 60) / 12) * Math.PI * 2;
  const minuteHand = buildFlatHand(15.2 * S, 0.6 * S, 0.24, '#1d2433');
  minuteHand.rotation.y = -(10 / 60) * Math.PI * 2;
  clock.add(hourHand, minuteHand);

  const hand = buildSecondHand();
  clock.add(hand);

  return { clock, hand, markers, setProgress };
}
