import * as THREE from 'three';
import { seededRandom } from './math.js';
import { buildBurj, buildCrane, buildDesalination, buildDune, buildForum, buildPalm, buildTroughField } from './desert.js';
import {
  buildBike,
  buildBrainChip,
  buildChess,
  buildComputer,
  buildEigsi,
  buildGuitar,
  buildHeriotWatt,
  buildMicrolight,
  buildSpeaker,
  flat,
} from './props.js';

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
const CORSICA_LENGTH = 15; // du cap Corse à Bonifacio, en unités de la scène
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
  desert: new THREE.Vector3(0.8, -0.5, 0.3),
};
const MUSIC_RADIUS = 8;
const ORKNEY_ISLANDS = [
  [0, 0, 4.2], [6.6, 2.2, 1.8], [-5.6, 3.6, 1.4], [3.2, -5.9, 2.2], [-4.2, -4.6, 1.1], [7.6, -2.6, 0.9],
];
const CLOCK_LAND_RADIUS = 14;
const CLOCK_SPOTS = { field: [7.5, 3.5], eigsi: [-6.5, -5], chip: [-1.5, -6.8], strip: [3.5, -7] };
// Continent désert : la tour au milieu, l'usine de désalinisation sur la côte ouest, sa conduite vers la mer, et ses
// deux centrales solaires juste à côté (le champ photovoltaïque au nord, les miroirs au sud), reliées à elle par des
// lignes électriques.
const DESERT_RADIUS = 11;
const DESERT_SPOTS = {
  burj: [0.5, 1.2], forum: [-2.6, -5], field: [-6.4, 5.6], troughs: [-7.2, -2.5], desal: [-7.6, 1.6], crane: [-3.6, 1.4],
};
// Lignes électriques : le transformateur au bord de la centrale, les poteaux, puis le mur est du hall de l'usine
// où arrivent les câbles (x, y et hauteur).
const DESERT_LINES = [
  { from: [-5, 4], poles: [[-5.3, 3.2], [-5.8, 2.6]], to: [-6.62, 2.5, 0.68] },
  { from: [-5.5, -1.5], poles: [[-5.1, -0.5], [-5.5, 0.4], [-5.9, 1.2]], to: [-6.62, 1.4, 0.68] },
];
const ROUGH = [[3, 0.08, 0.6], [5, 0.06, 2], [9, 0.04, 1]];
const JAGGED = [[3, 0.12, 1], [5, 0.09, 2.1], [8, 0.06, 0.4], [13, 0.04, 3]];

function buildLands(R, clockDir) {
  const lands = [
    { frame: tangentFrame(LANDS.corsica), contains: (x, y) => insidePolygon(x, y, CORSICA_SHAPE) },
    { frame: tangentFrame(LANDS.music), contains: (x, y) => insideBlob(x, y, MUSIC_RADIUS, ROUGH) },
    { frame: tangentFrame(LANDS.desert), contains: (x, y) => insideBlob(x, y, DESERT_RADIUS, JAGGED), sand: true },
    {
      frame: tangentFrame(LANDS.orkney),
      contains: (x, y) => ORKNEY_ISLANDS.some(([cx, cy, r], i) => insideBlob(x - cx, y - cy, r, [[3, 0.14, i], [5, 0.08, 2 * i]])),
    },
  ];
  if (clockDir) {
    // Le sol est garanti sous le champ et l'école, quel que soit le découpage du bord.
    const under = (x, y, [cx, cy], r) => Math.hypot(x - cx, y - cy) < r;
    lands.push({
      frame: tangentFrame(clockDir),
      contains: (x, y) =>
        insideBlob(x, y, CLOCK_LAND_RADIUS, JAGGED) || under(x, y, CLOCK_SPOTS.field, 5.5) || under(x, y, CLOCK_SPOTS.eigsi, 4.5),
    });
  }
  return lands;
}

