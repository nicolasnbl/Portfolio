import './style.css';
import { createIntro } from './intro/intro.js';

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

// Le nom s'efface quand on descend vers les sections.
const overlay = document.querySelector('.intro-overlay');
window.addEventListener(
  'scroll',
  () => {
    overlay.style.opacity = Math.max(0, 1 - window.scrollY / (window.innerHeight * 0.6));
  },
  { passive: true },
);
