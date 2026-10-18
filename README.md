# Portfolio

Développer et mettre en ligne un site portfolio moderne pour présenter mon parcours, mes compétences et mes side projects afin d'accompagner mon CV.

## Prototype de l'intro 3D

À l'arrivée sur la page, une animation 3D (Three.js) raconte un trajet : une centrale solaire sur l'eau, le décor qui défile jusqu'à un pas de tir, le décollage de la fusée, la Terre qui devient une planète, puis la coiffe qui s'ouvre et laisse sortir le nom. À la fin, « Scroll pour découvrir » ouvre le reste de la page.

Tout le décor est posé sur une petite planète : le défilement, c'est la planète qui tourne sous la caméra.

- Scroller (molette, tactile, flèche bas, espace) pendant l'intro l'accélère au lieu de la couper.
- L'intro ne se joue qu'une fois par session, et pas du tout si le système demande de réduire les animations.
- `?t=7` démarre l'animation à 7 s, `?pause` la fige : pratique pour régler un plan.

Les titres et le nom se changent dans `src/config.js`, le rythme aussi (repères `T`). Les cadrages caméra sont dans `CAMERA_KEYS` (`src/intro/intro.js`).

## Lancer le projet

```bash
npm install
npm run dev
```

`npm run build` produit le site statique dans `dist/`.
