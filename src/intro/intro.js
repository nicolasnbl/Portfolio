import * as THREE from 'three';
import { INTRO, T } from '../config.js';
import { PATH, PLANET_RADIUS, buildPlanet, updateSmoke } from './planet.js';
import { buildRocket, setFairingOpen, setThrust } from './rocket.js';
import { clamp01, easeInOutCubic, easeOutCubic, lerp, progress, seededRandom, smoothstep } from './math.js';

// Trajectoire : la fusée part à la verticale puis s'incline progressivement (virage gravitationnel).
const CLIMB_HEIGHT = 40;
const CLIMB_ARC = 0.2; // angle parcouru autour de la planète, en radians
const PAYLOAD_HEIGHT = 2.8; // hauteur de la charge utile dans le repère de la fusée
const NAME_EXIT = 0.9; // distance dont le nom sort de la coiffe

const SKY = new THREE.Color('#bfe6ff');
const SPACE = new THREE.Color('#05060f');

// Cadrages successifs de la caméra.
// space "world" : offset et look dans le repère de la scène, relatifs à la fusée (ou au pas de tir avant le décollage).
// space "rocket" : [le long de la fusée, au-dessus d'elle, sur le côté], pour suivre son inclinaison.
// toPlanet : part du regard tirée vers le centre de la planète. roll : rotation de l'image, en degrés.
const CAMERA_KEYS = [
  // Ouverture en plongée sur la centrale : l'eau remplit tout le fond, l'horizon reste hors champ.
  { t: 0, space: 'world', offset: [0, 5.6, 3.1], look: [0, 0.2, 0], toPlanet: 0, roll: 0, fov: 40 },
  { t: 2.2, space: 'world', offset: [0, 5.2, 3.0], look: [0, 0.2, 0], toPlanet: 0, roll: 0, fov: 40 },
  { t: 4.3, space: 'world', offset: [3.4, 2.8, 8.2], look: [0, 0.8, 0], toPlanet: 0, roll: 0, fov: 42 },
  { t: 5.2, space: 'world', offset: [2.8, 1.6, 6.8], look: [0, 1.6, 0], toPlanet: 0, roll: 0, fov: 45 },
  { t: 6.4, space: 'world', offset: [4, 7, 13], look: [0, 0, 0], toPlanet: 0.08, roll: 0, fov: 52 },
  // Plan large de côté : on voit la courbe de la trajectoire et la planète.
  { t: 8.4, space: 'world', offset: [-6, 6, 34], look: [0, 0, 0], toPlanet: 0.22, roll: 0, fov: 55 },
  // Plan final, comme l'image de référence : fusée inclinée, coiffe ouverte, planète en arrière-plan.
  // La caméra est devant la fusée, au-dessus d'elle : la coiffe au premier plan, la planète derrière la base.
  // L'image est tournée d'un quart de tour pour que la fusée monte vers la droite, la planète en bas à gauche.
  { t: 9.6, space: 'rocket', offset: [4.6, 4.6, -1.2], look: [PAYLOAD_HEIGHT + NAME_EXIT, 0, 0], toPlanet: 0, roll: 90, fov: 50 },
  { t: 11.6, space: 'rocket', offset: [4, 4, -1], look: [PAYLOAD_HEIGHT + NAME_EXIT, 0, 0], toPlanet: 0, roll: 90, fov: 50 },
];

function buildStars() {
  const rand = seededRandom(3);
  const count = 1600;
  const positions = new Float32Array(count * 3);
  const v = new THREE.Vector3();
  for (let i = 0; i < count; i++) {
    v.set(rand() - 0.5, rand() - 0.5, rand() - 0.5).normalize().multiplyScalar(600 + rand() * 160);
    v.toArray(positions, i * 3);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  return new THREE.Points(
    geometry,
    new THREE.PointsMaterial({ color: '#ffffff', size: 2, sizeAttenuation: false, transparent: true, opacity: 0 }),
  );
}

// Traînée de fumée le long de la trajectoire, qui en dessine la courbe.
const TRAIL_PUFFS = 140;
function buildTrail() {
  const trail = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(1, 1),
    new THREE.MeshStandardMaterial({ color: '#f4f4f2', flatShading: true, transparent: true, opacity: 0.85 }),
    TRAIL_PUFFS,
  );
  trail.frustumCulled = false;
  trail.visible = false;
  return trail;
}

