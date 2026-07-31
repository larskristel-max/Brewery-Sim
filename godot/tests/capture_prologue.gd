extends SceneTree

var output_dir := ""

func _init() -> void:
	call_deferred("_capture")

func _capture() -> void:
	output_dir = ProjectSettings.globalize_path("res://../outputs/prologue-review-final")
	DirAccess.make_dir_recursive_absolute(output_dir)
	var scene: PackedScene = load("res://scenes/main.tscn")
	var instance = scene.instantiate()
	root.add_child(instance)
	await _settle(0.2)
	instance._start_opening_story()
	await _settle(3.0)
	await _save("01-estate-arrival.png")

	instance.ui.prologue.advance()
	await _settle(3.0)
	await _save("02-apolline-inventory.png")

	instance.ui.prologue.advance()
	await _settle(3.0)
	await _save("03-count-appointment.png")

	instance.ui.prologue.advance()
	await _settle(3.0)
	await _save("04-apolline-cost.png")

	instance.ui.prologue.advance()
	await _settle(3.0)
	await _save("05-count-terms.png")

	instance.ui.prologue.advance()
	await _settle(3.0)
	await _save("06-stable-key.png")

	instance.ui.prologue.finish(true)
	await _settle(0.5)
	await _save("07-appointment-form.png")
	instance.begin_campaign_with("Elise", 0)
	await _settle(3.0)
	await _save("08-awakening-doors.png")

	instance.ui.awakening.advance()
	await _settle(3.0)
	await _save("09-awakening-fire.png")

	instance.ui.awakening.advance()
	await _settle(3.0)
	await _save("10-awakening-jules.png")

	instance.ui.awakening.advance()
	await _settle(3.0)
	await _save("11-awakening-maelle.png")

	instance.ui.awakening.advance()
	await _settle(3.0)
	await _save("12-awakening-first-work.png")

	instance.ui.awakening.advance()
	await _settle(3.0)
	await _save("13-awakening-inez.png")

	instance.ui.awakening.advance()
	await _settle(0.4)
	await _save("14-gameplay-handoff.png")
	print("Old Stables prologue review: CAPTURED to " + output_dir)
	quit(0)

func _settle(seconds: float) -> void:
	await create_timer(seconds).timeout
	for frame in range(4):
		await process_frame

func _save(filename: String) -> void:
	var image := root.get_texture().get_image()
	var error := image.save_png(output_dir + "/" + filename)
	if error != OK:
		push_error("Could not save prologue review frame: " + filename)
		quit(1)