// Nature du sol en `dir` : 'sand', 'grass' ou null pour l'eau.
function groundAt(dir, lands, R) {
  const p = new THREE.Vector2();
  for (const { frame, contains, sand } of lands) {
    if (dirToFrame(frame, dir, R, p) && contains(p.x, p.y)) return sand ? 'sand' : 'grass';
  }
  // Le continent du trajet : de la forêt jusqu'au pas de tir.
  const s = Math.atan2(dir.x, dir.y) * R;
  const w = Math.asin(THREE.MathUtils.clamp(dir.z, -1, 1)) * R;
  const start = PATH.landStart + 0.4 * (1 + Math.sin(w * 0.56));
  const end = PATH.landEnd + 1.3 * Math.sin(w * 0.3 + 1);
  const halfWidth = 6.5 + 1.5 * Math.sin(s * 0.7);
  return s > start && s < end && Math.abs(w) < halfWidth ? 'grass' : null;
}

// focus : { dir, radius } pour ne garder que les facettes à moins de `radius` (en unités, le long de la surface) de
// la direction `dir`.
function buildGlobe(R, lands, focus = null) {
  // Assez fin pour que le contour de la Corse se reconnaisse.
  const geometry = new THREE.IcosahedronGeometry(R, 72);
  const pos = geometry.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const rand = seededRandom(7);
  const water = [new THREE.Color('#3aa6dd'), new THREE.Color('#42ade2'), new THREE.Color('#35a0d7')];
  const palettes = {
    grass: [new THREE.Color('#7ccb6a'), new THREE.Color('#72c262'), new THREE.Color('#84d072')],
    sand: [new THREE.Color('#e8cf9a'), new THREE.Color('#e2c68e'), new THREE.Color('#edd6a4')],
  };
  const center = new THREE.Vector3();
  const v = new THREE.Vector3();

  for (let i = 0; i < pos.count; i += 3) {
    center.set(0, 0, 0);
    for (let k = 0; k < 3; k++) center.add(v.fromBufferAttribute(pos, i + k));
    center.normalize();
    const palette = palettes[groundAt(center, lands, R)] ?? water;
    const color = palette[Math.floor(rand() * palette.length)];
    for (let k = 0; k < 3; k++) color.toArray(colors, (i + k) * 3);
  }

  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  if (focus) cropGlobe(geometry, focus.dir, Math.cos(focus.radius / R));
  return new THREE.Mesh(geometry, flat('#ffffff', { vertexColors: true, roughness: 0.7 }));
}

// Retire les facettes dont le centre est à plus d'un certain angle (cosinus `minDot`) de `dir`.
function cropGlobe(geometry, dir, minDot) {
  const pos = geometry.attributes.position;
  const col = geometry.attributes.color;
  const keptPos = [];
  const keptCol = [];
  const center = new THREE.Vector3();
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i += 3) {
    center.set(0, 0, 0);
    for (let k = 0; k < 3; k++) center.add(v.fromBufferAttribute(pos, i + k));
    if (center.normalize().dot(dir) < minDot) continue;
    for (let k = 0; k < 3; k++) {
      keptPos.push(pos.getX(i + k), pos.getY(i + k), pos.getZ(i + k));
      keptCol.push(col.getX(i + k), col.getY(i + k), col.getZ(i + k));
    }
  }
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(keptPos, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(keptCol, 3));
  geometry.deleteAttribute('normal');
  geometry.deleteAttribute('uv');
  geometry.computeVertexNormals();
}

// Retire de `group` les objets posés à plus de `maxAngle` de `dir`. Les groupes posés au centre de la planète (forêt,
// piste du vélo, aérodrome) sont triés objet par objet.
// zones : [{ dir, radius }], radius en unités le long de la surface d'une planète de rayon R.
function keepNear(group, zones, R, keep = []) {
  const near = (pos) => zones.some(({ dir, radius }) => pos.angleTo(dir) <= radius / R);
  for (const child of [...group.children]) {
    if (keep.includes(child)) continue;
    const atCenter = child.position.lengthSq() < 1e-6;
    // Un maillage posé au centre (la piste du vélo) se repère par le centre de sa géométrie.
    if (atCenter && child.geometry) {
      if (!child.geometry.boundingSphere) child.geometry.computeBoundingSphere();
      if (!near(child.geometry.boundingSphere.center)) group.remove(child);
    } else if (atCenter && child.children.length) {
      keepNear(child, zones, R);
      if (!child.children.length) group.remove(child);
    } else if (!near(child.position)) {
      group.remove(child);
    }
  }
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

// Transformateur au pied d'une ligne électrique : un caisson gris et ses deux isolateurs, au sommet desquels partent
// les câbles.
const TRANSFORMER_HEIGHT = 0.5;
function buildTransformer() {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.36, 0.34), flat('#8f9aa3', { metalness: 0.3 }));
  body.position.y = 0.18;
  group.add(body);
  const insulator = new THREE.CylinderGeometry(0.03, 0.04, 0.14, 6);
  for (const x of [-POLE_ARM, POLE_ARM]) {
    const mesh = new THREE.Mesh(insulator, flat('#c8643b'));
    mesh.position.set(x, 0.43, 0);
    group.add(mesh);
  }
  return group;
}

