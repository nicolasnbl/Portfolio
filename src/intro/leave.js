import * as THREE from 'three';
import { TIMELINE, TL } from '../config.js';
import { buildClock } from '../timeline/clock.js';
import { PATH, PLANET_RADIUS } from './planet.js';

// Transition vers la timeline : le satellite quitte la fusée et se met en orbite, la planète tourne sous lui
// jusqu'au continent de l'horloge, puis la caméra plonge sur le cadran et retrouve le premier plan de la page timeline.
// Tout se passe dans le plan YZ : un angle `a` y repère la direction (0, cos a, sin a) depuis le centre de la planète.

const ORBIT_RADIUS = PLANET_RADIUS + 10;
const SAT_ANGLE = -0.45; // où le satellite termine sa mise en orbite
const CLOCK_ANGLE = -0.8; // où se trouve l'horloge à la fin de la plongée
const PLANET_TURN = THREE.MathUtils.degToRad(70); // rotation de la planète pendant la transition
export const CLOCK_SCALE = 0.4;

const X = new THREE.Vector3(1, 0, 0);
const Z = new THREE.Vector3(0, 0, 1);
const radial = (a, out = new THREE.Vector3()) => out.set(0, Math.cos(a), Math.sin(a));
// Direction de la marche du satellite, vers les angles décroissants.
const forward = (a, out = new THREE.Vector3()) => out.set(0, Math.sin(a), -Math.cos(a));

// Orientation de la planète en fin de transition : son roulis de fin d'intro, puis le tour supplémentaire.
const finalPlanet = new THREE.Quaternion()
  .setFromAxisAngle(X, PLANET_TURN)
  .multiply(new THREE.Quaternion().setFromAxisAngle(Z, PATH.pad / PLANET_RADIUS));
const toPlanet = finalPlanet.clone().invert();

// Emplacement de l'horloge dans le repère de la planète : au bout de la transition, elle est en CLOCK_ANGLE,
// cadran tourné vers l'espace et 12 dans le sens de la marche. Pendant l'intro, elle est sur la face cachée.
export const CLOCK_DIR = radial(CLOCK_ANGLE).applyQuaternion(toPlanet);
const clockQuat = toPlanet.clone().multiply(
  new THREE.Quaternion().setFromRotationMatrix(
    new THREE.Matrix4().makeBasis(X, radial(CLOCK_ANGLE), forward(CLOCK_ANGLE).negate()),
  ),
);

// Trotteuse : elle bat les secondes comme au début de la page timeline (même formule, temps négatif), pour arriver
// sur la même position au moment où la page s'ouvre.
const TICK = (Math.PI * 2) / 60;
function handAngle(untilEnd) {
  const t = -untilEnd;
  const n = Math.floor(t);
  const tick = 1 - (1 - Math.min(1, (t - n) / 0.12)) ** 3;
  return -TICK * (TL.spinStart - n + 1 - tick);
}

export function createLeave({ clockSite }) {
  clockSite.quaternion.copy(clockQuat);
  let clock = null;

  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const start = new THREE.Vector3();
  const qTurn = new THREE.Quaternion();
  const satPos = new THREE.Vector3();
  const satBase = new THREE.Vector3(); // position sur l'orbite, sans l'écart de fin : la caméra suit celle-ci
  const satFwd = new THREE.Vector3();
  const satUp = new THREE.Vector3();
  let startAngle = 0;
  let startRadius = 0;

  return {
    // Construite à la demande : la texture du cadran n'est créée que si on va vers la timeline.
    buildClock() {
      if (clock) return;
      clock = buildClock(TIMELINE.entries.map((_, i) => THREE.MathUtils.degToRad(TIMELINE.stepAngle) * i));
      clock.clock.scale.setScalar(CLOCK_SCALE);
      // Le corps de l'horloge descend sous le cadran : on la pose dessus.
      clock.clock.position.y = 1.4 * CLOCK_SCALE;
      clockSite.add(clock.clock);
    },

    // Position de départ du satellite, au moment où il quitte la fusée.
    begin(worldPos) {
      start.copy(worldPos);
      startAngle = Math.atan2(worldPos.z, worldPos.y);
      startRadius = Math.hypot(worldPos.y, worldPos.z);
    },

    // Rotation supplémentaire de la planète, à appliquer après son roulis d'intro. k de 0 à 1.
    planetTurn(k) {
      return qTurn.setFromAxisAngle(X, PLANET_TURN * k);
    },

    // Satellite : trajectoire de mise en orbite (k de 0 à 1), puis il continue doucement sa course (drift, en secondes).
    // away (0 à 1) : il s'écarte sur le côté et prend de l'altitude.
    satellite(k, drift, away = 0) {
      const angle = THREE.MathUtils.lerp(startAngle, SAT_ANGLE, k) - drift * 0.05;
      const r = THREE.MathUtils.lerp(startRadius, ORBIT_RADIUS, k);
      satBase.copy(radial(angle, a)).multiplyScalar(r);
      satBase.x = THREE.MathUtils.lerp(start.x, 0, k);
      forward(angle, satFwd);
      radial(angle, satUp);
      satPos.copy(satBase).addScaledVector(X, away * 5).addScaledVector(satUp, away * 2.5);
      return { pos: satPos, fwd: satFwd, up: satUp };
    },

    // Caméra derrière le satellite, un peu au-dessus, le regard vers l'horizon où l'horloge va apparaître.
    chaseView(out) {
      out.pos.copy(satBase).addScaledVector(satFwd, -2.2).addScaledVector(satUp, 0.7);
      out.look.copy(satBase).addScaledVector(satFwd, 8).addScaledVector(satUp, -2.2);
      out.up.copy(satUp);
      out.fov = 50;
    },

    // Premier plan de la page timeline, à l'échelle de l'horloge posée sur la planète.
    clockView(out, portrait) {
      clockSite.updateWorldMatrix(true, false);
      const lift = 1.4 * CLOCK_SCALE;
      const dist = (portrait ? 62 : 38) * CLOCK_SCALE;
      out.pos.copy(clockSite.localToWorld(a.set(0, lift + dist, 0.01 * CLOCK_SCALE)));
      out.look.copy(clockSite.localToWorld(a.set(0, lift, -0.6 * CLOCK_SCALE)));
      out.up.copy(b.set(0, 0, -1).transformDirection(clockSite.matrixWorld));
      out.fov = 40;
    },

    // Soleil placé comme sur la page timeline, dans le repère de l'horloge.
    sunPosition(out) {
      clockSite.updateWorldMatrix(true, false);
      return out.set(14, 30, 10).transformDirection(clockSite.matrixWorld).multiplyScalar(60);
    },

    // untilEnd : secondes restantes avant l'ouverture de la page timeline.
    tick(untilEnd) {
      if (clock) clock.hand.rotation.y = -handAngle(untilEnd);
    },
  };
}
