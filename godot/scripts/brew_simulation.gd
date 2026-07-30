class_name BrewSimulation
extends RefCounted

const SAVE_VERSION := 1
const FERMENTATION_MINUTES := 7 * 24 * 60

var state: Dictionary = {}
var revision := 0

func new_campaign(player_name := "Elise", coat_index := 0) -> void:
	state = {
		"save_version": SAVE_VERSION,
		"player": {"name": player_name, "coat_index": coat_index},
		"game_minute": 430,
		"speed": 0,
		"cash": 6200,
		"runway_days": 42,
		"count_confidence": 38,
		"community_trust": 24,
		"restoration": 8,
		"authority_rank": 1,
		"authority_role": "Castle Brewmaster",
		"week_number": 1,
		"active_week_plan": "first_lights",
		"authority_unlocks": ["brew", "clean", "ingredient_requests", "release_recommendations"],
		"authority_ladder": [
			{"rank":1,"role":"Castle Brewmaster","unlocks":["brew","clean","ingredient_requests","release_recommendations"]},
			{"rank":2,"role":"Keeper of the Old Stables","unlocks":["brewery_budget","equipment","courtyard","minor_restoration"]},
			{"rank":3,"role":"Deputy Steward","unlocks":["staff_hiring","events","contracts","major_restoration"]},
			{"rank":4,"role":"Estate Steward","unlocks":["full_estate_management","creditor_negotiation","estate_strategy"]}
		],
		"review_count": 0,
		"poor_reviews": 0,
		"probation": false,
		"campaign_lost": false,
		"stage": "appointment",
		"batch": {
			"id": "BATCH-LANTERN-001",
			"recipe": "Lantern Blonde",
			"volume_l": 20.0,
			"quality": 58,
			"safety": 72,
			"flavor_tags": ["pale", "dry"],
			"packaged_l": 0.0,
			"status": "planned"
		},
		"promise": {
			"plan_id": "first_lights",
			"name": "Night of First Lights",
			"guests": 40,
			"deadline_minute": 11 * 24 * 60 + 20 * 60,
			"quality_target": 58,
			"status": "accepted"
		},
		"inventory": {
			"malt": {"lot_id":"LOT-MALT-001", "quantity":18.0, "unit":"kg", "quality":82},
			"yeast": {"lot_id":"LOT-YEAST-001", "quantity":2.0, "unit":"pitch", "quality":78},
			"citrus_hops": {"lot_id":"LOT-HOP-DELAYED", "quantity":0.0, "unit":"kg", "quality":0},
			"garden_herbs": {"lot_id":"LOT-GARDEN-001", "quantity":0.12, "unit":"kg", "quality":88},
			"empty_keg": {"lot_id":"LOT-KEG-001", "quantity":2.0, "unit":"keg", "quality":74}
		},
		"stations": {
			"brewhouse": {"name":"Copper brewhouse", "cleanliness":38, "condition":62, "busy":false},
			"fermenter": {"name":"Stable fermenter 01", "cleanliness":64, "condition":71, "busy":false},
			"packaging": {"name":"Manual filler", "cleanliness":58, "condition":54, "busy":false},
			"courtyard": {"name":"Courtyard long table", "cleanliness":70, "condition":45, "busy":false}
		},
		"staff": {
			"player": _staff(player_name, "Brewmaster", 360, 1380, {"brewing":3,"maintenance":2,"packaging":2,"service":1}),
			"jules": _staff("Jules Lambert", "Cellar hand", 360, 960, {"brewing":2,"maintenance":3,"packaging":1,"service":1}),
			"maelle": _staff("Maëlle Renard", "Taproom lead", 600, 1320, {"brewing":1,"maintenance":1,"packaging":3,"service":3}),
			"noor": _staff("Noor Benali", "Hospitality cook", 720, 1320, {"brewing":0,"maintenance":1,"packaging":1,"service":3}),
			"inez": _staff("Inez De Wilde", "Estate quartermaster", 420, 1020, {"brewing":1,"maintenance":2,"packaging":2,"service":2})
		},
		"jobs": [],
		"week_history": [],
		"pending_issue": "",
		"issue_history": [],
		"courtyard_prepared": false,
		"labels_prepared": false,
		"service_result": {},
		"council_result": {},
		"restoration_projects": {
			"stable_lighting": {"name":"Stable work lighting", "cost":320, "complete":false},
			"pump_reseal": {"name":"Pump and seal overhaul", "cost":480, "complete":false},
			"courtyard_tables": {"name":"Courtyard tables", "cost":260, "complete":false}
		},
		"log": ["Count Armand appoints %s Castle Brewmaster." % player_name]
	}
	_touch()

