import * as THREE from 'three';
import { INTRO, T } from '../config.js';
import { PATH, PLANET_RADIUS, buildPlanet, updateSmoke } from './planet.js';
import { buildRocket, setFairingOpen, setThrust } from './rocket.js';
import { clamp01, easeInOutCubic, easeOutCubic, lerp, progress, seededRandom, smoothstep } from './math.js';

const CLIMB_HEIGHT = 80;
const SKY = new THREE.Color('#bfe6ff');
const SPACE = new THREE.Color('#05060f');

// Cadrages successifs de la caméra, relatifs au sommet de la fusée en vol (ou au sommet de la planète avant).
// offset : position de la caméra ; look : point visé ; toPlanet : part du regard tirée vers la planète.
const CAMERA_KEYS = [
  // Ouverture en plongée sur la centrale : l'eau remplit tout le fond, l'horizon reste hors champ.
  { t: 0, offset: [0, 5.6, 3.1], look: [0, 0.2, 0], toPlanet: 0, fov: 40 },
  { t: 2.2, offset: [0, 5.2, 3.0], look: [0, 0.2, 0], toPlanet: 0, fov: 40 },
  { t: 4.3, offset: [3.4, 2.8, 8.2], look: [0, 0.8, 0], toPlanet: 0, fov: 42 },
  { t: 5.2, offset: [2.8, 1.6, 6.8], look: [0, 1.6, 0], toPlanet: 0, fov: 45 },
  // En vol, la caméra passe au-dessus de la fusée : la planète apparaît derrière elle.
  { t: 6.2, offset: [5, 8, 12], look: [0, 0, 0], toPlanet: 0.08, fov: 52 },
  { t: 8.4, offset: [8, 18, 16], look: [0, 0, 0], toPlanet: 0.2, fov: 58 },
  { t: 9.4, offset: [2.2, 2.2, 5.5], look: [0, 2.4, 0], toPlanet: 0, fov: 45 },
  { t: 10.1, offset: [2.4, 2.4, 6], look: [0, 2.4, 0], toPlanet: 0, fov: 45 },
  { t: 11.4, offset: [10, 22, 22], look: [0, 0, 0], toPlanet: 0.17, fov: 58 },
];

function cameraAt(t) {
  let i = 0;
  while (i < CAMERA_KEYS.length - 1 && t > CAMERA_KEYS[i + 1].t) i++;
  const a = CAMERA_KEYS[i];
  const b = CAMERA_KEYS[Math.min(i + 1, CAMERA_KEYS.length - 1)];
  const k = a === b ? 0 : smoothstep(progress(t, a.t, b.t));
  const mix = (u, v) => u.map((x, j) => lerp(x, v[j], k));
  return {
    offset: mix(a.offset, b.offset),
    look: mix(a.look, b.look),
    toPlanet: lerp(a.toPlanet, b.toPlanet, k),
    fov: lerp(a.fov, b.fov, k),
  };
}

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

  const top = new THREE.Vector3(0, PLANET_RADIUS, 0);
  const anchor = new THREE.Vector3();
  const lookTarget = new THREE.Vector3();
  const payloadPos = new THREE.Vector3();

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  function render(t, clock) {
    // 1. La planète tourne pour faire défiler le décor jusqu'au pas de tir.
    const roll = easeInOutCubic(progress(t, T.rollStart, T.rollEnd));
    planet.rotation.z = (roll * PATH.pad) / PLANET_RADIUS;

    // 2. Décollage : la fusée quitte le pas de tir et monte vite, puis ralentit dans l'espace.
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
    // Départ franc, puis la fusée ralentit en arrivant dans l'espace.
    const altitude = CLIMB_HEIGHT * (0.35 * climb + 0.65 * easeOutCubic(climb));
    if (rocketDetached) {
      rocket.position.set(0, PLANET_RADIUS + padTop + altitude, 0);
      rocket.rotation.y = climb * Math.PI * 0.6 + Math.max(0, t - T.climbEnd) * 0.15;
    }
    setThrust(rocketParts, t >= T.liftoff - 0.15 && climb < 0.92, clock);
    updateSmoke(smoke, progress(t, T.liftoff - 0.1, T.liftoff + 2.2));

    // 3. Le ciel devient l'espace à mesure qu'on s'éloigne.
    const space = smoothstep(clamp01(altitude / 48));
    scene.background.copy(SKY).lerp(SPACE, space);
    stars.material.opacity = space * (0.85 + 0.15 * Math.sin(clock * 2));

    // 4. La coiffe s'ouvre.
    setFairingOpen(rocketParts.halves, easeOutCubic(progress(t, T.fairingStart, T.fairingEnd)));
    rocketParts.payload.visible = t > T.fairingStart;

    // 5. Caméra.
    const cam = cameraAt(t);
    // Écran vertical : on recule. Écran large : on regarde moins vers la planète pour garder la fusée dans le cadre.
    const portrait = camera.aspect < 1;
    const scale = portrait ? 1.5 : 1;
    anchor.copy(top).setY(PLANET_RADIUS + padTop + altitude);
    camera.position.set(
      anchor.x + cam.offset[0] * scale + Math.sin(clock * 0.4) * 0.25,
      anchor.y + cam.offset[1] * scale,
      anchor.z + cam.offset[2] * scale,
    );
    lookTarget.set(anchor.x + cam.look[0], anchor.y + cam.look[1], anchor.z + cam.look[2]);
    lookTarget.lerp(planet.position, cam.toPlanet * (portrait ? 1 : 0.7));
    camera.lookAt(lookTarget);
    camera.fov = cam.fov;
    camera.updateProjectionMatrix();

    // 6. Titres et nom.
    for (const title of titleEls) {
      const fadeIn = progress(t, title.start, title.start + 0.4);
      const fadeOut = 1 - progress(t, title.end - 0.4, title.end);
      const o = Math.min(fadeIn, fadeOut);
      title.el.style.opacity = o;
      title.el.style.transform = `translate(-50%, ${(1 - fadeIn) * 20}px)`;
    }

    const nameP = easeOutCubic(progress(t, T.nameStart, T.nameEnd));
    rocketParts.payload.getWorldPosition(payloadPos).project(camera);
    const fromX = (payloadPos.x * 0.5 + 0.5) * 100;
    const fromY = (-payloadPos.y * 0.5 + 0.5) * 100;
    nameEl.style.opacity = clamp01(nameP * 3);
    nameEl.style.left = `${lerp(fromX, 50, nameP)}%`;
    nameEl.style.top = `${lerp(fromY, 38, nameP)}%`;
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
      onStart();
    },
  };
}
