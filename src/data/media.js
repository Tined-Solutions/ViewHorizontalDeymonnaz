import { clampNumber, toPositiveInteger } from './mappers.js';
import { toText, toArray, normalizeMediaItem } from './utils.js';

export function safeUrl(value) {
    if (!value) {
      return "";
    }

    if (typeof value === "object") {
      if (typeof value.url === "string") {
        return safeUrl(value.url);
      }

      if (typeof value.src === "string") {
        return safeUrl(value.src);
      }

      if (value.asset && typeof value.asset.url === "string") {
        return safeUrl(value.asset.url);
      }

      if (value.image && value.image.asset && typeof value.image.asset.url === "string") {
        return safeUrl(value.image.asset.url);
      }

      if (value.video && value.video.asset && typeof value.video.asset.url === "string") {
        return safeUrl(value.video.asset.url);
      }

      if (value.file && value.file.asset && typeof value.file.asset.url === "string") {
        return safeUrl(value.file.asset.url);
      }
    }

    const text = toText(value);

    if (!text) {
      return "";
    }

    try {
      const url = new URL(text, window.location.href);

      if (!["http:", "https:", "data:"].includes(url.protocol)) {
        return "";
      }

      return url.href;
    } catch {
      return "";
    }
  }

export function inferMediaType(explicitType, src) {
    const type = toText(explicitType).toLowerCase();

    if (type === "video" || type === "image") {
      return type;
    }

    const lowerSrc = toText(src).split("?")[0].toLowerCase();

    return /\.(mp4|webm|mov|m4v)$/i.test(lowerSrc) ? "video" : "image";
  }

export function isSanityImageUrl(url) {
    try {
      const parsed = new URL(url);
      return parsed.hostname === "cdn.sanity.io" && /\/images\//.test(parsed.pathname);
    } catch {
      return false;
    }
  }

export function optimizeImageUrl(src, config = {}) {
    const safeSrc = safeUrl(src);

    if (!safeSrc || !isSanityImageUrl(safeSrc)) {
      return safeSrc;
    }

    try {
      const url = new URL(safeSrc);
      const format = toText(config.imageFormat || "auto").toLowerCase();

      if (format === "original" || format === "none") {
        url.searchParams.delete("auto");
        url.searchParams.delete("fm");
      } else if (format === "webp" || format === "auto" || format === "format") {
        url.searchParams.delete("fm");
        url.searchParams.set("auto", "format");
      } else {
        url.searchParams.delete("auto");
        url.searchParams.set("fm", format);
      }

      const quality = clampNumber(toPositiveInteger(config.imageQuality, 72), 45, 90);
      const maxWidth = clampNumber(toPositiveInteger(config.imageMaxWidth, 2160), 640, 4096);
      const maxHeight = clampNumber(toPositiveInteger(config.imageMaxHeight, 3840), 640, 4096);

      url.searchParams.set("fit", "max");
      url.searchParams.set("q", String(quality));
      url.searchParams.set("w", String(maxWidth));
      url.searchParams.set("h", String(maxHeight));

      return url.toString();
    } catch {
      return safeSrc;
    }
  }

export function normalizeMedia(media, totalDurationMs, config = {}) {
    const items = toArray(media)
      .map((item) => normalizeMediaItem(item, config))
      .filter((item) => item && item.src);

    if (items.length > 0) {
      const derivedDuration = Math.max(1000, Math.round(totalDurationMs / items.length));

      items.forEach((item) => {
        if (!item.duration) {
          item.duration = derivedDuration;
        }
      });
    }

    return items;
  }