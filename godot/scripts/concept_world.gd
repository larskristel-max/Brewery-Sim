extends Control

signal station_selected(station_id: String)
signal station_hovered(station_id: String, entered: bool)
signal first_light_activated

const SCENES := {
	"appointment": preload("res://assets/scenes/appointment.png"),
	"brewery": preload("res://assets/scenes/brewery-floor.png"),
	"mash": preload("res://assets/scenes/mash-intervention.png"),
	"packaging": preload("res://assets/scenes/packaging.png"),
	"courtyard": preload("res://assets/scenes/courtyard-service.png"),
	"council": preload("res://assets/scenes/weekly-council.png")
}

const STATION_POINTS := {
	"brewhouse": Vector2(0.34, 0.55),
	"fermenter": Vector2(0.49, 0.45),
	"packaging": Vector2(0.64, 0.57),
	"courtyard": Vector2(0.73, 0.64)
}

const STATION_NAMES := {
	"brewhouse": "COPPER BREWHOUSE",
	"fermenter": "FERMENTER BANK",
	"packaging": "PACKAGING BENCH",
	"courtyard": "COURTYARD TABLE"
}

const WORKER_COLORS := {
	"player": Color("#b9693f"),
	"jules": Color("#75886c"),
	"maelle": Color("#2f7180"),
	"noor": Color("#925775"),
	"inez": Color("#495c72")
}

const STAFF_ORDER := ["player", "jules", "maelle", "noor", "inez"]
const ASSIGNMENT_CHIP_SIZE := Vector2(194, 42)

var management_state: Dictionary = {}
var player_name := "ELISE"
var player_coat := Color("#b9693f")
var pulse := 0.0
var current_scene := "brewery"
var previous_scene := ""
var scene_transition := 1.0
var selected_station := ""
var hovered_station := ""
var camera_focus := Vector2(0.5, 0.5)
var camera_focus_target := Vector2(0.5, 0.5)
var camera_zoom := 1.0
var camera_zoom_target := 1.0
var parallax := Vector2.ZERO
var parallax_target := Vector2.ZERO
var station_buttons := {}
var feedback_text := ""
var feedback_positive := true
var feedback_life := 0.0
var first_light_waiting := false
var first_light_reveal := 1.0
var first_light_button: Button

func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_PASS
	clip_contents = true
	for id in STATION_POINTS:
		_make_station_button(id)
	_make_first_light_button()
	resized.connect(_layout_hotspots)
	_layout_hotspots()
	queue_redraw()

func _process(delta: float) -> void:
	pulse += delta
	scene_transition = minf(1.0, scene_transition + delta * 1.6)
	camera_focus = camera_focus.lerp(camera_focus_target + parallax, minf(1.0, delta * 3.5))
	camera_zoom = lerpf(camera_zoom, camera_zoom_target, minf(1.0, delta * 3.2))
	parallax = parallax.lerp(parallax_target, minf(1.0, delta * 2.0))
	_layout_hotspots()
	if feedback_life > 0.0:
		feedback_life -= delta
		if feedback_life <= 0.0: feedback_text = ""
	if not first_light_waiting and first_light_reveal < 1.0:
		var was_hidden := first_light_reveal < 0.92
		first_light_reveal = minf(1.0, first_light_reveal + delta * 0.72)
		if was_hidden and first_light_reveal >= 0.92:
			_update_station_buttons()
	queue_redraw()

func _gui_input(event: InputEvent) -> void:
	if event is InputEventMouseMotion:
		var normalized: Vector2 = event.position / size
		parallax_target = (normalized - Vector2(0.5, 0.5)) * 0.012
	elif event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_RIGHT:
		clear_focus()

func customize_player(display_name: String, coat_index: int) -> void:
	player_name = display_name.to_upper().substr(0, 14)
	player_coat = [Color("#b9693f"), Color("#2f7180"), Color("#73455b")][clampi(coat_index, 0, 2)]
	queue_redraw()