func _staff(display_name: String, role: String, shift_start: int, shift_end: int, skills: Dictionary) -> Dictionary:
	return {"name":display_name,"role":role,"shift_start":shift_start,"shift_end":shift_end,"skills":skills,"relationship":50,"energy":100,"assignment":""}

func accept_stable_key() -> Dictionary:
	if state.stage != "appointment": return _fail("The stable key has already been accepted.")
	state.stage = "recommission"
	state.count_confidence += 3
	_log("The Old Stables are placed under the Brewmaster's authority.")
	return _ok("Old Stables access unlocked.")

func get_available_actions() -> Array:
	var actions := []
	if state.pending_issue != "": return actions
	match state.stage:
		"appointment": actions.append(_action("accept_key", "Accept the stable key", "estate", 0, "service"))
		"recommission": actions.append(_action("recommission", "Clean and recommission brewhouse", "brewhouse", 75, "maintenance"))
		"ready_to_mash":
			if int(state.stations.brewhouse.cleanliness) < 70: actions.append(_action("clean_brewhouse", "Clean and sanitize the brewhouse", "brewhouse", 60, "maintenance"))
			else: actions.append(_action("mash", "Mash in %s" % str(state.batch.recipe), "brewhouse", 90, "brewing"))
		"ready_to_boil": actions.append(_action("boil", "Boil the wort", "brewhouse", 70, "brewing"))
		"ready_to_transfer":
			if int(state.stations.fermenter.cleanliness) < 75: actions.append(_action("clean_fermenter", "Clean and purge fermenter", "fermenter", 45, "maintenance"))
			else: actions.append(_action("transfer", "Transfer and pitch yeast", "fermenter", 45, "brewing"))
		"fermenting":
			if not state.courtyard_prepared: actions.append(_action("prepare_courtyard", "Prepare the long table", "courtyard", 180, "service"))
			if not state.labels_prepared: actions.append(_action("prepare_labels", "Prepare keg collars", "packaging", 60, "packaging"))
			if int(state.stations.packaging.cleanliness) < 75: actions.append(_action("clean_packaging", "Clean and sanitize the filler", "packaging", 45, "maintenance"))
		"ready_to_package":
			if int(state.stations.packaging.cleanliness) < 75: actions.append(_action("clean_packaging", "Clean and sanitize the filler", "packaging", 45, "maintenance"))
			else: actions.append(_action("package", "Fill the first 20 L keg", "packaging", 120, "packaging"))
		"ready_to_serve":
			if not state.courtyard_prepared: actions.append(_action("prepare_courtyard", "Prepare the long table", "courtyard", 180, "service"))
			else: actions.append(_action("serve", "Serve %s" % str(state.promise.name), "courtyard", 90, "service"))
	return actions

func _action(id: String, label: String, station: String, duration: int, skill: String) -> Dictionary:
	return {"id":id,"label":label,"station":station,"duration":duration,"skill":skill}

func start_action(action_id: String, staff_id := "player") -> Dictionary:
	if state.pending_issue != "": return _fail("Resolve the current brewing problem first.")
	if action_id == "accept_key": return accept_stable_key()
	var definition := _find_action(action_id)
	if definition.is_empty(): return _fail("That action is not available now.")
	if not state.staff.has(staff_id): return _fail("Unknown staff member.")
	if not is_staff_available(staff_id): return _fail("%s is off shift or already assigned." % state.staff[staff_id].name)
	if definition.station != "estate" and state.stations[definition.station].busy: return _fail("That station is already occupied.")
	var validation := _validate_action_start(action_id)
	if not validation.ok: return validation
	var skill_level := int(state.staff[staff_id].skills.get(definition.skill, 0))
	if skill_level <= 0: return _fail("%s lacks the required %s skill." % [state.staff[staff_id].name, definition.skill])
	var adjusted_duration: int = maxi(15, int(definition.duration * (1.12 - skill_level * 0.08)))
	var job := {
		"id": "JOB-%03d" % (state.jobs.size() + 1),
		"action": action_id,
		"label": definition.label,
		"station": definition.station,
		"staff_id": staff_id,
		"started": state.game_minute,
		"ends": state.game_minute + adjusted_duration,
		"status": "active"
	}
	state.jobs.append(job)
	state.staff[staff_id].assignment = job.id
	state.stations[definition.station].busy = true
	_apply_start_costs(action_id)
	_log("%s assigns %s to %s." % [state.player.name, state.staff[staff_id].name, definition.label])
	_touch()
	return _ok("%s started; %d game minutes." % [definition.label, adjusted_duration])

