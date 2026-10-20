import * as THREE from 'three';
import { seededRandom } from './math.js';
import { buildComputer, buildEigsi, buildGuitar, buildHeriotWatt, buildSpeaker, flat } from './props.js';

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

// Direction de la surface pour une distance `s` le long du trajet et un décalage latéral `w`, sur une planète de
// rayon `R`.
function surfaceDir(s, w, R) {
  const a = s / R;
  const b = w / R;
  return new THREE.Vector3(Math.sin(a) * Math.cos(b), Math.cos(a) * Math.cos(b), Math.sin(b));
}

function placeAtDir(parent, obj, dir, R, lift = 0) {
  obj.position.copy(dir).multiplyScalar(R + lift);
  obj.quaternion.setFromUnitVectors(UP, dir);
  parent.add(obj);
}

// Pose `obj` debout en `dir`, sa face avant (+z) tournée vers la direction `toward` (repère de la planète).
function placeFacing(parent, obj, dir, toward, R) {
  const z = toward.clone().addScaledVector(dir, -toward.dot(dir)).normalize();
  const x = dir.clone().cross(z);
  obj.position.copy(dir).multiplyScalar(R);
  obj.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, dir, z));
  parent.add(obj);
}

// Repère local d'une terre : son centre, l'est et le nord (vers le pôle +y). On y repère un point de la surface par
// ses coordonnées (x vers l'est, y vers le nord) en unités de la scène, mesurées depuis le centre.
function tangentFrame(center) {
  const c = center.clone().normalize();
  const north = UP.clone().addScaledVector(c, -c.y);
  if (north.lengthSq() < 1e-6) north.set(0, 0, -1);
  north.normalize();
  return { center: c, north, east: north.clone().cross(c) };
}

function frameToDir(frame, x, y, R) {
  return frame.center
    .clone()
    .addScaledVector(frame.east, Math.tan(x / R))
    .addScaledVector(frame.north, Math.tan(y / R))
    .normalize();
}

function dirToFrame(frame, dir, R, out) {
  const c = dir.dot(frame.center);
  if (c <= 0) return null;
  out.x = Math.atan2(dir.dot(frame.east), c) * R;
  out.y = Math.atan2(dir.dot(frame.north), c) * R;
  return out;
}

// Contour de la Corse (longitude, latitude), du cap Corse dans le sens horaire.
const CORSICA = [
  [9.4, 43.01], [9.47, 42.98], [9.48, 42.8], [9.45, 42.7], [9.53, 42.55], [9.56, 42.3], [9.55, 42.1], [9.4, 41.85],
  [9.35, 41.7], [9.28, 41.59], [9.22, 41.37], [9.1, 41.4], [8.88, 41.52], [8.78, 41.6], [8.8, 41.7], [8.62, 41.85],
  [8.73, 41.92], [8.6, 42.05], [8.57, 42.2], [8.68, 42.27], [8.6, 42.4], [8.75, 42.57], [8.94, 42.64], [9.15, 42.73],
  [9.26, 42.71], [9.33, 42.95],
];
const CORSICA_LENGTH = 22; // du cap Corse à Bonifacio, en unités de la scène
// En unités de la scène, centré sur l'île, nord vers +y.
function corsicaPoint(lon, lat) {
  const kmPerUnit = 183 / CORSICA_LENGTH;
  return [((lon - 9.07) * 82.3) / kmPerUnit, ((lat - 42.2) * 111) / kmPerUnit];
}
const CORSICA_SHAPE = CORSICA.map(([lon, lat]) => corsicaPoint(lon, lat));

