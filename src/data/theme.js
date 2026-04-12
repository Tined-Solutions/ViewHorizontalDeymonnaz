import { pickField, sanitizeHexColor } from './mappers.js';
import { toText, normalizeFieldToken, hasValue } from './utils.js';

export const defaultTheme = {
    primary: "#128a70",
    secondary: "#6ecfb1",
    tertiary: "#d1f7ea",
    glow: "#f7fffb",
  panelGradientTop: "rgba(4, 34, 27, 0.7)",
  panelGradientBottom: "rgba(2, 16, 13, 0.61)",
  };

export const visualThemePresets = {
   tema1: { // Actual / verde actual
      primary: "#128a70",
      secondary: "#6ecfb1",
      tertiary: "#d1f7ea",
      glow: "#f7fffb",
      panelGradientTop: "rgba(4, 34, 27, 0.7)",
      panelGradientBottom: "rgba(2, 16, 13, 0.61)",
    },
    tema2: {
      primary: "#000000",
      secondary: "#ffffff",
      tertiary: "#585656",
      glow: "#ffffff",
      panelGradientTop: "rgba(56, 55, 55, 0.69)",
      panelGradientBottom: "rgba(53, 53, 53, 0.59)",
    },
    tema3: { // Azul oscuro tranquilo
      primary: "#0d0e46",
      secondary: "#ffffff",
      tertiary: "#0077ff",
      glow: "#ffffff",
      panelGradientTop: "rgba(37, 55, 90, 0.69)",
      panelGradientBottom: "rgba(24, 33, 54, 0.59)",
    },
  };

if (typeof window !== "undefined") {
  window.InmoVisualThemePresets = visualThemePresets;
}

function normalizeThemeGradient(value, fallback) {
  const text = toText(value);
  return text || fallback;
}

export function normalizeTheme(theme, fallback = defaultTheme) {
    if (typeof theme === "string") {
      const presetKey = resolveVisualPresetKey(theme);
      const presetTheme = visualThemePresets[presetKey] || fallback;

      return {
        primary: sanitizeHexColor(presetTheme.primary, fallback.primary),
        secondary: sanitizeHexColor(presetTheme.secondary, fallback.secondary),
        tertiary: sanitizeHexColor(presetTheme.tertiary, fallback.tertiary),
        glow: sanitizeHexColor(presetTheme.glow, fallback.glow),
        panelGradientTop: normalizeThemeGradient(
          presetTheme.panelGradientTop ?? presetTheme.panel_gradient_top ?? presetTheme.panelGradient?.top,
          fallback.panelGradientTop
        ),
        panelGradientBottom: normalizeThemeGradient(
          presetTheme.panelGradientBottom ?? presetTheme.panel_gradient_bottom ?? presetTheme.panelGradient?.bottom,
          fallback.panelGradientBottom
        ),
      };
    }

    const source = theme && typeof theme === "object" ? theme : {};
    const hasDirectPalette =
      hasValue(source.primary) ||
      hasValue(source.secondary) ||
      hasValue(source.tertiary) ||
      hasValue(source.glow) ||
      hasValue(source.theme_primary) ||
      hasValue(source.theme_secondary) ||
      hasValue(source.theme_tertiary) ||
      hasValue(source.theme_glow);

    if (!hasDirectPalette) {
      const tokenFromObject = normalizeFieldToken(
        pickField(source, [
          "value",
          "name",
          "title",
          "label",
          "slug.current",
          "slug",
          "key",
          "id",
          "themePreset",
          "themeMode",
          "configuracionVisual",
          "tema",
        ])
      );

      if (tokenFromObject) {
        const presetKey = resolveVisualPresetKey(tokenFromObject);
        const presetTheme = visualThemePresets[presetKey] || fallback;

        return {
          primary: sanitizeHexColor(presetTheme.primary, fallback.primary),
          secondary: sanitizeHexColor(presetTheme.secondary, fallback.secondary),
          tertiary: sanitizeHexColor(presetTheme.tertiary, fallback.tertiary),
          glow: sanitizeHexColor(presetTheme.glow, fallback.glow),
          panelGradientTop: normalizeThemeGradient(
            source.panelGradientTop ?? source.panel_gradient_top ?? source.panelGradient?.top ?? presetTheme.panelGradientTop ?? presetTheme.panel_gradient_top ?? presetTheme.panelGradient?.top,
            fallback.panelGradientTop
          ),
          panelGradientBottom: normalizeThemeGradient(
            source.panelGradientBottom ?? source.panel_gradient_bottom ?? source.panelGradient?.bottom ?? presetTheme.panelGradientBottom ?? presetTheme.panel_gradient_bottom ?? presetTheme.panelGradient?.bottom,
            fallback.panelGradientBottom
          ),
        };
      }
    }

    return {
      primary: sanitizeHexColor(source.primary ?? source.theme_primary ?? source.themePrimary ?? source.color, fallback.primary),
      secondary: sanitizeHexColor(source.secondary ?? source.theme_secondary ?? source.themeSecondary, fallback.secondary),
      tertiary: sanitizeHexColor(source.tertiary ?? source.theme_tertiary ?? source.themeTertiary, fallback.tertiary),
      glow: sanitizeHexColor(source.glow ?? source.theme_glow ?? source.themeGlow, fallback.glow),
      panelGradientTop: normalizeThemeGradient(
        source.panelGradientTop ?? source.panel_gradient_top ?? source.panelGradient?.top ?? source.gradientTop ?? source.gradient_top,
        fallback.panelGradientTop
      ),
      panelGradientBottom: normalizeThemeGradient(
        source.panelGradientBottom ?? source.panel_gradient_bottom ?? source.panelGradient?.bottom ?? source.gradientBottom ?? source.gradient_bottom,
        fallback.panelGradientBottom
      ),
    };
  }

