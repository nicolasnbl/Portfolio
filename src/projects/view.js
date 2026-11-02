import * as THREE from 'three';
import { LANDS, PATH, PLANET_RADIUS } from '../intro/planet.js';

// Pages des side projects : la planète de l'accueil (rayon 32, au centre de la scène) vue par une caméra fixe, en
// orbite basse. C'est la planète qui tourne pour amener chaque projet sous la caméra, à l'endroit où l'horloge arrive
// à la fin de la transition vers la timeline : la transition depuis l'accueil peut ainsi plonger de la même façon.

const R = PLANET_RADIUS;
const SPOT_ANGLE = -0.8;
// Point de la surface visé par la caméra, et direction dans laquelle elle regarde (le sens de la marche du satellite).
export const SPOT = new THREE.Vector3(0, Math.cos(SPOT_ANGLE), Math.sin(SPOT_ANGLE));
const FWD = new THREE.Vector3(0, Math.sin(SPOT_ANGLE), -Math.cos(SPOT_ANGLE));
const RIGHT = new THREE.Vector3().crossVectors(FWD, SPOT);

// Orientation de la planète à la fin de l'intro.
export const INTRO_QUAT = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), PATH.pad / R);

const PAD_DIR = new THREE.Vector3(Math.sin(PATH.pad / R), Math.cos(PATH.pad / R), 0);

// Arrêts de la caméra. key : élément de la planète (voir buildPlanet), ou land : une terre entière.
// height : altitude de la caméra, back : son recul, lift : hauteur du point visé, en unités de la scène.
// zone : décor à garder autour. portrait : recul supplémentaire sur écran vertical.
export const STOPS = {
  passions: { land: 'music', height: 13, back: 15, zone: 'music', portrait: 1.35 },
  anjaza: { key: 'crane', height: 5.5, back: 7.5, zone: 'desert' },
  cibel: { key: 'speaker', height: 3.6, back: 5, zone: 'music', portrait: 1.5 },
  guitare: { key: 'guitar', height: 3.6, back: 5, lift: 1, zone: 'music', portrait: 1.5 },
  fusees: { key: 'pad', height: 7, back: 19, lift: 2.2, zone: 'pad', portrait: 1.2 },
};

// Décor gardé pour chaque zone : seuls ces éléments sont construits ou affichés.
const ZONES = {
  music: { dir: LANDS.music.clone().normalize(), radius: 10 },
  desert: { dir: LANDS.desert.clone().normalize(), radius: 13 },
  pad: { dir: PAD_DIR, radius: 9 },
};

export function zonesFor(stops) {
  return [...new Set(stops.map((name) => STOPS[name].zone))].map((zone) => ZONES[zone]);
}

// Point d'ancrage (repère de la planète) et côté à montrer d'un arrêt.
export function stopTarget(name, elements) {
  const stop = STOPS[name];
  if (stop.land) return { anchor: LANDS[stop.land].clone().normalize().multiplyScalar(R), front: null };
  const el = elements.find((e) => e.key === stop.key);
  // Sans côté désigné (pas de tir), on prend l'avant de l'objet tel qu'il est posé.
  const front = el.front ?? new THREE.Vector3(0, 0, 1).applyQuaternion(el.root.quaternion);
  return { anchor: el.anchor.clone(), front };
}

// Orientation de la planète qui amène l'ancrage sous la caméra, en tournant le moins possible depuis la fin de
// l'intro, puis fait pivoter l'élément sur place pour que son côté avant regarde la caméra.
export function stopQuat({ anchor, front }, out = new THREE.Quaternion()) {
  const dir = anchor.clone().normalize().applyQuaternion(INTRO_QUAT);
  out.setFromUnitVectors(dir, SPOT).multiply(INTRO_QUAT);
  if (front) {
    const f = front.clone().applyQuaternion(out);
    f.addScaledVector(SPOT, -f.dot(SPOT)).normalize();
    const toCam = FWD.clone().negate();
    const angle = Math.atan2(new THREE.Vector3().crossVectors(f, toCam).dot(SPOT), f.dot(toCam));
    out.premultiply(new THREE.Quaternion().setFromAxisAngle(SPOT, angle));
  }
  return out;
}

// Cadrage d'un arrêt. zoom < 1 rapproche la caméra (pages projet).
// shift : le sujet est remonté dans le haut de l'image, au-dessus des cartes.
export function stopView(stop, aspect, out, zoom = 1) {
  const portrait = aspect < 1;
  const k = zoom * (portrait ? (stop.portrait ?? 1) : 1);
  out.pos.copy(SPOT).multiplyScalar(R + stop.height * k).addScaledVector(FWD, -stop.back * k);
  out.look.copy(SPOT).multiplyScalar(R + (stop.lift ?? 0.6));
  out.up.copy(SPOT);
  out.fov = portrait ? 50 : 40;
  out.shift = [0, portrait ? 0.38 : 0.34];
  return out;
}

// Soleil des pages projet, dans le repère de la scène : de côté et un peu derrière la caméra.
export const PROJECT_SUN = new THREE.Vector3()
  .copy(SPOT)
  .multiplyScalar(0.8)
  .addScaledVector(RIGHT, 0.6)
  .addScaledVector(FWD, -0.4)
  .normalize()
  .multiplyScalar(60);
