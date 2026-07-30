# Brewery-Sim / Old Stables

The active reboot is **Old Stables**, a PC-first 2.5D brewery management drama built in Godot. The player begins as a customizable Castle Brewmaster under a proud but fair Count, revives a failing noble estate, and earns authority toward a contested stewardship.

Open [`godot/project.godot`](godot/project.godot) in Godot 4.7.1 to play the first vertical slice, “Night of First Lights.” Six staged 2.5D scenes carry the player from appointment through brewing, packaging, courtyard service, and weekly council, with clickable equipment, truthful named-worker assignment cards, animated process feedback, contextual decisions, and responsive management UI. Week 2 adds competing festival and reserve commitments plus a second recipe. See [`docs/old-stables-reboot.md`](docs/old-stables-reboot.md) for the implemented direction and safe real-data boundary.

The original TypeScript Brewery-Sim remains intact as a legacy design and simulation reference. Its batch-driven craft-drama notes remain in [docs/project-dev-direction.md](docs/project-dev-direction.md).

The active delivery plan and milestone acceptance criteria are in [TODO.md](TODO.md).

Previous design and implementation notes have been archived under [docs/archive/2026-05-29-pre-batch-driven-direction](docs/archive/2026-05-29-pre-batch-driven-direction).

## Development

```bash
npm install
npm run build
npm run test
```

The Godot reboot and legacy TypeScript prototype are intentionally isolated from each other.
