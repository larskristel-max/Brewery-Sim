extends SceneTree

func _init() -> void:
	call_deferred("_capture")

func _capture() -> void:
	var scene:PackedScene=load("res://scenes/main.tscn")
	var instance=scene.instantiate()
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
	for frame in range(4): await process_frame
	var image:=root.get_texture().get_image()
	var output_dir=ProjectSettings.globalize_path("res://../outputs/renderings")
	DirAccess.make_dir_recursive_absolute(output_dir)
	var error=image.save_png(output_dir+"/old-stables-gameplay.png")
	if error==OK:
		print("Captured "+output_dir+"/old-stables-gameplay.png")
		quit(0)
	else:
		push_error("Capture failed: "+str(error))
		quit(1)
