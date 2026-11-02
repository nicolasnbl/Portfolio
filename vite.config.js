import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import { defineConfig, runnerImport } from 'vite';

// Les modèles 3D et la police sont demandés par le JavaScript et la feuille de style, donc découverts tard. Ce plugin
// les annonce en tête de chaque page (<link rel="preload">) : le navigateur les télécharge en même temps que le
// JavaScript au lieu d'attendre qu'il soit lu. En build, les noms portent l'empreinte ajoutée par Vite.
const PRELOADS = [
  { source: 'src/assets/models/fusee.glb.gz', as: 'fetch' },
  { source: 'src/assets/models/satellite.glb.gz', as: 'fetch' },
  { source: 'src/assets/models/centrale-flottante.glb.gz', as: 'fetch' },
  { source: 'src/assets/fonts/space-grotesk-latin.woff2', as: 'font', type: 'font/woff2' },
];

function preloadAssets() {
  return {
    name: 'preload-assets',
    transformIndexHtml: {
      order: 'post',
      handler(_html, ctx) {
        const tags = PRELOADS.map(({ source, as, type }) => {
          let href = `/${source}`;
          if (ctx.bundle) {
            const asset = Object.values(ctx.bundle).find((file) => file.originalFileNames?.includes(source));
            if (!asset) throw new Error(`Fichier à précharger absent du build : ${source}`);
            href = `./${asset.fileName}`;
          }
          // crossorigin : le chargement des modèles (fetch) et des polices se fait en mode CORS, le préchargement aussi,
          // sinon le navigateur ne le réutilise pas.
          return { tag: 'link', attrs: { rel: 'preload', href, as, ...(type && { type }), crossorigin: '' }, injectTo: 'head' };
        });
        // Masque précalculé du globe de la page (build seulement) : la page Explorer a une planète plus petite.
        if (ctx.bundle) {
          const R = ctx.filename.endsWith('explore.html') ? 18 : 32;
          const mask = Object.values(ctx.bundle).find((file) => file.fileName.includes(`globe-${R}.mask`));
          if (!mask) throw new Error(`Masque du globe absent du build : rayon ${R}`);
          tags.push({ tag: 'link', attrs: { rel: 'preload', href: `./${mask.fileName}`, as: 'fetch', crossorigin: '' }, injectTo: 'head' });
        }
        return tags;
      },
    },
  };
}

// Masque des terres du globe : au build, il est calculé ici avec le code du site (planet.js) pour chaque rayon de
// planète utilisé, et livré comme fichier (gzippé) au lieu d'être recalculé par chaque visiteur, ce qui prenait
// jusqu'à une demi-seconde sur mobile. En développement, la liste reste vide et le masque est calculé dans la page.
const GLOBE_RADII = [32, 18]; // accueil, timeline et side projects ; page Explorer
const MASK_DIR = resolve(import.meta.dirname, 'node_modules/.cache/globe-masks');
const maskFile = (R) => `${MASK_DIR}/globe-${R}.mask.gz`;

// Le masque est lisse : rangé canal par canal (R, G, B ; A vaut toujours 255), chaque octet remplacé par son écart au
// voisin de gauche, puis par l'écart de cet écart avec la ligne du dessus, il se compresse 3 fois mieux (52 Ko).
// globe-masks.js fait l'inverse.
function packMask(rgba) {
  const W = 1024;
  const N = rgba.length / 4;
  const out = new Uint8Array(N * 3);
  const dx = new Uint8Array(N);
  for (let c = 0; c < 3; c++) {
    for (let i = 0; i < N; i++) dx[i] = (rgba[i * 4 + c] - (i % W ? rgba[(i - 1) * 4 + c] : 0)) & 255;
    for (let i = 0; i < N; i++) out[c * N + i] = (dx[i] - (i >= W ? dx[i - W] : 0)) & 255;
  }
  return out;
}

const emptyMasks = {
  name: 'empty-globe-masks',
  resolveId: (id) => (id === 'virtual:globe-masks' ? '\0virtual:globe-masks' : undefined),
  load: (id) => (id === '\0virtual:globe-masks' ? 'export const MASK_URLS = {};' : undefined),
};

function bakeGlobeMasks() {
  let build = false;
  return {
    name: 'bake-globe-masks',
    configResolved(config) {
      build = config.command === 'build';
    },
    async buildStart() {
      if (!build) return;
      // Code du site chargé dans Node, sans masques précalculés (ce sont eux qu'on calcule).
      const options = { root: import.meta.dirname, configFile: false, plugins: [emptyMasks] };
      const { module: planet } = await runnerImport('/src/intro/planet.js', options);
      const { module: leave } = await runnerImport('/src/intro/leave.js', options);
      mkdirSync(MASK_DIR, { recursive: true });
      for (const R of GLOBE_RADII) writeFileSync(maskFile(R), gzipSync(packMask(planet.globeMaskData(R, leave.CLOCK_DIR)), { level: 9 }));
    },
    resolveId(id) {
      if (id === 'virtual:globe-masks') return '\0virtual:globe-masks';
    },
    load(id) {
      if (id !== '\0virtual:globe-masks') return;
      if (!build) return 'export const MASK_URLS = {};';
      const imports = GLOBE_RADII.map((R) => `import m${R} from ${JSON.stringify(`${maskFile(R)}?url`)};`).join('\n');
      return `${imports}\nexport const MASK_URLS = { ${GLOBE_RADII.map((R) => `${R}: m${R}`).join(', ')} };`;
    },
  };
}

// Chemins relatifs pour pouvoir servir le build depuis n'importe quel dossier.
// Pages : l'accueil avec l'intro, la timeline du parcours, l'exploration de la planète et les pages projet.
export default defineConfig({
  base: './',
  plugins: [bakeGlobeMasks(), preloadAssets()],
  build: {
    rolldownOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        timeline: resolve(import.meta.dirname, 'timeline.html'),
        explore: resolve(import.meta.dirname, 'explore.html'),
        fusees: resolve(import.meta.dirname, 'projet-fusees.html'),
        sideProjects: resolve(import.meta.dirname, 'side-projects.html'),
        guitare: resolve(import.meta.dirname, 'projet-guitare.html'),
      },
    },
  },
});
