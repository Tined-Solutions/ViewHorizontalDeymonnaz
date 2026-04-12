import { React, AnimatePresence, LayoutGroup, create, fragment, motion, useSpring, useTime, useTransform, useVelocity } from "../runtime/react-motion.js";
import { clampNumber } from "../shared/math.js";
import { hexToRgbString } from "../shared/color.js";
import { normalizeComparableText, summaryIsRedundant, proceduralDelay } from "../shared/text.js";
import { buildQrUrl } from "../shared/catalog.js";
import { buildQrParticleSeeds } from "../shared/qr.js";

function AnimatedBlock({ as = "div", className, children, reduceMotion, delay = 0, y = 14, transition = {}, style = {}, ...rest }) {
  const MotionTag = motion[as] || motion.div;
  const motionClassName = className ? `${className} transform-gpu will-change-[transform,opacity]` : "transform-gpu will-change-[transform,opacity]";

  if (reduceMotion) {
    const { layout, layoutId, transition: motionTransition, initial, animate, exit, variants, ...domProps } = rest;

    return create(
      as,
      {
        className: motionClassName,
        style,
        ...domProps,
      },
      children
    );
  }

  const initialState = reduceMotion ? { opacity: 0 } : { opacity: 0, y };
  const animateState = reduceMotion
    ? { opacity: 1 }
    : {
        opacity: 1,
        y: 0,
        transition: { duration: 0.28, ease: "easeOut", delay, ...transition },
      };
  const exitState = reduceMotion
    ? { opacity: 0 }
    : {
        opacity: 0,
        y: Math.max(0, y * 0.4),
        transition: { duration: 0.2, ease: "easeIn" },
      };

  return create(
    MotionTag,
    {
      className: motionClassName,
      style,
      initial: initialState,
      animate: animateState,
      exit: exitState,
      ...rest,
    },
    children
  );
}

function PanelAtmosphere({ reduceMotion, performanceMode, panelVisual, activeTheme }) {
  if (reduceMotion || performanceMode) {
    return null;
  }

  const atmosphereRgb = activeTheme
    ? hexToRgbString(activeTheme.secondary || activeTheme.primary || activeTheme.tertiary, "")
    : "var(--accent-2-rgb)";
  const haloBaseAlpha = panelVisual && Number.isFinite(panelVisual.highlightAlpha) ? panelVisual.highlightAlpha : 0.14;
  const beamBaseAlpha = panelVisual && Number.isFinite(panelVisual.tintAlpha) ? panelVisual.tintAlpha : 0.1;
  const haloInnerAlpha = clampNumber(haloBaseAlpha * 1.45, 0.1, 0.36);
  const haloOuterAlpha = clampNumber(haloBaseAlpha * 0.72, 0.05, 0.22);
  const beamMidAlpha = clampNumber(beamBaseAlpha * 1.05, 0.05, 0.2);
  const beamPeakAlpha = clampNumber(beamBaseAlpha * 1.35, 0.08, 0.26);
  const time = useTime();
  const driftSource = useTransform(() => {
    if (reduceMotion) {
      return 0;
    }

    const period = performanceMode ? 2600 : 1850;
    const amplitude = performanceMode ? 8 : 14;
    return Math.sin(time.get() / period) * amplitude;
  });
  const drift = useSpring(driftSource, {
    stiffness: performanceMode ? 42 : 58,
    damping: performanceMode ? 26 : 21,
    mass: 0.85,
  });
  const reverseDrift = useTransform(drift, (value) => value * -0.65);
  const driftVelocity = useVelocity(drift);
  const haloScale = useTransform(driftVelocity, [-60, 0, 60], [0.985, 1.025, 0.985]);
  const haloOpacity = useTransform(() => {
    if (reduceMotion) {
      return clampNumber(haloBaseAlpha * 0.8, 0.06, 0.22);
    }

    return clampNumber(haloBaseAlpha * 0.62 + ((Math.sin(time.get() / 1500) + 1) * 0.5) * haloBaseAlpha * 0.7, 0.05, 0.36);
  });
  const beamOpacity = useTransform(() => {
    if (reduceMotion) {
      return clampNumber(beamBaseAlpha * 0.72, 0.04, 0.18);
    }

    return clampNumber(beamBaseAlpha * 0.52 + ((Math.cos(time.get() / 2050) + 1) * 0.5) * beamBaseAlpha * 0.84, 0.04, 0.24);
  });

  return create(
    fragment,
    null,
    create(motion.span, {
      className:
        "pointer-events-none absolute inset-x-[-18%] top-[-24%] z-0 h-[58%] rounded-[44%] mix-blend-screen transform-gpu will-change-[transform,opacity]",
      "aria-hidden": true,
      style: {
        background: `radial-gradient(circle at 50% 45%, rgba(${atmosphereRgb}, ${haloInnerAlpha}) 0%, rgba(${atmosphereRgb}, ${haloOuterAlpha}) 36%, transparent 76%)`,
        x: drift,
        scale: haloScale,
        opacity: haloOpacity,
      },
    }),
    create(motion.span, {
      className:
        "pointer-events-none absolute inset-x-[-28%] bottom-[-42%] z-0 h-[70%] blur-[2px] mix-blend-screen transform-gpu will-change-[transform,opacity]",
      "aria-hidden": true,
      style: {
        background: `linear-gradient(120deg, rgba(${atmosphereRgb}, 0) 0%, rgba(${atmosphereRgb}, ${beamMidAlpha}) 34%, rgba(${atmosphereRgb}, ${beamPeakAlpha}) 50%, rgba(${atmosphereRgb}, ${beamMidAlpha}) 66%, rgba(${atmosphereRgb}, 0) 100%)`,
        x: reverseDrift,
        opacity: beamOpacity,
      },
    })
  );
}

