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
  placeAtDir(parent, obj, surfaceDir(s, w), lift);
}

function placeAtDir(parent, obj, dir, lift = 0) {
  obj.position.copy(dir).multiplyScalar(PLANET_RADIUS + lift);
  obj.quaternion.setFromUnitVectors(UP, dir);
  parent.add(obj);
}

const flat = (color, extra = {}) =>
  new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.85, ...extra });

// continents : terres supplémentaires, chacune un disque aux bords irréguliers autour de `dir` (repère de la planète).
function isLand(dir, continents) {
  for (const { dir: center, radius } of continents) {
    const edge = radius * (1 + 0.18 * Math.sin(dir.x * 9 + dir.z * 5) + 0.1 * Math.cos(dir.y * 13));
    if (dir.angleTo(center) < edge) return true;
  }
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

function buildGlobe(continents) {
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
    const palette = isLand(center, continents) ? land : water;
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

// Maison aux murs clairs, toit en pyramide dont le pan avant porte des panneaux solaires.
function buildSolarHouse() {
  const house = new THREE.Group();
  const size = 1.3;
  const wallHeight = 0.85;
  const walls = new THREE.Mesh(new THREE.BoxGeometry(size, wallHeight, size), flat('#f2ede4'));
  walls.position.y = wallHeight / 2;
  house.add(walls);
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.5, 0.04), flat('#8a5a3b'));
  door.position.set(-0.3, 0.25, size / 2 + 0.01);
  const window_ = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.26, 0.04), flat('#9fd4f0', { roughness: 0.3 }));
  window_.position.set(0.28, 0.5, size / 2 + 0.01);
  house.add(door, window_);

  // Pyramide à 4 pans tournée de 45° pour que ses arêtes tombent sur les coins des murs.
  const roofHeight = 0.6;
  const half = size / 2 + 0.08;
  const roof = new THREE.Mesh(new THREE.ConeGeometry(half * Math.SQRT2, roofHeight, 4), flat('#b5523b'));
  roof.rotation.y = Math.PI / 4;
  roof.position.y = wallHeight + roofHeight / 2;
  house.add(roof);

  // Panneaux sur le pan tourné vers +z, posés parallèlement à sa pente.
  const slope = Math.atan2(roofHeight, half);
  const frameMat = flat('#9aa5ad', { metalness: 0.3 });
  const faceMat = new THREE.MeshStandardMaterial({ map: panelFaceTexture(), metalness: 0.3, roughness: 0.35 });
  const panels = new THREE.Mesh(new THREE.BoxGeometry(half * 0.9, 0.03, (half * 0.62) / Math.cos(slope)), [
    frameMat, frameMat, faceMat, frameMat, frameMat, frameMat,
  ]);
  panels.rotation.x = slope;
  // Au tiers bas du pan, décollés de sa surface de l'épaisseur du panneau.
  const along = 0.36;
  panels.position.set(0, wallHeight + roofHeight * (1 - along), half * along);
  panels.position.addScaledVector(new THREE.Vector3(0, Math.cos(slope), Math.sin(slope)), 0.03);
  house.add(panels);
  return house;
}

// Grand champ de panneaux en rangées, en une seule géométrie instanciée. Le sol suit la courbure de la planète.
function buildSolarField() {
  const field = new THREE.Group();
  const rows = 6;
  const cols = 8;
  const frameMat = flat('#9aa5ad', { metalness: 0.3 });
  const faceMat = new THREE.MeshStandardMaterial({ map: panelFaceTexture(), metalness: 0.3, roughness: 0.35 });
  const panels = new THREE.InstancedMesh(new THREE.BoxGeometry(0.7, 0.04, 0.48), [
    frameMat, frameMat, faceMat, frameMat, frameMat, frameMat,
  ], rows * cols);
  const posts = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.03, 0.03, 0.3, 5), frameMat, rows * cols);
  const dummy = new THREE.Object3D();
  let i = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = (c - (cols - 1) / 2) * 0.82;
      const z = (r - (rows - 1) / 2) * 0.78;
      const sag = (x * x + z * z) / (2 * PLANET_RADIUS);
      dummy.position.set(x, 0.32 - sag, z);
      dummy.rotation.set(0.5, 0, 0);
      dummy.updateMatrix();
      panels.setMatrixAt(i, dummy.matrix);
      dummy.position.set(x, 0.15 - sag, z);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      posts.setMatrixAt(i, dummy.matrix);
      i++;
    }
  }
  field.add(panels, posts);
  return field;
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

