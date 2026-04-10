import { toText } from './utils.js';

export function createClientInstance(config) {
    const createClient = window.SanityClient && window.SanityClient.createClient;

    if (typeof createClient !== "function") {
      return null;
    }

    return createClient({
      projectId: toText(config.projectId),
      dataset: toText(config.dataset),
      apiVersion: toText(config.apiVersion) || "2026-04-02",
      useCdn: config.useCdn !== false,
      perspective: config.perspective || "published",
    });
  }
export async function loadCatalog(config = {}) {
    const fallback = createEmptyCatalog(config);
    const projectId = toText(config.projectId);
    const dataset = toText(config.dataset);

    if (!projectId || !dataset) {
      return fallback;
    }

    const client = createClientInstance(config);

    if (!client) {
      return {
        ...fallback,
        state: "error",
        message: "No se pudo cargar el cliente de Sanity.",
      };
    }

    try {
      const settingsTypes = Array.from(
        new Set(
          [
            ...toArray(config.settingsTypes).map((item) => toText(item)).filter(Boolean),
            toText(config.settingsType) || "siteSettings",
            "siteSettings",
            "visualSettings",
            "configuracionVisual",
            "configuracionDashboard",
            "siteConfig",
          ].filter(Boolean)
        )
      );
      const propertyTypes = Array.isArray(config.propertyTypes) && config.propertyTypes.length > 0 ? config.propertyTypes.map(toText).filter(Boolean) : [toText(config.propertyType) || "property"];
      const [settingsDocument, propertyDocuments] = await Promise.all([
        client.fetch(buildSettingsQuery(), { settingsTypes }),
        client.fetch(buildPropertiesQuery(), { propertyTypes }),
      ]);

      const company = normalizeCompany(settingsDocument, config);
      let visualTheme = resolveVisualTheme(settingsDocument, config);

      if (!visualTheme && Array.isArray(propertyDocuments) && propertyDocuments.length > 0) {
        visualTheme = resolveVisualTheme(propertyDocuments[0], config);
      }

      const properties = Array.isArray(propertyDocuments) ? propertyDocuments.map((document) => normalizeProperty(document, config)).filter(Boolean) : [];
      const siteBaseUrl = toText(settingsDocument && (settingsDocument.publicBaseUrl || settingsDocument.siteBaseUrl)) || toText(config.publicBaseUrl);

      if (properties.length === 0) {
        return {
          company,
          properties,
          siteBaseUrl,
          visualTheme,
          state: "empty",
          message: "Todavia no hay inmuebles publicados.",
        };
      }

      properties.sort(sortProperties);

      return {
        company,
        properties,
        siteBaseUrl,
        visualTheme,
        state: "ready",
      };
    } catch (error) {
      return {
        ...fallback,
        state: "error",
        message: error instanceof Error ? error.message : "No se pudo conectar con Sanity.",
      };
    }
  }
