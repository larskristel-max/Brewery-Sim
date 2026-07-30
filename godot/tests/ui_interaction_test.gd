extends SceneTree

var failures: Array[String] = []

func _init() -> void:
	call_deferred("_run")

func _run() -> void:
	root.size = Vector2i(1280, 720)
	var scene: PackedScene = load("res://scenes/main.tscn")
	var instance = scene.instantiate()
	root.add_child(instance)
	await process_frame
	var begin := _find_button(instance.ui.customization, "Begin the first real brew")
	_expect(begin != null, "Customization start button was not rendered")
	if begin: begin.pressed.emit()
	await process_frame
	await process_frame
	_expect(instance.started, "Customization button did not start the campaign")
	_expect(instance.prologue_active, "Campaign did not begin with the story prologue")
	_expect(instance.speed == 0, "Estate clock ran underneath the prologue")
	var skip := _find_button(instance.ui.prologue, "SKIP")
	_expect(skip != null, "Prologue did not expose a skip control")
	if skip: skip.pressed.emit()
	await process_frame
	await process_frame
	_expect(instance.simulation.state.stage == "recommission", "Prologue handoff did not accept the stable key")
	_expect(instance.awaiting_first_light, "Prologue did not hand control to the first lamp")
	var first_light := instance.get_node_or_null("World/FirstLightHotspot") as Button
	_expect(first_light != null and first_light.visible, "First lamp did not expose an interactive hotspot")
	if first_light: first_light.pressed.emit()
	await create_timer(1.25).timeout
	await process_frame
	_expect(not instance.awaiting_first_light, "First lamp did not complete the interactive handoff")
	_expect(instance.speed == 1, "Estate clock did not begin after the lamp was lit")
	_expect(_fits_horizontally(instance.ui.command_header, instance.ui.clock_group), "Command-dock clock and save controls overflowed at 1280x720")
	_expect(instance.ui.command_dock.position.x >= 0.0 and instance.ui.command_dock.position.x + instance.ui.command_dock.size.x <= instance.size.x, "Command dock extended outside the responsive viewport")
	var brewhouse_hotspot := instance.get_node_or_null("World/BrewhouseHotspot") as Button
	_expect(brewhouse_hotspot != null, "Brewhouse did not expose a clickable world hotspot")
	if brewhouse_hotspot: brewhouse_hotspot.pressed.emit()
	await _settle()
	_expect(instance.selected_station == "brewhouse", "World hotspot did not focus the brewhouse")
	var clean := _find_button(instance.ui.actions, "Clean and recommission")
	_expect(clean != null, "Recommissioning command was not rendered")
	if clean: clean.pressed.emit()
	await process_frame
	_expect(instance.simulation.get_active_jobs().size() == 1, "Recommissioning button did not create a station job")
	_expect(instance.ui.stage.text.begins_with("IN PROGRESS · CLEAN AND RECOMMISSION"), "Active work order was not reflected in the stage label")
	var player_index := _staff_index(instance, "player")
	_expect(player_index >= 0 and instance.ui.staff_picker.is_item_disabled(player_index), "Assigned worker remained selectable for a second work order")
	var occupied_clean := _find_button(instance.ui.actions, "Clean and recommission")
	_expect(occupied_clean != null and occupied_clean.disabled, "Occupied station action was not visibly disabled")
	instance.ui.wait_button.pressed.emit()
	await process_frame
	await process_frame
	_expect(instance.simulation.state.stage == "ready_to_mash", "Milestone button did not complete the station job")
	var mash := _find_button(instance.ui.actions, "Mash in Lantern Blonde")
	_expect(mash != null, "Mash command was not rendered")
	if mash: mash.pressed.emit()
	await process_frame
	instance.ui.wait_button.pressed.emit()
	await process_frame
	await process_frame
	_expect(instance.simulation.state.pending_issue == "mash_drift", "Mash command did not trigger the first brewing problem")
	for clock_control in instance.ui.clock_buttons:
		if int(clock_control.speed) > 0:
			_expect(clock_control.button.disabled, "Running clock controls stayed enabled during a brewing judgment")
	var heat := _find_button(instance.ui.choices, "Cut heat and stir")
	_expect(heat != null, "Mash decision buttons were not rendered")
	if heat: heat.pressed.emit()
	await process_frame
	await process_frame
	_expect(instance.simulation.state.pending_issue == "missing_hops", "Mash decision button did not lead to the hop problem")
	var herbs := _find_button(instance.ui.choices, "Use garden herbs")
	_expect(herbs != null, "Hop decision buttons were not rendered")
	if herbs: herbs.pressed.emit()
	await process_frame
	_expect(instance.simulation.state.stage == "ready_to_boil", "Hop decision button did not advance production")

	if brewhouse_hotspot: brewhouse_hotspot.pressed.emit()
	await _settle()
	_expect(instance.selected_station == "brewhouse", "World hotspot did not focus the brewhouse")
	var boil := _find_button(instance.ui.actions, "Boil the wort")
	_expect(boil != null, "Focused brewhouse did not expose the boil command")
	if boil: boil.pressed.emit()
	await _settle()
	instance.ui.wait_button.pressed.emit()
	await _settle()
	_expect(instance.simulation.state.stage == "ready_to_transfer", "Boil did not advance to transfer preparation")

	var fermenter_hotspot := instance.get_node_or_null("World/FermenterHotspot") as Button
	_expect(fermenter_hotspot != null, "Fermenter did not expose a clickable world hotspot")
	if fermenter_hotspot: fermenter_hotspot.pressed.emit()
	await _settle()
	_expect(_select_staff(instance, "jules"), "Could not select Jules from the staff control")
	await _settle()
	var clean_fermenter := _find_button(instance.ui.actions, "Clean and purge fermenter")
	_expect(clean_fermenter != null, "Focused fermenter did not expose its cleaning command")
	if clean_fermenter: clean_fermenter.pressed.emit()
	await _settle()
	_expect(instance.simulation.state.stations.fermenter.busy, "Fermenter did not show immediate active-work feedback")
	instance.ui.wait_button.pressed.emit()
	await _settle()
	_expect(_select_staff(instance, "player"), "Could not return assignment control to the Brewmaster")
	await _settle()
	var transfer := _find_button(instance.ui.actions, "Transfer and pitch yeast")
	_expect(transfer != null, "Clean fermenter did not expose the transfer command")
	if transfer: transfer.pressed.emit()
	await _settle()
	instance.ui.wait_button.pressed.emit()
	await _settle()
	_expect(instance.simulation.state.stage == "fermenting", "Transfer did not begin fermentation")

	var courtyard_hotspot := instance.get_node_or_null("World/CourtyardHotspot") as Button
	if courtyard_hotspot: courtyard_hotspot.pressed.emit()
	await _settle()
	_expect(_select_staff(instance, "noor"), "Could not select Noor for courtyard preparation")
	await _settle()
	var courtyard := _find_button(instance.ui.actions, "Prepare the long table")
	_expect(courtyard != null, "Courtyard hotspot did not expose preparation")
	if courtyard: courtyard.pressed.emit()
	await _settle()
	var packaging_hotspot := instance.get_node_or_null("World/PackagingHotspot") as Button
	if packaging_hotspot: packaging_hotspot.pressed.emit()
	await _settle()
	_expect(_select_staff(instance, "inez"), "Could not select Inez for label preparation")
	await _settle()
	var labels := _find_button(instance.ui.actions, "Prepare keg collars")
	_expect(labels != null, "Packaging hotspot did not expose keg-collar preparation")
	if labels: labels.pressed.emit()
	await _settle()
	var fermentation_guard := 0
	while instance.simulation.state.stage == "fermenting" and fermentation_guard < 6:
		instance.ui.wait_button.pressed.emit()
		await _settle()
		fermentation_guard += 1
	_expect(instance.simulation.state.stage == "ready_to_package", "Milestone controls did not reach packaging")

	_expect(_select_staff(instance, "maelle"), "Could not select Maëlle for packaging")
	await _settle()
	var package := _find_button(instance.ui.actions, "Fill the first 20 L keg")
	_expect(package != null, "Packaging scene did not expose keg filling")
	if package: package.pressed.emit()
	await _settle()
	instance.ui.wait_button.pressed.emit()
	await _settle()
	_expect(instance.simulation.state.stage == "ready_to_serve", "Packaging did not prepare courtyard service")
	var serve := _find_button(instance.ui.actions, "Serve Night of First Lights")
	_expect(serve != null, "Courtyard scene did not expose service")
	if serve: serve.pressed.emit()
	await _settle()
	instance.ui.wait_button.pressed.emit()
	await _settle()
	_expect(instance.simulation.state.stage == "council", "Courtyard service did not reach the weekly council")
	var council_choice := _find_button(instance.ui.choices, "Restore stable lighting")
	_expect(council_choice != null, "Weekly council choices were not rendered")
	if council_choice: council_choice.pressed.emit()
	await _settle()
	_expect(instance.simulation.state.stage == "complete", "Council choice did not complete the vertical slice")
	_expect(int(instance.simulation.state.authority_rank) >= 2, "Successful UI route did not earn the first stewardship promotion")
	var next_week := _find_button(instance.ui.choices, "Close the account and begin Week 2")
	_expect(next_week != null, "Council outcome did not expose the next playable week")
	if next_week: next_week.pressed.emit()
	await _settle()
	_expect(instance.simulation.state.stage == "week_planning", "Next-week control did not open production planning")
	_expect(int(instance.simulation.state.week_number) == 2, "Next-week control did not advance the campaign week")
	_expect(instance.speed == 0, "Estate clock ran before the Week 2 commitment was selected")
	_expect(instance.ui.staff_picker.disabled, "Staff assignments remained active while the Week 2 plan was unresolved")
	for clock_control in instance.ui.clock_buttons:
		if int(clock_control.speed) > 0:
			_expect(clock_control.button.disabled, "Running clock controls stayed enabled during Week 2 planning")
	var festival := _find_button(instance.ui.choices, "Supply the Saint Brigid festival")
	var reserve := _find_button(instance.ui.choices, "Brew the Count's cellar reserve")
	_expect(festival != null and reserve != null, "Week 2 did not present both competing production commitments")
	if reserve: reserve.pressed.emit()
	await _settle()
	_expect(instance.simulation.state.stage == "ready_to_mash", "Choosing the cellar reserve did not schedule production")
	_expect(str(instance.simulation.state.batch.recipe) == "Stable Amber", "Cellar-reserve choice did not select Stable Amber")
	_expect(str(instance.simulation.state.promise.plan_id) == "count_reserve", "Week 2 plan identity was not preserved")
	_expect(instance.speed == 1, "Estate clock did not resume after the Week 2 commitment")
	_expect(not instance.ui.guidance_panel.visible, "Week 1 Lantern Blonde tutorial guidance leaked into Week 2")
	if brewhouse_hotspot: brewhouse_hotspot.pressed.emit()
	await _settle()
	_expect(_select_staff(instance, "player"), "Could not assign the Brewmaster to the Stable Amber mash")
	await _settle()
	var week_two_action := _find_button(instance.ui.actions, "Clean and sanitize the brewhouse")
	if week_two_action == null: week_two_action = _find_button(instance.ui.actions, "Mash in Stable Amber")
	_expect(week_two_action != null, "Stable Amber plan did not expose a playable brewhouse action")
	if week_two_action and week_two_action.text.begins_with("Clean and sanitize"):
		_expect(not week_two_action.disabled, "The required Week 2 brewhouse cleaning was not actionable")
		week_two_action.pressed.emit()
		await _settle()
		instance.ui.wait_button.pressed.emit()
		await _settle()
		week_two_action = _find_button(instance.ui.actions, "Mash in Stable Amber")
		_expect(week_two_action != null, "Cleaning the brewhouse did not expose the Stable Amber mash")
	if week_two_action:
		_expect(not week_two_action.disabled, "The Stable Amber mash command was disabled for an available brewer")
		week_two_action.pressed.emit()
		await _settle()
		instance.ui.wait_button.pressed.emit()
		await _settle()
	_expect(instance.simulation.state.pending_issue == "amber_lauter_stall", "Stable Amber did not trigger its contract-specific runoff problem")
	_expect(instance.ui.stage.text == "BREWING ALERT · AMBER RUNOFF", "Stable Amber incident did not receive a specific alert label")
	_expect(instance.ui.decision_title.text == "The amber runoff has stalled", "Stable Amber incident did not receive a specific decision title")
	_expect(instance.ui.decision_objective.text.contains("runoff"), "Stable Amber incident objective did not explain the stalled runoff")
	_expect(instance.ui.consequence.text.contains("STABLE AMBER") and instance.ui.consequence.text.contains("quality target 72"), "Stable Amber decision did not preview its recipe and contract stakes")
	var recirculate := _find_button(instance.ui.choices, "Rake and recirculate patiently")
	_expect(recirculate != null, "Stable Amber runoff responses were not rendered")
	var amber_quality := int(instance.simulation.state.batch.quality)
	var amber_confidence := int(instance.simulation.state.count_confidence)
	var amber_minute := int(instance.simulation.state.game_minute)
	if recirculate: recirculate.pressed.emit()
	await _settle()
	_expect(instance.simulation.state.pending_issue == "", "Stable Amber runoff response did not clear the production judgment")
	_expect(instance.simulation.state.stage == "ready_to_boil", "Stable Amber runoff response did not advance to boiling")
	_expect(int(instance.simulation.state.batch.quality) == amber_quality + 7, "Patient recirculation did not apply its quality consequence")
	_expect(int(instance.simulation.state.count_confidence) == amber_confidence + 2, "Patient recirculation did not apply its confidence consequence")
	_expect(int(instance.simulation.state.game_minute) == amber_minute + 60, "Patient recirculation did not apply its one-hour delay")
	_expect(instance.simulation.state.batch.flavor_tags.has("clear_runoff"), "Stable Amber runoff choice did not persist its flavor consequence")
	var exit_code := 0
	if failures.is_empty():
		print("Old Stables UI interaction test: PASS (complete route through promotion and Stable Amber production trouble)")
	else:
		for failure in failures: push_error(failure)
		exit_code = 1
	instance.cue_player.stop()
	instance.cue_player.stream = null
	await create_timer(0.25).timeout
	instance.queue_free()
	await process_frame
	await process_frame
	quit(exit_code)

func _find_button(root_node: Node, prefix: String) -> Button:
	for node in root_node.find_children("*", "Button", true, false):
		var button := node as Button
		if button.text.begins_with(prefix): return button
	return null

func _select_staff(instance: Node, staff_id: String) -> bool:
	var picker: OptionButton = instance.ui.staff_picker
	for index in range(picker.item_count):
		if str(picker.get_item_metadata(index)) == staff_id:
			picker.select(index)
			picker.item_selected.emit(index)
			return true
	return false

func _staff_index(instance: Node, staff_id: String) -> int:
	var picker: OptionButton = instance.ui.staff_picker
	for index in range(picker.item_count):
		if str(picker.get_item_metadata(index)) == staff_id: return index
	return -1

func _fits_horizontally(parent: Control, child: Control) -> bool:
	return child.position.x >= 0.0 and child.position.x + child.size.x <= parent.size.x + 0.5

func _settle() -> void:
	await process_frame
	await process_frame

func _expect(condition: bool, message: String) -> void:
	if not condition: failures.append(message)