function MetricTile({ metric, index, reduceMotion }) {
  if (!metric) {
    return null;
  }

  if (reduceMotion) {
    return create(
      "div",
      { className: "tv-metric inline-flex w-auto max-w-full shrink-0 flex-col items-start self-start rounded-lg bg-white/[0.06] px-2 py-1.5 text-white/90" },
      create("div", { className: "text-[0.9rem] font-semibold leading-tight text-white sm:text-[0.96rem]" }, metric.value || ""),
      create("div", { className: "mt-1 text-[0.52rem] uppercase tracking-[0.18em] text-cyan-200/80" }, metric.label || "")
    );
  }

  const appearDelay = reduceMotion ? 0 : proceduralDelay(index, 0.02, 0.009);
  const startY = 6 + (index % 3) * 2;
  const startX = index % 2 === 0 ? -3 : 3;

  return create(
    motion.div,
    {
      className: "tv-metric transform-gpu will-change-[transform,opacity] inline-flex w-auto max-w-full shrink-0 flex-col items-start self-start rounded-lg bg-white/[0.06] px-2 py-1.5 text-white/90",
      layout: "position",
      transition: { layout: { type: "spring", stiffness: 220, damping: 30, mass: 0.78 } },
      initial: reduceMotion ? { opacity: 0 } : { opacity: 0, y: startY, x: startX, scale: 0.985 },
      animate: reduceMotion
        ? { opacity: 1 }
        : {
            opacity: 1,
            y: 0,
            x: 0,
            scale: 1,
            transition: { duration: 0.2, ease: "easeOut", delay: appearDelay },
          },
    },
    create("div", { className: "text-[0.9rem] font-semibold leading-tight text-white sm:text-[0.96rem]" }, metric.value || ""),
    create("div", { className: "mt-1 text-[0.52rem] uppercase tracking-[0.18em] text-cyan-200/80" }, metric.label || "")
  );
}

function resolveServiceIconKind(feature) {
  const normalized = normalizeComparableText(feature);

  if (!normalized) {
    return "generic";
  }

  if (/(agua|water|cisterna|tanque)/.test(normalized)) {
    return "water";
  }

  if (/(luz|electric|electricidad|energia)/.test(normalized)) {
    return "electric";
  }

  if (/(gas)/.test(normalized)) {
    return "fire";
  }

  if (/(internet|wifi|wi fi|fibra|web)/.test(normalized)) {
    return "wifi";
  }

  if (/(seguridad|security|alarma|camara|cctv)/.test(normalized)) {
    return "shield";
  }

  if (/(pileta|piscina|pool)/.test(normalized)) {
    return "pool";
  }

  if (/(parrilla|bbq|quincho)/.test(normalized)) {
    return "grill";
  }

  if (/(cochera|garage|parking)/.test(normalized)) {
    return "parking";
  }

  if (/(ascensor|elevator)/.test(normalized)) {
    return "lift";
  }

  if (/(aire|ac|climatizacion|calefaccion|heating)/.test(normalized)) {
    return "climate";
  }

  return "generic";
}

function ServiceIcon({ feature }) {
  const kind = resolveServiceIconKind(feature);
  const iconProps = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.9",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className: "h-[0.95rem] w-[0.95rem]",
  };

  if (kind === "water") {
    return create("svg", iconProps, create("path", { d: "M12 3.5c-2.7 3-5.4 6-5.4 9.3a5.4 5.4 0 0 0 10.8 0c0-3.3-2.7-6.3-5.4-9.3z" }));
  }

  if (kind === "electric") {
    return create("svg", iconProps, create("path", { d: "M13 2 5 14h6l-1 8 8-12h-6z" }));
  }

  if (kind === "fire") {
    return create("svg", iconProps, create("path", { d: "M12 3c1.6 2 3.7 4.3 3.7 7.1a3.7 3.7 0 0 1-7.4 0C8.3 7.8 10 6 12 3z" }), create("path", { d: "M12 13.2c.8.9 1.5 1.8 1.5 2.9a1.5 1.5 0 0 1-3 0c0-1.1.7-2 1.5-2.9z" }));
  }

  if (kind === "wifi") {
    return create(
      "svg",
      iconProps,
      create("path", { d: "M4.5 10.5a11 11 0 0 1 15 0" }),
      create("path", { d: "M7.4 13.3a7 7 0 0 1 9.2 0" }),
      create("path", { d: "M10.3 16.2a3 3 0 0 1 3.4 0" }),
      create("circle", { cx: "12", cy: "19", r: "0.9", fill: "currentColor", stroke: "none" })
    );
  }

  if (kind === "shield") {
    return create("svg", iconProps, create("path", { d: "M12 3 5.5 6v5.4c0 4.1 2.8 7.8 6.5 9.6 3.7-1.8 6.5-5.5 6.5-9.6V6z" }));
  }

  if (kind === "pool") {
    return create(
      "svg",
      iconProps,
      create("path", { d: "M3 17c1 0 1.4-.7 2.4-.7S6.8 17 7.8 17s1.4-.7 2.4-.7 1.4.7 2.4.7 1.4-.7 2.4-.7 1.4.7 2.4.7 1.4-.7 2.4-.7" }),
      create("path", { d: "M3 20c1 0 1.4-.7 2.4-.7s1.4.7 2.4.7 1.4-.7 2.4-.7 1.4.7 2.4.7 1.4-.7 2.4-.7 1.4.7 2.4.7 1.4-.7 2.4-.7" })
    );
  }

  if (kind === "grill") {
    return create("svg", iconProps, create("path", { d: "M6 9h12M8 9v7m4-7v7m4-7v7M5 16h14M8 21h8" }));
  }

  if (kind === "parking") {
    return create("svg", iconProps, create("rect", { x: "5", y: "3", width: "14", height: "18", rx: "2" }), create("path", { d: "M10 16V8h3.1a2.4 2.4 0 0 1 0 4.8H10" }));
  }

  if (kind === "lift") {
    return create("svg", iconProps, create("rect", { x: "7", y: "3", width: "10", height: "18", rx: "2" }), create("path", { d: "m12 7 1.8 2.2h-3.6zM12 17l-1.8-2.2h3.6z" }));
  }

  if (kind === "climate") {
    return create("svg", iconProps, create("path", { d: "M12 3v18M3 12h18M6.8 6.8l10.4 10.4M17.2 6.8 6.8 17.2" }));
  }

  return create("svg", iconProps, create("circle", { cx: "12", cy: "12", r: "2.2", fill: "currentColor", stroke: "none" }), create("path", { d: "M12 4v2M12 18v2M4 12h2M18 12h2" }));
}

