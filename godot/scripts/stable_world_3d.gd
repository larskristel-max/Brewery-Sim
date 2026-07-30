extends SubViewportContainer

var world_root: Node3D
var environment: Environment
var station_lights := {}
var station_nodes := {}
var character_nodes := {}
var player_name := "ELISE"
var player_coat := Color("#b8683b")

const STATION_POSITIONS := {
	"brewhouse": Vector3(-4.7, 0.0, -0.5),
	"fermenter": Vector3(-1.2, 0.0, -1.2),
	"packaging": Vector3(3.0, 0.0, -0.3),
	"courtyard": Vector3(5.7, 0.0, 2.7),
	"estate": Vector3(-5.8, 0.0, 2.7)
}

func _ready() -> void:
	stretch = true
	_build_world()

func _build_world() -> void:
	world_root = Node3D.new()
	world_root.name = "ModularOldStables"
	$Viewport.add_child(world_root)
	_build_environment()
	_build_shell()
	_build_brewhouse()
	_build_fermentation_bay()
	_build_packaging_bay()
	_build_courtyard()
	_build_characters()
	_build_camera()

func _build_environment() -> void:
	environment = Environment.new()
	environment.background_mode = Environment.BG_COLOR
	environment.background_color = Color("#101722")
	environment.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	environment.ambient_light_color = Color("#526276")
	environment.ambient_light_energy = 0.48
	environment.tonemap_mode = Environment.TONE_MAPPER_FILMIC
	var world_environment := WorldEnvironment.new()
	world_environment.environment = environment
	world_root.add_child(world_environment)
	var moon := DirectionalLight3D.new()
	moon.rotation_degrees = Vector3(-52, -32, 0)
	moon.light_color = Color("#8da6c3")
	moon.light_energy = 0.78
	moon.shadow_enabled = true
	world_root.add_child(moon)

func _build_shell() -> void:
	# Cobble floor modules.
	for row in range(7):
		for column in range(10):
			var shade := 0.17 + float((row + column) % 3) * 0.018
			_box("Floor_%02d_%02d" % [row, column], Vector3(-7.2 + column * 1.55, -0.18, -4.4 + row * 1.4), Vector3(1.48, 0.25, 1.33), Color(shade, shade * 0.92, shade * 0.82), world_root)
	# Back wall assembled from reusable limestone bays.
	for bay in range(6):
		var x := -7.0 + bay * 2.8
		_box("BackWall_%02d" % bay, Vector3(x, 2.2, -5.45), Vector3(2.65, 4.7, 0.55), _stone_color(bay), world_root)
		_box("RoofBeam_%02d" % bay, Vector3(x, 4.55, -2.2), Vector3(0.25, 0.28, 6.7), Color("#24170f"), world_root, true)
	# Left return wall and open courtyard threshold.
	for bay in range(3):
		_box("LeftWall_%02d" % bay, Vector3(-8.25, 2.15, -4.0 + bay * 2.7), Vector3(0.55, 4.6, 2.55), _stone_color(bay + 2), world_root)
	# Door arch assembled as modular pillars and lintel.
	_box("DoorPillarL", Vector3(7.0, 1.7, -4.95), Vector3(0.8, 3.5, 0.7), Color("#5b5248"), world_root)
	_box("DoorPillarR", Vector3(7.0, 1.7, 0.2), Vector3(0.8, 3.5, 0.7), Color("#5b5248"), world_root)
	_box("DoorLintel", Vector3(7.0, 3.7, -2.35), Vector3(0.8, 0.65, 5.8), Color("#62584d"), world_root)
	# Heavy timber braces give the stable its silhouette.
	for x in [-7.2, -4.4, -1.6, 1.2, 4.0, 6.8]:
		_box("Post_%s" % str(x), Vector3(x, 2.25, -5.05), Vector3(0.28, 4.7, 0.32), Color("#2b1b12"), world_root, true)

