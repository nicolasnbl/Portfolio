import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { seededRandom } from './math.js';

// Rendu « Lumière » et monde réaliste, partagés par toutes les pages 3D :
// - setupLook : tone mapping cinéma, ciel en image d'environnement (reflets de l'eau et des métaux), ombres du soleil
//   cadrées chaque image autour de ce que regarde la caméra ;
// - globeMaterial : eau sombre au large et turquoise près des côtes, vagues et écume, terres avec relief et nuances ;
// - atmosphereMaterial : halo plus fort sur le bord et du côté du soleil ;
// - buildClouds : des cumulus lisses qui tournent autour de la planète et se dissipent au-dessus du trajet de la fusée.

const isSmall = () => Math.min(window.innerWidth, window.innerHeight) < 700;

// ---------- Rendu ----------
const _focus = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _center = new THREE.Vector3();
const _scale = new THREE.Vector3();
const _oc = new THREE.Vector3();

export function setupLook(renderer, scene, sun, { exposure = 1.05 } = {}) {
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = exposure;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  scene.environment = skyEnvironment(renderer);
  // Plus de contraste : moins de lumière d'ambiance, un soleil plus fort et plus chaud.
  scene.traverse((o) => {
    if (o.isHemisphereLight) {
      o.intensity *= 0.65;
      o.groundColor.set('#3b3550');
    }
  });
  sun.intensity *= 1.35;
  sun.color.set('#ffe2b8');
  scene.environmentIntensity = 0.45;

  const size = isSmall() ? 1024 : 2048;
  sun.castShadow = true;
  sun.shadow.mapSize.set(size, size);
  sun.shadow.bias = -0.0004;
  sun.shadow.radius = 2;
  if (!sun.target.parent) scene.add(sun.target);
  const written = new THREE.Vector3();
  let base = sun.position.clone();
  let globe = null;

  // La page règle la direction du soleil par sa position (vers l'origine). Chaque image, on garde cette direction
  // mais on recentre la lumière sur le point regardé, pour que la carte d'ombres couvre ce qui est à l'écran.
  scene.onBeforeRender = (_renderer, _scene, camera) => {
    if (!sun.position.equals(written)) base = sun.position.clone();
    if (!globe || !globe.parent) globe = scene.getObjectByName('globe');
    if (!globe || !globe.visible) return;
    globe.getWorldPosition(_center);
    globe.getWorldScale(_scale);
    const R = globe.userData.radius * _scale.x;
    // Point visé : là où l'axe de la caméra touche la planète, sinon le point de la planète le plus proche de cet axe.
    camera.getWorldDirection(_dir);
    _oc.subVectors(camera.position, _center);
    const b = _oc.dot(_dir);
    const disc = b * b - (_oc.lengthSq() - R * R);
    const t = disc > 0 ? -b - Math.sqrt(disc) : Math.max(0, -b);
    _focus.copy(camera.position).addScaledVector(_dir, t);
    if (disc <= 0) _focus.sub(_center).setLength(R).add(_center);
    const distance = camera.position.distanceTo(_focus);
    const extent = THREE.MathUtils.clamp(distance * 0.75, 4, R * 1.1);
    const cam = sun.shadow.camera;
    if (cam.right !== extent) {
      cam.left = -extent;
      cam.right = extent;
      cam.top = extent;
      cam.bottom = -extent;
      cam.near = 0.5;
      cam.far = extent * 8 + 40;
      cam.updateProjectionMatrix();
      sun.shadow.normalBias = ((2 * extent) / size) * 1.5;
    }
    sun.target.position.copy(_focus);
    sun.position.copy(base).normalize().multiplyScalar(extent * 4 + 20).add(_focus);
    written.copy(sun.position);
    sun.target.updateMatrixWorld();
  };
}

// Ciel bleu en dégradé, flouté par le générateur d'environnement : de quoi donner des reflets doux.
function skyEnvironment(renderer) {
  const sky = new THREE.Scene();
  sky.add(
    new THREE.Mesh(
      new THREE.SphereGeometry(10, 32, 16),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
        fragmentShader: `varying vec3 vP; void main(){ float h = normalize(vP).y;
          vec3 c = mix(vec3(.10,.12,.16), vec3(.55,.72,.95), smoothstep(-.25, .9, h));
          gl_FragColor = vec4(c, 1.); }`,
      }),
    ),
  );
  const pmrem = new THREE.PMREMGenerator(renderer);
  const texture = pmrem.fromScene(sky, 0.02).texture;
  pmrem.dispose();
  return texture;
}

