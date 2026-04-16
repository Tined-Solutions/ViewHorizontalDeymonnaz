function toText(value) {
  return String(value ?? "").trim();
}

function clampVolume(value, fallback = 1) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(Math.max(parsed, 0), 1);
}

function isHlsLikeSource(url) {
  return /(?:\.m3u8(?:$|\?)|stream\.mux\.com)/i.test(toText(url));
}

function resolveRadioUrl(radio) {
  const source = radio && typeof radio === "object" ? radio : {};
  const explicitUrl = toText(source.urlActiva);

  if (explicitUrl) {
    return explicitUrl;
  }

  const selection = toText(source.seleccionada).toLowerCase();

  if (selection === "radio_1") {
    return toText(source.url1);
  }

  if (selection === "radio_2") {
    return toText(source.url2);
  }

  if (selection === "radio_3") {
    return toText(source.url3);
  }

  return "";
}

function normalizeDesiredState(catalog) {
  const radio = catalog && typeof catalog === "object" && catalog.radio && typeof catalog.radio === "object" ? catalog.radio : {};

  return {
    active: Boolean(radio.activa),
    url: resolveRadioUrl(radio),
  };
}

export function createRadioAutoplayManager(options = {}) {
  const audio = new Audio();
  const interactionEvents = ["pointerdown", "keydown", "touchstart", "click"];
  const retryDelayMs = Number.isFinite(Number(options.retryDelayMs)) ? Math.max(500, Number(options.retryDelayMs)) : 1500;

  let hls = null;
  let desiredState = { active: false, url: "" };
  let retryTimerId = 0;
  let interactionBound = false;
  let destroyed = false;

  audio.preload = "auto";
  audio.autoplay = false;
  audio.loop = Boolean(options.loop);
  audio.crossOrigin = "anonymous";
  audio.volume = clampVolume(options.volume, 1);

  function clearRetry() {
    if (!retryTimerId) {
      return;
    }

    window.clearTimeout(retryTimerId);
    retryTimerId = 0;
  }

  function destroyHls() {
    if (!hls) {
      return;
    }

    hls.destroy();
    hls = null;
  }

  function stopPlayback() {
    clearRetry();
    unbindInteractionFallback();
    destroyHls();
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
  }

  function bindSource(url) {
    const nextUrl = toText(url);

    if (!nextUrl) {
      stopPlayback();
      return;
    }

    if (isHlsLikeSource(nextUrl) && window.Hls && typeof window.Hls.isSupported === "function" && window.Hls.isSupported()) {
      if (hls && audio.dataset.radioSourceUrl === nextUrl) {
        return;
      }

      destroyHls();
      audio.removeAttribute("src");
      audio.load();

      const instance = new window.Hls({
        autoStartLoad: true,
        lowLatencyMode: true,
      });

      instance.loadSource(nextUrl);
      instance.attachMedia(audio);
      hls = instance;
      audio.dataset.radioSourceUrl = nextUrl;
      return;
    }

    if (!hls && audio.dataset.radioSourceUrl === nextUrl) {
      return;
    }

    destroyHls();
    audio.src = nextUrl;
    audio.dataset.radioSourceUrl = nextUrl;
    audio.load();
  }

  function bindInteractionFallback() {
    if (interactionBound) {
      return;
    }

    interactionBound = true;

    interactionEvents.forEach((eventName) => {
      window.addEventListener(eventName, handleInteractionAttempt, { passive: true });
    });
  }

  function unbindInteractionFallback() {
    if (!interactionBound) {
      return;
    }

    interactionBound = false;

    interactionEvents.forEach((eventName) => {
      window.removeEventListener(eventName, handleInteractionAttempt);
    });
  }

  function scheduleRetry() {
    clearRetry();
    retryTimerId = window.setTimeout(() => {
      void attemptPlayback();
    }, retryDelayMs);
  }

  async function attemptPlayback() {
    if (destroyed || !desiredState.active || !desiredState.url) {
      return;
    }

    clearRetry();
    bindSource(desiredState.url);

    audio.muted = false;

    try {
      await audio.play();
      unbindInteractionFallback();
      return;
    } catch {
      // In strict autoplay policies, bootstrap playback muted and then unmute.
      try {
        audio.muted = true;
        await audio.play();
        audio.muted = false;
        unbindInteractionFallback();
        return;
      } catch {
        bindInteractionFallback();
        scheduleRetry();
      }
    }
  }

  function handleInteractionAttempt() {
    void attemptPlayback();
  }

  function handleVisibilityChange() {
    if (document.visibilityState !== "visible") {
      return;
    }

    void attemptPlayback();
  }

  function handleWindowFocus() {
    void attemptPlayback();
  }

  document.addEventListener("visibilitychange", handleVisibilityChange);
  window.addEventListener("focus", handleWindowFocus);

  return {
    updateFromCatalog(catalog) {
      if (destroyed) {
        return;
      }

      const nextState = normalizeDesiredState(catalog);
      const sourceChanged = nextState.url !== desiredState.url;

      desiredState = nextState;

      if (!desiredState.active || !desiredState.url) {
        stopPlayback();
        return;
      }

      if (sourceChanged) {
        bindSource(desiredState.url);
      }

      void attemptPlayback();
    },
    destroy() {
      if (destroyed) {
        return;
      }

      destroyed = true;
      clearRetry();
      unbindInteractionFallback();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleWindowFocus);
      stopPlayback();
    },
  };
}