export function resolveVisualPresetKey(token) {
    const normalized = normalizeFieldToken(token);

    if (!normalized) {
      return "tema1";
    }

    if (["tema1", "preset1", "estilo1", "opcion1", "1", "default", "clasico", "classic", "verde", "green", "emerald", "teal", "turquesa", "turquoise", "jade", "mint", "forest", "moss", "natural"].includes(normalized)) {
      return "tema1";
    }

    if (["tema2", "preset2", "estilo2", "opcion2", "2", "neutro", "neutral", "gris", "gray", "slate", "metal", "metalico", "grismetalico", "graphite", "graphito", "gunmetal", "steel", "plata", "silver"].includes(normalized)) {
      return "tema2";
    }

    if (["tema3", "preset3", "estilo3", "opcion3", "3", "intenso", "intense", "vibrante", "vibrant", "bold", "alto", "azul", "blue", "oceano", "ocean", "azuloscuro", "darkblue", "navy", "midnight", "deepblue", "oceanooscuro"].includes(normalized)) {
      return "tema3";
    }

    if (/tema2|preset2|estilo2|opcion2/.test(normalized)) {
      return "tema2";
    }

    if (/tema3|preset3|estilo3|opcion3/.test(normalized)) {
      return "tema3";
    }

    return "tema1";
  }

export function readVisualSelectionValue(settings, config = {}) {
    const source = settings && typeof settings === "object" ? settings : {};

    const directValue = pickField(source, [
      "configuracionVisual",
      "configuracion_visual",
      "visualConfig",
      "visualConfiguration",
      "themePreset",
      "estiloColor",
      "estiloColores",
      "estilo_colores",
      "temaVisual",
      "tema",
      "estiloVisual",
      "configuracion.visual",
      "visual.theme",
      "visual.preset",
      "themeChoice",
      "theme_mode",
      "themeMode",
    ]);

    if (hasValue(directValue)) {
      return directValue;
    }

    return pickField(config, ["configuracionVisual", "visualConfig", "themePreset", "themeMode", "estiloColor", "estiloColores"], "");
  }

export function resolveVisualTheme(settings, config = {}) {
    const source = settings && typeof settings === "object" ? settings : {};
    const fallbackTheme = normalizeTheme(config.theme || config.defaultTheme || {}, defaultTheme);
    const selectionValue = readVisualSelectionValue(source, config);
    const selectionToken =
      selectionValue && typeof selectionValue === "object"
        ? normalizeFieldToken(pickField(selectionValue, ["value", "name", "title", "label", "slug.current", "slug", "key", "id"]))
        : normalizeFieldToken(selectionValue);
    const themeTokenFromSource =
      typeof source.theme === "string"
        ? normalizeFieldToken(source.theme)
        : source.theme && typeof source.theme === "object"
          ? normalizeFieldToken(pickField(source.theme, ["value", "name", "title", "label", "slug.current", "slug", "key", "id", "themePreset", "themeMode", "configuracionVisual", "tema"]))
          : "";
    const resolvedSelectionToken = selectionToken || themeTokenFromSource;

    const hasLegacyTheme =
      (source.theme &&
        typeof source.theme === "object" &&
        (hasValue(source.theme.primary) ||
          hasValue(source.theme.secondary) ||
          hasValue(source.theme.tertiary) ||
          hasValue(source.theme.glow) ||
          hasValue(source.theme.theme_primary) ||
          hasValue(source.theme.theme_secondary) ||
          hasValue(source.theme.theme_tertiary) ||
          hasValue(source.theme.theme_glow))) ||
      hasValue(source.theme_primary) ||
      hasValue(source.theme_secondary) ||
      hasValue(source.theme_tertiary) ||
      hasValue(source.theme_glow);

    if (!resolvedSelectionToken && hasLegacyTheme) {
      return {
        ...normalizeTheme(
          source.theme || {
            primary: source.theme_primary,
            secondary: source.theme_secondary,
            tertiary: source.theme_tertiary,
            glow: source.theme_glow,
          },
          fallbackTheme
        ),
        visualPresetKey: "legacy",
        visualPresetValue: "legacy",
        forceExactTheme: true,
      };
    }

    if (selectionValue && typeof selectionValue === "object") {
      const hasDirectPalette =
        hasValue(selectionValue.primary) ||
        hasValue(selectionValue.secondary) ||
        hasValue(selectionValue.tertiary) ||
        hasValue(selectionValue.glow) ||
        hasValue(selectionValue.theme_primary) ||
        hasValue(selectionValue.theme_secondary) ||
        hasValue(selectionValue.theme_tertiary) ||
        hasValue(selectionValue.theme_glow);

      if (hasDirectPalette) {
        return {
          ...normalizeTheme(selectionValue, fallbackTheme),
          visualPresetKey: "custom",
          visualPresetValue: toText(pickField(selectionValue, ["value", "name", "title", "label"])),
          forceExactTheme: true,
        };
      }
    }

    if (!resolvedSelectionToken) {
      return null;
    }

    const presetKey = resolveVisualPresetKey(resolvedSelectionToken);
    const presetTheme = visualThemePresets[presetKey] || defaultTheme;
    const presetValueSource = hasValue(selectionValue)
      ? selectionValue
      : typeof source.theme === "string"
        ? source.theme
        : resolvedSelectionToken;

    return {
      ...normalizeTheme(presetTheme, fallbackTheme),
      visualPresetKey: presetKey,
      visualPresetValue: toText(presetValueSource),
      forceExactTheme: true,
    };
  }