// ---------- Globe ----------
// Masque terre / eau en projection équirectangulaire, tiré des couleurs des facettes : R = terre avec un léger flou
// (trait de côte), G = terre très floutée (profondeur de l'eau), B = sable.
export const MASK_WIDTH = 1024;
export const MASK_HEIGHT = 512;

// Données RGBA du masque (Uint8Array). Calculées au build pour le site en ligne (plugin bakeGlobeMasks de
// vite.config.js), sinon ici au chargement de la page.
export function landMaskData(geometry) {
  const W = MASK_WIDTH;
  const H = MASK_HEIGHT;
  const pos = geometry.attributes.position;
  const col = geometry.attributes.color;
  const land = new Float32Array(W * H);
  const sand = new Float32Array(W * H);
  const c = new THREE.Vector3();
  const q = new THREE.Vector3();
  for (let i = 0; i < pos.count; i += 3) {
    c.set(0, 0, 0);
    for (let k = 0; k < 3; k++) c.add(q.fromBufferAttribute(pos, i + k));
    c.normalize();
    const r = col.getX(i);
    const g = col.getY(i);
    const b = col.getZ(i);
    if (b > r + 0.15 && b > g - 0.05) continue;
    const isSand = r > 0.6 && b < 0.6 && r > g;
    const u = Math.floor((Math.atan2(c.z, c.x) / (2 * Math.PI) + 0.5) * W);
    const v = Math.floor((Math.asin(THREE.MathUtils.clamp(c.y, -1, 1)) / Math.PI + 0.5) * H);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const x = (u + dx + W) % W;
        const y = Math.min(H - 1, Math.max(0, v + dy));
        land[y * W + x] = 1;
        if (isSand) sand[y * W + x] = 1;
      }
    }
  }
  const coast = blur(land, W, H, 2, 2);
  const depth = blur(land, W, H, 12, 3);
  const sandy = blur(sand, W, H, 2, 2);
  const data = new Uint8Array(W * H * 4);
  for (let i = 0; i < W * H; i++) {
    data[i * 4] = coast[i] * 255;
    data[i * 4 + 1] = depth[i] * 255;
    data[i * 4 + 2] = sandy[i] * 255;
    data[i * 4 + 3] = 255;
  }
  return data;
}

