import * as THREE from 'three';

const flat = (color, extra = {}) =>
  new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.6, ...extra });

const BODY_RADIUS = 0.32;
const BODY_HEIGHT = 2.2;
const FAIRING_HEIGHT = 1.2;
const BODY_BASE = 0.35;
const FAIRING_BASE = BODY_BASE + BODY_HEIGHT;

// Repères le long de la fusée, depuis sa base : centre de la coiffe et pointe.
export const FAIRING_CENTER = FAIRING_BASE + FAIRING_HEIGHT * 0.45;
export const FAIRING_TIP = FAIRING_BASE + FAIRING_HEIGHT;

// Profil d'une coiffe en ogive : une partie droite puis un nez arrondi.
function fairingProfile() {
  const points = [new THREE.Vector2(BODY_RADIUS, 0), new THREE.Vector2(BODY_RADIUS, 0.4)];
  const steps = 7;
  for (let i = 1; i <= steps; i++) {
    const k = i / steps;
    points.push(new THREE.Vector2(BODY_RADIUS * Math.sqrt(1 - k * k), 0.4 + k * (FAIRING_HEIGHT - 0.4)));
  }
  return points;
}

// Le satellite : un corps doré et deux ailes de panneaux solaires, montées sur pivots pour se déplier.
export function buildSatellite() {
  const satellite = new THREE.Group();
  satellite.add(new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.26, 0.2), flat('#d9a441', { metalness: 0.5, roughness: 0.4 })));
  const wingGeo = new THREE.BoxGeometry(0.34, 0.015, 0.14);
  const wingMat = flat('#1d3f9e', { metalness: 0.3, roughness: 0.35 });
  const wings = [1, -1].map((side) => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.1, 0.13, 0);
    const wing = new THREE.Mesh(wingGeo, wingMat);
    wing.position.x = side * 0.17;
    pivot.add(wing);
    pivot.userData.side = side;
    satellite.add(pivot);
    return pivot;
  });
  return { satellite, wings };
}

// Fusée en formes simples. L'origine est à la base des ailerons.
export function buildRocket() {
  const rocket = new THREE.Group();
  const bodyBase = BODY_BASE;

  const body = new THREE.Mesh(new THREE.CylinderGeometry(BODY_RADIUS, BODY_RADIUS, BODY_HEIGHT, 16), flat('#f5f5f2'));
  body.position.y = bodyBase + BODY_HEIGHT / 2;
  rocket.add(body);

  const band = new THREE.Mesh(new THREE.CylinderGeometry(BODY_RADIUS + 0.01, BODY_RADIUS + 0.01, 0.18, 16), flat('#d4483b'));
  band.position.y = bodyBase + BODY_HEIGHT * 0.72;
  rocket.add(band);

  const window_ = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.1, 0.05, 12),
    flat('#2a6fdb', { emissive: '#2a6fdb', emissiveIntensity: 0.4 }),
  );
  window_.rotation.x = Math.PI / 2;
  window_.position.set(0, bodyBase + BODY_HEIGHT * 0.45, BODY_RADIUS);
  rocket.add(window_);

  const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.28, 0.35, 12), flat('#4b5157'));
  nozzle.position.y = bodyBase - 0.17;
  rocket.add(nozzle);

  const finGeo = new THREE.BoxGeometry(0.05, 0.55, 0.4);
  const finMat = flat('#d4483b');
  for (let i = 0; i < 3; i++) {
    const pivot = new THREE.Group();
    pivot.rotation.y = (i / 3) * Math.PI * 2;
    const fin = new THREE.Mesh(finGeo, finMat);
    fin.position.set(0, bodyBase + 0.25, BODY_RADIUS + 0.18);
    fin.rotation.y = Math.PI / 2;
    pivot.add(fin);
    rocket.add(pivot);
  }

  // Coiffe en deux moitiés, chacune articulée à sa base. La jointure est dans le plan YZ du groupe :
  // en tournant le groupe autour de l'axe de la fusée, on la présente face à la caméra.
  const fairing = new THREE.Group();
  rocket.add(fairing);
  const fairingMat = flat('#ecece8', { side: THREE.DoubleSide });
  const profile = fairingProfile();
  const halves = [0, Math.PI].map((phiStart) => {
    const side = phiStart === 0 ? 1 : -1;
    const hinge = new THREE.Group();
    hinge.position.set(side * BODY_RADIUS, FAIRING_BASE, 0);
    const half = new THREE.Mesh(new THREE.LatheGeometry(profile, 8, phiStart, Math.PI), fairingMat);
    half.position.x = -side * BODY_RADIUS;
    hinge.add(half);
    hinge.userData.side = side;
    fairing.add(hinge);
    return hinge;
  });

  // Dessus du dernier étage, visible une fois la coiffe ouverte.
  const adapter = new THREE.Mesh(new THREE.CylinderGeometry(0.22, BODY_RADIUS, 0.1, 16), flat('#9aa5ad', { metalness: 0.3 }));
  adapter.position.y = FAIRING_BASE + 0.05;
  rocket.add(adapter);

  // Charge utile : un petit satellite, ailes repliées tant que la coiffe est fermée.
  const { satellite: payload, wings } = buildSatellite();
  payload.position.y = FAIRING_BASE + 0.25;
  fairing.add(payload);

  const flame = new THREE.Mesh(
    new THREE.ConeGeometry(0.22, 1.1, 10, 1, true),
    new THREE.MeshBasicMaterial({ color: '#ffb347', transparent: true, opacity: 0.9 }),
  );
  flame.rotation.x = Math.PI;
  flame.position.y = bodyBase - 0.35 - 0.55;
  flame.visible = false;
  rocket.add(flame);

  const glow = new THREE.PointLight('#ffa040', 0, 6);
  glow.position.y = -0.4;
  rocket.add(glow);

  return { rocket, fairing, halves, payload, wings, flame, glow };
}

// open : ouverture des deux moitiés (0 à 1). away : elles se détachent puis partent en arrière en tournoyant,
// pendant que le satellite déplie ses ailes.
export function setFairingOpen(parts, open, away = 0) {
  for (const hinge of parts.halves) {
    const { side } = hinge.userData;
    hinge.rotation.z = -side * (open * 0.6 + away * 1.6);
    hinge.position.x = side * (BODY_RADIUS + away * 1.8);
    hinge.position.y = FAIRING_BASE - away * 5;
    hinge.visible = away < 1;
  }
  for (const pivot of parts.wings) pivot.rotation.z = pivot.userData.side * (Math.PI / 2) * (1 - Math.sqrt(away));
}

export function setThrust(parts, on, time) {
  parts.flame.visible = on;
  if (!on) {
    parts.glow.intensity = 0;
    return;
  }
  const flicker = 0.85 + 0.15 * Math.sin(time * 60) + 0.1 * Math.sin(time * 23);
  parts.flame.scale.set(1, flicker * 1.3, 1);
  parts.glow.intensity = 6 * flicker;
}
