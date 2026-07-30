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
	root.size = Vector2i(1280, 720)
	await process_frame
	var opening := _find_button(instance.ui.title_screen, "Begin the story")
	_expect(opening != null, "Opening title did not expose the story")
	if opening: opening.pressed.emit()
	await process_frame
	await process_frame
	_expect(instance.prologue_active, "Opening title did not begin the story prologue")
	_expect(instance.speed == 0, "Estate clock ran underneath the prologue")
	var skip := _find_button(instance.ui.prologue, "SKIP")
	_expect(skip != null, "Prologue did not expose a skip control")
	if skip: skip.pressed.emit()
	await process_frame
	await process_frame
	_expect(instance.ui.has("customization") and is_instance_valid(instance.ui.customization), "Prologue did not hand off to the appointment")
	var begin := _find_button(instance.ui.customization, "Accept the stable key")
	_expect(begin != null, "Appointment did not expose the stable-key decision")
	if begin: begin.pressed.emit()
	await process_frame
	await process_frame
	_expect(instance.started, "Appointment did not start the campaign")
	_expect(instance.simulation.state.stage == "recommission", "Appointment did not accept the stable key")
	_expect(instance.awaiting_first_light, "Appointment did not hand control to the stable doors")
	var first_light := instance.get_node_or_null("World/FirstLightHotspot") as Button
	_expect(first_light != null and first_light.visible, "Stable doors did not expose an interactive hotspot")
	if first_light: first_light.pressed.emit()
	await create_timer(0.65).timeout
	await process_frame
	_expect(instance.awakening_active, "Opening the stable doors did not begin the awakening cinematic")
	_expect(instance.speed == 0, "Estate clock ran underneath the awakening cinematic")
	var awakening_skip := _find_button(instance.ui.awakening, "SKIP")
	_expect(awakening_skip != null, "Awakening cinematic did not expose a skip control")
	if awakening_skip: awakening_skip.pressed.emit()
	await process_frame
	await process_frame
	_expect(not instance.awaiting_first_light and not instance.awakening_active, "Awakening cinematic did not complete the first-light handoff")
	_expect(instance.speed == 1, "Estate clock did not begin after the awakening cinematic")
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
	await _verify_save_load(instance, "Week 2 planning")
	festival = _find_button(instance.ui.choices, "Supply the Saint Brigid festival")
	reserve = _find_button(instance.ui.choices, "Brew the Count's cellar reserve")
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
	await _verify_save_load(instance, "Stable Amber production trouble")
	recirculate = _find_button(instance.ui.choices, "Rake and recirculate patiently")
	var amber_quality := int(instance.simulation.state.batch.quality)
	var amber_confidence := int(instance.simulation.state.count_confidence)
	var amber_minute := int(instance.simulation.state.game_minute)
	instance.speed = 0
	if recirculate: recirculate.pressed.emit()
	_expect(int(instance.simulation.state.game_minute) == amber_minute + 60, "Patient recirculation did not apply its one-hour delay")
	await _settle()
	_expect(instance.simulation.state.pending_issue == "", "Stable Amber runoff response did not clear the production judgment")
	_expect(instance.simulation.state.stage == "ready_to_boil", "Stable Amber runoff response did not advance to boiling")
	_expect(int(instance.simulation.state.batch.quality) == amber_quality + 7, "Patient recirculation did not apply its quality consequence")
	_expect(int(instance.simulation.state.count_confidence) == amber_confidence + 2, "Patient recirculation did not apply its confidence consequence")
	_expect(instance.simulation.state.batch.flavor_tags.has("clear_runoff"), "Stable Amber runoff choice did not persist its flavor consequence")

	_expect(await _complete_station_action(instance, "World/BrewhouseHotspot", "Boil the wort", "player"), "Stable Amber boil could not be completed through the UI")
	_expect(instance.simulation.state.stage == "ready_to_transfer", "Stable Amber boil did not reach transfer preparation")
	if int(instance.simulation.state.stations.fermenter.cleanliness) < 75:
		_expect(await _complete_station_action(instance, "World/FermenterHotspot", "Clean and purge fermenter", "jules"), "Week 2 fermenter cleaning could not be completed")
	_expect(await _complete_station_action(instance, "World/FermenterHotspot", "Transfer and pitch yeast", "player"), "Stable Amber transfer could not be completed")
	_expect(instance.simulation.state.stage == "fermenting", "Stable Amber did not enter fermentation")
	await _verify_save_load(instance, "Week 2 fermentation")

	if not bool(instance.simulation.state.courtyard_prepared):
		_expect(await _complete_station_action(instance, "World/CourtyardHotspot", "Prepare the long table", "noor"), "Week 2 courtyard preparation could not be completed")
	if not bool(instance.simulation.state.labels_prepared):
		_expect(await _complete_station_action(instance, "World/PackagingHotspot", "Prepare keg collars", "inez"), "Week 2 packaging preparation could not be completed")
	if int(instance.simulation.state.stations.packaging.cleanliness) < 75 and instance.simulation.state.stage == "fermenting":
		_expect(await _complete_station_action(instance, "World/PackagingHotspot", "Clean and sanitize the filler", "inez"), "Week 2 filler cleaning could not be completed")
	var week_two_fermentation_guard := 0
	while instance.simulation.state.stage == "fermenting" and week_two_fermentation_guard < 8:
		instance.simulation.advance_to_next_milestone()
		instance._refresh(true)
		await _settle()
		week_two_fermentation_guard += 1
	_expect(instance.simulation.state.stage == "ready_to_package", "Stable Amber fermentation did not reach packaging")
	if int(instance.simulation.state.stations.packaging.cleanliness) < 75:
		_expect(await _complete_station_action(instance, "World/PackagingHotspot", "Clean and sanitize the filler", "inez"), "Week 2 filler was not recoverable before packaging")
	_expect(await _complete_station_action(instance, "World/PackagingHotspot", "Fill the first 20 L keg", "maelle"), "Stable Amber packaging could not be completed")
	_expect(instance.simulation.state.stage == "ready_to_serve", "Stable Amber packaging did not reach delivery")
	var recovery_seed: Dictionary = instance.simulation.state.duplicate(true)
	_expect(await _complete_station_action(instance, "World/CourtyardHotspot", "Serve Count's Cellar Reserve", "maelle"), "The Count's reserve could not be delivered")
	_expect(instance.simulation.state.stage == "council", "Successful reserve delivery did not reach the second council")
	_expect(str(instance.simulation.state.service_result.get("contract_outcome", "")) == "reserve_approved", "Reserve delivery did not record its contract-specific outcome")
	_expect(bool(instance.simulation.state.service_result.get("target_met", false)), "Successful reserve route missed its quality target")
	_expect(instance.ui.decision_title.text.contains("Week 2"), "The second council was still presented as the first council")
	await _verify_save_load(instance, "second weekly council")
	var second_council := _find_button(instance.ui.choices, "Fund the next courtyard night")
	_expect(second_council != null, "Second council choices were not rendered")
	if second_council: second_council.pressed.emit()
	await _settle()
	_expect(instance.simulation.state.stage == "complete", "Second council did not close Week 2")
	var capacity_week := _find_button(instance.ui.choices, "Close the account and begin Week 3")
	_expect(capacity_week != null, "Week 2 outcome did not expose the first capacity-planning week")
	if capacity_week: capacity_week.pressed.emit()
	await _settle()
	_expect(instance.simulation.state.stage == "capacity_planning", "Week 3 did not open the capacity board")
	_expect(instance.speed == 0, "Estate clock ran underneath capacity negotiation")
	_expect(instance.ui.decision_title.text == "Two opportunities, finite capacity", "Capacity conflict did not receive a player-facing title")
	_expect(instance.ui.consequence.text.contains("malt") and instance.ui.consequence.text.contains("kegs") and instance.ui.consequence.text.contains("staff hours"), "Capacity board did not expose its limiting resources")
	_expect(_fits_in_viewport(instance, instance.ui.decision_panel), "Capacity board overflowed the 1280x720 viewport")
	var abbey_accept := _find_capacity_response(instance.ui.choices, "ABBEY HARVEST TABLE", "Accept")
	_expect(abbey_accept != null and not abbey_accept.disabled, "Abbey opportunity did not expose an affordable accept response")
	if abbey_accept: abbey_accept.pressed.emit()
	await _settle()
	var answered_abbey_reject := _find_capacity_response(instance.ui.choices, "ABBEY HARVEST TABLE", "Reject")
	_expect(answered_abbey_reject != null and answered_abbey_reject.disabled, "Answered capacity opportunity remained actionable")
	var inn_accept := _find_capacity_response(instance.ui.choices, "THREE LANTERNS INN CELLAR", "Accept")
	var inn_renegotiate := _find_capacity_response(instance.ui.choices, "THREE LANTERNS INN CELLAR", "Renegotiate")
	_expect(inn_accept != null and inn_accept.disabled, "Capacity board did not block two infeasible full commitments")
	_expect(inn_renegotiate != null and not inn_renegotiate.disabled, "Capacity board did not offer the viable renegotiated commitment")
	if inn_renegotiate: inn_renegotiate.pressed.emit()
	await _settle()
	var lock_plan := _find_button(instance.ui.choices, "Lock the production plan")
	_expect(lock_plan != null, "Capacity board did not expose final plan commitment")
	if lock_plan: lock_plan.pressed.emit()
	await _settle()
	_expect(instance.simulation.state.stage == "operations", "Capacity plan did not open live multi-batch operations")
	_expect(instance.simulation.state.production_batches.size() == 2, "Capacity plan did not create two independent production batches")
	_expect(instance.ui.batch_rail_panel.visible and instance.ui.batch_rail.get_child_count() == 2, "Live production did not render two selectable batch cards")
	_expect(instance.ui.operations_forecast.text.contains("DEMAND") and instance.ui.operations_forecast.text.contains("CAPACITY"), "Production board did not expose demand and station capacity")
	_expect(instance.ui.inventory.visible and instance.ui.inventory.text.contains("yeast") and instance.ui.inventory.text.contains("kegs"), "Production board did not expose free ingredient and packaging stock")
	_expect(_fits_in_viewport(instance, instance.ui.command_dock), "Expanded production board overflowed the 1280x720 viewport: dock pos=%s size=%s viewport=%s" % [instance.ui.command_dock.position, instance.ui.command_dock.size, instance.size])
	await _verify_save_load(instance, "live multi-batch operations")
	_expect(_select_staff(instance, "player"), "Could not select the Brewmaster for live production")
	await _settle()
	var first_operations_action := _find_button_contains(instance.ui.actions, "LANTERN BLONDE")
	_expect(first_operations_action != null and not first_operations_action.disabled, "Selected first batch did not expose its next work order")
	if first_operations_action:
		_expect(first_operations_action.tooltip_text.contains("energy"), "Live work order did not forecast worker energy")
		first_operations_action.pressed.emit()
	await _settle()
	_expect(instance.simulation.get_active_jobs().size() == 1, "Live batch command did not reserve its worker and station")
	instance.ui.wait_button.pressed.emit()
	await _settle()
	var second_batch_card := _find_button_contains(instance.ui.batch_rail, "Three Lanterns")
	_expect(second_batch_card != null, "Second batch could not be selected from the persistent production board")
	if second_batch_card: second_batch_card.pressed.emit()
	await _settle()
	_expect(str(instance.simulation.state.active_batch_id) == str(instance.simulation.state.production_batches[1].id), "Second batch card did not change the active work context")
	var second_operations_action := _find_button_contains(instance.ui.actions, "STABLE AMBER")
	_expect(second_operations_action != null and second_operations_action.text.contains("Stage Stable Amber grain bill"), "Second batch did not expose its independent preparation work")

	for recovery_case in [
		{"reasons":["missed_quality"],"button":"Offer a contract discount","copy":"QUALITY"},
		{"reasons":["late_delivery"],"button":"Renegotiate the promise","copy":"DEADLINE MISSED"},
		{"reasons":["damaged_equipment"],"button":"Delay delivery and repair","copy":"EQUIPMENT DAMAGE"}
	]:
		instance.simulation.state = recovery_seed.duplicate(true)
		instance.simulation.state.stage = "delivery_recovery"
		instance.simulation.state.delivery_problem = {"reasons":recovery_case.reasons,"quality":60,"target":72,"late":recovery_case.reasons.has("late_delivery"),"equipment_damage":12}
		instance.simulation.state.delivery_recovery = {}
		instance.simulation._touch()
		instance.speed = 0
		instance._refresh(true)
		await _settle()
		_expect(instance.ui.stage.text == "DELIVERY ALERT · RECOVERY", "Recovery screen did not receive an alert stage")
		_expect(instance.ui.consequence.text.contains(recovery_case.copy), "Recovery screen did not explain %s" % recovery_case.copy)
		var recovery_button := _find_button(instance.ui.choices, recovery_case.button)
		_expect(recovery_button != null, "Recovery screen did not expose %s" % recovery_case.button)
		_expect(_fits_in_viewport(instance, instance.ui.decision_panel), "Recovery panel overflowed the 1280x720 viewport: pos=%s size=%s viewport=%s" % [instance.ui.decision_panel.position, instance.ui.decision_panel.size, instance.size])
		if recovery_case.button == "Offer a contract discount" and recovery_button != null:
			recovery_button.pressed.emit()
			await _settle()
			_expect(instance.simulation.state.stage == "council", "The real recovery control did not settle the delivery into council")
			_expect(str(instance.simulation.state.delivery_recovery.get("choice", "")) == "discount", "The recovery choice was not persisted in the delivery account")
	var exit_code := 0
	if failures.is_empty():
		print("Old Stables UI interaction test: PASS (First Fortnight, recovery, persistence, and capacity conflict)")
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

