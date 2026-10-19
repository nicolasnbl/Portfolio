import '../style.css';
import './timeline.css';
import { createTimeline } from './timeline.js';

const overlay = document.querySelector('.tl-overlay');
const dots = document.querySelector('.tl-dots');
const prev = document.querySelector('.tl-prev');
const next = document.querySelector('.tl-next');
const hint = document.querySelector('.tl-hint');

const timeline = createTimeline({
  canvas: document.querySelector('#scene'),
  overlay,
  onEnd: () => document.body.classList.add('timeline-ready'),
  onStep: (step, total) => {
    if (!dots.children.length) {
      for (let i = 0; i < total; i++) {
        const li = document.createElement('li');
        const button = document.createElement('button');
        button.type = 'button';
        button.setAttribute('aria-label', `Étape ${i + 1}`);
        button.addEventListener('click', () => timeline.goTo(i));
        li.appendChild(button);
        dots.appendChild(li);
      }
    }
    [...dots.children].forEach((li, i) => li.firstChild.toggleAttribute('aria-current', i === step));
    prev.disabled = step === 0;
    next.disabled = step === total - 1;
    if (step > 0) hint.classList.add('is-hidden');
  },
});

prev.addEventListener('click', () => timeline.previous());
next.addEventListener('click', () => timeline.next());

const devReplay = document.querySelector('.dev-replay');
if (import.meta.env.DEV || import.meta.env.VITE_DEV_TOOLS === '1') {
  devReplay.hidden = false;
  devReplay.addEventListener('click', () => {
    document.body.classList.remove('timeline-ready');
    hint.classList.remove('is-hidden');
    timeline.replay();
  });
}
