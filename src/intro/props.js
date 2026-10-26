import * as THREE from 'three';

// Objets posés sur les îles de la planète. Chacun est construit debout sur l'origine, sa face avant tournée vers +z ;
// une unité vaut à peu près la hauteur des murs de la maison solaire.

export const flat = (color, extra = {}) =>
  new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.85, ...extra });

export function box(w, h, d, material, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  return mesh;
}

export function canvasTexture(width, height, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d'), width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

// Panneau d'enseigne : texte clair centré sur un fond uni.
export function signTexture(text, background, color = '#ffffff') {
  return canvasTexture(512, 128, (ctx, w, h) => {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = color;
    ctx.font = '700 76px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, w / 2, h / 2 + 4, w - 40);
  });
}

// Boîte dont seule la face avant (+z) porte la texture.
export function texturedFront(w, h, d, side, map) {
  const front = new THREE.MeshBasicMaterial({ map });
  return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [side, side, side, side, front, side]);
}

// Écran d'éditeur de code sur fond sombre, avec quelques lignes colorées.
function codeScreenTexture() {
  return canvasTexture(256, 160, (ctx, w, h) => {
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#161b22';
    ctx.fillRect(0, 0, w, 18);
    for (const [i, c] of ['#ff5f56', '#ffbd2e', '#27c93f'].entries()) {
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(12 + i * 12, 9, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
    const colors = ['#ff7b72', '#79c0ff', '#d2a8ff', '#7ee787', '#c9d1d9', '#ffa657'];
    const widths = [70, 120, 96, 140, 60, 110, 150, 84, 40, 128, 100];
    const indents = [0, 1, 2, 2, 1, 1, 2, 3, 2, 1, 0];
    widths.forEach((width, i) => {
      let x = 14 + indents[i] * 16;
      let left = width;
      let k = i;
      while (left > 0) {
        const part = Math.min(left, 22 + ((k * 37) % 40));
        ctx.fillStyle = colors[k % colors.length];
        ctx.fillRect(x, 28 + i * 12, part - 6, 6);
        x += part;
        left -= part;
        k += 2;
      }
    });
  });
}

// Bureau, écran de code, clavier et souris.
export function buildComputer() {
  const computer = new THREE.Group();
  const wood = flat('#c98f5a');
  const legs = flat('#3a4358', { metalness: 0.3 });
  const deskHeight = 0.72;
  computer.add(box(1.5, 0.07, 0.75, wood, 0, deskHeight, 0));
  for (const [x, z] of [[-0.68, -0.3], [0.68, -0.3], [-0.68, 0.3], [0.68, 0.3]]) {
    computer.add(box(0.06, deskHeight, 0.06, legs, x, deskHeight / 2, z));
  }

  const frame = flat('#2a3142', { metalness: 0.3, roughness: 0.5 });
  const top = deskHeight + 0.035;
  computer.add(box(0.36, 0.03, 0.2, frame, 0, top + 0.015, -0.18));
  computer.add(box(0.08, 0.28, 0.05, frame, 0, top + 0.16, -0.2));
  const screen = texturedFront(1.05, 0.64, 0.05, frame, codeScreenTexture());
  screen.position.set(0, top + 0.5, -0.17);
  screen.rotation.x = -0.08;
  computer.add(screen);

  computer.add(box(0.72, 0.03, 0.22, flat('#d8dde3'), -0.05, top + 0.015, 0.16));
  computer.add(box(0.1, 0.03, 0.15, flat('#d8dde3'), 0.5, top + 0.015, 0.17));
  return computer;
}

// Contour d'une guitare électrique à deux cornes, dans le plan xy, centré sur le corps.
function guitarOutline() {
  const points = [
    [0, -0.31], [0.17, -0.28], [0.255, -0.15], [0.235, -0.02], [0.18, 0.06], [0.215, 0.16], [0.2, 0.27],
    [0.145, 0.28], [0.075, 0.16], [-0.075, 0.16], [-0.16, 0.3], [-0.215, 0.33], [-0.235, 0.2], [-0.18, 0.06],
    [-0.235, -0.02], [-0.255, -0.15], [-0.17, -0.28],
  ].map(([x, y]) => new THREE.Vector3(x, y, 0));
  const curve = new THREE.CatmullRomCurve3(points, true, 'centripetal');
  return new THREE.Shape(curve.getPoints(90).map((p) => new THREE.Vector2(p.x, p.y)));
}

// Guitare électrique rouge posée sur son support, légèrement inclinée vers l'arrière.
export function buildGuitar() {
  const stand = new THREE.Group();
  const black = flat('#1f2430', { metalness: 0.3, roughness: 0.5 });

  const guitar = new THREE.Group();
  const scale = 1.7;
  const depth = 0.1;
  const body = new THREE.Mesh(
    new THREE.ExtrudeGeometry(guitarOutline(), { depth, bevelEnabled: true, bevelSize: 0.015, bevelThickness: 0.015, bevelSegments: 2, curveSegments: 4 }),
    flat('#d4483b', { roughness: 0.4 }),
  );
  body.position.z = -depth / 2;
  guitar.add(body);
  // Plaque de protection, micros, chevalet et boutons sur la face avant.
  const face = depth / 2 + 0.017;
  const guard = new THREE.Mesh(new THREE.ShapeGeometry(guitarOutline()), flat('#f4efe6', { roughness: 0.5 }));
  guard.scale.setScalar(0.62);
  guard.position.set(0.02, -0.03, face);
  guitar.add(guard);
  const chrome = flat('#c9d0d6', { metalness: 0.6, roughness: 0.3 });
  for (const y of [0.08, -0.03, -0.13]) guitar.add(box(0.16, 0.035, 0.02, black, 0, y, face + 0.01));
  guitar.add(box(0.15, 0.04, 0.025, chrome, 0, -0.2, face + 0.01));
  const knobGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.03, 10);
  for (const [x, y] of [[0.12, -0.17], [0.15, -0.22], [0.11, -0.25]]) {
    const knob = new THREE.Mesh(knobGeo, chrome);
    knob.rotation.x = Math.PI / 2;
    knob.position.set(x, y, face + 0.015);
    guitar.add(knob);
  }
  // Manche, touche et tête.
  const neckLength = 0.62;
  guitar.add(box(0.075, neckLength, 0.05, flat('#e2b07a'), 0, 0.16 + neckLength / 2, 0.015));
  guitar.add(box(0.07, neckLength, 0.012, flat('#5b3a29'), 0, 0.16 + neckLength / 2, 0.045));
  const headY = 0.16 + neckLength + 0.09;
  const head = box(0.1, 0.2, 0.04, flat('#e2b07a'), 0.015, headY, 0.01);
  head.rotation.z = -0.12;
  guitar.add(head);
  const pegGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.05, 6);
  for (let i = 0; i < 3; i++) {
    for (const side of [-1, 1]) {
      const peg = new THREE.Mesh(pegGeo, chrome);
      peg.rotation.z = Math.PI / 2;
      peg.position.set(0.015 + side * 0.065, headY - 0.06 + i * 0.06, 0.01);
      guitar.add(peg);
    }
  }
  guitar.scale.setScalar(scale);
  guitar.position.y = 0.31 * scale + 0.12;
  guitar.rotation.x = -0.16;
  stand.add(guitar);

  // Support : un berceau sous le corps et un montant qui tient le manche.
  stand.add(box(0.6, 0.06, 0.36, black, 0, 0.1, 0.02));
  for (const x of [-0.25, 0.25]) stand.add(box(0.05, 0.12, 0.05, black, x, 0.05, 0.14));
  const post = box(0.05, 1.45, 0.05, black, 0, 0.78, -0.26);
  post.rotation.x = -0.16;
  stand.add(post);
  stand.add(box(0.16, 0.05, 0.1, black, 0, 1.45, -0.36));
  return stand;
}