function FeaturePill({ feature, index, reduceMotion }) {
  if (!feature) {
    return null;
  }

  if (reduceMotion) {
    return create(
      "span",
      {
        className: "tv-feature-pill transform-gpu will-change-[transform,opacity] inline-flex h-9 w-9 items-center justify-center rounded-full bg-cyan-100/12 text-cyan-50 shadow-[0_6px_18px_rgba(0,0,0,0.2)]",
        role: "img",
        "aria-label": feature,
        title: feature,
      },
      create("span", { className: "tv-service-icon inline-flex h-5 w-5 shrink-0 items-center justify-center text-cyan-100/95", "aria-hidden": true }, create(ServiceIcon, { feature }))
    );
  }

  const appearDelay = reduceMotion ? 0 : proceduralDelay(index, 0.015, 0.008);

  return create(
    motion.span,
    {
      className: "tv-feature-pill transform-gpu will-change-[transform,opacity] inline-flex h-9 w-9 items-center justify-center rounded-full bg-cyan-100/12 text-cyan-50 shadow-[0_6px_18px_rgba(0,0,0,0.2)]",
      layout: "position",
      transition: { layout: { type: "spring", stiffness: 230, damping: 31, mass: 0.78 } },
      role: "img",
      "aria-label": feature,
      title: feature,
      initial: reduceMotion ? { opacity: 0 } : { opacity: 0, y: 7, x: index % 2 === 0 ? -2 : 2, scale: 0.99 },
      animate: reduceMotion
        ? { opacity: 1 }
        : {
            opacity: 1,
            y: 0,
            x: 0,
            scale: 1,
            transition: { duration: 0.16, ease: "easeOut", delay: appearDelay },
          },
    },
    create("span", { className: "tv-service-icon inline-flex h-5 w-5 shrink-0 items-center justify-center text-cyan-100/95", "aria-hidden": true }, create(ServiceIcon, { feature }))
  );
}

function DetailCard({ detail, index, reduceMotion }) {
  if (!detail) {
    return null;
  }

  if (reduceMotion) {
    return create(
      "div",
      { className: "tv-detail transform-gpu will-change-[transform,opacity] inline-flex w-auto max-w-full shrink-0 flex-col items-start self-start rounded-lg bg-white/[0.05] px-2 py-1.5" },
      create("div", { className: "text-[0.5rem] uppercase tracking-[0.18em] text-cyan-200/80" }, detail.label || ""),
      create("div", { className: "mt-0.5 text-[0.72rem] leading-tight text-white/90" }, detail.value || "")
    );
  }

  const appearDelay = reduceMotion ? 0 : proceduralDelay(index, 0.018, 0.009);

  return create(
    motion.div,
    {
      className: "tv-detail transform-gpu will-change-[transform,opacity] inline-flex w-auto max-w-full shrink-0 flex-col items-start self-start rounded-lg bg-white/[0.05] px-2 py-1.5",
      layout: "position",
      transition: { layout: { type: "spring", stiffness: 210, damping: 30, mass: 0.82 } },
      initial: reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8, x: index % 2 === 0 ? -2 : 2, scale: 0.99 },
      animate: reduceMotion
        ? { opacity: 1 }
        : {
            opacity: 1,
            y: 0,
            x: 0,
            scale: 1,
            transition: { duration: 0.17, ease: "easeOut", delay: appearDelay },
          },
    },
    create("div", { className: "text-[0.5rem] uppercase tracking-[0.18em] text-cyan-200/80" }, detail.label || ""),
    create("div", { className: "mt-0.5 text-[0.72rem] leading-tight text-white/90" }, detail.value || "")
  );
}

