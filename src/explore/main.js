import '../style.css';
import * as THREE from 'three';
import { EXPLORE_T } from '../config.js';
import { buildStars } from '../intro/intro.js';
import { CLOCK_DIR, createLeave } from '../intro/leave.js';
import { easeInOutCubic, progress, smoothstep } from '../intro/math.js';
import { buildPlanet } from '../intro/planet.js';
import { buildSatellite } from '../intro/rocket.js';
import { COMPANION_FOV, COMPANION_QUAT, companionLocal, loadHandoff } from './companion.js';
import { createExplore } from './explore.js';

// Page « Explorer le monde ». Elle s'ouvre sur le dernier plan du départ de la page d'accueil : le satellite à droite,
// les étoiles derrière. La caméra pivote autour du satellite en prenant de l'altitude, et la planète revient dans le
// champ quand ils arrivent en orbite. Retour rejoue le chemin inverse, puis la page d'accueil termine la transition.

const canvas = document.querySelector('#scene');
const ui = document.querySelector('.explore-ui');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;

// Même ciel et même éclairage que la fin de l'intro, pour que le passage d'une page à l'autre ne se voie pas.
const scene = new THREE.Scene();
scene.background = new THREE.Color('#05060f');
const camera = new THREE.PerspectiveCamera(COMPANION_FOV, 1, 0.1, 2000);
scene.add(new THREE.HemisphereLight('#ffffff', '#5a6b8c', 1.4));
const sun = new THREE.DirectionalLight('#fff1d6', 2.4);
sun.position.set(20, 30, 18);
scene.add(sun);
const stars = buildStars();
scene.add(stars);

const { planet, globe, clockSite, elements } = buildPlanet({
  treeCount: window.innerWidth < 768 ? 26 : 46,
  clockDir: CLOCK_DIR,
});
createLeave({ clockSite }).buildClock();
scene.add(planet);

const { satellite } = buildSatellite();
scene.add(satellite);

// Point de départ : le plan transmis par la page d'accueil, ou, si on arrive directement, un plan équivalent
// au-dessus du pas de tir, le regard vers les étoiles.
const start = loadHandoff() ?? {
  pos: new THREE.Vector3(0, 68, 14),
  quat: new THREE.Quaternion().setFromRotationMatrix(
    new THREE.Matrix4().lookAt(new THREE.Vector3(0, 68, 14), new THREE.Vector3(30, 80, 40), new THREE.Vector3(0, 1, 0)),
  ),
};
const startView = new THREE.Vector3(0, 0, -1).applyQuaternion(start.quat);

// Axe de la vue d'ensemble : en reculant un peu par rapport au regard de départ, la caméra se retourne vers la
// planète d'un quart de tour environ.
const frameDir = start.pos.clone().normalize().addScaledVector(startView, -0.35).normalize();
const explore = createExplore({ planet, globe, elements, camera, canvas, ui, frameDir });

// La planète se présente pas de tir en haut, la centrale et la forêt à côté.
const pad = elements.find((el) => el.key === 'pad');
const up = new THREE.Vector3(0, 1, 0).addScaledVector(frameDir, -frameDir.y).normalize();
const baseQuat = new THREE.Quaternion().setFromUnitVectors(
  pad.anchor.clone().normalize(),
  frameDir.clone().multiplyScalar(Math.cos(0.6)).addScaledVector(up, Math.sin(0.6)),
);

