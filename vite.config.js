import { resolve } from 'node:path';
import { defineConfig } from 'vite';

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
        return PRELOADS.map(({ source, as, type }) => {
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
      },
    },
  };
}

// Chemins relatifs pour pouvoir servir le build depuis n'importe quel dossier.
// Pages : l'accueil avec l'intro, la timeline du parcours, l'exploration de la planète et les pages projet.
export default defineConfig({
  base: './',
  plugins: [preloadAssets()],
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
