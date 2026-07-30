extends RefCounted

const BrewSimulationModel = preload("res://scripts/brew_simulation.gd")

func run() -> Array[String]:
	var failures: Array[String] = []
	var craft: BrewSimulation = _run_route("cut_heat_stir", "estate_herbs", "reinvest", failures)
	var economy: BrewSimulation = _run_route("accept_rich_body", "reduce_bitterness", "pay_creditor", failures)
	_expect(craft.state.stage == "complete", "Craft route did not complete", failures)
	_expect(economy.state.stage == "complete", "Economy route did not complete", failures)
	_expect(int(craft.state.service_result.quality) > int(economy.state.service_result.quality), "Brew decisions did not change final quality", failures)
	_expect(int(craft.state.service_result.revenue) > int(economy.state.service_result.revenue), "Brew decisions did not change revenue", failures)
	_expect(craft.state.batch.flavor_tags.has("wild_green"), "Estate herb choice did not create its sensory tag", failures)
	_expect(economy.state.batch.flavor_tags.has("soft_bitterness"), "Reduced bitterness choice did not create its sensory tag", failures)
	_expect(int(craft.state.authority_rank) == 2, "Strong route did not earn Keeper authority", failures)
	_expect(int(economy.state.authority_rank) == 1, "Compromised route should leave stewardship progression contested", failures)
	var restoration_before := int(craft.state.restoration)
	_expect(craft.fund_restoration("pump_reseal").ok, "Keeper could not fund a stable restoration project", failures)
	_expect(int(craft.state.restoration) > restoration_before and craft.state.restoration_projects.pump_reseal.complete, "Restoration project did not change the estate", failures)
	_test_save_round_trip(craft, failures)
	_test_repeatable_week(craft, failures)
	_test_competing_week_two_commitments(failures)
	_test_amber_lauter_responses(failures)
	_test_week_two_end_to_end(failures)
	_test_delivery_recovery_paths(failures)
	_test_stage_persistence(failures)
	_test_capacity_conflict(failures)
	_test_scenario_recipe_data(failures)
	_test_fail_forward(failures)
	_test_authority_ladder(failures)
	_test_terminal_business_risk(failures)
	return failures

func _run_route(mash_choice: String, hop_choice: String, council_choice: String, failures: Array[String]) -> BrewSimulation:
	var model: BrewSimulation = BrewSimulationModel.new()
	model.new_campaign("Elise", 0)
	_expect(model.is_staff_available("player"), "Brewmaster should be available at campaign start", failures)
	_expect(not model.is_staff_available("noor"), "Noor's schedule should keep her off shift at campaign start", failures)
	_expect(model.start_action("accept_key").ok, "Could not accept stable key", failures)
	_expect(model.start_action("recommission", "jules").ok, "Could not assign Jules to recommissioning", failures)
	_expect(not model.start_action("recommission", "player").ok, "Busy station accepted a second job", failures)
	model.advance_to_next_milestone()
	_expect(model.state.stage == "ready_to_mash", "Recommissioning did not unlock mashing", failures)
	var malt_before := float(model.state.inventory.malt.quantity)
	_expect(model.start_action("mash", "player").ok, "Could not start mash", failures)
	_expect(is_equal_approx(float(model.state.inventory.malt.quantity), malt_before - 4.2), "Mash did not consume its malt lot", failures)
	model.advance_to_next_milestone()
	_expect(model.state.pending_issue == "mash_drift", "Mash drift was not triggered", failures)
	var judgment_minute := int(model.state.game_minute)
	model.advance(60)
	_expect(int(model.state.game_minute) == judgment_minute, "Estate time advanced underneath an unresolved brewing judgment", failures)
	_expect(model.choose_issue(mash_choice).ok, "Mash response failed", failures)
	_expect(model.state.pending_issue == "missing_hops", "Missing hop issue was not triggered", failures)
	_expect(model.choose_issue(hop_choice).ok, "Hop response failed", failures)
	_expect(model.start_action("boil", "player").ok, "Could not start boil", failures)
	model.advance_to_next_milestone()
	_expect(not model.start_action("transfer", "player").ok, "Dirty fermenter accepted a transfer", failures)
	_expect(model.start_action("clean_fermenter", "jules").ok, "Could not assign Jules to fermenter cleaning", failures)
	model.advance_to_next_milestone()
	_expect(model.start_action("transfer", "player").ok, "Could not start transfer", failures)
	model.advance_to_next_milestone()
	_expect(model.state.stage == "fermenting", "Transfer did not start fermentation", failures)
	var minute_of_day := int(model.state.game_minute) % 1440
	if minute_of_day < 720: model.advance(720 - minute_of_day)
	_expect(model.start_action("prepare_courtyard", "noor").ok, "Could not assign Noor to the courtyard", failures)
	_expect(model.start_action("prepare_labels", "inez").ok, "Could not assign Inez to labels", failures)
	var wait_guard := 0
	while model.state.stage == "fermenting" and wait_guard < 8:
		model.advance_to_next_milestone()
		wait_guard += 1
	_expect(wait_guard < 8, "Fermentation milestone loop stalled with jobs: %s" % JSON.stringify(model.get_active_jobs()), failures)
	_expect(model.state.courtyard_prepared, "Courtyard task did not complete", failures)
	_expect(model.state.labels_prepared, "Label task did not complete", failures)
	_expect(model.start_action("package", "maelle").ok, "Could not assign Maëlle to packaging", failures)
	model.advance_to_next_milestone()
	_expect(is_equal_approx(float(model.state.batch.packaged_l), 20.0), "Packaging did not produce a 20 L keg", failures)
	_expect(model.start_action("serve", "maelle").ok, "Could not open the courtyard event", failures)
	model.advance_to_next_milestone()
	_expect(model.state.stage == "council", "Service did not lead to weekly council", failures)
	_expect(int(model.state.service_result.guests_served) == 40, "The 20 L keg did not serve the promised 40 guests", failures)
	_expect(model.resolve_council(council_choice).ok, "Council choice failed", failures)
	return model

