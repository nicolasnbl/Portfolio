// Masques des terres du globe précalculés au build (plugin bakeGlobeMasks de vite.config.js), un par rayon de planète.
// En développement, la liste est vide : le masque est calculé au chargement, donc toujours à jour.
import { MASK_URLS } from 'virtual:globe-masks';
import { MASK_HEIGHT, MASK_WIDTH } from './look.js';

const loaded = new Map();

// Télécharge et décompresse le masque d'une planète de rayon R ; sans masque précalculé, ne fait rien.
export function loadGlobeMask(R) {
  const url = MASK_URLS[R];
  if (!url || typeof window === 'undefined') return Promise.resolve();
  return fetch(url)
    .then((response) => {
      if (!response.ok) throw new Error(`Masque du globe introuvable : ${url}`);
      return response.arrayBuffer();
    })
    .then(async (buffer) => {
      const bytes = new Uint8Array(buffer, 0, 2);
      // gzip à décompresser ici, sauf si le serveur l'a déjà fait en route.
      if (bytes[0] === 0x1f && bytes[1] === 0x8b) {
        buffer = await new Response(new Blob([buffer]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
      }
      loaded.set(R, unpackMask(new Uint8Array(buffer)));
    })
    .catch(() => {
      // Le globe calculera son masque lui-même.
    });
}

// Inverse de packMask (vite.config.js) : canaux R, G, B séparés, écarts verticaux puis horizontaux → RGBA.
function unpackMask(packed) {
  const W = MASK_WIDTH;
  const N = MASK_WIDTH * MASK_HEIGHT;
  const rgba = new Uint8Array(N * 4);
  const dx = new Uint8Array(N);
  for (let c = 0; c < 3; c++) {
    for (let i = 0; i < N; i++) dx[i] = packed[c * N + i] + (i >= W ? dx[i - W] : 0);
    for (let i = 0; i < N; i++) rgba[i * 4 + c] = dx[i] + (i % W ? rgba[(i - 1) * 4 + c] : 0);
  }
  for (let i = 0; i < N; i++) rgba[i * 4 + 3] = 255;
  return rgba;
}

export const bakedGlobeMask = (R) => loaded.get(R) ?? null;
