import { pickField, sanitizeHexColor } from './mappers.js';
import { toText, normalizeFieldToken, hasValue } from './utils.js';

export const defaultTheme = {
    primary: "#ffffff",
    secondary: "#dbeafe",
    tertiary: "#60a5fa",
    glow: "#f8fafc",
  };

export const visualThemePresets = {
   tema1: { // Claros (Inspirado en paredes y molduras)
      primary: "#05ca6e",   // Blanco roto
      secondary: "#05a359", // Gris muy claro (sombras de moldura)
      tertiary: "#287953",  // Beige hueso
      glow: "#026034",      // Blanco puro
    },
    tema2: { // Sobrios/Neutros (Inspirado en panel y silla)
      primary: "#6A6A6A",   // Gris oscuro/madera quemada
      secondary: "#A99580", // Taupe/marrón grisáceo
      tertiary: "#424242",  // Carbón/silla de oficina
      glow: "#CFC5BB",      // Resplandor neutro
    },
    tema3: { // Intenso (Inspirado en madera cálida y naturaleza)
      primary: "#BC7736",   // Pino cálido/miel (de la puerta)
      secondary: "#228B22", // Verde bosque refinado (de la pantalla)
      tertiary: "#3F3F3F",  // Gris intenso (profundidad)
      glow: "#FFECC9",      // Resplandor cálido de la madera
    },
  };

if (typeof window !== "undefined") {
  window.InmoVisualThemePresets = visualThemePresets;
}

export function normalizeTheme(theme, fallback = defaultTheme) {
    const source = theme && typeof theme === "object" ? theme : {};

    return {
      primary: sanitizeHexColor(source.primary ?? source.theme_primary ?? source.themePrimary ?? source.color, fallback.primary),
      secondary: sanitizeHexColor(source.secondary ?? source.theme_secondary ?? source.themeSecondary, fallback.secondary),
      tertiary: sanitizeHexColor(source.tertiary ?? source.theme_tertiary ?? source.themeTertiary, fallback.tertiary),
      glow: sanitizeHexColor(source.glow ?? source.theme_glow ?? source.themeGlow, fallback.glow),
    };
  }

export function resolveVisualPresetKey(token) {
    const normalized = normalizeFieldToken(token);

    if (!normalized) {
      return "tema1";
    }

    if (["tema1", "preset1", "estilo1", "opcion1", "1", "default", "clasico", "classic", "azul", "blue", "oceano", "ocean", "claro", "light"].includes(normalized)) {
      return "tema1";
    }

    if (["tema2", "preset2", "estilo2", "opcion2", "2", "neutro", "neutral", "gris", "gray", "slate"].includes(normalized)) {
      return "tema2";
    }

    if (["tema3", "preset3", "estilo3", "opcion3", "3", "intenso", "intense", "vibrante", "vibrant", "bold", "alto"].includes(normalized)) {
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

    const hasLegacyTheme =
      hasValue(source.theme) ||
      hasValue(source.theme_primary) ||
      hasValue(source.theme_secondary) ||
      hasValue(source.theme_tertiary) ||
      hasValue(source.theme_glow);

    if (!selectionToken && hasLegacyTheme) {
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

    if (!selectionToken) {
      return null;
    }

    const presetKey = resolveVisualPresetKey(selectionToken);
    const presetTheme = visualThemePresets[presetKey] || defaultTheme;

    return {
      ...normalizeTheme(presetTheme, fallbackTheme),
      visualPresetKey: presetKey,
      visualPresetValue: toText(selectionValue),
      forceExactTheme: true,
    };
  }