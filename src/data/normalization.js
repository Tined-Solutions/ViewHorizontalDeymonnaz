import { parseNumber, parsePrice, pickField, slugify, toBooleanFlag, resolveSurfaceValues } from './mappers.js';
import { normalizeMedia, safeUrl } from './media.js';
import { buildServiceFeaturesFromFlags, buildPanelMetrics } from './metrics.js';
import { normalizeTheme, resolveVisualTheme } from './theme.js';
import { toText, normalizeFieldToken, hasValue, toArray, isRecordActive, normalizeFeatures, normalizeDetails, joinUniqueTexts, normalizeOperationLabel, buildPropertySummary } from './utils.js';

function resolveGlobalDisplaySeconds(value, fallbackSeconds = 15) {
    const parsed = Number.parseFloat(toText(value).replace(",", "."));

    if (!Number.isFinite(parsed) || parsed <= 0) {
      return fallbackSeconds;
    }

    return Math.max(1, Math.round(parsed));
  }

function normalizeSitioPublicacionToken(value) {
    const token = normalizeFieldToken(value);

    if (!token) {
      return "";
    }

    if (
      token === "all" ||
      token.includes("ambos") ||
      token.includes("ambas") ||
      token.includes("both") ||
      token.includes("todos")
    ) {
      return "ambos";
    }

    if (token === "h" || token.includes("horizontal") || token.includes("landscape") || token.includes("apaisado")) {
      return "horizontal";
    }

    if (token === "v" || token.includes("vertical") || token.includes("portrait") || token.includes("retrato")) {
      return "vertical";
    }

    return "";
  }

function collectSitioPublicacionTokens(value, targetSet) {
    if (value === null || value === undefined) {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((item) => collectSitioPublicacionTokens(item, targetSet));
      return;
    }

    if (typeof value === "object") {
      collectSitioPublicacionTokens(value.value, targetSet);
      collectSitioPublicacionTokens(value.label, targetSet);
      collectSitioPublicacionTokens(value.name, targetSet);
      collectSitioPublicacionTokens(value.title, targetSet);
      collectSitioPublicacionTokens(value.current, targetSet);
      return;
    }

    const text = toText(value);

    if (!text) {
      return;
    }

    const parts = text
      .split(/[,;|/+]/g)
      .flatMap((part) => part.split(/\s+(?:y|e|o|u|and|or)\s+/i))
      .map((part) => toText(part))
      .filter(Boolean);
    const candidates = parts.length > 0 ? parts : [text];

    candidates.forEach((candidate) => {
      const normalized = normalizeSitioPublicacionToken(candidate);

      if (normalized) {
        targetSet.add(normalized);
      }
    });
  }

function resolveSitioPublicacion(...values) {
    const tokens = new Set();

    values.forEach((value) => collectSitioPublicacionTokens(value, tokens));

    if (tokens.has("ambos") || (tokens.has("horizontal") && tokens.has("vertical"))) {
      return "ambos";
    }

    if (tokens.has("horizontal")) {
      return "horizontal";
    }

    if (tokens.has("vertical")) {
      return "vertical";
    }

    return "";
  }

function resolvePublicacionConZocalo(value) {
    if (!hasValue(value)) {
      return true;
    }

    return toBooleanFlag(value);
  }

function resolveMantenerZocaloEnVideo(value, isConZocalo) {
    if (hasValue(value)) {
      return toBooleanFlag(value);
    }

    return Boolean(isConZocalo);
  }

function asImageGallery(items) {
    return toArray(items)
      .filter((item) => item && item.type === "image" && item.src)
      .map((item) => ({ ...item }));
  }

export function normalizeCompany(settings, config) {
    const source = settings && typeof settings === "object" ? settings : {};

    return {
      name: toText(source.companyName ?? source.name ?? source.title ?? config.companyName),
      tagline: toText(source.companyTagline ?? source.tagline ?? source.description ?? config.companyTagline),
    };
  }

export function normalizeRadioSelection(value) {
    const token = normalizeFieldToken(value);

    if (!token) {
      return "";
    }

    if (["radio1", "radio01", "1"].includes(token)) {
      return "radio_1";
    }

    if (["radio2", "radio02", "2"].includes(token)) {
      return "radio_2";
    }

    if (["radio3", "radio03", "3"].includes(token)) {
      return "radio_3";
    }

    return "";
  }