func set_management_state(state: Dictionary) -> void:
	management_state = state
	_update_station_buttons()
	queue_redraw()

func set_story_state(state: Dictionary) -> void:
	var scene_id := "brewery"
	var active_action := ""
	for job in state.get("jobs", []):
		if job.status == "active" and job.station != "fermentation_clock":
			active_action = str(job.action)
			break
	if str(state.get("stage", "")) == "appointment":
		scene_id = "appointment"
	elif str(state.get("pending_issue", "")) != "" or active_action in ["mash", "boil"]:
		scene_id = "mash"
	elif active_action == "package" or str(state.get("stage", "")) == "ready_to_package":
		scene_id = "packaging"
	elif active_action == "serve" or str(state.get("stage", "")) == "ready_to_serve":
		scene_id = "courtyard"
	elif str(state.get("stage", "")) in ["council", "complete"]:
		scene_id = "council"
	set_story_scene(scene_id)

func set_story_scene(scene_id: String) -> void:
	if not SCENES.has(scene_id) or scene_id == current_scene: return
	previous_scene = current_scene
	current_scene = scene_id
	scene_transition = 0.0
	selected_station = ""
	camera_focus_target = _default_focus(scene_id)
	camera_zoom_target = 1.0
	_update_station_buttons()

func set_cinematic_camera(scene_id: String, focus: Vector2, zoom: float) -> void:
	set_story_scene(scene_id)
	camera_focus_target = focus
	camera_zoom_target = zoom

func begin_first_light() -> void:
	set_story_scene("brewery")
	first_light_waiting = true
	first_light_reveal = 0.0
	first_light_button.visible = true
	first_light_button.disabled = false
	_update_station_buttons()
	queue_redraw()

func set_story_state_legacy(_phase: int, _community: int) -> void:
	pass

func focus_station(station_id: String) -> void:
	if not STATION_POINTS.has(station_id): return
	selected_station = station_id
	camera_focus_target = STATION_POINTS[station_id]
	camera_zoom_target = 1.13
	_update_station_buttons()
	queue_redraw()

func clear_focus() -> void:
	selected_station = ""
	camera_focus_target = _default_focus(current_scene)
	camera_zoom_target = 1.0
	_update_station_buttons()

func show_feedback(message: String, positive := true) -> void:
	feedback_text = message
	feedback_positive = positive
	feedback_life = 3.2
	queue_redraw()

func _default_focus(scene_id: String) -> Vector2:
	match scene_id:
		"appointment": return Vector2(0.52, 0.49)
		"mash": return Vector2(0.52, 0.52)
		"packaging": return Vector2(0.48, 0.53)
		"courtyard": return Vector2(0.49, 0.54)
		"council": return Vector2(0.50, 0.53)
		_: return Vector2(0.52, 0.54)

func _make_station_button(id: String) -> void:
	var button := Button.new()
	button.name = id.capitalize() + "Hotspot"
	button.text = ""
	button.flat = true
	button.tooltip_text = "%s\nSelect this work zone" % STATION_NAMES[id]
	button.focus_mode = Control.FOCUS_NONE
	button.mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
	button.pressed.connect(_on_station_pressed.bind(id))
	button.mouse_entered.connect(_on_station_hover.bind(id, true))
	button.mouse_exited.connect(_on_station_hover.bind(id, false))
	add_child(button)
	station_buttons[id] = button

func _make_first_light_button() -> void:
	first_light_button = Button.new()
	first_light_button.name = "FirstLightHotspot"
	first_light_button.text = ""
	first_light_button.flat = true
	first_light_button.tooltip_text = "Light the Old Stables"
	first_light_button.focus_mode = Control.FOCUS_ALL
	first_light_button.mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
	first_light_button.visible = false
	first_light_button.pressed.connect(_on_first_light_pressed)
	add_child(first_light_button)

