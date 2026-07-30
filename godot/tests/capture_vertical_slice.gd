extends SceneTree

var output_dir := ""

func _init() -> void:
	call_deferred("_capture_gallery")

func _capture_gallery() -> void:
	output_dir = ProjectSettings.globalize_path("res://../outputs/vertical-slice")
	DirAccess.make_dir_recursive_absolute(output_dir)
	var scene: PackedScene = load("res://scenes/main.tscn")
	var instance = scene.instantiate()
	root.add_child(instance)
	await _settle(0.8)
	await _save("01-appointment.png")

	instance.begin_campaign_with("Elise", 0)
	instance.ui.prologue.finish(true)
	await _settle(0.1)
	var first_light := instance.get_node_or_null("World/FirstLightHotspot") as Button
	if first_light: first_light.pressed.emit()
	await _settle(1.3)
	var model: BrewSimulation = instance.simulation
	instance._refresh(true)
	await _settle(0.2)
	instance.selected_staff_id = "jules"
	instance._start_action("recommission")
	instance._refresh(true)
	await _settle(1.2)
	await _save("02-active-brewing.png")

	model.advance_to_next_milestone()
	instance.selected_staff_id = "player"
	model.start_action("mash", "player")
	model.advance_to_next_milestone()
	instance._refresh(true)
	await _settle(1.0)
	await _save("03-mash-decision.png")

	model.choose_issue("cut_heat_stir")
	model.choose_issue("estate_herbs")
	model.start_action("boil", "player")
	model.advance_to_next_milestone()
	model.start_action("clean_fermenter", "jules")
	model.advance_to_next_milestone()
	model.start_action("transfer", "player")
	model.advance_to_next_milestone()
	var minute_of_day := int(model.state.game_minute) % 1440
	if minute_of_day < 720: model.advance(720 - minute_of_day)
	model.start_action("prepare_courtyard", "noor")
	model.start_action("prepare_labels", "inez")
	while model.state.stage == "fermenting": model.advance_to_next_milestone()
	instance._refresh(true)
	await _settle(0.2)
	instance.selected_staff_id = "maelle"
	instance._start_action("package")
	await _settle(1.0)
	await _save("04-packaging.png")

	model.advance_to_next_milestone()
	instance._refresh(true)
	await _settle(0.2)
	instance.selected_staff_id = "maelle"
	instance._start_action("serve")
	await _settle(1.0)
	await _save("05-courtyard-service.png")

	model.advance_to_next_milestone()
	instance._refresh(true)
	await _settle(1.0)
	await _save("06-weekly-council.png")

	model.resolve_council("reinvest")
	instance._refresh(true)
	await _settle(1.2)
	await _save("07-council-outcome.png")

	model.begin_next_week()
	instance._refresh(true)
	await _settle(1.0)
	await _save("08-week-two-planning.png")
	var week_two_seed: Dictionary = model.state.duplicate(true)

	model.choose_week_plan("count_reserve")
	instance._refresh(true)
	await _settle(1.0)
	await _save("09-stable-amber-commitment.png")
	var amber_brewer := _available_brewer(model)
	if amber_brewer.is_empty():
		push_error("Could not find an available brewer for the Stable Amber incident capture.")
		quit(1)
		return
	instance.selected_staff_id = amber_brewer
	var week_two_actions := model.get_available_actions()
	if _has_action(week_two_actions, "clean_brewhouse"):
		if not _start_and_finish(model, "clean_brewhouse", amber_brewer): return
	if not _start_and_finish(model, "mash", amber_brewer): return
	if str(model.state.pending_issue) != "amber_lauter_stall":
		push_error("Stable Amber did not reach its contract-specific runoff incident.")
		quit(1)
		return
	instance._refresh(true)
	await _settle(1.0)
	await _save("10-stable-amber-runoff.png")
	model.choose_issue("rake_recirculate")
	if not _stage_delivery(model, 80, false, false): return
	instance._refresh(true)
	await _settle(1.0)
	await _save("11-reserve-approved.png")

	model.resolve_council("back_community")
	model.begin_next_week()
	instance._refresh(true)
	await _settle(1.0)
	await _save("12-capacity-conflict.png")
	model.respond_to_capacity_opportunity("abbey_table", "accept")
	model.respond_to_capacity_opportunity("inn_cellar", "renegotiate")
	model.finalize_capacity_plan()
	model.state.stations.brewhouse.cleanliness = 92
	model.state.stations.fermenter.cleanliness = 93
	_ensure_shift(model, "player")
	var first_batch_id := str(model.state.production_batches[0].id)
	if not _start_and_finish(model, "ops::%s::mash" % first_batch_id, "player"): return
	if not _start_and_finish(model, "ops::%s::boil" % first_batch_id, "player"): return
	if not _start_and_finish(model, "ops::%s::transfer" % first_batch_id, "player"): return
	var second_batch_id := str(model.state.production_batches[1].id)
	model.select_operations_batch(second_batch_id)
	_ensure_shift(model, "jules")
	var parallel_prep := model.start_action("ops::%s::prepare" % second_batch_id, "jules")
	if not bool(parallel_prep.ok):
		push_error("Could not stage the second live batch for capture: " + str(parallel_prep.message))
		quit(1)
		return
	instance.selected_staff_id = "player"
	instance._refresh(true)
	await _settle(1.0)
	await _save("15-brewery-in-motion.png")

	model.state = week_two_seed.duplicate(true)
	model._touch()
	model.choose_week_plan("festival_rush")
	if not _stage_delivery(model, 66, false, false): return
	instance._refresh(true)
	await _settle(1.0)
	await _save("13-festival-saved.png")

	model.state = week_two_seed.duplicate(true)
	model._touch()
	model.choose_week_plan("count_reserve")
	if not _stage_delivery(model, 62, true, true): return
	if str(model.state.stage) != "delivery_recovery":
		push_error("Strained reserve did not open delivery recovery for capture.")
		quit(1)
		return
	instance._refresh(true)
	await _settle(1.0)
	await _save("14-delivery-recovery.png")
	print("Old Stables vertical-slice gallery: CAPTURED to " + output_dir)
	instance.cue_player.stop()
	instance.cue_player.stream = null
	await create_timer(0.25).timeout
	instance.queue_free()
	await process_frame
	quit(0)