func _test_save_round_trip(source: BrewSimulation, failures: Array[String]) -> void:
	var path := "user://old_stables_test_save.json"
	_expect(source.save_game(path).ok, "Could not write versioned campaign save", failures)
	var loaded: BrewSimulation = BrewSimulationModel.new()
	loaded.new_campaign("Other", 2)
	_expect(loaded.load_game(path).ok, "Could not load campaign save", failures)
	_expect(loaded.state.player.name == source.state.player.name, "Save did not preserve customized player", failures)
	_expect(loaded.state.issue_history == source.state.issue_history, "Save did not preserve brewing decisions", failures)
	_expect(int(loaded.state.council_result.score) == int(source.state.council_result.score), "Save did not preserve council score", failures)
	_expect(str(loaded.state.council_result.choice) == str(source.state.council_result.choice), "Save did not preserve council choice", failures)
	DirAccess.remove_absolute(ProjectSettings.globalize_path(path))

func _test_repeatable_week(model: BrewSimulation, failures: Array[String]) -> void:
	var first_batch_id := str(model.state.batch.id)
	var first_quality := int(model.state.service_result.quality)
	var malt_before := float(model.state.inventory.malt.quantity)
	var review_count_before := int(model.state.review_count)
	_expect(model.begin_next_week().ok, "A completed council could not open the next brewing week", failures)
	_expect(int(model.state.week_number) == 2, "The campaign did not advance to week two", failures)
	_expect(model.state.stage == "week_planning", "The next week did not open production planning", failures)
	_expect(model.state.week_history.size() == 1, "The completed week was not preserved in campaign history", failures)
	_expect(not model.begin_next_week().ok and model.state.week_history.size() == 1, "A production week could be skipped without another council", failures)
	_expect(str(model.state.week_history[0].batch.id) == first_batch_id, "Week history lost the completed batch", failures)
	_expect(int(model.state.week_history[0].service_result.quality) == first_quality, "Week history lost the service outcome", failures)
	_expect(str(model.state.batch.id) != first_batch_id and model.state.batch.status == "awaiting_plan", "The next week did not wait for a production commitment", failures)
	_expect(is_equal_approx(float(model.state.inventory.malt.quantity), malt_before), "Starting a week should not replenish or consume persistent inventory", failures)
	_expect(int(model.state.review_count) == review_count_before, "Starting a week reset campaign progression", failures)
	_expect(int(model.state.stations.brewhouse.cleanliness) < 70, "Brewday use did not leave sanitation debt for the next week", failures)
	_expect(model.get_available_actions().is_empty(), "Production actions appeared before a Week 2 commitment was selected", failures)
	_expect(model.get_week_plan_options().size() == 2, "Week 2 did not present two competing commitments", failures)
	var planning_minute := int(model.state.game_minute)
	model.advance(1440)
	_expect(int(model.state.game_minute) == planning_minute, "Estate time advanced before a Week 2 commitment was selected", failures)
	_expect(not model.choose_week_plan("unknown").ok, "An unknown Week 2 commitment was accepted", failures)
	_expect(model.choose_week_plan("festival_rush").ok, "The festival commitment could not be selected", failures)
	_expect(model.state.stage == "ready_to_mash" and model.state.batch.recipe == "Lantern Blonde", "The festival commitment did not schedule its recipe", failures)
	_expect(_has_action(model, "clean_brewhouse"), "Week two did not surface required brewhouse sanitation", failures)
	_expect(not model.start_action("mash", "player").ok, "A dirty brewhouse accepted the next mash", failures)
	_expect(model.start_action("clean_brewhouse", "player").ok, "The Brewmaster could not clear week-two sanitation debt", failures)
	model.advance_to_next_milestone()
	_expect(_has_action(model, "mash"), "Cleaning the brewhouse did not unlock the next mash", failures)
	model.state.stage = "ready_to_package"
	_expect(_has_action(model, "clean_packaging"), "Used packaging equipment did not require sanitation", failures)
	_expect(not model.start_action("package", "player").ok, "A dirty filler accepted another batch", failures)
	_expect(model.start_action("clean_packaging", "player").ok, "The filler could not be sanitized for another batch", failures)
	model.advance_to_next_milestone()
	_expect(_has_action(model, "package"), "Sanitizing the filler did not unlock packaging", failures)