func _layout_hotspots() -> void:
	for id in station_buttons:
		var button: Button = station_buttons[id]
		var point := _station_point(id)
		button.position = point - Vector2(52, 52)
		button.size = Vector2(104, 104)
	if is_instance_valid(first_light_button):
		var light_point := _first_light_point()
		first_light_button.position = light_point - Vector2(64, 58)
		first_light_button.size = Vector2(128, 116)

func _update_station_buttons() -> void:
	var interactive := current_scene == "brewery" and not first_light_waiting and first_light_reveal >= 0.92
	for id in station_buttons:
		var button: Button = station_buttons[id]
		button.visible = interactive
		button.disabled = not interactive
		button.modulate = Color.WHITE if selected_station == "" or selected_station == id else Color(1, 1, 1, 0.55)
	_layout_hotspots()

func _on_first_light_pressed() -> void:
	if not first_light_waiting:
		return
	first_light_waiting = false
	first_light_reveal = 0.0
	first_light_button.visible = false
	first_light_activated.emit()
	queue_redraw()

func _on_station_pressed(id: String) -> void:
	focus_station(id)
	station_selected.emit(id)

func _on_station_hover(id: String, entered: bool) -> void:
	hovered_station = id if entered else ""
	station_hovered.emit(id, entered)
	queue_redraw()

func _draw() -> void:
	_draw_scene(previous_scene, 1.0 - scene_transition)
	_draw_scene(current_scene, scene_transition)
	_draw_color_grade()
	_draw_environment_effects()
	if current_scene == "brewery" and not management_state.is_empty() and not first_light_waiting and first_light_reveal >= 0.92:
		_draw_station_state()
		_draw_staff_state()
	if first_light_waiting or first_light_reveal < 1.0:
		_draw_first_light_state()
	if not feedback_text.is_empty(): _draw_feedback()
	_draw_vignette()

func _draw_scene(scene_id: String, alpha: float) -> void:
	if scene_id.is_empty() or alpha <= 0.001: return
	var texture: Texture2D = SCENES[scene_id]
	var source := _source_rect(texture)
	draw_texture_rect_region(texture, Rect2(Vector2.ZERO, size), source, Color(1, 1, 1, alpha))

func _source_rect(texture: Texture2D) -> Rect2:
	var texture_size := Vector2(texture.get_width(), texture.get_height())
	var view_aspect := size.x / maxf(1.0, size.y)
	var texture_aspect := texture_size.x / texture_size.y
	var crop_size := texture_size
	if texture_aspect > view_aspect:
		crop_size.x = texture_size.y * view_aspect
	else:
		crop_size.y = texture_size.x / view_aspect
	crop_size /= camera_zoom
	var focus_px := Vector2(camera_focus.x * texture_size.x, camera_focus.y * texture_size.y)
	var position := focus_px - crop_size * 0.5
	position.x = clampf(position.x, 0.0, texture_size.x - crop_size.x)
	position.y = clampf(position.y, 0.0, texture_size.y - crop_size.y)
	return Rect2(position, crop_size)

func _draw_color_grade() -> void:
	var wash := Color(0.025, 0.043, 0.068, 0.08)
	if current_scene == "mash": wash = Color(0.20, 0.07, 0.015, 0.035)
	elif current_scene == "courtyard":
		var trust := float(management_state.get("community_trust", 20))
		wash = Color(0.015, 0.05, 0.11, maxf(0.025, 0.085 - trust * 0.0007))
	draw_rect(Rect2(Vector2.ZERO, size), wash)
	if current_scene == "courtyard":
		var trust := float(management_state.get("community_trust", 20))
		var quality := float(management_state.get("batch", {}).get("quality", 50))
		var vitality := clampf((trust + quality) / 180.0, 0.0, 1.0)
		draw_rect(Rect2(Vector2.ZERO, size), Color(0.24,0.075,0.012,0.015 + vitality * 0.04))