function AnimatedQr({ qrUrl, propertyName, reduceMotion, performanceMode }) {
  const qrBuildDuration = 1;
  const qrParticleCount = performanceMode ? 24 : 40;
  const qrImageRevealDelay = 0.18;
  const qrImageRevealDuration = qrBuildDuration - qrImageRevealDelay;
  const qrParticles = React.useMemo(() => {
    if (reduceMotion) {
      return [];
    }

    return buildQrParticleSeeds(qrParticleCount);
  }, [reduceMotion, qrParticleCount]);

  if (reduceMotion) {
    return create(
      "div",
      {
        className:
          "tv-qr transform-gpu will-change-[transform,opacity] relative grid h-[82px] w-[82px] place-items-center overflow-hidden rounded-xl bg-white p-1.5 shadow-[0_10px_30px_rgba(0,0,0,0.3)] sm:h-[92px] sm:w-[92px] lg:h-[104px] lg:w-[104px] 2xl:h-[128px] 2xl:w-[128px]",
      },
      create("img", {
        src: qrUrl,
        alt: `Codigo QR para abrir ${propertyName}`,
        className: "transform-gpu relative z-[1] block h-full w-full object-contain",
        loading: "eager",
        decoding: "async",
        draggable: false,
        referrerPolicy: "no-referrer",
      })
    );
  }

  const frameVariants = reduceMotion
    ? {
        hidden: { opacity: 0 },
        visible: { opacity: 1 },
      }
    : {
        hidden: { opacity: 0, scale: 0.72, rotate: -8 },
        visible: {
          opacity: 1,
          scale: 1,
          rotate: 0,
          transition: { duration: 0.3, ease: [0.16, 0.84, 0.22, 1], delay: 0 },
        },
      };

  const scanVariants = reduceMotion
    ? {
        hidden: { opacity: 0 },
        visible: { opacity: 0 },
      }
    : {
        hidden: { opacity: 0, y: "-120%" },
        visible: {
          opacity: [0, 0.55, 0],
          y: ["-120%", "120%"],
          transition: { duration: 1.26, ease: "easeInOut", delay: 0.08, repeat: Infinity, repeatDelay: 2.2 },
        },
      };

  const glowVariants = reduceMotion
    ? {
        hidden: { opacity: 0 },
        visible: { opacity: 0 },
      }
    : {
        hidden: { opacity: 0, scale: 0.88 },
        visible: {
          opacity: [0.08, 0.24, 0.08],
          scale: [0.98, 1.05, 0.98],
          transition: { duration: 2.6, ease: "easeInOut", delay: 0.04, repeat: Infinity },
        },
      };

  const imageRevealVariants = reduceMotion
    ? {
        hidden: { opacity: 0 },
        visible: { opacity: 1 },
      }
    : {
        hidden: {
          opacity: 0,
          scale: 0.72,
          filter: "blur(12px) saturate(0.48) contrast(0.68)",
          clipPath: "inset(0 0 100% 0)",
        },
        visible: {
          opacity: 1,
          scale: 1,
          filter: "blur(0px) saturate(1) contrast(1)",
          clipPath: "inset(0 0 0% 0)",
          transition: {
            duration: qrImageRevealDuration,
            ease: [0.16, 0.84, 0.22, 1],
            delay: qrImageRevealDelay,
          },
        },
      };

  const burstFlashVariants = reduceMotion
    ? {
        hidden: { opacity: 0 },
        visible: { opacity: 0 },
      }
    : {
        hidden: { opacity: 0, scale: 0.4 },
        visible: {
          opacity: [0, 0.78, 0],
          scale: [0.4, 1.16, 1.52],
          transition: { duration: 0.32, ease: [0.16, 0.84, 0.22, 1], delay: 0.02, times: [0, 0.45, 1] },
        },
      };

  const burstRingVariants = reduceMotion
    ? {
        hidden: { opacity: 0, scale: 0 },
        visible: { opacity: 0, scale: 0 },
      }
    : {
        hidden: { opacity: 0, scale: 0.25 },
        visible: {
          opacity: [0, 0.92, 0],
          scale: [0.25, 1.28, 1.94],
          transition: { duration: 0.48, ease: [0.16, 0.84, 0.22, 1], delay: 0.03, times: [0, 0.36, 1] },
        },
      };

  return create(
    motion.div,
    {
      className:
        "tv-qr transform-gpu will-change-[transform,opacity] relative grid h-[82px] w-[82px] place-items-center overflow-hidden rounded-xl bg-white p-1.5 shadow-[0_10px_30px_rgba(0,0,0,0.3)] sm:h-[92px] sm:w-[92px] lg:h-[104px] lg:w-[104px] 2xl:h-[128px] 2xl:w-[128px]",
      layout: "position",
      layoutId: "panel-qr",
      transition: { layout: { type: "spring", stiffness: 230, damping: 28, mass: 0.72 } },
      variants: frameVariants,
      initial: "hidden",
      animate: "visible",
    },
    create(motion.img, {
      src: qrUrl,
      alt: `Codigo QR para abrir ${propertyName}`,
      className: "transform-gpu relative z-[1] block h-full w-full object-contain",
      loading: "eager",
      decoding: "async",
      draggable: false,
      referrerPolicy: "no-referrer",
      variants: imageRevealVariants,
      initial: "hidden",
      animate: "visible",
    }),
    create(motion.span, {
      className: "pointer-events-none absolute inset-0 z-[4] bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.92)_0%,rgba(186,230,253,0.58)_22%,rgba(56,189,248,0.2)_44%,transparent_70%)] mix-blend-screen",
      "aria-hidden": true,
      variants: burstFlashVariants,
      initial: "hidden",
      animate: "visible",
    }),
    create(motion.span, {
      className: "pointer-events-none absolute left-1/2 top-1/2 z-[4] aspect-square w-[74%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-100/70 mix-blend-screen",
      "aria-hidden": true,
      variants: burstRingVariants,
      initial: "hidden",
      animate: "visible",
    }),
    qrParticles.map((particle, index) =>
      (() => {
        const centerStartX = (50 - particle.x) * 1.06;
        const centerStartY = (50 - particle.y) * 1.06;
        const burstX = (particle.x - 50) * 1.34 + particle.drift * 2.8;
        const burstY = (particle.y - 50) * 1.08 - particle.lift * 0.96;
        const dropX = particle.drift * 0.4;
        const dropY = -particle.lift * 1.9;
        const particleDelay = 0.02 + particle.phase * 0.14 + particle.noise * 0.08;
        const particleDuration = Math.max(0.52, qrBuildDuration - particleDelay);

        return create(motion.span, {
          key: `qr-particle-${index}`,
          className: "pointer-events-none absolute z-[3] rounded-[1px]",
          style: {
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: `${particle.size}%`,
            height: `${particle.size}%`,
            background: particle.tone > 0.48 ? "rgba(6, 12, 26, 0.96)" : "rgba(35, 51, 78, 0.9)",
            boxShadow: "0 3px 10px rgba(0, 0, 0, 0.36)",
          },
          initial: {
            opacity: 0,
            y: centerStartY,
            x: centerStartX,
            scale: 0.08,
            rotate: particle.spin * 3.2,
          },
          animate: {
            opacity: [0, 1, 0.96, 0],
            y: [centerStartY, burstY, dropY, 0],
            x: [centerStartX, burstX, dropX, 0],
            scale: [0.08, 1.42, 1.08, 0.88],
            rotate: [particle.spin * 3.2, particle.spin * 0.9, particle.spin * 0.25, 0],
            transition: {
              duration: particleDuration,
              ease: [0.16, 0.84, 0.22, 1],
              delay: particleDelay,
              times: [0, 0.3, 0.74, 1],
            },
          },
        });
      })()
    ),
    create(motion.span, {
      className: "pointer-events-none absolute inset-0 z-[2] bg-[radial-gradient(circle_at_50%_50%,rgba(56,189,248,0.2)_0%,rgba(186,230,253,0.08)_36%,transparent_72%)] mix-blend-screen",
      "aria-hidden": true,
      variants: glowVariants,
      initial: "hidden",
      animate: "visible",
    }),
    create(motion.span, {
      className: "pointer-events-none absolute inset-x-0 top-[-20%] z-[2] h-[40%] bg-[linear-gradient(180deg,transparent_0%,rgba(255,255,255,0.9)_50%,transparent_100%)] mix-blend-screen",
      "aria-hidden": true,
      variants: scanVariants,
      initial: "hidden",
      animate: "visible",
    })
  );
}