func _test_competing_week_two_commitments(failures: Array[String]) -> void:
	var festival: BrewSimulation = BrewSimulationModel.new()
	festival.new_campaign()
	festival.state.stage = "complete"
	var festival_cash_before := int(festival.state.cash)
	_expect(festival.begin_next_week().ok, "Could not open festival planning test", failures)
	_expect(festival.choose_week_plan("festival_rush").ok, "Could not accept festival rush", failures)
	_expect(int(festival.state.cash) == festival_cash_before + 320, "Festival advance did not improve immediate cash", failures)
	_expect(int(festival.state.promise.deadline_minute) - int(festival.state.game_minute) == 8 * 24 * 60, "Festival rush did not impose its short deadline", failures)
	_expect(int(festival.state.promise.quality_target) == 62 and int(festival.state.promise.guests) == 50, "Festival commitment terms were not applied", failures)
	var festival_malt_before := float(festival.state.inventory.malt.quantity)
	festival.state.stations.brewhouse.cleanliness = 92
	_expect(festival.start_action("mash", "player").ok, "Festival recipe could not begin production", failures)
	_expect(is_equal_approx(float(festival.state.inventory.malt.quantity), festival_malt_before - 4.2), "Festival recipe did not consume its defined malt bill", failures)

	var reserve: BrewSimulation = BrewSimulationModel.new()
	reserve.new_campaign()
	reserve.state.stage = "complete"
	var reserve_cash_before := int(reserve.state.cash)
	_expect(reserve.begin_next_week().ok, "Could not open reserve planning test", failures)
	_expect(reserve.choose_week_plan("count_reserve").ok, "Could not accept Count reserve", failures)
	_expect(int(reserve.state.cash) == reserve_cash_before + 120, "Reserve advance did not apply its cash terms", failures)
	_expect(reserve.state.batch.recipe == "Stable Amber", "Reserve commitment did not unlock the second recipe", failures)
	_expect(int(reserve.state.promise.deadline_minute) - int(reserve.state.game_minute) == 10 * 24 * 60, "Reserve did not apply its longer deadline", failures)
	_expect(int(reserve.state.promise.quality_target) == 72 and int(reserve.state.promise.guests) == 32, "Reserve commitment terms were not applied", failures)
	reserve.state.stage = "ready_to_serve"
	reserve.state.courtyard_prepared = true
	_expect(str(reserve.get_available_actions()[0].label) == "Serve Count's Cellar Reserve", "Week 2 service action replayed the Week 1 event name", failures)
	reserve.state.stage = "ready_to_mash"
	var reserve_malt_before := float(reserve.state.inventory.malt.quantity)
	reserve.state.stations.brewhouse.cleanliness = 92
	_expect(reserve.start_action("mash", "player").ok, "Stable Amber could not begin production", failures)
	_expect(is_equal_approx(float(reserve.state.inventory.malt.quantity), reserve_malt_before - 5.4), "Stable Amber did not consume its larger malt bill", failures)
	reserve.advance_to_next_milestone()
	_expect(reserve.state.pending_issue == "amber_lauter_stall", "Stable Amber replayed Lantern Blonde's mash incident", failures)
	_expect(reserve.get_issue_options().size() == 3, "The amber lauter stall did not offer three responses", failures)

	festival.state.jobs = []
	festival.state.pending_issue = ""
	festival.state.batch.quality = 62
	festival.state.batch.packaged_l = 20.0
	festival.state.game_minute = int(festival.state.promise.deadline_minute) - 1
	var festival_settlement_cash := int(festival.state.cash)
	festival._resolve_service(true)
	_expect(festival.state.service_result.target_met and int(festival.state.cash) - festival_settlement_cash == 1230, "A successful festival commitment did not pay its promised settlement", failures)

	reserve.state.jobs = []
	reserve.state.pending_issue = ""
	reserve.state.batch.quality = 70
	reserve.state.batch.packaged_l = 20.0
	reserve.state.game_minute = int(reserve.state.promise.deadline_minute) - 1
	var reserve_confidence_before := int(reserve.state.count_confidence)
	reserve._resolve_service(true)
	_expect(not reserve.state.service_result.target_met and int(reserve.state.service_result.revenue) == 528, "Missing the reserve quality target did not reduce its settlement", failures)
	_expect(int(reserve.state.count_confidence) == reserve_confidence_before - 14, "Missing the Count's quality target did not damage confidence", failures)

func _test_amber_lauter_responses(failures: Array[String]) -> void:
	var patient := _reserve_at_lauter_issue(failures)
	var patient_quality := int(patient.state.batch.quality)
	var patient_confidence := int(patient.state.count_confidence)
	var patient_minute := int(patient.state.game_minute)
	_expect(not patient.choose_issue("cut_heat_stir").ok, "Stable Amber accepted a Lantern Blonde mash response", failures)
	_expect(patient.state.pending_issue == "amber_lauter_stall", "An invalid response cleared the amber lauter stall", failures)
	_expect(patient.choose_issue("rake_recirculate").ok, "Patient recirculation could not clear the lauter stall", failures)
	_expect(int(patient.state.batch.quality) == patient_quality + 7, "Patient recirculation did not earn its quality benefit", failures)
	_expect(int(patient.state.count_confidence) == patient_confidence + 2, "Patient recirculation did not reassure the Count", failures)
	_expect(int(patient.state.game_minute) == patient_minute + 60, "Patient recirculation did not consume one production hour", failures)
	_expect(patient.state.batch.flavor_tags.has("clear_runoff"), "Patient recirculation did not record its sensory consequence", failures)
	_expect(patient.state.stage == "ready_to_boil" and patient.state.pending_issue == "", "Patient recirculation did not return the reserve to production", failures)

	var thinned := _reserve_at_lauter_issue(failures)
	var thin_quality := int(thinned.state.batch.quality)
	var thin_volume := float(thinned.state.batch.volume_l)
	var thin_minute := int(thinned.state.game_minute)
	_expect(thinned.choose_issue("thin_mash").ok, "Hot liquor could not loosen the lauter bed", failures)
	_expect(int(thinned.state.batch.quality) == thin_quality + 1, "Hot liquor did not apply its quality tradeoff", failures)
	_expect(is_equal_approx(float(thinned.state.batch.volume_l), thin_volume + 2.0), "Hot liquor did not increase the reserve volume", failures)
	_expect(int(thinned.state.game_minute) == thin_minute + 15, "Hot liquor did not consume fifteen production minutes", failures)
	_expect(thinned.state.batch.flavor_tags.has("lighter_amber"), "Hot liquor did not record the lighter body", failures)

	var forced := _reserve_at_lauter_issue(failures)
	var forced_quality := int(forced.state.batch.quality)
	var forced_condition := int(forced.state.stations.brewhouse.condition)
	var forced_minute := int(forced.state.game_minute)
	_expect(forced.choose_issue("force_runoff").ok, "Forced runoff could not clear the lauter stall", failures)
	_expect(int(forced.state.batch.quality) == forced_quality - 6, "Forced runoff did not apply its astringency penalty", failures)
	_expect(int(forced.state.stations.brewhouse.condition) == forced_condition - 8, "Forced runoff did not damage the brewhouse", failures)
	_expect(int(forced.state.game_minute) == forced_minute, "Forced runoff unexpectedly delayed production", failures)
	_expect(forced.state.batch.flavor_tags.has("husky_tannin"), "Forced runoff did not record its tannin consequence", failures)

	for route in [patient, thinned, forced]:
		_expect(route.state.issue_history.size() == 1 and str(route.state.issue_history[0].issue) == "amber_lauter_stall", "Reserve trouble was not recorded in week history", failures)
		_expect(route.state.pending_issue == "" and route.state.stage == "ready_to_boil", "A valid reserve response did not clear the issue", failures)