function maskTexture(data) {
  const texture = new THREE.DataTexture(data, MASK_WIDTH, MASK_HEIGHT);
  texture.wrapS = THREE.RepeatWrapping;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

// Flou par boîtes successives (proche d'un flou gaussien), horizontal en boucle, vertical borné.
function blur(src, W, H, radius, passes) {
  let a = Float32Array.from(src);
  let b = new Float32Array(W * H);
  const n = 2 * radius + 1;
  const row = (y) => Math.min(H - 1, Math.max(0, y)) * W;
  for (let p = 0; p < passes; p++) {
    for (let y = 0; y < H; y++) {
      let sum = 0;
      for (let k = -radius; k <= radius; k++) sum += a[y * W + ((k + W) % W)];
      for (let x = 0; x < W; x++) {
        b[y * W + x] = sum / n;
        sum += a[y * W + ((x + radius + 1) % W)] - a[y * W + ((x - radius + W) % W)];
      }
    }
    // Passe verticale en fenêtre glissante, comme l'horizontale (bords répétés) : même résultat, bien plus rapide.
    for (let x = 0; x < W; x++) {
      let sum = 0;
      for (let k = -radius; k <= radius; k++) sum += b[row(k) + x];
      for (let y = 0; y < H; y++) {
        a[y * W + x] = sum / n;
        sum += b[row(y + radius + 1) + x] - b[row(y - radius) + x];
      }
    }
  }
  return a;
}

const NOISE = `
float hash3(vec3 p){ p = fract(p * 0.3183099 + .1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float vnoise(vec3 x){ vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3. - 2. * f);
  return mix(mix(mix(hash3(i), hash3(i + vec3(1,0,0)), f.x), mix(hash3(i + vec3(0,1,0)), hash3(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hash3(i + vec3(0,0,1)), hash3(i + vec3(1,0,1)), f.x), mix(hash3(i + vec3(0,1,1)), hash3(i + vec3(1,1,1)), f.x), f.y), f.z); }
float fbm(vec3 p){ float a = .5, s = 0.; for (int i = 0; i < 4; i++) { s += a * vnoise(p); p *= 2.03; a *= .5; } return s; }
`;

// maskData : le masque des terres (landMaskData), calculé à l'avance ou à partir des couleurs des facettes du globe.
export function globeMaterial(maskData) {
  const mask = maskTexture(maskData);
  const material = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9 });
  const time = { value: 0 };
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uMask = { value: mask };
    shader.uniforms.uTime = time;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vObj;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvObj = normalize(position) * 18.0;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\nuniform sampler2D uMask; uniform float uTime; varying vec3 vObj;\n${NOISE}\nfloat gH; float gWater;`)
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
{ vec3 d = normalize(vObj);
  vec2 muv = vec2(atan(d.z, d.x) / 6.2831853 + .5, asin(clamp(d.y, -1., 1.)) / 3.14159265 + .5);
  vec3 m = texture2D(uMask, muv).rgb;
  float n1 = fbm(vObj * .9), n2 = fbm(vObj * 3.5 + 7.), n3 = fbm(vObj * 5.);
  float edge = m.r + (n2 - .5) * .22;
  gWater = 1. - smoothstep(.46, .54, edge);
  vec3 water = mix(vec3(.02,.12,.28), vec3(.04,.30,.50), smoothstep(.0, .25, m.g));
  water = mix(water, vec3(.10,.60,.64), smoothstep(.25, .5, m.g + (fbm(vObj * 3.) - .5) * .08));
  float band = smoothstep(.36, .47, edge) * (1. - smoothstep(.47, .52, edge));
  float foam = band * smoothstep(.45, .7, fbm(vObj * 9. + vec3(uTime * .4, 0., uTime * .3)));
  water = mix(water, vec3(.92,.96,.98), foam * .85);
  vec3 grass = mix(vec3(.16,.32,.08), vec3(.32,.46,.14), n1);
  grass = mix(grass, vec3(.10,.22,.07), smoothstep(.5, .75, n2) * .7);
  grass = mix(grass, vec3(.44,.42,.22), smoothstep(.62, .8, n1) * .4);
  grass *= .9 + .2 * n3;
  vec3 desert = mix(vec3(.80,.62,.40), vec3(.90,.76,.54), n2);
  desert = mix(desert, vec3(.68,.47,.29), smoothstep(.55, .8, n1) * .55);
  float beach = smoothstep(.62, .5, m.r) * (1. - m.b);
  vec3 ground = mix(grass, desert, smoothstep(.3, .7, m.b));
  ground = mix(ground, vec3(.86,.78,.58), beach * .8);
  diffuseColor.rgb = mix(ground, water, gWater);
  float waves = fbm(vObj * 6. + vec3(uTime * .25, uTime * .1, 0.)) * .5 + fbm(vObj * 18. - vec3(0., uTime * .3, uTime * .2)) * .25;
  gH = mix(n1 * .7 + n3 * .12, waves * .05, gWater);
}`,
      )
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(.92, .16, gWater);')
      .replace(
        '#include <normal_fragment_begin>',
        `#include <normal_fragment_begin>
{ vec3 dpdx = dFdx(-vViewPosition), dpdy = dFdy(-vViewPosition);
  float dhx = dFdx(gH), dhy = dFdy(gH);
  vec3 r1 = cross(dpdy, normal), r2 = cross(normal, dpdx); float det = dot(dpdx, r1);
  vec3 grad = sign(det) * (dhx * r1 + dhy * r2);
  normal = normalize(abs(det) * normal - grad); }`,
      );
  };
  material.userData.time = time;
  return material;
}

// ---------- Atmosphère ----------
export function atmosphereMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color('#7cc8ff') }, uSun: { value: new THREE.Vector3(0.5, 0.7, 0.5).normalize() } },
    vertexShader: `varying vec3 vN; varying vec3 vW;
      void main(){ vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform vec3 uColor; uniform vec3 uSun; varying vec3 vN; varying vec3 vW;
      void main(){ vec3 V = normalize(cameraPosition - vW); float f = pow(1. - abs(dot(V, -vN)), 3.);
        float lit = smoothstep(-.4, .6, dot(-vN, uSun));
        gl_FragColor = vec4(uColor * (.25 + 1.2 * lit), f * (.25 + .9 * lit)); }`,
    transparent: true,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
}