func _find_button_contains(root_node: Node, fragment: String) -> Button:
	for node in root_node.find_children("*", "Button", true, false):
		var button := node as Button
		if button.text.contains(fragment): return button
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

func _fits_in_viewport(instance: Control, child: Control) -> bool:
	return child.position.x >= 0.0 and child.position.y >= 0.0 and child.position.x + child.size.x <= instance.size.x + 0.5 and child.position.y + child.size.y <= instance.size.y + 0.5

func _ensure_staff_on_shift(instance: Node, staff_id: String) -> void:
	var member: Dictionary = instance.simulation.state.staff[staff_id]
	var minute_of_day := int(instance.simulation.state.game_minute) % 1440
	var shift_start := int(member.shift_start)
	var shift_end := int(member.shift_end)
	if minute_of_day < shift_start:
		instance.simulation.advance(shift_start - minute_of_day)
	elif minute_of_day > shift_end:
		instance.simulation.advance(1440 - minute_of_day + shift_start)
	instance._refresh(true)
	await _settle()

func _complete_station_action(instance: Node, hotspot_path: String, action_prefix: String, staff_id: String) -> bool:
	await _ensure_staff_on_shift(instance, staff_id)
	var hotspot := instance.get_node_or_null(hotspot_path) as Button
	if hotspot == null: return false
	hotspot.pressed.emit()
	await _settle()
	if not _select_staff(instance, staff_id): return false
	await _settle()
	var action := _find_button(instance.ui.actions, action_prefix)
	if action == null or action.disabled: return false
	action.pressed.emit()
	await _settle()
	if instance.simulation.get_active_jobs().is_empty(): return false
	instance.ui.wait_button.pressed.emit()
	await _settle()
	return true

