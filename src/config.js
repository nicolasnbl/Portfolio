// Contenu et rythme de l'intro.
export const INTRO = {
  name: 'Nicolas',
  surname: 'Noblet',
  titles: [
    { text: 'Bienvenue', start: 0.4, end: 2.6 },
    { text: 'Découvrez mon parcours', start: 2.9, end: 5.0 },
    { text: 'Et bien plus encore', start: 6.0, end: 8.6 },
  ],
  scrollHint: 'Scroll pour découvrir',
  // Menu relié au satellite. soon : entrée visible mais pas encore active ; action : animation avant de changer de page.
  nav: [
    { label: 'Portfolio', href: '#vision' },
    { label: 'Side projects', action: 'projects' },
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
  // Largage des deux boosters, vers la fin de la montée.
  boosterSep: 7.9,
  boosterSepEnd: 9.5,
  fairingStart: 9.4,
  fairingEnd: 10.1,
  nameStart: 10.2,
  nameEnd: 11.2,
  navStart: 11.0,
  end: 12.2,
};

// Mode « Explorer le monde » : la planète au centre, que l'on fait tourner, et ses éléments à cliquer.
// page : true pour une page pas encore faite, ou l'adresse de la page. Sans page, l'élément n'a que sa fiche.
// project : page du side project ; un clic sur l'élément s'en approche puis ouvre directement cette page.
export const EXPLORE = {
  hint: 'Glisse pour faire tourner la planète, zoome, clique sur ce qui t’intrigue',
  // Affichée sur les étoiles, entre l'accueil et la page Explorer.
  quote: 'C’est en osant rêver l’impossible que l’esprit créatif repousse les frontières du possible.',
  back: 'Retour',
  pageLink: 'Voir la page',
  pageSoon: 'Page à venir',
  elements: {
    solar: {
      title: 'La centrale solaire flottante',
      text: 'Le solaire flottant, c’est mon fil rouge. Chez TotalEnergies OneTech, j’ai analysé les données de sites tests et du prototype de la startup SolarinBlue pour mieux comprendre comment des panneaux se comportent sur l’eau. Une page dédiée racontera ce projet.',
      page: true,
    },
    forest: {
      title: 'La forêt',
      text: 'Très sensible à la nature, je tiens à participer à la protection de l’environnement. C’est ce qui m’a mené vers les énergies renouvelables, et ce qui donne du sens à mon travail au quotidien.',
    },
    pad: {
      title: 'Le pas de tir',
      text: 'Tout a commencé ici. Plus jeune, je fabriquais mes propres fusées, et c’est pour elles que j’ai appris à coder et à modéliser en 3D.',
      project: './projet-fusees.html',
    },
    clock: {
      title: 'Le chronomètre',
      text: 'Mon parcours, étape par étape.',
      page: './timeline.html',
    },
    house: {
      title: 'La maison solaire',
      text: 'Mes premiers projets d’ingénieur, chez Solaire Corse : de la maison individuelle de 3 kWp au bâtiment de 250 kWp, de la simulation PVSyst jusqu’au plan AutoCAD.',
    },
    field: {
      title: 'Le champ photovoltaïque',
      text: 'Plus de 500 MWp de centrales au sol en Espagne. Chez TotalEnergies Iberica, je suis leur production chaque semaine, entre données SCADA, Databricks et Power BI, pour repérer ce qui sous-performe.',
    },
    computer: {
      title: 'L’ordinateur',
      text: 'J’ai appris à coder très jeune, en C, pour programmer les minuteries de mes fusées, puis pour tous les projets qui ont suivi. C’est là que je suis devenu autodidacte : j’ai aussi appris seul la modélisation 3D avec Fusion 360 et CATIA V5, indispensables pour concevoir mes fusées, et Blender pour le côté artistique, à imaginer des systèmes solaires et des planètes de toutes sortes. Aujourd’hui, Python, JavaScript et Databricks sont mes outils d’ingénieur au quotidien.',
      page: 'https://github.com/nicolasnbl',
      link: 'Voir mon GitHub',
    },
    guitar: {
      title: 'La guitare électrique',
      text: 'Je ne joue pas de guitare, mais j’ai toujours aimé fabriquer des choses. Alors je me suis lancé le défi d’en construire une : l’électronique commandée en ligne, le bois acheté en magasin de bricolage, et les tutos trouvés sur internet. Quelques erreurs en chemin, corrigées une à une, et aujourd’hui elle sonne parfaitement.',
      project: './projet-guitare.html',
    },
    speaker: {
      title: 'L’enceinte',
      text: 'Au lycée, avec un ami qui fabriquait des enceintes, on a créé Cibel : un site pour commander des enceintes sur mesure en bois de qualité. On y concevait son enceinte directement en ligne, avec une visualisation 3D du résultat dans un environnement interactif en Three.js, et une page d’animation 3D au scroll réalisée sous Blender. Six mois de développement, à une époque où l’IA ne codait pas encore à notre place. Le site était presque terminé, mais l’organisation et la logistique nous ont rattrapés : une leçon aussi précieuse que le code.',
      project: './side-projects.html#cibel',
    },
    eigsi: {
      title: 'L’EIGSI',
      text: 'Mon école d’ingénieurs à La Rochelle, majeure Énergie et Environnement. Cinq ans qui m’ont emmené jusqu’à Valence et vers un moteur d’ULM à l’hydrogène.',
    },
    heriot: {
      title: 'Heriot-Watt, Orkney',
      text: 'Un master en énergies renouvelables sur le campus des Orcades, au milieu des éoliennes et des courants marins. Obtenu avec mention (Merit).',
    },
    chess: {
      title: 'L’échiquier',
      text: 'Mon père m’a appris les échecs quand j’étais petit, mais je ne m’y suis vraiment mis qu’en école d’ingénieurs. Je me suis fixé un défi : atteindre 2000 Elo. J’y suis arrivé, et j’en suis fier. Pour moi, les échecs ne sont pas qu’un jeu, c’est un entraînement pour le cerveau : ils ont énormément développé ma capacité à rester concentré longtemps, un atout dans mes projets comme au travail.',
    },
    chip: {
      title: 'Le cerveau sur une puce',
      text: 'L’IA appliquée à l’énergie. Formé à la Hi! PARIS Summer School (École polytechnique et HEC) en 2025, j’ai pu construire des modèles de prédiction de haute précision sur le comportement d’une cellule photovoltaïque quand l’humidité et la ventilation augmentent son refroidissement.',
    },
    bike: {
      title: 'Le vélo de voyage',
      text: 'Avec mon meilleur ami, on s’est lancé un défi : rejoindre à vélo notre lieu de vacances en Bretagne. Six jours de Marly-le-Roi à Perros-Guirec, par la Normandie et la côte bretonne, en camping, la tente et les affaires sur les porte-bagages. La première étape a donné le ton : 200 km jusqu’à Deauville. Un peu traumatisant, mais des souvenirs et un dépassement de soi inoubliables.',
    },
    burj: {
      title: 'La Burj Khalifa',
      text: 'Plus jeune, des projets comme Masdar me faisaient rêver : je m’imaginais travailler un jour sur ce genre de ville du futur. Après mon master, je suis parti trois mois aux Émirats, où Heriot-Watt a un campus. J’y ai rencontré l’un des professeurs avec qui j’ai travaillé mon mémoire, et terminé les simulations MATLAB que je n’avais pas eu le temps d’inclure dans la version finale. J’en ai aussi profité pour aller à la rencontre de nombreux professionnels du secteur. Je n’y suis pas resté : le mode de vie ne me correspondait pas totalement, mais je garde une vraie admiration pour le potentiel d’innovation de la région.',
    },
    crane: {
      title: 'Le chantier d’Anjaza',
      text: 'Avec un ami qui vit aux Émirats, j’ai lancé Anjaza, une plateforme qui met en relation particuliers et professionnels de confiance pour les interventions du quotidien. J’en ai créé le site et l’application mobile, avec plus de 25 collaborateurs. Le chantier continue : le projet est toujours en développement.',
      project: './side-projects.html#anjaza',
    },
    forum: {
      title: 'Le forum des énergies',
      text: 'Aller à ADIPEC, à Abu Dhabi, et à d’autres forums de l’énergie, c’était une initiative personnelle : je voulais voir le secteur de l’intérieur. J’y ai rencontré beaucoup de professionnels qui m’ont expliqué leur métier tel qu’il est vraiment. Ces échanges m’ont énormément appris, et c’est en partie grâce à eux que je me suis lancé en confiance dans le monde de l’énergie.',
    },
    desal: {
      title: 'L’usine de désalinisation',
      text: 'L’accès à une eau potable produite proprement sera l’un des grands défis du monde de demain, et c’est un sujet qui me passionne. J’ai donc proposé moi-même ce thème de mémoire à Heriot-Watt, puis je l’ai affiné avec l’un de mes professeurs : produire de l’eau douce à partir d’eau de mer grâce au soleil. En modélisant l’usine sous MATLAB/Simulink et en estimant sa production sur une année, j’ai pu apporter des analyses complémentaires et contribuer, à mon échelle, à la recherche sur ce sujet.',
    },
    desertField: {
      title: 'Le champ photovoltaïque du désert',
      text: 'L’électricité solaire qui fait tourner le dessalement par osmose inverse, l’une des technologies comparées dans mon mémoire.',
    },
    troughs: {
      title: 'Les miroirs cylindro-paraboliques',
      text: 'L’autre voie : concentrer le soleil pour produire de la chaleur et distiller l’eau. Laquelle des deux est la meilleure ? C’est une question que je me posais bien avant de commencer mes recherches, et y répondre est devenu le cœur de mon mémoire.',
    },
    ulm: {
      title: 'L’ULM',
      text: 'Mon projet d’innovation à l’EIGSI, avec Air Hydro Atlantic : adapter un moteur d’ULM pour qu’il fonctionne à l’hydrogène. Conception des pièces d’intégration des injecteurs, calculs thermodynamiques de combustion : j’ai adoré travailler sur un projet aussi ambitieux.',
    },
  },
};

// Entrée et sortie du mode Explorer, en secondes.
export const EXPLORE_T = {
  depart: 1.9, // du clic au passage sur la page Explorer : le satellite se décroche, la caméra pivote vers les étoiles
  arrive: 3.3, // sur la page Explorer : de l'arrivée à la mise en orbite, la planète revient dans le champ
  hold: 0.7, // au début de l'arrivée, le temps de finir de lire la citation avant que tout reparte
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

// Timeline : étapes du parcours, de la plus récente à la plus ancienne. kind : 'experience' ou 'formation'.
// logo : image de l'entreprise ou de l'école, dans public/logos. highlights : 2-3 réalisations courtes (une ligne
// et demie au plus), avec en évidence un chiffre ou un mot-clé.
export const TIMELINE = {
  entries: [
    {
      kind: 'experience',
      logo: './logos/totalenergies.png',
      org: 'TotalEnergies Iberica',
      role: 'Analyste performance solaire PV (VIE)',
      place: 'Espagne',
      dates: 'juin 2026 – aujourd’hui',
      highlights: [
        { key: '500+ MWp', text: 'Reporting et KPI automatisés sur un portefeuille PV espagnol' },
        { key: 'Databricks', text: 'Pipelines Python, notebooks et tableaux de bord Power BI' },
        { key: 'SCADA', text: 'Détection automatique des sous-performances (Bazefield)' },
      ],
    },
    {
      kind: 'experience',
      logo: './logos/totalenergies.png',
      org: 'TotalEnergies OneTech',
      role: 'Ingénieur R&D solaire flottant',
      place: 'France',
      dates: 'mai 2025 – mai 2026',
      highlights: [
        { key: 'Publication', text: 'Analyse du PV flottant, dont le prototype SolarinBlue' },
        { key: 'ML', text: 'Prédiction de la performance et de la température des modules' },
        { key: 'VAN / TRI', text: 'Coauteur d’un guide technique et financier sur le revamping' },
      ],
    },
    {
      kind: 'experience',
      logo: './logos/solaire-corse.png',
      org: 'Solaire Corse',
      role: 'Ingénieur projets solaires',
      place: 'Corse',
      dates: 'fév. – mai 2025',
      highlights: [
        { key: '3 → 250 kWp', text: 'Conception d’installations sous PVSyst et AutoCAD' },
        { key: 'JavaScript', text: 'Outils internes pour accélérer le bureau d’études' },
      ],
    },
    {
      kind: 'formation',
      logo: './logos/heriot-watt.png',
      org: 'Heriot-Watt University',
      role: 'MSc Renewable and Sustainable Energy, with Merit',
      place: 'Orcades, Royaume-Uni',
      dates: '2023 – 2024',
      highlights: [
        { key: 'Mémoire', text: 'Dessalement solaire modélisé sous MATLAB/Simulink' },
      ],
    },
    {
      kind: 'formation',
      logo: './logos/eigsi.png',
      org: 'EIGSI',
      role: 'Diplôme d’ingénieur, majeure Énergie et Environnement',
      place: 'La Rochelle',
      dates: '2019 – 2024',
      highlights: [
        { key: 'Hydrogène', text: 'Moteur d’ULM adapté à l’hydrogène pour Air Hydro Atlantic' },
        { key: 'Valence', text: 'Semestre européen à l’Universitat Politècnica de València' },
      ],
    },
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
