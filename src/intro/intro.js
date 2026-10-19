import * as THREE from 'three';
import { EXPLORE_T, INTRO, LEAVE, T } from '../config.js';
import { PATH, PLANET_RADIUS, buildPlanet, updateSmoke } from './planet.js';
import { CLOCK_DIR, createLeave } from './leave.js';
import { COMPANION_FOV, COMPANION_QUAT, companionLocal, saveHandoff } from '../explore/companion.js';
import { createNav } from './nav.js';
import { FAIRING_CENTER, buildRocket, setFairingOpen, setThrust } from './rocket.js';
import { clamp01, easeInOutCubic, easeOutCubic, lerp, progress, seededRandom, smoothstep } from './math.js';

// Trajectoire : départ à la verticale, puis la fusée s'incline vers la caméra (virage gravitationnel).
const CLIMB_LENGTH = 32;
const CLIMB_TURN = THREE.MathUtils.degToRad(20); // inclinaison en fin de montée, par rapport à la verticale

// Départ vers la page Explorer : de combien le satellite s'éloigne de la fusée, et l'écart à atteindre entre le regard
// et la direction de la planète pour qu'elle sorte du cadre.
const DEPART_EJECT = 8;
const DEPART_AWAY = THREE.MathUtils.degToRad(108);

const SKY = new THREE.Color('#bfe6ff');
const SPACE = new THREE.Color('#05060f');

// Cadrages successifs de la caméra.
// space "world" : offset et look dans le repère de la scène, relatifs à la fusée (ou au pas de tir avant le décollage).
// space "rocket" : [le long de la fusée, au-dessus d'elle, sur le côté], pour la suivre de près. « Au-dessus »
//   est le côté opposé à la planète en fin de montée. tilt : angle de la fusée à l'écran, en degrés (90 = droite).
// shift : décalage de l'image, en fraction de la demi-largeur et de la demi-hauteur de l'écran.
// portrait : réglages qui remplacent les autres sur écran vertical, dont scale, le recul de la caméra (1.5 par défaut).
const CAMERA_KEYS = [
  // Ouverture en plongée sur la centrale : l'eau remplit tout le fond, l'horizon reste hors champ.
  { t: 0, space: 'world', offset: [0, 5.6, 3.1], look: [0, 0.2, 0], fov: 40 },
  { t: 2.2, space: 'world', offset: [0, 5.2, 3.0], look: [0, 0.2, 0], fov: 40 },
  { t: 4.3, space: 'world', offset: [3.4, 2.8, 8.2], look: [0, 0.8, 0], fov: 42 },
  { t: 5.2, space: 'world', offset: [2.8, 1.6, 6.8], look: [0, 1.6, 0], fov: 45 },
  // La fusée monte et s'incline vers nous : la caméra l'accompagne, puis passe devant elle sans changer de côté.
  { t: 6.6, space: 'rocket', offset: [4.5, -5, 2], look: [1.5, 0, 0], tilt: 80, fov: 50, shift: [0.3, -0.1] },
  { t: 8.0, space: 'rocket', offset: [7.5, -3.2, 1], look: [2.2, 0, 0], tilt: 55, fov: 48, shift: [0.25, 0.1] },
  // Plan de l'image de référence : la fusée pointe vers nous, la coiffe en grand en haut à droite,
  // la planète derrière elle en bas à gauche. Puis la caméra recule un peu pendant que le nom sort.
  {
    t: 9.4,
    space: 'rocket',
    offset: [4.41, -0.7, 0],
    look: [FAIRING_CENTER, 0, 0],
    tilt: 30,
    fov: 50,
    shift: [0.3, 0.3],
    portrait: { tilt: 60, shift: [0.25, 0.05], scale: 1.8 },
  },
  {
    t: 11.6,
    space: 'rocket',
    offset: [4.74, -0.95, 0],
    look: [FAIRING_CENTER, 0, 0],
    tilt: 30,
    fov: 50,
    shift: [0.3, 0.3],
    portrait: { tilt: 62, shift: [0.35, -0.12], scale: 3 },
  },
];

