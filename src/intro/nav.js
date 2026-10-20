import { easeOutCubic, lerp, progress } from './math.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

// Menu relié au satellite : chaque entrée est un point au bout d'une ligne que le satellite « émet ».
// Les éléments sont en HTML par-dessus la scène, repositionnés à chaque image sur le satellite projeté à l'écran.
export function createNav(nav, items, { onAction } = {}) {
  const svg = nav.querySelector('.intro-nav-lines');
  const list = nav.querySelector('.intro-nav-list');
  const defs = document.createElementNS(SVG_NS, 'defs');
  svg.append(defs);
  let hovered = -1;

  const entries = items.map((item, i) => {
    // Dégradé le long de la ligne : discret au départ du satellite, lumineux à l'arrivée.
    const gradient = document.createElementNS(SVG_NS, 'linearGradient');
    gradient.id = `intro-nav-gradient-${i}`;
    gradient.setAttribute('gradientUnits', 'userSpaceOnUse');
    gradient.innerHTML =
      '<stop offset="0" stop-color="#ffd89a" stop-opacity="0.1"/><stop offset="1" stop-color="#ffd89a" stop-opacity="0.85"/>';
    defs.append(gradient);
    const line = document.createElementNS(SVG_NS, 'line');
    line.setAttribute('pathLength', '1');
    line.setAttribute('stroke', `url(#${gradient.id})`);
    line.classList.add('intro-nav-line');
    const signal = document.createElementNS(SVG_NS, 'circle');
    signal.setAttribute('r', '2.5');
    signal.classList.add('intro-nav-signal');
    svg.append(line, signal);

    const li = document.createElement('li');
    const link = document.createElement('a');
    link.className = 'intro-nav-item';
    link.href = item.href ?? '#';
    link.innerHTML =
      '<span class="intro-nav-dot" aria-hidden="true"></span>' +
      '<span class="intro-nav-label"><span class="intro-nav-text"></span></span>';
    link.querySelector('.intro-nav-text').textContent = item.label;
    if (item.action) {
      link.href = '#';
      link.addEventListener('click', (e) => {
        e.preventDefault();
        onAction?.(item.action, i);
      });
    }
    if (item.soon) {
      link.setAttribute('aria-disabled', 'true');
      link.dataset.soon = 'Bientôt';
      link.addEventListener('click', (e) => e.preventDefault());
    }
    const enter = () => {
      hovered = i;
      nav.classList.add('has-hover');
      li.classList.add('is-hover');
    };
    const leave = () => {
      if (hovered === i) hovered = -1;
      nav.classList.remove('has-hover');
      li.classList.remove('is-hover');
    };
    link.addEventListener('pointerenter', enter);
    link.addEventListener('pointerleave', leave);
    link.addEventListener('focus', enter);
    link.addEventListener('blur', leave);
    li.append(link);
    list.append(li);
    return { li, line, gradient, signal, label: link.querySelector('.intro-nav-label') };
  });

  return {
    // Entrée survolée (-1 si aucune), pour que le satellite se tourne vers elle.
    get hovered() {
      return hovered;
    },

    // Oublie l'entrée choisie, au retour sur la page après un départ.
    reset() {
      hovered = -1;
      nav.classList.remove('has-hover');
    },

    // anchor : satellite à l'écran, en pixels. reveal : avancée de l'apparition, en secondes depuis son début.
    // exit : { index, p } pendant un départ vers une autre page : les autres lignes rentrent d'abord dans le satellite,
    // puis celle de l'entrée choisie.
    update(anchor, reveal, clock, exit = null) {
      if (exit) {
        hovered = exit.index;
        nav.classList.add('has-hover');
      }
      const w = window.innerWidth;
      const h = window.innerHeight;
      const portrait = w < h;
      nav.classList.toggle('is-portrait', portrait);
      const n = entries.length;
      const spacing = portrait ? Math.min(58, h * 0.07) : Math.min(76, h * 0.095);
      // Rayon approximatif du satellite à l'écran : les lignes partent de son bord, pas de son centre.
      const radius = Math.min(w, h) * (portrait ? 0.07 : 0.06);

      // Grand écran : éventail à droite du satellite, comme sur le croquis.
      // Écran vertical : colonne dans le ciel, au-dessus et à droite du satellite, libellés à gauche des points.
      const widest = Math.max(...entries.map((e) => e.label.offsetWidth));
      const colX = portrait
        ? w - 28
        : Math.min(anchor.x + Math.max(200, w * 0.16), w - widest - 64);
      const colY = portrait ? Math.max(90, anchor.y - h * 0.34) : anchor.y;

      entries.forEach((entry, i) => {
        const k = i - (n - 1) / 2;
        // L'éventail se resserre vers le satellite aux extrémités, comme un arc.
        const dotX = portrait ? colX : colX - k * k * 18;
        const dotY = portrait ? colY + i * spacing : colY + k * spacing;

        const hide = !exit ? 0 : i === exit.index ? progress(exit.p, 0.55, 1) : progress(exit.p, 0, 0.55);
        const p = easeOutCubic(progress(reveal, i * 0.16, i * 0.16 + 0.5)) * (1 - hide);
        const labelP = progress(reveal, i * 0.16 + 0.3, i * 0.16 + 0.7) * (1 - Math.min(1, hide * 2));
        entry.li.classList.toggle('is-hover', hovered === i);

        const dx = dotX - anchor.x;
        const dy = dotY - anchor.y;
        const len = Math.hypot(dx, dy) || 1;
        const sx = anchor.x + (dx / len) * radius;
        const sy = anchor.y + (dy / len) * radius;
        entry.line.setAttribute('x1', sx);
        entry.line.setAttribute('y1', sy);
        entry.line.setAttribute('x2', dotX);
        entry.line.setAttribute('y2', dotY);
        for (const [key, value] of [['x1', sx], ['y1', sy], ['x2', dotX], ['y2', dotY]]) {
          entry.gradient.setAttribute(key, value);
        }
        entry.line.style.strokeDashoffset = 1 - p;
        entry.line.classList.toggle('is-hover', hovered === i);

        // Au survol, une impulsion file du satellite vers l'entrée, comme un signal radio.
        const s = (clock * 1.4) % 1;
        entry.signal.setAttribute('cx', lerp(sx, dotX, s));
        entry.signal.setAttribute('cy', lerp(sy, dotY, s));
        entry.signal.style.opacity = hovered === i ? Math.sin(s * Math.PI) : 0;

        entry.li.style.left = `${dotX}px`;
        entry.li.style.top = `${dotY}px`;
        // Le point s'allume quand la ligne l'atteint.
        entry.li.style.setProperty('--dot', easeOutCubic(progress(p, 0.7, 1)));
        entry.li.style.setProperty('--label', labelP);
      });
    },
  };
}
