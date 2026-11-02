import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Modèles faits dans Blender (tools/blender/models.py) : la fusée à deux boosters, le satellite à deux antennes et la
// centrale solaire flottante. Ils sont chargés une fois, avant que les scènes ne se construisent (attente au niveau
// du module), puis copiés à chaque utilisation.
const loader = new GLTFLoader();
const url = (name) => `${import.meta.env.BASE_URL}models/${name}.glb`;

// Les pages n'ont pas d'image d'environnement pour les reflets : un métal pur y paraîtrait noir. On garde un peu de
// brillant sans les reflets.
function tame(root) {
  root.traverse((o) => {
    if (!o.isMesh) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of mats) {
      m.metalness = Math.min(m.metalness, 0.25);
      m.roughness = Math.max(m.roughness, 0.3);
    }
  });
  return root;
}

const [rocketScene, satelliteScene, plantScene] = await Promise.all(
  ['fusee', 'satellite', 'centrale-flottante'].map((name) => loader.loadAsync(url(name)).then((gltf) => tame(gltf.scene))),
);

// Copie d'une pièce nommée du modèle (avec ses enfants), matériaux et géométries partagés.
export function part(model, name) {
  const scene = { fusee: rocketScene, satellite: satelliteScene, centrale: plantScene }[model];
  const node = scene.getObjectByName(name);
  if (!node) throw new Error(`Pièce ${name} absente du modèle ${model}`);
  return node.clone(true);
}
