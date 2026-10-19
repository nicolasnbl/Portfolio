// Contenu et rythme de l'intro. Les titres sont provisoires : à remplacer par les vrais.
export const INTRO = {
  name: 'Nicolas',
  titles: [
    { text: 'Une idée', start: 0.4, end: 2.6 },
    { text: 'Des fondations solides', start: 2.9, end: 5.0 },
    { text: 'Le décollage', start: 6.0, end: 8.6 },
  ],
  scrollHint: 'Scroll pour découvrir',
  // Menu relié au satellite. soon : entrée visible mais pas encore active ; action : animation avant de changer de page.
  nav: [
    { label: 'Portfolio', href: '#vision' },
    { label: 'Side projects', href: '#produit' },
    { label: 'Timeline', action: 'timeline' },
    { label: 'Explorer le monde', action: 'explore' },
  ],
};

// Repères temporels de l'animation, en secondes.
export const T = {
  rollStart: 2.2,
  rollEnd: 5.0,
  liftoff: 5.2,
  climbEnd: 9.4,
  fairingStart: 9.4,
  fairingEnd: 10.1,
  nameStart: 10.2,
  nameEnd: 11.2,
  navStart: 11.0,
  end: 12.2,
};

// Mode « Explorer le monde » : la planète au centre, que l'on fait tourner, et ses éléments à cliquer.
// page : true pour une page pas encore faite, ou l'adresse de la page. Sans page, l'élément n'a que sa fiche.
// Les textes sont provisoires.
export const EXPLORE = {
  hint: 'Glisse pour faire tourner la planète, clique sur ce qui t’intrigue',
  back: 'Retour',
  pageLink: 'Voir la page',
  pageSoon: 'Page à venir',
  elements: {
    solar: {
      title: 'La centrale solaire',
      text: 'Texte provisoire : là où tout commence. Une page dédiée racontera ce projet.',
      page: true,
    },
    forest: {
      title: 'La forêt',
      text: 'Texte provisoire : quelques lignes sur ce que cette forêt représente.',
    },
    pad: {
      title: 'Le pas de tir',
      text: 'Texte provisoire : le point de départ des projets. Une page dédiée arrive.',
      page: true,
    },
    clock: {
      title: 'Le chronomètre',
      text: 'Mon parcours, étape par étape.',
      page: './timeline.html',
    },
    house: {
      title: 'La maison solaire',
      text: 'Texte provisoire : une maison qui produit sa propre énergie.',
    },
    field: {
      title: 'Le champ photovoltaïque',
      text: 'Texte provisoire : quelques lignes sur ce champ de panneaux.',
    },
  },
};

// Entrée et sortie du mode Explorer, en secondes.
export const EXPLORE_T = {
  depart: 1.9, // du clic au passage sur la page Explorer : le satellite se décroche, la caméra pivote vers les étoiles
  arrive: 2.6, // sur la page Explorer : de l'arrivée à la mise en orbite, la planète revient dans le champ
  back: 1.5, // du clic sur Retour au passage sur la page d'accueil
  focus: 1.1, // approche d'un élément
};

// Transition vers la timeline, en secondes depuis le clic sur « Timeline ».
export const LEAVE = {
  retract: 0.6, // les autres lignes rentrent dans le satellite
  orbitStart: 0.45, // le satellite s'est détaché de la fusée et part en orbite
  orbitEnd: 2.4, // il est en orbite, la caméra derrière lui
  diveEnd: 4.2, // la caméra est face au cadran
  end: 4.6, // ouverture de la page timeline
};

// Timeline : étapes provisoires, sans contenu. kind : 'experience' ou 'formation'.
export const TIMELINE = {
  entries: [
    { kind: 'formation' },
    { kind: 'formation' },
    { kind: 'experience' },
    { kind: 'experience' },
    { kind: 'experience' },
  ],
  stepAngle: 30, // écart entre deux étapes sur le cadran, en degrés (30 = une heure)
};

// Repères temporels de l'animation de la timeline, en secondes. spinStart doit tomber sur une seconde ronde :
// la trotteuse bat les secondes jusque-là et arrive sur le 12 à cet instant.
export const TL = {
  zoomStart: 1.4,
  zoomEnd: 3.0,
  spinStart: 3,
  followAt: 4.6,
  end: 6.8,
};
