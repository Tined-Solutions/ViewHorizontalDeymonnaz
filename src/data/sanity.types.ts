export type OperacionInmueble = "venta" | "alquiler" | string;
export type MonedaInmueble = "USD" | "ARS" | string;
export type SitioPublicacion =
  | "horizontal"
  | "vertical"
  | "vertical-cremolatti"
  | "ambas-verticales"
  | "horizontal-ambas-verticales"
  | "ambos"
  | "horizontal-vertical-cremolatti";

export interface SanityAssetReference {
  _ref?: string;
  _id?: string;
  url?: string;
  mimeType?: string;
  metadata?: {
    duration?: number;
    durationMs?: number;
    playbacks?: Array<{ _id?: string; policy?: string }>;
  };
}

export interface SanityImageItem {
  _key?: string;
  _type?: string;
  src?: string;
  poster?: string;
  caption?: string;
  alt?: string;
  title?: string;
  name?: string;
  duration?: number;
  durationMs?: number;
  duration_ms?: number;
  asset?: SanityAssetReference | null;
}

export interface SanityVideoItem {
  _key?: string;
  _type?: string;
  src?: string;
  url?: string;
  poster?: string;
  caption?: string;
  duration?: number;
  durationMs?: number;
  duration_ms?: number;
  mimeType?: string;
  playbackId?: string;
  durationSeconds?: number;
  asset?: SanityAssetReference | null;
}

export interface SanityInmuebleDocument {
  _id: string;
  _type: "inmueble" | string;
  id?: string;
  slug?: { current?: string } | string;
  titulo: string;
  title?: string;
  name?: string;

  Tipo?: string;
  tipo?: string;
  operacion?: OperacionInmueble;
  Direccion?: string;

  SuperficieTerreno?: number;
  superficieTerreno?: number;
  SuperficieEdificada?: number;
  superficieEdificada?: number;

  Banos?: number;
  banos?: number;
  Habitaciones?: number;
  habitaciones?: number;
  Cochera?: number;
  cochera?: number;

  Piscina?: boolean;
  piscina?: boolean;
  Patio?: boolean;
  patio?: boolean;
  Servicios?: string[];
  servicios?: string[];

  moneda?: MonedaInmueble;
  precio?: number;

  publicacionConZocalo?: boolean | "si" | "no" | string;
  fotos?: SanityImageItem[];
  fotosSinZocalo?: SanityImageItem[];

  videoMp4?: SanityVideoItem | null;
  videoUrl?: string;
  videoMimeType?: string;

  mantenerZocaloEnVideo?: boolean | string;
  Link?: string;

  sitioPublicacion?: SitioPublicacion | string;

  active?: boolean | string | number;
  status?: string;
  sortOrder?: number;

  [key: string]: unknown;
}

export interface SanitySettingsDocument {
  _id?: string;
  _type?: string;
  companyName?: string;
  companyTagline?: string;
  name?: string;
  title?: string;
  publicBaseUrl?: string;
  siteBaseUrl?: string;

  publicationTarget?: SitioPublicacion | "all" | string;
  sitioPublicacion?: SitioPublicacion | string;

  [key: string]: unknown;
}

export interface SanityDashboardSettingsDocument {
  _id?: string;
  tiempoVisualizacionSegundos?: number;
  estiloColor?: string;
  radioActiva?: boolean;
  radioSeleccionada?: "radio_1" | "radio_2" | "radio_3" | string;
  radioUrl1?: string;
  radioUrl2?: string;
  radioUrl3?: string;
  radioUrlActiva?: string;
  [key: string]: unknown;
}

export interface SanityCatalogQueryResult {
  settingsDocument: SanitySettingsDocument | null;
  dashboardSettingsDocument: SanityDashboardSettingsDocument | null;
  propertyDocuments: SanityInmuebleDocument[];
}

export interface NormalizedMediaItem {
  type: "image" | "video";
  src: string;
  caption: string;
  duration: number;
  poster: string;
  zocaloVariant?: "con" | "sin";
}

export interface NormalizedProperty {
  id: string;
  slug: string;
  name: string;
  title: string;

  sitioPublicacion: SitioPublicacion;
  isConZocalo: boolean;
  mantenerZocaloEnVideo: boolean;

  galleryConZocalo: NormalizedMediaItem[];
  gallerySinZocalo: NormalizedMediaItem[];
  videoUrl: string | null;
  qrLinkAplicable: string;

  media: NormalizedMediaItem[];

  publishedUrl: string;
  videoMimeType: string;
  type: string;
  location: string;
  price: number;
  currency: string;

  summary: string;
  badge: string;

  [key: string]: unknown;
}
