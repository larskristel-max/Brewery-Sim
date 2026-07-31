extends SceneTree

func _init() -> void:
	call_deferred("_capture")

func _capture() -> void:
	var viewport := SubViewport.new()
	viewport.size = Vector2i(2133, 900)
	viewport.render_target_update_mode = SubViewport.UPDATE_ALWAYS
	root.add_child(viewport)
	var scene: PackedScene = load("res://scenes/main.tscn")
	var instance = scene.instantiate()
	viewport.add_child(instance)
	await process_frame
	instance.begin_campaign_with("Elise", 0)
	await process_frame
	if instance.ui.has("awakening") and is_instance_valid(instance.ui.awakening):
		instance.ui.awakening.finish(true)
	await create_timer(0.2).timeout
	for frame in range(6): await process_frame
	var output_dir := ProjectSettings.globalize_path("res://../outputs/layout-check")
	DirAccess.make_dir_recursive_absolute(output_dir)
	var image := viewport.get_texture().get_image()
	var error := image.save_png(output_dir + "/ultrawide-21x9.png")
	print("Ultrawide capture · viewport " + str(viewport.size) + " · scene " + str(instance.size) + " · image " + str(image.get_size()))
	quit(0 if error == OK else 1)
