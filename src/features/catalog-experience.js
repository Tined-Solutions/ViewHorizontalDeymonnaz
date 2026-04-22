import { React, create, motion, useReducedMotion } from "../runtime/react-motion.js";
import { baseTitle } from "../constants/ui.js";
import { buildQrUrl, resolveInitialPropertyIndex } from "../shared/catalog.js?v=20260411-03";
import { resolveDuracionYComportamiento } from "../shared/rotation.js?v=20260422-01";
import { DEFAULT_MEDIA_VISUAL, buildPanelVisual, resolveImageVisual } from "../shared/media-visual.js?v=20260411-03";
import { hasQrImageCached, preloadQrImage } from "../shared/qr.js?v=20260411-03";
import { BackgroundOrbs } from "../ui/background-orbs.js?v=20260411-03";
import { MediaStage } from "../ui/media-stage.js?v=20260411-03";
import { PropertyPanel } from "../ui/property-panel.js?v=20260411-03";

export function CatalogExperience({ catalog, utils, siteBaseUrl, defaultDurationMs, tiempoVisualizacionSegundos, performanceMode, panelRevealDelayMs, dynamicPanelBlur }) {
  const reduceMotion = Boolean(useReducedMotion());
  const properties = Array.isArray(catalog.properties) ? catalog.properties : [];
  const companyName = catalog.company?.name || "";
  const visualTheme = catalog && catalog.visualTheme && typeof catalog.visualTheme === "object" ? catalog.visualTheme : null;
  const [propertyIndex, setPropertyIndex] = React.useState(() => resolveInitialPropertyIndex(catalog));
  const [mediaIndex, setMediaIndex] = React.useState(0);
  const [panelDelayDone, setPanelDelayDone] = React.useState(() => Boolean(reduceMotion || performanceMode));
  const [qrReady, setQrReady] = React.useState(() => Boolean(reduceMotion || performanceMode));
  const [panelVisual, setPanelVisual] = React.useState(() => buildPanelVisual(DEFAULT_MEDIA_VISUAL, performanceMode));
  const videoFallbackTimerRef = React.useRef(0);

  const property = properties[propertyIndex] || null;
  const media = property && Array.isArray(property.media) ? property.media[mediaIndex] || property.media[0] || null : null;
  const duracionYComportamiento = resolveDuracionYComportamiento(property, tiempoVisualizacionSegundos);
  const shouldWaitForVideoEnd = Boolean(media && media.type === "video" && duracionYComportamiento.reproducirVideoCompleto);
  const activeTheme = visualTheme || (property && property.theme) || null;
  const mediaPerspective = performanceMode ? "1650px" : "1450px";
  const qrUrl = property ? buildQrUrl(property, siteBaseUrl) : "";
  const panelVisible = Boolean(property) && panelDelayDone && (reduceMotion || performanceMode || qrReady);

  React.useEffect(() => {
    document.documentElement.classList.toggle("tv-performance-mode", Boolean(performanceMode));

    return () => {
      document.documentElement.classList.remove("tv-performance-mode");
    };
  }, [performanceMode]);

  React.useEffect(() => {
    let active = true;

    const defaultVisual = buildPanelVisual(DEFAULT_MEDIA_VISUAL, performanceMode);

    if (performanceMode || !dynamicPanelBlur) {
      setPanelVisual(defaultVisual);
      return () => {
        active = false;
      };
    }

    const sampleSource = media
      ? media.type === "video"
        ? media.poster || media.src
        : media.src
      : "";

    if (!sampleSource) {
      setPanelVisual(defaultVisual);
      return () => {
        active = false;
      };
    }

    resolveImageVisual(sampleSource, { performanceMode }).then((visual) => {
      if (!active) {
        return;
      }

      setPanelVisual(buildPanelVisual(visual, performanceMode));
    });

    return () => {
      active = false;
    };
  }, [dynamicPanelBlur, media && media.poster, media && media.src, media && media.type, performanceMode]);

  React.useEffect(() => {
    if (!property) {
      setPanelDelayDone(false);
      return undefined;
    }

    if (performanceMode) {
      setPanelDelayDone(true);
      return undefined;
    }

    const revealDelay = reduceMotion
      ? 0
      : Number.isFinite(panelRevealDelayMs)
      ? Math.max(0, panelRevealDelayMs)
      : 1000;

    if (revealDelay <= 0) {
      setPanelDelayDone(true);
      return undefined;
    }

    setPanelDelayDone(false);

    const revealTimerId = window.setTimeout(() => {
      setPanelDelayDone(true);
    }, revealDelay);

    return () => {
      window.clearTimeout(revealTimerId);
    };
  }, [panelRevealDelayMs, property, propertyIndex, reduceMotion]);

  React.useEffect(() => {
    let active = true;

    if (!property || !qrUrl) {
      setQrReady(false);
      return () => {
        active = false;
      };
    }

    if (performanceMode) {
      setQrReady(true);
      return () => {
        active = false;
      };
    }

    if (hasQrImageCached(qrUrl)) {
      setQrReady(true);
      return () => {
        active = false;
      };
    }

    setQrReady(false);

    preloadQrImage(qrUrl).then(() => {
      if (active) {
        // If preload fails, we still reveal the panel and let the image request happen in-place.
        setQrReady(true);
      }
    });

    return () => {
      active = false;
    };
  }, [property, propertyIndex, qrUrl]);

  React.useEffect(() => {
    const selectedTheme = visualTheme || (property && property.theme) || null;

    if (selectedTheme) {
      utils.applyTheme(selectedTheme);
    }

    if (!property) {
      document.title = baseTitle;
      return;
    }

    document.title = companyName ? `${companyName} | ${property.title || property.name}` : property.title || property.name;
  }, [companyName, property, utils, visualTheme]);

  const clearVideoFallbackTimer = React.useCallback(() => {
    if (videoFallbackTimerRef.current) {
      window.clearTimeout(videoFallbackTimerRef.current);
      videoFallbackTimerRef.current = 0;
    }
  }, []);

  const advanceToNextSlide = React.useCallback(() => {
    if (properties.length === 0) {
      return;
    }

    setPropertyIndex((value) => (value + 1) % properties.length);
    setMediaIndex(0);
  }, [properties.length]);

  const scheduleVideoFallbackAdvance = React.useCallback(() => {
    clearVideoFallbackTimer();
    videoFallbackTimerRef.current = window.setTimeout(() => {
      advanceToNextSlide();
    }, duracionYComportamiento.duracionMs);
  }, [advanceToNextSlide, clearVideoFallbackTimer, duracionYComportamiento.duracionMs]);

  React.useEffect(() => {
    if (!property || !Array.isArray(property.media) || property.media.length === 0) {
      return;
    }

    if (performanceMode) {
      return;
    }

    const currentMedia = property.media[mediaIndex] || property.media[0];
    const nextMedia = property.media[(mediaIndex + 1) % property.media.length];
    const nextProperty = properties[(propertyIndex + 1) % properties.length];

    utils.preloadMedia(currentMedia);
    utils.preloadMedia(nextMedia);

    if (nextProperty && Array.isArray(nextProperty.media) && nextProperty.media.length > 0) {
      utils.preloadMedia(nextProperty.media[0]);
    }
  }, [mediaIndex, performanceMode, propertyIndex, property, properties.length, utils]);

  React.useEffect(() => {
    if (!property || !media) {
      return undefined;
    }

    let timerId = 0;
    const slideDurationMs = Number.isFinite(duracionYComportamiento.duracionMs) && duracionYComportamiento.duracionMs > 0
      ? duracionYComportamiento.duracionMs
      : defaultDurationMs;

    const scheduleGlobalTimer = () => {
      window.clearTimeout(timerId);
      timerId = window.setTimeout(() => {
        advanceToNextSlide();
      }, slideDurationMs);
    };

    const schedule = () => {
      if (shouldWaitForVideoEnd) {
        scheduleVideoFallbackAdvance();
        return;
      }

      scheduleGlobalTimer();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        schedule();
        return;
      }

      window.clearTimeout(timerId);
      clearVideoFallbackTimer();
    };

    schedule();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearTimeout(timerId);
      clearVideoFallbackTimer();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [
    advanceToNextSlide,
    clearVideoFallbackTimer,
    defaultDurationMs,
    duracionYComportamiento.duracionMs,
    media,
    scheduleVideoFallbackAdvance,
    shouldWaitForVideoEnd,
    property,
  ]);

  const handleMediaEnded = React.useCallback(() => {
    if (!shouldWaitForVideoEnd) {
      return;
    }

    clearVideoFallbackTimer();
    advanceToNextSlide();
  }, [advanceToNextSlide, clearVideoFallbackTimer, shouldWaitForVideoEnd]);

  const handleMediaPlaybackStart = React.useCallback(() => {
    if (!shouldWaitForVideoEnd) {
      return;
    }

    clearVideoFallbackTimer();
  }, [clearVideoFallbackTimer, shouldWaitForVideoEnd]);

  const handleMediaPlaybackError = React.useCallback(() => {
    if (!shouldWaitForVideoEnd) {
      return;
    }

    scheduleVideoFallbackAdvance();
  }, [scheduleVideoFallbackAdvance, shouldWaitForVideoEnd]);

  return create(
    "div",
    { className: "experience-shell kiosk-shell" },
    performanceMode ? null : create(BackgroundOrbs, { reduceMotion }),
    create(
      motion.div,
      {
        className: "stage-frame kiosk-frame transform-gpu will-change-[transform,opacity]",
        initial: reduceMotion || performanceMode ? { opacity: 1 } : { opacity: 0, y: 14, scale: 0.99 },
        animate: reduceMotion || performanceMode
          ? { opacity: 1 }
          : { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 90, damping: 18 } },
      },
      create(
        "div",
        { className: "media-stage-shell" },
        create(
          "div",
          { className: "media-stage", style: reduceMotion ? undefined : { perspective: mediaPerspective } },
          create(MediaStage, {
            property,
            media,
            reduceMotion,
            performanceMode,
            onMediaEnded: handleMediaEnded,
            onMediaPlaybackStart: handleMediaPlaybackStart,
            onMediaPlaybackError: handleMediaPlaybackError,
          })
        ),
        create("div", { className: "media-stage__overlay" }),
        performanceMode ? null : create("div", { className: "media-stage__glow" })
      ),
      panelVisible ? create(PropertyPanel, { property, siteBaseUrl, qrUrl, utils, reduceMotion, performanceMode, panelVisual, activeTheme }) : null
    )
  );
}
