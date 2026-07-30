# Old Stables browser playtest

This OpenAI Sites app hosts the primary Old Stables playtest. The responsive
launcher embeds a single-threaded Godot 4.7.1 web export from `public/game/`.

## Build

From the repository root:

```powershell
scripts\build-web-playtest.cmd
cd web-playtest
npm.cmd test
```

`npm.cmd run dev` starts the local launcher. The generated site is deployed
through OpenAI Sites using the project recorded in `.openai/hosting.json`.

The Godot export deliberately disables thread support. That keeps browser
hosting compatible with ordinary HTTPS and avoids requiring cross-origin
isolation headers. The Windows ZIP under `build/playtest/` remains the fallback.