// Avant chaque rendu : direction du soleil (première lumière directionnelle qui porte des ombres) et heure.
export function bindAtmosphere(atmosphere, globe) {
  const center = new THREE.Vector3();
  atmosphere.onBeforeRender = (_renderer, scene) => {
    const sun = atmosphere.userData.sun ?? (atmosphere.userData.sun = findSun(scene));
    if (sun) {
      atmosphere.getWorldPosition(center);
      atmosphere.material.uniforms.uSun.value.subVectors(sun.position, sun.target.position).normalize();
    }
    if (globe.material.userData.time) globe.material.userData.time.value = performance.now() / 1000;
  };
}

function findSun(scene) {
  let sun = null;
  scene.traverse((o) => {
    if (!sun && o.isDirectionalLight && o.castShadow) sun = o;
  });
  return sun;
}

// ---------- Nuages ----------
// Des cumulus faits de bouffées lisses (base plate, dessous grisé), fusionnés en un seul maillage. Ils tournent
// autour de l'axe de la planète ; en passant au-dessus des directions `avoid` (le trajet de la fusée, le continent de
// l'horloge), ils se dissipent dans le shader pour ne pas gêner les plans de l'intro, puis se reforment plus loin.
const CLOUD_SPEED = 0.025; // rad/s : un tour en un peu plus de 4 minutes
const MAX_AVOID = 2;

