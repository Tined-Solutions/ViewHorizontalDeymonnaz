import { parseNumber, parsePrice, pickField, parseDuration, slugify, toBooleanFlag } from './mappers.js';
import { normalizeMedia, safeUrl } from './media.js';
import { buildServiceFeaturesFromFlags, buildPanelMetrics } from './metrics.js';
import { normalizeTheme, resolveVisualTheme } from './theme.js';
import { toText, normalizeFieldToken, hasValue, toArray, isRecordActive, normalizeFeatures, normalizeDetails, joinUniqueTexts, normalizeOperationLabel, buildPropertySummary } from './utils.js';

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

    const fallbackDurationMs = Number(config.defaultDurationMs) || 20000;
    const totalDurationMs = parseDuration(pickField(doc, ["durationMs", "duration_ms", "slideDurationMs", "slideDuration", "duration"]), fallbackDurationMs);
    const media = normalizeMedia(pickField(doc, ["media", "fotos", "images", "gallery", "galeria"]) || doc.media || doc.fotos || doc.images || doc.gallery, totalDurationMs, config);

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
    const publishedUrl = toText(
      pickField(doc, [
        "publishedUrl",
        "Link",
        "propertyUrl",
        "publicUrl",
        "qrLink",
        "link",
        "url",
        "href",
        "siteUrl",
        "canonicalUrl",
        "permalink",
        "publicacionUrl",
        "landingUrl",
      ])
    );

    const metrics = buildPanelMetrics(doc);

    const property = {
      id: toText(doc.id ?? doc.slug?.current ?? doc.slug ?? doc._id ?? slugify(name)) || slugify(name),
      slug: toText(doc.slug?.current ?? doc.slug ?? ""),
      name,
      title: toText(doc.title ?? doc.titulo ?? name),
      type,
      location,
      price: parsePrice(pickField(doc, ["price", "precio", "valor", "importe", "amount"])),
      currency: toText(pickField(doc, ["moneda", "currency", "currencyCode", "currency_code"])),
      badge: toText(doc.badge) || operationLabel,
      summary: buildPropertySummary(doc, type, location, operationLabel),
      publishedUrl,
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
    return {
      company: {
        name: "",
        tagline: "",
      },
      properties: [],
      siteBaseUrl: toText(config.publicBaseUrl),
      radio: normalizeRadioSettings({}, config),
      visualTheme: resolveVisualTheme({}, config),
      state: "unconfigured",
      message: "Completa projectId y dataset en src/config/sanity.js.",
    };
  }