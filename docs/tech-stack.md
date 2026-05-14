# Tech Stack

## Recommended Default Engine

The recommended default engine for Brewery-Sim is **Unity**.

Unity is the best starting point for this project because it balances simulation systems, production tooling, ecosystem support, and practical indie development needs. It is especially well suited for an isometric 3D brewery management game where players will interact with production chains, staff, UI-heavy management screens, and readable 3D environments.

### Why Unity

1. **Simulation-friendly**
   - Unity is a strong fit for gameplay built around interconnected systems such as brewing recipes, resource flows, production timers, staffing, equipment upgrades, inventory, sales, and customer demand.
   - Its component-based architecture supports building modular simulation entities that can evolve over time.
2. **Strong UI tooling**
   - Management games need clear, responsive, and information-dense interfaces.
   - Unity provides mature UI options for menus, dashboards, tooltips, overlays, build panels, inventory views, and other management-game screens.
3. **Large ecosystem**
   - Unity has a broad ecosystem of assets, tools, plugins, tutorials, sample projects, and community support.
   - This reduces risk when implementing common systems such as pathfinding, save games, localization, input, camera controls, analytics, and editor tooling.
4. **Practical for indie development**
   - Unity is widely used by small teams and solo developers.
   - It offers a practical workflow for prototyping quickly, iterating on gameplay, and shipping across multiple platforms without requiring a large engineering team.
5. **Good fit for isometric 3D management gameplay**
   - Unity works well for stylized or readable 3D scenes viewed from an isometric camera.
   - It can support interactable buildings, production equipment, character movement, placement tools, visual upgrades, and layered management UI without requiring the rendering complexity of a high-end engine.

## Alternatives

### Godot

**Godot** is a reasonable lighter alternative. It may be attractive if the project prioritizes a smaller engine footprint, open-source tooling, fast iteration, and simpler deployment. However, Unity currently remains the safer default for this project because of its larger ecosystem, more mature 3D production pipeline, and stronger availability of third-party tooling for management and simulation games.

### Unreal Engine

**Unreal Engine** is likely overkill for Brewery-Sim. It is powerful, especially for high-fidelity 3D visuals, but the project does not currently require that level of rendering complexity. Unreal may add unnecessary production overhead for a small or indie-focused isometric management game where simulation design, UI clarity, and iteration speed are more important than photorealistic presentation.

## Future Implementation Task

Once the engine choice is confirmed, add the corresponding project scaffold in a future implementation task. For the recommended Unity path, that would mean creating the initial Unity project structure, core folders, configuration files, and placeholder scenes needed to begin development.