func _validate_action_start(action_id: String) -> Dictionary:
	match action_id:
		"mash":
			var malt_required := float(state.batch.get("malt_kg", 4.2))
			if state.inventory.malt.quantity < malt_required: return _fail("Not enough malt in inventory.")
			if state.stations.brewhouse.cleanliness < 70: return _fail("The brewhouse must be cleaned first.")
		"transfer":
			if state.inventory.yeast.quantity < 1: return _fail("No viable yeast pitch remains.")
			if state.stations.fermenter.cleanliness < 75: return _fail("The fermenter must be cleaned and purged first.")
		"package":
			if state.inventory.empty_keg.quantity < 1: return _fail("No empty keg is available.")
			if state.stations.packaging.cleanliness < 75: return _fail("The filler must be cleaned and sanitized first.")
	return _ok("")

func _apply_start_costs(action_id: String) -> void:
	match action_id:
		"recommission": state.cash -= 140
		"clean_brewhouse": state.cash -= 35
		"mash": state.inventory.malt.quantity -= float(state.batch.get("malt_kg", 4.2))
		"clean_fermenter": state.cash -= 35
		"transfer": state.inventory.yeast.quantity -= 1.0
		"prepare_courtyard": state.cash -= 90
		"prepare_labels": state.cash -= 24
		"clean_packaging": state.cash -= 25
		"package": state.inventory.empty_keg.quantity -= 1.0

func advance(minutes: float) -> void:
	if minutes <= 0 or state.campaign_lost: return
	if str(state.pending_issue) != "" or str(state.stage) in ["week_planning", "council", "complete"]: return
	state.game_minute += int(minutes)
	_update_runway()
	_complete_due_jobs()
	_enforce_financial_pressure()
	_touch()

func advance_to_next_milestone() -> Dictionary:
	var active := _active_jobs()
	if active.is_empty(): return _fail("There is no active production milestone to wait for.")
	var next_end := 999999999
	for job in active: next_end = min(next_end, int(job.ends))
	advance(max(1, next_end - int(state.game_minute)))
	return _ok("Time advanced to the next production milestone.")

func _complete_due_jobs() -> void:
	for index in range(state.jobs.size()):
		var job: Dictionary = state.jobs[index]
		if job.status == "active" and int(job.ends) <= int(state.game_minute):
			job.status = "complete"
			state.jobs[index] = job
			if job.staff_id != "system":
				state.staff[job.staff_id].assignment = ""
				state.staff[job.staff_id].energy = max(20, int(state.staff[job.staff_id].energy) - 8)
			if job.station != "fermentation_clock": state.stations[job.station].busy = false
			_complete_action(job.action, job.staff_id)