// Direction voisine de `base` : à `dist` radians de lui, dans la direction `azimuth` autour de lui.
function offsetDir(base, azimuth, dist) {
  const side = new THREE.Vector3(1, 0, 0).cross(base).normalize();
  return base.clone().applyAxisAngle(side, dist).applyAxisAngle(base, azimuth);
}

const HOUSE_AZIMUTH = 2.3;
const FIELD_AZIMUTH = -0.9;

// clockDir : direction (repère de la planète) d'un continent portant l'horloge de la timeline, une maison solaire,
// un champ photovoltaïque et quelques arbres.
// Renvoie aussi `elements` : les éléments que l'on peut viser en explorant la planète, avec leur point d'ancrage.
export function buildPlanet({ treeCount = 46, clockDir = null } = {}) {
  const rand = seededRandom(42);
  const planet = new THREE.Group();
  const continents = clockDir ? [{ dir: clockDir, radius: 0.42 }] : [];
  const globe = buildGlobe(continents);
  planet.add(globe);

  // Halo d'atmosphère, surtout visible une fois dans l'espace.
  const atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(PLANET_RADIUS * 1.08, 48, 32),
    new THREE.MeshBasicMaterial({ color: '#8fd3ff', transparent: true, opacity: 0.18, side: THREE.BackSide }),
  );
  planet.add(atmosphere);

  const solar = buildSolarPlant();
  placeOnSurface(planet, solar, PATH.solar, 0, 0.02);

  // Les arbres du trajet, réunis en une forêt.
  const forest = new THREE.Group();
  planet.add(forest);
  for (let i = 0; i < treeCount; i++) {
    const s = PATH.treesStart + rand() * (PATH.treesEnd - PATH.treesStart);
    const w = (rand() - 0.5) * 9;
    placeOnSurface(forest, buildTree(rand), s, w);
  }

  const pad = buildLaunchPad();
  placeOnSurface(planet, pad, PATH.pad);
  const smoke = buildSmoke(rand);
  smoke.position.y = 0.35;
  pad.add(smoke);

  const elements = [
    { key: 'solar', root: solar, anchor: solar.position.clone() },
    { key: 'forest', root: forest, anchor: surfaceDir((PATH.treesStart + PATH.treesEnd) / 2).multiplyScalar(PLANET_RADIUS) },
    { key: 'pad', root: pad, anchor: pad.position.clone() },
  ];

  // Continent de l'horloge : l'emplacement de l'horloge au centre (elle est construite à la demande), la maison
  // et le champ à côté, des arbres en couronne autour.
  let clockSite = null;
  if (clockDir) {
    clockSite = new THREE.Group();
    placeAtDir(planet, clockSite, clockDir);

    const house = buildSolarHouse();
    placeAtDir(planet, house, offsetDir(clockDir, HOUSE_AZIMUTH, 0.22));
    house.rotateY(0.6);
    const field = buildSolarField();
    placeAtDir(planet, field, offsetDir(clockDir, FIELD_AZIMUTH, 0.27));
    field.rotateY(-0.4);

    for (let i = 0; i < 22; i++) {
      const azimuth = (i / 22) * Math.PI * 2 + rand() * 0.3;
      const near = (a) => Math.abs(Math.atan2(Math.sin(azimuth - a), Math.cos(azimuth - a))) < 0.55;
      if (near(HOUSE_AZIMUTH) || near(FIELD_AZIMUTH)) continue;
      placeAtDir(planet, buildTree(rand), offsetDir(clockDir, azimuth, 0.19 + rand() * 0.1));
    }

    elements.push(
      { key: 'clock', root: clockSite, anchor: clockSite.position.clone() },
      // front : côté à montrer quand on s'approche (la porte et les panneaux de la maison, la face des panneaux du champ).
      { key: 'house', root: house, anchor: house.position.clone(), front: new THREE.Vector3(0, 0, 1).applyQuaternion(house.quaternion) },
      { key: 'field', root: field, anchor: field.position.clone(), front: new THREE.Vector3(0, 0, 1).applyQuaternion(field.quaternion) },
    );
  }

  return { planet, globe, pad, padTop: 0.3, smoke, clockSite, elements };
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
