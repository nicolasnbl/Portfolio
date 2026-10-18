import * as THREE from 'three';
import { seededRandom } from './math.js';

export const PLANET_RADIUS = 32;

// Distances le long du trajet (en unités de la scène, depuis le sommet de la planète) où sont posés les éléments.
// Faire tourner la planète de `distance / PLANET_RADIUS` autour de Z amène l'élément au sommet, face à la caméra.
export const PATH = {
  solar: 0,
  landStart: 7,
  treesStart: 8,
  treesEnd: 14,
  pad: 16,
  landEnd: 19,
};

const UP = new THREE.Vector3(0, 1, 0);

// Direction de la surface pour une distance `s` le long du trajet et un décalage latéral `w`.
function surfaceDir(s, w = 0) {
  const a = s / PLANET_RADIUS;
  const b = w / PLANET_RADIUS;
  return new THREE.Vector3(Math.sin(a) * Math.cos(b), Math.cos(a) * Math.cos(b), Math.sin(b));
}

function placeOnSurface(parent, obj, s, w = 0, lift = 0) {
  const dir = surfaceDir(s, w);
  obj.position.copy(dir).multiplyScalar(PLANET_RADIUS + lift);
  obj.quaternion.setFromUnitVectors(UP, dir);
  parent.add(obj);
}

const flat = (color, extra = {}) =>
  new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.85, ...extra });

function isLand(dir) {
  const s = Math.atan2(dir.x, dir.y) * PLANET_RADIUS;
  const w = Math.asin(THREE.MathUtils.clamp(dir.z, -1, 1)) * PLANET_RADIUS;

  // Le continent du trajet : de la forêt jusqu'au pas de tir.
  const start = PATH.landStart + 0.4 * (1 + Math.sin(w * 0.56));
  const end = PATH.landEnd + 1.3 * Math.sin(w * 0.3 + 1);
  const halfWidth = 6.5 + 1.5 * Math.sin(s * 0.7);
  if (s > start && s < end && Math.abs(w) < halfWidth) return true;

  // D'autres terres ailleurs, pour que la planète se lise de loin. Autour de la centrale, de l'eau à perte de vue.
  if (Math.abs(s - PATH.solar) < 24 && Math.abs(w) < 30) return false;
  const n =
    Math.sin(dir.x * 3.1 + 0.7) * Math.cos(dir.y * 2.3) +
    Math.sin(dir.z * 3.7 + dir.x * 1.3) * 0.8 +
    Math.cos(dir.y * 4.1 - dir.z * 2.2) * 0.5;
  return n > 0.75;
}

function buildGlobe() {
  const geometry = new THREE.IcosahedronGeometry(PLANET_RADIUS, 36);
  const pos = geometry.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const rand = seededRandom(7);
  const water = [new THREE.Color('#3aa6dd'), new THREE.Color('#4bb4e6'), new THREE.Color('#329bd2')];
  const land = [new THREE.Color('#7ccb6a'), new THREE.Color('#6dbd5e'), new THREE.Color('#88d377')];
  const center = new THREE.Vector3();
  const v = new THREE.Vector3();

  for (let i = 0; i < pos.count; i += 3) {
    center.set(0, 0, 0);
    for (let k = 0; k < 3; k++) center.add(v.fromBufferAttribute(pos, i + k));
    center.normalize();
    const palette = isLand(center) ? land : water;
    const color = palette[Math.floor(rand() * palette.length)];
    for (let k = 0; k < 3; k++) color.toArray(colors, (i + k) * 3);
  }

  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return new THREE.Mesh(geometry, flat('#ffffff', { vertexColors: true, roughness: 0.7 }));
}

