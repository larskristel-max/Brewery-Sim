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

	_expect(instance.portrait_layout, "Phone portrait did not activate the rotation gate")
	_expect(root.content_scale_size == Vector2i(540, 960), "Phone portrait did not select the readable rotation-gate scale")
	_expect(not instance.ui.rotation_gate.visible, "Portrait gate blocked the opening story before gameplay")
	_expect(instance.ui.rotation_gate.mouse_filter == Control.MOUSE_FILTER_STOP, "Portrait rotation gate did not block touches from reaching the game")
	_expect(_fits_in_viewport(instance, instance.ui.rotation_gate), "Portrait rotation gate overflowed the viewport")
	_expect(_fits_in_viewport(instance, instance.ui.title_card), "Opening title overflowed the portrait phone viewport")
	var opening := _find_button(instance.ui.title_screen, "BEGIN")
	_expect(opening != null, "Portrait phone opening title did not expose the story")
	if opening: opening.pressed.emit()
	await _settle()
	var advance := _find_named_button(instance.ui.prologue, "AdvancePrologue")
	_expect(advance != null, "Portrait prologue did not expose a tap-to-advance layer")
	_expect(_fits_in_viewport(instance, instance.ui.prologue.subtitle_panel), "Portrait prologue subtitles overflowed the viewport")
	var prologue_index := int(instance.ui.prologue.shot_index)
	instance.ui.prologue.shot_elapsed = 999.0
	await _settle()
	_expect(int(instance.ui.prologue.shot_index) == prologue_index, "Portrait prologue advanced without a tap")
	var skip := _find_button(instance.ui.prologue, "SKIP")
	if skip: skip.pressed.emit()
	await _settle()
	_expect(_fits_in_viewport(instance, instance.ui.customization_card), "Appointment form overflowed the portrait phone viewport")
	_expect(instance.ui.customization.find_children("*", "OptionButton", true, false).is_empty(), "Portrait appointment retained the coat selector")
	var begin := _find_button(instance.ui.customization, "ACCEPT THE KEY")
	_expect(begin != null, "Portrait appointment form did not expose the stable key")
	if begin: begin.pressed.emit()
	await _settle()
	var first_light := instance.get_node_or_null("World/FirstLightHotspot") as Button
	_expect(first_light != null and not first_light.visible, "Duplicate stable-door hotspot remained between appointment and cinematic")
	_expect(instance.awakening_active, "Appointment did not begin the awakening cinematic directly")
	_expect(not instance.ui.rotation_gate.visible, "Portrait gate covered the awakening cinematic")
	_expect(not instance.get_node("World").visible, "Gameplay world remained visible behind the awakening cinematic")
	var awakening_advance := _find_named_button(instance.ui.awakening, "AdvanceAwakening")
	_expect(awakening_advance != null, "Landscape awakening cinematic did not expose a tap-to-advance layer")
	_expect(_fits_in_viewport(instance, instance.ui.awakening.subtitle_panel), "Portrait awakening subtitles overflowed the viewport")
	var door_button := _find_named_button(instance.ui.awakening, "OpenStableDoors")
	_expect(door_button != null and _fits_in_viewport(instance, door_button), "Portrait stable-door interaction was not usable")
	var awakening_index := int(instance.ui.awakening.shot_index)
	instance.ui.awakening.shot_elapsed = 999.0
	await _settle()
	_expect(int(instance.ui.awakening.shot_index) == awakening_index, "Portrait awakening cinematic advanced without a tap")
	if door_button: door_button.pressed.emit()
	await create_timer(0.25).timeout
	await _settle()
	var awakening_skip := _find_button(instance.ui.awakening, "SKIP")
	if awakening_skip: awakening_skip.pressed.emit()
	await _settle()
	_expect(instance.ui.rotation_gate.visible, "Portrait phone did not require landscape when gameplay began")

	root.size = Vector2i(844, 390)
	await _settle()
	instance._apply_responsive_layout()
	await _settle()
	_expect(not instance.portrait_layout, "Phone rotation did not restore the landscape UI")
	_expect(instance.mobile_landscape_layout, "Landscape phone did not activate the compact contextual UI")
	_expect(root.content_scale_size == Vector2i(960, 540), "Phone landscape did not select the compact landscape content scale")
	_expect(not instance.ui.rotation_gate.visible, "Landscape phone kept the rotation gate visible")

	_expect(instance.get_node("World").visible, "Gameplay world did not return after the awakening cinematic")
	_expect(not instance.ui.mobile_command_stack.visible, "Obsolete portrait command stack remained active in landscape")
	_expect(not instance.ui.command_row.visible, "Landscape command strip did not start collapsed")
	_expect(_fits_in_viewport(instance, instance.ui.command_dock), "Collapsed landscape command strip overflowed the viewport: pos=%s size=%s viewport=%s" % [instance.ui.command_dock.position, instance.ui.command_dock.size, instance.size])
	_expect(instance.ui.command_dock.size.y <= 72.0, "Collapsed landscape command strip took too much vertical space")
	_expect(not instance.ui.guidance_panel.visible, "Persistent tutorial panel reduced the landscape play area")
	var clear_world_height: float = instance.ui.command_dock.position.y - (instance.ui.top_bar.position.y + instance.ui.top_bar.size.y)
	_expect(clear_world_height >= instance.size.y * 0.65, "Collapsed landscape HUD left too little tappable brewery space")

	var brewhouse := instance.get_node_or_null("World/BrewhouseHotspot") as Button
	_expect(brewhouse != null and brewhouse.visible, "Landscape brewery did not expose the brewhouse hotspot")
	if brewhouse: brewhouse.pressed.emit()
	await _settle()
	_expect(instance.selected_station == "brewhouse", "Landscape brewhouse tap did not open its context")
	_expect(instance.ui.command_row.visible, "Equipment selection did not expand the contextual command strip")
	_expect(instance.ui.staff_box.get_parent() == instance.ui.command_row, "Worker picker was not part of the landscape context")
	_expect(instance.ui.action_scroll.get_parent() == instance.ui.command_row, "Work orders were not part of the landscape context")
	_expect(instance.ui.command_dock.size.y <= 152.0, "Expanded landscape context obscured too much of the brewery")
	_expect(instance.ui.mobile_close.visible and instance.ui.mobile_close.custom_minimum_size.y >= 40.0, "Landscape context did not expose a usable close control")
	_expect(_find_button(instance.ui.actions, "Clean and recommission") != null, "Landscape context did not expose the selected equipment action")
	instance.ui.mobile_close.pressed.emit()
	await _settle()
	_expect(instance.selected_station.is_empty() and not instance.ui.command_row.visible, "Closing the landscape context did not restore the brewery view")
	for clock_control in instance.ui.clock_buttons:
		if clock_control.button.visible:
			_expect(clock_control.button.custom_minimum_size.y >= 40.0, "Visible landscape clock control was too small to tap")

	instance.ui.decision_panel.visible = true
	instance._apply_responsive_layout()
	await _settle()
	_expect(_fits_in_viewport(instance, instance.ui.decision_panel), "Landscape decision sheet overflowed the viewport")

	root.size = Vector2i(390, 844)
	await _settle()
	instance._apply_responsive_layout()
	await _settle()
	_expect(instance.ui.rotation_gate.visible, "Returning to portrait did not protect the game from blocked touches")

	var exit_code := 0
	if failures.is_empty():
		print("Old Stables responsive UI test: PASS (portrait rotation gate and compact landscape controls)")
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
