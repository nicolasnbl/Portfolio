import * as THREE from 'three';
import { box, flat, signTexture, texturedFront } from './props.js';

// Objets du continent désert. Comme dans props.js, chacun est construit debout sur l'origine, face avant vers +z.

// Usine de désalinisation au bord de l'eau : un hall blanc, les tubes d'osmose inverse sous un auvent, deux cuves
// d'eau douce, et la conduite de prise d'eau qui part vers la mer, devant (+z).
export function buildDesalination() {
  const plant = new THREE.Group();
  const white = flat('#eef1f3');
  const blue = flat('#3f8fcf');
  const steel = flat('#a9b4bd', { metalness: 0.4, roughness: 0.4 });

  const hall = { w: 2.2, h: 0.9, d: 1.1 };
  plant.add(box(hall.w, hall.h, hall.d, white, -0.5, hall.h / 2, -0.4));
  plant.add(box(hall.w + 0.02, 0.14, hall.d + 0.02, blue, -0.5, hall.h - 0.2, -0.4));
  for (let i = 0; i < 4; i++) plant.add(box(0.3, 0.22, 0.03, flat('#7fb8de', { roughness: 0.3 }), -1.25 + i * 0.5, 0.42, 0.16));

  // Cuves d'eau douce.
  const tankGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.75, 16);
  for (const [x, z] of [[1.2, -0.7], [1.2, 0.3]]) {
    const tank = new THREE.Mesh(tankGeo, blue);
    tank.position.set(x, 0.375, z);
    plant.add(tank);
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.05, 16), white);
    lid.position.set(x, 0.77, z);
    plant.add(lid);
  }

  // Tubes de pression couchés, en deux étages, sous un auvent.
  const tubeGeo = new THREE.CylinderGeometry(0.07, 0.07, 1.3, 8);
  for (let row = 0; row < 2; row++) {
    for (let i = 0; i < 4; i++) {
      const tube = new THREE.Mesh(tubeGeo, white);
      tube.rotation.z = Math.PI / 2;
      tube.position.set(-0.6, 0.18 + row * 0.18, 0.55 + i * 0.17);
      plant.add(tube);
    }
  }
  plant.add(box(1.6, 0.04, 0.9, steel, -0.6, 0.62, 0.8));
  for (const [x, z] of [[-1.35, 0.4], [0.15, 0.4], [-1.35, 1.2], [0.15, 1.2]]) plant.add(box(0.04, 0.62, 0.04, steel, x, 0.31, z));

  // Conduite de prise d'eau vers la mer, sur pilotis.
  const pipeLength = 3.2;
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, pipeLength, 8), steel);
  pipe.rotation.x = Math.PI / 2;
  pipe.position.set(0.6, 0.22, 1.1 + pipeLength / 2);
  plant.add(pipe);
  for (let i = 0; i < 4; i++) plant.add(box(0.05, 0.4, 0.05, steel, 0.6, 0.05, 1.6 + i * 0.8));
  const head = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.25, 10), flat('#ff7a45'));
  head.position.set(0.6, 0.2, 1.1 + pipeLength);
  plant.add(head);
  return plant;
}

// Centrale à miroirs cylindro-paraboliques : des rangées de longs miroirs en gouttière, ouverts vers le ciel et
// inclinés vers +z, avec le tube absorbeur au foyer. Le sol suit la courbure de la planète.
export function buildTroughField(R, { rows = 4, length = 3.4 } = {}) {
  const field = new THREE.Group();
  const mirror = flat('#dfe9f1', { metalness: 0.35, roughness: 0.25, side: THREE.DoubleSide });
  const absorber = flat('#2b2f38', { metalness: 0.5, roughness: 0.4 });
  const steel = flat('#9aa5ad', { metalness: 0.3 });
  const radius = 0.34;
  // Demi-cylindre couché le long de x, creux vers le haut (une fois tourné de 90° autour de z, les angles π à 2π
  // donnent la moitié basse).
  const troughGeo = new THREE.CylinderGeometry(radius, radius, length, 14, 1, true, Math.PI, Math.PI);
  const tubeGeo = new THREE.CylinderGeometry(0.035, 0.035, length, 6);
  for (let r = 0; r < rows; r++) {
    const z = (r - (rows - 1) / 2) * 0.95;
    const sag = (z * z) / (2 * R);
    const row = new THREE.Group();
    row.position.set(0, 0.5 - sag, z);
    row.rotation.x = 0.35;
    const trough = new THREE.Mesh(troughGeo, mirror);
    trough.rotation.z = Math.PI / 2;
    row.add(trough);
    const tube = new THREE.Mesh(tubeGeo, absorber);
    tube.rotation.z = Math.PI / 2;
    tube.position.y = -radius * 0.45;
    row.add(tube);
    field.add(row);
    for (const x of [-length / 2 + 0.2, 0, length / 2 - 0.2]) {
      field.add(box(0.06, 0.46, 0.06, steel, x, 0.23 - sag - (x * x) / (2 * R), z));
    }
  }
  return field;
}

