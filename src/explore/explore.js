import * as THREE from 'three';
import { EXPLORE, EXPLORE_T } from '../config.js';
import { easeInOutCubic, lerp } from '../intro/math.js';
import { COMPANION_FOV } from './companion.js';
import { pick as tr } from '../i18n/lang.js';

// Mode « Explorer le monde » : la planète au milieu de l'écran, que l'on fait tourner en la glissant. Survoler un
// élément l'éclaire et affiche son nom ; cliquer dessus le fait venir devant la caméra, avec sa fiche à côté.
// La caméra reste sur un axe fixe (frameDir) ; c'est la planète qui tourne. Le satellite, à droite, voyage avec la
// caméra (companion.js).

const FOV = COMPANION_FOV;
const TAN = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
// Vue d'ensemble : part de la demi-hauteur de l'écran occupée par la planète (écran large), ou de la demi-largeur
// (écran vertical), et place de son centre à l'écran, en coordonnées normalisées. Elle laisse la droite au satellite.
const FIT_LANDSCAPE = { size: 0.74, x: -0.16, y: -0.04 };
const FIT_PORTRAIT = { size: 0.9, x: 0, y: -0.1 };
// Élément ciblé : sa place à l'écran, à gauche de la fiche (écran large) ou au-dessus d'elle (écran vertical).
const FOCUS_LANDSCAPE = { x: -0.3, y: -0.05 };
const FOCUS_PORTRAIT = { x: 0, y: 0.18 };
// L'élément ciblé monte un peu au-dessus du centre de l'image, d'autant plus que la caméra est loin : on le voit
// toujours de biais, à 40° environ de la verticale, avec l'horizon derrière lui.
const FOCUS_TILT = 0.02; // radians par unité de distance
const DRAG_SPEED = 0.005; // radians par pixel, en vue d'ensemble ; plus lent quand on a zoomé
// Zoom (molette ou pincement) : de la vue d'ensemble (0) jusqu'à cette altitude au-dessus du sol (1).
const ZOOM_CLOSEST = 16;
const ZOOM_TILT = FOCUS_TILT * ZOOM_CLOSEST; // radians, une fois zoomé au plus près
const WHEEL_SPEED = 0.0012; // par pixel de défilement
const PINCH_SPEED = 0.004; // par pixel d'écart entre les deux doigts
const IDLE_SPIN = 0.06; // rotation lente quand on ne touche à rien, en radians par seconde

// Distance de la caméra au sol quand on cible un élément, selon sa taille.
const FOCUS_DIST = {
  solar: 7, forest: 11, pad: 8, clock: 9, house: 6, field: 9, computer: 5.5, guitar: 5.5, speaker: 5.5, eigsi: 8, heriot: 8,
  chess: 5, chip: 5.5, bike: 8, burj: 11, forum: 8, desal: 8, desertField: 7, troughs: 8, ulm: 11, crane: 8,
};
// Un clic sur le sol tout près d'un élément le vise aussi : rayon autour de son ancrage.
const HIT_RADIUS = {
  solar: 2, forest: 5, pad: 1.8, clock: 1.8, house: 1.4, field: 3, computer: 1.2, guitar: 1.1, speaker: 1.1, eigsi: 2.2, heriot: 2.2,
  chess: 1, chip: 1.2, bike: 2.4, burj: 1.4, forum: 2.4, desal: 2.4, desertField: 2, troughs: 2.4, ulm: 2.6, crane: 1.8,
};
const HIT_PIXELS = 28;

