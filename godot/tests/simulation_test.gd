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
	festival._resolve_service()
	_expect(festival.state.service_result.target_met and int(festival.state.cash) - festival_settlement_cash == 1230, "A successful festival commitment did not pay its promised settlement", failures)

	reserve.state.jobs = []
	reserve.state.pending_issue = ""
	reserve.state.batch.quality = 70
	reserve.state.batch.packaged_l = 20.0
	reserve.state.game_minute = int(reserve.state.promise.deadline_minute) - 1
	var reserve_confidence_before := int(reserve.state.count_confidence)
	reserve._resolve_service()
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
