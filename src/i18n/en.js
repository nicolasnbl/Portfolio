// Version anglaise du site.
// PAGE_EN : textes des pages HTML, par clé data-i18n (voir page.js). HTML autorisé : les liens et les compétences
// cliquables (<span class="mention" data-skill="…">) doivent être gardés tels quels.
// CONFIG_EN : textes de src/config.js (intro, Explorer, timeline), mêmes noms et même ordre que la version française.

const mention = (skill, text) => `<span class="mention" data-skill="${skill}">${text}</span>`;
const SKILLS = '<strong>Skills:</strong>';

export const PAGE_EN = {
  // Communs à plusieurs pages
  'common.devReplay': 'Replay the animation',
  'common.skillsLabel': 'Skills:',
  'common.lutherie': 'Guitar making',
  'common.electronics': 'Electronics',
  'common.backToProjects': '← Back to projects',

  // Accueil : à propos
  'home.navLabel': 'Main navigation',
  'home.about.title': 'About',
  'home.about.p1':
    'I studied engineering at EIGSI, then did a master’s in energy at Heriot-Watt in the UK, which gave me solid foundations to build my career on. Since then I’ve had three roles in solar PV, from R&amp;D on floating solar at TotalEnergies OneTech to the performance analysis of a portfolio of more than 500 MWp in Spain, where I’m now in my second year at TotalEnergies.',
  'home.about.p2':
    'What drives and inspires me day to day is creating, innovating and modernising the way things are done. With the AI revolution, I’m convinced the world we live in is going to change enormously and give us the tools to build much faster and go much further than before. Taking an active part in that change is what gives my work its meaning.',

  // Accueil : side projects
  'home.side.guitar': 'Guitar',
  'home.side.rockets': 'Rockets',
  'home.side.more': 'Explore my projects →',

  // Accueil : parcours
  'home.career.title': 'Career',
  'home.career.experience': 'Experience',
  'home.job1.role': 'Solar PV Performance Analyst',
  'home.job1.meta': `June 2026 – present · ${mention('espagnol', 'Spain')}`,
  'home.job1.li1': 'Automated the weekly reporting and performance KPIs of a ground-mounted PV portfolio of more than 500 MWp.',
  'home.job1.li2': `Data pipelines and ${mention('python', 'Python')} analysis notebooks on ${mention('databricks', 'Databricks')}, and ${mention('powerbi', 'Power BI')} dashboards on site production, availability and performance.`,
  'home.job1.li3': `Automated monitoring workflows built on SCADA alerts (${mention('bazefield', 'Bazefield')}) to catch anomalies and underperformance.`,
  'home.job2.role': 'Floating Solar R&amp;D Engineer',
  'home.job2.meta': 'May 2025 – May 2026 · France',
  'home.job2.li1': `Developed and compared floating PV performance analysis methods in ${mention('python', 'Python')} on large datasets from test sites, including the SolarinBlue startup’s prototype, for a scientific publication.`,
  'home.job2.li2': 'Co-authored a technical and financial guide to revamping PV plants: economic KPIs (NPV, IRR) and impact on OPEX.',
  'home.job2.li3': 'Machine learning models to estimate module performance and cell temperature from environmental data.',
  'home.job2.skills': `${SKILLS} ${mention('python', 'Python')} · Machine learning · Financial analysis`,
  'home.job3.role': 'Solar Project Engineer',
  'home.job3.meta': 'Feb – May 2025 · Corsica',
  'home.job3.li1': `Designed PV systems from 3 to 250 kWp: ${mention('pvsyst', 'PVSyst')} yield simulations, ${mention('autocad', 'AutoCAD')} drawings, equipment selection (modules, inverters, mounting structures) and AC/DC cable sizing.`,
  'home.job3.li2': `Built internal tools in ${mention('javascript', 'JavaScript')} to speed up the design office.`,
  'home.internships.open': 'Show internships',
  'home.internships.close': 'Hide internships',
  'home.job4.role': 'Solar Street Lighting Project Engineer',
  'home.job4.org': 'Fonroche Éclairage · Internship',
  'home.job4.meta': 'May – Sept 2023 · Agen, France',
  'home.job4.li1': 'Solar irradiance studies of sites before installing PV panels, in a team of engineers specialised in solar.',
  'home.job4.li2': 'Improved Fonroche Lighting’s irradiance calculation tool.',
  'home.job4.li3': 'Worked with the sales team.',
  'home.job4.skills': `${SKILLS} Dialux Evo · Project management · Teamwork`,
  'home.job5.role': 'Pyrotechnics Design Office Technician',
  'home.job5.org': 'Pyroalliance (ArianeGroup) · Internship',
  'home.job5.meta': 'May – Sept 2022 · Les Mureaux, France',
  'home.job5.li1': `Programmed a pyrotechnic modelling tool in ${mention('c', 'C')}, alongside a team of design engineers.`,
  'home.job5.li2': 'Solid propellant combustion calculations.',
  'home.job5.skills': `${SKILLS} ${mention('c', 'C')} · Energy calculations`,
  'home.career.education': 'Education',
  'home.hw.meta': `2023 – 2024 · Orkney, ${mention('anglais', 'United Kingdom')}`,
  'home.hw.li1': `Dissertation: compared solar desalination technologies, modelled the plant in ${mention('matlab', 'MATLAB/Simulink')} and estimated its water output over a year.`,
  'home.eigsi.title': 'Engineering degree, major in Energy and Environment',
  'home.eigsi.li1': 'Innovation project with Air Hydro Atlantic: converting an ultralight aircraft engine to run on hydrogen.',
  'home.eigsi.li2': 'European design semester at the Universitat Politècnica de València (2022).',
  'home.career.timeline': 'See the timeline →',

  // Accueil : compétences
  'home.stack.title': 'Skills',
  'home.stack.code': 'Programming',
  'home.stack.data': 'Data platform',
  'home.stack.dataNote': 'Pipelines and notebooks',
  'home.stack.bi': 'Analysis and reporting',
  'home.stack.biNote': 'Dashboards',
  'home.stack.excelNote': 'VBA macros',
  'home.stack.other': 'Other tools',
  'home.stack.langs':
    '<strong>Languages</strong> French (native) · <span data-skill="anglais">English (C1)</span> · <span data-skill="espagnol">Spanish (professional)</span>',
  'home.stack.hint': 'Click a skill to see where I’ve used it.',

  // Accueil : publications
  'home.pub1.meta': 'Master’s thesis · Heriot-Watt University · 2024',
  'home.pub1.text':
    'A worldwide review of seawater desalination, then a calculation of the best renewable desalination technologies for two sites in France. The conclusion: in France, one square metre of solar panels can power a reverse osmosis unit producing between 34,000 and 49,000 kg of fresh water a year, depending on the site.',
  'home.pub1.link': 'Read the thesis (PDF) →',
  'home.pub1.noAi': 'No AI',
  'home.pub1.noAiTitle': 'Written without artificial intelligence',
  'home.pub2.meta': 'Internal publication · TotalEnergies OneTech · 2025–2026',
  'home.pub2.title': 'Floating PV performance analysis: a benchmark of methods',
  'home.pub2.text':
    'A review of more than 180 scientific references, then existing methods and machine learning models put into practice and tested on 4 test sites, including the SolarInBlue startup’s prototype.',
  'home.pub2.note': 'Confidential document, not published',

  // Accueil : formations
  'home.training.title': 'Training',
  'home.training.hiparis': 'Hi! PARIS Summer School, École polytechnique and HEC · 2025',
  'home.training.pvsyst': `${mention('pvsyst', 'PVSyst')} and grid-connected PV`,
  'home.training.ines': 'INES, the French National Solar Energy Institute',

  // Accueil : contact
  'home.contact.pitch': 'Questions, or a project ready for lift-off? Get in touch.',
  'home.contact.mailLabel': 'Copy email address',
  'home.contact.mailTitle': 'Copy noblet.nicolas07@gmail.com',
  'home.contact.cvAlt': 'Preview of Nicolas Noblet’s CV',
  'home.contact.cv': 'View my CV (PDF) →',
  'home.replay': 'Replay the intro',

  // Page side projects
  'side.intro':
    'My mindset: an engineer by training, I love the technical side of things, and being proactive has always pushed me to take on personal projects. That drive to get things done is what naturally led me to renewable energy, a field that’s exciting for the scale of what’s at stake as much as for its day-to-day challenges.',
  'side.anjaza.text':
    'With a friend who lives in the UAE, I launched a platform that connects people with trusted professionals for everyday jobs. I built the website and the mobile app. More than 25 pros already trust us.',
  'side.anjaza.k1': 'Website + mobile app',
  'side.anjaza.k2': '25+ collaborators',
  'side.anjaza.k3': 'United Arab Emirates',
  'side.anjaza.link': 'See Anjaza →',
  'side.anjaza.helper': 'With Léonard',
  'side.anjaza.helperAlt': 'Léonard on LinkedIn',
  'side.cibel.text':
    'With a friend who built speakers: a website to order custom speakers made of quality wood, with an interactive 3D configurator and a scroll animation. Almost finished, then stopped by organisation and logistics: a lesson as valuable as the code.',
  'side.cibel.k3': 'Before AI',
  'side.cibel.link': 'See Cibel →',
  'side.cibel.helper': 'With Gautier',
  'side.cibel.helperAlt': 'Gautier on LinkedIn',
  'side.projects': 'Projects',
  'side.guitar.title': 'The electric guitar',
  'side.guitar.text':
    'I don’t play guitar, but I love making things, so I set myself the challenge of building one: electronics ordered online, wood from the DIY store and a few tutorials. A few mistakes fixed one by one, and today it sounds just right.',
  'side.more': 'Read more →',
  'side.rockets.title': 'My rockets',
  'side.rockets.text':
    'When I was younger, I built my own rockets. They’re the reason I learned to code, in C, to program their timers, and to model in 3D to design them.',
  'side.back': '← Back to the portfolio',

  // Page fusées
  'rockets.pageTitle': 'Nicolas · My rockets',
  'rockets.title': 'My rockets',
  'rockets.p1':
    'I built these rockets over the school year, to launch them in the summer in Tarbes with Planète Sciences. The motors were supplied by CNES, the French space agency, and our goal was a nominal flight with a creative touch of our own. They climbed to 400 m and took an acceleration of 90 m/s² at liftoff.',
  'rockets.p2':
    'I built three of them, the first when I was 12. It had the classic objective: deploy the parachute through a hatch on the side, triggered by a timer. My teacher had us make the circuit boards ourselves, components and all, to build the timer the analogue way. Arduinos weren’t that common yet.',
  'rockets.p3':
    'The next year, the idea was fairly similar. But with 3D printing and Arduino taking off, I learned 3D modelling and coding to build my rocket.',
  'rockets.img1': 'My first two rockets on a desk, one red and white, the other grey, with an orange parachute.',
  'rockets.cap1': 'My first two rockets.',
  'rockets.p4':
    'For the last one, at 15, I teamed up with my friend Gautier. We wanted to do what SpaceX does: a rocket that lands on its legs. So we built landing legs, and I worked on deploying the parachute through the nose cone, with a system I designed myself.',
  'rockets.cap2': 'Presenting the rocket: the legs unfold, then the parachute comes out of the nose cone.',
  'rockets.img3': 'The grey rocket and its white nose cone, standing, legs folded.',
  'rockets.cap3': 'Ready for the first launch day.',
  'rockets.img4': 'The rocket standing on its legs, the parachute out of the nose cone.',
  'rockets.cap4': 'Standing on its legs, parachute out.',
  'rockets.img5': 'The grey rocket under construction on my desk, one leg lying along the body.',
  'rockets.cap5': 'Under construction, at home.',
  'rockets.img6': 'The rocket open on a table, with the electronics visible and the legs folded along the body.',
  'rockets.cap6': 'The electronics and the folded legs.',
  'rockets.img7': 'The rocket’s four legs deployed on the ground.',
  'rockets.cap7': 'The legs deployed.',
  'rockets.p5':
    'The first two flights were a success. Unfortunately, the last rocket flew a ballistic trajectory, because I got the parachute’s volume inside the rocket wrong. It had trouble coming out, never opened properly, and the rocket crashed.',
  'rockets.p6':
    'I was incredibly lucky to be at the only middle school in France that ran this rocket club, as most of the teams came from engineering schools. It gave me a taste for engineering, and for good, the habit of teaching myself. It’s also through this club that I got hooked on personal projects, and that has never left me.',
  'rockets.k3': '3D printing',

  // Page guitare
  'guitar.pageTitle': 'Nicolas · The electric guitar',
  'guitar.title': 'The electric guitar',
  'guitar.p1':
    'I set out to build an electric guitar. I bought the wood at Castorama, a DIY store, and the parts online. I printed a template, then cut the wood to the shape of the guitar.',
  'guitar.p2':
    'There were a lot of steps, and standards to follow, like the thickness of the body. That forced me to glue two layers of wood together to reach 4.5 cm, a thickness you can’t find in stores. I worked at a friend’s place who had loads of tools, a kind of workshop: I went there every weekend for several months.',
  'guitar.img1': 'The two layers of the body glued together, held by a dozen clamps.',
  'guitar.cap1': 'Gluing the two layers of wood.',
  'guitar.img2': 'The cut-out body on the workbench, next to the template and the router.',
  'guitar.cap2': 'The body cut to shape, with its template.',
  'guitar.img3': 'The back of the body, with the electronics cavity routed out.',
  'guitar.cap3': 'The electronics cavity, routed out.',
  'guitar.p3':
    'The neck is made from a darker exotic wood, to contrast with the rest of the body. Inside, I fitted a truss rod by routing a channel in the neck: this metal rod lets you adjust the neck’s curve, and so bring the strings closer to the fretboard.',
  'guitar.img4': 'The oak neck on the workbench, with the blue truss rod in its channel.',
  'guitar.cap4': 'The truss rod, set into the neck.',
  'guitar.img5': 'The dark wood fretboard guided under the router to cut the fret slots.',
  'guitar.cap5': 'Cutting the fret slots with the router.',
  'guitar.img6': 'The slotted fretboard on the workbench, next to a curved sanding block.',
  'guitar.cap6': 'Sanding the fretboard.',
  'guitar.img7': 'The dark fretboard with its frets and pearl inlays in place.',
  'guitar.cap7': 'Frets and inlays in place.',
  'guitar.p4':
    'In my enthusiasm, I didn’t pay enough attention to the physics behind the sound. What matters most for an electric guitar to play in tune is the distance between the frets and the bridge, so the string vibrates at the right harmonic. I was off by a few centimetres, which would have made the guitar unusable, and I only noticed after attaching the neck to the body. So I had to take the neck off and refit it at exactly the right distance to make it work: my goal was to learn to play it afterwards.',
  'guitar.img8': 'The raw neck and body assembled on the workbench, next to a drill press.',
  'guitar.cap8': 'The neck attached to the body, before I had to move it.',
  'guitar.img9': 'The back of the body, with the electronics wired into the cavity for a first test.',
  'guitar.cap9': 'Wiring the electronics for the first time.',
  'guitar.p5': 'In the end, after several months of work, the guitar was finally finished, and I got to play it through an amp.',
  'guitar.img10': 'The back of the finished guitar, oiled wood, with the electronics cavity open.',
  'guitar.cap10': 'Oiled wood and electronics.',
  'guitar.img11': 'The control knobs, the pickup selector and the jack socket on the oak body.',
  'guitar.cap11': 'The controls and the jack socket.',
  'guitar.img12': 'Me standing in the hallway, holding the finished guitar.',
  'guitar.cap12': 'Finished, and ready to play.',
  'guitar.p6':
    'It was a great experience. I loved working with wood: building a beautiful object is really satisfying, and I learned a huge amount.',

  // Page timeline
  'timeline.pageTitle': 'Nicolas · Career',
  'timeline.home': '← Home',
  'timeline.title': 'Career',
  'timeline.navLabel': 'Career steps',
  'timeline.prev': 'Previous step',
  'timeline.next': 'Next step',
  'timeline.hint': 'Scroll to move through time',

  // Page Explorer
  'explore.pageTitle': 'Nicolas · Explore the world',
  'explore.quote': 'It’s by daring to dream the impossible that the creative mind pushes back the limits of the possible.',
};

