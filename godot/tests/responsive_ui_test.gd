extends SceneTree

var failures: Array[String] = []

func _init() -> void:
	call_deferred("_run")

func _run() -> void:
	root.size = Vector2i(390, 844)
	var scene: PackedScene = load("res://scenes/main.tscn")
	var instance = scene.instantiate()
	root.add_child(instance)
	await _settle()
	instance._apply_responsive_layout()
	await _settle()

	_expect(instance.portrait_layout, "Phone portrait did not activate the portrait UI")
	_expect(root.content_scale_size == Vector2i(540, 960), "Phone portrait did not select the readable mobile content scale")
	_expect(not instance.ui.customization_story.visible, "Desktop story card remained over the phone appointment form")
	_expect(_fits_in_viewport(instance, instance.ui.customization_card), "Appointment form overflowed the phone viewport")

	var begin := _find_button(instance.ui.customization, "Begin the first real brew")
	_expect(begin != null, "Phone appointment form did not expose its start control")
	if begin: begin.pressed.emit()
	await _settle()
	var advance := _find_named_button(instance.ui.prologue, "AdvancePrologue")
	_expect(advance != null, "Phone prologue did not expose a tap-to-advance layer")
	var skip := _find_button(instance.ui.prologue, "SKIP")
	if skip: skip.pressed.emit()
	await _settle()
	var first_light := instance.get_node_or_null("World/FirstLightHotspot") as Button
	if first_light: first_light.pressed.emit()
	await create_timer(1.25).timeout
	await _settle()

	_expect(instance.ui.mobile_command_stack.visible, "Phone portrait did not expose the stacked command controls")
	_expect(instance.ui.objective_box.get_parent() == instance.ui.mobile_command_stack, "Objective did not move into the phone command stack")
	_expect(instance.ui.staff_box.get_parent() == instance.ui.mobile_command_stack, "Worker assignment did not move into the phone command stack")
	_expect(instance.ui.action_scroll.get_parent() == instance.ui.mobile_command_stack, "Work orders did not move into the phone command stack")
	_expect(_fits_in_viewport(instance, instance.ui.command_dock), "Phone command dock overflowed the viewport")
	_expect(instance.ui.wait_button.custom_minimum_size.y >= 44.0, "Phone milestone control was smaller than a touch target")
	for clock_control in instance.ui.clock_buttons:
		if clock_control.button.visible:
			_expect(clock_control.button.custom_minimum_size.y >= 42.0, "Visible phone clock control was too small to tap")

	instance.ui.decision_panel.visible = true
	instance._apply_responsive_layout()
	await _settle()
	_expect(_fits_in_viewport(instance, instance.ui.decision_panel), "Phone decision sheet overflowed the viewport")

	root.size = Vector2i(844, 390)
	await _settle()
	instance._apply_responsive_layout()
	await _settle()
	_expect(not instance.portrait_layout, "Phone rotation did not restore the landscape UI")
	_expect(root.content_scale_size == Vector2i(960, 540), "Phone landscape did not select the compact landscape content scale")
	_expect(instance.ui.command_row.visible, "Landscape rotation did not restore the command row")
	_expect(instance.ui.objective_box.get_parent() == instance.ui.command_row, "Landscape rotation did not restore the objective")
	_expect(instance.ui.action_scroll.get_parent() == instance.ui.command_row, "Landscape rotation did not restore work orders")

	var exit_code := 0
	if failures.is_empty():
		print("Old Stables responsive UI test: PASS (phone portrait, touch controls, and landscape rotation)")
	else:
		for failure in failures: push_error(failure)
		exit_code = 1
	instance.cue_player.stop()
	instance.cue_player.stream = null
	instance.queue_free()
	await _settle()
	quit(exit_code)

func _find_button(root_node: Node, prefix: String) -> Button:
	for node in root_node.find_children("*", "Button", true, false):
		var button := node as Button
		if button.text.begins_with(prefix): return button
	return null

func _find_named_button(root_node: Node, node_name: String) -> Button:
	return root_node.find_child(node_name, true, false) as Button

func _fits_in_viewport(instance: Control, child: Control) -> bool:
	return child.position.x >= -0.5 and child.position.y >= -0.5 \
		and child.position.x + child.size.x <= instance.size.x + 0.5 \
		and child.position.y + child.size.y <= instance.size.y + 0.5

func _settle() -> void:
	await process_frame
	await process_frame

func _expect(condition: bool, message: String) -> void:
	if not condition: failures.append(message)
