import * as THREE from 'three';

// Le satellite compagnon : pendant l'exploration, il reste au même endroit de l'écran, sur la droite, à distance fixe
// de la caméra, comme s'il voyageait avec nous. La page d'accueil et la page Explorer partagent ces réglages pour
// que le passage de l'une à l'autre ne se voie pas.

export const COMPANION_FOV = 45;
// Place à l'écran, en coordonnées normalisées (-1 à 1, y vers le haut), et distance à la caméra.
const LANDSCAPE = { x: 0.56, y: 0.36, distance: 3.2 };
const PORTRAIT = { x: 0.3, y: 0.62, distance: 4.4 };

// Position du satellite dans le repère de la caméra.
export function companionLocal(aspect, out = new THREE.Vector3()) {
  const { x, y, distance } = aspect < 1 ? PORTRAIT : LANDSCAPE;
  const half = Math.tan(THREE.MathUtils.degToRad(COMPANION_FOV / 2)) * distance;
  return out.set(x * half * aspect, y * half, -distance);
}

// Orientation du satellite par rapport à la caméra : de trois quarts, ailes bien visibles.
export const COMPANION_QUAT = new THREE.Quaternion().setFromEuler(new THREE.Euler(1.0, 0.45, 0.3));

// Position et orientation de la caméra au moment du passage d'une page à l'autre.
const KEY = 'explore-handoff';

export function saveHandoff(camera) {
  try {
    sessionStorage.setItem(
      KEY,
      JSON.stringify({ pos: camera.position.toArray(), quat: camera.quaternion.toArray() }),
    );
  } catch {
    // Stockage indisponible : la page suivante partira d'un cadrage par défaut.
  }
}

export function loadHandoff() {
  try {
    const data = JSON.parse(sessionStorage.getItem(KEY));
    if (data?.pos?.length === 3 && data?.quat?.length === 4) {
      return { pos: new THREE.Vector3().fromArray(data.pos), quat: new THREE.Quaternion().fromArray(data.quat) };
    }
  } catch {
    // Rien d'exploitable : cadrage par défaut.
  }
  return null;
}