// Ligne électrique : un poteau en bois à chaque point de `dirs` (repère de la planète), sa traverse en travers de la
// ligne, et deux câbles qui pendent d'un poteau à l'autre. start et end ({ dir, height }) : là où les câbles partent
// et arrivent, avant le premier poteau et après le dernier.
const POLE_HEIGHT = 0.9;
const POLE_ARM = 0.16;
function buildPowerLine(parent, dirs, R, { start = null, end = null } = {}) {
  const wood = flat('#7a5636');
  const cable = flat('#2b2f38', { roughness: 0.6 });
  const poleGeo = new THREE.CylinderGeometry(0.025, 0.035, POLE_HEIGHT, 6);
  const armGeo = new THREE.BoxGeometry(POLE_ARM * 2 + 0.08, 0.035, 0.035);
  const tops = [[], []];
  const sides = [];
  const route = [start?.dir, ...dirs, end?.dir].filter(Boolean);
  dirs.forEach((dir) => {
    const i = route.indexOf(dir);
    const next = route[Math.min(i + 1, route.length - 1)];
    const prev = route[Math.max(i - 1, 0)];
    const pole = new THREE.Group();
    const shaft = new THREE.Mesh(poleGeo, wood);
    shaft.position.y = POLE_HEIGHT / 2;
    const arm = new THREE.Mesh(armGeo, wood);
    arm.position.y = POLE_HEIGHT - 0.06;
    pole.add(shaft, arm);
    // Face avant dans le sens de la ligne : la traverse (le long de x) lui est perpendiculaire.
    placeFacing(parent, pole, dir, next.clone().sub(prev).add(dir), R);
    pole.updateMatrix();
    sides.push(new THREE.Vector3(POLE_ARM, 0, 0).applyQuaternion(pole.quaternion));
    for (const [k, side] of [[0, -1], [1, 1]]) {
      tops[k].push(new THREE.Vector3(side * POLE_ARM, POLE_HEIGHT - 0.03, 0).applyMatrix4(pole.matrix));
    }
  });
  // Les deux bouts : écartés comme sur le poteau voisin.
  const tip = ({ dir, height }, side, k) => dir.clone().multiplyScalar(R + height).addScaledVector(side, k ? 1 : -1);
  tops.forEach((points, k) => {
    if (start) points.unshift(tip(start, sides[0], k));
    if (end) points.push(tip(end, sides[sides.length - 1], k));
  });
  for (const points of tops) {
    for (let i = 0; i + 1 < points.length; i++) {
      const a = points[i];
      const b = points[i + 1];
      const mid = a.clone().add(b).multiplyScalar(0.5);
      const sag = mid.clone().normalize().multiplyScalar(-0.1 * a.distanceTo(b));
      const curve = new THREE.QuadraticBezierCurve3(a, mid.add(sag), b);
      parent.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 10, 0.009, 4), cable));
    }
  }
}

