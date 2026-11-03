import './style.css';
import { createIntro } from './intro/intro.js';
import { modelsReady } from './intro/models.js';
import { loadGlobeMask } from './intro/globe-masks.js';
import { PLANET_RADIUS } from './intro/planet.js';
import { setupMailCopy } from './contact.js';
import { setupSkillLinks, setupSideIcons } from './skills.js';

// Les sections deviennent interactives tout de suite, sans attendre les modèles 3D de l'intro.
setupMailCopy();
setupSkillLinks();
setupSideIcons();

await Promise.all([modelsReady, loadGlobeMask(PLANET_RADIUS)]);
const intro = createIntro({
  canvas: document.querySelector('#scene'),
  overlay: document.querySelector('.intro-overlay'),
  onStart: () => {
    document.body.classList.add('intro-playing');
    document.body.classList.remove('intro-done');
  },
  onEnd: () => {
    document.body.classList.remove('intro-playing');
    document.body.classList.add('intro-done');
  },
});

document.body.classList.add('intro-playing');
document.querySelector('.replay').addEventListener('click', () => intro.replay());

const devReplay = document.querySelector('.dev-replay');
if (import.meta.env.DEV || import.meta.env.VITE_DEV_TOOLS === '1') {
  devReplay.hidden = false;
  devReplay.addEventListener('click', () => intro.replay());
}

// Le nom s'efface quand on descend vers les sections.
const overlay = document.querySelector('.intro-overlay');
window.addEventListener(
  'scroll',
  () => {
    const opacity = Math.max(0, 1 - window.scrollY / (window.innerHeight * 0.6));
    overlay.style.opacity = opacity;
    // Une fois effacé, le menu ne doit plus capter les clics.
    overlay.style.visibility = opacity > 0.05 ? '' : 'hidden';
  },
  { passive: true },
);
