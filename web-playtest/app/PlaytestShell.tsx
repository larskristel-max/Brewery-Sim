"use client";

import { useEffect, useState } from "react";

export function PlaytestShell() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
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
            target="_blank"
            rel="noreferrer"
          >
            Open game only
          </a>
        </div>
      </header>

      <section className="game-frame-wrap" aria-label="Old Stables game">
        <div className="orientation-gate" role="status" aria-live="polite">
          <div className="orientation-card">
            <span className="orientation-mark" aria-hidden="true">
              OS
            </span>
            <strong>Turn your phone sideways</strong>
            <p>
              The brewery is designed for landscape play. Your place will be
              kept while you rotate.
            </p>
          </div>
        </div>
        <div className="load-note" aria-hidden={ready}>
          <strong>Preparing the Old Stables</strong>
          The first load can take a moment while the brewery arrives.
        </div>
        <iframe
          className="game-frame"
          src="/game/index.html"
          title="Old Stables browser game"
          allow="autoplay; fullscreen; gamepad"
          onLoad={() => setReady(false)}
        />
      </section>
    </main>
  );
}