func _complete_action(action_id: String, staff_id: String) -> void:
	var skill_bonus := 0
	if staff_id != "system":
		skill_bonus = int(state.staff[staff_id].skills.get("brewing", 0)) - 1
		state.staff[staff_id].relationship = mini(100, int(state.staff[staff_id].relationship) + 2)
	match action_id:
		"recommission":
			state.stations.brewhouse.cleanliness = 92
			state.stations.packaging.cleanliness = 78
			state.batch.safety += 6
			state.restoration += 4
			state.stage = "ready_to_mash"
		"clean_brewhouse":
			state.stations.brewhouse.cleanliness = 92
			state.batch.safety += 2
		"mash":
			state.batch.status = "in_process"
			state.batch.quality += skill_bonus
			state.stations.brewhouse.cleanliness = maxi(0, int(state.stations.brewhouse.cleanliness) - 10)
			if str(state.get("active_week_plan", "")) == "count_reserve":
				state.pending_issue = "amber_lauter_stall"
			else:
				state.pending_issue = "mash_drift"
		"boil":
			state.batch.quality += skill_bonus
			state.stations.brewhouse.cleanliness = maxi(0, int(state.stations.brewhouse.cleanliness) - 20)
			state.stage = "ready_to_transfer"
		"clean_fermenter":
			state.stations.fermenter.cleanliness = 93
			state.batch.safety += 4
		"transfer":
			state.batch.quality += skill_bonus
			state.stations.fermenter.cleanliness = maxi(0, int(state.stations.fermenter.cleanliness) - 12)
			state.stations.fermenter.busy = true
			state.stage = "fermenting"
			state.jobs.append({"id":"JOB-FERMENT","action":"fermentation","label":"Fermentation","station":"fermentation_clock","staff_id":"system","started":state.game_minute,"ends":state.game_minute+FERMENTATION_MINUTES,"status":"active"})
		"fermentation":
			state.stations.fermenter.busy = false
			state.stations.fermenter.cleanliness = maxi(0, int(state.stations.fermenter.cleanliness) - 10)
			state.batch.quality += 5
			state.batch.flavor_tags.append("clean_fermentation")
			state.stage = "ready_to_package"
		"prepare_courtyard":
			state.courtyard_prepared = true
			state.community_trust += 5
			state.stations.courtyard.condition += 8
			state.staff.noor.relationship = mini(100, int(state.staff.noor.relationship) + 3)
		"prepare_labels":
			state.labels_prepared = true
			state.count_confidence += 2
			state.staff.inez.relationship = mini(100, int(state.staff.inez.relationship) + 2)
		"clean_packaging":
			state.stations.packaging.cleanliness = 92
			state.batch.safety += 2
		"package":
			state.batch.packaged_l = 20.0
			state.batch.status = "packaged"
			state.stations.packaging.cleanliness = maxi(0, int(state.stations.packaging.cleanliness) - 20)
			state.stage = "ready_to_serve"
			state.staff.maelle.relationship = mini(100, int(state.staff.maelle.relationship) + 2)
		"serve": _resolve_service()
	_log("Completed: %s." % action_id.replace("_", " ").capitalize())

func choose_issue(option_id: String) -> Dictionary:
	var issue := str(state.pending_issue)
	if issue == "": return _fail("There is no brewing problem to resolve.")
	var valid := false
	if issue == "mash_drift":
		match option_id:
			"cut_heat_stir":
				state.batch.quality += 8; state.count_confidence += 3; state.game_minute += 20
				state.batch.flavor_tags.append("crisp_finish"); valid = true
			"add_cold_water":
				state.batch.quality += 2; state.batch.volume_l = 21.5; state.game_minute += 8
				state.batch.flavor_tags.append("light_body"); valid = true
			"accept_rich_body":
				state.batch.quality -= 5; state.batch.flavor_tags.append("rich_body"); valid = true
		if valid:
			state.pending_issue = "missing_hops"
			state.issue_history.append({"issue":issue,"choice":option_id})
	elif issue == "missing_hops":
		match option_id:
			"estate_herbs":
				if state.inventory.garden_herbs.quantity >= 0.04:
					state.inventory.garden_herbs.quantity -= 0.04; state.batch.quality += 4; state.community_trust += 8
					state.staff.inez.relationship = mini(100, int(state.staff.inez.relationship) + 4)
					state.batch.flavor_tags.append("wild_green"); valid = true
			"express_hops":
				if state.cash >= 180:
					state.cash -= 180; state.batch.quality += 6; state.count_confidence -= 2; state.game_minute += 180
					state.batch.flavor_tags.append("bright_citrus"); valid = true
			"reduce_bitterness":
				state.batch.quality -= 4; state.batch.flavor_tags.append("soft_bitterness"); valid = true
		if valid:
			state.pending_issue = ""
			state.stage = "ready_to_boil"
			state.issue_history.append({"issue":issue,"choice":option_id})
	elif issue == "amber_lauter_stall":
		match option_id:
			"rake_recirculate":
				state.batch.quality += 7
				state.count_confidence += 2
				state.game_minute += 60
				state.batch.flavor_tags.append("clear_runoff")
				valid = true
			"thin_mash":
				state.batch.quality += 1
				state.batch.volume_l = float(state.batch.volume_l) + 2.0
				state.game_minute += 15
				state.batch.flavor_tags.append("lighter_amber")
				valid = true
			"force_runoff":
				state.batch.quality -= 6
				state.stations.brewhouse.condition = maxi(0, int(state.stations.brewhouse.condition) - 8)
				state.batch.flavor_tags.append("husky_tannin")
				valid = true
		if valid:
			state.pending_issue = ""
			state.stage = "ready_to_boil"
			state.issue_history.append({"issue":issue,"choice":option_id})
	if not valid: return _fail("That choice is unavailable with current resources.")
	_log("Decision: %s." % option_id.replace("_", " ").capitalize())
	_touch()
	return _ok("The batch now carries the consequence of that choice.")