export function buildStars() {
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
  const { planet, pad, padTop, smoke, clockSite } = buildPlanet({ treeCount: isSmall ? 26 : 46, clockDir: CLOCK_DIR });
  const leave = createLeave({ clockSite });
  scene.add(planet);

  const trail = buildTrail();
  scene.add(trail);

  const rocketParts = buildRocket();
  const { rocket } = rocketParts;
  const PAYLOAD_Y = rocketParts.payload.position.y;
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
  const nameSlide = nameEl.querySelector('.intro-name-slide');
  const hintEl = overlay.querySelector('.intro-hint');
  const navEl = overlay.querySelector('.intro-nav');
  const nav = createNav(navEl, INTRO.nav, {
    onAction: (action, index) => (action === 'explore' ? startDepart() : startLeave(index)),
  });

  // Départ vers la timeline. leaveU : secondes écoulées depuis le clic (négatif hors transition).
  let leaveU = -1;
  let leaveIndex = -1;
  let navigated = false;
  const SUN_START = sun.position.clone();
  const sunTarget = new THREE.Vector3();
  // Lumière qui suit la caméra pendant la plongée, comme sur la page timeline.
  const headlight = new THREE.DirectionalLight('#ffffff', 0);
  scene.add(headlight, headlight.target);
  // Matériaux de la planète (hors horloge), qui s'effacent à la fin pour ne laisser que le cadran sur les étoiles.
  let planetMaterials = null;
  function fadePlanet(opacity) {
    if (!planetMaterials) {
      if (opacity >= 1) return;
      const inClock = new Set();
      clockSite.traverse((o) => inClock.add(o));
      planetMaterials = [];
      planet.traverse((o) => {
        if (o.material && !inClock.has(o)) planetMaterials.push({ mat: o.material, base: o.material.opacity });
      });
    }
    for (const { mat, base } of planetMaterials) {
      mat.transparent = opacity < 1 || base < 1;
      mat.opacity = base * opacity;
    }
  }

  function startLeave(index) {
    if (leaveU >= 0 || departU >= 0) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      window.location.href = './timeline.html';
      return;
    }
    leave.buildClock();
    leaveU = 0;
    leaveIndex = index;
    navigated = false;
    navEl.inert = true;
    onStart();
  }

  // Retour sur la page par le bouton Précédent : on retrouve le plan final de l'intro.
  function resetLeave() {
    if (leaveU < 0) return;
    leaveU = -1;
    rocketParts.fairing.attach(rocketParts.payload);
    rocketParts.payload.position.set(0, PAYLOAD_Y, 0);
    rocketParts.payload.quaternion.identity();
    rocket.visible = true;
    sun.position.copy(SUN_START);
    headlight.intensity = 0;
    fadePlanet(1);
    nav.reset();
    navEl.inert = false;
    onEnd();
  }
  window.addEventListener('pageshow', (e) => e.persisted && resetLeave());

  // Vers « Explorer le monde » : le satellite se décroche, la caméra le suit et pivote autour de lui jusqu'à ne plus
  // voir que les étoiles, puis la page Explorer prend le relais. departU : secondes depuis le clic (négatif hors
  // transition). departDir : 1 à l'aller, -1 au retour de la page Explorer, qui rejoue la transition à l'envers.
  let departU = -1;
  let departDir = 1;
  let navRevealAt = -1; // au retour, le menu se redéploie depuis le satellite revenu dans la coiffe
  const exploreIndex = INTRO.nav.findIndex((item) => item.action === 'explore');
  const satLocal = new THREE.Vector3();
  const introQuat = new THREE.Quaternion();
  const awayQuat = new THREE.Quaternion();
  const rigQuat = new THREE.Quaternion();
  const lookMatrix = new THREE.Matrix4();

  function startDepart() {
    if (departU >= 0 || leaveU >= 0) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      window.location.href = './explore.html';
      return;
    }
    departU = 0;
    departDir = 1;
    navigated = false;
    navRevealAt = -1;
    navEl.inert = true;
    onStart();
  }

  function startReturn() {
    departU = EXPLORE_T.depart;
    departDir = -1;
    navigated = false;
    navRevealAt = Infinity;
    nav.reset();
    navEl.inert = true;
    onStart();
  }

  function endReturn(clock) {
    departU = -1;
    rocketParts.fairing.attach(rocketParts.payload);
    rocketParts.payload.position.set(0, PAYLOAD_Y, 0);
    rocketParts.payload.quaternion.identity();
    navRevealAt = clock;
    navEl.inert = false;
    onEnd();
  }
  // Retour par le bouton Précédent depuis la page Explorer : la page est restée sur le dernier plan, on rejoue à l'envers.
  window.addEventListener('pageshow', (e) => e.persisted && departU >= 0 && startReturn());

  const launchRadius = PLANET_RADIUS + padTop;
  const UP = new THREE.Vector3(0, 1, 0);
  const SIDE = new THREE.Vector3(1, 0, 0);

  // Trajectoire précalculée : la fusée part à la verticale et s'incline peu à peu vers la caméra (+z).
  const FLIGHT_STEPS = 400;
  const flightTable = [new THREE.Vector3(0, launchRadius, 0)];
  for (let i = 1; i <= FLIGHT_STEPS; i++) {
    const heading = CLIMB_TURN * ((i - 0.5) / FLIGHT_STEPS) ** 1.6;
    const step = new THREE.Vector3(0, Math.cos(heading), Math.sin(heading)).multiplyScalar(CLIMB_LENGTH / FLIGHT_STEPS);
    flightTable.push(flightTable[i - 1].clone().add(step));
  }

  // Position sur la trajectoire pour u de 0 (pas de tir) à 1 (fin de la montée).
  function flightPoint(u, out) {
    const f = clamp01(u) * FLIGHT_STEPS;
    const i = Math.min(FLIGHT_STEPS - 1, Math.floor(f));
    return out.copy(flightTable[i]).lerp(flightTable[i + 1], f - i);
  }

  const rocketPos = new THREE.Vector3();
  const rocketDir = new THREE.Vector3(0, 1, 0);
  const rocketUp = new THREE.Vector3();
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const camPos = new THREE.Vector3();
  const camLook = new THREE.Vector3();
  const camUp = new THREE.Vector3();
  const namePoint = new THREE.Vector3();
  const satPoint = new THREE.Vector3();
  const satAnchor = { x: 0, y: 0 };
  const satStartQuat = new THREE.Quaternion();
  const satDetachQuat = new THREE.Quaternion();
  const satSpin = new THREE.Quaternion();
  const detachFrom = new THREE.Vector3();
  const detachTo = new THREE.Vector3();
  // Écart entre la caméra et le satellite au moment du clic : la caméra le garde tel quel en le suivant.
  const followPos = new THREE.Vector3();
  const followLook = new THREE.Vector3();
  let followSet = false;
  const satQuat = new THREE.Quaternion();
  const satBasis = new THREE.Matrix4();
  let satTurn = 0;
  const puff = new THREE.Object3D();
  const makeView = () => ({
    pos: new THREE.Vector3(),
    look: new THREE.Vector3(),
    up: new THREE.Vector3(),
    shift: [0, 0],
    fov: 45,
  });
  const viewFrom = makeView();
  const viewTo = makeView();

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  // Vecteur « haut » de la caméra pour que la fusée apparaisse inclinée de `tilt` degrés à l'écran, pointe à droite.
  function upForTilt(pos, look, tilt, out) {
    const view = a.subVectors(look, pos).normalize();
    const axis = b.copy(rocketDir).addScaledVector(view, -view.dot(rocketDir));
    if (axis.lengthSq() < 1e-6) return out.copy(UP);
    axis.normalize();
    const across = c.crossVectors(axis, view);
    const angle = THREE.MathUtils.degToRad(tilt);
    return out.copy(axis).multiplyScalar(Math.sin(angle)).addScaledVector(across, Math.cos(angle));
  }

  // Position, point visé, vecteur haut, décalage et champ de vision d'une image clé, dans le repère de la scène.
  function resolveKey(key, portrait, out) {
    const k = portrait && key.portrait ? { ...key, ...key.portrait } : key;
    const scale = portrait ? (k.scale ?? 1.5) : 1;
    const [o0, o1, o2] = k.offset;
    const [l0, l1, l2] = k.look;
    if (k.space === 'rocket') {
      out.look.copy(rocketPos).addScaledVector(rocketDir, l0).addScaledVector(rocketUp, l1).addScaledVector(SIDE, l2);
      out.pos.copy(rocketPos).addScaledVector(rocketDir, o0).addScaledVector(rocketUp, o1).addScaledVector(SIDE, o2);
      // Écran vertical : on recule dans l'axe du regard, l'angle de vue reste le même.
      out.pos.sub(out.look).multiplyScalar(scale).add(out.look);
      upForTilt(out.pos, out.look, k.tilt, out.up);
    } else {
      out.pos.set(o0, o1, o2).multiplyScalar(scale).add(rocketPos);
      out.look.set(l0, l1, l2).add(rocketPos);
      out.up.copy(UP);
    }
    out.shift = k.shift ?? [0, 0];
    out.fov = k.fov;
  }

  function placeCamera(t, clock) {
    const portrait = camera.aspect < 1;
    let i = 0;
    while (i < CAMERA_KEYS.length - 1 && t > CAMERA_KEYS[i + 1].t) i++;
    const from = CAMERA_KEYS[i];
    const to = CAMERA_KEYS[Math.min(i + 1, CAMERA_KEYS.length - 1)];
    const k = from === to ? 0 : smoothstep(progress(t, from.t, to.t));

    resolveKey(from, portrait, viewFrom);
    resolveKey(to, portrait, viewTo);
    camPos.lerpVectors(viewFrom.pos, viewTo.pos, k);
    camLook.lerpVectors(viewFrom.look, viewTo.look, k);
    camUp.lerpVectors(viewFrom.up, viewTo.up, k).normalize();
    camPos.x += Math.sin(clock * 0.4) * 0.15;
    let fov = lerp(viewFrom.fov, viewTo.fov, k);
    let shiftX = lerp(viewFrom.shift[0], viewTo.shift[0], k);
    let shiftY = lerp(viewFrom.shift[1], viewTo.shift[1], k);

    // Vers la timeline : du plan final à la poursuite du satellite, puis plongée sur le cadran.
    if (leaveU >= 0) {
      const satNow = rocketParts.payload.position;
      if (!followSet) {
        followPos.subVectors(camPos, detachFrom);
        followLook.subVectors(camLook, detachFrom);
        followSet = true;
      }
      camPos.addVectors(satNow, followPos);
      camLook.addVectors(satNow, followLook);
      const chase = smoothstep(progress(leaveU, LEAVE.orbitStart, LEAVE.orbitEnd - 0.5));
      const dive = smoothstep(progress(leaveU, LEAVE.orbitEnd - 0.3, LEAVE.diveEnd));
      leave.chaseView(viewFrom);
      leave.clockView(viewTo, portrait);
      viewFrom.pos.lerp(viewTo.pos, dive);
      viewFrom.look.lerp(viewTo.look, dive);
      viewFrom.up.lerp(viewTo.up, dive);
      camPos.lerp(viewFrom.pos, chase);
      camLook.lerp(viewFrom.look, chase);
      camUp.lerp(viewFrom.up, chase).normalize();
      fov = lerp(fov, lerp(viewFrom.fov, viewTo.fov, dive), chase);
      shiftX *= 1 - chase;
      shiftY *= 1 - chase;
    }

    // Vers Explorer : la caméra rejoint le satellite et le garde à la même place de l'écran, en pivotant autour de lui
    // jusqu'à ce que la planète et la fusée sortent du cadre.
    if (departU >= 0) {
      introQuat.setFromRotationMatrix(lookMatrix.lookAt(camPos, camLook, camUp));
      const sat = rocketParts.payload.position;
      const view = a.set(0, 0, -1).applyQuaternion(introQuat);
      const toPlanet = b.copy(sat).negate().normalize();
      const axis = c.crossVectors(toPlanet, view).normalize();
      awayQuat.setFromAxisAngle(axis, Math.max(0, DEPART_AWAY - view.angleTo(toPlanet))).multiply(introQuat);
      rigQuat.slerpQuaternions(introQuat, awayQuat, easeInOutCubic(progress(departU, 0.25, EXPLORE_T.depart)));
      companionLocal(camera.aspect, satLocal).applyQuaternion(rigQuat);
      const follow = smoothstep(progress(departU, 0, 0.9));
      camPos.lerp(a.copy(sat).sub(satLocal), follow);
      fov = lerp(fov, COMPANION_FOV, follow);
      shiftX *= 1 - follow;
      shiftY *= 1 - follow;
    }

    camera.position.copy(camPos);
    camera.up.copy(camUp);
    if (departU >= 0) camera.quaternion.copy(rigQuat);
    else camera.lookAt(camLook);
    camera.fov = fov;
    camera.updateProjectionMatrix();
    // Décentrement, comme un objectif à bascule : le sujet quitte le centre de l'image sans changer la perspective.
    const e = camera.projectionMatrix.elements;
    e[8] = -shiftX;
    e[9] = -shiftY;
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
  }

  function render(t, clock) {
    // 1. La planète tourne pour faire défiler le décor jusqu'au pas de tir.
    const roll = easeInOutCubic(progress(t, T.rollStart, T.rollEnd));
    // set() et pas seulement z : le tour supplémentaire ci-dessous modifie aussi x et y.
    planet.rotation.set(0, 0, (roll * PATH.pad) / PLANET_RADIUS);
    if (leaveU >= 0) {
      planet.quaternion.premultiply(leave.planetTurn(easeInOutCubic(progress(leaveU, LEAVE.orbitStart, LEAVE.diveEnd - 0.4))));
    }

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
    rocketUp.crossVectors(rocketDir, SIDE).normalize();
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
        // Vers la fin, la fumée la plus ancienne se dissipe.
        const fade = smoothstep(clamp01((k - Math.max(0, u - 0.6) * 0.9) / 0.25));
        puff.scale.setScalar(lerp(0.9, 0.12, k) * (0.5 + 0.5 * clamp01(u * 4)) * fade);
        puff.rotation.set(i, i * 1.7, 0);
        puff.updateMatrix();
        trail.setMatrixAt(i, puff.matrix);
      }
      trail.instanceMatrix.needsUpdate = true;
    }

    // 3. Le ciel devient l'espace à mesure qu'on s'éloigne.
    const altitude = rocketPos.length() - launchRadius;
    const space = smoothstep(clamp01((altitude - 6) / 20));
    scene.background.copy(SKY).lerp(SPACE, space);
    stars.material.opacity = space * (0.85 + 0.15 * Math.sin(clock * 2));

    // Vers la timeline : le satellite quitte la coiffe et se met en orbite ; la fusée reste en arrière.
    if (leaveU >= 0) {
      const payload = rocketParts.payload;
      if (payload.parent !== scene) {
        scene.attach(payload);
        detachFrom.copy(payload.position);
        detachTo.copy(payload.position).addScaledVector(rocketDir, 0.6);
        leave.begin(detachTo);
        satStartQuat.copy(payload.quaternion);
        followSet = false;
      }
      // Décrochage : le satellite se dégage de la coiffe dans l'axe de la fusée en pivotant un peu sur lui-même.
      const detach = easeOutCubic(progress(leaveU, 0, LEAVE.orbitStart));
      satDetachQuat.copy(satStartQuat).multiply(satSpin.setFromAxisAngle(UP, 0.7 * detach));
      const k = easeInOutCubic(progress(leaveU, LEAVE.orbitStart, LEAVE.orbitEnd));
      // Pendant la plongée, il s'écarte sur le côté pour laisser passer la caméra.
      const away = smoothstep(progress(leaveU, LEAVE.orbitEnd - 0.3, LEAVE.diveEnd - 0.5));
      const sat = leave.satellite(k, Math.max(0, leaveU - LEAVE.orbitStart), away);
      if (leaveU < LEAVE.orbitStart) payload.position.lerpVectors(detachFrom, detachTo, detach);
      else payload.position.copy(sat.pos);
      satQuat.setFromRotationMatrix(satBasis.makeBasis(SIDE, sat.up, c.crossVectors(SIDE, sat.up)));
      payload.quaternion.slerpQuaternions(satDetachQuat, satQuat, k);
      rocket.visible = leaveU < LEAVE.orbitEnd;
      if (!rocket.visible) trail.visible = false;
      leave.tick(LEAVE.end - leaveU);
      // Le soleil se place comme sur la page timeline, pour que le cadran y ait le même éclairage.
      leave.sunPosition(sunTarget);
      sun.position.lerpVectors(SUN_START, sunTarget, smoothstep(progress(leaveU, LEAVE.orbitEnd, LEAVE.diveEnd)));
    }

    // Vers Explorer : le satellite se dégage de la coiffe, puis s'éloigne de la fusée, droit devant elle.
    if (departU >= 0) {
      const payload = rocketParts.payload;
      if (payload.parent !== scene) {
        scene.attach(payload);
        detachFrom.copy(payload.position);
        detachTo.copy(payload.position).addScaledVector(rocketDir, 0.6);
        satStartQuat.copy(payload.quaternion);
      }
      const detach = easeOutCubic(progress(departU, 0, 0.45));
      payload.position
        .lerpVectors(detachFrom, detachTo, detach)
        .addScaledVector(rocketDir, DEPART_EJECT * easeInOutCubic(progress(departU, 0.3, EXPLORE_T.depart)));
    }

    // 4. Caméra.
    placeCamera(t, clock);
    // Le satellite prend peu à peu la pose qu'il gardera pendant l'exploration, par rapport à la caméra.
    if (departU >= 0) {
      const detach = easeOutCubic(progress(departU, 0, 0.45));
      satDetachQuat.copy(satStartQuat).multiply(satSpin.setFromAxisAngle(UP, 0.7 * detach));
      satQuat.copy(rigQuat).multiply(COMPANION_QUAT);
      rocketParts.payload.quaternion.slerpQuaternions(
        satDetachQuat,
        satQuat,
        easeInOutCubic(progress(departU, 0.2, EXPLORE_T.depart)),
      );
    }

    // 5. La coiffe s'ouvre en deux, de part et d'autre d'une jointure tournée vers la caméra.
    rocket.updateWorldMatrix(true, false);
    const camLocal = rocket.worldToLocal(a.copy(camera.position));
    rocketParts.fairing.rotation.y = Math.atan2(camLocal.x, camLocal.z);
    setFairingOpen(
      rocketParts,
      easeOutCubic(progress(t, T.fairingStart, T.fairingEnd)),
      progress(t, T.fairingEnd - 0.3, T.nameEnd + 0.2) ** 2,
    );
    rocketParts.payload.visible = t > T.fairingStart;

    // 6. Titres, puis le nom qui sort de la coiffe en glissant vers la gauche.
    for (const title of titleEls) {
      const fadeIn = progress(t, title.start, title.start + 0.4);
      const fadeOut = 1 - progress(t, title.end - 0.4, title.end);
      title.el.style.opacity = Math.min(fadeIn, fadeOut);
      title.el.style.transform = `translate(-50%, ${(1 - fadeIn) * 20}px)`;
    }

    const nameP = easeOutCubic(progress(t, T.nameStart, T.nameEnd));
    namePoint.copy(rocketPos).addScaledVector(rocketDir, FAIRING_CENTER).project(camera);
    nameEl.style.opacity = progress(t, T.nameStart, T.nameStart + 0.2);
    const portrait = camera.aspect < 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    let nameX = (namePoint.x * 0.5 + 0.5) * w;
    let nameY = (-namePoint.y * 0.5 + 0.5) * h;
    // Écran large : le nom finit bien à gauche de la coiffe, dans l'espace libre au-dessus de la planète.
    // Écran vertical : une fois sorti, il monte se poser en haut à gauche, au-dessus du menu, pour dégager la fusée.
    const slide = portrait ? -40 : -60;
    if (portrait) {
      const lift = easeInOutCubic(progress(t, T.nameEnd - 0.2, T.nameEnd + 0.6));
      const width = nameEl.offsetWidth;
      nameX = lerp(nameX, 24 + width * (1 - slide / 100), lift);
      nameY = lerp(nameY, h * 0.11, lift);
    }
    nameEl.style.left = `${nameX}px`;
    nameEl.style.top = `${nameY}px`;
    nameSlide.style.transform = `translateX(${lerp(100, slide, nameP)}%)`;
    // Pendant la sortie, tout ce qui dépasse à droite de la coiffe est masqué ; à la fin, le halo du texte se libère.
    nameEl.style.clipPath = `inset(-60% ${-80 * progress(nameP, 0.85, 1)}px -60% -60%)`;
    hintEl.style.opacity = progress(t, T.end - 0.3, T.end + 0.4);
    if (leaveU >= 0) {
      const fade = 1 - progress(leaveU, 0, 0.4);
      nameEl.style.opacity *= fade;
      hintEl.style.opacity *= fade;
    }
    if (departU >= 0) {
      const fade = 1 - progress(departU, 0, 0.4);
      nameEl.style.opacity *= fade;
      hintEl.style.opacity *= fade;
    }

    // 7. Le menu se déploie depuis le satellite, qui flotte et se tourne vers l'entrée survolée.
    const turnTarget = nav.hovered < 0 ? 0 : (nav.hovered - (INTRO.nav.length - 1) / 2) * 0.35;
    satTurn = lerp(satTurn, turnTarget, 0.08);
    const settled = progress(t, T.nameEnd, T.end);
    if (leaveU < 0 && departU < 0) {
      rocketParts.payload.rotation.z = -satTurn;
      rocketParts.payload.rotation.x = Math.sin(clock * 0.9) * 0.08 * settled;
      rocketParts.payload.position.y = PAYLOAD_Y + Math.sin(clock * 1.3) * 0.03 * settled;
    }
    rocketParts.payload.getWorldPosition(satPoint).project(camera);
    satAnchor.x = (satPoint.x * 0.5 + 0.5) * window.innerWidth;
    satAnchor.y = (-satPoint.y * 0.5 + 0.5) * window.innerHeight;
    let navReveal = t - T.navStart;
    let navExit = leaveU >= 0 ? { index: leaveIndex, p: progress(leaveU, 0, LEAVE.retract) } : null;
    if (departU >= 0 && departDir > 0) navExit = { index: exploreIndex, p: progress(departU, 0, LEAVE.retract) };
    // Au retour, le menu se redéploie depuis le satellite quand il a rejoint la coiffe.
    if (navRevealAt >= 0) navReveal = Math.min(navReveal, clock - navRevealAt);
    navEl.style.visibility = t > T.navStart && navReveal > 0 && !(departU >= 0 && departDir > 0 && departU > 1) ? 'visible' : 'hidden';
    nav.update(satAnchor, navReveal, clock, navExit);

    // Fin de la plongée : la planète s'efface autour de l'horloge, qui reste seule sur les étoiles comme sur la page timeline.
    if (leaveU >= 0) {
      fadePlanet(1 - smoothstep(progress(leaveU, LEAVE.diveEnd - 0.5, LEAVE.end - 0.1)));
      headlight.intensity = 0.9 * smoothstep(progress(leaveU, LEAVE.orbitEnd, LEAVE.diveEnd));
      headlight.position.copy(camera.position);
      headlight.target.position.copy(camLook);
    }

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
  // Outil de mise au point : ?leave=2 montre la transition vers la timeline à 2 s du clic.
  if (params.has('leave')) {
    t = T.end + 0.5;
    startLeave(INTRO.nav.findIndex((item) => item.action === 'timeline'));
    leaveU = Number(params.get('leave'));
  }
  // ?depart=1 montre le départ vers la page Explorer à 1 s du clic.
  if (params.has('depart')) {
    t = T.end + 0.5;
    startDepart();
    departU = Number(params.get('depart'));
  }
  let boost = 0;
  let ended = false;
  let last = performance.now();
  // Arrivée depuis la page Explorer : on repart du dernier plan du départ.
  if (params.get('from') === 'explore') {
    window.history.replaceState(null, '', window.location.pathname);
    t = T.end + 0.5;
    ended = true;
    startReturn();
  }

  const accelerate = () => {
    if (!ended || leaveU >= 0) boost = 6;
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
    if (leaveU >= 0 && !paused) leaveU += dt * (1 + boost * 0.4);
    if (departU >= 0 && !paused) {
      departU += dt * departDir;
      if (departDir < 0 && departU <= 0) endReturn(now / 1000);
    }
    boost = Math.max(0, boost - dt * 10);
    render(t, now / 1000);
    if (departDir > 0 && departU >= EXPLORE_T.depart && !navigated) {
      navigated = true;
      saveHandoff(camera);
      window.location.href = './explore.html';
    }

    if (leaveU >= LEAVE.end && !navigated) {
      navigated = true;
      window.location.href = './timeline.html?t=0';
    }

    if (!ended && t >= T.end) {
      ended = true;
      try {
        sessionStorage.setItem('intro-seen', '1');
      } catch {
        // Rien à faire : l'intro sera simplement rejouée.
      }
      navEl.inert = false;
      onEnd();
      // L'horloge de la timeline se prépare quand le navigateur est libre, pour ne pas ralentir l'intro.
      (window.requestIdleCallback ?? setTimeout)(() => leave.buildClock());
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  nameEl.querySelector('.intro-name-main').textContent = INTRO.name;
  hintEl.querySelector('span').textContent = INTRO.scrollHint;

  return {
    replay() {
      window.scrollTo({ top: 0, behavior: 'instant' });
      t = 0;
      ended = false;
      boost = 0;
      navEl.inert = true;
      onStart();
    },
  };
}
