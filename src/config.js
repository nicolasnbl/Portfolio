// Contenu et rythme de l'intro. Les titres sont provisoires : à remplacer par les vrais.
export const INTRO = {
  name: 'Nicolas',
  tagline: 'Portfolio',
  titles: [
    { text: 'Une idée', start: 0.4, end: 2.6 },
    { text: 'Des fondations solides', start: 2.9, end: 5.0 },
    { text: 'Le décollage', start: 6.0, end: 8.6 },
  ],
  scrollHint: 'Scroll pour découvrir',
  // Menu relié au satellite. soon : entrée visible mais pas encore active.
  nav: [
    { label: 'Portfolio', href: '#vision' },
    { label: 'Side projects', href: '#produit' },
    { label: 'Timeline', soon: true },
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
