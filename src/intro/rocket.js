import * as THREE from 'three';
import { enableShadows } from './look.js';
import { part } from './models.js';

// Repères du modèle de fusée (tools/blender/models.py). Le modèle a son origine à la base du corps central, la tuyère
// descend en dessous : on le remonte de LIFT pour que l'origine de la fusée soit au bas de la tuyère, posée sur le pas.
const LIFT = 0.5;
const FAIRING_RADIUS = 0.35;
const FAIRING_HEIGHT = 1.2;
const FAIRING_BASE = LIFT + 2.55;
const NOZZLE_EXIT = LIFT - 0.5;
const BOOSTER_NOZZLE_EXIT = -0.23;

// Repères le long de la fusée, depuis sa base : centre de la coiffe et pointe.
export const FAIRING_CENTER = FAIRING_BASE + FAIRING_HEIGHT * 0.45;
export const FAIRING_TIP = FAIRING_BASE + FAIRING_HEIGHT;

// Taille du satellite par rapport au modèle : ses ailes déployées gardent à peu près l'envergure de l'ancien.
const SATELLITE_SCALE = 0.8;
const PANEL_COUNT = 4;

// Le satellite : un caisson doré, deux paraboles et deux ailes de quatre panneaux. Chaque aile tourne sur son bras
// pour se relever le long du caisson, et ses panneaux se replient en accordéon (voir setWingsOpen).
export function buildSatellite() {
  const satellite = new THREE.Group();
  const model = new THREE.Group();
  model.scale.setScalar(SATELLITE_SCALE);
  satellite.add(model);
  model.add(part('satellite', 'corps'));
  const wings = ['d', 'g'].map((tag) => {
    const side = tag === 'd' ? 1 : -1;
    const wing = part('satellite', `aile_${tag}`);
    const pivot = new THREE.Group();
    pivot.position.copy(wing.position);
    wing.position.set(0, 0, 0);
    pivot.add(wing);
    pivot.userData.side = side;
    pivot.userData.panels = Array.from({ length: PANEL_COUNT }, (_, i) => wing.getObjectByName(`panneau_${tag}${i}`));
    model.add(pivot);
    return pivot;
  });
  enableShadows(satellite);
  return { satellite, wings };
}

// open : 0 ailes repliées (relevées contre le caisson, panneaux empilés), 1 déployées.
export function setWingsOpen(wings, open) {
  const fold = 1 - open;
  for (const pivot of wings) {
    const { side, panels } = pivot.userData;
    pivot.rotation.z = side * (Math.PI / 2) * (1 - Math.sqrt(open));
    panels.forEach((panel, i) => {
      // Le premier panneau se plie d'un quart de tour, les suivants d'un demi-tour en alternant : en zigzag.
      const angle = i === 0 ? Math.PI / 2 : Math.PI;
      panel.rotation.y = (i % 2 ? -1 : 1) * side * angle * fold;
    });
  }
}

// Flamme : un cône orange et un cœur plus clair, pointe en bas. Leur base est accrochée à la sortie de la tuyère
// (y) : quand la flamme vacille, elle ne s'allonge que vers le bas et ne remonte jamais dans la tuyère.
const FLAME_OUTER = new THREE.MeshBasicMaterial({ color: '#ff9d3a', transparent: true, opacity: 0.85, depthWrite: false });
const FLAME_CORE = new THREE.MeshBasicMaterial({ color: '#fff1c4', transparent: true, opacity: 0.95, depthWrite: false });
function flameCone(radius, length, material) {
  const geometry = new THREE.ConeGeometry(radius, length, 20, 1, true).rotateX(Math.PI).translate(0, -length / 2, 0);
  return new THREE.Mesh(geometry, material);
}
function buildFlame(radius, length, y) {
  const flame = new THREE.Group();
  flame.position.y = y;
  flame.add(flameCone(radius * 0.92, length, FLAME_OUTER));
  const core = flameCone(radius * 0.55, length * 0.45, FLAME_CORE);
  core.renderOrder = 1;
  flame.add(core);
  flame.visible = false;
  return flame;
}

