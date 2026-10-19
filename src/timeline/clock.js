import * as THREE from 'three';

export const DIAL_RADIUS = 10;

// Trotteuse : une barre épaisse posée au-dessus du cadran. Dans son repère, elle pointe vers -z (vers le 12
// quand elle n'a pas tourné) ; la face +x, côté où elle avance, porte la carte de la timeline.
export const HAND = {
  width: 0.5,
  height: 1.5,
  base: 0.45, // hauteur du dessous de la trotteuse au-dessus du cadran
  tip: -9.2,
  tail: 1.6,
};

// Zone de la face où s'affiche la carte, le long de la trotteuse.
export const CARD = {
  near: -0.95,
  far: -8.85,
  height: 1.32,
};
CARD.length = CARD.near - CARD.far;
CARD.center = new THREE.Vector3(HAND.width / 2, HAND.base + HAND.height / 2, (CARD.near + CARD.far) / 2);

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

function buildSecondHand() {
  const hand = new THREE.Group();
  const red = flat('#d4483b');
  const length = HAND.tail - HAND.tip;
  const bar = new THREE.Mesh(new THREE.BoxGeometry(HAND.width, HAND.height, length), red);
  bar.position.set(0, HAND.base + HAND.height / 2, (HAND.tail + HAND.tip) / 2);
  hand.add(bar);

  // Contrepoids rond à l'arrière, comme sur une vraie trotteuse.
  const weight = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, HAND.height, 24), red);
  weight.position.set(0, HAND.base + HAND.height / 2, HAND.tail);
  hand.add(weight);

  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, HAND.height + 0.3, 24), flat('#b83a2f'));
  cap.position.y = HAND.base + HAND.height / 2 + 0.15;
  hand.add(cap);
  return hand;
}

function buildFlatHand(length, width, y, color) {
  const pivot = new THREE.Group();
  const bar = new THREE.Mesh(new THREE.BoxGeometry(width, 0.1, length + 1), flat(color));
  bar.position.set(0, y, -length / 2 + 0.5);
  pivot.add(bar);
  return pivot;
}

// Horloge en formes simples, cadran à plat dans le plan XZ, le 12 vers -z.
export function buildClock(entryAngles) {
  const clock = new THREE.Group();

  const body = new THREE.Mesh(new THREE.CylinderGeometry(DIAL_RADIUS + 0.7, DIAL_RADIUS + 0.9, 1.4, 96), flat('#2a3142'));
  body.position.y = -0.72;
  clock.add(body);

  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(DIAL_RADIUS + 0.35, 0.42, 12, 128),
    flat('#3a4358', { metalness: 0.4, roughness: 0.4 }),
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.1;
  clock.add(rim);

  const dial = new THREE.Mesh(
    new THREE.CircleGeometry(DIAL_RADIUS, 128),
    new THREE.MeshStandardMaterial({ map: dialTexture(), roughness: 0.9 }),
  );
  dial.rotation.x = -Math.PI / 2;
  clock.add(dial);

  // Couronne et poussoir, à 12 h : un chronomètre.
  const crown = new THREE.Group();
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 1.2, 16), flat('#3a4358', { metalness: 0.4 }));
  stem.rotation.x = Math.PI / 2;
  stem.position.z = -(DIAL_RADIUS + 1.2);
  const knob = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 0.7, 20), flat('#d4483b'));
  knob.rotation.x = Math.PI / 2;
  knob.position.z = -(DIAL_RADIUS + 2.0);
  crown.add(stem, knob);
  crown.position.y = -0.3;
  clock.add(crown);

  // Arc de progression le long du bord, du 12 jusqu'à l'étape courante.
  const segments = 360;
  const arc = new THREE.Mesh(
    new THREE.RingGeometry(DIAL_RADIUS * 0.965, DIAL_RADIUS * 0.995, segments, 1, -Math.PI / 2, Math.PI * 2),
    new THREE.MeshBasicMaterial({ color: '#ffb347', side: THREE.DoubleSide }),
  );
  // Rotation +90° : l'angle de l'anneau augmente dans le sens horaire vu d'en haut, comme les aiguilles.
  arc.rotation.x = Math.PI / 2;
  arc.position.y = 0.02;
  arc.geometry.setDrawRange(0, 0);
  clock.add(arc);
  const setProgress = (angle) => {
    const k = THREE.MathUtils.clamp(angle / (Math.PI * 2), 0, 1);
    arc.geometry.setDrawRange(0, Math.round(k * segments) * 6);
  };

  // Un repère par étape de la timeline, au bord du cadran.
  const markerGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.12, 16);
  const markers = entryAngles.map((angle) => {
    const marker = new THREE.Mesh(markerGeo, flat('#ffb347', { emissive: '#ffb347', emissiveIntensity: 0 }));
    marker.position.copy(onDial(angle, DIAL_RADIUS * 0.8, 0.06));
    clock.add(marker);
    return marker;
  });

  // Heures et minutes figées sur 10 h 10, sous la trotteuse.
  const hourHand = buildFlatHand(5, 0.55, 0.1, '#1d2433');
  hourHand.rotation.y = -((10 + 10 / 60) / 12) * Math.PI * 2;
  const minuteHand = buildFlatHand(7.6, 0.38, 0.24, '#1d2433');
  minuteHand.rotation.y = -(10 / 60) * Math.PI * 2;
  clock.add(hourHand, minuteHand);

  const hand = buildSecondHand();
  clock.add(hand);

  return { clock, hand, markers, setProgress };
}