// Haut-parleur : membrane, suspension et cache-noyau, face à +z. Renvoie le groupe et la membrane, qui vibre.
function driver(radius, depth) {
  const group = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, radius * 0.12, 8, 32), flat('#5c6577', { metalness: 0.4, roughness: 0.4 }));
  group.add(ring);
  const cone = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.25, radius, depth, 32, 1, true), flat('#161a22', { side: THREE.DoubleSide }));
  cone.rotation.x = -Math.PI / 2;
  cone.position.z = -depth / 2;
  const cap = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.25, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), flat('#ffb347', { roughness: 0.5 }));
  cap.rotation.x = Math.PI / 2;
  cap.position.z = -depth;
  const membrane = new THREE.Group();
  membrane.add(cone, cap);
  group.add(membrane);
  return { group, membrane };
}

// Grande enceinte sur pieds : un boomer en bas, un tweeter en haut.
export function buildSpeaker() {
  const speaker = new THREE.Group();
  const width = 0.85;
  const height = 1.35;
  const depth = 0.6;
  const lift = 0.12;
  speaker.add(box(width, height, depth, flat('#2a3142', { roughness: 0.7 }), 0, lift + height / 2, 0));
  speaker.add(box(width - 0.08, height - 0.08, 0.02, flat('#3a4358'), 0, lift + height / 2, depth / 2 + 0.005));
  for (const x of [-0.3, 0.3]) speaker.add(box(0.12, lift, 0.4, flat('#1f2430'), x, lift / 2, 0));

  const woofer = driver(0.3, 0.12);
  woofer.group.position.set(0, lift + 0.42, depth / 2 + 0.03);
  const tweeter = driver(0.12, 0.05);
  tweeter.group.position.set(0, lift + 1.0, depth / 2 + 0.03);
  speaker.add(woofer.group, tweeter.group);
  // Petit voyant orange, comme sur un ampli allumé.
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), new THREE.MeshBasicMaterial({ color: '#ff7a45' }));
  led.position.set(0.3, lift + height - 0.12, depth / 2 + 0.02);
  speaker.add(led);
  return { speaker, membranes: [woofer.membrane, tweeter.membrane] };
}

