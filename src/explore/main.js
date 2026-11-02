import '../style.css';
import * as THREE from 'three';
import { EXPLORE, EXPLORE_T } from '../config.js';
import { buildStars } from '../intro/intro.js';
import { CLOCK_DIR, createLeave } from '../intro/leave.js';
import { easeInOutCubic, progress, smoothstep } from '../intro/math.js';
import { setupLook } from '../intro/look.js';
import { buildPlanet } from '../intro/planet.js';
import { buildSatellite } from '../intro/rocket.js';
import { COMPANION_FOV, COMPANION_QUAT, companionLocal, loadHandoff } from './companion.js';
import { createExplore } from './explore.js';
import { modelsReady } from '../intro/models.js';

// Page « Explorer le monde ». Elle s'ouvre sur le dernier plan du départ de la page d'accueil : le satellite à droite,
// les étoiles derrière. La caméra pivote autour du satellite en prenant de l'altitude, et la planète revient dans le
// champ quand ils arrivent en orbite. Retour rejoue le chemin inverse, puis la page d'accueil termine la transition.

const canvas = document.querySelector('#scene');
const ui = document.querySelector('.explore-ui');
const quoteEl = document.querySelector('.explore-quote');
quoteEl.textContent = EXPLORE.quote;
// Elle est déjà visible pendant le chargement (style dans explore.html), comme à la fin de l'accueil.
// Les modèles 3D (préchargés par la page) doivent être prêts avant de construire la scène.
await modelsReady;

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
setupLook(renderer, scene, sun);
const stars = buildStars();
scene.add(stars);

// Une planète plus petite que sur l'accueil : les objets y paraissent plus grands et tout tient dans l'écran.
const RADIUS = 18;
const { planet, globe, clockSite, elements, animate } = buildPlanet({
  radius: RADIUS,
  treeCount: window.innerWidth < 768 ? 26 : 46,
  clockDir: CLOCK_DIR,
});
createLeave({ clockSite }).buildClock();
scene.add(planet);
// Ici, les nuages passent partout, y compris au-dessus du trajet de la fusée (dégagé seulement pour l'intro).
const clouds = planet.getObjectByName('nuages');
if (clouds) clouds.userData.clearPath = false;

const { satellite } = buildSatellite();
scene.add(satellite);

