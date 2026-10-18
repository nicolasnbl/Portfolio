export const clamp01 = (x) => Math.min(1, Math.max(0, x));
export const lerp = (a, b, t) => a + (b - a) * t;

// Progression 0..1 de t dans l'intervalle [start, end].
export const progress = (t, start, end) => clamp01((t - start) / (end - start));

export const easeInOutCubic = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
export const easeOutCubic = (x) => 1 - Math.pow(1 - x, 3);
export const smoothstep = (x) => x * x * (3 - 2 * x);

// Générateur pseudo-aléatoire déterministe, pour que le décor soit identique à chaque visite.
export function seededRandom(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