// Grand champ de panneaux en rangées, en une seule géométrie instanciée. Le sol suit la courbure de la planète.
function buildSolarField(R, { rows = 6, cols = 8 } = {}) {
  const field = new THREE.Group();
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

// Sur le continent de l'horloge, l'île de la musique et en Corse, en coordonnées locales (est, nord).
const MUSIC_SPOTS = { computer: [-3.8, 1.6], guitar: [3.6, 2.4], speaker: [0.4, -3.9], chess: [0, 3.4] };
const HOUSE_SPOT = corsicaPoint(8.98, 42.12);
// Boucles parcourues en continu : la piste du vélo au sud-ouest de l'île de la musique, et le tour de l'ULM au-dessus
// de sa piste d'envol, à côté de l'EIGSI. Centre et demi-axes (est, nord) dans le repère de leur terre.
const BIKE_LOOP = { center: [-2.8, -2.6], radii: [1.7, 1.6] };
const ULM_LOOP = { center: [0, 0], radii: [3.4, 2.6] };
const ULM_FLIES = true; // false : l'ULM reste posé sur sa piste
const BIKE_SPEED = 0.7; // unités par seconde
const ULM_SPEED = 1.6;

function loopPoint({ center, radii }, angle, scale = 1) {
  return [center[0] + Math.cos(angle) * radii[0] * scale, center[1] + Math.sin(angle) * radii[1] * scale];
}

// Écart (en unités) entre un point et la boucle, approché par l'ellipse normalisée.
function loopGap(loop, x, y) {
  const u = (x - loop.center[0]) / loop.radii[0];
  const v = (y - loop.center[1]) / loop.radii[1];
  return Math.abs(Math.hypot(u, v) - 1) * Math.min(...loop.radii);
}

// Piste en terre qui suit la boucle, en ruban posé sur le sol.
function buildLoopRoad(frame, loop, R, width = 0.36) {
  const n = 72;
  const positions = [];
  const index = [];
  for (let i = 0; i <= n; i++) {
    const angle = (i / n) * Math.PI * 2;
    for (const side of [-1, 1]) {
      const [x, y] = loopPoint(loop, angle, 1 + (side * width) / 2 / Math.min(...loop.radii));
      positions.push(...frameToDir(frame, x, y, R).multiplyScalar(R + 0.03).toArray());
    }
    if (i < n) index.push(2 * i, 2 * i + 1, 2 * i + 2, 2 * i + 1, 2 * i + 3, 2 * i + 2);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  return new THREE.Mesh(geometry, flat('#b59a72', { side: THREE.DoubleSide }));
}

// Pose `obj` sur la boucle à l'angle `angle`, à `lift` au-dessus du sol, son avant (+x) dans le sens du parcours,
// incliné de `bank` vers l'intérieur du virage.
const loopTmp = { up: new THREE.Vector3(), ahead: new THREE.Vector3(), left: new THREE.Vector3(), z: new THREE.Vector3(), m: new THREE.Matrix4() };
function placeOnLoop(obj, frame, loop, angle, R, lift = 0, bank = 0) {
  const { up, ahead, left, z, m } = loopTmp;
  up.copy(frameToDir(frame, ...loopPoint(loop, angle), R));
  ahead.copy(frameToDir(frame, ...loopPoint(loop, angle + 0.01), R)).sub(up);
  ahead.addScaledVector(up, -ahead.dot(up)).normalize();
  obj.position.copy(up).multiplyScalar(R + lift);
  left.crossVectors(up, ahead);
  up.multiplyScalar(Math.cos(bank)).addScaledVector(left, Math.sin(bank));
  z.crossVectors(ahead, up);
  obj.quaternion.setFromRotationMatrix(m.makeBasis(ahead, up, z));
}

// Longueur approchée d'une boucle elliptique (Ramanujan).
function loopLength({ radii: [a, b] }) {
  return Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b)));
}

// Piste d'envol de l'ULM, le long de x, avec sa manche à air.
function buildAirstrip() {
  const strip = new THREE.Group();
  const runway = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.04, 0.7), flat('#8d8f93'));
  runway.position.y = 0.02;
  strip.add(runway);
  for (let i = 0; i < 6; i++) {
    const dash = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.01, 0.06), flat('#f4f4f4'));
    dash.position.set(-1.75 + i * 0.7, 0.045, 0);
    strip.add(dash);
  }
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.8, 5), flat('#3a4358'));
  pole.position.set(1.6, 0.4, 0.75);
  strip.add(pole);
  const sock = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.4, 8, 1, true), flat('#ff7a45', { side: THREE.DoubleSide }));
  sock.rotation.z = Math.PI / 2;
  sock.position.set(1.42, 0.76, 0.75);
  strip.add(sock);
  return strip;
}