func _reserve_at_lauter_issue(failures: Array[String]) -> BrewSimulation:
	var model: BrewSimulation = BrewSimulationModel.new()
	model.new_campaign()
	model.state.stage = "complete"
	_expect(model.begin_next_week().ok, "Could not open reserve response fixture", failures)
	_expect(model.choose_week_plan("count_reserve").ok, "Could not choose reserve response fixture", failures)
	model.state.stations.brewhouse.cleanliness = 92
	_expect(model.start_action("mash", "player").ok, "Could not start reserve response fixture mash", failures)
	model.advance_to_next_milestone()
	_expect(model.state.pending_issue == "amber_lauter_stall", "Reserve response fixture did not reach its unique problem", failures)
	return model

func _test_week_two_end_to_end(failures: Array[String]) -> void:
	var festival := _run_week_two_contract("festival_rush", failures)
	var reserve := _run_week_two_contract("count_reserve", failures)
	_expect(festival.state.stage == "complete" and reserve.state.stage == "complete", "Both Week 2 contracts must reach their second council", failures)
	_expect(int(festival.state.review_count) == 2 and int(reserve.state.review_count) == 2, "Week 2 council did not record the second review", failures)
	_expect(str(festival.state.service_result.contract_outcome) == "festival_saved", "Successful festival did not produce its distinct outcome", failures)
	_expect(str(reserve.state.service_result.contract_outcome) == "reserve_approved", "Successful reserve did not produce its distinct outcome", failures)
	_expect(int(festival.state.service_result.trust_delta) > int(reserve.state.service_result.trust_delta), "Festival and reserve consequences are not materially distinct", failures)
	_expect(int(reserve.state.service_result.confidence_delta) > int(festival.state.service_result.confidence_delta), "Reserve success should matter more to Count confidence", failures)
	_expect(festival.begin_next_week().ok and festival.state.stage == "capacity_planning", "The second council did not unlock Week 3 capacity planning", failures)
	_expect(festival.state.week_history.size() == 2, "Beginning Week 3 did not preserve both completed weeks", failures)
	_expect(str(festival.state.week_history[1].service_result.contract_outcome) == "festival_saved", "Week history lost the contract-specific Week 2 outcome", failures)

func _run_week_two_contract(plan_id: String, failures: Array[String]) -> BrewSimulation:
	var model: BrewSimulation = BrewSimulationModel.new()
	model.new_campaign()
	model.state.stage = "complete"
	model.state.review_count = 1
	return _continue_week_two_contract(model, plan_id, failures)

func _continue_week_two_contract(model: BrewSimulation, plan_id: String, failures: Array[String]) -> BrewSimulation:
	_expect(model.begin_next_week().ok, "Could not open Week 2 for %s" % plan_id, failures)
	_expect(model.choose_week_plan(plan_id).ok, "Could not choose Week 2 plan %s" % plan_id, failures)
	model.state.stations.brewhouse.cleanliness = 92
	_ensure_on_shift(model, "player")
	_expect(model.start_action("mash", "player").ok, "Could not mash Week 2 plan %s" % plan_id, failures)
	model.advance_to_next_milestone()
	if plan_id == "festival_rush":
		_expect(model.choose_issue("cut_heat_stir").ok, "Festival mash recovery failed", failures)
		_expect(model.choose_issue("estate_herbs").ok, "Festival ingredient recovery failed", failures)
	else:
		_expect(model.choose_issue("rake_recirculate").ok, "Reserve runoff recovery failed", failures)
	_ensure_on_shift(model, "player")
	_expect(model.start_action("boil", "player").ok, "Could not boil Week 2 plan %s" % plan_id, failures)
	model.advance_to_next_milestone()
	model.state.stations.fermenter.cleanliness = 93
	_ensure_on_shift(model, "player")
	_expect(model.start_action("transfer", "player").ok, "Could not transfer Week 2 plan %s" % plan_id, failures)
	model.advance_to_next_milestone()
	_expect(model.state.stage == "fermenting", "Week 2 transfer did not begin fermentation", failures)
	while model.state.stage == "fermenting":
		model.advance_to_next_milestone()
	model.state.stations.packaging.cleanliness = 92
	_ensure_on_shift(model, "maelle")
	_expect(model.start_action("package", "maelle").ok, "Could not package Week 2 plan %s" % plan_id, failures)
	model.advance_to_next_milestone()
	model.state.courtyard_prepared = true
	_ensure_on_shift(model, "maelle")
	_expect(model.start_action("serve", "maelle").ok, "Could not deliver Week 2 plan %s" % plan_id, failures)
	model.advance_to_next_milestone()
	_expect(model.state.stage == "council", "Successful Week 2 plan %s unexpectedly required recovery" % plan_id, failures)
	_expect(model.resolve_council("pay_creditor").ok, "Could not resolve second council for %s" % plan_id, failures)
	return model