export function createIntro({ canvas, overlay, onStart, onEnd }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.background = SKY.clone();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 2000);

  scene.add(new THREE.HemisphereLight('#ffffff', '#5a6b8c', 1.4));
  const sun = new THREE.DirectionalLight('#fff1d6', 2.4);
  sun.position.set(20, 30, 18);
  scene.add(sun);

  const stars = buildStars();
  scene.add(stars);

  const isSmall = window.innerWidth < 768;
  const { planet, pad, padTop, smoke } = buildPlanet({ treeCount: isSmall ? 26 : 46 });
  scene.add(planet);

  const trail = buildTrail();
  scene.add(trail);

  const rocketParts = buildRocket();
  const { rocket } = rocketParts;
  rocket.position.y = padTop;
  pad.add(rocket);
  let rocketDetached = false;

  // Éléments HTML de l'overlay.
  const titleEls = INTRO.titles.map((title) => {
    const el = document.createElement('h2');
    el.className = 'intro-title';
    el.textContent = title.text;
    overlay.appendChild(el);
    return { el, ...title };
  });
  const nameEl = overlay.querySelector('.intro-name');
  const hintEl = overlay.querySelector('.intro-hint');

  const launchRadius = PLANET_RADIUS + padTop;
  const UP = new THREE.Vector3(0, 1, 0);
  const SIDE = new THREE.Vector3(0, 0, 1);

  // Position sur la trajectoire pour u de 0 (pas de tir) à 1 (fin de la montée).
  function flightPoint(u, out) {
    const r = launchRadius + CLIMB_HEIGHT * (0.4 * u + 0.6 * (1 - (1 - u) ** 2));
    const theta = CLIMB_ARC * u * u;
    return out.set(Math.sin(theta) * r, Math.cos(theta) * r, 0);
  }

  const rocketPos = new THREE.Vector3();
  const rocketDir = new THREE.Vector3(0, 1, 0);
  const rocketUp = new THREE.Vector3();
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const camPos = new THREE.Vector3();
  const camLook = new THREE.Vector3();
  const keyPos = new THREE.Vector3();
  const keyLook = new THREE.Vector3();
  const namePoint = new THREE.Vector3();
  const puff = new THREE.Object3D();

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  // Position et point visé pour une image clé, dans le repère de la scène.
  function resolveKey(key, portrait, outPos, outLook) {
    const scale = portrait ? 1.5 : 1;
    const [o0, o1, o2] = key.offset;
    const [l0, l1, l2] = key.look;
    if (key.space === 'rocket') {
      outPos
        .copy(rocketPos)
        .addScaledVector(rocketDir, o0 * scale)
        .addScaledVector(rocketUp, o1 * scale)
        .addScaledVector(SIDE, o2 * scale);
      outLook.copy(rocketPos).addScaledVector(rocketDir, l0).addScaledVector(rocketUp, l1).addScaledVector(SIDE, l2);
      outLook.lerp(planet.position, key.toPlanet);
    } else {
      outPos.set(o0, o1, o2).multiplyScalar(scale).add(rocketPos);
      outLook.set(l0, l1, l2).add(rocketPos);
      // Écran large : on regarde moins vers la planète pour garder la fusée dans le cadre.
      outLook.lerp(planet.position, key.toPlanet * (portrait ? 1 : 0.7));
    }
  }

  function placeCamera(t, clock) {
    const portrait = camera.aspect < 1;
    let i = 0;
    while (i < CAMERA_KEYS.length - 1 && t > CAMERA_KEYS[i + 1].t) i++;
    const from = CAMERA_KEYS[i];
    const to = CAMERA_KEYS[Math.min(i + 1, CAMERA_KEYS.length - 1)];
    const k = from === to ? 0 : smoothstep(progress(t, from.t, to.t));

    resolveKey(from, portrait, camPos, camLook);
    resolveKey(to, portrait, keyPos, keyLook);
    camPos.lerp(keyPos, k);
    camLook.lerp(keyLook, k);
    camPos.x += Math.sin(clock * 0.4) * 0.2;

    camera.position.copy(camPos);
    camera.up.copy(UP);
    camera.lookAt(camLook);
    camera.rotateZ(THREE.MathUtils.degToRad(lerp(from.roll, to.roll, k)));
    camera.fov = lerp(from.fov, to.fov, k);
    camera.updateProjectionMatrix();
  }

  function render(t, clock) {
    // 1. La planète tourne pour faire défiler le décor jusqu'au pas de tir.
    const roll = easeInOutCubic(progress(t, T.rollStart, T.rollEnd));
    planet.rotation.z = (roll * PATH.pad) / PLANET_RADIUS;

    // 2. Décollage : départ à la verticale, puis la fusée s'incline et ralentit en arrivant dans l'espace.
    if (t >= T.liftoff && !rocketDetached) {
      scene.attach(rocket);
      rocketDetached = true;
    } else if (t < T.liftoff && rocketDetached) {
      pad.attach(rocket);
      rocket.position.set(0, padTop, 0);
      rocket.quaternion.identity();
      rocketDetached = false;
    }
    const climb = progress(t, T.liftoff, T.climbEnd);
    const u = 1 - (1 - climb) ** 2;
    flightPoint(u, rocketPos);
    flightPoint(Math.min(1, u + 0.002), b).sub(flightPoint(Math.max(0, u - 0.002), a));
    rocketDir.copy(b).normalize();
    rocketUp.crossVectors(SIDE, rocketDir).normalize();
    if (rocketDetached) {
      rocket.position.copy(rocketPos);
      rocket.quaternion.setFromUnitVectors(UP, rocketDir);
    }
    setThrust(rocketParts, t >= T.liftoff - 0.15 && climb < 0.9, clock);
    updateSmoke(smoke, progress(t, T.liftoff - 0.1, T.liftoff + 2.2));

    trail.visible = rocketDetached;
    if (rocketDetached) {
      for (let i = 0; i < TRAIL_PUFFS; i++) {
        const k = i / (TRAIL_PUFFS - 1);
        // Les bouffées les plus anciennes, près du sol, ont eu le temps de grossir.
        flightPoint(u * k * 0.985, puff.position);
        puff.scale.setScalar(lerp(0.9, 0.12, k) * (0.5 + 0.5 * clamp01(u * 4)));
        puff.rotation.set(i, i * 1.7, 0);
        puff.updateMatrix();
        trail.setMatrixAt(i, puff.matrix);
      }
      trail.instanceMatrix.needsUpdate = true;
    }

    // 3. Le ciel devient l'espace à mesure qu'on s'éloigne.
    const altitude = rocketPos.length() - launchRadius;
    const space = smoothstep(clamp01(altitude / 26));
    scene.background.copy(SKY).lerp(SPACE, space);
    stars.material.opacity = space * (0.85 + 0.15 * Math.sin(clock * 2));

    // 4. La coiffe s'ouvre.
    setFairingOpen(rocketParts.halves, easeOutCubic(progress(t, T.fairingStart, T.fairingEnd)));
    rocketParts.payload.visible = t > T.fairingStart;

    // 5. Caméra.
    placeCamera(t, clock);

    // 6. Titres, puis le nom qui sort de la coiffe dans l'axe de la fusée.
    for (const title of titleEls) {
      const fadeIn = progress(t, title.start, title.start + 0.4);
      const fadeOut = 1 - progress(t, title.end - 0.4, title.end);
      title.el.style.opacity = Math.min(fadeIn, fadeOut);
      title.el.style.transform = `translate(-50%, ${(1 - fadeIn) * 20}px)`;
    }

    const nameP = easeOutCubic(progress(t, T.nameStart, T.nameEnd));
    namePoint.copy(rocketPos).addScaledVector(rocketDir, PAYLOAD_HEIGHT + NAME_EXIT * nameP).project(camera);
    nameEl.style.opacity = clamp01(nameP * 3);
    nameEl.style.left = `${(namePoint.x * 0.5 + 0.5) * 100}%`;
    nameEl.style.top = `${(-namePoint.y * 0.5 + 0.5) * 100}%`;
    nameEl.style.transform = `translate(-50%, -50%) scale(${lerp(0.05, 1, nameP)})`;
    hintEl.style.opacity = progress(t, T.end - 0.3, T.end + 0.4);

    renderer.render(scene, camera);
  }

  // Boucle : le scroll pendant l'intro accélère l'animation au lieu de la couper.
  const params = new URLSearchParams(window.location.search);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let alreadySeen = false;
  try {
    alreadySeen = sessionStorage.getItem('intro-seen') === '1';
  } catch {
    // Stockage indisponible : on rejoue l'intro.
  }
  let t = params.has('t') ? Number(params.get('t')) : alreadySeen || reducedMotion ? T.end + 0.5 : 0;
  const paused = params.has('pause');
  let boost = 0;
  let ended = false;
  let last = performance.now();

  const accelerate = () => {
    if (!ended) boost = 6;
  };
  window.addEventListener('wheel', accelerate, { passive: true });
  window.addEventListener('touchmove', accelerate, { passive: true });
  window.addEventListener('keydown', (e) => {
    if (['ArrowDown', 'PageDown', ' ', 'Enter'].includes(e.key)) accelerate();
  });

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!paused) t += dt * (1 + boost);
    boost = Math.max(0, boost - dt * 10);
    render(t, now / 1000);

    if (!ended && t >= T.end) {
      ended = true;
      try {
        sessionStorage.setItem('intro-seen', '1');
      } catch {
        // Rien à faire : l'intro sera simplement rejouée.
      }
      onEnd();
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  nameEl.querySelector('.intro-name-main').textContent = INTRO.name;
  nameEl.querySelector('.intro-name-sub').textContent = INTRO.tagline;
  hintEl.querySelector('span').textContent = INTRO.scrollHint;

  return {
    replay() {
      window.scrollTo({ top: 0, behavior: 'instant' });
      t = 0;
      ended = false;
      boost = 0;
      onStart();
    },
  };
}
