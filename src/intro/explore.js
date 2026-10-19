import * as THREE from 'three';
import { EXPLORE, EXPLORE_T } from '../config.js';
import { PLANET_RADIUS } from './planet.js';
import { easeInOutCubic, lerp } from './math.js';

// Mode « Explorer le monde » : la planète au centre de l'écran, que l'on fait tourner en la glissant. Survoler un
// élément l'éclaire et affiche son nom ; cliquer dessus le fait venir devant la caméra, avec sa fiche à côté.
// La caméra reste sur un axe fixe (FRAME) ; c'est la planète qui tourne.

const FOV = 45;
const ORBIT_FIT = 42; // rayon à faire tenir à l'écran : la planète, son atmosphère et l'orbite du satellite
// L'élément ciblé monte un peu au-dessus du centre de l'image, d'autant plus que la caméra est loin : on le voit
// toujours de biais, à 40° environ de la verticale, avec l'horizon derrière lui.
const FOCUS_TILT = 0.02; // radians par unité de distance
const SAT_ORBIT = 41;
const DRAG_SPEED = 0.005; // radians par pixel
const IDLE_SPIN = 0.06; // rotation lente quand on ne touche à rien, en radians par seconde

// Distance de la caméra au sol quand on cible un élément, selon sa taille.
const FOCUS_DIST = { solar: 7, forest: 11, pad: 8, clock: 13, house: 6, field: 9 };
// Un clic sur le sol tout près d'un élément le vise aussi : rayon autour de son ancrage.
const HIT_RADIUS = { solar: 2, forest: 5, pad: 1.8, clock: 2.5, house: 1.4, field: 3 };

// Axe de la caméra : de biais par rapport à la fusée, qui reste ainsi hors du cadre.
const FRAME_DIR = new THREE.Vector3(0.22, 0.31, 0.93).normalize();
const FRAME_UP = new THREE.Vector3(0, 1, 0).addScaledVector(FRAME_DIR, -FRAME_DIR.y).normalize();
const FRAME_RIGHT = new THREE.Vector3().crossVectors(FRAME_UP, FRAME_DIR).normalize();
// En arrivant, la planète bascule vers nous : le pas de tir, la forêt et la centrale passent du bord au milieu.
const ENTER_TILT = new THREE.Quaternion().setFromAxisAngle(FRAME_RIGHT, 0.7);

