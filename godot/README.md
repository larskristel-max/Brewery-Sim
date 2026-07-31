# Old Stables reboot

This folder is the clean Godot reboot of Brewery-Sim. The original TypeScript prototype remains intact as a legacy design and simulation reference.

## Play

Open `project.godot` in Godot 4.7.1 and run the project. “Night of First Lights” is a complete station-driven management slice presented through staged, animated 2.5D scenes.

1. Enter the skippable in-engine prologue, then customize the Castle Brewmaster. Cinematic beats wait indefinitely; Space or a tap advances and Escape skips.
2. Accept the Count's mandate and move directly into the Old Stables awakening cinematic before play begins.
3. Select equipment in the brewery, choose a named worker, and issue the contextual work order from the command dock.
4. Recommission the copper brewhouse, mash, solve the temperature drift, choose a response to the missing hop delivery, boil, clean and purge the fermenter, transfer, ferment and package.
5. Prepare the courtyard during fermentation, serve the 20 L keg, and choose how to answer Apolline at the weekly council.
6. Begin Week 2 and choose between the Saint Brigid Festival and the Count's Cellar Reserve. The reserve introduces Stable Amber, a higher quality target, and a recipe-specific stalled-runoff decision.
7. After the second council, negotiate two simultaneous opportunities. The live production board lets one batch ferment while another is prepared, while workers, stations, stock, fatigue, equipment wear, and deadlines compete.

Space pauses; 1, 2, and 4 set time speed. The on-screen 12× control accelerates long work, and “Advance to next milestone” jumps directly to the next scheduled job completion. Save and Load persist the entire campaign state.

## Direction

- Player begins as the customizable Castle Brewmaster.
- The proud but fair Count Armand de Valenne grants authority gradually.
- Apolline de Valenne is a credible rival for the contested stewardship, not a villain.
- The fiction is informed by sanitized brewery process patterns. Raw brewery files are never loaded by the game.
- The visual language is “Nocturne in the Old Stables”: blue hour, warm work lights, stone, ink, cream, and copper.
- The opening uses cinematic crops, slow camera moves, rain, letterboxing, player-paced dialogue, and restrained sound cues. Gameplay chrome remains hidden until the awakening cinematic hands control to the player.
- The playable presentation uses six stage-specific 2.5D scenes: appointment, brewery floor, mash intervention, packaging, courtyard service, and weekly council.
- Equipment hotspots drive contextual commands. Camera focus, parallax, live assignment cards, progress rings, steam, liquid, condensation, transfer flow, firelight, and trust-responsive courtyard warmth make the simulation state visible without treating painted background figures as simulated staff.
- The interface is environment-first and resolution-aware. Phone play currently targets landscape: portrait displays a rotation gate, the resting HUD collapses to a narrow status strip, and equipment taps open a temporary worker/action context. Desktop management retains the full top and bottom docks. Decision panels appear only when judgment is required, and the canvas expands cleanly for ultrawide displays.
- A modular 3D blockout remains in the project as a future asset-production base; it is not presented as final art.
- Inventory is lot-based. The promise, brewing choices, deadline, sensory tags and final service result feed cash, community trust and the Count's confidence.
- Four authority ranks are implemented: Castle Brewmaster, Keeper of the Old Stables, Deputy Steward, and Estate Steward.

## Validate

On Windows, the repository runner discovers Godot 4.7.1, performs the required clean import, and runs every Godot suite:

```powershell
scripts\run-godot-validation.cmd
```

The equivalent individual commands are:

```powershell
godot --headless --editor --path godot --quit
godot --headless --path godot --script res://tests/run.gd
godot --headless --path godot --script res://tests/ui_interaction_test.gd
godot --headless --path godot --script res://tests/world_layout_test.gd
godot --headless --path godot --script res://tests/worker_presentation_test.gd
```

The model suite runs complete brew routes with different decisions and outcomes, validates Week 2 commitments, three viable Week 3 schedules, overcommitment, multi-batch resource and station conflicts, authority gates, restoration, serious business risk, and versioned saves. The UI suite presses the real controls through promotion, Week 2 planning, the Stable Amber lauter decision, capacity negotiation, and live batch switching. The visual suites verify camera-correct world hotspots and truthful live assignment chips at 720p, 900p, and ultrawide resolutions.

The active milestone and its exit criteria are maintained in [`../TODO.md`](../TODO.md).
The management-game and accessibility benchmark audit is in [`../docs/ui-ux-benchmark-review.md`](../docs/ui-ux-benchmark-review.md).

To regenerate the visual-review gallery, run the capture script without `--headless`:

```powershell
godot --path godot --resolution 1600x900 --script res://tests/capture_vertical_slice.gd
```

## Windows playtest build

The first local export installs Godot's official 4.7.1 export templates:

```powershell
scripts\build-windows-playtest.cmd -InstallTemplates
```

Later exports use the cached templates:

```powershell
scripts\build-windows-playtest.cmd
```

The script exports and launch-checks the game, includes the tester guide and
source-commit information, and writes a ZIP plus SHA-256 file under
`build/playtest/`. Generated packages are intentionally excluded from Git.
Tester instructions are maintained in
[`../docs/windows-playtest-guide.md`](../docs/windows-playtest-guide.md).

## Browser playtest build

The browser build is the primary playtest format. It uses Godot's
single-threaded web runtime so it works over ordinary HTTPS without
cross-origin isolation headers:

```powershell
scripts\build-web-playtest.cmd
cd web-playtest
npm.cmd test
```

The generated game files are embedded in the OpenAI Sites launcher under
`web-playtest/public/game/`. The Windows ZIP remains available as a fallback
for testers whose browser or GPU cannot start WebGL 2.

To rebuild the sanitized calibration pack from an authorized workbook snapshot:

```powershell
python tools/sanitize_brewery_export.py "C:\path\to\Master_Inventory.xlsx" --output godot/data/imported_scenario
python tools/validate_scenario.py godot/data/imported_scenario
```