func _test_delivery_recovery_paths(failures: Array[String]) -> void:
	var missed := _delivery_fixture(["missed_quality"])
	missed.state.batch.quality = int(missed.state.promise.quality_target) - 5
	missed._resolve_service()
	_expect(missed.state.stage == "delivery_recovery" and missed.state.delivery_problem.reasons.has("missed_quality"), "Missing quality did not open delivery recovery", failures)
	_expect(_has_option(missed.get_delivery_recovery_options(), "discount"), "Missing quality did not offer a discount", failures)
	_expect(missed.choose_delivery_recovery("discount").ok, "Contract discount could not settle missed quality", failures)
	_expect(missed.state.stage == "council" and str(missed.state.service_result.recovery.choice) == "discount", "Discount recovery was not preserved in the service result", failures)
	_expect(missed.resolve_council("pay_creditor").ok and missed.begin_next_week().ok, "Recovered delivery could not advance into capacity planning", failures)
	_expect(str(missed.state.week_history[-1].delivery_recovery.choice) == "discount", "Recovery consequence did not persist into the following planning week", failures)

	var late := _delivery_fixture(["late_delivery"])
	late.state.batch.quality = int(late.state.promise.quality_target) + 5
	late.state.game_minute = int(late.state.promise.deadline_minute) + 60
	late._resolve_service()
	_expect(late.state.delivery_problem.reasons.has("late_delivery"), "Late delivery did not open recovery", failures)
	_expect(_has_option(late.get_delivery_recovery_options(), "renegotiate"), "Late delivery did not offer renegotiation", failures)
	_expect(late.choose_delivery_recovery("renegotiate").ok, "Late delivery could not be renegotiated", failures)
	_expect(str(late.state.service_result.recovery.choice) == "renegotiate", "Renegotiation was not recorded", failures)

	var damaged := _delivery_fixture(["damaged_equipment"])
	damaged.state.batch.quality = int(damaged.state.promise.quality_target) + 5
	damaged.state.stations.brewhouse.condition = 50
	var condition_before := int(damaged.state.stations.brewhouse.condition)
	damaged._resolve_service()
	_expect(damaged.state.delivery_problem.reasons.has("damaged_equipment"), "Equipment damage did not open recovery", failures)
	_expect(_has_option(damaged.get_delivery_recovery_options(), "delay_repair"), "Equipment damage did not offer delay and repair", failures)
	_expect(damaged.choose_delivery_recovery("delay_repair").ok, "Damaged equipment could not be repaired before delivery", failures)
	_expect(int(damaged.state.stations.brewhouse.condition) > condition_before, "Delay and repair did not restore equipment condition", failures)

	var absorbed := _delivery_fixture([])
	absorbed.state.batch.quality = int(absorbed.state.promise.quality_target) - 8
	var cash_before := int(absorbed.state.cash)
	absorbed._resolve_service()
	_expect(absorbed.choose_delivery_recovery("absorb_loss").ok, "The estate could not absorb a strained delivery", failures)
	_expect(int(absorbed.state.cash) <= cash_before - 300 + int(absorbed.state.service_result.revenue), "Absorbing loss did not charge the estate", failures)

func _delivery_fixture(_reasons: Array) -> BrewSimulation:
	var model: BrewSimulation = BrewSimulationModel.new()
	model.new_campaign()
	model.state.week_number = 2
	model.state.active_week_plan = "count_reserve"
	model.state.promise = {
		"plan_id":"count_reserve",
		"name":"Count's Cellar Reserve",
		"guests":32,
		"deadline_minute":int(model.state.game_minute) + 1440,
		"quality_target":72,
		"status":"accepted"
	}
	model.state.batch = {
		"id":"BATCH-RECOVERY",
		"recipe":"Stable Amber",
		"volume_l":20.0,
		"quality":72,
		"safety":75,
		"flavor_tags":["amber"],
		"packaged_l":20.0,
		"status":"packaged"
	}
	model.state.stage = "ready_to_serve"
	return model

func _test_stage_persistence(failures: Array[String]) -> void:
	var planning: BrewSimulation = BrewSimulationModel.new()
	planning.new_campaign()
	planning.state.stage = "complete"
	planning.begin_next_week()
	_assert_stage_save(planning, "week_planning", "planning", failures)

	var incident := _reserve_at_lauter_issue(failures)
	_assert_stage_save(incident, "ready_to_mash", "incident", failures)

	var fermenting: BrewSimulation = BrewSimulationModel.new()
	fermenting.new_campaign()
	fermenting.state.stage = "fermenting"
	fermenting.state.jobs = [{"id":"JOB-FERMENT","action":"fermentation","label":"Fermentation","station":"fermentation_clock","staff_id":"system","started":430,"ends":10480,"status":"active"}]
	fermenting.state.stations.fermenter.busy = true
	_assert_stage_save(fermenting, "fermenting", "fermentation", failures)

	var council: BrewSimulation = BrewSimulationModel.new()
	council.new_campaign()
	council.state.stage = "council"
	council.state.service_result = {"contract_outcome":"festival_saved","recovery":{}}
	_assert_stage_save(council, "council", "council", failures)

func _assert_stage_save(source: BrewSimulation, expected_stage: String, suffix: String, failures: Array[String]) -> void:
	var path := "user://old_stables_%s_save.json" % suffix
	_expect(source.save_game(path).ok, "Could not save %s state" % suffix, failures)
	var loaded: BrewSimulation = BrewSimulationModel.new()
	loaded.new_campaign()
	_expect(loaded.load_game(path).ok, "Could not load %s state" % suffix, failures)
	_expect(str(loaded.state.stage) == expected_stage, "Save/load did not preserve %s stage" % suffix, failures)
	_expect(loaded.state.pending_issue == source.state.pending_issue, "Save/load did not preserve %s issue state" % suffix, failures)
	_expect(loaded.state.jobs.size() == source.state.jobs.size(), "Save/load did not preserve %s job count" % suffix, failures)
	if not source.state.jobs.is_empty():
		_expect(str(loaded.state.jobs[0].action) == str(source.state.jobs[0].action) and str(loaded.state.jobs[0].status) == str(source.state.jobs[0].status), "Save/load did not preserve %s active work" % suffix, failures)
	DirAccess.remove_absolute(ProjectSettings.globalize_path(path))

