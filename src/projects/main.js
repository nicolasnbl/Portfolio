import * as THREE from 'three';
import { buildStars } from '../intro/intro.js';
import { CLOCK_DIR } from '../intro/leave.js';
import { buildPlanet, updateSmoke } from '../intro/planet.js';
import { buildRocket } from '../intro/rocket.js';
import { PROJECT_SUN, STOPS, stopQuat, stopTarget, stopView, zonesFor } from './view.js';

// Fond des pages side projects : la planète de l'accueil, dont on ne construit que les terres des projets de la page.
// Chaque bloc marqué data-stop amène son projet sous la caméra quand il arrive à l'écran (ou au survol) ; la planète
// tourne doucement de l'un à l'autre. Sur une page projet, la caméra se rapproche de l'élément à l'ouverture.

const canvas = document.querySelector('#scene');
const stopEls = [...document.querySelectorAll('[data-stop]')];
const names = [...new Set(stopEls.map((el) => el.dataset.stop))];
const params = new URLSearchParams(window.location.search);
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
// Page projet : plus près de l'élément que sur la page des side projects.
const closeZoom = Number(document.body.dataset.zoom ?? 1);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.outputColorSpace = THREE.SRGBColorSpace;

// Même ciel et même éclairage qu'à la fin de la transition depuis l'accueil.
const scene = new THREE.Scene();
scene.background = new THREE.Color('#05060f');
const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 2000);
scene.add(new THREE.HemisphereLight('#ffffff', '#5a6b8c', 1.4));
const sun = new THREE.DirectionalLight('#fff1d6', 2.4);
sun.position.copy(PROJECT_SUN);
scene.add(sun);
const headlight = new THREE.DirectionalLight('#ffffff', 0.9);
scene.add(headlight, headlight.target);
const stars = buildStars();
scene.add(stars);

// Même nombre d'arbres que sur l'accueil, pour un tirage aléatoire identique.
const { planet, pad, smoke, elements, animate } = buildPlanet({
  treeCount: window.innerWidth < 768 ? 26 : 46,
  clockDir: CLOCK_DIR,
  focus: zonesFor(names),
});
if (smoke) updateSmoke(smoke, 0);
// La fusée attend sur son pas de tir, coiffe fermée.
if (names.includes('fusees')) {
  const { rocket } = buildRocket();
  rocket.position.y = 0.3;
  pad.add(rocket);
}
scene.add(planet);

const quats = Object.fromEntries(names.map((name) => [name, stopQuat(stopTarget(name, elements))]));

const makeView = () => ({ pos: new THREE.Vector3(), look: new THREE.Vector3(), up: new THREE.Vector3(), fov: 40, shift: [0, 0] });
const view = makeView();
const target = makeView();

// Arrêt actif : le bloc survolé, sinon le dernier bloc dont le haut a passé les deux tiers de l'écran (dans une
// rangée de cartes, la première).
let hovered = null;
for (const el of stopEls) {
  el.addEventListener('pointerenter', () => (hovered = el.dataset.stop));
  el.addEventListener('pointerleave', () => hovered === el.dataset.stop && (hovered = null));
  el.addEventListener('focusin', () => (hovered = el.dataset.stop));
  el.addEventListener('focusout', () => (hovered = null));
}
function activeStop() {
  if (hovered) return hovered;
  const line = window.innerHeight * 0.62;
  let name = names[0];
  let top = -Infinity;
  for (const el of stopEls) {
    const t = el.getBoundingClientRect().top;
    if (t <= line && t > top + 1) {
      name = el.dataset.stop;
      top = t;
    }
  }
  return name;
}

function resize() {
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  camera.aspect = window.innerWidth / window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// Départ : le plan exact de la fin de la transition depuis l'accueil, sinon un peu plus haut, et la caméra descend.
const fromIntro = params.get('from') === 'intro';
if (fromIntro) window.history.replaceState(null, '', window.location.pathname + window.location.hash);
let current = activeStop();
planet.quaternion.copy(quats[current]);
// Page projet : on part du cadrage de la page des side projects, puis on s'approche.
const startZoom = reducedMotion ? closeZoom : fromIntro || closeZoom < 1 ? 1 : 1.3;
stopView(STOPS[current], camera.aspect, view, startZoom);

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const time = now / 1000;

  current = activeStop();
  stopView(STOPS[current], camera.aspect, target, closeZoom);
  // Amorti : la planète tourne vers le projet actif, la caméra glisse vers son cadrage.
  const k = reducedMotion ? 1 : 1 - Math.exp(-dt * 2.2);
  planet.quaternion.slerp(quats[current], k);
  view.pos.lerp(target.pos, k);
  view.look.lerp(target.look, k);
  view.up.lerp(target.up, k).normalize();
  view.fov += (target.fov - view.fov) * k;
  view.shift[0] += (target.shift[0] - view.shift[0]) * k;
  view.shift[1] += (target.shift[1] - view.shift[1]) * k;
  animate(time);

  camera.position.copy(view.pos);
  camera.up.copy(view.up);
  camera.lookAt(view.look);
  camera.fov = view.fov;
  camera.updateProjectionMatrix();
  // Décentrement, comme sur l'accueil : le sujet monte au-dessus des cartes sans changer la perspective.
  const e = camera.projectionMatrix.elements;
  e[8] = -view.shift[0];
  e[9] = -view.shift[1];
  camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
  headlight.position.copy(camera.position);
  headlight.target.position.copy(view.look);
  stars.material.opacity = 0.85 + 0.15 * Math.sin(time * 2);

  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