func _draw_environment_effects() -> void:
	if current_scene == "appointment":
		_draw_window_rain()
		_draw_lantern(_point(Vector2(0.055, 0.73)), 34.0)
	elif current_scene == "brewery":
		_draw_lantern(_point(Vector2(0.42, 0.22)), 28.0)
		_draw_lantern(_point(Vector2(0.56, 0.24)), 23.0)
		_draw_steam(_point(Vector2(0.45, 0.39)), 8, 72.0)
		if _station_busy("fermenter"): _draw_bubbles(_point(STATION_POINTS.fermenter))
		if _station_busy("packaging"): _draw_glints(_point(STATION_POINTS.packaging))
	elif current_scene == "mash":
		_draw_steam(_point(Vector2(0.48, 0.50)), 14, 150.0)
		_draw_liquid_surface(_point(Vector2(0.46, 0.66)), 145.0)
		_draw_condensation()
	elif current_scene == "packaging":
		_draw_lantern(_point(Vector2(0.64, 0.17)), 25.0)
		_draw_glints(_point(Vector2(0.40, 0.66)))
		_draw_transfer_flow()
		_draw_condensation()
	elif current_scene == "courtyard":
		for point in [Vector2(0.10,0.18),Vector2(0.25,0.22),Vector2(0.39,0.17),Vector2(0.70,0.25),Vector2(0.86,0.22)]:
			_draw_lantern(_point(point), 18.0)
		var trust := float(management_state.get("community_trust", 20))
		var quality := float(management_state.get("batch", {}).get("quality", 50))
		_draw_fireflies(8 + int(clampf((trust + quality) / 180.0, 0.0, 1.0) * 18.0))
	elif current_scene == "council":
		_draw_lantern(_point(Vector2(0.05, 0.63)), 30.0)
		_draw_glints(_point(Vector2(0.54, 0.72)))

func _draw_window_rain() -> void:
	for index in range(22):
		var x := fmod(float(index) * 0.173 + pulse * (0.018 + float(index % 4) * 0.003), 1.0)
		var y := fmod(float(index) * 0.277 + pulse * (0.055 + float(index % 3) * 0.011), 1.0)
		var start := _point(Vector2(x, y))
		draw_line(start, start + Vector2(-4, 18 + index % 9), Color(0.63, 0.76, 0.86, 0.055), 1.0)

func _draw_first_light_state() -> void:
	var darkness := (1.0 - first_light_reveal) * 0.82
	draw_rect(Rect2(Vector2.ZERO, size), Color(0.005, 0.009, 0.016, darkness))
	var point := _first_light_point()
	var glow_strength := (0.22 + (sin(pulse * 3.2) + 1.0) * 0.055) if first_light_waiting else first_light_reveal * 0.38
	for index in range(5, 0, -1):
		var radius := 25.0 + float(index) * 14.0
		draw_circle(point, radius, Color(0.98, 0.56, 0.20, glow_strength * float(6 - index) * 0.09))
	if first_light_waiting:
		var font := ThemeDB.fallback_font
		var title := "LIGHT THE OLD STABLES"
		var width := font.get_string_size(title, HORIZONTAL_ALIGNMENT_LEFT, -1, 13).x + 30.0
		var box := Rect2(point + Vector2(-width * 0.5, 70), Vector2(width, 34))
		draw_rect(box, Color(0.018, 0.017, 0.019, 0.94))
		draw_line(box.position, box.position + Vector2(width, 0), Color("#d79a5b"), 2.0)
		draw_string(font, box.position + Vector2(15, 23), title, HORIZONTAL_ALIGNMENT_CENTER, width - 30, 13, Color("#f0e3cf"))

