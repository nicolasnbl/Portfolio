// Langue du site : français par défaut, anglais si le visiteur l'a choisi (drapeau en haut à droite, retenu dans le
// navigateur) ou si l'adresse contient ?lang=en, pratique pour envoyer directement la version anglaise.
// Sans navigateur (calcul des masques du globe au build), on reste en français.
function detect() {
  try {
    const asked = new URLSearchParams(window.location.search).get('lang');
    if (asked === 'fr' || asked === 'en') {
      localStorage.setItem('lang', asked);
      return asked;
    }
    return localStorage.getItem('lang') === 'en' ? 'en' : 'fr';
  } catch {
    return 'fr';
  }
}

export const LANG = detect();

// Petit texte écrit dans le code : pick('Retour', 'Back').
export const pick = (fr, en) => (LANG === 'en' ? en : fr);

// Remplace, dans un objet de contenu (src/config.js), les textes par leur version traduite. Les tableaux sont
// parcourus élément par élément, ce qui n'est pas traduit garde sa valeur.
export function overlay(target, source) {
  for (const [key, value] of Object.entries(source)) {
    if (value && typeof value === 'object' && target[key] && typeof target[key] === 'object') overlay(target[key], value);
    else target[key] = value;
  }
  return target;
}