func _build_brewhouse() -> void:
	var group := Node3D.new(); group.name = "BrewhouseModule"; world_root.add_child(group); station_nodes.brewhouse = group
	_cylinder("CopperKettle", Vector3(-5.2, 1.15, -1.25), 1.05, 2.3, Color("#965b31"), group, true)
	_cylinder("CopperDome", Vector3(-5.2, 2.42, -1.25), 0.82, 0.35, Color("#b47643"), group, true)
	_cylinder("Chimney", Vector3(-5.2, 3.35, -1.25), 0.25, 1.6, Color("#7c482b"), group, true)
	_cylinder("MashTun", Vector3(-3.25, 0.85, -1.8), 0.78, 1.7, Color("#8b8c83"), group, true)
	_box("BrewhousePlinth", Vector3(-4.25, 0.15, -1.3), Vector3(3.9, 0.25, 2.4), Color("#22201d"), group)
	_pipe(Vector3(-4.25, 1.0, -1.3), Vector3(1.9, 0.10, 0.10), Color("#b17a4c"), group)
	_station_light("brewhouse", Vector3(-4.6, 4.1, -0.7))
	_station_label("MASH & BOIL", Vector3(-4.4, 0.25, 0.05))

func _build_fermentation_bay() -> void:
	var group := Node3D.new(); group.name = "FermentationModule"; world_root.add_child(group); station_nodes.fermenter = group
	for index in range(3):
		var x := -1.55 + index * 1.3
		_cylinder("Fermenter_%02d" % index, Vector3(x, 1.35, -2.8), 0.52, 2.7, Color("#8d938e"), group, true)
		_cylinder("Cone_%02d" % index, Vector3(x, 0.35, -2.8), 0.35, 0.65, Color("#69706c"), group, true)
		_pipe(Vector3(x, 2.85, -2.8), Vector3(0.08, 0.65, 0.08), Color("#b5b9b0"), group)
	_box("FermenterDrain", Vector3(-0.2, 0.08, -1.9), Vector3(4.2, 0.08, 0.22), Color("#17191a"), group)
	_station_light("fermenter", Vector3(-0.2, 4.15, -2.1))
	_station_label("FERMENT", Vector3(-0.2, 0.25, -1.55))

func _build_packaging_bay() -> void:
	var group := Node3D.new(); group.name = "PackagingModule"; world_root.add_child(group); station_nodes.packaging = group
	_box("FillingTable", Vector3(3.0, 0.85, -1.7), Vector3(3.3, 0.22, 1.25), Color("#3b2a1e"), group)
	for x in [1.75, 4.25]:
		_box("TableLeg_%s" % str(x), Vector3(x, 0.4, -1.7), Vector3(0.16, 0.9, 0.16), Color("#241912"), group)
	for index in range(4):
		_cylinder("Bottle_%02d" % index, Vector3(2.1 + index * 0.55, 1.25, -1.65), 0.09, 0.55, Color("#59341f"), group, true)
	_cylinder("Keg", Vector3(4.7, 0.7, -0.45), 0.48, 1.4, Color("#777c78"), group, true)
	_box("LabelPress", Vector3(2.7, 1.25, -2.0), Vector3(0.8, 0.55, 0.55), Color("#6f4328"), group, true)
	_station_light("packaging", Vector3(3.1, 4.0, -1.4))
	_station_label("PACKAGE", Vector3(3.1, 0.25, -0.15))

