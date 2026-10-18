import './style.css';
import { createIntro } from './intro/intro.js';

document.body.classList.add('intro-playing');

createIntro({
  canvas: document.querySelector('#scene'),
  overlay: document.querySelector('.intro-overlay'),
  onEnd: () => {
    document.body.classList.remove('intro-playing');
    document.body.classList.add('intro-done');
  },
});
