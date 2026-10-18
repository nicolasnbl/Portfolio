import * as THREE from 'three';

const flat = (color, extra = {}) =>
  new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.6, ...extra });

const BODY_RADIUS = 0.32;
const BODY_HEIGHT = 2.2;
const FAIRING_HEIGHT = 0.85;

// Fusée en formes simples. L'origine est à la base des ailerons.
export function buildRocket() {
  const rocket = new THREE.Group();
  const bodyBase = 0.35;

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

  // Coiffe en deux moitiés, chacune articulée sur le bord du corps pour s'ouvrir comme une fleur.
  const fairingBase = bodyBase + BODY_HEIGHT;
  const fairingMat = flat('#e8e8e4', { side: THREE.DoubleSide });
  const halves = [0, Math.PI].map((thetaStart) => {
    const side = thetaStart === 0 ? 1 : -1;
    const hinge = new THREE.Group();
    hinge.position.set(side * BODY_RADIUS, fairingBase, 0);
    const half = new THREE.Mesh(
      new THREE.ConeGeometry(BODY_RADIUS, FAIRING_HEIGHT, 16, 1, false, thetaStart, Math.PI),
      fairingMat,
    );
    half.position.set(-side * BODY_RADIUS, FAIRING_HEIGHT / 2, 0);
    hinge.add(half);
    hinge.userData.side = side;
    rocket.add(hinge);
    return hinge;
  });

  // Point d'où sort le nom, caché dans la coiffe.
  const payload = new THREE.Mesh(
    new THREE.SphereGeometry(0.2, 16, 12),
    new THREE.MeshBasicMaterial({ color: '#fff6c2' }),
  );
  payload.position.y = fairingBase + 0.25;
  rocket.add(payload);

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

  return { rocket, halves, payload, flame, glow };
}

export function setFairingOpen(halves, p) {
  for (const hinge of halves) hinge.rotation.z = -hinge.userData.side * p * 1.25;
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