func _test_capacity_conflict(failures: Array[String]) -> void:
	var overcommitted := _capacity_fixture(failures)
	_expect(int(overcommitted.state.capacity_board.partner_returnable_kegs) == 1 and int(overcommitted.state.capacity_board.constraints.kegs) == 3, "Capacity partners did not supply the legitimate returnable keg", failures)
	_expect(overcommitted.get_capacity_opportunities().size() == 2, "Capacity board did not show both simultaneous opportunities", failures)
	var planning_minute := int(overcommitted.state.game_minute)
	overcommitted.advance(60)
	_expect(int(overcommitted.state.game_minute) == planning_minute, "Time advanced under unresolved capacity planning", failures)
	_expect(overcommitted.respond_to_capacity_opportunity("abbey_table", "accept").ok, "Could not accept abbey opportunity", failures)
	_expect(not overcommitted.respond_to_capacity_opportunity("inn_cellar", "accept").ok, "Capacity board accepted two full contracts beyond the staff-hour limit", failures)
	_expect(overcommitted.respond_to_capacity_opportunity("inn_cellar", "renegotiate").ok, "Could not renegotiate the second opportunity into capacity", failures)
	_expect(str(overcommitted.state.capacity_board.responses.inn_cellar) == "renegotiated", "Renegotiated opportunity did not record its status", failures)
	var malt_before := float(overcommitted.state.inventory.malt.quantity)
	var hops_before := float(overcommitted.state.inventory.citrus_hops.quantity)
	var yeast_before := float(overcommitted.state.inventory.yeast.quantity)
	var kegs_before := float(overcommitted.state.inventory.empty_keg.quantity)
	_expect(overcommitted.finalize_capacity_plan().ok, "A feasible accepted + renegotiated plan could not be finalized", failures)
	_expect(overcommitted.state.stage == "operations" and overcommitted.state.production_batches.size() == 2, "Capacity finalization did not create two independent live batches", failures)
	_expect(bool(overcommitted.state.capacity_board.pressure.fermenter_overlap), "Two live commitments did not flag fermenter overlap", failures)
	_expect(int(overcommitted.state.capacity_board.pressure.staff_hours_reserved) == 13, "Capacity board did not reserve constrained staff hours", failures)
	_expect(is_equal_approx(float(overcommitted.state.inventory.malt.quantity), malt_before - 7.2), "Locking the plan did not reserve both malt bills", failures)
	_expect(is_equal_approx(float(overcommitted.state.inventory.citrus_hops.quantity), hops_before - 0.058), "Locking the plan did not reserve both hop bills", failures)
	_expect(is_equal_approx(float(overcommitted.state.inventory.yeast.quantity), yeast_before - 2.0) and is_equal_approx(float(overcommitted.state.inventory.empty_keg.quantity), kegs_before - 2.0), "Locking the plan did not reserve yeast and kegs", failures)
	var first_action: Dictionary = overcommitted.get_available_actions()[0]
	var fresh_duration := overcommitted.estimate_action_duration(first_action, "player")
	overcommitted.state.staff.player.energy = 40
	_expect(overcommitted.estimate_action_duration(first_action, "player") > fresh_duration, "Worker fatigue did not forecast a longer operations work order", failures)
	overcommitted.state.staff.player.energy = 100
	var original_deadline := int(overcommitted.state.production_batches[0].deadline_minute)
	overcommitted.state.production_batches[0].deadline_minute = int(overcommitted.state.game_minute) + 30
	_expect(str(overcommitted.get_operations_overview().batches[0].risk) == "AT RISK", "A deadline shorter than remaining production was not forecast as at risk", failures)
	overcommitted.state.production_batches[0].deadline_minute = original_deadline
	_expect(overcommitted.select_operations_batch(str(overcommitted.state.production_batches[0].id)).ok, "Could not select the first production batch", failures)
	_expect(_start_operations_step(overcommitted, "player", failures), "Could not start the first live batch work order", failures)
	overcommitted.advance_to_next_milestone()
	while str(overcommitted.state.production_batches[0].stage) != "fermenting":
		_expect(_start_operations_step(overcommitted, "player", failures), "Could not progress the first batch into fermentation", failures)
		overcommitted.advance_to_next_milestone()
	var first_fermentation_end := int(overcommitted.get_active_jobs()[0].ends)
	_expect(not overcommitted.advance_to_next_milestone().ok, "Next milestone skipped an actionable second batch instead of requiring a scheduling choice", failures)
	_expect(int(overcommitted.state.game_minute) < first_fermentation_end, "The milestone guard advanced through fermenter time despite parallel work", failures)
	_expect(overcommitted.select_operations_batch(str(overcommitted.state.production_batches[1].id)).ok, "Could not select the second production batch", failures)
	_expect(_start_operations_step(overcommitted, "jules", failures), "Could not stage the second grain bill during first-batch fermentation", failures)
	_expect(overcommitted.get_active_jobs().size() == 2, "Second-batch preparation did not overlap active fermentation", failures)
	_assert_stage_save(overcommitted, "operations", "operations", failures)
	var max_parallel := _finish_operations_plan(overcommitted, failures)
	_expect(max_parallel >= 2, "Accepted + renegotiated schedule never used parallel people or stations", failures)
	_expect(overcommitted.state.stage == "operations_council" and overcommitted.state.operations_results.size() == 2, "Dual-batch schedule did not reach a two-result production council", failures)
	_expect(str(overcommitted.state.operations_results[0].status) == "fulfilled" and str(overcommitted.state.operations_results[1].status) == "fulfilled", "The accepted + renegotiated plan was not a genuinely viable two-contract schedule", failures)
	_expect(int(overcommitted.state.demand.community) != 50 and int(overcommitted.state.demand.premium) != 45, "Independent contract results did not change both demand segments", failures)
	_expect(overcommitted.resolve_operations_council("pay_creditor").ok and overcommitted.state.stage == "complete", "Multi-batch council could not close the week", failures)

	var abbey_only := _capacity_fixture(failures)
	_expect(abbey_only.respond_to_capacity_opportunity("abbey_table", "accept").ok and abbey_only.respond_to_capacity_opportunity("inn_cellar", "reject").ok and abbey_only.finalize_capacity_plan().ok, "Abbey-only viable schedule could not be committed", failures)
	_finish_operations_plan(abbey_only, failures)
	_expect(abbey_only.state.operations_results.size() == 1 and str(abbey_only.state.operations_results[0].commitment_id) == "abbey_table" and str(abbey_only.state.operations_results[0].status) == "fulfilled", "Abbey-only viable schedule did not fulfill its contract", failures)

	var inn_only := _capacity_fixture(failures)
	_expect(inn_only.respond_to_capacity_opportunity("abbey_table", "reject").ok and inn_only.respond_to_capacity_opportunity("inn_cellar", "accept").ok and inn_only.finalize_capacity_plan().ok, "Inn-only viable schedule could not be committed", failures)
	_finish_operations_plan(inn_only, failures)
	_expect(inn_only.state.operations_results.size() == 1 and str(inn_only.state.operations_results[0].commitment_id) == "inn_cellar" and str(inn_only.state.operations_results[0].status) == "fulfilled", "Inn-only viable schedule did not fulfill its contract", failures)

	var worn := _capacity_fixture(failures)
	worn.respond_to_capacity_opportunity("abbey_table", "accept")
	worn.respond_to_capacity_opportunity("inn_cellar", "reject")
	worn.finalize_capacity_plan()
	worn.state.stations.brewhouse.cleanliness = 92
	worn.state.stations.brewhouse.condition = 30
	var worn_mash := "ops::%s::mash" % str(worn.state.active_batch_id)
	_expect(not worn.start_action(worn_mash, "player").ok, "An unsafe worn brewhouse accepted new production", failures)
	var repair_action := ""
	for action in worn.get_available_actions():
		if str(action.get("base_action", "")) == "repair_brewhouse": repair_action = str(action.id)
	var worn_condition := int(worn.state.stations.brewhouse.condition)
	_expect(not repair_action.is_empty() and worn.start_action(repair_action, "jules").ok, "Unsafe equipment did not expose a repair work order", failures)
	worn.advance_to_next_milestone()
	_expect(int(worn.state.stations.brewhouse.condition) > worn_condition, "Repair work did not restore station condition", failures)

	var rejected := _capacity_fixture(failures)
	_expect(rejected.respond_to_capacity_opportunity("abbey_table", "reject").ok, "Could not reject first opportunity", failures)
	_expect(rejected.respond_to_capacity_opportunity("inn_cellar", "reject").ok, "Could not reject second opportunity", failures)
	_expect(not rejected.finalize_capacity_plan().ok, "Rejecting all work incorrectly began production", failures)

