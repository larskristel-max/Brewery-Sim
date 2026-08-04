(() => {
  const status = {
    session: "not-requested",
    primer: "not-needed",
    context: "missing",
    lastError: "",
  };
  const isIOS =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  let primer = null;

  function recordError(error) {
    status.lastError = error instanceof Error ? error.message : String(error);
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
        return;
      } catch (error) {
        status.session = "request-failed";
        recordError(error);
      }
    }

    // Older iOS releases put Web Audio on the ringer/ambient channel. A
    // silent HTML media element, started by the same gesture, opens the media
    // channel so the Godot AudioContext is audible even in silent mode.
    if (!primer) {
      primer = new Audio("/ios-audio-session-primer.mp3");
      primer.loop = true;
      primer.preload = "auto";
      primer.playsInline = true;
      primer.volume = 0.01;
    }
    status.session = "legacy-media-primer";
    status.primer = "requested";
    const playPromise = primer.play();
    if (playPromise) {
      playPromise.then(() => {
        status.primer = "playing";
      }).catch((error) => {
        status.primer = "blocked";
        recordError(error);
      });
    }
  }

  function unlockAudio() {
    requestPlaybackSession();
    const context = window.__oldStablesGodotAudioContext;
    if (!context) {
      status.context = "missing";
      return JSON.stringify(status);
    }
    status.context = context.state;
    if (context.state !== "running") {
      const resumePromise = context.resume();
      if (resumePromise) {
        resumePromise.then(() => {
          status.context = context.state;
        }).catch((error) => {
          status.context = "resume-failed";
          recordError(error);
        });
      }
    }
    return JSON.stringify(status);
  }

  window.__oldStablesAudioUnlockStatus = status;
  window.__oldStablesUnlockAudio = unlockAudio;
  for (const eventName of ["touchstart", "pointerdown", "click", "keydown"]) {
    window.addEventListener(eventName, unlockAudio, {
      capture: true,
      passive: true,
    });
  }
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      unlockAudio();
    }
  });
})();