// Rangée de fenêtres posées sur une façade : `count` fenêtres de `w` × `h`, centrées en x, à la hauteur `y`.
function windowRow(group, material, { count, w, h, gap, y, z, x = 0, rotY = 0 }) {
  for (let i = 0; i < count; i++) {
    const offset = (i - (count - 1) / 2) * (w + gap);
    const pane = box(w, h, 0.03, material);
    pane.position.set(x + Math.cos(rotY) * offset, y, z - Math.sin(rotY) * offset);
    pane.rotation.y = rotY;
    group.add(pane);
  }
}

// École d'ingénieurs moderne : deux volumes blancs aux bandes vitrées, une enseigne sur le toit.
export function buildEigsi() {
  const school = new THREE.Group();
  const wall = flat('#f2ede4');
  const glass = flat('#7fb8de', { roughness: 0.25, metalness: 0.2 });
  const main = { w: 3, h: 1.3, d: 1.4 };
  school.add(box(main.w, main.h, main.d, wall, 0, main.h / 2, 0));
  for (const y of [0.42, 0.95]) windowRow(school, glass, { count: 6, w: 0.36, h: 0.28, gap: 0.1, y, z: main.d / 2 + 0.01 });
  // Aile plus haute à gauche.
  const tower = { w: 1, h: 2.1, d: 1.2, x: -1.85 };
  school.add(box(tower.w, tower.h, tower.d, wall, tower.x, tower.h / 2, -0.05));
  for (const y of [0.5, 1.05, 1.6]) windowRow(school, glass, { count: 2, w: 0.32, h: 0.3, gap: 0.12, y, z: tower.d / 2 - 0.04, x: tower.x });
  // Entrée vitrée et auvent.
  school.add(box(0.6, 0.6, 0.03, glass, 0.6, 0.3, main.d / 2 + 0.02));
  school.add(box(0.9, 0.05, 0.4, flat('#3a4358'), 0.6, 0.66, main.d / 2 + 0.18));
  // Enseigne sur le toit.
  const sign = texturedFront(1.5, 0.38, 0.05, flat('#1d2b5e'), signTexture('EIGSI', '#1d2b5e'));
  sign.position.set(0.3, main.h + 0.32, 0.1);
  school.add(sign);
  for (const x of [-0.25, 0.85]) school.add(box(0.05, 0.14, 0.05, flat('#3a4358'), x, main.h + 0.07, 0.1));
  return school;
}