func get_issue_options() -> Array:
	if state.pending_issue == "mash_drift":
		return [
			{"id":"cut_heat_stir","label":"Cut heat and stir","effect":"+quality, +confidence, +20 min"},
			{"id":"add_cold_water","label":"Add cold water","effect":"more volume, lighter body"},
			{"id":"accept_rich_body","label":"Accept the drift","effect":"no delay, richer but less drinkable"}
		]
	if state.pending_issue == "missing_hops":
		return [
			{"id":"estate_herbs","label":"Use garden herbs","effect":"estate identity, +community"},
			{"id":"express_hops","label":"Buy express hops","effect":"best quality, -¤180, +3 hours"},
			{"id":"reduce_bitterness","label":"Reduce bitterness","effect":"save cash, softer beer"}
		]
	if state.pending_issue == "amber_lauter_stall":
		return [
			{"id":"rake_recirculate","label":"Rake and recirculate patiently","effect":"clearer runoff, +quality, +confidence, +1 hour"},
			{"id":"thin_mash","label":"Loosen the bed with hot liquor","effect":"more volume, lighter body, +15 min"},
			{"id":"force_runoff","label":"Force the runoff","effect":"no delay, quality and equipment risk"}
		]
	return []

func _resolve_service() -> void:
	var quality: int = int(state.batch.quality)
	var late: bool = int(state.game_minute) > int(state.promise.deadline_minute)
	var guests_served: int = mini(int(state.promise.guests), int(floor(float(state.batch.packaged_l) / 0.4)))
	var memorable: bool = state.batch.flavor_tags.has("wild_green") or quality >= 70
	var revenue: int = guests_served * (24 if quality >= 70 else 19 if quality >= 60 else 14)
	if late: revenue = int(revenue * 0.65)
	var trust_delta: int = 14 if memorable else 7 if quality >= 60 else -6
	if late: trust_delta -= 8
	var confidence_delta: int = 12 if quality >= 68 and not late else 4 if quality >= 58 else -9
	var quality_target := int(state.promise.get("quality_target", 58))
	var target_met := quality >= quality_target
	var plan_id := str(state.promise.get("plan_id", ""))
	if plan_id == "festival_rush":
		revenue = guests_served * 21
		if target_met and not late: revenue += 180
		if late: revenue = int(revenue * 0.5)
		trust_delta = 16 if target_met and not late else -10 if late else -4
		confidence_delta = 5 if target_met and not late else -6
	elif plan_id == "count_reserve":
		revenue = guests_served * 30
		if target_met and not late:
			revenue += 420
			confidence_delta = 16
			trust_delta = 5
		else:
			revenue = int(revenue * (0.4 if late else 0.55))
			confidence_delta = -14
			trust_delta = -3
	state.cash += revenue
	state.community_trust += trust_delta
	state.count_confidence += confidence_delta
	state.promise.status = "kept" if not late and target_met else "strained"
	state.batch.status = "served"
	state.service_result = {"quality":quality,"quality_target":quality_target,"target_met":target_met,"revenue":revenue,"guests_served":guests_served,"late":late,"memorable":memorable,"trust_delta":trust_delta,"confidence_delta":confidence_delta,"plan_id":plan_id}
	state.stage = "council"

