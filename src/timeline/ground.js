import * as THREE from 'three';
import { CLOCK_DIR, CLOCK_SCALE, createLeave } from '../intro/leave.js';
import { buildPlanet } from '../intro/planet.js';

// Rayon (en unités de la planète, le long de la surface) du décor gardé autour de l'horloge : tout le continent et
// un peu d'océan, assez pour que l'horizon reste couvert quand la caméra descend au ras du cadran.
const FOCUS_RADIUS = 20;

// Le continent de l'horloge tel qu'on le quitte à la fin de la transition depuis l'accueil : même sol, mêmes arbres,
// même champ photovoltaïque, même EIGSI. On construit la planète de l'accueil en ne gardant que ce qui entoure
// l'horloge, puis on la place dans le repère de la page timeline, où l'horloge (rayon 20) est à l'origine.
export function buildClockGround() {
  // Même nombre d'arbres que sur l'accueil, pour un tirage aléatoire identique.
  const treeCount = window.innerWidth < 768 ? 26 : 46;
  const { planet, clockSite, animate } = buildPlanet({
    treeCount,
    clockDir: CLOCK_DIR,
    focus: { dir: CLOCK_DIR, radius: FOCUS_RADIUS },
  });
  // Oriente l'emplacement de l'horloge comme pendant la transition, puis ramène cet emplacement à l'origine.
  createLeave({ clockSite });
  clockSite.updateMatrix();
  planet.applyMatrix4(clockSite.matrix.clone().invert());

  const ground = new THREE.Group();
  ground.scale.setScalar(1 / CLOCK_SCALE);
  // Sur la planète, l'horloge est posée 1,4 au-dessus du sol (son corps descend sous le cadran).
  ground.position.y = -1.4;
  ground.add(planet);
  return { ground, animate };
}
