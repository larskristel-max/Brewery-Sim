extends SceneTree

func _init() -> void:
	call_deferred("_capture")

func _capture() -> void:
	var scene: PackedScene = load("res://scenes/main.tscn")
	var instance = scene.instantiate()
	root.add_child(instance)
	await process_frame
	instance.begin_campaign_with("Elise", 0)
	await process_frame
	if instance.ui.has("awakening") and is_instance_valid(instance.ui.awakening):
		instance.ui.awakening.finish(true)
	await create_timer(0.2).timeout
	var model: BrewSimulation = instance.simulation
	model.start_action("recommission", "jules")
	model.advance_to_next_milestone()
	model.start_action("mash", "player")
	model.advance_to_next_milestone()
	model.choose_issue("cut_heat_stir")
	instance._refresh(true)
	for frame in range(12): await process_frame
	var image := root.get_texture().get_image()
	var output_dir := ProjectSettings.globalize_path("res://../outputs/renderings")
	DirAccess.make_dir_recursive_absolute(output_dir)
	var error := image.save_png(output_dir + "/old-stables-brew-decision.png")
	if error == OK:
		print("Captured " + output_dir + "/old-stables-brew-decision.png")
		quit(0)
	else:
		push_error("Capture failed: " + str(error))
		quit(1)
