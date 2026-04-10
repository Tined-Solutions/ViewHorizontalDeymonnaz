export function isCatalogReady(catalog) {
  return Boolean(catalog && Array.isArray(catalog.properties) && catalog.properties.length > 0);
}

export function catalogSignature(catalog) {
  return JSON.stringify({
    company: catalog.company || {},
    siteBaseUrl: catalog.siteBaseUrl || "",
    visualTheme: catalog.visualTheme
      ? {
          primary: catalog.visualTheme.primary || "",
          secondary: catalog.visualTheme.secondary || "",
          tertiary: catalog.visualTheme.tertiary || "",
          glow: catalog.visualTheme.glow || "",
          visualPresetKey: catalog.visualTheme.visualPresetKey || "",
          visualPresetValue: catalog.visualTheme.visualPresetValue || "",
        }
      : null,
    properties: catalog.properties.map((property) => ({
      id: property.id,
      name: property.name,
      publishedUrl: property.publishedUrl || "",
      sortOrder: Number.isFinite(property.sortOrder) ? property.sortOrder : null,
      media: Array.isArray(property.media)
        ? property.media.map((item) => ({
            type: item.type,
            src: item.src,
            duration: item.duration || 0,
          }))
        : [],
    })),
  });
}

export function resolveInitialPropertyIndex(catalog) {
  const searchParams = new URLSearchParams(window.location.search);
  const rawTarget = searchParams.get("property") || searchParams.get("inmueble") || searchParams.get("slug") || window.location.hash.replace(/^#/, "");
  const target = String(rawTarget || "").trim().toLowerCase();

  if (!target) {
    return 0;
  }

  const matchingIndex = catalog.properties.findIndex((property) => String(property.id || "").trim().toLowerCase() === target);

  return matchingIndex >= 0 ? matchingIndex : 0;
}

export function buildPropertyUrl(property, siteBaseUrl) {
  if (property && property.publishedUrl) {
    try {
      const fallbackBase = String(siteBaseUrl || "").trim() ? new URL(siteBaseUrl, window.location.href) : new URL(window.location.href);
      const resolvedUrl = new URL(String(property.publishedUrl), fallbackBase);

      if (["http:", "https:"].includes(resolvedUrl.protocol)) {
        return resolvedUrl.toString();
      }
    } catch {
      // If resolution fails, fall back to the default site URL logic below.
    }
  }

  const configuredBase = String(siteBaseUrl || "").trim();
  const baseUrl = configuredBase ? new URL(configuredBase, window.location.href) : new URL(window.location.href);

  baseUrl.search = "";
  baseUrl.hash = "";
  baseUrl.searchParams.set("property", property.id);

  return baseUrl.toString();
}

export function buildQrUrl(property, siteBaseUrl) {
  const propertyUrl = buildPropertyUrl(property, siteBaseUrl);
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=10&data=${encodeURIComponent(propertyUrl)}`;
}
