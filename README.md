# Portfolio

Développer et mettre en ligne un site portfolio moderne pour présenter mon parcours, mes compétences et mes side projects afin d'accompagner mon CV.

## Prototype de l'intro 3D

À l'arrivée sur la page, une animation 3D (Three.js) raconte un trajet : une centrale solaire sur l'eau, le décor qui défile jusqu'à un pas de tir, le décollage de la fusée qui s'incline vers la caméra en montant, la Terre qui devient une planète, puis la coiffe qui s'ouvre en deux et le nom qui en sort en glissant vers la gauche, la planète en arrière-plan. À la fin, « Scroll pour découvrir » ouvre le reste de la page.

Tout le décor est posé sur une petite planète : le défilement, c'est la planète qui tourne sous la caméra.

- Scroller (molette, tactile, flèche bas, espace) pendant l'intro l'accélère au lieu de la couper.
- L'intro ne se joue qu'une fois par session, et pas du tout si le système demande de réduire les animations.
- `?t=7` démarre l'animation à 7 s, `?pause` la fige : pratique pour régler un plan.
- Un bouton « Relancer l'animation » reste en bas à droite en développement (`npm run dev`). Pour l'avoir dans un build : `VITE_DEV_TOOLS=1 npm run build`.

### Menu du satellite

Une fois le nom sorti, le satellite déploie un menu de quatre entrées reliées à lui par des lignes (`INTRO.nav` dans `src/config.js`, `src/intro/nav.js`). Portfolio et Side projects font défiler la page jusqu'à leur section.

Timeline lance une transition (`src/intro/leave.js`, rythme dans `LEAVE`) : le satellite quitte la fusée et se met en orbite, la planète tourne sous lui jusqu'à un continent qui porte le chronomètre de la timeline, puis la caméra plonge sur le cadran et la planète s'efface. Le dernier plan est le premier de `timeline.html`, qui s'ouvre alors (`?t=0`) sans coupure visible. Le chronomètre n'est construit qu'après l'intro, quand le navigateur est libre. `?leave=2&pause` montre la transition figée à 2 s du clic.

Explorer le monde ouvre une page à part (`explore.html`, `src/explore/`). Sur l'accueil, le satellite se décroche de la fusée et la caméra le suit en pivotant autour de lui jusqu'à ne plus voir que les étoiles ; la page Explorer reprend exactement ce plan (transmis par `sessionStorage`), Une citation (`EXPLORE.quote`) s'affiche sur les étoiles pendant ce passage, puis le satellite et la caméra montent en orbite et la planète, plus petite, revient dans le champ. Le satellite reste ensuite à droite de l'écran, à distance fixe (`src/explore/companion.js`). On fait tourner la planète en la glissant et on zoome à la molette ou en pinçant, vers le point visé ; au survol, un élément s'éclaire et affiche son nom ; un clic l'amène devant la caméra avec sa fiche (centrale solaire, forêt, pas de tir, chronomètre, maison solaire, champ photovoltaïque). Une fiche peut mener à une page (`page` : un lien, ou `true` pour « Page à venir »). Retour ou Échap rejoue le chemin inverse jusqu'au satellite dans la coiffe. Textes et rythme dans `EXPLORE` et `EXPLORE_T`. `?depart=1&pause` fige le départ à 1 s du clic, `explore.html?u=1&pause` l'arrivée.

Les titres et le nom se changent dans `src/config.js`, le rythme aussi (repères `T`). Les cadrages caméra sont dans `CAMERA_KEYS` et la trajectoire dans `CLIMB_LENGTH` et `CLIMB_TURN` (`src/intro/intro.js`).

## Prototype de la timeline

Une page à part (`timeline.html`), en formes simples et sans contenu réel pour juger du rendu. On arrive face à un chronomètre ; la caméra zoome jusqu'au cadran, bascule au ras du sol et suit la trotteuse qui accélère, les chiffres du cadran défilant en dessous. Elle s'arrête face à la trotteuse, épaisse, dont la face porte la carte de l'étape (logo, intitulé, rôle, dates, réalisations chiffrées).

Ensuite, chaque passage d'une étape à la suivante (scroll, flèches, swipe ou boutons en bas) fait avancer la trotteuse d'une heure : la caméra reste attachée à elle, c'est le cadran qui tourne. Un arc orange sur le bord et un repère par étape montrent la progression.

Les étapes (pour l'instant juste leur type, expérience ou formation), l'écart entre deux étapes et le rythme sont dans `src/config.js` (`TIMELINE`, `TL`). Les cadrages caméra sont dans `CAMERA_KEYS` et `finalKey` (`src/timeline/timeline.js`), la carte provisoire dans `src/timeline/card.js`. `?t=` et `?pause` marchent comme pour l'intro.

## Lancer le projet

```bash
npm install
npm run dev
```

`npm run build` produit le site statique dans `dist/`.
