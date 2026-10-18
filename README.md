# Portfolio

Développer et mettre en ligne un site portfolio moderne pour présenter mon parcours, mes compétences et mes side projects afin d'accompagner mon CV.

## Prototype de l'intro 3D

À l'arrivée sur la page, une animation 3D (Three.js) raconte un trajet : une centrale solaire sur l'eau, le décor qui défile jusqu'à un pas de tir, le décollage de la fusée qui s'incline vers la caméra en montant, la Terre qui devient une planète, puis la coiffe qui s'ouvre en deux et le nom qui en sort en glissant vers la gauche, la planète en arrière-plan. À la fin, « Scroll pour découvrir » ouvre le reste de la page.

Tout le décor est posé sur une petite planète : le défilement, c'est la planète qui tourne sous la caméra.

- Scroller (molette, tactile, flèche bas, espace) pendant l'intro l'accélère au lieu de la couper.
- L'intro ne se joue qu'une fois par session, et pas du tout si le système demande de réduire les animations.
- `?t=7` démarre l'animation à 7 s, `?pause` la fige : pratique pour régler un plan.
- Un bouton « Relancer l'animation » reste en bas à droite en développement (`npm run dev`). Pour l'avoir dans un build : `VITE_DEV_TOOLS=1 npm run build`.

Les titres et le nom se changent dans `src/config.js`, le rythme aussi (repères `T`). Les cadrages caméra sont dans `CAMERA_KEYS` et la trajectoire dans `CLIMB_LENGTH` et `CLIMB_TURN` (`src/intro/intro.js`).

## Lancer le projet

```bash
npm install
npm run dev
```

`npm run build` produit le site statique dans `dist/`.
