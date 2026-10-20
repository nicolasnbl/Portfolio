import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// Chemins relatifs pour pouvoir servir le build depuis n'importe quel dossier.
// Trois pages : l'accueil avec l'intro, la timeline du parcours et l'exploration de la planète.
export default defineConfig({
  base: './',
  build: {
    rolldownOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        timeline: resolve(import.meta.dirname, 'timeline.html'),
        explore: resolve(import.meta.dirname, 'explore.html'),
      },
    },
  },
});
