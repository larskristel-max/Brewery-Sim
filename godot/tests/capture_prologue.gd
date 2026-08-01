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
	if OS.get_cmdline_user_args().has("--appointment-only"):
		if instance.ui.has("title_screen") and is_instance_valid(instance.ui.title_screen):
			instance.ui.title_screen.queue_free()
		await process_frame
		instance._show_customization()
		await _settle(0.5)
		await _save("appointment-ledger-check.png")
		print("Old Stables appointment review: CAPTURED to " + output_dir)
		quit(0)
		return
	instance._start_opening_story()
	var prologue_names := [
		"01-last-carriage-horse.png", "02-estate-ledger.png", "03-one-asset-remains.png",
		"04-old-brewery.png", "05-count-proposal.png", "06-apolline-warning.png",
		"07-why-summoned.png", "08-castle-brewmaster.png", "09-accounts.png", "10-appointment.png"
	]
	for index in range(prologue_names.size()):
		await _settle(2.8)
		await _save(prologue_names[index])
		if index + 1 < prologue_names.size(): instance.ui.prologue.advance()

	instance.ui.prologue.finish(true)
	await _settle(0.5)
	await _save("11-appointment-ledger.png")
	instance.begin_campaign_with("Éloïse", 0)
	await _settle(2.8)
	await _save("12-stable-doors-closed.png")
	instance.ui.awakening._open_doors()
	await _settle(1.2)

	var awakening_names := [
		"13-brewhouse.png", "14-jules.png", "15-maelle.png", "16-noor.png",
		"17-inez-supplies.png", "18-missing-hops.png", "19-work-begins.png", "20-copper-brewhouse.png"
	]
	for index in range(awakening_names.size()):
		await _settle(2.8)
		await _save(awakening_names[index])
		if index + 1 < awakening_names.size(): instance.ui.awakening.advance()

	instance.ui.awakening.finish(false)
	await _settle(0.5)
	await _save("21-gameplay-handoff.png")
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