// Fusée façon Ariane 6 : corps central, deux boosters, coiffe en deux moitiés. L'origine est sous la tuyère.
export function buildRocket() {
  const rocket = new THREE.Group();
  const core = part('fusee', 'corps');
  core.position.y += LIFT;
  rocket.add(core);

  // Boosters : chacun dans un groupe placé à son point d'attache, pour pouvoir les larguer (setBoostersOff).
  const boosters = ['d', 'g'].map((tag) => {
    const booster = part('fusee', `booster_${tag}`);
    const holder = new THREE.Group();
    holder.position.copy(booster.position);
    holder.position.y += LIFT;
    booster.position.set(0, 0, 0);
    holder.add(booster);
    const flame = buildFlame(0.12, 0.8, BOOSTER_NOZZLE_EXIT);
    holder.add(flame);
    holder.userData = { side: tag === 'd' ? 1 : -1, rest: holder.position.clone(), flame };
    rocket.add(holder);
    return holder;
  });

  // Coiffe en deux moitiés, chacune articulée à sa base. La jointure est dans le plan YZ du groupe :
  // en tournant le groupe autour de l'axe de la fusée, on la présente face à la caméra.
  const fairing = new THREE.Group();
  rocket.add(fairing);
  const halves = ['d', 'g'].map((tag) => {
    const side = tag === 'd' ? 1 : -1;
    const hinge = new THREE.Group();
    hinge.position.set(side * FAIRING_RADIUS, FAIRING_BASE, 0);
    const half = part('fusee', `coiffe_${tag}`);
    half.position.set(-side * FAIRING_RADIUS, 0, 0);
    hinge.add(half);
    hinge.userData.side = side;
    fairing.add(hinge);
    return hinge;
  });

  // Charge utile : le satellite, ailes repliées tant que la coiffe est fermée.
  const { satellite: payload, wings } = buildSatellite();
  payload.position.y = FAIRING_BASE + 0.3;
  setWingsOpen(wings, 0);
  fairing.add(payload);

  const flame = buildFlame(0.2, 1.1, NOZZLE_EXIT);
  rocket.add(flame);

  const glow = new THREE.PointLight('#ffa040', 0, 6);
  glow.position.y = NOZZLE_EXIT - 0.1;
  rocket.add(glow);

  enableShadows(rocket);
  return { rocket, fairing, halves, payload, wings, flame, glow, boosters };
}

// open : ouverture des deux moitiés (0 à 1). away : elles se détachent puis partent en arrière en tournoyant,
// pendant que le satellite déplie ses ailes.
export function setFairingOpen(parts, open, away = 0) {
  for (const hinge of parts.halves) {
    const { side } = hinge.userData;
    hinge.rotation.z = -side * (open * 0.6 + away * 1.6);
    hinge.position.x = side * (FAIRING_RADIUS + away * 1.8);
    hinge.position.y = FAIRING_BASE - away * 5;
    hinge.visible = away < 1;
  }
  setWingsOpen(parts.wings, away);
}

// off : largage des boosters, de 0 (attachés) à 1 (loin derrière). Ils s'écartent, basculent vers l'extérieur et
// tombent en arrière de la fusée qui continue de monter.
export function setBoostersOff(parts, off) {
  for (const holder of parts.boosters) {
    const { side, rest, flame } = holder.userData;
    holder.position.set(rest.x + side * (0.25 * off + 0.6 * off * off), rest.y - 9 * off * off, rest.z);
    holder.rotation.z = -side * 0.9 * off;
    holder.visible = off < 1;
    flame.userData.off = off > 0;
  }
}

export function setThrust(parts, on, time) {
  parts.flame.visible = on;
  for (const { userData } of parts.boosters) userData.flame.visible = on && !userData.flame.userData.off;
  if (!on) {
    parts.glow.intensity = 0;
    return;
  }
  const flicker = 0.85 + 0.15 * Math.sin(time * 60) + 0.1 * Math.sin(time * 23);
  parts.flame.scale.set(1, flicker * 1.3, 1);
  for (const { userData } of parts.boosters) userData.flame.scale.set(1, flicker * 1.2, 1);
  parts.glow.intensity = 6 * flicker;
}