func _draw_station_state() -> void:
	var font := ThemeDB.fallback_font
	for id in STATION_POINTS:
		var point: Vector2 = _station_point(id)
		var busy: bool = _station_busy(id)
		var highlighted: bool = id == selected_station or id == hovered_station
		var radius: float = 33.0 + (sin(pulse * 3.0) * 3.0 if busy else 0.0)
		if highlighted:
			draw_circle(point, radius + 13.0, Color(0.90, 0.55, 0.24, 0.14))
		if busy:
			draw_circle(point, radius + 8.0, Color(0.94, 0.49, 0.18, 0.10))
			draw_arc(point, radius, 0, TAU, 56, Color("#e8a05a"), 3.0)
			_draw_job_progress(id, point, radius + 7.0)
		else:
			draw_arc(point, radius, 0, TAU, 48, Color(0.93, 0.84, 0.69, 0.78 if highlighted else 0.48), 2.0)
		var label := _station_status_text(id)
		var font_size := 12
		var width := font.get_string_size(label, HORIZONTAL_ALIGNMENT_LEFT, -1, font_size).x + 24.0
		var box := Rect2(point + Vector2(-width * 0.5, 44), Vector2(width, 25))
		draw_rect(box, Color(0.025, 0.022, 0.020, 0.90))
		draw_line(box.position, box.position + Vector2(width, 0), Color("#c5864e"), 1.0)
		draw_string(font, box.position + Vector2(12, 18), label, HORIZONTAL_ALIGNMENT_LEFT, -1, font_size, Color("#f0e3cf"))

func _draw_job_progress(station_id: String, point: Vector2, radius: float) -> void:
	for job in management_state.get("jobs", []):
		if str(job.station) != station_id or str(job.status) != "active": continue
		var duration := maxf(1.0, float(job.ends) - float(job.started))
		var elapsed := clampf(float(management_state.game_minute) - float(job.started), 0.0, duration)
		var progress := elapsed / duration
		draw_arc(point, radius, -PI * 0.5, -PI * 0.5 + TAU * progress, 64, Color("#f4d19b"), 5.0)

func _draw_staff_state() -> void:
	var font := ThemeDB.fallback_font
	for assignment in _active_staff_assignments():
		var id := str(assignment.staff_id)
		var member: Dictionary = assignment.member
		var job: Dictionary = assignment.job
		var color: Color = player_coat if id == "player" else WORKER_COLORS.get(id, Color("#8c7a67"))
		var chip := _assignment_chip_rect(id)
		var display_name := player_name if id == "player" else str(member.name).split(" ")[0].to_upper()
		var remaining := maxi(0, int(job.get("ends", 0)) - int(management_state.get("game_minute", 0)))
		var action_label := str(job.get("label", "Work order")).to_upper().substr(0, 25)
		draw_rect(chip, Color(0.018, 0.020, 0.022, 0.95))
		draw_rect(Rect2(chip.position, Vector2(5, chip.size.y)), color)
		draw_circle(chip.position + Vector2(17, 13), 4.0 + sin(pulse * 4.0) * 0.6, color.lightened(0.32))
		draw_string(font, chip.position + Vector2(27, 17), "ON TASK / %s" % display_name, HORIZONTAL_ALIGNMENT_LEFT, chip.size.x - 36, 11, Color("#f0e4d1"))
		draw_string(font, chip.position + Vector2(12, 34), "%s  %d MIN" % [action_label, remaining], HORIZONTAL_ALIGNMENT_LEFT, chip.size.x - 24, 9, Color("#cbbca7"))

func _active_staff_assignments() -> Array:
	var result: Array = []
	if management_state.is_empty():
		return result
	var staff: Dictionary = management_state.get("staff", {})
	var ordered_ids: Array = STAFF_ORDER.duplicate()
	for id in staff:
		if not ordered_ids.has(str(id)):
			ordered_ids.append(str(id))
	for id in ordered_ids:
		if not staff.has(id):
			continue
		var member: Dictionary = staff[id]
		var assignment_id := str(member.get("assignment", ""))
		if assignment_id.is_empty():
			continue
		var job := _active_job(assignment_id)
		var station_id := str(job.get("station", ""))
		if job.is_empty() or not STATION_POINTS.has(station_id):
			continue
		result.append({
			"staff_id": id,
			"member": member,
			"job": job,
			"station_id": station_id
		})
	return result

