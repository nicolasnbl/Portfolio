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
    { label: 'Explorer le monde', soon: true },
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
