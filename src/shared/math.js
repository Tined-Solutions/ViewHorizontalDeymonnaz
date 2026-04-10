export function clampNumber(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function pseudoRandom(seed) {
  const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453123;
  return value - Math.floor(value);
}

export function mixChannel(base, target, weight) {
  return Math.round(clampNumber(base * (1 - weight) + target * weight, 0, 255));
}
