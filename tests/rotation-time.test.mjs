import test from "node:test";
import assert from "node:assert/strict";

import { resolveDuracionYComportamiento } from "../src/shared/rotation.js";

if (!globalThis.window) {
  globalThis.window = {
    location: {
      href: "http://localhost/",
    },
  };
}

test("usa fallback de 15 segundos si falta tiempo global", () => {
  const result = resolveDuracionYComportamiento({}, undefined);

  assert.equal(result.duracionMs, 15000);
  assert.equal(result.reproducirVideoCompleto, false);
  assert.equal(result.videoUrl, null);
  assert.equal(result.modoReproduccionVideo, "ajustar_tiempo_global");
});

test("inmueble sin video respeta exactamente el tiempo global", () => {
  const result = resolveDuracionYComportamiento({ modoReproduccionVideo: "completo" }, 22);

  assert.equal(result.duracionMs, 22000);
  assert.equal(result.reproducirVideoCompleto, false);
  assert.equal(result.videoUrl, null);
});

test("video en modo completo activa reproduccion hasta ended", () => {
  const result = resolveDuracionYComportamiento(
    {
      modoReproduccionVideo: "completo",
      videoUrl: "https://cdn.sanity.io/files/demo/video.mp4",
    },
    15
  );

  assert.equal(result.duracionMs, 15000);
  assert.equal(result.reproducirVideoCompleto, true);
  assert.equal(result.videoUrl, "https://cdn.sanity.io/files/demo/video.mp4");
});

test("video en modo ajustar_tiempo_global usa timer global", () => {
  const result = resolveDuracionYComportamiento(
    {
      modoReproduccionVideo: "ajustar_tiempo_global",
      videoUrl: "https://cdn.sanity.io/files/demo/video.mp4",
    },
    12
  );

  assert.equal(result.duracionMs, 12000);
  assert.equal(result.reproducirVideoCompleto, false);
  assert.equal(result.videoUrl, "https://cdn.sanity.io/files/demo/video.mp4");
});

test("modoReproduccionVideo null hace fallback a ajustar_tiempo_global", () => {
  const result = resolveDuracionYComportamiento(
    {
      modoReproduccionVideo: null,
      videoUrl: "https://cdn.sanity.io/files/demo/video.mp4",
    },
    10
  );

  assert.equal(result.modoReproduccionVideo, "ajustar_tiempo_global");
  assert.equal(result.reproducirVideoCompleto, false);
  assert.equal(result.duracionMs, 10000);
});

test("si falta videoUrl usa el primer media de tipo video", () => {
  const result = resolveDuracionYComportamiento(
    {
      modoReproduccionVideo: "completo",
      media: [
        { type: "image", src: "https://cdn.sanity.io/images/demo/foto.jpg" },
        { type: "video", src: "https://cdn.sanity.io/files/demo/video.mp4" },
      ],
    },
    18
  );

  assert.equal(result.videoUrl, "https://cdn.sanity.io/files/demo/video.mp4");
  assert.equal(result.reproducirVideoCompleto, true);
  assert.equal(result.duracionMs, 18000);
});

test("si la URL de video es invalida cae a timer global", () => {
  const result = resolveDuracionYComportamiento(
    {
      modoReproduccionVideo: "completo",
      videoUrl: "ftp://invalid-video-source",
    },
    9
  );

  assert.equal(result.videoUrl, null);
  assert.equal(result.reproducirVideoCompleto, false);
  assert.equal(result.duracionMs, 9000);
});

test("si tiempo global es invalido usa 15 segundos", () => {
  const resultA = resolveDuracionYComportamiento({}, "");
  const resultB = resolveDuracionYComportamiento({}, 0);
  const resultC = resolveDuracionYComportamiento({}, -5);
  const resultD = resolveDuracionYComportamiento({}, "abc");

  assert.equal(resultA.duracionMs, 15000);
  assert.equal(resultB.duracionMs, 15000);
  assert.equal(resultC.duracionMs, 15000);
  assert.equal(resultD.duracionMs, 15000);
});