// radius : rayon du globe. Les objets gardent leur taille : une planète plus petite les fait paraître plus grands.
// clockDir : direction (repère de la planète) du continent de l'horloge de la timeline, avec l'EIGSI, un champ
// photovoltaïque et quelques arbres.
// Renvoie aussi `elements` : les éléments que l'on peut viser en explorant la planète, avec leur point d'ancrage,
// et `animate(time)`, qui fait tourner l'éolienne, vibrer l'enceinte, rouler le vélo et voler l'ULM.
// focus : { dir, radius } pour ne garder que le décor autour de `dir` (repère de la planète), à moins de `radius`
// le long de la surface : la page timeline n'a besoin que du continent de l'horloge, et le globe lui-même est rogné.
// Un tableau de zones garde le globe entier mais seulement le décor de ces zones (pages des side projects). Tout est
// construit dans le même ordre que sur l'accueil (même tirage aléatoire), pour que les arbres soient aux mêmes places.
export function buildPlanet({ radius = PLANET_RADIUS, treeCount = 46, clockDir = null, focus = null } = {}) {
  const R = radius;
  const rand = seededRandom(42);
  const planet = new THREE.Group();
  const zones = !focus ? null : Array.isArray(focus) ? focus : [focus];
  const globe = buildGlobe(R, buildLands(R, clockDir), Array.isArray(focus) ? null : focus);
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
  for (let placed = 0, tries = 0; placed < 14 && tries < 600; tries++) {
    const x = (rand() - 0.5) * CORSICA_LENGTH * 0.45;
    const y = (rand() - 0.5) * CORSICA_LENGTH;
    if (!insidePolygon(x, y, CORSICA_SHAPE) || Math.hypot(x - HOUSE_SPOT[0], y - HOUSE_SPOT[1]) < 2) continue;
    const edge = CORSICA_SHAPE.some(([px, py]) => Math.hypot(px - x, py - y) < 0.9);
    if (edge) continue;
    placeAtDir(planet, buildTree(rand), frameToDir(corsica, x, y, R), R);
    placed++;
  }

  // L'île des passions : l'ordinateur, la guitare, l'enceinte et l'échiquier tournés vers le milieu de l'île, et le
  // vélo de voyage qui fait le tour de sa piste.
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
  const chess = buildChess();
  place(chess, MUSIC_SPOTS.chess);
  addElement('chess', chess);
  const bikeTour = new THREE.Group();
  planet.add(bikeTour);
  bikeTour.add(buildLoopRoad(music, BIKE_LOOP, R));
  const { bike, wheels } = buildBike();
  bikeTour.add(bike);
  placeOnLoop(bike, music, BIKE_LOOP, 0, R);
  const bikeAnchor = new THREE.Object3D();
  placeAtDir(bikeTour, bikeAnchor, frameToDir(music, ...BIKE_LOOP.center, R), R);
  addElement('bike', bikeTour, bikeAnchor);
  for (let i = 0; i < 9; i++) {
    const angle = (i / 9) * Math.PI * 2 + rand() * 0.4;
    const r = 5.6 + rand() * 1.4;
    const [x, y] = [Math.cos(angle) * r, Math.sin(angle) * r];
    if (loopGap(BIKE_LOOP, x, y) < 0.9) continue;
    placeAtDir(planet, buildTree(rand), frameToDir(music, x, y, R), R);
  }

  // Orkney : le campus d'Heriot-Watt et son éolienne sur la plus grande île de l'archipel.
  const orkney = tangentFrame(LANDS.orkney);
  const { campus, rotor } = buildHeriotWatt();
  placeFacing(planet, campus, frameToDir(orkney, -0.5, 0.4, R), frameToDir(orkney, -0.5, -4, R), R);
  addElement('heriot', campus);

  // Continent de l'horloge : l'emplacement de l'horloge au centre (elle est construite à la demande), l'EIGSI, le
  // champ et la piste de l'ULM à côté, des arbres en couronne autour.
  let clockSite = null;
  let chipGlow = null;
  let flight = null;
  if (clockDir) {
    clockSite = new THREE.Group();
    placeAtDir(planet, clockSite, clockDir, R);

    const land = tangentFrame(clockDir);
    const spot = ([x, y]) => frameToDir(land, x, y, R);
    const eigsi = buildEigsi();
    placeFacing(planet, eigsi, spot(CLOCK_SPOTS.eigsi), clockDir, R);
    const field = buildSolarField(R);
    placeAtDir(planet, field, spot(CLOCK_SPOTS.field), R);
    field.rotateY(-0.4);
    const { chip, glow } = buildBrainChip();
    placeFacing(planet, chip, spot(CLOCK_SPOTS.chip), clockDir, R);
    chipGlow = glow;

    const airfield = new THREE.Group();
    planet.add(airfield);
    const stripFrame = tangentFrame(spot(CLOCK_SPOTS.strip));
    const strip = buildAirstrip();
    placeFacing(airfield, strip, stripFrame.center, frameToDir(stripFrame, 0, -3, R), R);
    const { ulm, propeller } = buildMicrolight();
    airfield.add(ulm);
    if (ULM_FLIES) placeOnLoop(ulm, stripFrame, ULM_LOOP, 0, R, 2.4, 0.3);
    else placeFacing(airfield, ulm, frameToDir(stripFrame, -0.8, 0, R), frameToDir(stripFrame, -0.8, -3, R), R);
    flight = { ulm, propeller, stripFrame };

    for (let placed = 0, tries = 0; placed < 20 && tries < 400; tries++) {
      const angle = rand() * Math.PI * 2;
      const r = 3.8 + rand() * 7;
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;
      const clear = (p, d) => Math.hypot(x - p[0], y - p[1]) > d;
      if (!insideBlob(x, y, CLOCK_LAND_RADIUS * 0.85, JAGGED) || !clear(CLOCK_SPOTS.field, 4.6) || !clear(CLOCK_SPOTS.eigsi, 3.4)) continue;
      if (!clear(CLOCK_SPOTS.chip, 1.8) || !clear(CLOCK_SPOTS.strip, 2.8)) continue;
      placeAtDir(planet, buildTree(rand), spot([x, y]), R);
      placed++;
    }

    elements.push({ key: 'clock', root: clockSite, anchor: clockSite.position.clone() });
    addElement('eigsi', eigsi);
    addElement('field', field);
    addElement('chip', chip);
    addElement('ulm', airfield, strip);
  }

  // L'ULM et la puce, seuls éléments animés du continent de l'horloge.
  function animateClockLand(time) {
    if (flight) {
      const { ulm, propeller, stripFrame } = flight;
      propeller.rotation.x = time * 30;
      if (ULM_FLIES) placeOnLoop(ulm, stripFrame, ULM_LOOP, ((time * ULM_SPEED) / loopLength(ULM_LOOP)) * Math.PI * 2, R, 2.4, 0.3);
    }
    if (chipGlow) chipGlow.opacity = 0.35 + 0.35 * (0.5 + 0.5 * Math.sin(time * 3));
  }

  // La timeline : seulement le continent de l'horloge.
  if (focus && !Array.isArray(focus)) {
    keepNear(planet, zones, R, [globe, atmosphere]);
    return { planet, globe, clockSite, elements: [], animate: animateClockLand };
  }

  // Le désert n'est construit que si une zone le touche : c'est le dernier à tirer des nombres aléatoires.
  let crane = null;
  const desertDir = LANDS.desert.clone().normalize();
  if (zones && !zones.some(({ dir, radius: r }) => dir.angleTo(desertDir) * R < r + DESERT_RADIUS)) {
    keepNear(planet, zones, R, [globe, atmosphere]);
    return { planet, globe, pad, smoke, clockSite, elements: keptElements(), animate };
  }

  // Continent désert : la tour, le chantier d'Anjaza, le forum, l'usine de désalinisation sur la côte, ses deux
  // champs solaires, des palmiers et des dunes.
  const desert = tangentFrame(LANDS.desert);
  const dspot = ([x, y]) => frameToDir(desert, x, y, R);
  const burj = buildBurj();
  placeFacing(planet, burj, dspot(DESERT_SPOTS.burj), dspot([0.5, -4]), R);
  const forum = buildForum();
  placeFacing(planet, forum, dspot(DESERT_SPOTS.forum), desert.center, R);
  const desal = buildDesalination();
  const [dx, dy] = DESERT_SPOTS.desal;
  placeFacing(planet, desal, dspot(DESERT_SPOTS.desal), dspot([dx - 6, dy]), R);
  const desertField = buildSolarField(R, { rows: 3, cols: 5 });
  const [fx, fy] = DESERT_SPOTS.field;
  placeFacing(planet, desertField, dspot(DESERT_SPOTS.field), dspot([fx, fy - 6]), R);
  const troughs = buildTroughField(R, { length: 3 });
  const [tx, ty] = DESERT_SPOTS.troughs;
  placeFacing(planet, troughs, dspot(DESERT_SPOTS.troughs), dspot([tx, ty - 6]), R);
  const powerLines = new THREE.Group();
  planet.add(powerLines);
  for (const { from, poles, to } of DESERT_LINES) {
    const box = buildTransformer();
    placeFacing(powerLines, box, dspot(from), dspot(poles[0]), R);
    buildPowerLine(powerLines, poles.map(dspot), R, {
      start: { dir: dspot(from), height: TRANSFORMER_HEIGHT },
      end: { dir: dspot(to), height: to[2] },
    });
  }
  crane = buildCrane();
  placeFacing(planet, crane.site, dspot(DESERT_SPOTS.crane), desert.center, R);

  const desertSpots = Object.entries(DESERT_SPOTS);
  const desertClear = { burj: 1.6, forum: 3, field: 2.8, troughs: 2.8, desal: 3, crane: 2 };
  for (let placed = 0, tries = 0; placed < 26 && tries < 600; tries++) {
    const x = (rand() - 0.5) * DESERT_RADIUS * 2;
    const y = (rand() - 0.5) * DESERT_RADIUS * 2;
    if (!insideBlob(x, y, DESERT_RADIUS * 0.85, JAGGED)) continue;
    if (desertSpots.some(([key, [px, py]]) => Math.hypot(x - px, y - py) < desertClear[key])) continue;
    if (DESERT_LINES.some(({ from, poles }) => [from, ...poles].some(([px, py]) => Math.hypot(x - px, y - py) < 0.9))) continue;
    placeAtDir(planet, placed % 3 ? buildPalm(rand) : buildDune(rand), dspot([x, y]), R);
    placed++;
  }
  addElement('burj', burj);
  addElement('forum', forum);
  addElement('desal', desal);
  addElement('desertField', desertField);
  addElement('troughs', troughs);
  addElement('crane', crane.site);

  if (zones) keepNear(planet, zones, R, [globe, atmosphere]);
  return { planet, globe, pad, padTop: 0.3, smoke, clockSite, elements: keptElements(), animate };

  // Éléments encore présents après le tri des zones.
  function keptElements() {
    return elements.filter((el) => el.root.parent);
  }

  function animate(time) {
    rotor.rotation.z = -time * 1.4;
    // Deux battements par seconde ; le tweeter vibre plus vite et moins fort.
    const beat = Math.pow(0.5 + 0.5 * Math.sin(time * Math.PI * 4), 6);
    membranes[0].position.z = 0.03 * beat;
    membranes[1].position.z = 0.008 * Math.sin(time * 40) * beat;

    const bikeDistance = time * BIKE_SPEED;
    placeOnLoop(bike, music, BIKE_LOOP, (bikeDistance / loopLength(BIKE_LOOP)) * Math.PI * 2, R);
    for (const wheel of wheels) wheel.rotation.z = -bikeDistance / 0.3;
    animateClockLand(time);
    // La grue pivote d'un côté à l'autre et le crochet descend quand la flèche passe au-dessus de l'immeuble.
    if (!crane) return;
    const swing = Math.sin(time * 0.35);
    crane.jib.rotation.y = 0.7 * swing;
    crane.setDrop(0.65 + 0.45 * (1 - Math.abs(swing)));
  }
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
