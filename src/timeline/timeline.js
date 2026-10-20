import * as THREE from 'three';
import { TIMELINE, TL } from '../config.js';
import { buildStars } from '../intro/intro.js';
import { easeInOutCubic, easeOutCubic, lerp, progress, smoothstep } from '../intro/math.js';
import { CARD, buildClock } from './clock.js';
import { buildCard } from './card.js';

const TAU = Math.PI * 2;
const STEP_ANGLE = THREE.MathUtils.degToRad(TIMELINE.stepAngle);
const STEP_DURATION = 0.9; // secondes pour passer d'une étape à l'autre

// Angle de la trotteuse, compté dans le sens horaire depuis le 12. Avant la course, elle bat les secondes et
// arrive sur le 12 pile au début de la course ; pendant la course, elle fait SPIN_TURNS tours en accélérant
// puis en ralentissant, et s'arrête sur la première étape.
const SPIN_TURNS = 1;
const TICK = TAU / 60;
function introHandAngle(t) {
  if (t < TL.spinStart) {
    const n = Math.floor(t);
    const tick = easeOutCubic(Math.min(1, (t - n) / 0.12));
    return -TICK * (TL.spinStart - n + 1 - tick);
  }
  return SPIN_TURNS * TAU * easeInOutCubic(progress(t, TL.spinStart, TL.end));
}

// Cadrages de la caméra.
// space "world" : dans le repère de l'horloge. space "hand" : dans celui de la trotteuse, qui tourne avec elle ;
// la caméra la suit, et c'est le cadran qui semble tourner. pos, look et up : [x, y, z].
// Le dernier cadrage, face à la carte, est calculé selon l'écran (finalKey).
const CAMERA_KEYS = [
  // Face à l'horloge.
  { t: 0, space: 'world', pos: [0, 38, 0.01], look: [0, 0, -0.6], up: [0, 0, -1], fov: 40, portrait: { pos: [0, 62, 0.01] } },
  { t: TL.zoomStart, space: 'world', pos: [0, 35, 0.01], look: [0, 0, -0.6], up: [0, 0, -1], fov: 40, portrait: { pos: [0, 58, 0.01] } },
  // Zoom jusqu'au cadran, au-dessus de la trotteuse arrêtée sur le 12.
  { t: TL.zoomEnd, space: 'world', pos: [1.2, 7.5, -5], look: [0, 0.6, -5.2], up: [0, 0, -1], fov: 46 },
  // Bascule : la caméra descend au ras du cadran et suit la trotteuse qui accélère.
  { t: TL.followAt, space: 'hand', pos: [5, 3.4, -8], look: [0, 0.6, -3.5], up: [0, 1, 0], fov: 50 },
];

