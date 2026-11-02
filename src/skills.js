// Compétences cliquables : un clic fait défiler jusqu'aux endroits où la compétence est citée
// (Parcours, Formations, Side projects). Toutes les cartes concernées reçoivent en même temps
// un halo façon Gemini qui les balaie une fois de droite à gauche, et le mot cité un reflet
// de la même couleur. Une carte peut aussi être visée sans mot cité, via data-halo="compétence".

const CARD = '.job, .trainings > li, .publication';
const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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

function targetsOf(skill) {
  const mentions = [...document.querySelectorAll(`.mention[data-skill="${skill}"]`)];
  const cards = new Set(mentions.map((m) => m.closest(CARD)).filter(Boolean));
  document.querySelectorAll(`[data-halo~="${skill}"]`).forEach((el) => cards.add(el));
  // Ordre du document, pour défiler vers la première carte.
  const sorted = [...cards].sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
  return { mentions, cards: sorted };
}

// Centre l'ensemble des cartes s'il tient à l'écran, sinon place la première en haut.
function scrollToCards(cards) {
  const rects = cards.map((c) => c.getBoundingClientRect());
  const top = Math.min(...rects.map((r) => r.top));
  const bottom = Math.max(...rects.map((r) => r.bottom));
  const vh = window.innerHeight;
  const offset = bottom - top < vh * 0.85 ? (top + bottom) / 2 - vh / 2 : top - vh * 0.12;
  window.scrollTo({ top: window.scrollY + offset, behavior: reduceMotion() ? 'auto' : 'smooth' });
}

function playHalo(cards, mentions) {
  document.querySelectorAll('.halo-sweep').forEach((h) => h.remove());
  document.querySelectorAll('.mention.is-lit').forEach((m) => m.classList.remove('is-lit'));
  void document.body.offsetWidth;
  mentions.forEach((m) => m.classList.add('is-lit'));
  if (reduceMotion()) return;
  cards.forEach((card) => {
    const halo = document.createElement('span');
    halo.className = 'halo-sweep';
    halo.setAttribute('aria-hidden', 'true');
    card.classList.add('has-halo');
    card.appendChild(halo);
    halo.addEventListener('animationend', (e) => {
      if (e.animationName === 'halo-glow') halo.remove();
    });
  });
}

export function setupSkillLinks() {
  document.querySelectorAll('.stack [data-skill]').forEach((tile) => {
    const skill = tile.dataset.skill;
    const { mentions, cards } = targetsOf(skill);
    if (!cards.length) return;

    tile.classList.add('skill-link');
    tile.tabIndex = 0;
    tile.setAttribute('role', 'button');
    tile.title = 'Voir où je l’ai utilisé';

    const go = () => {
      // Les stages sont repliés par défaut : on les ouvre si une carte visée s'y trouve.
      cards.forEach((c) => {
        const details = c.closest('details');
        if (details) details.open = true;
      });
      scrollToCards(cards);
      waitScrollEnd(() => playHalo(cards, mentions));
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