// Face avant d'un panneau : cellules bleues séparées par un fin quadrillage clair.
function panelFaceTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 96;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#c9d3dc';
  ctx.fillRect(0, 0, 128, 96);
  ctx.fillStyle = '#1d3f9e';
  for (let x = 0; x < 4; x++) {
    for (let y = 0; y < 3; y++) ctx.fillRect(4 + x * 31, 4 + y * 30.5, 27, 27);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function buildSolarPlant() {
  const plant = new THREE.Group();
  const float = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.12, 1.8), flat('#e9eef2'));
  float.position.y = 0.06;
  plant.add(float);

  // Ordre des faces d'une BoxGeometry : +x, -x, +y (face avant du panneau), -y, +z, -z.
  const frameMat = flat('#9aa5ad', { metalness: 0.3 });
  const faceMat = new THREE.MeshStandardMaterial({ map: panelFaceTexture(), metalness: 0.3, roughness: 0.35 });
  const panelMats = [frameMat, frameMat, faceMat, frameMat, frameMat, frameMat];
  const panelGeo = new THREE.BoxGeometry(0.7, 0.04, 0.5);
  const postGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.2, 6);
  for (let x = 0; x < 3; x++) {
    for (let z = 0; z < 2; z++) {
      const panel = new THREE.Mesh(panelGeo, panelMats);
      panel.position.set(-0.8 + x * 0.8, 0.28, -0.4 + z * 0.8);
      // Inclinés vers +z, c'est-à-dire vers la caméra.
      panel.rotation.x = 0.45;
      plant.add(panel);
      const post = new THREE.Mesh(postGeo, frameMat);
      post.position.set(panel.position.x, 0.18, panel.position.z);
      plant.add(post);
    }
  }

  const buoyGeo = new THREE.SphereGeometry(0.1, 8, 6);
  const buoyMat = flat('#ff7a45');
  for (const [x, z] of [[-1.5, 1.1], [1.5, 1.1], [-1.5, -1.1], [1.5, -1.1]]) {
    const buoy = new THREE.Mesh(buoyGeo, buoyMat);
    buoy.position.set(x, 0.05, z);
    plant.add(buoy);
  }
  return plant;
}

function buildTree(rand) {
  const tree = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.35, 5), flat('#8a5a3b'));
  trunk.position.y = 0.17;
  const greens = ['#3f9b4f', '#2f8a46', '#4fae5a'];
  const crown = new THREE.Mesh(
    new THREE.ConeGeometry(0.32, 0.8, 6),
    flat(greens[Math.floor(rand() * greens.length)]),
  );
  crown.position.y = 0.7;
  tree.add(trunk, crown);
  tree.scale.setScalar(0.75 + rand() * 0.7);
  tree.rotation.y = rand() * Math.PI;
  return tree;
}

function buildLaunchPad() {
  const pad = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.35, 0.3, 10), flat('#b9c0c7'));
  base.position.y = 0.15;
  pad.add(base);

  const tower = new THREE.Mesh(new THREE.BoxGeometry(0.28, 3.8, 0.28), flat('#d4483b'));
  tower.position.set(-1.0, 2.05, 0);
  pad.add(tower);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.08, 0.12), flat('#d4483b'));
  arm.position.set(-0.68, 2.9, 0);
  pad.add(arm);
  return pad;
}

// Bouffées de fumée au décollage, animées par `updateSmoke`.
function buildSmoke(rand) {
  const smoke = new THREE.Group();
  const geo = new THREE.IcosahedronGeometry(0.35, 0);
  for (let i = 0; i < 14; i++) {
    const puff = new THREE.Mesh(
      geo,
      new THREE.MeshStandardMaterial({ color: '#f4f4f4', flatShading: true, transparent: true, opacity: 0 }),
    );
    const angle = (i / 14) * Math.PI * 2 + rand() * 0.3;
    puff.userData = { angle, speed: 0.8 + rand() * 0.6, rise: rand() * 0.5 };
    smoke.add(puff);
  }
  smoke.visible = false;
  return smoke;
}

export function buildPlanet({ treeCount = 46 } = {}) {
  const rand = seededRandom(42);
  const planet = new THREE.Group();
  planet.add(buildGlobe());

  // Halo d'atmosphère, surtout visible une fois dans l'espace.
  const atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(PLANET_RADIUS * 1.08, 48, 32),
    new THREE.MeshBasicMaterial({ color: '#8fd3ff', transparent: true, opacity: 0.18, side: THREE.BackSide }),
  );
  planet.add(atmosphere);

  placeOnSurface(planet, buildSolarPlant(), PATH.solar, 0, 0.02);

  for (let i = 0; i < treeCount; i++) {
    const s = PATH.treesStart + rand() * (PATH.treesEnd - PATH.treesStart);
    const w = (rand() - 0.5) * 9;
    placeOnSurface(planet, buildTree(rand), s, w);
  }

  const pad = buildLaunchPad();
  placeOnSurface(planet, pad, PATH.pad);
  const smoke = buildSmoke(rand);
  smoke.position.y = 0.35;
  pad.add(smoke);

  return { planet, pad, padTop: 0.3, smoke };
}

export function updateSmoke(smoke, p) {
  smoke.visible = p > 0 && p < 1;
  for (const puff of smoke.children) {
    const { angle, speed, rise } = puff.userData;
    const r = 0.6 + p * 2.6 * speed;
    puff.position.set(Math.cos(angle) * r, rise * p + p * 0.4, Math.sin(angle) * r);
    puff.scale.setScalar(0.6 + p * 1.8);
    puff.material.opacity = (1 - p) * 0.9;
  }
}
