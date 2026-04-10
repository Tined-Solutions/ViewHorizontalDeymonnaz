import { clampNumber, mixChannel } from "./math.js";

export const DEFAULT_MEDIA_VISUAL = Object.freeze({
  brightness: 132,
  red: 120,
  green: 186,
  blue: 224,
  saturation: 0.42,
});

const mediaVisualCache = new Map();
const mediaVisualPending = new Map();

function normalizeMediaVisual(visual) {
  const source = visual && typeof visual === "object" ? visual : {};

  return {
    brightness: clampNumber(Math.round(Number(source.brightness) || DEFAULT_MEDIA_VISUAL.brightness), 0, 255),
    red: clampNumber(Math.round(Number(source.red) || DEFAULT_MEDIA_VISUAL.red), 0, 255),
    green: clampNumber(Math.round(Number(source.green) || DEFAULT_MEDIA_VISUAL.green), 0, 255),
    blue: clampNumber(Math.round(Number(source.blue) || DEFAULT_MEDIA_VISUAL.blue), 0, 255),
    saturation: clampNumber(Number(source.saturation), 0, 1) || DEFAULT_MEDIA_VISUAL.saturation,
  };
}

export function buildPanelVisual(visual, performanceMode) {
  const safeVisual = normalizeMediaVisual(
    typeof visual === "number"
      ? {
          brightness: visual,
        }
      : visual
  );
  const normalizedBrightness = clampNumber((safeVisual.brightness - 44) / 196, 0, 1);
  const normalizedSaturation = clampNumber(safeVisual.saturation, 0, 1);
  const blurBase = performanceMode ? 12 : 14;
  const blurRange = performanceMode ? 18 : 24;
  const blurInfluence = (1 - normalizedBrightness) * (0.62 + normalizedSaturation * 0.48);
  const saturationBase = performanceMode ? 104 : 108;
  const saturationRange = performanceMode ? 24 : 34;
  const tintWeight = 0.3 + normalizedSaturation * 0.42;
  const tintRed = mixChannel(110, safeVisual.red, tintWeight);
  const tintGreen = mixChannel(176, safeVisual.green, tintWeight);
  const tintBlue = mixChannel(224, safeVisual.blue, tintWeight);
  const tintRgb = `${tintRed}, ${tintGreen}, ${tintBlue}`;
  const priceTop = `rgb(${mixChannel(248, tintRed, 0.18)}, ${mixChannel(252, tintGreen, 0.18)}, ${mixChannel(255, tintBlue, 0.18)})`;
  const priceMid = `rgb(${mixChannel(214, tintRed, 0.55)}, ${mixChannel(226, tintGreen, 0.55)}, ${mixChannel(245, tintBlue, 0.55)})`;
  const priceBottom = `rgb(${mixChannel(166, tintRed, 0.72)}, ${mixChannel(186, tintGreen, 0.72)}, ${mixChannel(218, tintBlue, 0.72)})`;

  return {
    blurPx: Math.round(blurBase + blurRange * blurInfluence),
    saturation: Math.round(saturationBase + normalizedSaturation * saturationRange),
    bgAlpha: Number((0.6 + normalizedSaturation * 0.1 + (1 - normalizedBrightness) * 0.08).toFixed(3)),
    borderAlpha: Number((0.09 + normalizedSaturation * 0.07 + normalizedBrightness * 0.03).toFixed(3)),
    tintRgb,
    tintAlpha: Number((0.08 + normalizedSaturation * 0.2).toFixed(3)),
    highlightAlpha: Number((0.12 + normalizedBrightness * 0.08).toFixed(3)),
    shadowAlpha: Number((0.16 + normalizedSaturation * 0.16).toFixed(3)),
    priceGradient: {
      top: priceTop,
      mid: priceMid,
      bottom: priceBottom,
    },
  };
}

export function resolveImageVisual(src) {
  if (!src) {
    return Promise.resolve(DEFAULT_MEDIA_VISUAL);
  }

  if (mediaVisualCache.has(src)) {
    return Promise.resolve(mediaVisualCache.get(src));
  }

  const pending = mediaVisualPending.get(src);

  if (pending) {
    return pending;
  }

  const task = new Promise((resolve) => {
    const image = new Image();

    image.crossOrigin = "anonymous";
    image.decoding = "async";
    image.referrerPolicy = "no-referrer";
    image.onload = () => {
      let brightness = DEFAULT_MEDIA_VISUAL.brightness;
      let redAverage = DEFAULT_MEDIA_VISUAL.red;
      let greenAverage = DEFAULT_MEDIA_VISUAL.green;
      let blueAverage = DEFAULT_MEDIA_VISUAL.blue;
      let saturation = DEFAULT_MEDIA_VISUAL.saturation;

      try {
        const sampleSize = 28;
        const canvas = document.createElement("canvas");
        canvas.width = sampleSize;
        canvas.height = sampleSize;

        const context = canvas.getContext("2d", { willReadFrequently: true });

        if (context) {
          context.drawImage(image, 0, 0, sampleSize, sampleSize);
          const pixels = context.getImageData(0, 0, sampleSize, sampleSize).data;

          let lumaSum = 0;
          let redSum = 0;
          let greenSum = 0;
          let blueSum = 0;
          let count = 0;

          for (let index = 0; index < pixels.length; index += 16) {
            const alpha = pixels[index + 3];

            if (alpha < 16) {
              continue;
            }

            const red = pixels[index];
            const green = pixels[index + 1];
            const blue = pixels[index + 2];
            lumaSum += red * 0.2126 + green * 0.7152 + blue * 0.0722;
            redSum += red;
            greenSum += green;
            blueSum += blue;
            count += 1;
          }

          if (count > 0) {
            brightness = lumaSum / count;
            redAverage = redSum / count;
            greenAverage = greenSum / count;
            blueAverage = blueSum / count;
            const maxChannel = Math.max(redAverage, greenAverage, blueAverage);
            const minChannel = Math.min(redAverage, greenAverage, blueAverage);
            saturation = maxChannel <= 0 ? 0 : (maxChannel - minChannel) / maxChannel;
          }
        }
      } catch {
        brightness = DEFAULT_MEDIA_VISUAL.brightness;
      }

      const safeVisual = normalizeMediaVisual({
        brightness,
        red: redAverage,
        green: greenAverage,
        blue: blueAverage,
        saturation,
      });
      mediaVisualCache.set(src, safeVisual);
      mediaVisualPending.delete(src);
      resolve(safeVisual);
    };
    image.onerror = () => {
      mediaVisualPending.delete(src);
      mediaVisualCache.set(src, DEFAULT_MEDIA_VISUAL);
      resolve(DEFAULT_MEDIA_VISUAL);
    };
    image.src = src;
  });

  mediaVisualPending.set(src, task);

  return task;
}
