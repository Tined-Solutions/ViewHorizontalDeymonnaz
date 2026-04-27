// @ts-check

/** @typedef {"completo" | "ajustar_tiempo_global"} ModoReproduccionVideo */

/**
 * @typedef {Object} RotacionItem
 * @property {string | null | undefined} [modoReproduccionVideo]
 * @property {string | null | undefined} [videoUrl]
 * @property {Array<{ type?: string | null | undefined, src?: string | null | undefined }> | null | undefined} [media]
 */

/**
 * @typedef {Object} DuracionYComportamiento
 * @property {number} duracionMs
 * @property {boolean} reproducirVideoCompleto
 * @property {string | null} videoUrl
 * @property {ModoReproduccionVideo} modoReproduccionVideo
 */

const DEFAULT_TIEMPO_GLOBAL_SEGUNDOS = 15;
const DEFAULT_TIEMPO_GLOBAL_MS = DEFAULT_TIEMPO_GLOBAL_SEGUNDOS * 1000;

/**
 * @param {unknown} tiempoGlobal
 * @returns {number}
 */
function normalizeTiempoGlobalMs(tiempoGlobal) {
  const numeric = Number(String(tiempoGlobal ?? "").replace(",", "."));

  if (!Number.isFinite(numeric) || numeric <= 0) {
    return DEFAULT_TIEMPO_GLOBAL_MS;
  }

  // If a legacy caller still provides milliseconds, keep it stable.
  if (numeric >= 1000) {
    return Math.round(numeric);
  }

  return Math.round(numeric * 1000);
}

/**
 * @param {unknown} value
 * @returns {ModoReproduccionVideo}
 */
function normalizeModoReproduccionVideo(value) {
  const mode = String(value ?? "").trim().toLowerCase();

  if (mode === "completo") {
    return "completo";
  }

  return "ajustar_tiempo_global";
}

/**
 * @param {unknown} value
 * @returns {string | null}
 */
function sanitizeVideoUrl(value) {
  const text = String(value ?? "").trim();

  if (!text) {
    return null;
  }

  try {
    const resolved = new URL(text, window.location.href);

    if (resolved.protocol !== "http:" && resolved.protocol !== "https:") {
      return null;
    }

    return resolved.toString();
  } catch {
    return null;
  }
}

/**
 * @param {RotacionItem | null | undefined} item
 * @returns {string | null}
 */
function resolveVideoUrl(item) {
  const directUrl = sanitizeVideoUrl(item && item.videoUrl);

  if (directUrl) {
    return directUrl;
  }

  const mediaItems = Array.isArray(item && item.media) ? item.media : [];
  const firstVideo = mediaItems.find((mediaItem) => mediaItem && mediaItem.type === "video" && mediaItem.src);

  return sanitizeVideoUrl(firstVideo && firstVideo.src);
}

/**
 * @param {RotacionItem | null | undefined} item
 * @param {number | string | null | undefined} tiempoGlobal
 * @returns {DuracionYComportamiento}
 */
export function resolveDuracionYComportamiento(item, tiempoGlobal) {
  const duracionMs = normalizeTiempoGlobalMs(tiempoGlobal);
  const videoUrl = resolveVideoUrl(item);
  const modoReproduccionVideo = normalizeModoReproduccionVideo(item && item.modoReproduccionVideo);
  const reproducirVideoCompleto = Boolean(videoUrl && modoReproduccionVideo === "completo");

  return {
    duracionMs,
    reproducirVideoCompleto,
    videoUrl,
    modoReproduccionVideo,
  };
}