func resolve_council(option_id: String) -> Dictionary:
	if state.stage != "council": return _fail("The weekly council is not in session.")
	state.review_count += 1
	var score := int(state.count_confidence) + int(state.community_trust) + int(state.restoration) + clampi(int(state.cash / 200), 0, 35)
	match option_id:
		"reinvest":
			if state.cash < 320: return _fail("The estate cannot afford the lighting project.")
			state.cash -= 320; state.restoration += 14; state.restoration_projects.stable_lighting.complete = true
		"pay_creditor":
			state.cash -= min(500, state.cash); state.runway_days += 8; state.count_confidence += 4
		"back_community":
			state.cash -= min(220, state.cash); state.community_trust += 9; state.restoration += 4
	if score < 120:
		state.poor_reviews += 1
		state.probation = state.poor_reviews >= 2
	else:
		state.poor_reviews = max(0, state.poor_reviews - 1)
	if state.poor_reviews >= 3:
		state.campaign_lost = true
		state.authority_role = "Former Brewmaster"
	elif state.promise.status == "kept":
		evaluate_authority(score)
	state.council_result = {"score":score,"choice":option_id,"probation":state.probation,"authority_rank":state.authority_rank}
	state.stage = "complete"
	_log("Apolline records the first weekly council decision.")
	_touch()
	return _ok("Council review complete: %s." % state.authority_role)

func evaluate_authority(score: int) -> int:
	var earned_rank := int(state.authority_rank)
	if int(state.review_count) >= 1 and score >= 155: earned_rank = maxi(earned_rank, 2)
	if int(state.review_count) >= 3 and score >= 175 and int(state.restoration) >= 45 and int(state.count_confidence) >= 55 and int(state.community_trust) >= 55: earned_rank = maxi(earned_rank, 3)
	if int(state.review_count) >= 6 and score >= 205 and int(state.restoration) >= 80 and int(state.count_confidence) >= 70 and int(state.community_trust) >= 70: earned_rank = 4
	_set_authority_rank(earned_rank)
	return earned_rank

func _set_authority_rank(rank: int) -> void:
	var safe_rank := clampi(rank, 1, 4)
	var definition: Dictionary = state.authority_ladder[safe_rank - 1]
	state.authority_rank = safe_rank
	state.authority_role = definition.role
	state.authority_unlocks = definition.unlocks.duplicate(true)

func get_week_plan_options() -> Array:
	if state.stage != "week_planning": return []
	return [
		{
			"id": "festival_rush",
			"label": "Supply the Saint Brigid festival",
			"recipe": "Lantern Blonde",
			"effect": "+320 advance · 50 guests · quality 62 · due in 8 days",
			"advance": 320,
			"guests": 50,
			"quality_target": 62,
			"deadline_days": 8
		},
		{
			"id": "count_reserve",
			"label": "Brew the Count's cellar reserve",
			"recipe": "Stable Amber",
			"effect": "+120 advance · quality 72 · premium settlement · due in 10 days",
			"advance": 120,
			"guests": 32,
			"quality_target": 72,
			"deadline_days": 10
		}
	]

func choose_week_plan(plan_id: String) -> Dictionary:
	if state.stage != "week_planning": return _fail("The weekly production commitment is already settled.")
	var selected: Dictionary = {}
	for option in get_week_plan_options():
		if str(option.id) == plan_id:
			selected = option
			break
	if selected.is_empty(): return _fail("That production commitment is not available.")
	state.active_week_plan = plan_id
	state.cash += int(selected.advance)
	if plan_id == "festival_rush":
		state.batch = {
			"id": "BATCH-LANTERN-%03d" % int(state.week_number),
			"recipe": "Lantern Blonde",
			"malt_kg": 4.2,
			"volume_l": 20.0,
			"quality": 58,
			"safety": 72,
			"flavor_tags": ["pale", "dry"],
			"packaged_l": 0.0,
			"status": "planned"
		}
		state.promise = {
			"plan_id": plan_id,
			"name": "Saint Brigid Festival",
			"guests": 50,
			"deadline_minute": int(state.game_minute) + 8 * 24 * 60,
			"quality_target": 62,
			"status": "accepted",
			"advance": 320
		}
	else:
		state.batch = {
			"id": "BATCH-AMBER-%03d" % int(state.week_number),
			"recipe": "Stable Amber",
			"malt_kg": 5.4,
			"volume_l": 20.0,
			"quality": 62,
			"safety": 70,
			"flavor_tags": ["amber", "toasted"],
			"packaged_l": 0.0,
			"status": "planned"
		}
		state.promise = {
			"plan_id": plan_id,
			"name": "Count's Cellar Reserve",
			"guests": 32,
			"deadline_minute": int(state.game_minute) + 10 * 24 * 60,
			"quality_target": 72,
			"status": "accepted",
			"advance": 120
		}
	state.stage = "ready_to_mash"
	_log("Week %d commitment accepted: %s." % [int(state.week_number), str(state.promise.name)])
	_touch()
	return _ok("%s is scheduled for Week %d." % [str(state.batch.recipe), int(state.week_number)])