// Quand la caméra s'approche ou s'éloigne de la planète (zoom, élément ciblé), le satellite prend un peu de retard
// sur elle puis revient à sa place, et une traînée dorée s'étire derrière le corps et le bout des ailes.
const LAG = { gain: 0.035, max: 1.4, rate: 5 }; // retard (unités) par unité/s de vitesse, plafond, retour (1/s)
const TRAIL = { gain: 0.07, max: 2.4, width: 0.05, full: 30 }; // longueur par unité/s, plafond, largeur, vitesse d'éclat max
const TRAIL_TIPS = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.44, 0.13, 0), new THREE.Vector3(-0.44, 0.13, 0)];
const TRAIL_COLOR = new THREE.Color('#ffc861');
const trailGeo = new THREE.BufferGeometry();
trailGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(TRAIL_TIPS.length * 4 * 3), 3));
trailGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(TRAIL_TIPS.length * 4 * 3), 3));
trailGeo.setIndex(TRAIL_TIPS.flatMap((_, i) => [0, 1, 2, 2, 1, 3].map((k) => i * 4 + k)));
// En mélange additif, une couleur qui tend vers le noir s'efface : la traînée se fond dans l'espace au bout.
const trail = new THREE.Mesh(
  trailGeo,
  new THREE.MeshBasicMaterial({ vertexColors: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
);
trail.frustumCulled = false;
// Dessinée après la planète mais avant le satellite, sans écrire la profondeur : même quand elle file vers la
// caméra, elle passe derrière le satellite au lieu de le recouvrir.
trail.renderOrder = 1;
satellite.traverse((o) => {
  o.renderOrder = 2;
});
trail.visible = false;
scene.add(trail);

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
const explore = createExplore({ planet, globe, radius: RADIUS, elements, camera, canvas, ui, frameDir });

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
const motion = { lastDist: null, lag: 0, length: 0, glow: 0 };
const tip = new THREE.Vector3();
const tail = new THREE.Vector3();
const back = new THREE.Vector3();
const side = new THREE.Vector3();
const toCam = new THREE.Vector3();

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

// Vitesse de la caméra vers la planète (négative quand elle s'en approche), lissée en retard et en traînée.
function updateMotion(dt) {
  const dist = camera.position.length();
  const speed = phase === 'explore' && motion.lastDist !== null && dt > 0 ? (dist - motion.lastDist) / dt : 0;
  motion.lastDist = phase === 'explore' ? dist : null;
  const ease = (rate) => 1 - Math.exp(-dt * rate);
  // Le retard se compte le long du regard : quand on avance, le satellite recule vers nous, et inversement.
  const lagTarget = THREE.MathUtils.clamp(-speed * LAG.gain, -LAG.max, LAG.max);
  motion.lag += (lagTarget - motion.lag) * ease(LAG.rate);
  motion.length += (THREE.MathUtils.clamp(-speed * TRAIL.gain, -TRAIL.max, TRAIL.max) - motion.length) * ease(8);
  motion.glow += (Math.min(1, Math.abs(speed) / TRAIL.full) - motion.glow) * ease(6);
  back.set(0, 0, 1).applyQuaternion(camera.quaternion);
  satellite.position.addScaledVector(back, motion.lag);

  trail.visible = motion.glow > 0.01 && Math.abs(motion.length) > 0.02;
  if (!trail.visible) return;
  // Chaque traînée part d'un point du satellite et file à l'opposé de son mouvement, en s'amincissant.
  const pos = trailGeo.attributes.position;
  const col = trailGeo.attributes.color;
  satellite.updateMatrixWorld();
  TRAIL_TIPS.forEach((p, i) => {
    satellite.localToWorld(tip.copy(p));
    tail.copy(tip).addScaledVector(back, motion.length);
    toCam.copy(camera.position).sub(tip);
    side.copy(back).cross(toCam).normalize();
    const width = TRAIL.width * (i === 0 ? 1.6 : 1);
    const corners = [
      [tip, width / 2],
      [tip, -width / 2],
      [tail, width / 8],
      [tail, -width / 8],
    ];
    corners.forEach(([origin, offset], k) => {
      const v = i * 4 + k;
      pos.setXYZ(v, origin.x + side.x * offset, origin.y + side.y * offset, origin.z + side.z * offset);
      const strength = k < 2 ? motion.glow : 0;
      col.setXYZ(v, TRAIL_COLOR.r * strength, TRAIL_COLOR.g * strength, TRAIL_COLOR.b * strength);
    });
  });
  pos.needsUpdate = true;
  col.needsUpdate = true;
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
  animate(time);

  // Plan visé : la vue d'ensemble pendant l'arrivée, sinon le cadrage de l'exploration.
  explore.view(view);
  camera.position.copy(view.pos);
  camera.up.copy(view.up);
  camera.lookAt(view.look);
  companionLocal(camera.aspect, local);
  satTo.copy(local).applyQuaternion(camera.quaternion).add(view.pos);
  quatFrom.copy(camera.quaternion);

  if (phase === 'arrive') {
    travel(satStart, start.quat, satTo, quatFrom, easeInOutCubic(progress(u, EXPLORE_T.hold, EXPLORE_T.arrive)));
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
  updateMotion(dt);

  // La citation reprise de l'accueil s'efface juste avant que la planète revienne dans le champ.
  quoteEl.style.opacity = phase === 'arrive' ? 1 - smoothstep(progress(u, EXPLORE_T.hold + 0.4, EXPLORE_T.hold + 1.1)) : 0;
  stars.material.opacity = 0.85 + 0.15 * Math.sin(time * 2);
  renderer.render(scene, camera);
  if (phase === 'explore') explore.place(window.innerWidth, window.innerHeight);

  if (phase === 'back' && u >= EXPLORE_T.back) {
    phase = 'gone';
    window.location.href = './?from=explore';
  }
  if (phase !== 'gone') requestAnimationFrame(frame);
}
// Shaders compilés avant la première image, en parallèle quand le navigateur le permet : pas de gel au démarrage.
renderer
  .compileAsync(scene, camera)
  .catch(() => {})
  .then(() => {
    last = performance.now();
    requestAnimationFrame(frame);
  });

// Retour sur la page par le bouton Précédent : on rejoue l'arrivée.
window.addEventListener('pageshow', (e) => {
  if (!e.persisted || phase !== 'gone') return;
  phase = 'arrive';
  u = 0;
  last = performance.now();
  requestAnimationFrame(frame);
});

// Outils de mise au point, seulement avec le serveur de développement.
if (import.meta.env.DEV) window.__explore = { explore, elements, baseQuat, frameDir, THREE };