// Campus d'Orkney : bâtiment de pierre au toit d'ardoise, enseigne devant, éolienne à côté.
// Renvoie le groupe et le rotor de l'éolienne, qui tourne.
export function buildHeriotWatt() {
  const campus = new THREE.Group();
  const stone = flat('#b8ad9a');
  const slate = flat('#4a5263');
  const size = { w: 2.6, h: 1.05, d: 1.3 };
  campus.add(box(size.w, size.h, size.d, stone, 0, size.h / 2, 0));
  // Toit à deux pans : un prisme triangulaire couché le long de x.
  const roofHeight = 0.6;
  const roofShape = new THREE.Shape([
    new THREE.Vector2(-size.d / 2 - 0.1, 0),
    new THREE.Vector2(size.d / 2 + 0.1, 0),
    new THREE.Vector2(0, roofHeight),
  ]);
  const roof = new THREE.Mesh(new THREE.ExtrudeGeometry(roofShape, { depth: size.w + 0.16, bevelEnabled: false }), slate);
  roof.rotation.y = Math.PI / 2;
  roof.position.set(-size.w / 2 - 0.08, size.h, 0);
  campus.add(roof);
  for (const x of [-0.85, 0.85]) {
    const chimney = box(0.18, 0.4, 0.18, stone, x, size.h + 0.45, -0.2);
    campus.add(chimney);
  }
  const glass = flat('#5a7fa6', { roughness: 0.3 });
  windowRow(campus, glass, { count: 5, w: 0.26, h: 0.3, gap: 0.2, y: 0.68, z: size.d / 2 + 0.01 });
  windowRow(campus, glass, { count: 2, w: 0.26, h: 0.3, gap: 1.5, y: 0.28, z: size.d / 2 + 0.01 });
  campus.add(box(0.34, 0.5, 0.03, flat('#2f5d50'), 0, 0.25, size.d / 2 + 0.02));

  // Enseigne basse devant le bâtiment.
  const sign = texturedFront(1.3, 0.3, 0.05, flat('#3a4358'), signTexture('Heriot-Watt', '#2c3a55'));
  sign.position.set(0, 0.36, size.d / 2 + 0.55);
  campus.add(sign);
  for (const x of [-0.55, 0.55]) campus.add(box(0.05, 0.22, 0.05, flat('#3a4358'), x, 0.11, size.d / 2 + 0.55));

  // Éolienne : mât, nacelle et rotor à trois pales tourné vers +z.
  const turbine = new THREE.Group();
  const white = flat('#f4f4f4', { roughness: 0.6 });
  const mastHeight = 3.2;
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.1, mastHeight, 10), white);
  mast.position.y = mastHeight / 2;
  turbine.add(mast);
  turbine.add(box(0.16, 0.16, 0.36, white, 0, mastHeight, -0.04));
  const rotor = new THREE.Group();
  rotor.position.set(0, mastHeight, 0.18);
  rotor.add(new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), white));
  for (let i = 0; i < 3; i++) {
    const blade = box(0.1, 1.3, 0.025, white, 0, 0.68, 0);
    const arm = new THREE.Group();
    arm.rotation.z = (i * Math.PI * 2) / 3;
    arm.add(blade);
    rotor.add(arm);
  }
  turbine.add(rotor);
  turbine.position.set(2.1, 0, -0.5);
  campus.add(turbine);
  return { campus, rotor };
}

// Pièce d'échecs tournée (pion, tour ou roi), à partir de son profil (rayon, hauteur).
function chessPiece(kind, material) {
  const profiles = {
    pawn: [[0, 0], [0.07, 0], [0.07, 0.025], [0.04, 0.05], [0.028, 0.11], [0.045, 0.125], [0.04, 0.16], [0, 0.175]],
    rook: [[0, 0], [0.075, 0], [0.075, 0.03], [0.045, 0.06], [0.04, 0.16], [0.06, 0.17], [0.06, 0.21], [0, 0.21]],
    king: [[0, 0], [0.08, 0], [0.08, 0.03], [0.045, 0.07], [0.035, 0.22], [0.06, 0.24], [0.04, 0.27], [0, 0.27]],
  };
  const piece = new THREE.Group();
  piece.add(new THREE.Mesh(new THREE.LatheGeometry(profiles[kind].map(([r, y]) => new THREE.Vector2(r, y)), 10), material));
  if (kind === 'king') {
    piece.add(box(0.02, 0.09, 0.02, material, 0, 0.31, 0));
    piece.add(box(0.06, 0.02, 0.02, material, 0, 0.32, 0));
  }
  return piece;
}

