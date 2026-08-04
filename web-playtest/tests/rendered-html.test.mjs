import assert from "node:assert/strict";
import { access, readFile, stat } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the Old Stables browser launcher", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Old Stables — Browser Playtest<\/title>/i);
  assert.match(html, /Browser playtest/);
  assert.match(html, /Open full-screen game/);
  assert.match(html, /\/game\/index\.html/);
});

test("packages WebAssembly in sub-25 MB parts for Sites", async () => {
  await access(new URL("../dist/client/game/index.wasm.0", import.meta.url));
  await access(new URL("../dist/client/game/index.wasm.1", import.meta.url));
  await assert.rejects(
    access(new URL("../dist/client/game/index.wasm", import.meta.url)),
  );
  await assert.rejects(
    access(new URL("../dist/client/game/index.wasm.gz", import.meta.url)),
  );
  const gamePack = await stat(
    new URL("../dist/client/game/index.pck", import.meta.url),
  );
  assert.ok(gamePack.size < 25 * 1024 * 1024);
});

test("exposes the Godot Web Audio context for phone diagnostics", async () => {
  const engine = await readFile(
    new URL("../dist/client/game/index.js", import.meta.url),
    "utf8",
  );
  assert.match(engine, /window\.__oldStablesGodotAudioContext=ctx/);
});

test("installs the iOS playback-session unlock bridge", async () => {
  const gameHtml = await readFile(
    new URL("../dist/client/game/index.html", import.meta.url),
    "utf8",
  );
  const bridge = await readFile(
    new URL("../dist/client/ios-audio-session.js", import.meta.url),
    "utf8",
  );
  await access(
    new URL("../dist/client/ios-audio-session-primer.mp3", import.meta.url),
  );
  assert.match(
    gameHtml,
    /<script src="\/ios-audio-session\.js\?v=[a-f0-9]{12}"><\/script>/,
  );
  assert.match(bridge, /navigator\.audioSession\.type = "playback"/);
  assert.match(bridge, /__oldStablesUnlockAudio/);
  assert.match(bridge, /ios-audio-session-primer\.mp3/);
  assert.match(bridge, /__oldStablesBrowserAudio/);
  assert.match(bridge, /playCue/);
  assert.match(bridge, /setAmbience/);
  await access(
    new URL("../dist/client/browser-audio/517610-hq-preview.mp3", import.meta.url),
  );
});

test("routes an iPhone cue through a native HTML media player", async () => {
  const bridge = await readFile(
    new URL("../dist/client/ios-audio-session.js", import.meta.url),
    "utf8",
  );
  const players = [];
  class MockAudio {
    constructor() {
      this.dataset = {};
      this.loop = false;
      this.paused = true;
      this.playCount = 0;
      this.readyState = 1;
      this.src = "";
      this.volume = 1;
      players.push(this);
    }
    get currentSrc() {
      return this.src;
    }
    addEventListener() {}
    load() {}
    pause() {
      this.paused = true;
    }
    play() {
      this.paused = false;
      this.playCount += 1;
      return Promise.resolve();
    }
    removeAttribute(name) {
      if (name === "src") this.src = "";
    }
    setAttribute() {}
  }
  const window = { addEventListener() {} };
  const navigator = {
    audioSession: { type: "ambient" },
    maxTouchPoints: 5,
    platform: "iPhone",
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)",
  };
  vm.runInNewContext(bridge, {
    Audio: MockAudio,
    Error,
    JSON,
    Math,
    Number,
    String,
    clearInterval,
    clearTimeout,
    document: { addEventListener() {}, visibilityState: "visible" },
    navigator,
    performance,
    setInterval,
    setTimeout,
    window,
  });
  window.__oldStablesBrowserAudio.unlock();
  const played = window.__oldStablesBrowserAudio.playCue({
    bus: "SFX",
    duration: 0,
    offset: 0,
    stream: "res://assets/audio/runtime/517610-hq-preview.mp3",
    volume_db: -8,
  });
  assert.equal(played, true);
  assert.equal(navigator.audioSession.type, "playback");
  assert.ok(
    players.some(
      (player) =>
        player.src === "/browser-audio/517610-hq-preview.mp3" &&
        player.playCount > 0,
    ),
  );
});
