import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

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
  assert.match(gameHtml, /<script src="\/ios-audio-session\.js"><\/script>/);
  assert.match(bridge, /navigator\.audioSession\.type = "playback"/);
  assert.match(bridge, /__oldStablesUnlockAudio/);
  assert.match(bridge, /ios-audio-session-primer\.mp3/);
});