// Échiquier sur une petite table, une partie en cours.
export function buildChess() {
  const chess = new THREE.Group();
  const wood = flat('#8a5a3b');
  const tableHeight = 0.55;
  chess.add(box(1.1, 0.06, 1.1, wood, 0, tableHeight, 0));
  for (const [x, z] of [[-0.45, -0.45], [0.45, -0.45], [-0.45, 0.45], [0.45, 0.45]]) {
    chess.add(box(0.06, tableHeight, 0.06, wood, x, tableHeight / 2, z));
  }
  const squares = canvasTexture(256, 256, (ctx, w) => {
    const s = w / 8;
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        ctx.fillStyle = (i + j) % 2 ? '#6b4a2f' : '#f1dfc0';
        ctx.fillRect(i * s, j * s, s, s);
      }
    }
  });
  const side = flat('#4a3222');
  const board = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.05, 0.96), [
    side, side, new THREE.MeshStandardMaterial({ map: squares, roughness: 0.6 }), side, side, side,
  ]);
  board.position.y = tableHeight + 0.055;
  chess.add(board);

  const white = flat('#f4efe6', { roughness: 0.5 });
  const black = flat('#2a2a30', { roughness: 0.5 });
  const cell = 0.96 / 8;
  const at = (col, row) => [(col - 3.5) * cell, (row - 3.5) * cell];
  const pieces = [
    ['king', white, 4, 0], ['rook', white, 0, 0], ['pawn', white, 3, 3], ['pawn', white, 4, 1], ['pawn', white, 5, 2],
    ['king', black, 6, 7], ['rook', black, 2, 6], ['pawn', black, 4, 4], ['pawn', black, 6, 6], ['pawn', black, 1, 5],
  ];
  for (const [kind, material, col, row] of pieces) {
    const piece = chessPiece(kind, material);
    const [x, z] = at(col, row);
    piece.position.set(x, tableHeight + 0.08, z);
    chess.add(piece);
  }
  return chess;
}

// Puce électronique sur sa carte, un cerveau posé dessus. Renvoie aussi les pistes lumineuses, qui pulsent.
export function buildBrainChip() {
  const group = new THREE.Group();
  const board = texturedFront(1.7, 1.7, 0.06, flat('#1f5e3a'), canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#1f6e43';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#e0b84f';
    ctx.lineWidth = 3;
    for (let i = 0; i < 8; i++) {
      const p = 40 + i * 25;
      ctx.beginPath();
      ctx.moveTo(p, 0);
      ctx.lineTo(p, 40 + (i % 3) * 8);
      ctx.moveTo(p, h);
      ctx.lineTo(p, h - 40 - (i % 2) * 10);
      ctx.moveTo(0, p);
      ctx.lineTo(40 + (i % 2) * 10, p);
      ctx.moveTo(w, p);
      ctx.lineTo(w - 40 - (i % 3) * 8, p);
      ctx.stroke();
    }
  }));
  board.rotation.x = -Math.PI / 2;
  board.position.y = 0.2;
  group.add(board);
  for (const [x, z] of [[-0.7, -0.7], [0.7, -0.7], [-0.7, 0.7], [0.7, 0.7]]) group.add(box(0.08, 0.17, 0.08, flat('#3a4358'), x, 0.085, z));

  // Le boîtier noir de la puce et ses broches dorées.
  const top = 0.23;
  group.add(box(0.9, 0.1, 0.9, flat('#1b1e26', { roughness: 0.4 }), 0, top + 0.05, 0));
  const gold = flat('#e0b84f', { metalness: 0.7, roughness: 0.3 });
  const pins = new THREE.InstancedMesh(new THREE.BoxGeometry(0.05, 0.03, 0.12), gold, 28);
  const dummy = new THREE.Object3D();
  let n = 0;
  for (let side = 0; side < 4; side++) {
    for (let i = 0; i < 7; i++) {
      const along = (i - 3) * 0.11;
      dummy.position.set(0, top + 0.02, 0.5);
      dummy.position.x = along;
      dummy.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), (side * Math.PI) / 2);
      dummy.rotation.set(0, (side * Math.PI) / 2, 0);
      dummy.updateMatrix();
      pins.setMatrixAt(n++, dummy.matrix);
    }
  }
  group.add(pins);

  // Deux hémisphères bosselés, séparés par un sillon.
  const pink = flat('#f2a0b4', { roughness: 0.7 });
  for (const sideX of [-1, 1]) {
    const geo = new THREE.IcosahedronGeometry(0.3, 2);
    const p = geo.attributes.position;
    const v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      const bump = 1 + 0.08 * Math.sin(v.x * 31 + v.y * 17) * Math.sin(v.z * 27 - v.y * 11);
      v.multiplyScalar(bump);
      p.setXYZ(i, v.x, v.y, v.z);
    }
    geo.computeVertexNormals();
    const half = new THREE.Mesh(geo, pink);
    half.scale.set(0.85, 0.8, 1.25);
    half.position.set(sideX * 0.18, top + 0.38, 0);
    group.add(half);
  }

  // Pistes lumineuses qui montent de la puce vers le cerveau.
  const glow = new THREE.MeshBasicMaterial({ color: '#7ef0ff', transparent: true, opacity: 0.6 });
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const trace = box(0.025, 0.012, 0.32, glow, Math.cos(angle) * 0.28, top + 0.105, Math.sin(angle) * 0.28);
    trace.rotation.y = -angle + Math.PI / 2;
    group.add(trace);
  }
  return { chip: group, glow };
}

