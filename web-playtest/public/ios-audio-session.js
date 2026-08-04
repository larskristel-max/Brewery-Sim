(() => {
  const status = {
    session: "not-requested",
    primer: "not-needed",
    context: "missing",
    nativeFallback: "inactive",
    lastError: "",
  };
  const isIOS =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const primerUrl = "/ios-audio-session-primer.mp3";
  const voiceCount = 8;
  const voices = Array.from({ length: voiceCount }, () => createPlayer(false));
  const ambience = [createPlayer(true), createPlayer(true)];
  const music = [createPlayer(true), createPlayer(true)];
  const allPlayers = [...voices, ...ambience, ...music];
  const timers = new WeakMap();
  const fades = new WeakMap();
  let activeAmbience = 0;
  let activeMusic = 0;
  let primer = null;
  let unlocked = false;
  let suspended = false;
  let voiceCursor = 0;
  let resumeLoops = [];
  let settings = {
    Master: 0.8,
    Music: 0.62,
    Ambience: 0.72,
    SFX: 0.82,
    UI: 0.72,
    interfaceSounds: true,
  };

  function createPlayer(loop) {
    const player = new Audio();
    player.preload = "auto";
    player.loop = loop;
    player.setAttribute("playsinline", "");
    player.setAttribute("webkit-playsinline", "");
    return player;
  }

  function recordError(error) {
    status.lastError = error instanceof Error ? error.message : String(error);
  }

  function sourceUrl(resourcePath) {
    const filename = String(resourcePath || "").split("/").pop();
    return filename ? `/browser-audio/${encodeURIComponent(filename)}` : "";
  }

  function linearFromDb(db) {
    return Math.pow(10, Number(db || 0) / 20);
  }

  function effectiveVolume(bus, db) {
    if (bus === "UI" && !settings.interfaceSounds) return 0;
    const busVolume = Number(settings[bus] ?? 1);
    return Math.max(
      0,
      Math.min(1, settings.Master * busVolume * linearFromDb(db)),
    );
  }

  function clearPlayerTimer(player) {
    const timer = timers.get(player);
    if (timer) clearTimeout(timer);
    timers.delete(player);
  }

  function stopFade(player) {
    const fade = fades.get(player);
    if (fade) clearInterval(fade);
    fades.delete(player);
  }

  function stopPlayer(player) {
    clearPlayerTimer(player);
    stopFade(player);
    player.pause();
    try {
      player.currentTime = 0;
    } catch {
      // Safari can reject seeking before metadata exists; pausing is enough.
    }
  }

  function safePlay(player) {
    if (suspended) return;
    const promise = player.play();
    if (promise) promise.catch(recordError);
  }

  function fadeTo(player, target, seconds, stopWhenSilent = false) {
    stopFade(player);
    const start = player.volume;
    const duration = Math.max(50, Number(seconds || 0) * 1000);
    const started = performance.now();
    const fade = setInterval(() => {
      const progress = Math.min(1, (performance.now() - started) / duration);
      player.volume = start + (target - start) * progress;
      if (progress >= 1) {
        stopFade(player);
        if (stopWhenSilent && target <= 0.001) stopPlayer(player);
      }
    }, 50);
    fades.set(player, fade);
  }

  function requestPlaybackSession() {
    if (!isIOS) {
      status.session = "not-ios";
      return;
    }
    if (navigator.audioSession && "type" in navigator.audioSession) {
      try {
        navigator.audioSession.type = "playback";
        status.session = navigator.audioSession.type || "playback";
      } catch (error) {
        status.session = "request-failed";
        recordError(error);
      }
    } else {
      status.session = "legacy-media-primer";
    }

    if (!primer) {
      primer = createPlayer(true);
      primer.src = primerUrl;
      primer.volume = 0.001;
    }
    status.primer = "requested";
    const primerPromise = primer.play();
    if (primerPromise) {
      primerPromise
        .then(() => {
          status.primer = "playing";
        })
        .catch((error) => {
          status.primer = "blocked";
          recordError(error);
        });
    }
  }

  function primeNativePlayers() {
    if (!isIOS || unlocked) return;
    unlocked = true;
    status.nativeFallback = "priming";
    for (const player of allPlayers) {
      player.src = primerUrl;
      player.volume = 0.001;
      const promise = player.play();
      if (promise) {
        promise
          .then(() => {
            if (!player.currentSrc.endsWith("/ios-audio-session-primer.mp3")) return;
            player.pause();
            player.removeAttribute("src");
            player.load();
            status.nativeFallback = "ready";
          })
          .catch(recordError);
      }
    }
  }

  function unlockAudio() {
    requestPlaybackSession();
    primeNativePlayers();
    const context = window.__oldStablesGodotAudioContext;
    if (!context) {
      status.context = "missing";
      return JSON.stringify(status);
    }
    status.context = context.state;
    const resume = () => {
      const promise = context.resume();
      if (promise) {
        promise
          .then(() => {
            status.context = context.state;
          })
          .catch((error) => {
            status.context = "resume-failed";
            recordError(error);
          });
      }
    };
    // A running Web Audio context can remain attached to iOS's muted ambient
    // route. Cycling it after selecting playback repairs that stale route.
    if (isIOS && context.state === "running") {
      const suspendedPromise = context.suspend();
      if (suspendedPromise) suspendedPromise.then(resume).catch(recordError);
    } else if (context.state !== "running") {
      resume();
    }
    return JSON.stringify(status);
  }

  function playCue(payload) {
    if (!isIOS || !unlocked || suspended) return false;
    const bus = payload.bus || "SFX";
    const volume = effectiveVolume(bus, payload.volume_db);
    if (volume <= 0) return false;
    const player = voices[voiceCursor++ % voices.length];
    stopPlayer(player);
    player.loop = false;
    player.src = sourceUrl(payload.stream);
    player.volume = volume;
    player.playbackRate = Number(payload.pitch || 1);
    player.load();
    const offset = Math.max(0, Number(payload.offset || 0));
    if (offset > 0) {
      player.addEventListener("loadedmetadata", () => {
        try {
          player.currentTime = offset;
        } catch {
          // The clip can still start from its beginning if Safari refuses a seek.
        }
      }, { once: true });
    }
    try {
      player.currentTime = offset;
    } catch {
      // loadedmetadata retries the seek above.
    }
    safePlay(player);
    const duration = Number(payload.duration || 0);
    if (duration > 0) {
      timers.set(player, setTimeout(() => stopPlayer(player), duration * 1000));
    }
    if (payload.double) {
      setTimeout(() => playCue({
        ...payload,
        double: false,
        volume_db: Number(payload.volume_db || 0) - 2,
      }), 100);
    }
    return true;
  }

  function setLoop(deck, activeIndex, payload) {
    if (!isIOS || !unlocked) return activeIndex;
    const oldPlayer = deck[activeIndex];
    const nextIndex = 1 - activeIndex;
    const newPlayer = deck[nextIndex];
    stopPlayer(newPlayer);
    newPlayer.loop = true;
    newPlayer.src = sourceUrl(payload.stream);
    newPlayer.volume = 0;
    newPlayer.dataset.volumeDb = String(Number(payload.volume_db || 0));
    newPlayer.dataset.targetVolume = String(
      effectiveVolume(payload.bus, payload.volume_db),
    );
    newPlayer.load();
    safePlay(newPlayer);
    const fade = Number(payload.fade_seconds || 0.2);
    fadeTo(newPlayer, Number(newPlayer.dataset.targetVolume), fade);
    if (!oldPlayer.paused) fadeTo(oldPlayer, 0, fade, true);
    return nextIndex;
  }

  function setAmbience(payload) {
    activeAmbience = setLoop(ambience, activeAmbience, {
      ...payload,
      bus: "Ambience",
    });
    return isIOS;
  }

  function stopAmbience(payload = {}) {
    for (const player of ambience) {
      if (!player.paused) fadeTo(player, 0, Number(payload.fade_seconds || 0.2), true);
    }
  }

  function setMusic(payload) {
    activeMusic = setLoop(music, activeMusic, { ...payload, bus: "Music" });
    return isIOS;
  }

  function stopMusic(payload = {}) {
    for (const player of music) {
      if (!player.paused) fadeTo(player, 0, Number(payload.fade_seconds || 0.2), true);
    }
  }

  function syncSettings(next) {
    settings = { ...settings, ...next };
    for (const player of [...ambience, ...music]) {
      if (!player.paused && player.dataset.targetVolume) {
        const bus = ambience.includes(player) ? "Ambience" : "Music";
        const baseDb = Number(player.dataset.volumeDb || 0);
        const target = effectiveVolume(bus, baseDb);
        player.dataset.targetVolume = String(target);
        player.volume = target;
      }
    }
  }

  function suspend() {
    if (!isIOS || suspended) return;
    suspended = true;
    resumeLoops = [...ambience, ...music].filter((player) => !player.paused);
    for (const player of allPlayers) player.pause();
  }

  function resume() {
    if (!isIOS) return;
    suspended = false;
    requestPlaybackSession();
    for (const player of resumeLoops) safePlay(player);
    resumeLoops = [];
  }

  function stopAll() {
    for (const player of allPlayers) stopPlayer(player);
  }

  window.__oldStablesAudioUnlockStatus = status;
  window.__oldStablesUnlockAudio = unlockAudio;
  window.__oldStablesBrowserAudio = {
    isIOS,
    playCue,
    resume,
    setAmbience,
    setMusic,
    stopAll,
    stopAmbience,
    stopMusic,
    suspend,
    syncSettings,
    unlock: unlockAudio,
  };
  for (const eventName of ["touchstart", "pointerdown", "click", "keydown"]) {
    window.addEventListener(eventName, unlockAudio, {
      capture: true,
      passive: true,
    });
  }
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") suspend();
    else resume();
  });
})();