func _capacity_fixture(failures: Array[String]) -> BrewSimulation:
	var model: BrewSimulation = BrewSimulationModel.new()
	model.new_campaign()
	model.state.week_number = 2
	model.state.stage = "complete"
	_expect(model.begin_next_week().ok and model.state.stage == "capacity_planning", "Week 3 did not open the capacity board", failures)
	return model

func _start_operations_step(model: BrewSimulation, preferred_staff: String, failures: Array[String]) -> bool:
	var actions := model.get_available_actions()
	var selected_action: Dictionary = {}
	for action in actions:
		if str(action.get("batch_id", "")) != str(model.state.active_batch_id): continue
		if not str(action.get("base_action", "")).begins_with("repair_"):
			selected_action = action
			break
	if selected_action.is_empty():
		for action in actions:
			if str(action.get("batch_id", "")) == str(model.state.active_batch_id):
				selected_action = action
				break
	if selected_action.is_empty(): return false
	if bool(model.state.stations[str(selected_action.station)].busy): return false
	var worker := _operations_worker(model, selected_action, preferred_staff)
	if worker.is_empty():
		model.advance(60)
		worker = _operations_worker(model, selected_action, preferred_staff)
	if worker.is_empty(): return false
	var result := model.start_action(str(selected_action.id), worker)
	_expect(bool(result.ok), "Operations work order failed: %s" % str(result.message), failures)
	return bool(result.ok)

func _operations_worker(model: BrewSimulation, action: Dictionary, preferred_staff: String) -> String:
	var candidates := [preferred_staff, "player", "jules", "maelle", "inez", "noor"]
	var skill := str(action.get("skill", ""))
	for staff_id in candidates:
		if not model.state.staff.has(staff_id): continue
		if model.is_staff_available(staff_id) and int(model.state.staff[staff_id].skills.get(skill, 0)) > 0:
			return staff_id
	return ""

