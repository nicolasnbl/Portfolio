import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// Chemins relatifs pour pouvoir servir le build depuis n'importe quel dossier.
// Deux pages : l'accueil avec l'intro, et la timeline du parcours.
export default defineConfig({
  base: './',
  build: {
    rolldownOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        timeline: resolve(import.meta.dirname, 'timeline.html'),
      },
    },
  },
});
