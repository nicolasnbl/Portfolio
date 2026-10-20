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
  end: 11.6,
};

// Timeline : étapes provisoires, sans contenu, de la plus récente à la plus ancienne. kind : 'experience' ou 'formation'.
export const TIMELINE = {
  entries: [
    { kind: 'experience' },
    { kind: 'experience' },
    { kind: 'experience' },
    { kind: 'formation' },
    { kind: 'formation' },
  ],
  stepAngle: 30, // écart entre deux étapes sur le cadran, en degrés (30 = une heure)
  direction: -1, // sens de rotation : -1 antihoraire (on remonte le temps), 1 horaire
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