func _build_courtyard() -> void:
	var group := Node3D.new(); group.name = "CourtyardModule"; world_root.add_child(group); station_nodes.courtyard = group
	_box("LongTable", Vector3(4.6, 0.72, 3.0), Vector3(5.2, 0.18, 1.0), Color("#49301f"), group)
	for x in [2.4, 6.8]:
		_box("LongTableLeg_%s" % str(x), Vector3(x, 0.35, 3.0), Vector3(0.22, 0.7, 0.65), Color("#271a12"), group)
	for index in range(6):
		_cylinder("CourtyardGlass_%02d" % index, Vector3(2.8 + index * 0.72, 0.98, 2.95), 0.08, 0.32, Color(0.82, 0.64, 0.30, 0.72), group)
	for index in range(7):
		var lantern := OmniLight3D.new()
		lantern.position = Vector3(1.7 + index * 0.85, 3.1 + sin(index) * 0.25, 2.4)
		lantern.light_color = Color("#e4a15d")
		lantern.light_energy = 0.18
		lantern.omni_range = 2.4
		group.add_child(lantern)
		_sphere("Lantern_%02d" % index, lantern.position, 0.09, Color("#f2b267"), group, true)
	_station_light("courtyard", Vector3(5.1, 4.3, 2.8))
	_station_label("COURTYARD", Vector3(5.0, 0.2, 4.0))

func _build_characters() -> void:
	var definitions := {
		"player": {"name":player_name,"color":player_coat,"position":Vector3(-5.8,0,2.0)},
		"jules": {"name":"JULES","color":Color("#a99252"),"position":Vector3(-3.7,0,0.5)},
		"maelle": {"name":"MAËLLE","color":Color("#456b70"),"position":Vector3(2.7,0,0.8)},
		"noor": {"name":"NOOR","color":Color("#8d4d57"),"position":Vector3(4.1,0,3.8)},
		"inez": {"name":"INEZ","color":Color("#5c6174"),"position":Vector3(4.8,0,-0.5)}
	}
	for id in definitions:
		var definition: Dictionary = definitions[id]
		var character := Node3D.new(); character.name = id.capitalize(); character.position = definition.position; world_root.add_child(character)
		_cylinder("Body", Vector3(0,0.72,0), 0.24, 1.15, definition.color, character)
		_sphere("Head", Vector3(0,1.5,0), 0.23, Color("#c99571"), character)
		_box("HandL", Vector3(-0.34,0.92,0), Vector3(0.18,0.18,0.18), Color("#d5a27c"), character)
		_box("HandR", Vector3(0.34,0.92,0), Vector3(0.18,0.18,0.18), Color("#d5a27c"), character)
		var label := Label3D.new(); label.name="Nameplate"; label.text=definition.name; label.position=Vector3(0,1.95,0); label.font_size=32; label.outline_size=8; label.modulate=Color("#eadcc3"); label.billboard=BaseMaterial3D.BILLBOARD_ENABLED; character.add_child(label)
		character_nodes[id] = character

func _build_camera() -> void:
	var camera := Camera3D.new()
	camera.name = "EstateCamera"
	camera.projection = Camera3D.PROJECTION_ORTHOGONAL
	camera.size = 15.8
	camera.position = Vector3(13.5, 11.5, 15.5)
	camera.look_at_from_position(camera.position, Vector3(-0.4, 1.1, -0.5))
	world_root.add_child(camera)
	camera.current = true

func customize_player(display_name: String, coat_index: int) -> void:
	player_name = display_name.to_upper().substr(0, 14)
	player_coat = [Color("#b8683b"), Color("#456b70"), Color("#79536d")][clampi(coat_index, 0, 2)]
	if character_nodes.has("player"):
		character_nodes.player.get_node("Nameplate").text = player_name
		_set_mesh_color(character_nodes.player.get_node("Body"), player_coat)

func set_management_state(state: Dictionary) -> void:
	var minute_of_day := int(state.game_minute) % 1440
	var daylight := clampf(1.0 - abs(float(minute_of_day - 780)) / 780.0, 0.0, 1.0)
	environment.background_color = Color("#111722").lerp(Color("#28313a"), daylight * 0.28)
	environment.ambient_light_energy = 0.38 + daylight * 0.22
	for station_id in station_lights:
		var busy: bool = bool(state.stations[station_id].busy)
		station_lights[station_id].light_energy = 1.7 if busy else 0.62
	for staff_id in character_nodes:
		if not state.staff.has(staff_id): continue
		var member: Dictionary = state.staff[staff_id]
		var target: Vector3 = STATION_POSITIONS.estate
		var visible_now := true
		if member.assignment != "":
			for job in state.jobs:
				if job.id == member.assignment: target = STATION_POSITIONS.get(job.station, STATION_POSITIONS.estate)
		else:
			visible_now = minute_of_day >= int(member.shift_start) and minute_of_day <= int(member.shift_end)
			target = _idle_position(staff_id)
		character_nodes[staff_id].visible = visible_now
		character_nodes[staff_id].position = character_nodes[staff_id].position.lerp(target, 0.22)
	# Community payoff populates the long table with warm points of light.
	for child in station_nodes.courtyard.get_children():
		if child is OmniLight3D: child.light_energy = 0.16 + clampf(float(state.community_trust) / 100.0, 0.0, 1.0) * 0.35