export function createTimeline({ canvas, overlay, onEnd, onStep }) {
  const entries = TIMELINE.entries;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#05060f');
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 2000);

  scene.add(new THREE.HemisphereLight('#ffffff', '#5a6b8c', 1.5));
  const sun = new THREE.DirectionalLight('#fff1d6', 2.2);
  sun.position.set(14, 30, 10);
  scene.add(sun);

  // Lumière qui suit la caméra : la carte reste lisible quel que soit l'angle de la trotteuse.
  const headlight = new THREE.DirectionalLight('#ffffff', 0.9);
  headlight.position.set(0, 0, 1);
  camera.add(headlight);
  scene.add(camera);

  const stars = buildStars();
  stars.material.opacity = 0.8;
  scene.add(stars);

  const entryAngles = entries.map((_, i) => i * STEP_ANGLE);
  const { clock, hand, markers, setProgress } = buildClock(entryAngles);
  scene.add(clock);

  const cards = { horizontal: buildCard(false), vertical: buildCard(true) };
  hand.add(cards.horizontal.mesh, cards.vertical.mesh);

  const handQuat = new THREE.Quaternion();
  const Y = new THREE.Vector3(0, 1, 0);
  const makeView = () => ({ pos: new THREE.Vector3(), look: new THREE.Vector3(), up: new THREE.Vector3(), fov: 45 });
  const viewFrom = makeView();
  const viewTo = makeView();
  const final = { t: TL.end, space: 'hand', pos: [0, 0, 0], look: [0, 0, 0], up: [0, 1, 0], fov: 42 };

  // Face à la carte, dans le repère de la trotteuse : assez loin pour la voir en entier, un peu au-dessus
  // pour garder le cadran en sol. En portrait, la trotteuse est debout à l'écran, pointe en haut.
  function finalKey(aspect) {
    const tanV = Math.tan(THREE.MathUtils.degToRad(final.fov / 2));
    const look = CARD.center.clone();
    let dir, dist;
    if (aspect >= 1) {
      // Au plus près : la carte occupe presque toute la largeur de l'écran.
      dir = new THREE.Vector3(1, 0.32, 0).normalize();
      dist = Math.max((CARD.length * 0.5) / (tanV * aspect), (CARD.height * 1.5) / tanV);
      final.up = [0, 1, 0];
      look.y -= 0.3; // la carte un peu au-dessus du centre de l'image, le cadran dessous
    } else {
      dir = new THREE.Vector3(1, 0.55, 0).normalize();
      dist = Math.max((CARD.length * 0.6) / tanV, (CARD.height * 0.56) / (tanV * aspect));
      final.up = [0, 0, -1];
      look.z -= 0.7; // la carte un peu plus bas, sous le titre de la page
    }
    final.pos = look.clone().addScaledVector(dir, dist).toArray();
    final.look = look.toArray();
  }

  function resolveKey(key, portrait, out) {
    const k = portrait && key.portrait ? { ...key, ...key.portrait } : key;
    out.pos.fromArray(k.pos);
    out.look.fromArray(k.look);
    out.up.fromArray(k.up);
    if (k.space === 'hand') {
      out.pos.applyQuaternion(handQuat);
      out.look.applyQuaternion(handQuat);
      out.up.applyQuaternion(handQuat);
    }
    out.fov = k.fov;
  }

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    finalKey(camera.aspect);
    const vertical = camera.aspect < 1;
    cards.horizontal.mesh.visible = !vertical;
    cards.vertical.mesh.visible = vertical;
  }
  window.addEventListener('resize', resize);
  resize();

  const keys = [...CAMERA_KEYS, final];
  function placeCamera(t) {
    const portrait = camera.aspect < 1;
    let i = 0;
    while (i < keys.length - 1 && t > keys[i + 1].t) i++;
    const from = keys[i];
    const to = keys[Math.min(i + 1, keys.length - 1)];
    const k = from === to ? 0 : smoothstep(progress(t, from.t, to.t));
    resolveKey(from, portrait, viewFrom);
    resolveKey(to, portrait, viewTo);
    camera.position.lerpVectors(viewFrom.pos, viewTo.pos, k);
    camera.up.lerpVectors(viewFrom.up, viewTo.up, k).normalize();
    camera.lookAt(new THREE.Vector3().lerpVectors(viewFrom.look, viewTo.look, k));
    camera.fov = lerp(viewFrom.fov, viewTo.fov, k);
    camera.updateProjectionMatrix();
  }

  // Étapes : après l'intro, chaque passage fait tourner la trotteuse d'une étape à la suivante.
  let step = 0;
  let stepFrom = SPIN_TURNS * TAU;
  let stepStart = -10;
  const stepAngle = (i) => SPIN_TURNS * TAU + entryAngles[i];
  let handAngle = 0;

  function render(t, now) {
    const introDone = t >= TL.end;
    if (!introDone) {
      handAngle = introHandAngle(t);
    } else {
      const p = easeInOutCubic(progress(now, stepStart, stepStart + STEP_DURATION));
      handAngle = lerp(stepFrom, stepAngle(step), p);
    }
    hand.rotation.y = -handAngle;
    handQuat.setFromAxisAngle(Y, -handAngle);

    // Progression : l'arc et les repères des étapes atteintes s'allument.
    const travelled = introDone ? handAngle - SPIN_TURNS * TAU : 0;
    setProgress(travelled + 0.001);
    markers.forEach((m, i) => {
      m.material.emissiveIntensity = introDone && travelled >= entryAngles[i] - 0.01 ? 0.8 : 0;
    });

    // La carte apparaît à la fin de l'intro, puis s'efface et revient à chaque changement d'étape.
    let opacity = progress(t, TL.end - 0.3, TL.end + 0.4);
    if (introDone) {
      const p = progress(now, stepStart, stepStart + STEP_DURATION);
      if (p < 1) opacity = Math.abs(1 - 2 * p);
      const shownIndex = p < 0.5 ? previousStep : step;
      cards.horizontal.show(entries[shownIndex], shownIndex, entries.length);
      cards.vertical.show(entries[shownIndex], shownIndex, entries.length);
    } else {
      cards.horizontal.show(entries[0], 0, entries.length);
      cards.vertical.show(entries[0], 0, entries.length);
    }
    cards.horizontal.mesh.material.opacity = opacity;
    cards.vertical.mesh.material.opacity = opacity;
    overlay.style.opacity = progress(t, TL.end, TL.end + 0.6);

    placeCamera(t);
    renderer.render(scene, camera);
  }

  let previousStep = 0;
  function goTo(index) {
    const next = THREE.MathUtils.clamp(index, 0, entries.length - 1);
    if (next === step || !ended) return;
    previousStep = step;
    stepFrom = handAngle;
    step = next;
    stepStart = performance.now() / 1000;
    onStep?.(step, entries.length);
  }

  // Boucle : pendant l'intro, scroller l'accélère ; ensuite, il fait passer d'une étape à l'autre.
  const params = new URLSearchParams(window.location.search);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let alreadySeen = false;
  try {
    alreadySeen = sessionStorage.getItem('timeline-seen') === '1';
  } catch {
    // Stockage indisponible : on rejoue l'intro.
  }
  let t = params.has('t') ? Number(params.get('t')) : alreadySeen || reducedMotion ? TL.end + 0.5 : 0;
  const paused = params.has('pause');
  let boost = 0;
  let ended = false;
  let last = performance.now();

  let wheelAcc = 0;
  let wheelLock = 0;
  window.addEventListener(
    'wheel',
    (e) => {
      if (!ended) {
        boost = 6;
        return;
      }
      const now = performance.now();
      if (now < wheelLock) return;
      wheelAcc += e.deltaY;
      if (Math.abs(wheelAcc) > 40) {
        goTo(step + Math.sign(wheelAcc));
        wheelAcc = 0;
        wheelLock = now + STEP_DURATION * 800;
      }
    },
    { passive: true },
  );
  let touchY = null;
  window.addEventListener('touchstart', (e) => (touchY = e.touches[0].clientY), { passive: true });
  window.addEventListener('touchmove', () => !ended && (boost = 6), { passive: true });
  window.addEventListener('touchend', (e) => {
    if (touchY === null || !ended) return;
    const dy = touchY - e.changedTouches[0].clientY;
    if (Math.abs(dy) > 40) goTo(step + Math.sign(dy));
    touchY = null;
  });
  window.addEventListener('keydown', (e) => {
    if (!ended) {
      if (['ArrowDown', 'PageDown', ' ', 'Enter'].includes(e.key)) boost = 6;
      return;
    }
    if (['ArrowDown', 'ArrowRight', 'PageDown', ' '].includes(e.key)) goTo(step + 1);
    if (['ArrowUp', 'ArrowLeft', 'PageUp'].includes(e.key)) goTo(step - 1);
  });

  function frame(nowMs) {
    const dt = Math.min(0.05, (nowMs - last) / 1000);
    last = nowMs;
    if (!paused) t += dt * (1 + boost);
    boost = Math.max(0, boost - dt * 10);
    render(t, nowMs / 1000);

    if (!ended && t >= TL.end) {
      ended = true;
      try {
        sessionStorage.setItem('timeline-seen', '1');
      } catch {
        // Rien à faire : l'intro sera simplement rejouée.
      }
      onEnd?.();
      onStep?.(step, entries.length);
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  return {
    next: () => goTo(step + 1),
    previous: () => goTo(step - 1),
    goTo,
    replay() {
      t = 0;
      ended = false;
      boost = 0;
      step = 0;
      previousStep = 0;
      stepFrom = SPIN_TURNS * TAU;
      stepStart = -10;
    },
  };
}