function resize() {
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

const makeView = () => ({ pos: new THREE.Vector3(), look: new THREE.Vector3(), up: new THREE.Vector3(), fov: COMPANION_FOV });
const view = makeView();
const local = new THREE.Vector3();
const lookMatrix = new THREE.Matrix4();
const camQuat = new THREE.Quaternion();
const satFrom = new THREE.Vector3();
const satTo = new THREE.Vector3();
const satNow = new THREE.Vector3();
const quatFrom = new THREE.Quaternion();
const dirFrom = new THREE.Vector3();
const dirTo = new THREE.Vector3();
const bob = new THREE.Quaternion();
const euler = new THREE.Euler();

// Phases : arrivée (u de 0 à arrive), exploration, puis retour (u de 0 à back) vers la page d'accueil.
const params = new URLSearchParams(window.location.search);
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let phase = 'arrive';
let u = params.has('u') ? Number(params.get('u')) : reducedMotion ? EXPLORE_T.arrive : 0;
const paused = params.has('pause');
// Pose de départ du retour : là où étaient la caméra et le satellite au moment du clic.
const backFrom = { sat: new THREE.Vector3(), quat: new THREE.Quaternion() };
const satStart = start.pos.clone().add(companionLocal(camera.aspect, local).applyQuaternion(start.quat));

function goBack() {
  if (phase !== 'explore') return;
  explore.stop();
  phase = 'back';
  u = reducedMotion ? EXPLORE_T.back : 0;
  backFrom.sat.copy(satNow);
  backFrom.quat.copy(camera.quaternion);
}

// Trajet d'un plan à l'autre en gardant le satellite au même endroit de l'écran : il suit un arc autour de la
// planète (sans jamais la traverser) pendant que la caméra tourne autour de lui.
function travel(fromSat, fromQuat, toSat, toQuat, k) {
  dirFrom.copy(fromSat).normalize();
  dirTo.copy(toSat).normalize();
  const radius = fromSat.length() + (toSat.length() - fromSat.length()) * k;
  const angle = dirFrom.angleTo(dirTo);
  if (angle < 1e-4) satNow.copy(dirFrom);
  else {
    // Interpolation sphérique des directions.
    const s = Math.sin(angle);
    satNow
      .copy(dirFrom)
      .multiplyScalar(Math.sin((1 - k) * angle) / s)
      .addScaledVector(dirTo, Math.sin(k * angle) / s);
  }
  satNow.multiplyScalar(radius);
  camQuat.slerpQuaternions(fromQuat, toQuat, k);
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const time = now / 1000;
  if (!paused) u += dt;

  planet.quaternion.multiplyQuaternions(explore.user, baseQuat);
  planet.updateWorldMatrix(true, false);
  if (phase === 'explore') explore.update(dt, time);

  // Plan visé : la vue d'ensemble pendant l'arrivée, sinon le cadrage de l'exploration.
  explore.view(view);
  camera.position.copy(view.pos);
  camera.up.copy(view.up);
  camera.lookAt(view.look);
  companionLocal(camera.aspect, local);
  satTo.copy(local).applyQuaternion(camera.quaternion).add(view.pos);
  quatFrom.copy(camera.quaternion);

  if (phase === 'arrive') {
    travel(satStart, start.quat, satTo, quatFrom, easeInOutCubic(progress(u, 0, EXPLORE_T.arrive)));
    if (u >= EXPLORE_T.arrive) {
      phase = 'explore';
      explore.start(goBack);
    }
  } else if (phase === 'back') {
    travel(backFrom.sat, backFrom.quat, satStart, start.quat, easeInOutCubic(progress(u, 0, EXPLORE_T.back)));
  } else {
    satNow.copy(satTo);
    camQuat.copy(quatFrom);
  }
  camera.quaternion.copy(camQuat);
  camera.position.copy(local).applyQuaternion(camQuat).negate().add(satNow);

  // Le satellite flotte un peu une fois en orbite, comme dans l'intro ; il est immobile aux deux bouts du trajet.
  const alive = phase === 'explore' ? 1 : phase === 'arrive' ? smoothstep(progress(u, EXPLORE_T.arrive - 0.6, EXPLORE_T.arrive)) : 1 - smoothstep(progress(u, 0, 0.6));
  satellite.position.copy(satNow);
  satellite.position.y += Math.sin(time * 1.3) * 0.03 * alive;
  bob.setFromEuler(euler.set(Math.sin(time * 0.9) * 0.08 * alive, 0, Math.sin(time * 0.7) * 0.05 * alive));
  satellite.quaternion.copy(camQuat).multiply(COMPANION_QUAT).multiply(bob);

  stars.material.opacity = 0.85 + 0.15 * Math.sin(time * 2);
  renderer.render(scene, camera);
  if (phase === 'explore') explore.place(window.innerWidth, window.innerHeight);

  if (phase === 'back' && u >= EXPLORE_T.back) {
    phase = 'gone';
    window.location.href = './index.html?from=explore';
  }
  if (phase !== 'gone') requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Retour sur la page par le bouton Précédent : on rejoue l'arrivée.
window.addEventListener('pageshow', (e) => {
  if (!e.persisted || phase !== 'gone') return;
  phase = 'arrive';
  u = 0;
  last = performance.now();
  requestAnimationFrame(frame);
});
