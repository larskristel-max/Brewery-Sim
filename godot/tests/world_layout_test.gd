extends SceneTree

const WORLD_SCRIPT := preload("res://scripts/concept_world.gd")

const VIEWPORT_CASES := [
	Vector2(1280, 720),
	Vector2(1600, 900),
	Vector2(2560, 1080)
]

var failures: Array[String] = []

func _init() -> void:
	call_deferred("_run")

func _run() -> void:
	var world := Control.new()
	world.name = "WorldLayoutProbe"
	world.set_script(WORLD_SCRIPT)
	root.add_child(world)
	await process_frame

	for viewport_size in VIEWPORT_CASES:
		_check_default_layout(world, viewport_size)
		for station_id in world.STATION_POINTS:
			_check_focused_layout(world, viewport_size, station_id)

	world.queue_free()
	await process_frame
	if failures.is_empty():
		print("Old Stables world layout test: PASS (hotspots track crop and focus at 720p, 900p, and ultrawide sizes)")
		quit(0)
	else:
		for failure in failures:
			push_error(failure)
		quit(1)

func _check_default_layout(world: Control, viewport_size: Vector2) -> void:
	world.size = viewport_size
	world.current_scene = "brewery"
	world.camera_focus = world._default_focus("brewery")
	world.camera_zoom = 1.0
	world._layout_hotspots()
	_check_source_crop(world, viewport_size, "default")
	_check_hotspot_centres(world, viewport_size, "default")
	_check_first_light(world, viewport_size)

func _check_focused_layout(world: Control, viewport_size: Vector2, station_id: String) -> void:
	world.size = viewport_size
	world.current_scene = "brewery"
	world.camera_focus = world.STATION_POINTS[station_id]
	world.camera_zoom = 1.13
	world._layout_hotspots()
	var context := "focused %s" % station_id
	_check_source_crop(world, viewport_size, context)
	_check_hotspot_centres(world, viewport_size, context)
	var focused_point: Vector2 = world._point(world.STATION_POINTS[station_id])
	_expect(
		_point_inside_view(focused_point, viewport_size),
		"%s at %s cropped the selected station out of view (got %s)" % [
			context, viewport_size, focused_point
		]
	)

func _check_source_crop(world: Control, viewport_size: Vector2, context: String) -> void:
	var texture: Texture2D = world.SCENES.brewery
	var texture_size := Vector2(texture.get_width(), texture.get_height())
	var source: Rect2 = world._source_rect(texture)
	var expected_aspect := viewport_size.x / viewport_size.y
	var actual_aspect := source.size.x / source.size.y
	_expect(absf(actual_aspect - expected_aspect) <= 0.001, "%s at %s produced an incorrect source aspect" % [context, viewport_size])
	_expect(source.position.x >= -0.01 and source.position.y >= -0.01, "%s at %s cropped before the source image" % [context, viewport_size])
	_expect(source.end.x <= texture_size.x + 0.01 and source.end.y <= texture_size.y + 0.01, "%s at %s cropped beyond the source image" % [context, viewport_size])

func _check_hotspot_centres(world: Control, viewport_size: Vector2, context: String) -> void:
	for station_id in world.STATION_POINTS:
		var button: Button = world.station_buttons[station_id]
		var expected: Vector2 = world._point(world.STATION_POINTS[station_id])
		var actual: Vector2 = button.position + button.size * 0.5
		_expect(actual.distance_to(expected) <= 0.01, "%s %s hotspot drifted from its rendered marker at %s" % [context, station_id, viewport_size])
		_expect(_rect_inside_view(button.get_rect(), viewport_size), "%s %s hotspot was clipped at %s" % [context, station_id, viewport_size])

func _check_first_light(world: Control, viewport_size: Vector2) -> void:
	var expected: Vector2 = world._point(Vector2(0.42, 0.22))
	var actual: Vector2 = world.first_light_button.position + world.first_light_button.size * 0.5
	_expect(actual.distance_to(expected) <= 0.01, "First-light hotspot drifted from its rendered lantern at %s" % viewport_size)
	_expect(_rect_inside_view(world.first_light_button.get_rect(), viewport_size), "First-light hotspot was clipped at %s" % viewport_size)

func _rect_inside_view(rect: Rect2, viewport_size: Vector2) -> bool:
	return rect.position.x >= -0.01 and rect.position.y >= -0.01 \
		and rect.end.x <= viewport_size.x + 0.01 and rect.end.y <= viewport_size.y + 0.01

func _point_inside_view(point: Vector2, viewport_size: Vector2) -> bool:
	return point.x >= 0.0 and point.y >= 0.0 and point.x <= viewport_size.x and point.y <= viewport_size.y

func _expect(condition: bool, message: String) -> void:
	if not condition:
		failures.append(message)
