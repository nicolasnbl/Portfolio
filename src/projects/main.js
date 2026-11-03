import '../i18n/page.js';
import * as THREE from 'three';
import { buildStars } from '../intro/intro.js';
import { CLOCK_DIR } from '../intro/leave.js';
import { setupLook } from '../intro/look.js';
import { buildPlanet, updateSmoke } from '../intro/planet.js';
import { buildRocket } from '../intro/rocket.js';
import { PROJECT_SUN, RIGHT, STOPS, stopQuat, stopTarget, stopView, zonesFor } from './view.js';
import { modelsReady } from '../intro/models.js';
import { loadGlobeMask } from '../intro/globe-masks.js';
import { PLANET_RADIUS } from '../intro/planet.js';

// Fond des pages side projects : la planète de l'accueil, dont on ne construit que les terres des projets de la page.
// Les blocs marqués data-stop sont les projets que la planète peut montrer. Sur une page projet, la caméra est au
// plus près de l'élément.

const canvas = document.querySelector('#scene');
const stopEls = [...document.querySelectorAll('[data-stop]')];
const names = [...new Set(stopEls.map((el) => el.dataset.stop))];
const params = new URLSearchParams(window.location.search);
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
// Page projet : plus près de l'élément que sur la page des side projects.
const projectPage = document.body.dataset.zoom !== undefined;
const closeZoom = Number(document.body.dataset.zoom ?? 1);

// Les modèles 3D (préchargés par la page) doivent être prêts avant de construire la scène.
await Promise.all([modelsReady, loadGlobeMask(PLANET_RADIUS)]);

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
setupLook(renderer, scene, sun);
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

// Arrêt actif : la planète reste sur le premier (le haut de page), sans suivre le survol ni le défilement. Un clic sur
// « En savoir plus » d'un projet fait tourner la planète jusqu'à lui et s'en approche, puis sa page s'ouvre sur ce
// même plan (?from=projects).
const LEAVE_TIME = 1.7; // secondes, du clic à l'ouverture de la page projet
const PROJECT_ZOOM = 0.9; // même valeur que data-zoom des pages projet
let current = names[0];
let leaving = null;
for (const link of document.querySelectorAll('[data-stop] a[data-project-link]')) {
  link.addEventListener('click', (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || reducedMotion || leaving) return;
    e.preventDefault();
    const name = link.closest('[data-stop]').dataset.stop;
    leaving = {
      u: 0,
      href: `${link.getAttribute('href')}?from=projects`,
      fromQuat: turn.clone(),
      toQuat: quats[name],
      from: { ...view, pos: view.pos.clone(), look: view.look.clone(), up: view.up.clone(), shift: [...view.shift] },
      to: stopView(STOPS[name], camera.aspect, makeView(), PROJECT_ZOOM, true),
    };
    current = name;
    document.body.classList.add('is-leaving');
  });
}
// Retour par le bouton Précédent : on retrouve le haut de la page.
window.addEventListener('pageshow', (e) => {
  if (!e.persisted || !leaving) return;
  leaving = null;
  current = names[0];
  document.body.classList.remove('is-leaving');
});

function resize() {
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  camera.aspect = window.innerWidth / window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// Départ : le plan exact de la fin de la transition depuis l'accueil, sinon un peu plus haut, et la caméra descend.
// Depuis la page des side projects, le plan exact de la fin de son départ.
const from = params.get('from');
if (from) window.history.replaceState(null, '', window.location.pathname + window.location.hash);
// Orientation de la planète hors défilement ; le défilement y ajoute un léger roulis (voir frame).
const turn = quats[current].clone();
const SCROLL_TURN = 0.12; // radians, du haut au bas de la page
const scrollRot = new THREE.Quaternion();
let scrollAngle = 0;
// Arrivée directe sur une page projet : on part du cadrage de la page des side projects, puis on s'approche.
const startZoom = reducedMotion || from === 'projects' ? closeZoom : from === 'intro' ? 1 : closeZoom * 1.3;
stopView(STOPS[current], camera.aspect, view, startZoom, projectPage);

const easeInOutCubic = (x) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);
function blendView(a, b, k, out) {
  out.pos.lerpVectors(a.pos, b.pos, k);
  out.look.lerpVectors(a.look, b.look, k);
  out.up.lerpVectors(a.up, b.up, k).normalize();
  out.fov = a.fov + (b.fov - a.fov) * k;
  out.shift = [a.shift[0] + (b.shift[0] - a.shift[0]) * k, a.shift[1] + (b.shift[1] - a.shift[1]) * k];
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const time = now / 1000;

  if (leaving) {
    // Vers une page projet : trajet minuté, pour arriver pile sur le premier plan de la page.
    leaving.u += dt;
    const k = easeInOutCubic(Math.min(1, leaving.u / LEAVE_TIME));
    turn.slerpQuaternions(leaving.fromQuat, leaving.toQuat, k);
    blendView(leaving.from, leaving.to, k, view);
    if (leaving.u >= LEAVE_TIME && !leaving.gone) {
      leaving.gone = true;
      window.location.href = leaving.href;
    }
  } else {
    stopView(STOPS[current], camera.aspect, target, closeZoom, projectPage);
    // Amorti : la caméra glisse vers son cadrage (descente à l'arrivée, ou approche sur une page projet).
    const k = reducedMotion ? 1 : 1 - Math.exp(-dt * 2.2);
    turn.slerp(quats[current], k);
    blendView(view, target, k, view);
  }
  // Léger mouvement au défilement : le sol glisse doucement vers la caméra. Il s'annule pendant le départ vers une
  // page projet, qui s'ouvre en haut de page.
  const room = document.documentElement.scrollHeight - window.innerHeight;
  const scrolled = leaving || room <= 0 ? 0 : Math.min(1, window.scrollY / room);
  scrollAngle += (scrolled * SCROLL_TURN - scrollAngle) * (reducedMotion ? 1 : 1 - Math.exp(-dt * 4));
  planet.quaternion.copy(scrollRot.setFromAxisAngle(RIGHT, -scrollAngle)).multiply(turn);
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
// Shaders compilés avant la première image, en parallèle quand le navigateur le permet : pas de gel au démarrage.
renderer
  .compileAsync(scene, camera)
  .catch(() => {})
  .then(() => {
    last = performance.now();
    requestAnimationFrame(frame);
  });
