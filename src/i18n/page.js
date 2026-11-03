import { LANG, pick } from './lang.js';
import { PAGE_EN } from './en.js';

// Traduction des textes écrits dans les pages HTML, et sélecteur de langue en haut à droite.
// Un élément à traduire porte data-i18n="clé" : son contenu est remplacé par PAGE_EN[clé] (HTML autorisé, pour garder
// les liens et les compétences cliquables). Les attributs se traduisent avec data-i18n-alt, data-i18n-title et
// data-i18n-aria-label. En anglais, un script en tête de page masque ces éléments jusqu'ici (classe i18n-wait), pour
// ne pas voir le français s'afficher une fraction de seconde.

const ATTRS = ['alt', 'title', 'aria-label'];

function translatePage() {
  if (LANG !== 'en') return;
  document.documentElement.lang = 'en';
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const text = PAGE_EN[el.dataset.i18n];
    if (text !== undefined) el.innerHTML = text;
    else if (import.meta.env.DEV) console.warn(`Traduction manquante : ${el.dataset.i18n}`);
  });
  for (const attr of ATTRS) {
    document.querySelectorAll(`[data-i18n-${attr}]`).forEach((el) => {
      const text = PAGE_EN[el.getAttribute(`data-i18n-${attr}`)];
      if (text !== undefined) el.setAttribute(attr, text);
    });
  }
}

// Drapeaux en SVG, au format 3:2. Le drapeau britannique (2:1) est recadré sur les côtés.
let flagId = 0;
const FLAGS = {
  fr: () =>
    '<svg class="lang-flag" viewBox="0 0 3 2" aria-hidden="true"><path fill="#000091" d="M0 0h1v2H0z"/><path fill="#fff" d="M1 0h1v2H1z"/><path fill="#e1000f" d="M2 0h1v2H2z"/></svg>',
  en: () => {
    const id = `uk-${flagId++}`;
    return (
      `<svg class="lang-flag" viewBox="0 0 60 30" preserveAspectRatio="xMidYMid slice" aria-hidden="true">` +
      `<clipPath id="${id}"><path d="M30 15h30v15zv15H0zH0V0zV0h30z"/></clipPath>` +
      '<path fill="#012169" d="M0 0h60v30H0z"/>' +
      '<path stroke="#fff" stroke-width="6" d="m0 0 60 30m0-30L0 30"/>' +
      `<path stroke="#c8102e" stroke-width="4" clip-path="url(#${id})" d="m0 0 60 30m0-30L0 30"/>` +
      '<path stroke="#fff" stroke-width="10" d="M30 0v30M0 15h60"/>' +
      '<path stroke="#c8102e" stroke-width="6" d="M30 0v30M0 15h60"/></svg>'
    );
  },
};
const NAMES = { fr: 'Français', en: 'English' };

function switchTo(lang) {
  if (lang === LANG) return;
  try {
    localStorage.setItem('lang', lang);
    // L'intro de la page a déjà été vue : on ne la rejoue pas au rechargement.
    if (document.querySelector('.intro-overlay')) sessionStorage.setItem('intro-seen', '1');
    if (document.querySelector('.tl-overlay')) sessionStorage.setItem('timeline-seen', '1');
  } catch {
    // Stockage indisponible : on passe par l'adresse.
    window.location.search = `?lang=${lang}`;
    return;
  }
  // Les paramètres de mise au point ou de transition (?t=0, ?from=intro) relanceraient l'animation d'arrivée.
  if (window.location.search) window.history.replaceState(null, '', window.location.pathname + window.location.hash);
  window.location.reload();
}

function mountSwitch() {
  const root = document.createElement('div');
  root.className = 'lang-switch';
  root.innerHTML = `
    <button class="lang-current" type="button" aria-haspopup="true" aria-expanded="false"
      aria-label="${pick('Langue : français. Changer de langue', 'Language: English. Change language')}">${FLAGS[LANG]()}</button>
    <ul class="lang-menu" hidden>
      ${['fr', 'en']
        .map(
          (lang) =>
            `<li><button type="button" lang="${lang}" data-lang="${lang}"${lang === LANG ? ' aria-current="true"' : ''}>${FLAGS[lang]()}<span>${NAMES[lang]}</span></button></li>`,
        )
        .join('')}
    </ul>`;
  const button = root.querySelector('.lang-current');
  const menu = root.querySelector('.lang-menu');
  const setOpen = (open) => {
    menu.hidden = !open;
    button.setAttribute('aria-expanded', String(open));
  };
  button.addEventListener('click', () => setOpen(menu.hidden));
  menu.addEventListener('click', (e) => {
    const choice = e.target.closest('[data-lang]');
    if (!choice) return;
    setOpen(false);
    switchTo(choice.dataset.lang);
  });
  document.addEventListener('click', (e) => !root.contains(e.target) && setOpen(false));
  document.addEventListener('keydown', (e) => e.key === 'Escape' && setOpen(false));
  document.body.append(root);
}

translatePage();
mountSwitch();
document.documentElement.classList.remove('i18n-wait');
