// Compétences cliquables : un clic fait défiler jusqu'à l'endroit où la compétence est citée
// (Parcours, Formations), puis un halo façon Gemini balaie la carte une fois, de droite à gauche.
// Un nouveau clic sur la même compétence passe à la mention suivante.

const CARD = '.job, .trainings > li, .publication';

function waitScrollEnd(done) {
  let last = window.scrollY;
  let still = 0;
  const start = performance.now();
  const tick = () => {
    const y = window.scrollY;
    still = y === last ? still + 1 : 0;
    last = y;
    if (still >= 6 || performance.now() - start > 1500) done();
    else requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function playHalo(card, skill) {
  card.querySelector('.halo-sweep')?.remove();
  document.querySelectorAll('.mention.is-lit').forEach((m) => m.classList.remove('is-lit'));
  card.querySelectorAll(`.mention[data-skill="${skill}"]`).forEach((m) => m.classList.add('is-lit'));
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const halo = document.createElement('span');
  halo.className = 'halo-sweep';
  halo.setAttribute('aria-hidden', 'true');
  card.classList.add('has-halo');
  card.appendChild(halo);
  halo.addEventListener('animationend', (e) => {
    if (e.animationName === 'halo-glow') halo.remove();
  });
}

export function setupSkillLinks() {
  const step = new Map();
  document.querySelectorAll('.stack [data-skill]').forEach((tile) => {
    const skill = tile.dataset.skill;
    const cards = [
      ...new Set([...document.querySelectorAll(`.mention[data-skill="${skill}"]`)].map((m) => m.closest(CARD))),
    ].filter(Boolean);
    if (!cards.length) return;

    tile.classList.add('skill-link');
    tile.tabIndex = 0;
    tile.setAttribute('role', 'button');
    tile.title = 'Voir où je l’ai utilisé';

    const go = () => {
      const i = step.get(skill) ?? 0;
      step.set(skill, (i + 1) % cards.length);
      const card = cards[i];
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      waitScrollEnd(() => playHalo(card, skill));
    };
    tile.addEventListener('click', go);
    tile.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        go();
      }
    });
  });
}

// Sur écran tactile (pas de survol), les icônes des side projects jouent leur animation
// une fois quand elles arrivent à l'écran.
export function setupSideIcons() {
  if (window.matchMedia('(hover: hover)').matches) return;
  const links = [...document.querySelectorAll('.side-list a')];
  if (!links.length || !('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver(
    (entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      links.forEach((a, i) => {
        setTimeout(() => a.classList.add('is-playing'), 300 + i * 250);
        setTimeout(() => a.classList.remove('is-playing'), 300 + i * 250 + 1700);
      });
    },
    { threshold: 0.8 },
  );
  io.observe(links[0].closest('.side-list'));
}
