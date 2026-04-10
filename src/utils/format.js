(function () {
  const namespace = (window.InmoUtils = window.InmoUtils || {});
  const priceNoDecimalsFormatter = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });
  const priceOneDecimalFormatter = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 });
  const clockFormatter = new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const preloadedMediaSources = new Set();

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function normalizeHexColor(value, fallback) {
    const text = String(value || "").trim();
    return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(text) ? text : fallback;
  }

  function hexToRgbParts(hex) {
    const normalized = normalizeHexColor(hex, "#000000").replace(/^#/, "");
    const expanded = normalized.length === 3 ? normalized.split("").map((char) => char + char).join("") : normalized;
    const parsed = Number.parseInt(expanded, 16);

    if (Number.isNaN(parsed)) {
      return [0, 0, 0];
    }

    return [(parsed >> 16) & 255, (parsed >> 8) & 255, parsed & 255];
  }

  function hexToRgb(hex) {
    const [red, green, blue] = hexToRgbParts(hex);

    return `${red}, ${green}, ${blue}`;
  }

  function hexToRgba(hex, alpha = 1) {
    const [red, green, blue] = hexToRgbParts(hex);
    const safeAlpha = clamp(alpha, 0, 1);
    return `rgba(${red}, ${green}, ${blue}, ${safeAlpha})`;
  }

  function normalizePresetToken(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
  }

  function resolveThemePreset(theme) {
    const source = theme && typeof theme === "object" ? theme : {};
    const token = normalizePresetToken(source.visualPresetKey || source.visualPreset || source.visualPresetValue || source.estiloColor || source.themeMode);

    if (!token) {
      return "";
    }

    if (["tema1", "estilo1", "style1", "preset1", "claro", "light", "1"].includes(token)) {
      return "tema1";
    }

    if (["tema2", "estilo2", "style2", "preset2", "neutro", "neutral", "2"].includes(token)) {
      return "tema2";
    }

    if (["tema3", "estilo3", "style3", "preset3", "intenso", "intense", "3"].includes(token)) {
      return "tema3";
    }

    if (/tema2|estilo2|style2|preset2/.test(token)) {
      return "tema2";
    }

    if (/tema3|estilo3|style3|preset3/.test(token)) {
      return "tema3";
    }

    return "";
  }

  function blendHexColors(baseHex, overlayHex, overlayWeight = 0.2) {
    const normalizedWeight = clamp(overlayWeight, 0, 1);
    const base = hexToRgbParts(baseHex);
    const overlay = hexToRgbParts(overlayHex);

    const red = Math.round(base[0] * (1 - normalizedWeight) + overlay[0] * normalizedWeight);
    const green = Math.round(base[1] * (1 - normalizedWeight) + overlay[1] * normalizedWeight);
    const blue = Math.round(base[2] * (1 - normalizedWeight) + overlay[2] * normalizedWeight);

    return `#${[red, green, blue]
      .map((component) => component.toString(16).padStart(2, "0"))
      .join("")}`;
  }

  function formatPrice(value) {
    return priceNoDecimalsFormatter.format(value);
  }

  function formatCompactPrice(value) {
    const valueInMillions = value / 1000000;

    if (valueInMillions >= 10) {
      return `U$S ${priceNoDecimalsFormatter.format(valueInMillions)} M`;
    }

    return `U$S ${priceOneDecimalFormatter.format(valueInMillions)} M`;
  }

  function formatIndex(current, total) {
    return `${String(current).padStart(2, "0")} / ${String(total).padStart(2, "0")}`;
  }

  function formatCountdown(milliseconds) {
    return `${String(Math.max(0, Math.ceil(milliseconds / 1000))).padStart(2, "0")}s`;
  }

  function formatClock(date = new Date()) {
    return clockFormatter.format(date);
  }

  function applyTheme(theme) {
    const fallbackTheme = {
      primary: "#7dd3fc",
      secondary: "#dbeafe",
      tertiary: "#60a5fa",
      glow: "#f8fafc",
    };
    const source = theme && typeof theme === "object" ? theme : {};
    const rawPrimary = normalizeHexColor(source.primary ?? source.theme_primary ?? source.themePrimary ?? source.color, fallbackTheme.primary);
    const rawSecondary = normalizeHexColor(source.secondary ?? source.theme_secondary ?? source.themeSecondary, fallbackTheme.secondary);
    const rawTertiary = normalizeHexColor(source.tertiary ?? source.theme_tertiary ?? source.themeTertiary, fallbackTheme.tertiary);
    const rawGlow = normalizeHexColor(source.glow ?? source.theme_glow ?? source.themeGlow, fallbackTheme.glow);
    const forceExactTheme = Boolean(source.forceExactTheme || source.forceExact || source.visualPresetKey || source.visualPreset);
    const palette = {
      primary: forceExactTheme ? rawPrimary : blendHexColors(fallbackTheme.primary, rawPrimary, 0.12),
      secondary: forceExactTheme ? rawSecondary : blendHexColors(fallbackTheme.secondary, rawSecondary, 0.08),
      tertiary: forceExactTheme ? rawTertiary : blendHexColors(fallbackTheme.tertiary, rawTertiary, 0.06),
      glow: forceExactTheme ? rawGlow : blendHexColors(fallbackTheme.glow, rawGlow, 0.05),
    };
    const normalizedPreset = resolveThemePreset(source);
    const defaultSurfaces = {
      bgTop: "#08111c",
      bgBottom: "#030712",
      surface0: "rgba(8, 13, 22, 0.94)",
      surface1: "rgba(9, 14, 23, 0.9)",
      surface2: "rgba(5, 8, 15, 0.88)",
      border: "rgba(148, 163, 184, 0.14)",
      borderSoft: "rgba(255, 255, 255, 0.045)",
    };
    const presetSurfaces = {
      tema1: {
        bgTop: "#25303b",
        bgBottom: "#121922",
        surface0: "rgba(36, 46, 58, 0.94)",
        surface1: "rgba(30, 40, 52, 0.9)",
        surface2: "rgba(23, 31, 42, 0.88)",
        border: "rgba(219, 205, 183, 0.22)",
        borderSoft: "rgba(255, 255, 255, 0.06)",
      },
      tema2: {
        bgTop: "#13181d",
        bgBottom: "#090d11",
        surface0: "rgba(18, 23, 28, 0.94)",
        surface1: "rgba(15, 20, 25, 0.9)",
        surface2: "rgba(11, 15, 20, 0.88)",
        border: "rgba(171, 162, 146, 0.2)",
        borderSoft: "rgba(255, 255, 255, 0.052)",
      },
      tema3: {
        bgTop: "#0b1218",
        bgBottom: "#04070b",
        surface0: "rgba(11, 18, 24, 0.95)",
        surface1: "rgba(9, 15, 20, 0.91)",
        surface2: "rgba(6, 11, 16, 0.89)",
        border: "rgba(191, 163, 126, 0.26)",
        borderSoft: "rgba(255, 255, 255, 0.058)",
      },
    };
    const derivedSurfaces = {
      bgTop: blendHexColors("#08111c", palette.primary, 0.22),
      bgBottom: blendHexColors("#030712", palette.tertiary, 0.2),
      surface0: hexToRgba(blendHexColors("#0a1220", palette.primary, 0.24), 0.94),
      surface1: hexToRgba(blendHexColors("#0a111c", palette.secondary, 0.2), 0.9),
      surface2: hexToRgba(blendHexColors("#070c15", palette.tertiary, 0.18), 0.88),
      border: hexToRgba(blendHexColors("#94a3b8", palette.secondary, 0.35), 0.19),
      borderSoft: "rgba(255, 255, 255, 0.055)",
    };
    const surfaces = presetSurfaces[normalizedPreset] || derivedSurfaces || defaultSurfaces;

    const root = document.documentElement;
    const primary = palette.primary;
    const secondary = palette.secondary;
    const tertiary = palette.tertiary;
    const glow = palette.glow;

    root.style.setProperty("--accent-1", primary);
    root.style.setProperty("--accent-1-rgb", hexToRgb(primary));
    root.style.setProperty("--accent-2", secondary);
    root.style.setProperty("--accent-2-rgb", hexToRgb(secondary));
    root.style.setProperty("--accent-3", tertiary);
    root.style.setProperty("--accent-3-rgb", hexToRgb(tertiary));
    root.style.setProperty("--accent-4", glow);
    root.style.setProperty("--accent-4-rgb", hexToRgb(glow));
    root.style.setProperty("--bg-0", surfaces.bgTop);
    root.style.setProperty("--bg-1", surfaces.bgBottom);
    root.style.setProperty("--surface-0", surfaces.surface0);
    root.style.setProperty("--surface-1", surfaces.surface1);
    root.style.setProperty("--surface-2", surfaces.surface2);
    root.style.setProperty("--surface-border", surfaces.border);
    root.style.setProperty("--surface-border-soft", surfaces.borderSoft);
    root.setAttribute("data-visual-style", normalizedPreset || "custom");

    const themeMeta = document.querySelector('meta[name="theme-color"]');
    if (themeMeta) {
      themeMeta.setAttribute("content", surfaces.bgTop || "#07111c");
    }
  }

  function preloadMedia(media) {
    if (!media) {
      return;
    }

    if (media.type === "video") {
      if (media.poster) {
        if (preloadedMediaSources.has(media.poster)) {
          return;
        }

        preloadedMediaSources.add(media.poster);

        const poster = new Image();
        poster.decoding = "async";
        poster.referrerPolicy = "no-referrer";
        poster.src = media.poster;
      }

      return;
    }

    if (!media.src || preloadedMediaSources.has(media.src)) {
      return;
    }

    preloadedMediaSources.add(media.src);

    const image = new Image();
    image.decoding = "async";
    image.referrerPolicy = "no-referrer";
    image.src = media.src;
  }

  namespace.clamp = clamp;
  namespace.hexToRgb = hexToRgb;
  namespace.formatPrice = formatPrice;
  namespace.formatCompactPrice = formatCompactPrice;
  namespace.formatIndex = formatIndex;
  namespace.formatCountdown = formatCountdown;
  namespace.formatClock = formatClock;
  namespace.applyTheme = applyTheme;
  namespace.preloadMedia = preloadMedia;
})();