export function createExplore({ planet, globe, elements, camera, canvas, ui }) {
  const user = new THREE.Quaternion(); // rotation donnée à la planète, en plus de son roulis d'intro
  const q = new THREE.Quaternion();
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const d = new THREE.Vector3();
  const cross = new THREE.Vector3();
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let active = false;
  let velocity = { x: 0, y: 0 };
  let drag = null;
  let hovered = null;
  let pointerMoved = false;
  let lastMove = 0;
  let lastKey = null; // dernier élément ciblé, pour que la caméra recule depuis lui

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
      <button class="explore-close" type="button" aria-label="Fermer la fiche">×</button>
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
    // Le sol : l'élément le plus proche, s'il est assez près.
    let best = null;
    let bestDist = Infinity;
    for (const el of elements) {
      const d = worldOf(el, a).distanceTo(hit.point);
      if (d < HIT_RADIUS[el.key] && d < bestDist) {
        best = el;
        bestDist = d;
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
      const near = PLANET_RADIUS + focusDist(el.key);
      const toCam = c.copy(FRAME_DIR).multiplyScalar(near).addScaledVector(target, -PLANET_RADIUS);
      toCam.addScaledVector(target, -toCam.dot(target)).normalize();
      planet.getWorldQuaternion(q);
      const front = d.copy(el.front).applyQuaternion(q.premultiply(focusTo.clone().multiply(user.clone().invert())));
      front.addScaledVector(target, -front.dot(target)).normalize();
      const angle = Math.atan2(cross.crossVectors(front, toCam).dot(target), front.dot(toCam));
      focusTo.premultiply(q.setFromAxisAngle(target, angle));
    }
    focusTurn = 0;

    const { title, text, page } = el.content;
    cardEl.querySelector('h2').textContent = title;
    cardEl.querySelector('.explore-text').textContent = text;
    pageEl.hidden = !page;
    if (page) {
      const ready = typeof page === 'string';
      pageEl.textContent = ready ? EXPLORE.pageLink : EXPLORE.pageSoon;
      pageEl.classList.toggle('is-soon', !ready);
      if (ready) pageEl.href = page;
      else pageEl.removeAttribute('href');
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

  // Glisser fait tourner la planète ; un clic sans glisser vise un élément.
  canvas.addEventListener('pointerdown', (e) => {
    if (!active) return;
    drag = { x: e.clientX, y: e.clientY, t: performance.now() };
    pointerMoved = false;
    canvas.setPointerCapture(e.pointerId);
    canvas.style.cursor = 'grabbing';
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!active) return;
    if (drag) {
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 4) pointerMoved = true;
      if (pointerMoved) {
        // Glisser depuis un élément ciblé : on le quitte et on reprend la main sur la planète.
        if (focused) unfocus();
        const now = performance.now();
        const dt = Math.max(1, now - drag.t) / 1000;
        rotate(dx * DRAG_SPEED, dy * DRAG_SPEED);
        velocity = { x: (dx * DRAG_SPEED) / dt, y: (dy * DRAG_SPEED) / dt };
        drag = { x: e.clientX, y: e.clientY, t: now };
        lastMove = now;
      }
      return;
    }
    if (e.pointerType === 'mouse') setHovered(pick(e.clientX, e.clientY));
  });
  canvas.addEventListener('pointerup', (e) => {
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
  window.addEventListener('keydown', (e) => {
    if (!active || e.key !== 'Escape') return;
    if (focused) unfocus();
    else onBack();
  });

  function rotate(yaw, pitch) {
    user.premultiply(q.setFromAxisAngle(FRAME_UP, yaw));
    user.premultiply(q.setFromAxisAngle(FRAME_RIGHT, pitch));
  }

  const satPos = new THREE.Vector3();
  const satHover = new THREE.Vector3();
  const satFwd = new THREE.Vector3();
  const satUp = new THREE.Vector3();
  const satSide = new THREE.Vector3();
  const satQuat = new THREE.Quaternion();
  const satBasis = new THREE.Matrix4();

  return {
    user,
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

    // Arrivée : la planète bascule vers la caméra, k de 0 à 1.
    enter(k) {
      user.slerpQuaternions(q.identity(), ENTER_TILT, k);
    },

    update(dt, time) {
      if (!active) return;
      if (!drag && !focused) {
        rotate((velocity.x + IDLE_SPIN) * dt, velocity.y * dt);
        const damping = Math.exp(-dt * 2.5);
        velocity = { x: velocity.x * damping, y: velocity.y * damping };
      }
      if (focusTurn < 1) {
        focusTurn = Math.min(1, focusTurn + dt / EXPLORE_T.focus);
        user.slerpQuaternions(focusFrom, focusTo, easeInOutCubic(focusTurn));
      }
      focus += (focusTarget - focus) * (1 - Math.exp(-dt / (EXPLORE_T.focus / 4)));
      // Seul l'élément survolé s'éclaire : celui qu'on regarde de près n'en a pas besoin.
      if (hovered && hovered !== focused) glow(hovered, 0.22 + 0.08 * Math.sin(time * 4));
    },

    // Cadrage : la planète entière au centre, ou l'élément ciblé de près, décalé pour laisser la place à sa fiche.
    view(out, portrait) {
      const fit = ORBIT_FIT / (Math.tan(THREE.MathUtils.degToRad(FOV / 2)) * Math.min(1, camera.aspect));
      const near = PLANET_RADIUS + focusDist(focused?.key ?? lastKey);
      const k = easeInOutCubic(Math.min(1, focus));
      out.pos.copy(FRAME_DIR).multiplyScalar(lerp(fit, near, k));
      out.look.set(0, 0, 0);
      if (focused || lastKey) {
        planet.updateWorldMatrix(true, false);
        out.look.lerp(worldOf(focused ?? elements.find((el) => el.key === lastKey), a), k);
      }
      if (focused) lastKey = focused.key;
      out.up.copy(FRAME_UP);
      out.fov = FOV;
      out.shift = portrait ? [0, 0.32 * k] : [-0.34 * k, 0];
    },

    // Le satellite tourne autour de la planète, et vient se placer près de l'élément ciblé.
    satellite(time) {
      const angle = time * 0.22;
      satPos
        .copy(FRAME_RIGHT)
        .multiplyScalar(Math.cos(angle) * SAT_ORBIT)
        .addScaledVector(FRAME_DIR, Math.sin(angle) * SAT_ORBIT)
        .addScaledVector(FRAME_UP, Math.sin(angle * 0.7) * 6);
      satFwd.copy(FRAME_RIGHT).multiplyScalar(-Math.sin(angle)).addScaledVector(FRAME_DIR, Math.cos(angle));
      if (focus > 0.01 && (focused || lastKey)) {
        const el = focused ?? elements.find((e) => e.key === lastKey);
        worldOf(el, satHover);
        const up = b.copy(satHover).normalize();
        satHover.addScaledVector(up, 3.2).addScaledVector(FRAME_RIGHT, 2.2);
        satPos.lerp(satHover, easeInOutCubic(Math.min(1, focus)));
      }
      satUp.copy(satPos).normalize();
      satSide.crossVectors(satFwd, satUp).normalize();
      satFwd.crossVectors(satSide, satUp);
      satQuat.setFromRotationMatrix(satBasis.makeBasis(satSide, satUp, satFwd));
      return { pos: satPos, quat: satQuat };
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