func _finish_operations_plan(model: BrewSimulation, failures: Array[String]) -> int:
	var guard := 0
	var max_parallel := model.get_active_jobs().size()
	while bool(model.state.get("operations_active", false)) and guard < 240:
		var started := false
		var batch_ids := []
		for batch in model.state.production_batches: batch_ids.append(str(batch.id))
		for batch_id in batch_ids:
			var batch_index := -1
			for index in range(model.state.production_batches.size()):
				if str(model.state.production_batches[index].id) == batch_id: batch_index = index
			if batch_index < 0: continue
			var stage := str(model.state.production_batches[batch_index].stage)
			if stage in ["settled", "fermenting"] or _batch_has_active_job(model, batch_id): continue
			model.select_operations_batch(batch_id)
			if _start_operations_step(model, "player", failures): started = true
		max_parallel = maxi(max_parallel, model.get_active_jobs().size())
		if not started:
			var result := model.advance_to_next_milestone()
			if not bool(result.ok): model.advance(60)
		guard += 1
	_expect(guard < 240, "Operations schedule stalled: %s" % JSON.stringify(model.get_operations_overview()), failures)
	return max_parallel

func _batch_has_active_job(model: BrewSimulation, batch_id: String) -> bool:
	for job in model.get_active_jobs():
		if str(job.get("batch_id", "")) == batch_id: return true
	return false

func _ensure_on_shift(model: BrewSimulation, staff_id: String) -> void:
	if model.is_staff_available(staff_id): return
	var member: Dictionary = model.state.staff[staff_id]
	var minute_of_day := int(model.state.game_minute) % 1440
	var delta := int(member.shift_start) - minute_of_day
	if delta <= 0: delta += 1440
	model.advance(delta)

func _has_option(options: Array, option_id: String) -> bool:
	for option in options:
		if str(option.id) == option_id: return true
	return false

func _test_scenario_recipe_data(failures: Array[String]) -> void:
	var parsed = JSON.parse_string(FileAccess.get_file_as_string("res://data/scenario/recipes.json"))
	_expect(parsed != null and parsed.has("recipes"), "Authored recipe data is missing or invalid", failures)
	if parsed == null or not parsed.has("recipes"): return
	var recipe_names: Array[String] = []
	for recipe in parsed.recipes:
		recipe_names.append(str(recipe.get("name", "")))
		_expect(float(recipe.get("batch_l", 0)) > 0.0 and float(recipe.get("batch_l", 0)) <= 25.0, "Recipe %s exceeds the available fermenter capacity" % str(recipe.get("name", "unknown")), failures)
		_expect(recipe.get("ingredients", []).size() >= 3, "Recipe %s does not define a complete ingredient bill" % str(recipe.get("name", "unknown")), failures)
		_expect(recipe.get("production_risks", []).size() >= 1, "Recipe %s does not define its production trouble" % str(recipe.get("name", "unknown")), failures)
		if str(recipe.get("name", "")) == "Stable Amber":
			_expect(str(recipe.production_risks[0].get("id", "")) == "amber_lauter_stall", "Stable Amber data does not define its distinct lauter risk", failures)
	_expect(recipe_names.has("Lantern Blonde") and recipe_names.has("Stable Amber"), "Week 2 recipes are not both present in authored scenario data", failures)
	var contracts = JSON.parse_string(FileAccess.get_file_as_string("res://data/scenario/contracts.json"))
	_expect(contracts != null and contracts.get("week_two_contracts", []).size() == 2, "Authored Week 2 contract data is missing", failures)
	_expect(contracts != null and contracts.get("capacity_opportunities", []).size() == 2, "Authored capacity opportunities are missing", failures)
	if contracts != null:
		var full_staff_hours := 0
		for opportunity in contracts.get("capacity_opportunities", []):
			full_staff_hours += int(opportunity.resources.staff_hours)
			_expect(float(opportunity.resources.get("hops_kg", 0.0)) > 0.0 and int(opportunity.resources.get("yeast", 0)) == 1 and int(opportunity.resources.get("kegs", 0)) == 1, "Authored capacity opportunity lacks its complete ingredient or packaging bill", failures)
		_expect(full_staff_hours > 14, "Authored capacity opportunities do not create a real staff-hour conflict", failures)

func _test_fail_forward(failures: Array[String]) -> void:
	var model: BrewSimulation = BrewSimulationModel.new()
	model.new_campaign()
	model.state.cash = -20
	model.advance(1)
	_expect(int(model.state.cash) == 480, "Emergency credit did not keep an insolvent estate alive", failures)
	_expect(model.state.probation, "Emergency credit did not impose probation", failures)
	_expect(not model.state.campaign_lost, "First insolvency should fail forward, not end the campaign", failures)

func _test_authority_ladder(failures: Array[String]) -> void:
	var model: BrewSimulation = BrewSimulationModel.new()
	model.new_campaign()
	_expect(model.state.authority_ladder.size() == 4, "Campaign does not define all four authority ranks", failures)
	model.state.review_count = 3; model.state.restoration = 50; model.state.count_confidence = 65; model.state.community_trust = 65
	_expect(model.evaluate_authority(185) == 3, "Deputy Steward progression gate failed", failures)
	model.state.review_count = 6; model.state.restoration = 85; model.state.count_confidence = 78; model.state.community_trust = 76
	_expect(model.evaluate_authority(215) == 4, "Estate Steward progression gate failed", failures)
	_expect(model.state.authority_unlocks.has("full_estate_management"), "Estate Steward authority did not unlock estate management", failures)

func _test_terminal_business_risk(failures: Array[String]) -> void:
	var model: BrewSimulation = BrewSimulationModel.new()
	model.new_campaign()
	model.state.stage = "council"; model.state.poor_reviews = 2; model.state.cash = 0; model.state.count_confidence = 0; model.state.community_trust = 0; model.state.restoration = 0
	model.resolve_council("pay_creditor")
	_expect(model.state.campaign_lost, "A third failed council review should allow the estate to be lost", failures)

func _expect(condition: bool, message: String, failures: Array[String]) -> void:
	if not condition: failures.append(message)

func _has_action(model: BrewSimulation, action_id: String) -> bool:
	for action in model.get_available_actions():
		if str(action.id) == action_id: return true
	return false