// Roue de vélo : pneu, jante et quelques rayons, dans le plan xy. Elle tourne autour de z.
function bikeWheel(radius, tire, rim) {
  const wheel = new THREE.Group();
  wheel.add(new THREE.Mesh(new THREE.TorusGeometry(radius, 0.03, 6, 20), tire));
  wheel.add(new THREE.Mesh(new THREE.TorusGeometry(radius - 0.04, 0.012, 4, 20), rim));
  for (let i = 0; i < 4; i++) {
    const spoke = box(0.008, radius * 2 - 0.08, 0.008, rim);
    spoke.rotation.z = (i * Math.PI) / 4;
    wheel.add(spoke);
  }
  return wheel;
}

// Tube entre deux points du plan de la roue (x vers l'avant, y vers le haut).
function tube(material, [x0, y0], [x1, y1], radius = 0.022, z = 0) {
  const length = Math.hypot(x1 - x0, y1 - y0);
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 6), material);
  mesh.position.set((x0 + x1) / 2, (y0 + y1) / 2, z);
  mesh.rotation.z = Math.atan2(y1 - y0, x1 - x0) - Math.PI / 2;
  return mesh;
}

// Vélo de voyage, avant vers +x : cadre, porte-bagages à l'avant et à l'arrière, sacoches. Renvoie le vélo et ses
// roues, qui tournent quand il roule.
export function buildBike() {
  const bike = new THREE.Group();
  const frame = flat('#2f6fb5', { metalness: 0.3, roughness: 0.5 });
  const dark = flat('#1f2430');
  const rim = flat('#c9d0d6', { metalness: 0.6, roughness: 0.3 });
  const r = 0.3;
  const rear = [-0.5, r];
  const front = [0.5, r];
  const crank = [-0.05, r - 0.02];
  const seat = [-0.15, 0.78];
  const head = [0.36, 0.78];
  const wheels = [rear, front].map(([x, y]) => {
    const wheel = bikeWheel(r, dark, rim);
    wheel.position.set(x, y, 0);
    bike.add(wheel);
    return wheel;
  });
  for (const [a, b] of [[rear, crank], [rear, seat], [crank, seat], [crank, head], [seat, head], [head, front]]) {
    bike.add(tube(frame, a, b));
  }
  bike.add(tube(rim, seat, [seat[0] - 0.03, seat[1] + 0.1], 0.015));
  bike.add(box(0.2, 0.04, 0.09, dark, seat[0] - 0.04, seat[1] + 0.12, 0));
  bike.add(tube(rim, head, [head[0] - 0.04, head[1] + 0.14], 0.015));
  bike.add(box(0.04, 0.03, 0.42, dark, head[0] - 0.05, head[1] + 0.15, 0));

  // Porte-bagages : plateaux au-dessus des roues et sacoches de chaque côté.
  const rack = flat('#3a4358', { metalness: 0.4 });
  bike.add(box(0.42, 0.02, 0.16, rack, -0.48, 0.66, 0));
  bike.add(tube(rack, [-0.3, 0.66], seat, 0.012));
  bike.add(tube(rack, [-0.62, 0.66], rear, 0.012));
  bike.add(box(0.3, 0.02, 0.14, rack, 0.52, 0.6, 0));
  bike.add(tube(rack, [0.52, 0.6], front, 0.012));
  const bags = [flat('#d4483b'), flat('#f2b33d')];
  for (const z of [-0.12, 0.12]) {
    bike.add(box(0.3, 0.26, 0.09, bags[0], -0.5, 0.52, z));
    bike.add(box(0.2, 0.2, 0.08, bags[1], 0.52, 0.5, z));
  }
  bike.add(box(0.3, 0.12, 0.16, flat('#2f9e5b'), -0.48, 0.73, 0));
  return { bike, wheels };
}

