extends SceneTree

func _init() -> void:
	call_deferred("_capture")

func _capture() -> void:
	var scene: PackedScene = load("res://scenes/main.tscn")
	var instance = scene.instantiate()
	root.add_child(instance)
	await process_frame
	instance.begin_campaign_with("Elise", 0)
	instance.ui.prologue.finish(true)
	await process_frame
	var first_light := instance.get_node_or_null("World/FirstLightHotspot") as Button
	if first_light: first_light.pressed.emit()
	await create_timer(0.65).timeout
	if instance.ui.has("awakening") and is_instance_valid(instance.ui.awakening):
		instance.ui.awakening.finish(true)
	await create_timer(0.2).timeout
	var model: BrewSimulation = instance.simulation
	model.start_action("recommission", "jules"); model.advance_to_next_milestone()
	model.start_action("mash", "player"); model.advance_to_next_milestone()
	model.choose_issue("cut_heat_stir"); model.choose_issue("estate_herbs")
	model.start_action("boil", "player"); model.advance_to_next_milestone()
	model.start_action("clean_fermenter", "jules"); model.advance_to_next_milestone()
	model.start_action("transfer", "player"); model.advance_to_next_milestone()
	var minute_of_day := int(model.state.game_minute) % 1440
	if minute_of_day < 720: model.advance(720 - minute_of_day)
	model.start_action("prepare_courtyard", "noor")
	model.start_action("prepare_labels", "inez")
	while model.state.stage == "fermenting": model.advance_to_next_milestone()
	model.start_action("package", "maelle"); model.advance_to_next_milestone()
	model.start_action("serve", "maelle"); model.advance_to_next_milestone()
	model.resolve_council("reinvest")
	instance._refresh(true)
	await create_timer(1.0).timeout
	for frame in range(6): await process_frame
	var image := root.get_texture().get_image()
	var output_dir := ProjectSettings.globalize_path("res://../outputs/renderings")
	DirAccess.make_dir_recursive_absolute(output_dir)
	var error := image.save_png(output_dir + "/old-stables-first-brew-outcome.png")
	if error == OK:
		print("Captured " + output_dir + "/old-stables-first-brew-outcome.png")
		quit(0)
	else:
		push_error("Capture failed: " + str(error))
		quit(1)
