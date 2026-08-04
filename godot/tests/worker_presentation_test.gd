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
	world.name = "WorkerPresentationProbe"
	world.set_script(WORLD_SCRIPT)
	root.add_child(world)
	await process_frame

	for viewport_size in VIEWPORT_CASES:
		_check_idle_staff_are_not_overlaid(world, viewport_size)
		_check_active_assignment_chip(world, viewport_size)
		_check_assignment_stack(world, viewport_size)
		_check_stale_assignment_is_not_presented_as_live(world, viewport_size)

	world.queue_free()
	await process_frame
	if failures.is_empty():
		print("Old Stables worker presentation test: PASS (painted staff stay decorative; live assignment chips track stations)")
		quit(0)
	else:
		for failure in failures:
			push_error(failure)
		quit(1)

func _check_idle_staff_are_not_overlaid(world: Control, viewport_size: Vector2) -> void:
	_prepare_world(world, viewport_size)
	world.set_management_state(_state_with_assignments([]))
	_expect(world._active_staff_assignments().is_empty(), "Idle on-shift staff produced simulated worker overlays at %s" % viewport_size)
	_expect(world._assignment_chip_rect("player") == Rect2(), "Idle player produced a live assignment chip at %s" % viewport_size)
	_expect(world._station_status_text("brewhouse").ends_with("/ IDLE"), "Idle station was not explicitly presented as idle at %s" % viewport_size)

func _check_active_assignment_chip(world: Control, viewport_size: Vector2) -> void:
	_prepare_world(world, viewport_size)
	world.set_management_state(_state_with_assignments([
		{"staff_id":"jules", "job_id":"JOB-MASH", "station":"brewhouse", "label":"Mash Lantern Blonde"}
	]))
	var assignments: Array = world._active_staff_assignments()
	_expect(assignments.size() == 1, "One active job did not produce exactly one assignment chip at %s" % viewport_size)
	if assignments.size() != 1:
		return
	_expect(str(assignments[0].staff_id) == "jules", "Active assignment chip named the wrong worker at %s" % viewport_size)
	_expect(str(assignments[0].station_id) == "brewhouse", "Active assignment chip targeted the wrong station at %s" % viewport_size)
	_expect(world._station_status_text("brewhouse").ends_with("/ ACTIVE"), "Busy station was not explicitly presented as active at %s" % viewport_size)
	var chip: Rect2 = world._assignment_chip_rect("jules")
	var station_point: Vector2 = world._station_point("brewhouse")
	_expect(_rect_inside_view(chip, viewport_size), "Assignment chip was clipped at %s" % viewport_size)
	_expect(absf(chip.get_center().x - station_point.x) <= 0.01, "Assignment chip drifted horizontally from the brewhouse at %s" % viewport_size)
	var hotspot: Button = world.station_buttons.brewhouse
	_expect(hotspot.position + hotspot.size * 0.5 == station_point, "Assignment presentation moved the brewhouse click target at %s" % viewport_size)
	_expect(hotspot.size == Vector2(104, 104), "Assignment presentation resized the brewhouse click target at %s" % viewport_size)

func _check_assignment_stack(world: Control, viewport_size: Vector2) -> void:
	_prepare_world(world, viewport_size)
	world.set_management_state(_state_with_assignments([
		{"staff_id":"player", "job_id":"JOB-A", "station":"packaging", "label":"Bottle reserve"},
		{"staff_id":"maelle", "job_id":"JOB-B", "station":"packaging", "label":"Prepare labels"}
	]))
	var first: Rect2 = world._assignment_chip_rect("player")
	var second: Rect2 = world._assignment_chip_rect("maelle")
	_expect(not first.intersects(second), "Two live assignments overlapped at %s" % viewport_size)
	_expect(_rect_inside_view(first, viewport_size) and _rect_inside_view(second, viewport_size), "Stacked assignment chips were clipped at %s" % viewport_size)

func _check_stale_assignment_is_not_presented_as_live(world: Control, viewport_size: Vector2) -> void:
	_prepare_world(world, viewport_size)
	var state := _state_with_assignments([
		{"staff_id":"inez", "job_id":"JOB-DONE", "station":"fermenter", "label":"Purge fermenter"}
	])
	state.jobs[0].status = "complete"
	world.set_management_state(state)
	_expect(world._active_staff_assignments().is_empty(), "Completed work was still presented as a live assignment at %s" % viewport_size)

func _prepare_world(world: Control, viewport_size: Vector2) -> void:
	world.size = viewport_size
	world.current_scene = "brewery"
	world.camera_focus = world._default_focus("brewery")
	world.camera_zoom = 1.0
	world._layout_hotspots()

func _state_with_assignments(definitions: Array) -> Dictionary:
	var state := {
		"game_minute": 600,
		"stations": {
			"brewhouse":{"busy":false},
			"fermenter":{"busy":false},
			"packaging":{"busy":false},
			"courtyard":{"busy":false}
		},
		"staff": {
			"player":_member("Elise", 360, 1380),
			"jules":_member("Jules Lambert", 360, 960),
			"maelle":_member("Maelle Renard", 600, 1320),
			"noor":_member("Noor Benali", 720, 1320),
			"inez":_member("Inez De Wilde", 420, 1020)
		},
		"jobs":[]
	}
	for definition in definitions:
		var staff_id := str(definition.staff_id)
		state.staff[staff_id].assignment = str(definition.job_id)
		state.stations[str(definition.station)].busy = true
		state.jobs.append({
			"id":definition.job_id,
			"station":definition.station,
			"label":definition.label,
			"status":"active",
			"started":600,
			"ends":690
		})
	return state

func _member(display_name: String, shift_start: int, shift_end: int) -> Dictionary:
	return {
		"name":display_name,
		"shift_start":shift_start,
		"shift_end":shift_end,
		"assignment":""
	}

func _rect_inside_view(rect: Rect2, viewport_size: Vector2) -> bool:
	return rect.position.x >= -0.01 and rect.position.y >= -0.01 \
		and rect.end.x <= viewport_size.x + 0.01 and rect.end.y <= viewport_size.y + 0.01

func _expect(condition: bool, message: String) -> void:
	if not condition:
		failures.append(message)