export function normalizeRadioSettings(settings, config = {}) {
    const source = settings && typeof settings === "object" ? settings : {};
    const radioSeleccionada = normalizeRadioSelection(
      source.radioSeleccionada ?? source.radio_seleccionada ?? source.radioSelection ?? source.radio_selected ?? config.radioSeleccionada ?? config.radioSelection
    );
    const radioUrls = {
      radio_1: safeUrl(source.radioUrl1 ?? source.radio_url_1 ?? source.radio1Url ?? config.radioUrl1),
      radio_2: safeUrl(source.radioUrl2 ?? source.radio_url_2 ?? source.radio2Url ?? config.radioUrl2),
      radio_3: safeUrl(source.radioUrl3 ?? source.radio_url_3 ?? source.radio3Url ?? config.radioUrl3),
    };
    const radioUrlPorSeleccion = radioSeleccionada ? radioUrls[radioSeleccionada] || "" : "";
    const radioUrlActiva = safeUrl(
      source.radioUrlActiva ?? source.radio_url_activa ?? source.radioActivaUrl ?? source.activeRadioUrl ?? radioUrlPorSeleccion
    );
    const radioActiva = toBooleanFlag(
      source.radioActiva ?? source.radio_activa ?? source.radioEnabled ?? source.radio_enabled ?? config.radioActiva
    );

    return {
      activa: radioActiva,
      seleccionada: radioSeleccionada,
      url1: radioUrls.radio_1,
      url2: radioUrls.radio_2,
      url3: radioUrls.radio_3,
      urlActiva: radioActiva ? radioUrlActiva : "",
    };
  }