func _active_job(assignment_id: String) -> Dictionary:
	for job in management_state.get("jobs", []):
		if str(job.get("id", "")) == assignment_id and str(job.get("status", "")) == "active":
			return job
	return {}

func _assignment_chip_rect(staff_id: String) -> Rect2:
	var assignments := _active_staff_assignments()
	var station_id := ""
	for assignment in assignments:
		if str(assignment.staff_id) == staff_id:
			station_id = str(assignment.station_id)
			break
	if station_id.is_empty():
		return Rect2()
	var stack_index := 0
	for assignment in assignments:
		if str(assignment.staff_id) == staff_id:
			break
		if str(assignment.station_id) == station_id:
			stack_index += 1
	var anchor := _station_point(station_id) + Vector2(0, 75 + stack_index * 47)
	var position := anchor - Vector2(ASSIGNMENT_CHIP_SIZE.x * 0.5, 0)
	position.x = clampf(position.x, 8.0, maxf(8.0, size.x - ASSIGNMENT_CHIP_SIZE.x - 8.0))
	position.y = clampf(position.y, 8.0, maxf(8.0, size.y - ASSIGNMENT_CHIP_SIZE.y - 8.0))
	return Rect2(position, ASSIGNMENT_CHIP_SIZE)

func _draw_lantern(point: Vector2, radius: float) -> void:
	var flicker := (sin(pulse * 7.0 + point.x) + 1.0) * 0.5
	for index in range(4, 0, -1):
		var r := radius * float(index) / 4.0
		draw_circle(point, r, Color(1.0, 0.55, 0.18, (0.018 + flicker * 0.008) * float(5-index)))

func _draw_steam(origin: Vector2, count: int, height: float) -> void:
	for index in range(count):
		var t := fmod(pulse * (0.10 + index * 0.006) + float(index) / float(count), 1.0)
		var sway := sin(pulse * 1.7 + index * 2.1) * (8.0 + t * 16.0)
		var point := origin + Vector2(sway + (index % 3 - 1) * 13.0, -t * height)
		var radius := 7.0 + t * 18.0
		draw_circle(point, radius, Color(0.92,0.89,0.82,(1.0-t)*0.065))

func _draw_bubbles(origin: Vector2) -> void:
	for index in range(7):
		var t := fmod(pulse * 0.18 + index * 0.137, 1.0)
		var point := origin + Vector2(sin(index * 3.1) * 24.0, 26.0 - t * 74.0)
		draw_arc(point, 3.0 + index % 3, 0, TAU, 18, Color(0.75,0.90,0.85,(1.0-t)*0.55), 1.2)

func _draw_glints(origin: Vector2) -> void:
	for index in range(4):
		var angle := pulse * 1.8 + index * PI * 0.5
		var point := origin + Vector2(cos(angle), sin(angle)) * 31.0
		draw_line(point-Vector2(5,0),point+Vector2(5,0),Color(1,0.79,0.43,0.65),1.2)
		draw_line(point-Vector2(0,5),point+Vector2(0,5),Color(1,0.79,0.43,0.65),1.2)

func _draw_liquid_surface(origin: Vector2, radius: float) -> void:
	draw_set_transform(origin, 0.0, Vector2(1.0, 0.28))
	var shimmer := 0.09 + (sin(pulse * 2.1) + 1.0) * 0.018
	draw_circle(Vector2.ZERO, radius, Color(0.60,0.25,0.055,shimmer))
	draw_arc(Vector2.ZERO, radius * 0.78, 0, TAU, 64, Color(0.96,0.58,0.20,0.18), 3.0)
	draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)

func _draw_transfer_flow() -> void:
	var start := _point(Vector2(0.29,0.66))
	var finish := _point(Vector2(0.39,0.57))
	for index in range(8):
		var t := fmod(pulse * 0.24 + float(index) / 8.0, 1.0)
		var curve := start.lerp(finish, t) + Vector2(0, sin(t * PI) * -16.0)
		draw_circle(curve, 2.5, Color(0.94,0.55,0.18,(1.0-t)*0.65))

