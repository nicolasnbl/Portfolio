import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
// Vite ajoute une empreinte au nom des fichiers (fusee-XXXX.glb) : le navigateur peut les garder en cache un an.
import fusee from '../assets/models/fusee.glb?url';
import satellite from '../assets/models/satellite.glb?url';
import centrale from '../assets/models/centrale-flottante.glb?url';

// Modèles faits dans Blender (tools/blender/models.py) : la fusée à deux boosters, le satellite à deux antennes et la
// centrale solaire flottante, compressés avec meshopt (npm run models). Ils sont chargés une fois, avant que les
// scènes ne se construisent (modelsReady), puis copiés à chaque utilisation. Chaque page HTML les
// précharge déjà (plugin preloadAssets de vite.config.js) : le téléchargement démarre sans attendre le JavaScript.
const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);

let rocketScene;
let satelliteScene;
let plantScene;

// Chaque page attend cette promesse avant de construire sa scène (et seulement à ce moment-là : le reste de la page,
// comme les compétences cliquables, n'attend pas les modèles).
export const modelsReady = Promise.all(
  [fusee, satellite, centrale].map((url) => loader.loadAsync(url).then((gltf) => gltf.scene)),
).then((scenes) => {
  [rocketScene, satelliteScene, plantScene] = scenes;
});

// Copie d'une pièce nommée du modèle (avec ses enfants), matériaux et géométries partagés.
export function part(model, name) {
  if (!rocketScene) throw new Error('Modèles 3D pas encore chargés : attendre modelsReady');
  const scene = { fusee: rocketScene, satellite: satelliteScene, centrale: plantScene }[model];
  const node = scene.getObjectByName(name);
  if (!node) throw new Error(`Pièce ${name} absente du modèle ${model}`);
  return node.clone(true);
}
