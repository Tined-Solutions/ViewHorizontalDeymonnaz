import { React, AnimatePresence, create, motion } from "../runtime/react-motion.js";
import { clampNumber } from "../shared/math.js";

export function MediaStage({ property, media, reduceMotion, performanceMode, onMediaDurationChange }) {
  const isVideo = Boolean(media && media.type === "video");
  const mediaSrc = media && media.src ? media.src : "";
  const videoRef = React.useRef(null);
  const mediaDurationMs = Number.isFinite(media && media.duration) && media.duration > 0 ? media.duration : 20000;
  const holdDurationSeconds = clampNumber(mediaDurationMs / 1000, 8, 26);
  const enterDuration = performanceMode ? 0.66 : 0.86;
  const exitDuration = performanceMode ? 0.46 : 0.58;
  const isHlsSource = Boolean(isVideo && mediaSrc && /(?:\.m3u8(?:$|\?)|\.mpd(?:$|\?)|stream\.mux\.com)/i.test(mediaSrc));
  const canPlayNativeHls = Boolean(
    isHlsSource && typeof document !== "undefined" && document.createElement("video").canPlayType("application/vnd.apple.mpegurl")
  );
  const shouldAttachHls = Boolean(isHlsSource && !canPlayNativeHls && typeof window !== "undefined" && window.Hls && typeof window.Hls.isSupported === "function" && window.Hls.isSupported());

  React.useEffect(() => {
    if (!isVideo || !isHlsSource || !shouldAttachHls) {
      return undefined;
    }

    const videoElement = videoRef.current;
    const Hls = window.Hls;

    if (!videoElement || !Hls || typeof Hls.isSupported !== "function" || !Hls.isSupported()) {
      return undefined;
    }

    const hls = new Hls({ enableWorker: true, lowLatencyMode: false });

    hls.loadSource(mediaSrc);
    hls.attachMedia(videoElement);
    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      videoElement.play().catch(() => {});
    });
    hls.on(Hls.Events.ERROR, (_event, data) => {
      if (data && data.fatal) {
        hls.destroy();
      }
    });

    return () => {
      hls.destroy();
    };
  }, [isHlsSource, isVideo, mediaSrc, shouldAttachHls]);

  const mediaVariants = reduceMotion
    ? {
        hidden: { opacity: 0 },
        visible: { opacity: 1 },
        exit: { opacity: 0 },
      }
    : isVideo
      ? {
          hidden: {
            opacity: 0,
          },
          visible: {
            opacity: 1,
            transition: {
              opacity: { duration: enterDuration, ease: "easeOut" },
            },
          },
          exit: {
            opacity: 0,
            transition: {
              opacity: { duration: exitDuration, ease: "easeIn" },
            },
          },
        }
      : {
          hidden: {
            opacity: 0.9,
            x: "18%",
            scale: 1.18,
          },
          visible: {
            opacity: 1,
            x: 0,
            scale: [1.18, 1],
            transition: {
              x: { duration: enterDuration, ease: [0.16, 0.72, 0.22, 1] },
              opacity: { duration: enterDuration, ease: "easeOut" },
              scale: { duration: holdDurationSeconds, ease: "linear", times: [0, 1] },
            },
          },
          exit: {
            opacity: 0.82,
            x: "-24%",
            scale: 0.986,
            transition: {
              x: { duration: exitDuration, ease: [0.58, 0.02, 0.96, 0.46] },
              opacity: { duration: exitDuration, ease: "easeIn" },
              scale: { duration: exitDuration, ease: "easeInOut" },
            },
          },
        };

  if (!media) {
    return create(
      motion.div,
      {
        className: "media-stage__item",
        initial: reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 1.02 },
        animate: reduceMotion
          ? { opacity: 1 }
          : { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 90, damping: 18 } },
      },
      create(
        "div",
        {
          className:
            "flex h-full w-full items-center justify-center bg-[linear-gradient(135deg,rgba(255,255,255,0.08),rgba(0,0,0,0.35))] p-8 text-center",
        },
        create("div", null, create("p", { className: "text-[10px] uppercase tracking-[0.4em] text-white/45" }, "Media no disponible"), create("p", { className: "mt-3 text-xl font-semibold text-white" }, property ? property.name : "Sin contenido"))
      )
    );
  }

  return create(
    AnimatePresence,
    { mode: "sync", initial: false },
    create(
      motion.div,
      {
        key: mediaSrc,
        className: "media-stage__item",
        style: reduceMotion || isVideo ? undefined : { transformOrigin: "center center", willChange: "transform, opacity" },
        variants: mediaVariants,
        initial: "hidden",
        animate: "visible",
        exit: "exit",
      },
      media.type === "video"
        ? create("video", {
            src: shouldAttachHls ? undefined : mediaSrc,
            poster: media.poster || "",
            autoPlay: true,
            muted: true,
            loop: false,
            playsInline: true,
            preload: "metadata",
            "aria-label": media.caption ? `${property.name} - ${media.caption}` : property.name,
            ref: videoRef,
            onLoadedMetadata: (event) => {
              if (typeof onMediaDurationChange !== "function") {
                return;
              }

              const durationSeconds = Number(event.currentTarget && event.currentTarget.duration);

              if (Number.isFinite(durationSeconds) && durationSeconds > 0) {
                onMediaDurationChange(Math.round(durationSeconds * 1000));
              }
            },
            onDurationChange: (event) => {
              if (typeof onMediaDurationChange !== "function") {
                return;
              }

              const durationSeconds = Number(event.currentTarget && event.currentTarget.duration);

              if (Number.isFinite(durationSeconds) && durationSeconds > 0) {
                onMediaDurationChange(Math.round(durationSeconds * 1000));
              }
            },
            style: reduceMotion ? undefined : { backfaceVisibility: "hidden" },
          })
        : create("img", {
            src: media.src,
            alt: media.caption ? `${property.name} - ${media.caption}` : property.name,
            loading: "eager",
            decoding: "async",
            fetchPriority: "high",
            draggable: false,
            referrerPolicy: "no-referrer",
            style: reduceMotion ? undefined : { backfaceVisibility: "hidden", transform: "translateZ(0)" },
          }),
      !reduceMotion
        ? create(motion.span, {
            "aria-hidden": true,
            initial: { opacity: 0.04 },
            animate: {
              opacity: [0.04, performanceMode ? 0.16 : 0.22],
              transition: { duration: holdDurationSeconds, ease: "linear", times: [0, 1] },
            },
            exit: { opacity: 0.28, transition: { duration: exitDuration, ease: "easeIn" } },
            style: {
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              zIndex: 1,
              background: "linear-gradient(180deg, rgba(6,12,20,0.04) 0%, rgba(6,12,20,0.22) 56%, rgba(6,12,20,0.48) 100%)",
              mixBlendMode: "multiply",
            },
          })
        : null,
      !reduceMotion
        ? create(motion.span, {
            "aria-hidden": true,
            initial: { opacity: 0.12, x: -10 },
            animate: { opacity: 0.3, x: 0, transition: { duration: 0.52, ease: "easeOut" } },
            exit: { opacity: 0.56, x: 28, transition: { duration: 0.48, ease: "easeIn" } },
            style: {
              position: "absolute",
              top: 0,
              bottom: 0,
              left: 0,
              width: performanceMode ? "30%" : "36%",
              pointerEvents: "none",
              zIndex: 2,
              background: "linear-gradient(90deg, rgba(7,14,30,0.72) 0%, rgba(7,14,30,0.3) 44%, rgba(7,14,30,0) 100%)",
              mixBlendMode: "multiply",
            },
          })
        : null,
      !reduceMotion && !performanceMode
        ? create(motion.span, {
            "aria-hidden": true,
            initial: { opacity: 0, x: -6 },
            animate: { opacity: 0.34, x: 0, transition: { duration: 0.5, ease: "easeOut" } },
            exit: { opacity: 0.18, x: 14, transition: { duration: 0.44, ease: "easeIn" } },
            style: {
              position: "absolute",
              top: 0,
              bottom: 0,
              left: 0,
              width: "2px",
              pointerEvents: "none",
              zIndex: 2,
              background: "linear-gradient(180deg, rgba(255,255,255,0.58) 0%, rgba(255,255,255,0.2) 35%, rgba(255,255,255,0) 100%)",
            },
          })
        : null
    )
  );
}