func set_story_state(_phase: int, _community: int) -> void:
	pass

func _idle_position(staff_id: String) -> Vector3:
	match staff_id:
		"player": return Vector3(-5.8, 0, 2.0)
		"jules": return Vector3(-3.6, 0, 0.7)
		"maelle": return Vector3(2.4, 0, 1.1)
		"noor": return Vector3(4.2, 0, 3.8)
		"inez": return Vector3(4.7, 0, -0.2)
	return Vector3.ZERO

func _station_light(id: String, position: Vector3) -> void:
	var light := OmniLight3D.new(); light.name=id.capitalize()+"WorkLight"; light.position=position; light.light_color=Color("#dd8b45"); light.light_energy=0.62; light.omni_range=5.4; light.shadow_enabled=true; world_root.add_child(light); station_lights[id]=light

func _station_label(text: String, position: Vector3) -> void:
	var label := Label3D.new(); label.text=text; label.position=position; label.font_size=34; label.outline_size=10; label.modulate=Color("#e6d5b9"); label.billboard=BaseMaterial3D.BILLBOARD_ENABLED; world_root.add_child(label)

func _box(name: String, position: Vector3, size: Vector3, color: Color, parent: Node3D, metallic := false) -> MeshInstance3D:
	var mesh := BoxMesh.new(); mesh.size=size
	var instance := MeshInstance3D.new(); instance.name=name; instance.mesh=mesh; instance.position=position; instance.material_override=_material(color,metallic); parent.add_child(instance); return instance

func _cylinder(name: String, position: Vector3, radius: float, height: float, color: Color, parent: Node3D, metallic := false) -> MeshInstance3D:
	var mesh := CylinderMesh.new(); mesh.top_radius=radius; mesh.bottom_radius=radius; mesh.height=height; mesh.radial_segments=24
	var instance := MeshInstance3D.new(); instance.name=name; instance.mesh=mesh; instance.position=position; instance.material_override=_material(color,metallic); parent.add_child(instance); return instance

func _sphere(name: String, position: Vector3, radius: float, color: Color, parent: Node3D, emission := false) -> MeshInstance3D:
	var mesh := SphereMesh.new(); mesh.radius=radius; mesh.height=radius*2.0
	var instance := MeshInstance3D.new(); instance.name=name; instance.mesh=mesh; instance.position=position; instance.material_override=_material(color,false,emission); parent.add_child(instance); return instance

func _pipe(position: Vector3, size: Vector3, color: Color, parent: Node3D) -> void:
	_box("Pipe",position,size,color,parent,true)

func _material(color: Color, metallic := false, emission := false) -> StandardMaterial3D:
	var material := StandardMaterial3D.new(); material.albedo_color=color; material.metallic=0.72 if metallic else 0.05; material.roughness=0.26 if metallic else 0.78
	if emission: material.emission_enabled=true; material.emission=color; material.emission_energy_multiplier=2.0
	if color.a < 1.0: material.transparency=BaseMaterial3D.TRANSPARENCY_ALPHA
	return material

func _set_mesh_color(instance: MeshInstance3D, color: Color) -> void:
	instance.material_override = _material(color)

func _stone_color(index: int) -> Color:
	return [Color("#514a42"),Color("#5a5147"),Color("#49443e")][index%3]