func _available_brewer(model: BrewSimulation) -> String:
	for staff_id in ["player", "jules"]:
		if model.is_staff_available(staff_id) and int(model.state.staff[staff_id].skills.get("brewing", 0)) > 0:
			return staff_id
	return ""

func _has_action(actions: Array, action_id: String) -> bool:
	for action in actions:
		if str(action.id) == action_id: return true
	return false

func _start_and_finish(model: BrewSimulation, action_id: String, staff_id: String) -> bool:
	var result := model.start_action(action_id, staff_id)
	if not bool(result.ok):
		push_error("Could not start %s for capture: %s" % [action_id, result.message])
		quit(1)
		return false
	model.advance_to_next_milestone()
	return true

func _ensure_shift(model: BrewSimulation, staff_id: String) -> void:
	if model.is_staff_available(staff_id): return
	var staff: Dictionary = model.state.staff[staff_id]
	var minute_of_day := int(model.state.game_minute) % 1440
	var delta := int(staff.shift_start) - minute_of_day
	if delta <= 0: delta += 1440
	model.advance(delta)

func _stage_delivery(model: BrewSimulation, quality: int, late: bool, damaged: bool) -> bool:
	model.state.jobs = []
	for staff_id in model.state.staff:
		model.state.staff[staff_id].assignment = ""
	for station_id in model.state.stations:
		model.state.stations[station_id].busy = false
	model.state.batch.quality = quality
	if float(model.state.batch.get("packaged_l", 0.0)) < 20.0 and float(model.state.inventory.empty_keg.quantity) >= 1.0:
		model.state.inventory.empty_keg.quantity -= 1.0
	model.state.batch.packaged_l = 20.0
	model.state.batch.status = "packaged"
	model.state.courtyard_prepared = true
	model.state.stage = "ready_to_serve"
	model.state.stations.brewhouse.condition = 50 if damaged else maxi(62, int(model.state.stations.brewhouse.condition))
	model.state.promise.deadline_minute = int(model.state.game_minute) - 1 if late else int(model.state.game_minute) + 24 * 60
	var minute_of_day := int(model.state.game_minute) % 1440
	if minute_of_day < 600:
		model.advance(600 - minute_of_day)
	elif minute_of_day > 1320:
		model.advance(1440 - minute_of_day + 600)
	var server := ""
	for staff_id in ["maelle", "noor", "inez", "player"]:
		if model.is_staff_available(staff_id) and int(model.state.staff[staff_id].skills.get("service", 0)) > 0:
			server = staff_id
			break
	if server.is_empty():
		push_error("Could not find an available server for outcome capture.")
		quit(1)
		return false
	var started_service := model.start_action("serve", server)
	if not bool(started_service.ok):
		push_error("Could not begin outcome delivery: " + str(started_service.message))
		quit(1)
		return false
	model.advance_to_next_milestone()
	return true

func _settle(seconds: float) -> void:
	await create_timer(seconds).timeout
	for frame in range(4): await process_frame

func _save(filename: String) -> void:
	var viewport_texture := root.get_texture()
	if viewport_texture == null:
		push_error("Capture requires a rendered window; do not run this script with --headless.")
		quit(1)
		return
	var image := viewport_texture.get_image()
	var error := image.save_png(output_dir + "/" + filename)
	if error != OK:
		push_error("Could not save " + filename + ": " + str(error))
		quit(1)
		return
	print("Captured " + filename)
