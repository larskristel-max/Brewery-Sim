# Old Stables audio implementation report

Status as of 2026-08-01: technical implementation complete; human listening and hosted-device release gates pending.

## Implemented

- Central `AudioDirector` autoload with era-addressable JSON definitions.
- Master, Music, Ambience, SFX and UI buses.
- Two-player ambience and music crossfades, randomized environmental one-shots, immediate-repeat prevention, conservative ±2.5% pitch variation, per-cue cooldowns and a ten-voice limit.
- Browser unlock on the first deliberate BEGIN gesture, focus suspension/resumption and duplicate-loop protection.
- Scene mappings for title, appointment, dormant/inhabited awakening, brewhouse, mash/boil, fermentation, packaging, courtyard and council.
- Physical mappings for commissioning, cleaning, malt, stirring, heat, transfer/pitching, packaging, cask handling, delivery, repair and ingredients.
- Wood/paper/metal/coin interface language, contract results and three council-result variants.
- Persistent Master, Music, Ambience and Effects sliders plus an independent Interface Sounds toggle. The Effects bus controls physical actions; disabling Interface Sounds does not mute brewery work.
- Silent, explicitly labelled music placeholders. No recording is treated as public domain merely because its composition is old.
- Automated audio coverage added to the standard validation script.

## Files and assets

Implementation files are `godot/scripts/audio_director.gd`, `godot/assets/audio/audio_manifest.json`, `godot/default_bus_layout.tres` and integrations in `main.gd` plus both opening cinematic controllers. Asset and rejection details, exact source URLs, original/runtime names, treatments and checksums are in `godot/assets/audio/AUDIO_LICENSES.md`.

Nineteen CC0 high-quality Freesound preview derivatives total 9,207,338 bytes (8.78 MiB) and remain untouched under `source-masters`. Reproducible, lossless Ogg-page runtime cuts total 7,224,578 bytes (6.89 MiB); unused master tails are excluded from game exports. Cue offsets, duration limits, level and pitch treatment remain nondestructive runtime definitions.

## Automated verification

`audio_director_test.gd` covers:

- required buses and cue streams;
- locked-before-gesture and unlocked behavior;
- ambience transitions and duplicate prevention;
- focus suspend/resume without duplicate loops;
- settings, mute and interface-preference persistence;
- missing-cue safe failure;
- disabled-control silence;
- invalid-action mapping;
- rapid-click cooldowns;
- mobile hover suppression;
- physical action one-shot mapping.

The complete Godot validation suite passes on Godot 4.7.1, including simulation/persistence, the complete UI route, audio behavior, phone rotation/landscape layout, cinematic framing, world hotspot layout and worker presentation. The browser launcher build and rendered-HTML test also pass. A fresh Windows release export was produced successfully at `build/playtest/Old-Stables-Windows/Old-Stables-Playtest.exe` for the human listening pass. Both automated suites must be rerun after any listening-driven mix or asset adjustment.

## Manual listening checklist — not yet signed off

- [ ] Desktop speakers
- [ ] Headphones
- [ ] Phone speakers
- [ ] Chrome desktop
- [ ] Hosted browser build
- [ ] Landscape mobile
- [ ] Low overall volume
- [ ] Music, ambience and effects muted separately
- [ ] Interface sounds disabled while physical SFX remain audible
- [ ] Rapid mobile tapping
- [ ] Tab switching and return
- [ ] Browser reload
- [ ] Phone lock/unlock
- [ ] Save/load in planning, brewing, fermentation, packaging and council states
- [ ] Full-length contamination audit of every integrated recording

Because this model cannot hear local audio output, it cannot honestly sign off these listening gates. A focused candidate commit exists solely to enable the private hosted listening audit; it must remain unmerged until a human completes the checks and any rejected cue is removed or adjusted.

## Remaining gaps

- Commission or license exact recordings for the three music identities; silence is intentional until then.
- Human-audition all 19 recordings and validate the chosen offsets, especially the long rice/stirring, bells, carriage and multi-cask sources.
- Replace any provisional Ogg one-shot with an edited WAV master if the human-approved mastering workflow requires it. The current high-quality Ogg derivatives are browser-efficient but do not yet meet the preferred WAV-for-short-SFX preparation guideline.
- Complete the private hosted desktop/mobile mix pass, then make any required adjustments, rerun all validations and merge only after approval.