// ULM pendulaire, avant vers +x : un chariot à trois roues, l'aile delta au-dessus sur son mât, l'hélice derrière.
// Renvoie l'appareil et l'hélice, qui tourne.
export function buildMicrolight() {
  const ulm = new THREE.Group();
  const white = flat('#f4f4f4', { roughness: 0.6 });
  const dark = flat('#2a3142');
  const steel = flat('#c9d0d6', { metalness: 0.5, roughness: 0.3 });

  // Chariot : nacelle profilée, deux sièges en tandem, train tricycle.
  const pod = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), flat('#d4483b', { roughness: 0.5 }));
  pod.scale.set(2.1, 0.9, 0.9);
  pod.position.set(0.1, 0.42, 0);
  ulm.add(pod);
  ulm.add(box(0.75, 0.04, 0.05, steel, -0.25, 0.32, 0));
  const tire = new THREE.CylinderGeometry(0.09, 0.09, 0.05, 10);
  for (const [x, z] of [[0.48, 0], [-0.3, -0.36], [-0.3, 0.36]]) {
    const wheel = new THREE.Mesh(tire, dark);
    wheel.rotation.x = Math.PI / 2;
    wheel.position.set(x, 0.09, z);
    ulm.add(wheel);
    ulm.add(tube(steel, [x, 0.09], [x * 0.6, 0.34], 0.012, z * 0.8));
  }

  // Mât et aile delta : un triangle à bord de fuite échancré, légèrement en flèche.
  ulm.add(tube(steel, [-0.15, 0.42], [-0.05, 1.25], 0.02));
  ulm.add(tube(steel, [0.35, 0.45], [0.05, 1.12], 0.012));
  const wingShape = new THREE.Shape([
    new THREE.Vector2(0.55, 0),
    new THREE.Vector2(-0.45, 1.25),
    new THREE.Vector2(-0.25, 0.2),
    new THREE.Vector2(-0.3, 0),
    new THREE.Vector2(-0.25, -0.2),
    new THREE.Vector2(-0.45, -1.25),
  ]);
  const wing = new THREE.Mesh(new THREE.ShapeGeometry(wingShape), flat('#f2b33d', { side: THREE.DoubleSide, roughness: 0.6 }));
  wing.rotation.x = -Math.PI / 2;
  wing.position.set(0, 1.28, 0);
  ulm.add(wing);
  ulm.add(box(1.0, 0.03, 0.03, white, 0.03, 1.29, 0));

  // Hélice propulsive derrière le moteur.
  ulm.add(box(0.16, 0.14, 0.16, dark, -0.4, 0.5, 0));
  const propeller = new THREE.Group();
  propeller.position.set(-0.5, 0.5, 0);
  propeller.add(box(0.03, 0.62, 0.06, white));
  ulm.add(propeller);
  return { ulm, propeller };
}
