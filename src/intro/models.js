import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
// Vite ajoute une empreinte au nom des fichiers (fusee-XXXX.glb.gz) : le navigateur peut les garder en cache un an.
// Les .glb sont gzippés à l'avance (npm run models) car Vercel ne compresse pas ce type de fichier : 378 Ko → 166 Ko.
import fusee from '../assets/models/fusee.glb.gz?url';
import satellite from '../assets/models/satellite.glb.gz?url';
import centrale from '../assets/models/centrale-flottante.glb.gz?url';

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
// Hors navigateur (calcul du masque du globe au build), rien à charger.
export const modelsReady = (
  typeof window === 'undefined' ? Promise.resolve([]) : Promise.all([fusee, satellite, centrale].map(loadModel))
).then((scenes) => {
  [rocketScene, satelliteScene, plantScene] = scenes;
});

// Téléchargement (même requête que le <link rel="preload"> de la page, pour la réutiliser), décompression gzip dans
// le navigateur, puis lecture du .glb. Si un serveur a déjà décompressé le fichier en route, on le lit tel quel.
async function loadModel(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Modèle introuvable : ${url}`);
  let buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer, 0, 2);
  if (bytes[0] === 0x1f && bytes[1] === 0x8b) {
    buffer = await new Response(new Blob([buffer]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
  }
  const gltf = await loader.parseAsync(buffer, '');
  return gltf.scene;
}

// Copie d'une pièce nommée du modèle (avec ses enfants), matériaux et géométries partagés.
export function part(model, name) {
  if (!rocketScene) throw new Error('Modèles 3D pas encore chargés : attendre modelsReady');
  const scene = { fusee: rocketScene, satellite: satelliteScene, centrale: plantScene }[model];
  const node = scene.getObjectByName(name);
  if (!node) throw new Error(`Pièce ${name} absente du modèle ${model}`);
  return node.clone(true);
}