func begin_next_week() -> Dictionary:
	if state.stage != "complete": return _fail("Finish the weekly council before planning another batch.")
	if state.campaign_lost: return _fail("The estate must be recovered before brewing can continue.")
	var completed_week := int(state.get("week_number", 1))
	if not state.has("week_history"): state.week_history = []
	state.week_history.append({
		"week_number": completed_week,
		"batch": state.batch.duplicate(true),
		"promise": state.promise.duplicate(true),
		"plan_id": str(state.get("active_week_plan", state.promise.get("plan_id", ""))),
		"issue_history": state.issue_history.duplicate(true),
		"service_result": state.service_result.duplicate(true),
		"council_result": state.council_result.duplicate(true)
	})
	state.week_number = completed_week + 1
	state.batch = {
		"id": "BATCH-UNSCHEDULED-%03d" % int(state.week_number),
		"recipe": "Unscheduled",
		"volume_l": 0.0,
		"quality": 0,
		"safety": 0,
		"flavor_tags": [],
		"packaged_l": 0.0,
		"status": "awaiting_plan"
	}
	state.promise = {
		"plan_id": "",
		"name": "No commitment selected",
		"guests": 0,
		"deadline_minute": 0,
		"quality_target": 0,
		"status": "pending"
	}
	state.active_week_plan = ""
	state.jobs = []
	state.pending_issue = ""
	state.issue_history = []
	state.courtyard_prepared = false
	state.labels_prepared = false
	state.service_result = {}
	state.council_result = {}
	for staff_id in state.staff:
		state.staff[staff_id].assignment = ""
	for station_id in state.stations:
		state.stations[station_id].busy = false
	state.stage = "week_planning"
	_log("Week %d begins with two competing production commitments." % int(state.week_number))
	_touch()
	return _ok("Week %d is ready for a production commitment." % int(state.week_number))

func fund_restoration(project_id: String) -> Dictionary:
	if state.stage != "complete": return _fail("Restoration proposals are approved after the weekly council.")
	if int(state.authority_rank) < 2: return _fail("The Brewmaster does not yet control the stable restoration budget.")
	if not state.restoration_projects.has(project_id): return _fail("Unknown restoration project.")
	var project: Dictionary = state.restoration_projects[project_id]
	if project.complete: return _fail("That restoration project is already complete.")
	if int(state.cash) < int(project.cost): return _fail("The estate cannot afford that restoration project.")
	state.cash -= int(project.cost)
	project.complete = true
	state.restoration_projects[project_id] = project
	match project_id:
		"stable_lighting": state.restoration += 14
		"pump_reseal":
			state.restoration += 18
			state.stations.brewhouse.condition = mini(100, int(state.stations.brewhouse.condition) + 22)
		"courtyard_tables":
			state.restoration += 12
			state.community_trust += 5
			state.stations.courtyard.condition = mini(100, int(state.stations.courtyard.condition) + 18)
	_log("Restoration funded: %s." % project.name)
	_touch()
	return _ok("%s restored." % project.name)

func get_restoration_options() -> Array:
	var options := []
	if state.stage != "complete": return options
	if int(state.authority_rank) >= 2:
		for id in state.restoration_projects:
			var project: Dictionary = state.restoration_projects[id]
			if not project.complete:
				options.append({"id":id,"label":project.name,"effect":"¤%d · permanent estate improvement" % int(project.cost)})
	options.append({"id":"begin_next_week","label":"Close the account and begin Week %d" % (int(state.get("week_number", 1)) + 1),"effect":"preserve cash · choose the next production commitment"})
	return options

func get_council_options() -> Array:
	return [
		{"id":"reinvest","label":"Restore stable lighting","effect":"-¤320, major restoration gain"},
		{"id":"pay_creditor","label":"Pay the urgent creditor","effect":"cash out, +runway, +Count confidence"},
		{"id":"back_community","label":"Fund the next courtyard night","effect":"-¤220, +community trust"}
	]

func is_staff_available(staff_id: String) -> bool:
	if not state.staff.has(staff_id): return false
	var staff: Dictionary = state.staff[staff_id]
	if staff.assignment != "": return false
	var minute_of_day := int(state.game_minute) % 1440
	return minute_of_day >= int(staff.shift_start) and minute_of_day <= int(staff.shift_end)

