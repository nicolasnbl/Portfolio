import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// Chemins relatifs pour pouvoir servir le build depuis n'importe quel dossier.
// Pages : l'accueil avec l'intro, la timeline du parcours, l'exploration de la planète et les pages projet.
export default defineConfig({
  base: './',
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