// radius : rayon du globe exploré.
export function createExplore({ planet, globe, radius, elements, camera, canvas, ui, frameDir }) {
  const ATMOSPHERE = radius * 1.08;
  const FRAME_DIR = frameDir.clone().normalize();
  const FRAME_UP = new THREE.Vector3(0, 1, 0).addScaledVector(FRAME_DIR, -FRAME_DIR.y).normalize();
  const FRAME_RIGHT = new THREE.Vector3().crossVectors(FRAME_UP, FRAME_DIR).normalize();
  // Les nuages filent à contre-sens de la rotation lente du globe (relatif à la planète : ils la compensent puis vont
  // au-delà dans l'autre sens).
  const clouds = planet.getObjectByName('nuages');
  if (clouds) clouds.userData.spin = { axis: FRAME_UP, rate: -(IDLE_SPIN + 0.035) };
  const user = new THREE.Quaternion(); // rotation donnée à la planète, en plus de son orientation de départ
  const q = new THREE.Quaternion();
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const d = new THREE.Vector3();
  const cross = new THREE.Vector3();
  const spotDir = new THREE.Vector3();
  // De près, la caméra regarde un point du sol un peu en avant de celui qu'elle survole : on voit le sol de biais,
  // comme quand on cible un élément, et non plus à la verticale.
  const zoomSpot = (amount, out) =>
    out.copy(FRAME_DIR).multiplyScalar(Math.cos(ZOOM_TILT * amount)).addScaledVector(FRAME_UP, Math.sin(ZOOM_TILT * amount));
  const c2 = new THREE.Quaternion();
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let active = false;
  let velocity = { x: 0, y: 0 };
  let drag = null;
  let hovered = null;
  let pointerMoved = false;
  let lastMove = 0;
  let lastKey = null; // dernier élément ciblé, pour que la caméra recule depuis lui
  let zoom = 0;
  let zoomTarget = 0;
  const pointers = new Map(); // doigts posés, pour le pincement
  let pinch = 0; // écart entre les deux doigts au dernier mouvement

  // Approche d'un élément : rotation de la planète de `from` à `to`, et focus de 0 (vue d'ensemble) à 1.
  let focused = null;
  let focus = 0;
  let focusTarget = 0;
  const focusFrom = new THREE.Quaternion();
  const focusTo = new THREE.Quaternion();
  let focusTurn = 1;

  // Interface : bouton retour, consigne, nom de l'élément survolé, fiche de l'élément ciblé.
  ui.innerHTML = `
    <button class="explore-back" type="button"></button>
    <p class="explore-hint"></p>
    <p class="explore-label" aria-hidden="true"></p>
    <aside class="explore-card" aria-live="polite">
      <button class="explore-close" type="button" aria-label="${tr('Fermer la fiche', 'Close')}">×</button>
      <h2></h2>
      <p class="explore-text"></p>
      <a class="explore-page"></a>
    </aside>`;
  const backEl = ui.querySelector('.explore-back');
  const hintEl = ui.querySelector('.explore-hint');
  const labelEl = ui.querySelector('.explore-label');
  const cardEl = ui.querySelector('.explore-card');
  const pageEl = ui.querySelector('.explore-page');
  backEl.textContent = `← ${EXPLORE.back}`;
  hintEl.textContent = EXPLORE.hint;
  ui.querySelector('.explore-close').addEventListener('click', () => unfocus());
  let onBack = () => {};
  backEl.addEventListener('click', () => onBack());

  for (const el of elements) el.content = EXPLORE.elements[el.key];
  const roots = elements.map((el) => el.root);

  // Distance de la caméra au sol pour un élément : plus grande sur écran étroit, où l'angle de vue horizontal est réduit.
  const focusDist = (key) => (FOCUS_DIST[key] ?? 10) / Math.max(0.55, Math.min(1, camera.aspect));

  // Position d'un élément dans la scène.
  const worldOf = (el, out) => out.copy(el.anchor).applyMatrix4(planet.matrixWorld);

  // Éclairage d'un élément survolé ou ciblé : une teinte dorée qui pulse sur ses matériaux.
  function glow(el, amount) {
    el.root.traverse((o) => {
      const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
      for (const m of mats) {
        if (!m.emissive) continue;
        if (!m.userData.baseEmissive) {
          m.userData.baseEmissive = m.emissive.clone();
          m.userData.baseIntensity = m.emissiveIntensity;
        }
        if (amount > 0) {
          m.emissive.set('#ffb347');
          m.emissiveIntensity = amount;
        } else {
          m.emissive.copy(m.userData.baseEmissive);
          m.emissiveIntensity = m.userData.baseIntensity;
        }
      }
    });
  }

  // Écart à l'écran, en pixels, entre un point de la scène et le pointeur.
  function screenOf(world, out, clientX, clientY) {
    out.copy(world).project(camera);
    return [(out.x * 0.5 + 0.5) * window.innerWidth - clientX, (-out.y * 0.5 + 0.5) * window.innerHeight - clientY];
  }

  function pick(clientX, clientY) {
    pointer.set((clientX / window.innerWidth) * 2 - 1, -(clientY / window.innerHeight) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects([globe, ...roots], true)[0];
    if (!hit) return null;
    const direct = elements.find((el) => {
      let o = hit.object;
      while (o && o !== el.root) o = o.parent;
      return o === el.root;
    });
    if (direct) return direct;
    // Le sol : l'élément le plus proche, s'il est assez près, sur la planète ou à l'écran (vue de loin, les éléments
    // ne font que quelques pixels).
    let best = null;
    let bestScore = 1;
    for (const el of elements) {
      const world = worldOf(el, a);
      const score = Math.min(
        world.distanceTo(hit.point) / HIT_RADIUS[el.key],
        Math.hypot(...screenOf(world, b, clientX, clientY)) / HIT_PIXELS,
      );
      if (score < bestScore) {
        best = el;
        bestScore = score;
      }
    }
    return best;
  }

  function setHovered(el) {
    if (el === hovered) return;
    if (hovered) glow(hovered, 0);
    hovered = el;
    canvas.style.cursor = el ? 'pointer' : drag ? 'grabbing' : 'grab';
    labelEl.textContent = el ? el.content.title : '';
    labelEl.classList.toggle('is-visible', !!el && el !== focused);
  }

  function focusOn(el) {
    if (focused && focused !== el) glow(focused, 0);
    glow(el, 0);
    focused = el;
    focusTarget = 1;
    velocity = { x: 0, y: 0 };
    // Rotation qui amène l'élément sous la caméra, un peu au-dessus du centre.
    planet.updateWorldMatrix(true, false);
    const dir = worldOf(el, a).normalize();
    const tilt = FOCUS_TILT * focusDist(el.key);
    const target = b.copy(FRAME_DIR).multiplyScalar(Math.cos(tilt)).addScaledVector(FRAME_UP, Math.sin(tilt));
    focusFrom.copy(user);
    focusTo.copy(q.setFromUnitVectors(dir, target.normalize())).multiply(user);
    // Certains éléments ont un côté à montrer : on les fait pivoter sur eux-mêmes pour qu'il regarde la caméra.
    if (el.front) {
      const near = radius + focusDist(el.key);
      const toCam = c.copy(FRAME_DIR).multiplyScalar(near).addScaledVector(target, -radius);
      toCam.addScaledVector(target, -toCam.dot(target)).normalize();
      planet.getWorldQuaternion(q);
      const front = d.copy(el.front).applyQuaternion(q.premultiply(focusTo.clone().multiply(user.clone().invert())));
      front.addScaledVector(target, -front.dot(target)).normalize();
      const angle = Math.atan2(cross.crossVectors(front, toCam).dot(target), front.dot(toCam));
      focusTo.premultiply(q.setFromAxisAngle(target, angle));
    }
    focusTurn = 0;

    // Un side project : petite fiche, puis un bouton vers sa page détaillée.
    const { title, text, project } = el.content;
    const page = project ?? el.content.page;
    const link = project ? EXPLORE.projectLink : el.content.link;
    cardEl.querySelector('h2').textContent = title;
    cardEl.querySelector('.explore-text').textContent = text;
    pageEl.hidden = !page;
    if (page) {
      const ready = typeof page === 'string';
      pageEl.textContent = ready ? (link ?? EXPLORE.pageLink) : EXPLORE.pageSoon;
      pageEl.classList.toggle('is-soon', !ready);
      if (ready) pageEl.href = page;
      else pageEl.removeAttribute('href');
      // Les liens vers un autre site s'ouvrent dans un nouvel onglet.
      const external = ready && /^https?:/.test(page);
      if (external) {
        pageEl.target = '_blank';
        pageEl.rel = 'noopener';
      } else {
        pageEl.removeAttribute('target');
        pageEl.removeAttribute('rel');
      }
    }
    cardEl.classList.add('is-open');
    labelEl.classList.remove('is-visible');
  }

  function unfocus() {
    if (!focused) return;
    focused = null;
    focusTarget = 0;
    focusTurn = 1;
    cardEl.classList.remove('is-open');
  }

  // Vue d'ensemble : distance de la caméra au centre de la planète, sans zoom.
  function farDistance() {
    const portrait = camera.aspect < 1;
    const fit = portrait ? FIT_PORTRAIT : FIT_LANDSCAPE;
    return ATMOSPHERE / (TAN * fit.size * (portrait ? camera.aspect : 1));
  }

  // Zoomer en arrière depuis un élément ciblé ramène à la vue d'ensemble. En avant, la planète tourne un peu pour
  // amener vers le milieu de l'écran le point visé par le pointeur.
  function zoomBy(amount, clientX, clientY) {
    if (focused) {
      if (amount < 0) unfocus();
      return;
    }
    const before = zoomTarget;
    zoomTarget = Math.min(1, Math.max(0, zoomTarget + amount));
    const step = zoomTarget - before;
    if (step <= 0) return;
    pointer.set((clientX / window.innerWidth) * 2 - 1, -(clientY / window.innerHeight) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObject(globe, false)[0];
    if (!hit) return;
    q.setFromUnitVectors(a.copy(hit.point).normalize(), zoomSpot(zoomTarget, spotDir));
    user.premultiply(c2.identity().slerp(q, Math.min(1, step * 1.4)));
  }

  canvas.addEventListener(
    'wheel',
    (e) => {
      if (!active) return;
      e.preventDefault();
      zoomBy(-e.deltaY * (e.deltaMode === 1 ? 16 : 1) * WHEEL_SPEED, e.clientX, e.clientY);
    },
    { passive: false },
  );

  const pinchGap = () => {
    const [p, q2] = [...pointers.values()];
    return Math.hypot(p.x - q2.x, p.y - q2.y);
  };

  // Glisser fait tourner la planète ; un clic sans glisser vise un élément ; deux doigts zooment.
  canvas.addEventListener('pointerdown', (e) => {
    if (!active) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    canvas.setPointerCapture(e.pointerId);
    if (pointers.size === 2) {
      drag = null;
      pinch = pinchGap();
      return;
    }
    if (pointers.size > 2) return;
    drag = { x: e.clientX, y: e.clientY, t: performance.now() };
    pointerMoved = false;
    canvas.setPointerCapture(e.pointerId);
    canvas.style.cursor = 'grabbing';
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!active) return;
    if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) {
      const gap = pinchGap();
      const [p, p2] = [...pointers.values()];
      zoomBy((gap - pinch) * PINCH_SPEED, (p.x + p2.x) / 2, (p.y + p2.y) / 2);
      pinch = gap;
      return;
    }
    if (drag) {
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 4) pointerMoved = true;
      if (pointerMoved) {
        // Glisser depuis un élément ciblé : on le quitte et on reprend la main sur la planète.
        if (focused) unfocus();
        const now = performance.now();
        const dt = Math.max(1, now - drag.t) / 1000;
        const speed = DRAG_SPEED * dragScale();
        rotate(dx * speed, dy * speed);
        velocity = { x: (dx * speed) / dt, y: (dy * speed) / dt };
        drag = { x: e.clientX, y: e.clientY, t: now };
        lastMove = now;
      }
      return;
    }
    if (e.pointerType === 'mouse') setHovered(pick(e.clientX, e.clientY));
  });
  const release = (e) => {
    pointers.delete(e.pointerId);
  };
  canvas.addEventListener('pointercancel', release);
  canvas.addEventListener('pointerup', (e) => {
    release(e);
    if (!active || !drag) return;
    const wasDrag = pointerMoved;
    drag = null;
    canvas.style.cursor = hovered ? 'pointer' : 'grab';
    // Relâché après un temps d'arrêt : pas d'élan.
    if (!wasDrag || performance.now() - lastMove > 100) velocity = { x: 0, y: 0 };
    if (wasDrag) return;
    const el = pick(e.clientX, e.clientY);
    if (el) focusOn(el);
    else unfocus();
  });
  // Retour depuis la page d'un side project par le bouton Précédent : on reprend la vue d'ensemble.
  window.addEventListener('pageshow', (e) => e.persisted && unfocus());
  window.addEventListener('keydown', (e) => {
    if (!active || e.key !== 'Escape') return;
    if (focused) unfocus();
    else onBack();
  });

  // De près, le sol défile sous le doigt à la même vitesse qu'en vue d'ensemble.
  function dragScale() {
    const far = farDistance() - radius;
    return (lerp(far, ZOOM_CLOSEST, zoom) / far) ** 0.9;
  }

  function rotate(yaw, pitch) {
    user.premultiply(q.setFromAxisAngle(FRAME_UP, yaw));
    user.premultiply(q.setFromAxisAngle(FRAME_RIGHT, pitch));
  }

  return {
    user,
    focusOn,
    get focused() {
      return focused;
    },

    start(backHandler) {
      onBack = backHandler;
      active = true;
      ui.classList.add('is-active');
      canvas.style.cursor = 'grab';
      canvas.style.touchAction = 'none';
    },

    stop() {
      active = false;
      unfocus();
      setHovered(null);
      ui.classList.remove('is-active');
      canvas.style.cursor = '';
      canvas.style.touchAction = '';
    },

    update(dt, time) {
      if (!active) return;
      if (!drag && !focused) {
        rotate((velocity.x + IDLE_SPIN * dragScale()) * dt, velocity.y * dt);
        const damping = Math.exp(-dt * 2.5);
        velocity = { x: velocity.x * damping, y: velocity.y * damping };
      }
      if (focusTurn < 1) {
        focusTurn = Math.min(1, focusTurn + dt / EXPLORE_T.focus);
        user.slerpQuaternions(focusFrom, focusTo, easeInOutCubic(focusTurn));
      }
      focus += (focusTarget - focus) * (1 - Math.exp(-dt / (EXPLORE_T.focus / 4)));
      zoom += (zoomTarget - zoom) * (1 - Math.exp(-dt * 8));
      // Seul l'élément survolé s'éclaire : celui qu'on regarde de près n'en a pas besoin.
      if (hovered && hovered !== focused) glow(hovered, 0.22 + 0.08 * Math.sin(time * 4));
    },

    // Cadrage : la planète entière, ou l'élément ciblé de près, décalés pour laisser la place au satellite et à la fiche.
    view(out) {
      const aspect = camera.aspect;
      const portrait = aspect < 1;
      const fit = portrait ? FIT_PORTRAIT : FIT_LANDSCAPE;
      // Le zoom rapproche la caméra du sol ; la planète revient alors au milieu de l'écran.
      const far = lerp(farDistance(), radius + ZOOM_CLOSEST, zoom);
      const near = radius + focusDist(focused?.key ?? lastKey);
      const k = easeInOutCubic(Math.min(1, focus));
      const dist = lerp(far, near, k);
      out.pos.copy(FRAME_DIR).multiplyScalar(dist);
      out.look.copy(zoomSpot(zoom, spotDir)).multiplyScalar(radius * zoom);
      if (focused || lastKey) {
        planet.updateWorldMatrix(true, false);
        out.look.lerp(worldOf(focused ?? elements.find((el) => el.key === lastKey), a), k);
      }
      if (focused) lastKey = focused.key;
      // Regarder à côté du sujet le décale à l'écran du côté opposé.
      const spot = portrait ? FOCUS_PORTRAIT : FOCUS_LANDSCAPE;
      const x = lerp(fit.x * (1 - zoom), spot.x, k);
      const y = lerp(fit.y * (1 - zoom), spot.y, k);
      const range = out.pos.distanceTo(out.look) * TAN;
      out.look.addScaledVector(FRAME_RIGHT, -x * range * aspect).addScaledVector(FRAME_UP, -y * range);
      out.up.copy(FRAME_UP);
      out.fov = FOV;
    },

    // Nom de l'élément survolé et fiche, placés à chaque image.
    place(w, h) {
      if (hovered && hovered !== focused) {
        const p = worldOf(hovered, a).project(camera);
        labelEl.style.left = `${(p.x * 0.5 + 0.5) * w}px`;
        labelEl.style.top = `${(-p.y * 0.5 + 0.5) * h}px`;
      }
      hintEl.classList.toggle('is-hidden', !!focused);
    },
  };
}