func _verify_save_load(instance: Node, checkpoint: String) -> void:
	var prior_speed := int(instance.speed)
	instance.speed = 0
	var expected_stage := str(instance.simulation.state.stage)
	var expected_minute := int(instance.simulation.state.game_minute)
	var expected_cash := int(instance.simulation.state.cash)
	var expected_issue := str(instance.simulation.state.pending_issue)
	var expected_jobs: int = instance.simulation.state.jobs.size()
	instance.ui.save_button.pressed.emit()
	await _settle()
	instance.simulation.state.stage = "appointment"
	instance.simulation.state.game_minute = expected_minute + 333
	instance.simulation.state.cash = expected_cash + 777
	instance.simulation.state.pending_issue = ""
	instance.simulation.state.jobs = []
	instance.simulation._touch()
	instance.ui.load_button.pressed.emit()
	await _settle()
	_expect(str(instance.simulation.state.stage) == expected_stage, "%s save/load did not restore the stage" % checkpoint)
	_expect(int(instance.simulation.state.game_minute) == expected_minute, "%s save/load did not restore the estate clock" % checkpoint)
	_expect(int(instance.simulation.state.cash) == expected_cash, "%s save/load did not restore cash" % checkpoint)
	_expect(str(instance.simulation.state.pending_issue) == expected_issue, "%s save/load did not restore the pending judgment" % checkpoint)
	_expect(instance.simulation.state.jobs.size() == expected_jobs, "%s save/load did not restore work orders" % checkpoint)
	instance.speed = prior_speed

func _find_capacity_response(root_node: Node, opportunity_prefix: String, response_text: String) -> Button:
	for card in root_node.get_children():
		if not card is VBoxContainer: continue
		var identifies_opportunity := false
		for label in card.find_children("*", "Label", true, false):
			if str(label.text).begins_with(opportunity_prefix):
				identifies_opportunity = true
				break
		if not identifies_opportunity: continue
		for button in card.find_children("*", "Button", true, false):
			if str(button.text) == response_text: return button
	return null

func _settle() -> void:
	await process_frame
	await process_frame

func _expect(condition: bool, message: String) -> void:
	if not condition: failures.append(message)