export function buildClouds(R, avoid = [], count = 20) {
  const rand = seededRandom(11);
  const parts = [];
  const up = new THREE.Vector3(0, 1, 0);
  const d = new THREE.Vector3();
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const p = new THREE.Vector3();
  const v = new THREE.Vector3();
  const k = R / 18;
  const top = new THREE.Color('#ffffff');
  const bottom = new THREE.Color('#aeb8cc');
  const c = new THREE.Color();
  for (let placed = 0; placed < count; placed++) {
    d.set(rand() - 0.5, rand() - 0.5, rand() - 0.5).normalize();
    const alt = R + (1.2 + rand() * 0.4) * k;
    const center = d.clone().multiplyScalar(alt);
    q.setFromUnitVectors(up, d);
    m.compose(center, q, new THREE.Vector3(1, 1, 1));
    // Tailles très variées : petits flocons, cumulus moyens et quelques grands bancs étalés en surface.
    const size = 0.45 + rand() ** 1.5 * 2.6;
    // Les grands nuages s'étalent en surface au lieu de monter : bouffées de taille moyenne, sur une large zone.
    const puff = Math.min(size, 1.1);
    const width = size * (size > 1.4 ? 1.3 : 1);
    const puffs = Math.round(4 + 3 * (width / puff) ** 2);
    for (let i = 0; i < puffs; i++) {
      // Bouffées réparties en grappe, les plus grosses au centre et en haut.
      const a = rand() * Math.PI * 2;
      const r = Math.sqrt(rand()) * 0.75 * k * width;
      const radius = (0.42 - (r / (k * width)) * 0.22 + rand() * 0.12) * k * puff;
      const ico = new THREE.IcosahedronGeometry(radius, radius > 0.45 * k ? 3 : 2);
      ico.deleteAttribute('normal');
      ico.deleteAttribute('uv');
      // Sommets partagés : les normales seront lissées sur toute la bouffée, sans facettes.
      const g = mergeVertices(ico);
      const pos = g.attributes.position;
      const colors = new Float32Array(pos.count * 3);
      const lift = Math.cos(a) * r * 0.1 + radius * 0.35;
      for (let j = 0; j < pos.count; j++) {
        v.fromBufferAttribute(pos, j);
        // Petites bosses, puis base aplatie : le dessous d'un cumulus est plat.
        v.multiplyScalar(1 + 0.08 * Math.sin(v.x * 9 / k + i) * Math.sin(v.z * 8 / k + i * 2));
        v.x += Math.cos(a) * r;
        v.z += Math.sin(a) * r * 0.7;
        v.y = Math.max(v.y * 0.75 + lift, 0);
        c.copy(bottom).lerp(top, THREE.MathUtils.clamp(v.y / (0.5 * k * puff), 0, 1));
        colors.set([c.r, c.g, c.b], j * 3);
        v.applyMatrix4(m);
        pos.setXYZ(j, v.x, v.y, v.z);
      }
      g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      const centers = new Float32Array(pos.count * 3);
      for (let j = 0; j < pos.count; j++) centers.set([center.x, center.y, center.z], j * 3);
      g.setAttribute('aCloud', new THREE.BufferAttribute(centers, 3));
      parts.push(g);
    }
  }
  const geometry = mergeGeometries(parts);
  geometry.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({ vertexColors: true, emissive: '#dfe7f7', emissiveIntensity: 0.1, roughness: 1 });
  const avoidUniform = { value: Array.from({ length: MAX_AVOID }, () => new THREE.Vector4(0, 1, 0, -1)) };
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uAvoid = avoidUniform;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
attribute vec3 aCloud;
uniform vec4 uAvoid[${MAX_AVOID}];`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
// Dissipation : le nuage rétrécit vers son centre à l'approche d'une zone à garder dégagée.
float keep = 1.0;
vec3 cloudDir = normalize(aCloud);
for (int i = 0; i < ${MAX_AVOID}; i++) {
  if (uAvoid[i].w < 0.0) continue;
  float angle = acos(clamp(dot(cloudDir, uAvoid[i].xyz), -1.0, 1.0));
  keep *= smoothstep(uAvoid[i].w, uAvoid[i].w + 0.25, angle);
}
transformed = aCloud + (transformed - aCloud) * keep;`);
  };

  const clouds = new THREE.Mesh(geometry, material);
  clouds.name = 'nuages';
  // clearPath : dissiper les nuages au-dessus des zones à éviter. Utile dans l'intro ; la page Explorer le coupe pour
  // que des nuages passent aussi sur la face qu'on regarde.
  clouds.userData.clearPath = true;
  // Les directions à éviter sont fixes sur la planète : on les ramène dans le repère des nuages qui tournent.
  const local = avoid.slice(0, MAX_AVOID).map(({ dir, angle }) => ({ dir: dir.clone().normalize(), angle }));
  // spin : sens de rotation des nuages par rapport à la planète. Par défaut autour de l'axe Y de la planète ; une page
  // peut donner un axe du monde (axis) pour qu'ils filent à contre-sens de la rotation qu'elle donne au globe.
  clouds.userData.spin = { axis: null, rate: CLOUD_SPEED };
  const axis = new THREE.Vector3();
  const parentQuat = new THREE.Quaternion();
  const turn = new THREE.Quaternion();
  const inverse = new THREE.Quaternion();
  let last = performance.now();
  clouds.onBeforeRender = () => {
    const now = performance.now();
    const dt = Math.min(0.1, (now - last) / 1000);
    if (dt <= 0) return; // déjà mis à jour pour cette image
    last = now;
    const { axis: worldAxis, rate } = clouds.userData.spin;
    if (worldAxis && clouds.parent) {
      clouds.parent.getWorldQuaternion(parentQuat);
      axis.copy(worldAxis).applyQuaternion(parentQuat.invert()).normalize();
    } else axis.copy(up);
    clouds.quaternion.premultiply(turn.setFromAxisAngle(axis, rate * dt));
    // Les zones à éviter sont fixes sur la planète : on les ramène dans le repère des nuages.
    inverse.copy(clouds.quaternion).invert();
    local.forEach(({ dir, angle }, i) => {
      const t = d.copy(dir).applyQuaternion(inverse);
      avoidUniform.value[i].set(t.x, t.y, t.z, clouds.userData.clearPath ? angle : -1);
    });
  };
  return clouds;
}

// Ombres : le décor en porte, le globe et le décor en reçoivent ; les nuages n'en portent pas (taches sur l'eau).
export function enableShadows(root) {
  root.traverse((o) => {
    if (!o.isMesh) return;
    const ownMaterial = Array.isArray(o.material) ? o.material[0] : o.material;
    if (ownMaterial && (ownMaterial.isMeshBasicMaterial || ownMaterial.isShaderMaterial)) return;
    o.receiveShadow = true;
    o.castShadow = o.name !== 'globe' && o.name !== 'nuages';
  });
}