// Forum des énergies : un hall d'exposition au toit en vague, une enseigne, et une rangée de drapeaux pour les
// forums auxquels Nicolas a participé.
export function buildForum() {
  const forum = new THREE.Group();
  const wall = flat('#f4f2ec');
  const roofMat = flat('#c9d0d6', { metalness: 0.3 });
  const glass = flat('#7fb8de', { roughness: 0.25, metalness: 0.2 });
  const dark = flat('#3a4358');
  const length = 4;
  const depth = 1.6;
  const steps = 24;
  const roofY = (i) => 1 + 0.35 * Math.sin((i / steps) * Math.PI * 3);

  // Pignon ondulé extrudé sur toute la profondeur.
  const gable = new THREE.Shape();
  gable.moveTo(-length / 2, 0);
  for (let i = 0; i <= steps; i++) gable.lineTo(-length / 2 + (length * i) / steps, roofY(i));
  gable.lineTo(length / 2, 0);
  const hall = new THREE.Mesh(new THREE.ExtrudeGeometry(gable, { depth, bevelEnabled: false }), wall);
  hall.position.z = -depth / 2;
  forum.add(hall);
  // Le toit en tôle déborde un peu, par segments.
  for (let i = 0; i < steps; i++) {
    const x0 = -length / 2 + (length * i) / steps;
    const x1 = x0 + length / steps;
    const [y0, y1] = [roofY(i), roofY(i + 1)];
    const seg = box(Math.hypot(x1 - x0, y1 - y0) + 0.02, 0.08, depth + 0.3, roofMat, (x0 + x1) / 2, (y0 + y1) / 2 + 0.04, 0);
    seg.rotation.z = Math.atan2(y1 - y0, x1 - x0);
    forum.add(seg);
  }
  for (let i = 0; i < 7; i++) forum.add(box(0.42, 0.6, 0.03, glass, -1.6 + i * 0.53, 0.38, depth / 2 + 0.02));

  const sign = texturedFront(1.6, 0.4, 0.05, dark, signTexture('ENERGY FORUM', '#0f6b5c'));
  sign.position.set(0, 1.75, 0.3);
  forum.add(sign);
  for (const x of [-0.6, 0.6]) forum.add(box(0.05, 0.4, 0.05, dark, x, 1.45, 0.3));

  const colors = ['#d4483b', '#2f6fb5', '#2f9e5b', '#f2b33d', '#7a4fb5'];
  colors.forEach((color, i) => {
    const x = -1.6 + i * 0.8;
    forum.add(box(0.03, 1.1, 0.03, dark, x, 0.55, depth / 2 + 0.9));
    forum.add(box(0.3, 0.19, 0.02, flat(color), x + 0.16, 0.98, depth / 2 + 0.9));
  });
  return forum;
}