export const CONFIG_EN = {
  INTRO: {
    titles: [{ text: 'Welcome' }, { text: 'Discover my journey' }, { text: 'And much more' }],
    scrollHint: 'Scroll to explore',
    nav: [{ label: 'Portfolio' }, { label: 'Side projects' }, { label: 'Timeline' }, { label: 'Explore the world' }],
  },
  EXPLORE: {
    hint: 'Drag to spin the planet, zoom in, click whatever catches your eye',
    quote: PAGE_EN['explore.quote'],
    back: 'Back',
    pageLink: 'See the page',
    pageSoon: 'Page coming soon',
    projectLink: 'More details →',
    elements: {
      solar: {
        title: 'The floating solar plant',
        text: 'Floating solar is the common thread of my work. At TotalEnergies OneTech, I analysed data from test sites and from the SolarinBlue startup’s prototype to better understand how panels behave on water.',
      },
      forest: {
        title: 'The forest',
        text: 'Nature matters a lot to me, and I want to do my part to protect the environment. That’s what led me to renewable energy, and it’s what gives meaning to my work every day.',
      },
      pad: {
        title: 'The launch pad',
        text: 'This is where it all started. When I was younger, I built my own rockets, and they’re the reason I learned to code and to model in 3D.',
      },
      clock: {
        title: 'The stopwatch',
        text: 'My career, step by step.',
      },
      house: {
        title: 'The solar house',
        text: 'My first projects as an engineer, at Solaire Corse: from a 3 kWp family home to a 250 kWp building, from the PVSyst simulation to the AutoCAD drawing.',
      },
      field: {
        title: 'The solar farm',
        text: 'More than 500 MWp of ground-mounted plants in Spain. At TotalEnergies Iberica, I track their output every week, between SCADA data, Databricks and Power BI, to spot what’s underperforming.',
      },
      computer: {
        title: 'The computer',
        text: 'I learned to code very young, in C, to program my rockets’ timers, and then for every project that followed. That’s when I became self-taught: I also taught myself 3D modelling with Fusion 360 and CATIA V5, which I needed to design my rockets, and Blender for the artistic side, dreaming up solar systems and all kinds of planets. Today, Python, JavaScript and Databricks are my everyday engineering tools.',
        link: 'See my GitHub',
      },
      guitar: {
        title: 'The electric guitar',
        text: 'I don’t play guitar, but I’ve always loved making things. So I set myself the challenge of building one: electronics ordered online, wood from the DIY store, and tutorials found on the internet. A few mistakes along the way, fixed one by one, and today it sounds just right.',
      },
      speaker: {
        title: 'The speaker',
        text: 'In high school, with a friend who built speakers, we created Cibel: a website to order custom speakers made of quality wood. You designed your speaker right on the site, with a 3D preview of the result in an interactive Three.js scene, and a scroll-driven 3D animation page made in Blender. Six months of development, back when AI didn’t write the code for us. The site was almost finished, but organisation and logistics caught up with us: a lesson as valuable as the code.',
      },
      eigsi: {
        title: 'EIGSI',
        text: 'My engineering school in La Rochelle, majoring in Energy and Environment. Five years that took me all the way to Valencia and to a hydrogen-powered ultralight engine.',
      },
      heriot: {
        title: 'Heriot-Watt, Orkney',
        text: 'A master’s in renewable energy on the Orkney campus, surrounded by wind turbines and tidal currents. Completed with Merit.',
      },
      chess: {
        title: 'The chessboard',
        text: 'My father taught me chess when I was little, but I only really got into it at engineering school. I set myself a challenge: reach 2000 Elo. I got there, and I’m proud of it. For me, chess isn’t just a game, it’s training for the brain: it has greatly improved my ability to stay focused for a long time, which helps in my projects as much as at work.',
      },
      chip: {
        title: 'The brain on a chip',
        text: 'AI applied to energy. After training at the Hi! PARIS Summer School (École polytechnique and HEC) in 2025, I built high-accuracy models predicting how a solar cell behaves when humidity and airflow increase its cooling.',
      },
      bike: {
        title: 'The touring bike',
        text: 'My best friend and I set ourselves a challenge: cycle to our holiday spot in Brittany. Six days from Marly-le-Roi to Perros-Guirec, through Normandy and along the Breton coast, camping, with the tent and our gear on the racks. The first stage set the tone: 200 km to Deauville. A little traumatic, but unforgettable memories and a real test of what we could do.',
      },
      burj: {
        title: 'The Burj Khalifa',
        text: 'When I was younger, projects like Masdar made me dream: I pictured myself working on that kind of city of the future one day. After my master’s, I spent three months in the UAE, where Heriot-Watt has a campus. I met one of the professors I’d worked with on my dissertation there, and finished the MATLAB simulations I hadn’t had time to include in the final version. I also took the chance to meet many professionals in the sector. I didn’t stay: the lifestyle wasn’t quite for me, but I still have real admiration for the region’s potential for innovation.',
      },
      crane: {
        title: 'The Anjaza building site',
        text: 'With a friend who lives in the UAE, I launched Anjaza, a platform that connects people with trusted professionals for everyday jobs. I built its website and mobile app, with more than 25 collaborators. Work is still in progress: the project is still being developed.',
      },
      forum: {
        title: 'The energy forum',
        text: 'Going to ADIPEC in Abu Dhabi, and to other energy forums, was my own initiative: I wanted to see the industry from the inside. I met a lot of professionals who explained what their jobs are really like. Those conversations taught me a huge amount, and they’re part of why I stepped into the energy world with confidence.',
      },
      desal: {
        title: 'The desalination plant',
        text: 'Access to cleanly produced drinking water will be one of the big challenges of tomorrow’s world, and it’s a subject I’m passionate about. So I proposed this dissertation topic myself at Heriot-Watt, then refined it with one of my professors: producing fresh water from seawater using the sun. By modelling the plant in MATLAB/Simulink and estimating its output over a year, I was able to add new analysis and contribute, in my own way, to research on the subject.',
      },
      desertField: {
        title: 'The desert solar farm',
        text: 'Solar electricity to run reverse osmosis desalination, one of the technologies compared in my dissertation.',
      },
      troughs: {
        title: 'The parabolic troughs',
        text: 'The other route: concentrate sunlight to produce heat and distil the water. Which of the two is better? I was asking myself that long before I started my research, and answering it became the heart of my dissertation.',
      },
      ulm: {
        title: 'The ultralight',
        text: 'My innovation project at EIGSI, with Air Hydro Atlantic: adapting an ultralight aircraft engine to run on hydrogen. Designing the parts to fit the injectors, thermodynamic combustion calculations: I loved working on such an ambitious project.',
      },
    },
  },
  TIMELINE: {
    entries: [
      {
        role: 'Solar PV Performance Analyst (VIE)',
        place: 'Spain',
        dates: 'June 2026 – present',
        highlights: [
          { text: 'Automated reporting and KPIs for a Spanish PV portfolio' },
          { text: 'Python pipelines, notebooks and Power BI dashboards' },
          { text: 'Automatic detection of underperformance (Bazefield)' },
        ],
      },
      {
        role: 'Floating Solar R&D Engineer',
        place: 'France',
        dates: 'May 2025 – May 2026',
        highlights: [
          { text: 'Floating PV analysis, including the SolarinBlue prototype' },
          { text: 'Predicting module performance and temperature' },
          { key: 'NPV / IRR', text: 'Co-authored a technical and financial guide to revamping' },
        ],
      },
      {
        role: 'Solar Project Engineer',
        place: 'Corsica',
        dates: 'Feb – May 2025',
        highlights: [
          { text: 'PV system design in PVSyst and AutoCAD' },
          { text: 'Internal tools to speed up the design office' },
        ],
      },
      {
        place: 'Orkney, United Kingdom',
        highlights: [{ key: 'Dissertation', text: 'Solar desalination modelled in MATLAB/Simulink' }],
      },
      {
        role: 'Engineering degree, major in Energy and Environment',
        place: 'La Rochelle, France',
        highlights: [
          { key: 'Hydrogen', text: 'Ultralight engine converted to hydrogen for Air Hydro Atlantic' },
          { key: 'Valencia', text: 'European semester at the Universitat Politècnica de València' },
        ],
      },
    ],
  },
};
