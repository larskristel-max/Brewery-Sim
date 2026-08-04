"use client";

import { useEffect, useState } from "react";

export function PlaytestShell() {
  const [ready, setReady] = useState(false);
  const [embedReady, setEmbedReady] = useState(false);

  useEffect(() => {
    const touchDevice =
      navigator.maxTouchPoints > 0 || window.matchMedia("(pointer: coarse)").matches;
    const compactScreen = Math.min(window.screen.width, window.screen.height) <= 820;

    // Run phones and small tablets directly in the game document. This avoids
    // an iframe consuming scarce screen space and lets the Begin tap request
    // fullscreen and unlock Web Audio in the same browsing context.
    if (touchDevice && compactScreen) {
      window.location.replace("/game/index.html");
      return;
    }

    setEmbedReady(true);

    const handleMessage = (event: MessageEvent) => {
      if (
        event.origin === window.location.origin &&
        event.data?.type === "old-stables-game-ready"
      ) {
        setReady(true);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return (
    <main className="playtest-shell">
      <header className="playtest-bar">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            OS
          </div>
          <div className="brand-copy">
            <p className="eyebrow">Browser playtest</p>
            <h1>Old Stables</h1>
          </div>
        </div>

        <div className="playtest-actions">
          <span className={`status${ready ? " ready" : ""}`}>
            <span className="status-dot" aria-hidden="true" />
            {ready ? "Game loaded" : "Loading game"}
          </span>
          <a
            className="full-screen-link"
            href="/game/index.html"
          >
            Open full-screen game
          </a>
        </div>
      </header>

      <section className="game-frame-wrap" aria-label="Old Stables game">
        <div className="load-note" aria-hidden={ready}>
          <strong>Preparing the Old Stables</strong>
          The first load can take a moment while the brewery arrives.
        </div>
        {embedReady ? (
          <iframe
            className="game-frame"
            src="/game/index.html"
            title="Old Stables browser game"
            allow="autoplay; fullscreen; gamepad"
            allowFullScreen
            onLoad={() => setReady(false)}
          />
        ) : null}
      </section>
    </main>
  );
}