// Mini Burj Khalifa : un noyau effilé, trois ailes en Y qui s'arrêtent en paliers de plus en plus hauts, une flèche.
export function buildBurj() {
  const tower = new THREE.Group();
  const glass = flat('#c4d6e4', { metalness: 0.15, roughness: 0.35 });
  const steel = flat('#d7dde2', { metalness: 0.5, roughness: 0.3 });
  tower.add(box(1.5, 0.12, 1.5, flat('#d8c9a8'), 0, 0.06, 0));

  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.26, 4.6, 6), glass);
  core.position.y = 2.42;
  tower.add(core);
  const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.11, 1.5, 6), steel);
  spire.position.y = 4.72 + 0.75;
  tower.add(spire);

  // Chaque aile : paliers de longueur décroissante ; d'une aile à l'autre, les paliers sont décalés en hauteur,
  // ce qui donne la spirale de la vraie tour.
  const lengths = [0.72, 0.58, 0.44, 0.3, 0.18];
  const tops = [1.0, 1.9, 2.7, 3.4, 4.0];
  for (let k = 0; k < 3; k++) {
    const wing = new THREE.Group();
    wing.rotation.y = (k * Math.PI * 2) / 3;
    let bottom = 0.12;
    lengths.forEach((length, j) => {
      const top = tops[j] + k * 0.22;
      wing.add(box(0.3, top - bottom, length, glass, 0, (top + bottom) / 2, length / 2 + 0.1));
      bottom = top;
    });
    tower.add(wing);
  }
  tower.scale.setScalar(0.75);
  return tower;
}

// Chantier d'Anjaza : un immeuble en construction (dalles de béton, poteaux du dernier étage, échafaudage) et une
// grue à tour jaune dont la flèche tourne et le crochet monte une charge. Renvoie aussi la flèche et le crochet pour
// les animer.
export function buildCrane() {
  const site = new THREE.Group();
  const concrete = flat('#c9c4bb');
  const yellow = flat('#f2b632');
  const dark = flat('#3a3f47');
  const scaffold = flat('#8f969c', { metalness: 0.3 });
  site.add(box(2.4, 0.06, 1.8, flat('#bfa77f'), 0, 0.03, 0));

  // Immeuble : trois dalles pleines, puis les poteaux de l'étage en cours.
  const b = { x: -0.45, z: 0, w: 1.1, d: 1.1, floor: 0.34 };
  for (let i = 0; i < 3; i++) {
    site.add(box(b.w, b.floor - 0.06, b.d, flat(i % 2 ? '#d6d1c8' : '#c9c4bb'), b.x, 0.06 + i * b.floor + (b.floor - 0.06) / 2, b.z));
    site.add(box(b.w + 0.04, 0.05, b.d + 0.04, concrete, b.x, 0.06 + (i + 1) * b.floor - 0.025, b.z));
  }
  const top = 0.06 + 3 * b.floor;
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, -1], [0, 1]]) {
    site.add(box(0.07, b.floor * 0.7, 0.07, concrete, b.x + (dx * (b.w - 0.08)) / 2, top + b.floor * 0.35, b.z + (dz * (b.d - 0.08)) / 2));
  }
  // Échafaudage sur la façade avant (+z).
  const front = b.z + b.d / 2 + 0.12;
  for (let i = 0; i < 4; i++) site.add(box(0.025, top + 0.25, 0.025, scaffold, b.x - b.w / 2 + i * (b.w / 3), (top + 0.25) / 2, front));
  for (let j = 1; j <= 3; j++) site.add(box(b.w + 0.04, 0.025, 0.025, scaffold, b.x, j * b.floor, front));
  for (let j = 1; j <= 3; j++) site.add(box(b.w, 0.02, 0.16, flat('#a07a4f'), b.x, j * b.floor - 0.02, front - 0.06));

  // Grue : mât en treillis (quatre montants et des traverses), cabine, flèche et contre-flèche qui tournent ensemble.
  const mast = { x: 0.75, z: -0.3, h: 2.5, s: 0.16 };
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    site.add(box(0.03, mast.h, 0.03, yellow, mast.x + (dx * mast.s) / 2, mast.h / 2, mast.z + (dz * mast.s) / 2));
  }
  for (let y = 0.2; y < mast.h; y += 0.25) {
    site.add(box(mast.s, 0.02, 0.02, yellow, mast.x, y, mast.z - mast.s / 2));
    site.add(box(mast.s, 0.02, 0.02, yellow, mast.x, y, mast.z + mast.s / 2));
    site.add(box(0.02, 0.02, mast.s, yellow, mast.x - mast.s / 2, y, mast.z));
    site.add(box(0.02, 0.02, mast.s, yellow, mast.x + mast.s / 2, y, mast.z));
  }
  site.add(box(0.5, 0.1, 0.5, dark, mast.x, 0.05, mast.z));

  const jib = new THREE.Group();
  jib.position.set(mast.x, mast.h, mast.z);
  site.add(jib);
  jib.add(box(0.22, 0.18, 0.22, flat('#eef1f3'), 0.13, 0.09, 0.0));
  jib.add(box(0.12, 0.08, 0.1, flat('#7fb8de', { roughness: 0.3 }), 0.2, 0.11, 0.07));
  const reach = 2.0;
  jib.add(box(reach, 0.08, 0.1, yellow, -reach / 2, 0.22, 0));
  jib.add(box(0.7, 0.08, 0.1, yellow, 0.35, 0.22, 0));
  jib.add(box(0.26, 0.22, 0.2, flat('#7d838a'), 0.62, 0.12, 0));
  const peak = box(0.05, 0.42, 0.05, yellow, 0, 0.47, 0);
  jib.add(peak);
  for (const [x, length] of [[-reach / 2, reach], [0.33, 0.66]]) {
    const tie = box(Math.hypot(length, 0.4), 0.015, 0.015, dark, x, 0.47, 0);
    tie.rotation.z = Math.sign(x) * Math.atan2(0.4, length) * -1;
    jib.add(tie);
  }

  // Chariot et crochet, au-dessus du dernier étage de l'immeuble ; la charge est une palette de briques.
  const trolley = new THREE.Group();
  trolley.position.set(-1.2, 0.17, 0);
  jib.add(trolley);
  trolley.add(box(0.12, 0.05, 0.12, dark, 0, 0, 0));
  const hook = new THREE.Group();
  trolley.add(hook);
  const cable = box(0.012, 1, 0.012, dark, 0, -0.5, 0);
  hook.add(cable);
  const load = new THREE.Group();
  load.add(box(0.26, 0.04, 0.2, flat('#a07a4f'), 0, 0, 0));
  load.add(box(0.22, 0.12, 0.16, flat('#c0603f'), 0, 0.08, 0));
  hook.add(load);
  const setDrop = (drop) => {
    cable.scale.y = drop;
    cable.position.y = -drop / 2;
    load.position.y = -drop - 0.14;
  };
  setDrop(0.8);
  return { site, jib, setDrop };
}