function insidePolygon(x, y, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// Île ronde aux bords découpés : rayon `radius` modulé par des harmoniques [ordre, amplitude, phase].
function insideBlob(x, y, radius, harmonics) {
  const angle = Math.atan2(y, x);
  let edge = 1;
  for (const [k, amp, phase] of harmonics) edge += amp * Math.sin(k * angle + phase);
  return Math.hypot(x, y) < radius * edge;
}

// Emplacement de chaque terre dessinée, dans le repère de la planète. Le trajet de l'intro occupe le dessus,
// côté +x ; le reste se répartit autour pour que la planète se lise sous tous les angles.
export const LANDS = {
  corsica: new THREE.Vector3(0.12, 0.05, 1),
  music: new THREE.Vector3(-0.92, -0.1, 0.38),
  orkney: new THREE.Vector3(-0.45, 0.7, -0.55),
};
const MUSIC_RADIUS = 6.5;
const ORKNEY_ISLANDS = [
  [0, 0, 4.2], [6.6, 2.2, 1.8], [-5.6, 3.6, 1.4], [3.2, -5.9, 2.2], [-4.2, -4.6, 1.1], [7.6, -2.6, 0.9],
];
const CLOCK_LAND_RADIUS = 13.4;
const ROUGH = [[3, 0.08, 0.6], [5, 0.06, 2], [9, 0.04, 1]];
const JAGGED = [[3, 0.12, 1], [5, 0.09, 2.1], [8, 0.06, 0.4], [13, 0.04, 3]];

function buildLands(R, clockDir) {
  const lands = [
    { frame: tangentFrame(LANDS.corsica), contains: (x, y) => insidePolygon(x, y, CORSICA_SHAPE) },
    { frame: tangentFrame(LANDS.music), contains: (x, y) => insideBlob(x, y, MUSIC_RADIUS, ROUGH) },
    {
      frame: tangentFrame(LANDS.orkney),
      contains: (x, y) => ORKNEY_ISLANDS.some(([cx, cy, r], i) => insideBlob(x - cx, y - cy, r, [[3, 0.14, i], [5, 0.08, 2 * i]])),
    },
  ];
  if (clockDir) lands.push({ frame: tangentFrame(clockDir), contains: (x, y) => insideBlob(x, y, CLOCK_LAND_RADIUS, JAGGED) });
  return lands;
}

function isLand(dir, lands, R) {
  const p = new THREE.Vector2();
  for (const { frame, contains } of lands) {
    if (dirToFrame(frame, dir, R, p) && contains(p.x, p.y)) return true;
  }
  // Le continent du trajet : de la forêt jusqu'au pas de tir.
  const s = Math.atan2(dir.x, dir.y) * R;
  const w = Math.asin(THREE.MathUtils.clamp(dir.z, -1, 1)) * R;
  const start = PATH.landStart + 0.4 * (1 + Math.sin(w * 0.56));
  const end = PATH.landEnd + 1.3 * Math.sin(w * 0.3 + 1);
  const halfWidth = 6.5 + 1.5 * Math.sin(s * 0.7);
  return s > start && s < end && Math.abs(w) < halfWidth;
}

function buildGlobe(R, lands) {
  // Assez fin pour que le contour de la Corse se reconnaisse.
  const geometry = new THREE.IcosahedronGeometry(R, 72);
  const pos = geometry.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const rand = seededRandom(7);
  const water = [new THREE.Color('#3aa6dd'), new THREE.Color('#42ade2'), new THREE.Color('#35a0d7')];
  const land = [new THREE.Color('#7ccb6a'), new THREE.Color('#72c262'), new THREE.Color('#84d072')];
  const center = new THREE.Vector3();
  const v = new THREE.Vector3();

  for (let i = 0; i < pos.count; i += 3) {
    center.set(0, 0, 0);
    for (let k = 0; k < 3; k++) center.add(v.fromBufferAttribute(pos, i + k));
    center.normalize();
    const palette = isLand(center, lands, R) ? land : water;
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
function buildSolarField(R) {
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
      const sag = (x * x + z * z) / (2 * R);
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

// Autour de l'horloge, en unités de la scène depuis son centre.
const EIGSI_AZIMUTH = 2.3;
const EIGSI_DIST = 7.5;
const FIELD_AZIMUTH = -0.9;
const FIELD_DIST = 8.6;
// Sur l'île de la musique et en Corse, en coordonnées locales (est, nord).
const MUSIC_SPOTS = { computer: [-2.4, 1.1], guitar: [2.3, 1.4], speaker: [0.2, -2.5] };
const HOUSE_SPOT = corsicaPoint(8.98, 42.12);

// radius : rayon du globe. Les objets gardent leur taille : une planète plus petite les fait paraître plus grands.
// clockDir : direction (repère de la planète) du continent de l'horloge de la timeline, avec l'EIGSI, un champ
// photovoltaïque et quelques arbres.
// Renvoie aussi `elements` : les éléments que l'on peut viser en explorant la planète, avec leur point d'ancrage,
// et `animate(time)`, qui fait tourner l'éolienne et vibrer l'enceinte.
export function buildPlanet({ radius = PLANET_RADIUS, treeCount = 46, clockDir = null } = {}) {
  const R = radius;
  const rand = seededRandom(42);
  const planet = new THREE.Group();
  const globe = buildGlobe(R, buildLands(R, clockDir));
  planet.add(globe);

  // Halo d'atmosphère, surtout visible une fois dans l'espace.
  const atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(R * 1.08, 48, 32),
    new THREE.MeshBasicMaterial({ color: '#8fd3ff', transparent: true, opacity: 0.18, side: THREE.BackSide }),
  );
  planet.add(atmosphere);

  const solar = buildSolarPlant();
  placeAtDir(planet, solar, surfaceDir(PATH.solar, 0, R), R, 0.02);

  // Les arbres du trajet, réunis en une forêt.
  const forest = new THREE.Group();
  planet.add(forest);
  for (let i = 0; i < treeCount; i++) {
    const s = PATH.treesStart + rand() * (PATH.treesEnd - PATH.treesStart);
    const w = (rand() - 0.5) * 9;
    placeAtDir(forest, buildTree(rand), surfaceDir(s, w, R), R);
  }

  const pad = buildLaunchPad();
  placeAtDir(planet, pad, surfaceDir(PATH.pad, 0, R), R);
  const smoke = buildSmoke(rand);
  smoke.position.y = 0.35;
  pad.add(smoke);

  // front : côté à montrer quand on s'approche d'un élément.
  const frontOf = (obj) => new THREE.Vector3(0, 0, 1).applyQuaternion(obj.quaternion);
  const elements = [
    { key: 'solar', root: solar, anchor: solar.position.clone() },
    { key: 'forest', root: forest, anchor: surfaceDir((PATH.treesStart + PATH.treesEnd) / 2, 0, R).multiplyScalar(R) },
    { key: 'pad', root: pad, anchor: pad.position.clone() },
  ];
  const addElement = (key, root, anchor = root) =>
    elements.push({ key, root, anchor: anchor.position.clone(), front: frontOf(anchor) });

  // Corse : la maison solaire au cœur de l'île, le maquis autour.
  const corsica = tangentFrame(LANDS.corsica);
  const house = buildSolarHouse();
  const houseDir = frameToDir(corsica, HOUSE_SPOT[0], HOUSE_SPOT[1], R);
  placeFacing(planet, house, houseDir, frameToDir(corsica, HOUSE_SPOT[0] + 1, HOUSE_SPOT[1] - 3, R), R);
  addElement('house', house);
  for (let placed = 0, tries = 0; placed < 22 && tries < 600; tries++) {
    const x = (rand() - 0.5) * 10;
    const y = (rand() - 0.5) * CORSICA_LENGTH;
    if (!insidePolygon(x, y, CORSICA_SHAPE) || Math.hypot(x - HOUSE_SPOT[0], y - HOUSE_SPOT[1]) < 2) continue;
    const edge = CORSICA_SHAPE.some(([px, py]) => Math.hypot(px - x, py - y) < 0.9);
    if (edge) continue;
    placeAtDir(planet, buildTree(rand), frameToDir(corsica, x, y, R), R);
    placed++;
  }

  // L'île de la musique et du code : l'ordinateur, la guitare et l'enceinte tournés vers le milieu de l'île.
  const music = tangentFrame(LANDS.music);
  const musicCenter = music.center;
  const place = (obj, [x, y]) => placeFacing(planet, obj, frameToDir(music, x, y, R), musicCenter, R);
  const computer = buildComputer();
  place(computer, MUSIC_SPOTS.computer);
  const guitar = buildGuitar();
  place(guitar, MUSIC_SPOTS.guitar);
  const { speaker, membranes } = buildSpeaker();
  place(speaker, MUSIC_SPOTS.speaker);
  addElement('computer', computer);
  addElement('guitar', guitar);
  addElement('speaker', speaker);
  for (let i = 0; i < 9; i++) {
    const angle = (i / 9) * Math.PI * 2 + rand() * 0.4;
    const r = 4.3 + rand() * 1.1;
    placeAtDir(planet, buildTree(rand), frameToDir(music, Math.cos(angle) * r, Math.sin(angle) * r, R), R);
  }

  // Orkney : le campus d'Heriot-Watt et son éolienne sur la plus grande île de l'archipel.
  const orkney = tangentFrame(LANDS.orkney);
  const { campus, rotor } = buildHeriotWatt();
  placeFacing(planet, campus, frameToDir(orkney, -0.5, 0.4, R), frameToDir(orkney, -0.5, -4, R), R);
  addElement('heriot', campus);

  // Continent de l'horloge : l'emplacement de l'horloge au centre (elle est construite à la demande), l'EIGSI et le
  // champ à côté, des arbres en couronne autour.
  let clockSite = null;
  if (clockDir) {
    clockSite = new THREE.Group();
    placeAtDir(planet, clockSite, clockDir, R);

    const eigsi = buildEigsi();
    const eigsiDir = offsetDir(clockDir, EIGSI_AZIMUTH, EIGSI_DIST / R);
    placeFacing(planet, eigsi, eigsiDir, clockDir, R);
    const field = buildSolarField(R);
    placeAtDir(planet, field, offsetDir(clockDir, FIELD_AZIMUTH, FIELD_DIST / R), R);
    field.rotateY(-0.4);

    for (let i = 0; i < 22; i++) {
      const azimuth = (i / 22) * Math.PI * 2 + rand() * 0.3;
      const near = (a) => Math.abs(Math.atan2(Math.sin(azimuth - a), Math.cos(azimuth - a))) < 0.6;
      if (near(EIGSI_AZIMUTH) || near(FIELD_AZIMUTH)) continue;
      placeAtDir(planet, buildTree(rand), offsetDir(clockDir, azimuth, (6 + rand() * 3.2) / R), R);
    }

    elements.push({ key: 'clock', root: clockSite, anchor: clockSite.position.clone() });
    addElement('eigsi', eigsi);
    addElement('field', field);
  }

  function animate(time) {
    rotor.rotation.z = -time * 1.4;
    // Deux battements par seconde ; le tweeter vibre plus vite et moins fort.
    const beat = Math.pow(0.5 + 0.5 * Math.sin(time * Math.PI * 4), 6);
    membranes[0].position.z = 0.03 * beat;
    membranes[1].position.z = 0.008 * Math.sin(time * 40) * beat;
  }

  return { planet, globe, pad, padTop: 0.3, smoke, clockSite, elements, animate };
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
