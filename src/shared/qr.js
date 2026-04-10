import { pseudoRandom } from "./math.js";

const qrImageCache = new Set();
const qrImagePending = new Map();

export function hasQrImageCached(src) {
  return Boolean(src) && qrImageCache.has(src);
}

export function buildQrParticleSeeds(count = 20) {
  return Array.from({ length: count }, (_, index) => {
    const base = index + 1;
    const x = 8 + pseudoRandom(base * 1.9) * 78;
    const y = 8 + pseudoRandom(base * 2.3) * 78;
    const size = 4.2 + pseudoRandom(base * 2.7) * 5.4;
    const lift = 12 + pseudoRandom(base * 3.1) * 28;
    const drift = (pseudoRandom(base * 3.7) - 0.5) * 22;
    const spin = (pseudoRandom(base * 4.3) - 0.5) * 34;
    const tone = pseudoRandom(base * 4.9);
    const phase = y / 100;
    const noise = pseudoRandom(base * 5.7);

    return {
      x,
      y,
      size,
      lift,
      drift,
      spin,
      tone,
      phase,
      noise,
    };
  });
}

export function preloadQrImage(src) {
  if (!src) {
    return Promise.resolve(false);
  }

  if (qrImageCache.has(src)) {
    return Promise.resolve(true);
  }

  const pending = qrImagePending.get(src);

  if (pending) {
    return pending;
  }

  const task = new Promise((resolve) => {
    const image = new Image();

    image.decoding = "async";
    image.referrerPolicy = "no-referrer";
    image.onload = () => {
      qrImageCache.add(src);
      qrImagePending.delete(src);
      resolve(true);
    };
    image.onerror = () => {
      qrImagePending.delete(src);
      resolve(false);
    };
    image.src = src;
  });

  qrImagePending.set(src, task);

  return task;
}