export function PropertyPanel({ property, siteBaseUrl, qrUrl, utils, reduceMotion, performanceMode, panelVisual, activeTheme }) {
  if (!property) {
    return null;
  }

  const panelReduceMotion = reduceMotion || performanceMode;
  const panelComponentReduceMotion = reduceMotion || performanceMode;
  const panelIntroBaseDelay = panelComponentReduceMotion ? 0 : 0.06;
  const panelClassName = performanceMode
    ? "tv-panel absolute inset-x-0 bottom-0 z-40 overflow-hidden rounded-2xl bg-transparent px-3 pt-3 pb-0.5 shadow-[0_8px_18px_rgba(0,0,0,0.16)] backdrop-blur-[4px] sm:px-4 sm:pt-4 sm:pb-0.5 lg:px-5 lg:pt-5 lg:pb-1 xl:px-6 xl:pt-6 xl:pb-1.5 2xl:px-7 2xl:pt-7 2xl:pb-2"
    : "tv-panel absolute inset-x-0 bottom-0 z-40 overflow-hidden rounded-2xl bg-transparent px-3 pt-3 pb-0.5 shadow-[0_12px_34px_rgba(0,0,0,0.22)] backdrop-blur-[2px] sm:px-4 sm:pt-4 sm:pb-0.5 lg:px-5 lg:pt-5 lg:pb-1 xl:px-6 xl:pt-6 xl:pb-1.5 2xl:px-7 2xl:pt-7 2xl:pb-2";

  const kickerValues = [property.type, property.badge]
    .map((value) => String(value ?? "").trim())
    .filter(Boolean)
    .filter((value, index, values) => values.findIndex((candidate) => normalizeComparableText(candidate) === normalizeComparableText(value)) === index);
  const kickerText = kickerValues.join(" en ");
  const titleText = property.title || property.name || "";
  const locationText = property.location || "";
  const rawSummaryText = property.summary || "";
  const priceValueText = Number.isFinite(property.price) && property.price > 0 ? utils.formatPrice(property.price) : "-";
  const normalizedCurrency = normalizeComparableText(property.currency);
  const priceUnitText =
    normalizedCurrency === "ars"
      ? "ARS"
      : ["usd", "us", "u$s", "us$", "uss", "dolar", "dolares"].includes(normalizedCurrency)
        ? "USD"
        : property.currency
          ? String(property.currency).toUpperCase()
          : "USD";
  const hasPriceValue = priceValueText !== "-";
  const priceText = hasPriceValue ? `${priceUnitText} ${priceValueText}` : priceValueText;
  const rawMetrics = Array.isArray(property.metrics) ? property.metrics : [];
  const rawDetails = Array.isArray(property.details) ? property.details : [];
  const rawFeatures = Array.isArray(property.features) ? property.features : [];
  const resolvedQrUrl = qrUrl || buildQrUrl(property, siteBaseUrl);
  const surfaceBlur = panelVisual && Number.isFinite(panelVisual.blurPx) ? panelVisual.blurPx : 8;
  const surfaceSaturation = panelVisual && Number.isFinite(panelVisual.saturation) ? panelVisual.saturation : 104;
  const themePrimaryRgb = activeTheme ? hexToRgbString(activeTheme.primary, "") : "";
  const themeSecondaryRgb = activeTheme ? hexToRgbString(activeTheme.secondary, "") : "";
  const themeTertiaryRgb = activeTheme ? hexToRgbString(activeTheme.tertiary, "") : "";
  const surfaceTintRgb = themePrimaryRgb || themeSecondaryRgb || themeTertiaryRgb || "var(--accent-1-rgb)";
  const surfaceTintRgbSecondary = themeSecondaryRgb || surfaceTintRgb;
  const surfaceTintRgbTertiary = themeTertiaryRgb || surfaceTintRgb;
  const surfaceTintAlpha = panelVisual && Number.isFinite(panelVisual.tintAlpha) ? panelVisual.tintAlpha : 0.14;
  const surfaceHighlightAlpha = panelVisual && Number.isFinite(panelVisual.highlightAlpha) ? panelVisual.highlightAlpha : 0.18;
  const surfaceShadowAlpha = panelVisual && Number.isFinite(panelVisual.shadowAlpha) ? panelVisual.shadowAlpha : 0.22;
  const minimumSurfaceAlpha = performanceMode ? 0.69 : 0.66;
  const minimumBorderAlpha = performanceMode ? 0.12 : 0.1;
  const normalizedSurfaceAlpha = panelVisual && Number.isFinite(panelVisual.bgAlpha) ? panelVisual.bgAlpha : 0.64;
  const normalizedSurfaceBorderAlpha = panelVisual && Number.isFinite(panelVisual.borderAlpha) ? panelVisual.borderAlpha : 0.08;
  const surfaceAlpha = Math.max(normalizedSurfaceAlpha, minimumSurfaceAlpha);
  const surfaceBorderAlpha = Math.max(normalizedSurfaceBorderAlpha, minimumBorderAlpha);
  const priceStyle = themePrimaryRgb || themeSecondaryRgb || themeTertiaryRgb
    ? {
        "--tv-price-top": activeTheme && activeTheme.glow ? activeTheme.glow : "var(--accent-4)",
        "--tv-price-mid": activeTheme && activeTheme.secondary ? activeTheme.secondary : "var(--accent-2)",
        "--tv-price-bottom": activeTheme && activeTheme.primary ? activeTheme.primary : "var(--accent-1)",
        "--tv-price-accent-rgb": surfaceTintRgb,
        "--tv-price-mid-rgb": surfaceTintRgbSecondary,
        "--tv-price-bottom-rgb": surfaceTintRgbTertiary,
        "--tv-price-accent-alpha": clampNumber(surfaceTintAlpha * 1.18, 0.14, 0.42),
        "--tv-price-border-alpha": clampNumber(surfaceHighlightAlpha * 1.08, 0.16, 0.42),
      }
    : undefined;
  const panelVisualSpring = panelReduceMotion
    ? { stiffness: 340, damping: 54, mass: 1.08 }
    : performanceMode
      ? { stiffness: 180, damping: 30, mass: 0.86 }
      : { stiffness: 150, damping: 24, mass: 0.8 };
  const panelAlphaMotion = useSpring(surfaceAlpha, panelVisualSpring);
  const panelBorderAlphaMotion = useSpring(surfaceBorderAlpha, panelVisualSpring);
  const panelBackgroundMotion = useTransform(panelAlphaMotion, (value) => `rgba(${surfaceTintRgb}, ${value.toFixed(3)})`);
  const panelBorderMotion = useTransform(panelBorderAlphaMotion, (value) => `rgba(${surfaceTintRgbSecondary}, ${value.toFixed(3)})`);
  const panelSurfaceStyle = panelReduceMotion
    ? {
        backgroundColor: `rgba(${surfaceTintRgb}, ${surfaceAlpha.toFixed(3)})`,
        borderColor: `rgba(${surfaceTintRgbSecondary}, ${surfaceBorderAlpha.toFixed(3)})`,
        boxShadow: `0 10px 24px rgba(0,0,0,0.22)`,
      }
    : {
        backgroundColor: panelBackgroundMotion,
        backgroundImage: `radial-gradient(circle at 14% 16%, rgba(${surfaceTintRgb}, ${surfaceHighlightAlpha}) 0%, rgba(${surfaceTintRgb}, ${surfaceTintAlpha}) 34%, rgba(2, 8, 20, 0) 72%), radial-gradient(circle at 84% 72%, rgba(${surfaceTintRgbSecondary}, ${Math.max(surfaceTintAlpha * 0.95, 0.07).toFixed(3)}) 0%, rgba(${surfaceTintRgbSecondary}, 0) 64%), linear-gradient(180deg, rgba(${surfaceTintRgbTertiary}, 0.12) 0%, rgba(2, 8, 20, 0) 45%)`,
        borderColor: panelBorderMotion,
        boxShadow: `0 14px 42px rgba(${surfaceTintRgb}, ${surfaceShadowAlpha}), 0 20px 54px rgba(0,0,0,0.24)`,
        backdropFilter: `blur(${surfaceBlur}px) saturate(${surfaceSaturation}%)`,
        WebkitBackdropFilter: `blur(${surfaceBlur}px) saturate(${surfaceSaturation}%)`,
      };
  const occupiedValues = new Set(
    [titleText, locationText, ...kickerValues]
      .map((value) => normalizeComparableText(value))
      .filter(Boolean)
  );

  const metricKeys = new Set();
  const metrics = rawMetrics.filter((metric) => {
    if (!metric) {
      return false;
    }

    const label = normalizeComparableText(metric.label);
    const value = normalizeComparableText(metric.value);

    if (!label && !value) {
      return false;
    }

    const key = `${label}|${value}`;

    if (metricKeys.has(key)) {
      return false;
    }

    metricKeys.add(key);

    if (value) {
      occupiedValues.add(value);
    }

    return true;
  });

  const detailKeys = new Set();
  const repeatedDetailLabels = new Set(["tipo", "direccion", "ubicacion", "barrio", "moneda"]);
  const details = rawDetails.filter((detail) => {
    if (!detail) {
      return false;
    }

    const label = normalizeComparableText(detail.label);
    const value = normalizeComparableText(detail.value);

    if (repeatedDetailLabels.has(label)) {
      return false;
    }

    if (!value) {
      return false;
    }

    const key = `${label}|${value}`;

    if (detailKeys.has(key)) {
      return false;
    }

    detailKeys.add(key);

    return true;
  });

  const summaryText = summaryIsRedundant(rawSummaryText, occupiedValues) ? "" : rawSummaryText;

  if (summaryText) {
    occupiedValues.add(normalizeComparableText(summaryText));

    String(summaryText)
      .split(/·|\||,|;/)
      .map((part) => normalizeComparableText(part))
      .filter(Boolean)
      .forEach((part) => occupiedValues.add(part));
  }

  const featureKeys = new Set();
  const features = rawFeatures.filter((feature) => {
    const value = normalizeComparableText(feature);

    if (!value) {
      return false;
    }

    if (featureKeys.has(value)) {
      return false;
    }

    featureKeys.add(value);

    return true;
  });
  const primaryMetrics = metrics;
  const secondaryDetails = details;

  const panelSlideReducedMotion = panelComponentReduceMotion;
  const panelEnterOffsetX = performanceMode ? -112 : -148;
  const panelExitOffsetX = performanceMode ? 34 : 44;
  const panelEnterDuration = performanceMode ? 0.32 : 0.38;
  const panelExitDuration = performanceMode ? 0.16 : 0.2;

  const panelVariants = panelSlideReducedMotion
    ? {
        hidden: { opacity: 0 },
        visible: { opacity: 1 },
        exit: { opacity: 0 },
      }
    : {
        hidden: { opacity: 0, x: panelEnterOffsetX, y: 4 },
        visible: {
          opacity: 1,
          x: 0,
          y: 0,
          transition: { duration: panelEnterDuration, ease: [0.16, 0.84, 0.22, 1], delay: panelIntroBaseDelay },
        },
        exit: { opacity: 0, x: panelExitOffsetX, y: 0, transition: { duration: panelExitDuration, ease: "easeIn" } },
      };

  const sectionVariants = panelComponentReduceMotion
    ? {
        hidden: { opacity: 0 },
        visible: { opacity: 1 },
      }
    : {
        hidden: { opacity: 0, y: 8 },
        visible: {
          opacity: 1,
          y: 0,
          transition: {
            duration: 0.16,
            ease: "easeOut",
            when: "beforeChildren",
            staggerChildren: 0.03,
            delayChildren: 0.01,
          },
        },
      };

  return create(
    AnimatePresence,
    { mode: "sync" },
    create(
      motion.section,
      {
        key: property.id,
        className: `${panelClassName} transform-gpu will-change-[transform,opacity]`,
        style: panelSurfaceStyle,
        variants: panelVariants,
        initial: "hidden",
        animate: "visible",
        exit: "exit",
        layout: "position",
        transition: { layout: { type: "spring", stiffness: 140, damping: 22, mass: 0.86 } },
      },
      create(PanelAtmosphere, { reduceMotion: panelReduceMotion, performanceMode, panelVisual, activeTheme }),
      create(
        LayoutGroup,
        { id: "property-panel-layout" },
        create(
          motion.div,
          { className: "mt-[clamp(0.52rem,0.9vmin,1.2rem)] grid gap-3 grid-cols-[minmax(0,1fr)_auto] items-start transform-gpu will-change-[transform,opacity] xl:gap-4 2xl:gap-5", variants: sectionVariants, layout: "position" },
          create(
            motion.div,
            {
              className: "min-w-0 transform-gpu will-change-[transform,opacity]",
              variants: sectionVariants,
              layout: "position",
            },
            create(AnimatedBlock, { as: "p", className: "tv-kicker text-[clamp(0.58rem,0.95vw,0.86rem)] uppercase tracking-[0.24em] text-cyan-200/80", reduceMotion: panelComponentReduceMotion, delay: panelIntroBaseDelay + 0.01, y: 8, layout: "position" }, kickerText),
            create(AnimatedBlock, { as: "h1", className: "tv-title font-display mt-1 text-[clamp(1.35rem,3.8vw,4.2rem)] leading-[0.92] text-white", reduceMotion: panelComponentReduceMotion, delay: panelIntroBaseDelay + 0.03, y: 8, layout: "position", layoutId: "panel-title" }, titleText),
            create(AnimatedBlock, { as: "p", className: "tv-location mt-2 text-[clamp(0.62rem,1vw,1rem)] uppercase tracking-[0.2em] text-slate-200/70", reduceMotion: panelComponentReduceMotion, delay: panelIntroBaseDelay + 0.05, y: 7, layout: "position" }, locationText)
          ),
          create(
            motion.div,
            {
              className: "grid justify-items-end gap-1 text-right transform-gpu will-change-[transform,opacity]",
              variants: sectionVariants,
              layout: "position",
              layoutId: "panel-price",
              transition: { layout: { type: "spring", stiffness: 230, damping: 28, mass: 0.74 } },
            },
            create(
              AnimatedBlock,
              {
                as: "p",
                className: "tv-price text-[clamp(1.25rem,3vw,3.3rem)] leading-none",
                reduceMotion: panelComponentReduceMotion,
                delay: panelIntroBaseDelay + 0.03,
                y: 8,
                layout: "position",
                style: priceStyle,
              },
              hasPriceValue
                ? create(
                    "span",
                    { className: "tv-price-row", "aria-label": priceText },
                    create("span", { className: "tv-price-code" }, priceUnitText),
                    create("span", { className: "tv-price-number" }, priceValueText)
                  )
                : priceText
            )
          )
        ),
        summaryText
          ? create(AnimatedBlock, { as: "p", className: "tv-summary mt-2 text-[clamp(0.8rem,1.05vw,1.08rem)] leading-relaxed text-slate-100/85", reduceMotion: panelComponentReduceMotion, delay: panelIntroBaseDelay + 0.06, y: 7, layout: "position" }, summaryText)
          : null,
        create(
          motion.div,
          {
            className:
              "relative mt-2.5 grid gap-2 transform-gpu will-change-[transform,opacity] pr-[clamp(7rem,10vmin,12.5rem)] pb-[clamp(0.22rem,0.45vmin,0.62rem)] sm:pr-[clamp(7.6rem,10vmin,13.25rem)] sm:pb-[clamp(0.24rem,0.5vmin,0.68rem)] lg:pr-[clamp(8.4rem,10.5vmin,14rem)] lg:pb-[clamp(0.28rem,0.58vmin,0.76rem)]",
            variants: sectionVariants,
            layout: "position",
          },
          create(
            motion.div,
            { className: "grid min-w-0 gap-2 transform-gpu will-change-[transform,opacity]", variants: sectionVariants, layout: "position" },
            primaryMetrics.length
              ? create(
                  motion.div,
                  { className: "tv-metrics-grid transform-gpu will-change-[transform,opacity] flex flex-wrap items-start gap-1.5", layout: "position" },
                  primaryMetrics.map((metric, index) =>
                    create(MetricTile, {
                      metric,
                      index,
                      reduceMotion: panelComponentReduceMotion,
                      key: `${property.id}-metric-${normalizeComparableText(metric.label)}-${normalizeComparableText(metric.value)}-${index}`,
                    })
                  )
                )
              : null,
            secondaryDetails.length
              ? create(
                  motion.div,
                  { className: "tv-details-grid transform-gpu will-change-[transform,opacity] flex flex-wrap items-start gap-1.5", layout: "position" },
                  secondaryDetails.map((detail, index) =>
                    create(DetailCard, {
                      detail,
                      index,
                      reduceMotion: panelComponentReduceMotion,
                      key: `${property.id}-detail-${normalizeComparableText(detail.label)}-${normalizeComparableText(detail.value)}-${index}`,
                    })
                  )
                )
              : null,
            features.length
              ? create(
                  motion.div,
                  {
                    className: "tv-features-wrap transform-gpu will-change-[transform,opacity] flex flex-wrap items-start gap-1.5 xl:pt-0.5",
                    variants: sectionVariants,
                    layout: "position",
                  },
                  features.map((feature, index) =>
                    create(FeaturePill, {
                      feature,
                      index,
                      reduceMotion: panelComponentReduceMotion,
                      key: `${property.id}-feature-${normalizeComparableText(feature)}-${index}`,
                    })
                  )
                )
              : null
          ),
          create(
            motion.div,
            {
              className:
                "tv-qr-slot absolute right-[clamp(0.52rem,0.86vw,1.06rem)] bottom-[clamp(0.08rem,0.2vw,0.26rem)] z-[5] grid w-fit justify-items-end gap-1 text-right transform-gpu will-change-[transform,opacity]",
              variants: sectionVariants,
              layout: "position",
              layoutId: "panel-qr-slot",
              transition: { layout: { type: "spring", stiffness: 230, damping: 28, mass: 0.74 } },
            },
            create(AnimatedQr, {
              key: resolvedQrUrl,
              qrUrl: resolvedQrUrl,
              propertyName: property.name,
              reduceMotion: panelComponentReduceMotion,
              performanceMode,
            }),
            create(
              "p",
              { className: "tv-qr-caption text-[clamp(0.5rem,0.75vw,0.72rem)] uppercase tracking-[0.22em] text-cyan-100/75" },
              property.publishedUrl ? "Publicación" : "Inmueble"
            )
          )
        )
      )
    )
  );
}