export function normalizeProperty(doc, config) {
    if (!doc || typeof doc !== "object" || !isRecordActive(doc)) {
      return null;
    }

    const name = toText(doc.titulo ?? doc.name ?? doc.title);

    if (!name) {
      return null;
    }

    const fallbackDurationMs = Number(config.defaultDurationMs);
    const totalDurationMs = Number.isFinite(fallbackDurationMs) && fallbackDurationMs > 0 ? Math.round(fallbackDurationMs) : 15000;
    const isConZocalo = resolvePublicacionConZocalo(
      pickField(doc, ["publicacionConZocalo", "publicacion_con_zocalo", "conZocalo", "con_zocalo"], undefined)
    );
    const galleryConZocalo = asImageGallery(
      normalizeMedia([pickField(doc, ["fotos", "Fotos"]), pickField(doc, ["gallery", "galeria", "images"])], totalDurationMs, config)
    );
    const gallerySinZocalo = asImageGallery(
      normalizeMedia([pickField(doc, ["fotosSinZocalo", "FotosSinZocalo", "fotos_sin_zocalo"])], totalDurationMs, config)
    );
    const gallerySinZocaloFallback = !isConZocalo && gallerySinZocalo.length === 0 && galleryConZocalo.length > 0
      ? galleryConZocalo.map((item) => ({ ...item }))
      : gallerySinZocalo.map((item) => ({ ...item }));
    const totalGalleryImages = galleryConZocalo.length + gallerySinZocalo.length;
    const safeGalleryImageCount = totalGalleryImages > 0 ? totalGalleryImages : gallerySinZocaloFallback.length;
    const perImageDurationMs = safeGalleryImageCount > 0
      ? Math.max(1000, Math.round(totalDurationMs / safeGalleryImageCount))
      : totalDurationMs;
    const galleryConZocaloWithDuration = galleryConZocalo.map((item) => ({
      ...item,
      duration: perImageDurationMs,
      zocaloVariant: "con",
    }));
    const gallerySinZocaloWithDuration = gallerySinZocalo.map((item) => ({
      ...item,
      duration: perImageDurationMs,
      zocaloVariant: "sin",
    }));
    const gallerySinZocaloFallbackWithDuration = gallerySinZocaloFallback.map((item) => ({
      ...item,
      duration: perImageDurationMs,
      zocaloVariant: "sin",
    }));
    const normalizedGallerySinZocalo = gallerySinZocaloWithDuration.length > 0
      ? gallerySinZocaloWithDuration
      : (!isConZocalo ? gallerySinZocaloFallbackWithDuration : gallerySinZocaloWithDuration);
    const videoMedia = normalizeMedia(
      [
        pickField(doc, ["videoMp4", "video_mp4", "videoFile", "video_file"]),
        pickField(doc, ["video", "Video"]),
        pickField(doc, ["videos", "Videos"]),
        pickField(doc, ["videoGallery", "video_gallery", "videoGalleryItems", "videoItems"]),
        pickField(doc, ["videoUrl", "video_url", "videoSrc", "video_src"]),
      ],
      totalDurationMs,
      config
    ).filter((item) => item && item.type === "video" && item.src);
    const explicitVideoUrl = safeUrl(pickField(doc, ["videoUrl", "video_url", "videoMp4.asset.url"]));
    const firstVideoMedia = videoMedia.find((item) => item && item.type === "video" && item.src);
    const resolvedVideoUrl = explicitVideoUrl || (firstVideoMedia ? safeUrl(firstVideoMedia.src) : "");
    const videoItem = resolvedVideoUrl
      ? {
          type: "video",
          src: resolvedVideoUrl,
          caption: toText(firstVideoMedia && firstVideoMedia.caption),
          duration: Number.isFinite(firstVideoMedia && firstVideoMedia.duration) ? firstVideoMedia.duration : 0,
          poster: toText(firstVideoMedia && firstVideoMedia.poster),
        }
      : null;
    const mantenerZocaloEnVideo = resolveMantenerZocaloEnVideo(
      pickField(doc, ["mantenerZocaloEnVideo", "mantener_zocalo_en_video", "videoConZocalo"], undefined),
      isConZocalo
    );
    const principalGallery = isConZocalo
      ? (() => {
          const ordered = [...galleryConZocaloWithDuration, ...gallerySinZocaloWithDuration];
          return ordered.length > 0 ? ordered : gallerySinZocaloFallbackWithDuration;
        })()
      : (normalizedGallerySinZocalo.length > 0 ? normalizedGallerySinZocalo : galleryConZocaloWithDuration);
    const media = principalGallery.map((item) => ({ ...item }));

    if (videoItem && !media.some((item) => item.type === "video" && item.src === videoItem.src)) {
      media.unshift(videoItem);
    }

    if (media.length === 0) {
      return null;
    }

    const type = toText(pickField(doc, ["Tipo", "tipo", "type", "propertyType", "inmuebleTipo"]));
    const operationLabel = normalizeOperationLabel(pickField(doc, ["operacion", "operation", "tipoOperacion", "operationType", "badge"]));
    const location = joinUniqueTexts([
      pickField(doc, ["Ubicacion", "ubicacion", "location"]),
      pickField(doc, ["neighborhood", "barrio", "zona"]),
      pickField(doc, ["city", "ciudad"]),
    ]) || toText(pickField(doc, ["Direccion", "direccion", "address"]));
    const qrLinkCandidato = toText(
      pickField(doc, ["Link", "linkQr", "linkQR", "qrLink", "qr_link"])
    );
    const qrLinkAplicable = isConZocalo ? qrLinkCandidato : "";
    const publishedUrl = toText(
      pickField(doc, [
        "publishedUrl",
        "propertyUrl",
        "publicUrl",
        "link",
        "url",
        "href",
        "siteUrl",
        "canonicalUrl",
        "permalink",
        "publicacionUrl",
        "landingUrl",
      ])
    ) || qrLinkAplicable;
    const sitioPublicacion =
      resolveSitioPublicacion(
        pickField(doc, ["sitioPublicacion", "sitio_de_publicacion", "publicationTarget", "publicarEn", "canalPublicacion"])
      ) || "ambos";
    const surfaces = resolveSurfaceValues(doc);

    const metrics = buildPanelMetrics(doc);

    const property = {
      id: toText(doc.id ?? doc.slug?.current ?? doc.slug ?? doc._id ?? slugify(name)) || slugify(name),
      slug: toText(doc.slug?.current ?? doc.slug ?? ""),
      name,
      title: toText(doc.title ?? doc.titulo ?? name),
      sitioPublicacion,
      isConZocalo,
      mantenerZocaloEnVideo,
      type,
      location,
      price: parsePrice(pickField(doc, ["price", "precio", "valor", "importe", "amount"])),
      currency: toText(pickField(doc, ["moneda", "currency", "currencyCode", "currency_code"])),
      videoUrl: resolvedVideoUrl || null,
      videoMimeType: toText(pickField(doc, ["videoMimeType", "video_mime_type", "videoMp4.asset.mimeType"])),
      galleryConZocalo: galleryConZocaloWithDuration,
      gallerySinZocalo: normalizedGallerySinZocalo,
      qrLinkAplicable,
      badge: toText(doc.badge) || operationLabel,
      summary: buildPropertySummary(doc, type, location, operationLabel),
      publishedUrl,
      superficieTerreno: surfaces.superficieTerreno,
      superficieEdificada: surfaces.superficieEdificada,
      superficieLegacy: surfaces.superficieLegacy,
      SuperficieTerreno: surfaces.superficieTerreno,
      SuperficieEdificada: surfaces.superficieEdificada,
      SuperficieLegacy: surfaces.superficieLegacy,
      metrics,
      features: normalizeFeatures([
        ...toArray(
          pickField(doc, [
            "Servicios",
            "servicios",
            "ServiciosDisponibles",
            "serviciosDisponibles",
            "services",
            "serviceList",
            "service_list",
            "amenidades",
            "comodidades",
            "caracteristicas",
            "features",
            "amenities",
          ])
        ),
        ...buildServiceFeaturesFromFlags(doc),
      ]),
      theme: normalizeTheme(doc.theme ?? {
        primary: doc.theme_primary,
        secondary: doc.theme_secondary,
        tertiary: doc.theme_tertiary,
        glow: doc.theme_glow,
      }),
      media,
    };

    property.details = normalizeDetails(doc, property);

    const rawSortOrder = doc.sortOrder ?? doc.sort_order ?? doc.order ?? doc.rank;

    if (hasValue(rawSortOrder)) {
      const sortOrder = parseNumber(rawSortOrder);

      if (Number.isFinite(sortOrder)) {
        property.sortOrder = sortOrder;
      }
    }

    return property;
  }

export function createEmptyCatalog(config = {}) {
    const tiempoVisualizacionSegundos = resolveGlobalDisplaySeconds(config.tiempoVisualizacionSegundos, 15);

    return {
      company: {
        name: "",
        tagline: "",
      },
      properties: [],
      siteBaseUrl: toText(config.publicBaseUrl),
      tiempoVisualizacionSegundos,
      defaultDurationMs: tiempoVisualizacionSegundos * 1000,
      radio: normalizeRadioSettings({}, config),
      visualTheme: resolveVisualTheme({}, config),
      state: "unconfigured",
      message: "Completa projectId y dataset en src/config/sanity.js.",
    };
  }