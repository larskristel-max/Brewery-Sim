# Old Stables — implementation brief

## Product promise

A PC-first 2.5D management drama about earning the right to steward a failing noble estate. The player begins as a customizable Castle Brewmaster under Count Armand de Valenne, revives the Old Stables brewery through observable craft decisions, and competes for the stewardship against Apolline de Valenne, the estate's capable acting administrator.

## First playable slice

“Night of First Lights” is a complete station-driven brew: appointment, brewhouse recommissioning, mash, temperature intervention, ingredient substitution, boil, fermenter cleaning and transfer, seven-day fermentation, packaging, community preparation, courtyard service and council review. Each job occupies equipment, consumes game minutes and requires an available staff member with the relevant skill.

The two brewing problems each support three valid responses. Their consequences propagate into schedule, cash, volume, sensory tags, beer quality, customer response and political trust. A strong route can earn promotion to Keeper of the Old Stables; a compromised but safe route still reaches service but leaves the player as Castle Brewmaster.

The four long-term tracks are estate cash, Count confidence, community trust, and restoration state. The Count is proud but fair. Apolline is a legitimate alternative rather than an antagonist; she favors discipline, selective hospitality, and asset preservation.

Staff have shifts, skills, energy, rapport and visible assignments. The campaign save contains the full batch, lots, jobs, promise, staff, stations, decisions, restoration projects, council history and authority state. First insolvency fails forward through emergency credit and probation; a third failed council review can cost the player the estate.

## Visual territory

“Nocturne in the Old Stables” combines blue-hour exteriors with tungsten work light, damp limestone, burnished copper, cream paper, oxblood seals, and ink-black UI. Every key scene should show named people doing visible work with their hands. The courtyard becomes warmer and more populated as community trust rises.

The vertical slice uses six staged 2.5D environments rather than one static background: Count Armand’s appointment, the working brewery floor, a hands-on mash intervention, tactile cask packaging, Night of First Lights in the courtyard, and the weekly council. Dynamic station hotspots, truthful named-worker assignment cards, camera focus and parallax, job progress, steam, liquid, transfer flow, condensation, lantern flicker, and trust-responsive courtyard warmth reveal the live simulation state while painted people remain atmospheric.

The ink-and-cream management interface stays in compact edge docks during normal work. The brewery floor is the primary interaction surface: selecting equipment focuses the camera and reveals only that station’s valid commands. A right-side judgment panel appears for brewing problems and council choices. The canvas scales at 1280×720 and 1600×900 and expands instead of distorting on 21:9 displays.

The repository also contains a modular 3D blockout for later environment and character production, but that blockout is not final visual content.

## Real-data boundary

The game never reads the raw Brasserie folder. `tools/sanitize_brewery_export.py` is the only intended bridge. It reads three allowlisted operational sheets, converts beers to fictional aliases, hashes identifiers, shifts dates, bands quantities, and converts customers to gameplay archetypes. It intentionally excludes personal data, exact financials, supplier prices, bank/payroll material, raw invoice IDs, and exact recipes.

Imported packs are calibration/reference material. Game balance and authored fiction remain under source control. Every generated record carries a provenance class and transform description.

## Art production plates

1. **The Count's Last Brewer** — Count Armand passes the stable key to the new Brewmaster; Apolline stands beside the estate ledger.
2. **Old Stables in Motion** — fixed 2.5D gameplay view with four readable work zones and named staff.
3. **Lantern Blonde Decision** — close hands-on brewing intervention: valve, thermometer, gravity sample, steam, copper.
4. **Night of First Lights** — blue-hour courtyard service with Noor, Inez, Maëlle, Jules, the Count, and Apolline.
5. **First Cask** — Maëlle, Inez, and the Brewmaster package the first 20 L returnable cask by hand.
6. **Weekly Council** — Apolline opens the ledger while the Count weighs the Brewmaster’s first promotion.

Generated plates must use fictional heraldry and contain no readable generated labels, real logo, collage, grid, or watermark.
