extends SceneTree

func _init() -> void:
	call_deferred("_capture")

func _capture() -> void:
	var label := "layout"
	var focus := ""
	for argument in OS.get_cmdline_user_args():
		if argument.begins_with("--label="): label = argument.trim_prefix("--label=")
		if argument.begins_with("--focus="): focus = argument.trim_prefix("--focus=")
	var scene: PackedScene = load("res://scenes/main.tscn")
	var instance = scene.instantiate()
	root.add_child(instance)
	await process_frame
	instance._start_opening_story()
	instance.ui.prologue.finish(true)
	await process_frame
	instance.begin_campaign_with("Elise", 0)
	await process_frame
	if instance.ui.has("awakening") and is_instance_valid(instance.ui.awakening):
		instance.ui.awakening.finish(true)
	await create_timer(0.2).timeout
	for frame in range(4): await process_frame
	if not focus.is_empty():
		var hotspot := instance.get_node_or_null("World/%sHotspot" % focus.capitalize()) as Button
		if hotspot:
			hotspot.pressed.emit()
			for frame in range(4): await process_frame
	var output_dir := ProjectSettings.globalize_path("res://../outputs/layout-check")
	DirAccess.make_dir_recursive_absolute(output_dir)
	var image := root.get_texture().get_image()
	var path := output_dir + "/" + label + ".png"
	var error := image.save_png(path)
	print("Layout capture " + label + " · root " + str(root.size) + " · scene " + str(instance.size) + " · image " + str(image.get_size()))
	quit(0 if error == OK else 1)