// Palmier : tronc courbé en quelques tronçons, palmes en lames inclinées.
export function buildPalm(rand) {
  const palm = new THREE.Group();
  const bark = flat('#a07a4f');
  const leaf = flat(['#3f9b4f', '#4fae5a', '#2f8a46'][Math.floor(rand() * 3)]);
  let y = 0;
  let x = 0;
  const lean = 0.08 + rand() * 0.08;
  for (let i = 0; i < 4; i++) {
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.05 - i * 0.006, 0.065 - i * 0.006, 0.28, 6), bark);
    seg.position.set(x, y + 0.14, 0);
    seg.rotation.z = -lean * (i + 1) * 0.6;
    palm.add(seg);
    y += 0.27;
    x += lean * (i + 1) * 0.17;
  }
  for (let i = 0; i < 6; i++) {
    const frond = new THREE.Group();
    frond.position.set(x, y, 0);
    frond.rotation.y = (i / 6) * Math.PI * 2;
    const blade = box(0.12, 0.02, 0.55, leaf, 0, 0, 0.26);
    blade.rotation.x = 0.45;
    frond.add(blade);
    palm.add(frond);
  }
  palm.scale.setScalar(0.8 + rand() * 0.4);
  palm.rotation.y = rand() * Math.PI * 2;
  return palm;
}

// Dune basse, une demi-sphère aplatie couleur sable.
export function buildDune(rand) {
  const dune = new THREE.Mesh(
    new THREE.SphereGeometry(1, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2),
    flat(['#e2c48c', '#dcbc80'][Math.floor(rand() * 2)]),
  );
  dune.scale.set(0.6 + rand() * 0.5, 0.1 + rand() * 0.06, 0.35 + rand() * 0.25);
  dune.rotation.y = rand() * Math.PI;
  return dune;
}