func get_staff_summary() -> Array:
	var result := []
	for id in state.staff:
		var member: Dictionary = state.staff[id]
		result.append({"id":id,"name":member.name,"role":member.role,"available":is_staff_available(id),"assignment":member.assignment,"energy":member.energy,"relationship":member.relationship,"shift_start":member.shift_start,"shift_end":member.shift_end})
	return result

func _find_action(action_id: String) -> Dictionary:
	for action in get_available_actions():
		if action.id == action_id: return action
	return {}

func _active_jobs() -> Array:
	return state.jobs.filter(func(job): return job.status == "active")

func get_active_jobs() -> Array:
	return _active_jobs()

func save_game(path := "user://old_stables_save.json") -> Dictionary:
	var temp_path := path + ".tmp"
	var file := FileAccess.open(temp_path, FileAccess.WRITE)
	if file == null: return _fail("Could not open the save file.")
	file.store_string(JSON.stringify(state, "  "))
	file.flush(); file.close()
	if FileAccess.file_exists(path): DirAccess.remove_absolute(ProjectSettings.globalize_path(path))
	var error := DirAccess.rename_absolute(ProjectSettings.globalize_path(temp_path), ProjectSettings.globalize_path(path))
	if error != OK: return _fail("Could not finalize the save file.")
	return _ok("Campaign saved.")

func load_game(path := "user://old_stables_save.json") -> Dictionary:
	if not FileAccess.file_exists(path): return _fail("No campaign save exists yet.")
	var parsed = JSON.parse_string(FileAccess.get_file_as_string(path))
	if parsed == null or int(parsed.get("save_version", 0)) != SAVE_VERSION: return _fail("The save file is invalid or unsupported.")
	state = parsed
	if not state.has("week_number"): state.week_number = 1
	if not state.has("week_history"): state.week_history = []
	if not state.has("active_week_plan"): state.active_week_plan = str(state.promise.get("plan_id", ""))
	if not state.promise.has("plan_id"): state.promise.plan_id = str(state.active_week_plan)
	if not state.promise.has("quality_target"): state.promise.quality_target = 58
	_touch()
	return _ok("Campaign loaded.")

func _update_runway() -> void:
	state.runway_days = max(0, int(ceil(float(state.cash) / 150.0)))

func _enforce_financial_pressure() -> void:
	if state.cash < 0:
		state.cash += 500
		state.count_confidence -= 10
		state.poor_reviews += 1
		state.probation = true
		_log("Apolline secures emergency credit; the estate survives under probation.")

func format_time() -> String:
	var total := int(state.game_minute)
	var day := total / 1440 + 1
	var minute_of_day := total % 1440
	return "DAY %02d · %02d:%02d" % [day, minute_of_day / 60, minute_of_day % 60]

func objective_text() -> String:
	if state.pending_issue == "mash_drift": return "Mash temperature is drifting. Choose an intervention."
	if state.pending_issue == "missing_hops": return "The citrus hop delivery is missing. Choose the beer's new direction."
	match state.stage:
		"appointment": return "Accept the Count's mandate and take the stable key."
		"recommission": return "Assign someone to make the brewhouse safe and clean."
		"week_planning": return "Choose which Week %d commitment the Old Stables will accept." % int(state.week_number)
		"ready_to_mash": return "Commit %.1f kg of malt and begin %s." % [float(state.batch.get("malt_kg", 4.2)), str(state.batch.recipe)]
		"ready_to_boil": return "Boil the wort using the chosen ingredient plan."
		"ready_to_transfer": return "Transfer, pitch the house yeast, and seal the fermenter."
		"fermenting": return "Prepare the estate while fermentation works."
		"ready_to_package": return "Package the finished beer into the first 20 L keg."
		"ready_to_serve": return "Keep the promise: open the courtyard and serve the batch."
		"council": return "Face Apolline and the Count at the weekly council."
		"complete": return "Choose any restoration investment, then begin the next brewing week."
	return "Restore the estate one batch at a time."

func _ok(message: String) -> Dictionary: return {"ok":true,"message":message}
func _fail(message: String) -> Dictionary: return {"ok":false,"message":message}
func _log(message: String) -> void: state.log.append("%s — %s" % [format_time(), message])
func _touch() -> void: revision += 1