func _draw_condensation() -> void:
	for index in range(15):
		var x := fmod(float(index) * 0.137 + pulse * 0.002 * (index%3), 1.0) * size.x
		var y := (0.12 + fmod(float(index) * 0.193, 0.72)) * size.y
		draw_circle(Vector2(x,y), 1.5 + index%3, Color(0.86,0.91,0.92,0.16))

func _draw_fireflies(count: int) -> void:
	for index in range(count):
		var x := fmod(float(index)*0.173 + sin(pulse*0.2+index)*0.01, 1.0) * size.x
		var y := (0.25 + fmod(float(index)*0.119, 0.62)) * size.y
		var glow := 0.35 + sin(pulse*2.0+index)*0.25
		draw_circle(Vector2(x,y), 2.0, Color(1.0,0.72,0.28,glow))

func _draw_feedback() -> void:
	var font := ThemeDB.fallback_font
	var font_size := 15
	var width := minf(size.x * 0.58, font.get_string_size(feedback_text, HORIZONTAL_ALIGNMENT_LEFT, -1, font_size).x + 50.0)
	var rect := Rect2(Vector2((size.x-width)*0.5, size.y*0.18), Vector2(width, 44))
	draw_rect(rect, Color(0.025,0.022,0.02,0.94))
	draw_line(rect.position, rect.position+Vector2(width,0), Color("#7eaa92") if feedback_positive else Color("#c46f5d"), 2.0)
	draw_string(font, rect.position+Vector2(25,28), feedback_text, HORIZONTAL_ALIGNMENT_CENTER, width-50, font_size, Color("#efe4d2"))

func _draw_vignette() -> void:
	for index in range(8):
		var alpha := 0.012 * float(8-index)
		var inset := float(index) * 9.0
		var thickness := 12.0
		draw_rect(Rect2(Vector2(inset,inset),Vector2(size.x-inset*2,thickness)),Color(0.01,0.015,0.025,alpha))
		draw_rect(Rect2(Vector2(inset,size.y-inset-thickness),Vector2(size.x-inset*2,thickness)),Color(0.01,0.015,0.025,alpha))
		draw_rect(Rect2(Vector2(inset,inset),Vector2(thickness,size.y-inset*2)),Color(0.01,0.015,0.025,alpha))
		draw_rect(Rect2(Vector2(size.x-inset-thickness,inset),Vector2(thickness,size.y-inset*2)),Color(0.01,0.015,0.025,alpha))

func _station_busy(id: String) -> bool:
	return not management_state.is_empty() and management_state.stations.has(id) and bool(management_state.stations[id].busy)

func _station_status_text(id: String) -> String:
	return "%s / %s" % [STATION_NAMES.get(id, str(id).to_upper()), "ACTIVE" if _station_busy(id) else "IDLE"]

func _point(normalized: Vector2) -> Vector2:
	var texture: Texture2D = SCENES.get(current_scene, SCENES.brewery)
	var texture_size := Vector2(texture.get_width(), texture.get_height())
	var source := _source_rect(texture)
	var source_point := normalized * texture_size
	return (source_point - source.position) / source.size * size

func _station_point(station_id: String) -> Vector2:
	return _clamped_interaction_point(STATION_POINTS[station_id], Vector2(52, 52))

func _first_light_point() -> Vector2:
	return _clamped_interaction_point(Vector2(0.42, 0.22), Vector2(64, 58))

func _clamped_interaction_point(normalized: Vector2, inset: Vector2) -> Vector2:
	var point := _point(normalized)
	point.x = clampf(point.x, inset.x, maxf(inset.x, size.x - inset.x))
	point.y = clampf(point.y, inset.y, maxf(inset.y, size.y - inset.y))
	return point
