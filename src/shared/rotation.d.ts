export type ModoReproduccionVideo = "completo" | "ajustar_tiempo_global";

export type RotacionMediaItem = {
  type?: string | null | undefined;
  src?: string | null | undefined;
};

export type RotacionItem = {
  modoReproduccionVideo?: string | null | undefined;
  videoUrl?: string | null | undefined;
  media?: RotacionMediaItem[] | null | undefined;
};

export type DuracionYComportamiento = {
  duracionMs: number;
  reproducirVideoCompleto: boolean;
  videoUrl: string | null;
  modoReproduccionVideo: ModoReproduccionVideo;
};

export function resolveDuracionYComportamiento(
  item: RotacionItem | null | undefined,
  tiempoGlobal: number | string | null | undefined
): DuracionYComportamiento;
