class_name BrewSimulation
extends RefCounted

const SAVE_VERSION := 1
const FERMENTATION_MINUTES := 7 * 24 * 60

var state: Dictionary = {}
var revision := 0

func new_campaign(player_name := "Henri", coat_index := 0) -> void:
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
		"brewhouse_inspected": false,
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
			"name": "Village Inn First Keg",
			"venue": "village_inn",
			"guests": 40,
			"deadline_minute": 11 * 24 * 60 + 20 * 60,
			"quality_target": 58,
			"status": "accepted"
		},
		"inventory": {
			"malt": {"lot_id":"LOT-MALT-BAKEHOUSE", "quantity":18.0, "unit":"kg", "quality":82, "source":"estate_bakehouse"},
			"yeast": {"lot_id":"LOT-YEAST-BAKEHOUSE", "quantity":1.0, "unit":"crock", "quality":78, "source":"estate_bakehouse"},
			"citrus_hops": {"lot_id":"LOT-HOP-WILD", "quantity":0.0, "unit":"kg", "quality":0, "source":"millstream_vines", "status":"requires_inspection"},
			"garden_herbs": {"lot_id":"LOT-GARDEN-001", "quantity":0.12, "unit":"kg", "quality":88},
			"empty_keg": {"lot_id":"LOT-KEG-001", "quantity":2.0, "unit":"keg", "quality":74}
		},
		"stations": {
			"brewhouse": {"name":"Copper brewhouse", "cleanliness":38, "condition":62, "busy":false},
			"fermenter": {"name":"Stable fermenter 01", "cleanliness":64, "condition":71, "busy":false},
			"packaging": {"name":"Manual filler", "cleanliness":58, "condition":54, "busy":false},
			"courtyard": {"name":"Estate loading court", "cleanliness":70, "condition":45, "busy":false}
		},
		"staff": {
			"player": _staff(player_name, "Castle Brewmaster", 360, 1380, {"brewing":3,"maintenance":2,"packaging":2,"service":1}),
			"jules": _staff("Jules Lambert", "Cellar hand", 360, 960, {"brewing":2,"maintenance":3,"packaging":1,"service":1}),
			"maelle": _staff("Maëlle Renard", "Taproom and packaging", 600, 1320, {"brewing":1,"maintenance":1,"packaging":3,"service":3}),
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
		"delivery_problem": {},
		"delivery_recovery": {},
		"council_result": {},
		"capacity_board": {},
		"production_queue": [],
		"operations_active": false,
		"production_batches": [],
		"active_batch_id": "",
		"operations_results": [],
		"demand": {"community":50,"premium":45,"reliability":50},
		"last_energy_day": 0,
		"schedule_events": [],
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

func inspect_brewhouse() -> Dictionary:
	if state.stage != "recommission": return _fail("The copper inspection is no longer the current objective.")
	if bool(state.get("brewhouse_inspected", false)):
		return _ok("Copper condition already recorded.")
	state.brewhouse_inspected = true
	_log("%s inspects the copper brewhouse: condition %d, cleanliness %d." % [state.player.name, int(state.stations.brewhouse.condition), int(state.stations.brewhouse.cleanliness)])
	_touch()
	return _ok("Inspection recorded: the copper is dirty, the hearth is choked, and the chimney must be cleared before use.")

func get_available_actions() -> Array:
	if bool(state.get("operations_active", false)):
		return _get_operations_actions()
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
			if not state.courtyard_prepared:
				actions.append(_action("prepare_courtyard", "Arrange the village inn delivery" if int(state.week_number) == 1 else "Prepare the long table", "courtyard", 180, "service"))
			if not state.labels_prepared: actions.append(_action("prepare_labels", "Prepare keg collars", "packaging", 60, "packaging"))
			if int(state.stations.packaging.cleanliness) < 75: actions.append(_action("clean_packaging", "Clean and sanitize the filler", "packaging", 45, "maintenance"))
			if not state.get("production_queue", []).is_empty() and not bool(state.production_queue[0].get("prepared", false)):
				actions.append(_action("prepare_next_batch", "Stage the next grain bill", "brewhouse", 120, "brewing"))
		"ready_to_package":
			if int(state.stations.packaging.cleanliness) < 75: actions.append(_action("clean_packaging", "Clean and sanitize the filler", "packaging", 45, "maintenance"))
			else: actions.append(_action("package", "Fill the first 20 L keg", "packaging", 120, "packaging"))
		"ready_to_serve":
			if not state.courtyard_prepared:
				actions.append(_action("prepare_courtyard", "Arrange the village inn delivery" if int(state.week_number) == 1 else "Prepare the long table", "courtyard", 180, "service"))
			else:
				actions.append(_action("serve", "Deliver the first keg to the village inn" if int(state.week_number) == 1 else "Serve %s" % str(state.promise.name), "courtyard", 90, "service"))
	return actions

func _action(id: String, label: String, station: String, duration: int, skill: String) -> Dictionary:
	return {"id":id,"label":label,"station":station,"duration":duration,"skill":skill}

func start_action(action_id: String, staff_id := "player") -> Dictionary:
	if action_id.begins_with("ops::"):
		return _start_operations_action(action_id, staff_id)
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
		"recommission":
			if not bool(state.get("brewhouse_inspected", false)): return _fail("Inspect the copper brewhouse before assigning repairs.")
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
		"prepare_next_batch": state.cash -= 40
		"clean_packaging": state.cash -= 25
		"package": state.inventory.empty_keg.quantity -= 1.0

func advance(minutes: float) -> void:
	if minutes <= 0 or state.campaign_lost: return
	if str(state.pending_issue) != "" or str(state.stage) in ["week_planning", "capacity_planning", "delivery_recovery", "council", "operations_council", "complete"]: return
	var previous_day := int(state.game_minute) / 1440
	state.game_minute += int(minutes)
	var current_day := int(state.game_minute) / 1440
	if current_day > previous_day:
		_restore_staff_energy(current_day - previous_day)
	_update_runway()
	_complete_due_jobs()
	_enforce_financial_pressure()
	_touch()

func advance_to_next_milestone() -> Dictionary:
	var active := _active_jobs()
	if active.is_empty(): return _fail("There is no active production milestone to wait for.")
	var hands_on_work_active := false
	for job in active:
		if str(job.get("staff_id", "")) != "system":
			hands_on_work_active = true
			break
	if bool(state.get("operations_active", false)) and not hands_on_work_active and _has_actionable_parallel_work():
		return _fail("Another batch can use free capacity now. Assign it or deliberately leave it waiting before advancing.")
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
				var energy_cost := 8
				if bool(job.get("operations", false)):
					energy_cost = maxi(5, int(ceil(float(int(job.ends) - int(job.started)) / 60.0 * 6.0)))
				state.staff[job.staff_id].energy = max(10, int(state.staff[job.staff_id].energy) - energy_cost)
			if job.station != "fermentation_clock": state.stations[job.station].busy = false
			if bool(job.get("operations", false)):
				_complete_operations_action(job)
			else:
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
			if str(state.batch.get("recipe", "")) == "Stable Amber":
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
		"prepare_next_batch":
			if not state.production_queue.is_empty():
				state.production_queue[0].prepared = true
				state.production_queue[0].prepared_minute = int(state.game_minute)
				state.capacity_board.pressure.overlap_prepared = true
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
			"inspect_wild_hops":
				state.game_minute += 60; state.batch.quality += 4; state.community_trust += 8
				state.inventory.citrus_hops.status = "inspected_for_first_batch"
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
			{"id":"inspect_wild_hops","label":"Inspect the millstream hops","effect":"+1 hour, estate identity, +community"},
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

func _resolve_service(skip_recovery := false) -> void:
	var quality: int = int(state.batch.quality)
	var late: bool = int(state.game_minute) > int(state.promise.deadline_minute)
	if int(state.get("week_number", 1)) >= 2 and not skip_recovery:
		var reasons: Array[String] = []
		if quality < int(state.promise.get("quality_target", 58)): reasons.append("missed_quality")
		if late: reasons.append("late_delivery")
		if int(state.stations.brewhouse.condition) < 58: reasons.append("damaged_equipment")
		if not reasons.is_empty():
			state.delivery_problem = {
				"reasons": reasons,
				"quality": quality,
				"target": int(state.promise.get("quality_target", 58)),
				"late": late,
				"equipment_damage": maxi(0, 62 - int(state.stations.brewhouse.condition))
			}
			state.stage = "delivery_recovery"
			_log("The delivery account needs a recovery decision.")
			return
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
	var recovery_id := str(state.get("delivery_recovery", {}).get("choice", ""))
	var settlement_modifier := float(state.get("delivery_recovery", {}).get("settlement_modifier", 1.0))
	if settlement_modifier < 1.0:
		revenue = int(revenue * settlement_modifier)
	if recovery_id == "discount": trust_delta += 4
	elif recovery_id == "absorb_loss":
		trust_delta += 2
		confidence_delta += 2
	state.cash += revenue
	state.community_trust += trust_delta
	state.count_confidence += confidence_delta
	state.promise.status = "kept" if not late and target_met else "strained"
	state.batch.status = "served"
	state.service_result = {
		"quality":quality,
		"quality_target":quality_target,
		"target_met":target_met,
		"revenue":revenue,
		"guests_served":guests_served,
		"late":late,
		"memorable":memorable,
		"trust_delta":trust_delta,
		"confidence_delta":confidence_delta,
		"plan_id":plan_id,
		"contract_outcome": _contract_outcome(plan_id, target_met, late),
		"recovery": state.get("delivery_recovery", {}).duplicate(true),
		"problem_reasons": state.get("delivery_problem", {}).get("reasons", []).duplicate()
	}
	state.stage = "council"

func _contract_outcome(plan_id: String, target_met: bool, late: bool) -> String:
	if plan_id == "festival_rush":
		return "festival_saved" if target_met and not late else "festival_disappointed"
	if plan_id == "count_reserve":
		return "reserve_approved" if target_met and not late else "reserve_refused"
	return "village_inn_delivered" if target_met and not late else "village_inn_strained"

func get_delivery_recovery_options() -> Array:
	if state.stage != "delivery_recovery": return []
	var reasons: Array = state.delivery_problem.get("reasons", [])
	var options := []
	if reasons.has("missed_quality") or reasons.has("late_delivery"):
		options.append({"id":"renegotiate","label":"Renegotiate the promise","effect":"smaller order, -20% settlement, protect confidence"})
	if reasons.has("missed_quality"):
		options.append({"id":"discount","label":"Offer a contract discount","effect":"-30% settlement, recover community trust"})
	if reasons.has("damaged_equipment"):
		options.append({"id":"delay_repair","label":"Delay delivery and repair","effect":"+1 day, restore the brewhouse, improve the batch"})
	options.append({"id":"absorb_loss","label":"Absorb the loss","effect":"-¤300, deliver as promised, protect confidence"})
	return options

func choose_delivery_recovery(option_id: String) -> Dictionary:
	if state.stage != "delivery_recovery": return _fail("There is no delivery problem to recover.")
	var available := false
	for option in get_delivery_recovery_options():
		if str(option.id) == option_id:
			available = true
			break
	if not available: return _fail("That recovery is not appropriate for this delivery.")
	state.delivery_recovery = {"choice":option_id,"settlement_modifier":1.0}
	match option_id:
		"renegotiate":
			state.promise.guests = maxi(1, int(ceil(float(state.promise.guests) * 0.8)))
			state.promise.quality_target = maxi(0, int(state.promise.quality_target) - 4)
			if bool(state.delivery_problem.get("late", false)):
				state.promise.deadline_minute = int(state.game_minute)
			state.delivery_recovery.settlement_modifier = 0.8
			state.count_confidence -= 4
		"discount":
			state.delivery_recovery.settlement_modifier = 0.7
			state.count_confidence -= 2
		"delay_repair":
			state.game_minute += 24 * 60
			state.cash -= 160
			state.batch.quality += 3
			state.stations.brewhouse.condition = mini(100, int(state.stations.brewhouse.condition) + 14)
			state.delivery_recovery.settlement_modifier = 0.9
		"absorb_loss":
			state.cash -= 300
	_log("Delivery recovery chosen: %s." % option_id.replace("_", " ").capitalize())
	_resolve_service(true)
	_touch()
	return _ok("The contract has been settled through %s." % option_id.replace("_", " "))

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
	# Each Week 2 patron supplies the dedicated culture and returnable keg needed
	# for their commission; malt remains the estate's binding production input.
	state.inventory.yeast.quantity += 1.0
	state.inventory.empty_keg.quantity += 1.0
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
		"delivery_problem": state.get("delivery_problem", {}).duplicate(true),
		"delivery_recovery": state.get("delivery_recovery", {}).duplicate(true),
		"council_result": state.council_result.duplicate(true),
		"production_batches": state.get("production_batches", []).duplicate(true),
		"operations_results": state.get("operations_results", []).duplicate(true),
		"demand": state.get("demand", {}).duplicate(true)
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
	state.delivery_problem = {}
	state.delivery_recovery = {}
	state.council_result = {}
	state.operations_active = false
	state.production_batches = []
	state.active_batch_id = ""
	state.operations_results = []
	state.production_queue = []
	for staff_id in state.staff:
		state.staff[staff_id].assignment = ""
	for station_id in state.stations:
		state.stations[station_id].busy = false
	if completed_week >= 2:
		_open_capacity_board()
	else:
		state.stage = "week_planning"
		_log("Week %d begins with two competing production commitments." % int(state.week_number))
	_touch()
	if completed_week >= 2:
		return _ok("Week %d is ready for capacity planning." % int(state.week_number))
	return _ok("Week %d is ready for a production commitment." % int(state.week_number))

func _open_capacity_board() -> void:
	# The prospective partners send one shared returnable keg and two fresh
	# yeast crocks with their proposals. This makes accepted + renegotiated terms operationally possible
	# after two real deliveries, while two full contracts still exceed staff and
	# (on the reserve route) malt capacity.
	state.inventory.empty_keg.quantity += 1.0
	state.inventory.yeast.quantity += 2.0
	state.inventory.citrus_hops.quantity += 0.12
	var constraints := {
		"malt_kg": float(state.inventory.malt.quantity),
		"hops_kg": float(state.inventory.citrus_hops.quantity),
		"yeast": int(state.inventory.yeast.quantity),
		"kegs": int(state.inventory.empty_keg.quantity),
		"staff_hours": 14,
		"cash": mini(900, maxi(0, int(state.cash)))
	}
	state.capacity_board = {
		"constraints": constraints,
		"partner_returnable_kegs": 1,
		"partner_supply": {"hops_kg":0.12,"yeast":2,"kegs":1},
		"reserved": {"malt_kg":0.0,"hops_kg":0.0,"yeast":0,"kegs":0,"staff_hours":0,"cash":0},
		"responses": {"abbey_table":"pending","inn_cellar":"pending"},
		"active_commitments": [],
		"pressure": {
			"simultaneous": true,
			"fermenter_overlap": false,
			"overlap_prepared": false,
			"staff_hours_reserved": 0,
			"staff_hours_available": int(constraints.staff_hours)
		}
	}
	state.production_queue = []
	state.stage = "capacity_planning"
	_log("Two overlapping opportunities arrive for one brewhouse and one fermenter.")

func _capacity_opportunity_definitions() -> Array:
	return [
		{
			"id":"abbey_table",
			"label":"Abbey harvest table",
			"recipe":"Lantern Blonde",
			"effect":"Due in 8 days · community trust · overlaps inn preparation",
			"advance":360,
			"deadline_days":8,
			"guests":48,
			"quality_target":64,
			"resources":{"malt_kg":4.2,"hops_kg":0.038,"yeast":1,"kegs":1,"staff_hours":8,"cash":180}
		},
		{
			"id":"inn_cellar",
			"label":"Three Lanterns inn cellar",
			"recipe":"Stable Amber",
			"effect":"Due in 10 days · premium cash · overlaps abbey fermentation",
			"advance":520,
			"deadline_days":10,
			"guests":36,
			"quality_target":70,
			"resources":{"malt_kg":5.4,"hops_kg":0.030,"yeast":1,"kegs":1,"staff_hours":9,"cash":260}
		}
	]

func get_capacity_opportunities() -> Array:
	if state.stage != "capacity_planning": return []
	var result := []
	for definition in _capacity_opportunity_definitions():
		var option: Dictionary = definition.duplicate(true)
		var response := str(state.capacity_board.responses.get(option.id, "pending"))
		option.response = response
		option.can_accept = response == "pending" and _capacity_can_reserve(option.resources)
		option.can_renegotiate = response == "pending" and _capacity_can_reserve(_renegotiated_resources(option.resources))
		result.append(option)
	return result

func _renegotiated_resources(resources: Dictionary) -> Dictionary:
	return {
		"malt_kg": min(3.0, float(resources.malt_kg)),
		"hops_kg": min(0.020, float(resources.hops_kg)),
		"yeast": 1,
		"kegs": 1,
		"staff_hours": 5,
		"cash": 100
	}

func _capacity_can_reserve(resources: Dictionary) -> bool:
	var limits: Dictionary = state.capacity_board.constraints
	var reserved: Dictionary = state.capacity_board.reserved
	return (
		float(reserved.malt_kg) + float(resources.malt_kg) <= float(limits.malt_kg) + 0.001
		and float(reserved.hops_kg) + float(resources.hops_kg) <= float(limits.hops_kg) + 0.0001
		and int(reserved.yeast) + int(resources.yeast) <= int(limits.yeast)
		and int(reserved.kegs) + int(resources.kegs) <= int(limits.kegs)
		and int(reserved.staff_hours) + int(resources.staff_hours) <= int(limits.staff_hours)
		and int(reserved.cash) + int(resources.cash) <= int(limits.cash)
	)

func respond_to_capacity_opportunity(opportunity_id: String, decision: String) -> Dictionary:
	if state.stage != "capacity_planning": return _fail("The capacity board is not open.")
	if not ["accept", "renegotiate", "reject"].has(decision): return _fail("Unknown capacity response.")
	if not state.capacity_board.responses.has(opportunity_id): return _fail("Unknown opportunity.")
	if str(state.capacity_board.responses[opportunity_id]) != "pending": return _fail("That opportunity already has an answer.")
	var definition: Dictionary = {}
	for candidate in _capacity_opportunity_definitions():
		if str(candidate.id) == opportunity_id:
			definition = candidate
			break
	if definition.is_empty(): return _fail("Unknown opportunity.")
	if decision == "reject":
		state.capacity_board.responses[opportunity_id] = "rejected"
		_log("Capacity response: %s rejected." % definition.label)
		_touch()
		return _ok("%s declined." % definition.label)
	var resources: Dictionary = definition.resources.duplicate(true)
	if decision == "renegotiate": resources = _renegotiated_resources(resources)
	if not _capacity_can_reserve(resources): return _fail("The estate lacks malt, hops, yeast, kegs, staff hours, or working cash for those terms.")
	for resource_id in resources:
		state.capacity_board.reserved[resource_id] = float(state.capacity_board.reserved[resource_id]) + float(resources[resource_id])
	state.capacity_board.reserved.kegs = int(state.capacity_board.reserved.kegs)
	state.capacity_board.reserved.yeast = int(state.capacity_board.reserved.yeast)
	state.capacity_board.reserved.staff_hours = int(state.capacity_board.reserved.staff_hours)
	state.capacity_board.reserved.cash = int(state.capacity_board.reserved.cash)
	state.capacity_board.responses[opportunity_id] = "accepted" if decision == "accept" else "renegotiated"
	var commitment: Dictionary = definition.duplicate(true)
	commitment.status = str(state.capacity_board.responses[opportunity_id])
	commitment.resources = resources
	if decision == "renegotiate":
		commitment.advance = int(definition.advance * 0.55)
		commitment.guests = int(ceil(float(definition.guests) * 0.6))
		commitment.quality_target = maxi(58, int(definition.quality_target) - 4)
		commitment.deadline_days = int(definition.deadline_days) + 2
	state.capacity_board.active_commitments.append(commitment)
	state.capacity_board.pressure.staff_hours_reserved = int(state.capacity_board.reserved.staff_hours)
	_log("Capacity response: %s %s." % [definition.label, decision])
	_touch()
	return _ok("%s terms recorded." % definition.label)

func finalize_capacity_plan() -> Dictionary:
	if state.stage != "capacity_planning": return _fail("The capacity board is not open.")
	for opportunity_id in state.capacity_board.responses:
		if str(state.capacity_board.responses[opportunity_id]) == "pending":
			return _fail("Answer both opportunities before locking the production plan.")
	if state.capacity_board.active_commitments.is_empty():
		return _fail("At least one opportunity must remain in the production plan.")
	var commitments: Array = state.capacity_board.active_commitments
	state.cash -= int(state.capacity_board.reserved.cash)
	for commitment in commitments: state.cash += int(commitment.advance)
	state.inventory.malt.quantity -= float(state.capacity_board.reserved.malt_kg)
	state.inventory.citrus_hops.quantity -= float(state.capacity_board.reserved.hops_kg)
	state.inventory.yeast.quantity -= float(state.capacity_board.reserved.yeast)
	state.inventory.empty_keg.quantity -= float(state.capacity_board.reserved.kegs)
	state.production_batches = []
	for index in range(commitments.size()):
		state.production_batches.append(_operations_batch_from_commitment(commitments[index], index + 1))
	state.production_queue = []
	for index in range(1, state.production_batches.size()):
		state.production_queue.append(state.production_batches[index].duplicate(true))
	state.operations_active = true
	state.operations_results = []
	state.active_batch_id = str(state.production_batches[0].id)
	state.stage = "operations"
	state.capacity_board.pressure.fermenter_overlap = state.production_batches.size() > 1
	state.capacity_board.finalized = true
	state.schedule_events.append({"minute":state.game_minute,"kind":"plan_locked","batch_count":state.production_batches.size()})
	for opportunity_id in state.capacity_board.responses:
		if str(state.capacity_board.responses[opportunity_id]) == "rejected":
			state.demand.reliability = maxi(0, int(state.demand.reliability) - 2)
	_sync_active_batch_legacy()
	_log("Capacity plan locked with %d live commitment(s)." % commitments.size())
	_touch()
	return _ok("Production capacity committed.")

func _operations_batch_from_commitment(commitment: Dictionary, sequence: int) -> Dictionary:
	var renegotiated := str(commitment.status) == "renegotiated"
	var volume := 12.0 if renegotiated else 20.0
	var base_quality := 58 if str(commitment.recipe) == "Lantern Blonde" else 62
	return {
		"id":"BATCH-CAPACITY-%03d-%d" % [int(state.week_number), sequence],
		"commitment_id":str(commitment.id),
		"contract":str(commitment.label),
		"recipe":str(commitment.recipe),
		"malt_kg":float(commitment.resources.malt_kg),
		"hops_kg":float(commitment.resources.hops_kg),
		"yeast":int(commitment.resources.yeast),
		"kegs":int(commitment.resources.kegs),
		"staff_hours":int(commitment.resources.staff_hours),
		"working_cash":int(commitment.resources.cash),
		"volume_l":volume,
		"quality":base_quality,
		"safety":72,
		"flavor_tags":["capacity_plan"],
		"packaged_l":0.0,
		"status":"planned",
		"stage":"ready_to_mash" if sequence == 1 else "awaiting_preparation",
		"prepared":sequence == 1,
		"response":str(commitment.status),
		"guests":int(commitment.guests),
		"deadline_minute":int(state.game_minute) + int(commitment.deadline_days) * 24 * 60,
		"quality_target":int(commitment.quality_target),
		"advance":int(commitment.advance),
		"result":{},
		"assigned_minutes":0
	}

func _get_operations_actions() -> Array:
	var actions := []
	var batch_index := _operations_batch_index(str(state.get("active_batch_id", "")))
	if batch_index >= 0:
		actions.append_array(_operations_actions_for_batch(batch_index))
	for station_id in ["brewhouse", "fermenter", "packaging"]:
		if int(state.stations[station_id].condition) < 60 and not bool(state.stations[station_id].busy):
			actions.append(_operations_action("", "repair_%s" % station_id, "Repair %s" % str(state.stations[station_id].name), station_id, 120, "maintenance"))
	return actions

func _operations_actions_for_batch(batch_index: int) -> Array:
	if batch_index < 0 or batch_index >= state.production_batches.size(): return []
	var batch: Dictionary = state.production_batches[batch_index]
	if str(batch.stage) in ["settled", "fermenting"] or _operations_batch_has_active_job(str(batch.id)): return []
	var actions := []
	match str(batch.stage):
		"awaiting_preparation":
			actions.append(_operations_action(batch.id, "prepare", "Stage %s grain bill" % str(batch.recipe), "brewhouse", 60, "brewing"))
		"ready_to_mash":
			if int(state.stations.brewhouse.cleanliness) < 70:
				actions.append(_operations_action(batch.id, "clean_brewhouse", "Clean brewhouse for %s" % str(batch.recipe), "brewhouse", 60, "maintenance"))
			else:
				actions.append(_operations_action(batch.id, "mash", "Mash %s" % str(batch.recipe), "brewhouse", 90, "brewing"))
		"ready_to_boil":
			actions.append(_operations_action(batch.id, "boil", "Boil %s" % str(batch.recipe), "brewhouse", 70, "brewing"))
		"ready_to_transfer":
			if int(state.stations.fermenter.cleanliness) < 75 and not bool(state.stations.fermenter.busy):
				actions.append(_operations_action(batch.id, "clean_fermenter", "Clean fermenter for %s" % str(batch.recipe), "fermenter", 45, "maintenance"))
			else:
				actions.append(_operations_action(batch.id, "transfer", "Transfer %s" % str(batch.recipe), "fermenter", 45, "brewing"))
		"ready_to_package":
			if int(state.stations.packaging.cleanliness) < 75:
				actions.append(_operations_action(batch.id, "clean_packaging", "Clean filler for %s" % str(batch.recipe), "packaging", 45, "maintenance"))
			else:
				actions.append(_operations_action(batch.id, "package", "Package %s" % str(batch.recipe), "packaging", 120, "packaging"))
		"ready_to_serve":
			actions.append(_operations_action(batch.id, "deliver", "Deliver %s" % str(batch.contract), "courtyard", 90, "service"))
	return actions

func _operations_action(batch_id: String, base_action: String, label: String, station: String, duration: int, skill: String) -> Dictionary:
	return {
		"id":"ops::%s::%s" % [batch_id, base_action],
		"base_action":base_action,
		"batch_id":batch_id,
		"label":label,
		"station":station,
		"duration":duration,
		"skill":skill,
		"cash_cost":_operations_action_cost(base_action)
	}

func _start_operations_action(action_id: String, staff_id: String) -> Dictionary:
	if not bool(state.get("operations_active", false)): return _fail("The production board is not active.")
	var definition: Dictionary = {}
	for candidate in _get_operations_actions():
		if str(candidate.id) == action_id:
			definition = candidate
			break
	if definition.is_empty(): return _fail("That batch work is no longer available.")
	if not state.staff.has(staff_id): return _fail("Unknown staff member.")
	if not is_staff_available(staff_id): return _fail("%s is off shift, exhausted, or already assigned." % state.staff[staff_id].name)
	if bool(state.stations[definition.station].busy): return _fail("%s is occupied by another batch." % state.stations[definition.station].name)
	var validation := _validate_operations_start(definition)
	if not bool(validation.ok): return validation
	var skill_level := int(state.staff[staff_id].skills.get(definition.skill, 0))
	if skill_level <= 0: return _fail("%s lacks the required %s skill." % [state.staff[staff_id].name, definition.skill])
	var energy := int(state.staff[staff_id].energy)
	var adjusted_duration := estimate_action_duration(definition, staff_id)
	var job := {
		"id":"JOB-%03d" % (state.jobs.size() + 1),
		"action":action_id,
		"base_action":definition.base_action,
		"batch_id":definition.batch_id,
		"label":definition.label,
		"station":definition.station,
		"staff_id":staff_id,
		"started":state.game_minute,
		"ends":state.game_minute + adjusted_duration,
		"status":"active",
		"operations":true
	}
	state.jobs.append(job)
	state.staff[staff_id].assignment = job.id
	state.stations[definition.station].busy = true
	_apply_operations_start_costs(str(definition.base_action))
	var batch_index := _operations_batch_index(str(definition.batch_id))
	if batch_index >= 0:
		state.production_batches[batch_index].assigned_minutes = int(state.production_batches[batch_index].assigned_minutes) + adjusted_duration
	state.schedule_events.append({"minute":state.game_minute,"kind":"work_started","batch_id":definition.batch_id,"action":definition.base_action,"staff_id":staff_id,"station":definition.station})
	_log("%s assigns %s to %s." % [state.player.name, state.staff[staff_id].name, definition.label])
	_touch()
	return _ok("%s started; %d minutes. Energy %d." % [definition.label, adjusted_duration, energy])

func estimate_action_duration(action: Dictionary, staff_id: String) -> int:
	var base_duration := int(action.get("duration", 0))
	if not bool(state.get("operations_active", false)) or not state.staff.has(staff_id):
		return base_duration
	var skill_level := int(state.staff[staff_id].skills.get(str(action.get("skill", "")), 0))
	var fatigue_multiplier := 1.0
	var energy := int(state.staff[staff_id].energy)
	if energy < 50: fatigue_multiplier = 1.25
	if energy < 30: fatigue_multiplier = 1.45
	return maxi(15, int(float(base_duration) * (1.12 - skill_level * 0.08) * fatigue_multiplier))

func _validate_operations_start(definition: Dictionary) -> Dictionary:
	var base_action := str(definition.base_action)
	var station_id := str(definition.station)
	var cash_cost := _operations_action_cost(base_action)
	if int(state.cash) < cash_cost:
		return _fail("%s needs ¤%d working cash." % [str(definition.label), cash_cost])
	if not base_action.begins_with("repair_") and int(state.stations[station_id].condition) < 35:
		return _fail("%s is unsafe; repair it before committing this batch." % state.stations[station_id].name)
	if base_action == "transfer" and bool(state.stations.fermenter.busy):
		return _fail("The fermenter is occupied by another batch.")
	return _ok("")

func _apply_operations_start_costs(base_action: String) -> void:
	state.cash -= _operations_action_cost(base_action)

func _operations_action_cost(base_action: String) -> int:
	match base_action:
		"clean_brewhouse", "clean_fermenter": return 35
		"clean_packaging": return 25
		"repair_brewhouse", "repair_fermenter", "repair_packaging": return 140
	return 0

func _complete_operations_action(job: Dictionary) -> void:
	var base_action := str(job.base_action)
	var batch_index := _operations_batch_index(str(job.batch_id))
	var skill_bonus := 0
	if str(job.staff_id) != "system":
		skill_bonus = int(state.staff[job.staff_id].skills.get("brewing", 0)) - 1
		state.staff[job.staff_id].relationship = mini(100, int(state.staff[job.staff_id].relationship) + 1)
	if base_action.begins_with("repair_"):
		var repair_station := base_action.trim_prefix("repair_")
		state.stations[repair_station].condition = mini(100, int(state.stations[repair_station].condition) + 28)
		state.stations[repair_station].cleanliness = mini(100, int(state.stations[repair_station].cleanliness) + 8)
	elif batch_index >= 0:
		var batch: Dictionary = state.production_batches[batch_index]
		match base_action:
			"prepare":
				batch.prepared = true
				batch.stage = "ready_to_mash"
				state.capacity_board.pressure.overlap_prepared = true
			"clean_brewhouse":
				state.stations.brewhouse.cleanliness = 92
				batch.safety = mini(100, int(batch.safety) + 2)
			"mash":
				batch.quality = int(batch.quality) + skill_bonus
				batch.status = "in_process"
				batch.stage = "ready_to_boil"
				state.stations.brewhouse.cleanliness = maxi(0, int(state.stations.brewhouse.cleanliness) - 10)
				state.stations.brewhouse.condition = maxi(0, int(state.stations.brewhouse.condition) - 2)
			"boil":
				batch.quality = int(batch.quality) + skill_bonus
				batch.stage = "ready_to_transfer"
				state.stations.brewhouse.cleanliness = maxi(0, int(state.stations.brewhouse.cleanliness) - 20)
				state.stations.brewhouse.condition = maxi(0, int(state.stations.brewhouse.condition) - 4)
			"clean_fermenter":
				state.stations.fermenter.cleanliness = 93
				batch.safety = mini(100, int(batch.safety) + 3)
			"transfer":
				batch.quality = int(batch.quality) + skill_bonus
				batch.stage = "fermenting"
				state.stations.fermenter.cleanliness = maxi(0, int(state.stations.fermenter.cleanliness) - 12)
				state.stations.fermenter.condition = maxi(0, int(state.stations.fermenter.condition) - 3)
				state.stations.fermenter.busy = true
				var ferment_minutes := _operations_fermentation_minutes(batch)
				state.jobs.append({
					"id":"JOB-%03d" % (state.jobs.size() + 1),
					"action":"ops::%s::fermentation" % str(batch.id),
					"base_action":"fermentation",
					"batch_id":batch.id,
					"label":"%s fermentation" % str(batch.recipe),
					"station":"fermentation_clock",
					"staff_id":"system",
					"started":state.game_minute,
					"ends":state.game_minute + ferment_minutes,
					"status":"active",
					"operations":true
				})
			"fermentation":
				state.stations.fermenter.busy = false
				state.stations.fermenter.cleanliness = maxi(0, int(state.stations.fermenter.cleanliness) - 10)
				batch.quality = int(batch.quality) + 5
				batch.flavor_tags.append("clean_fermentation")
				batch.stage = "ready_to_package"
			"clean_packaging":
				state.stations.packaging.cleanliness = 92
				batch.safety = mini(100, int(batch.safety) + 2)
			"package":
				batch.packaged_l = float(batch.volume_l)
				batch.status = "packaged"
				batch.stage = "ready_to_serve"
				state.stations.packaging.cleanliness = maxi(0, int(state.stations.packaging.cleanliness) - 20)
				state.stations.packaging.condition = maxi(0, int(state.stations.packaging.condition) - 3)
			"deliver":
				batch = _settle_operations_batch(batch)
		state.production_batches[batch_index] = batch
	state.schedule_events.append({"minute":state.game_minute,"kind":"work_completed","batch_id":job.batch_id,"action":base_action,"station":job.station})
	_refresh_production_queue()
	_sync_active_batch_legacy()
	if _all_operations_batches_settled():
		state.operations_active = false
		state.stage = "operations_council"
		_log("Every capacity commitment has reached the Week %d ledger." % int(state.week_number))
	_log("Completed: %s." % base_action.replace("_", " ").capitalize())

func _operations_fermentation_minutes(batch: Dictionary) -> int:
	return 4 * 24 * 60 if str(batch.get("response", "")) == "renegotiated" else 5 * 24 * 60

func _settle_operations_batch(batch: Dictionary) -> Dictionary:
	var quality := int(batch.quality)
	var target := int(batch.quality_target)
	var late := int(state.game_minute) > int(batch.deadline_minute)
	var target_met := quality >= target
	var fulfilled := target_met and not late
	var revenue := int(batch.guests) * (24 if str(batch.commitment_id) == "abbey_table" else 30)
	if str(batch.response) == "renegotiated": revenue = int(revenue * 0.72)
	if not fulfilled: revenue = int(revenue * (0.55 if not late else 0.35))
	var trust_delta := 10 if fulfilled and str(batch.commitment_id) == "abbey_table" else 3 if fulfilled else -7
	var confidence_delta := 11 if fulfilled and str(batch.commitment_id) == "inn_cellar" else 3 if fulfilled else -8
	state.cash += revenue
	state.community_trust += trust_delta
	state.count_confidence += confidence_delta
	if str(batch.commitment_id) == "abbey_table":
		state.demand.community = clampi(int(state.demand.community) + (10 if fulfilled else -8), 0, 100)
	else:
		state.demand.premium = clampi(int(state.demand.premium) + (10 if fulfilled else -8), 0, 100)
	state.demand.reliability = clampi(int(state.demand.reliability) + (7 if fulfilled else -10), 0, 100)
	batch.status = "fulfilled" if fulfilled else "strained"
	batch.stage = "settled"
	batch.result = {
		"fulfilled":fulfilled,
		"late":late,
		"quality":quality,
		"quality_target":target,
		"revenue":revenue,
		"trust_delta":trust_delta,
		"confidence_delta":confidence_delta
	}
	state.operations_results.append({"batch_id":batch.id,"contract":batch.contract,"commitment_id":batch.commitment_id,"status":batch.status,"result":batch.result.duplicate(true)})
	return batch

func resolve_operations_council(option_id: String) -> Dictionary:
	if state.stage != "operations_council": return _fail("The production ledger is not in council.")
	state.review_count += 1
	var fulfilled := 0
	for result in state.operations_results:
		if str(result.status) == "fulfilled": fulfilled += 1
	var strained: int = state.operations_results.size() - fulfilled
	var rejected := 0
	for response in state.capacity_board.responses.values():
		if str(response) == "rejected": rejected += 1
	match option_id:
		"reinvest":
			if state.cash < 320: return _fail("The estate cannot afford the lighting project.")
			state.cash -= 320
			state.restoration += 12
			state.stations.brewhouse.condition = mini(100, int(state.stations.brewhouse.condition) + 10)
		"pay_creditor":
			state.cash -= min(500, state.cash)
			state.runway_days += 8
			state.count_confidence += 4
		"back_community":
			state.cash -= min(220, state.cash)
			state.community_trust += 9
			state.demand.community = mini(100, int(state.demand.community) + 5)
	var score: int = int(state.count_confidence) + int(state.community_trust) + int(state.restoration) + fulfilled * 18 - strained * 12 - rejected * 3
	state.council_result = {
		"score":score,
		"choice":option_id,
		"fulfilled":fulfilled,
		"strained":strained,
		"rejected":rejected,
		"demand":state.demand.duplicate(true)
	}
	if fulfilled >= 1: evaluate_authority(score)
	state.stage = "complete"
	_log("Apolline records the first multi-batch production council.")
	_touch()
	return _ok("Production council complete: %d fulfilled, %d strained." % [fulfilled, strained])

func select_operations_batch(batch_id: String) -> Dictionary:
	if not bool(state.get("operations_active", false)): return _fail("There is no active production board.")
	if _operations_batch_index(batch_id) < 0: return _fail("Unknown production batch.")
	state.active_batch_id = batch_id
	_sync_active_batch_legacy()
	_touch()
	return _ok("%s selected." % str(state.batch.recipe))

func get_operations_overview() -> Dictionary:
	var batch_rows := []
	for batch in state.get("production_batches", []):
		var active_job := _operations_job_for_batch(str(batch.id))
		var estimated := _operations_estimated_remaining(batch)
		var minutes_left := int(batch.deadline_minute) - int(state.game_minute)
		var risk := "LATE" if minutes_left < 0 else ("AT RISK" if minutes_left < estimated else ("TIGHT" if minutes_left < int(estimated * 1.25) else "ON TRACK"))
		batch_rows.append({
			"id":batch.id,
			"contract":batch.contract,
			"recipe":batch.recipe,
			"stage":batch.stage,
			"status":batch.status,
			"quality":batch.quality,
			"quality_target":batch.quality_target,
			"deadline_minute":batch.deadline_minute,
			"minutes_left":minutes_left,
			"estimated_remaining":estimated,
			"risk":risk,
			"next_step":_operations_next_step(batch),
			"conflict":_operations_conflict(batch),
			"active_job":active_job,
			"selected":str(batch.id) == str(state.get("active_batch_id", "")),
			"resources":{"malt_kg":batch.malt_kg,"hops_kg":batch.hops_kg,"yeast":batch.yeast,"kegs":batch.kegs,"staff_hours":batch.staff_hours}
		})
	var station_rows := []
	for station_id in ["brewhouse", "fermenter", "packaging", "courtyard"]:
		station_rows.append({
			"id":station_id,
			"name":state.stations[station_id].name,
			"busy":state.stations[station_id].busy,
			"condition":state.stations[station_id].condition,
			"cleanliness":state.stations[station_id].cleanliness,
			"job":_operations_job_for_station(station_id)
		})
	return {
		"batches":batch_rows,
		"stations":station_rows,
		"demand":state.get("demand", {}).duplicate(true),
		"resources":{
			"malt_kg":state.inventory.malt.quantity,
			"hops_kg":state.inventory.citrus_hops.quantity,
			"yeast":state.inventory.yeast.quantity,
			"kegs":state.inventory.empty_keg.quantity,
			"cash":state.cash
		}
	}

func _operations_estimated_remaining(batch: Dictionary) -> int:
	match str(batch.stage):
		"awaiting_preparation": return 60 + 90 + 70 + 45 + _operations_fermentation_minutes(batch) + 120 + 90
		"ready_to_mash": return 90 + 70 + 45 + _operations_fermentation_minutes(batch) + 120 + 90
		"ready_to_boil": return 70 + 45 + _operations_fermentation_minutes(batch) + 120 + 90
		"ready_to_transfer":
			var wait := 0
			var fermentation_job := _active_fermentation_job()
			if not fermentation_job.is_empty() and str(fermentation_job.batch_id) != str(batch.id):
				wait = maxi(0, int(fermentation_job.ends) - int(state.game_minute))
			return wait + 45 + _operations_fermentation_minutes(batch) + 120 + 90
		"fermenting":
			var job := _operations_job_for_batch(str(batch.id))
			return maxi(0, int(job.get("ends", state.game_minute)) - int(state.game_minute)) + 120 + 90
		"ready_to_package": return 120 + 90
		"ready_to_serve": return 90
		_: return 0

func _operations_next_step(batch: Dictionary) -> String:
	match str(batch.stage):
		"awaiting_preparation": return "Stage grain bill"
		"ready_to_mash": return "Mash"
		"ready_to_boil": return "Boil"
		"ready_to_transfer": return "Transfer"
		"fermenting": return "Fermentation running"
		"ready_to_package": return "Package"
		"ready_to_serve": return "Deliver"
		"settled": return "Account settled"
	return "Review"

func _operations_conflict(batch: Dictionary) -> String:
	var stage := str(batch.stage)
	if stage == "ready_to_transfer" and bool(state.stations.fermenter.busy):
		var fermentation_job := _active_fermentation_job()
		if not fermentation_job.is_empty() and str(fermentation_job.batch_id) != str(batch.id): return "FERMENTER OCCUPIED"
	if stage in ["awaiting_preparation", "ready_to_mash", "ready_to_boil"] and bool(state.stations.brewhouse.busy): return "BREWHOUSE OCCUPIED"
	if stage == "ready_to_package" and bool(state.stations.packaging.busy): return "FILLER OCCUPIED"
	return ""

func _operations_batch_index(batch_id: String) -> int:
	for index in range(state.get("production_batches", []).size()):
		if str(state.production_batches[index].id) == batch_id: return index
	return -1

func _operations_batch_has_active_job(batch_id: String) -> bool:
	return not _operations_job_for_batch(batch_id).is_empty()

func _operations_job_for_batch(batch_id: String) -> Dictionary:
	for job in _active_jobs():
		if str(job.get("batch_id", "")) == batch_id: return job
	return {}

func _operations_job_for_station(station_id: String) -> Dictionary:
	for job in _active_jobs():
		if str(job.get("station", "")) == station_id: return job
		if station_id == "fermenter" and str(job.get("station", "")) == "fermentation_clock": return job
	return {}

func _active_fermentation_job() -> Dictionary:
	for job in _active_jobs():
		if str(job.get("base_action", "")) == "fermentation": return job
	return {}

func _refresh_production_queue() -> void:
	state.production_queue = []
	for batch in state.get("production_batches", []):
		if str(batch.id) != str(state.get("active_batch_id", "")) and str(batch.stage) != "settled":
			state.production_queue.append(batch.duplicate(true))

func _sync_active_batch_legacy() -> void:
	var index := _operations_batch_index(str(state.get("active_batch_id", "")))
	if index < 0: return
	var batch: Dictionary = state.production_batches[index]
	state.active_week_plan = str(batch.commitment_id)
	state.batch = batch.duplicate(true)
	state.promise = {
		"plan_id":batch.commitment_id,
		"name":batch.contract,
		"guests":batch.guests,
		"deadline_minute":batch.deadline_minute,
		"quality_target":batch.quality_target,
		"status":batch.status,
		"advance":batch.advance
	}

func _all_operations_batches_settled() -> bool:
	if state.get("production_batches", []).is_empty(): return false
	for batch in state.production_batches:
		if str(batch.stage) != "settled": return false
	return true

func _restore_staff_energy(days_elapsed: int) -> void:
	for staff_id in state.staff:
		state.staff[staff_id].energy = mini(100, int(state.staff[staff_id].energy) + days_elapsed * 14)
	state.last_energy_day = int(state.game_minute) / 1440

func _has_actionable_parallel_work() -> bool:
	for batch_index in range(state.get("production_batches", []).size()):
		if _operations_batch_has_active_job(str(state.production_batches[batch_index].id)): continue
		for action in _operations_actions_for_batch(batch_index):
			if bool(state.stations[action.station].busy): continue
			if _any_staff_can_do(action): return true
	return false

func _any_staff_can_do(action: Dictionary) -> bool:
	for staff_id in state.staff:
		if is_staff_available(staff_id) and int(state.staff[staff_id].skills.get(str(action.skill), 0)) > 0: return true
	return false

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
	if int(staff.energy) < 15: return false
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
	if not state.has("delivery_problem"): state.delivery_problem = {}
	if not state.has("delivery_recovery"): state.delivery_recovery = {}
	if not state.has("capacity_board"): state.capacity_board = {}
	if not state.has("production_queue"): state.production_queue = []
	if not state.has("operations_active"): state.operations_active = false
	if not state.has("production_batches"): state.production_batches = []
	if not state.has("active_batch_id"): state.active_batch_id = ""
	if not state.has("operations_results"): state.operations_results = []
	if not state.has("demand"): state.demand = {"community":50,"premium":45,"reliability":50}
	if not state.has("last_energy_day"): state.last_energy_day = int(state.game_minute) / 1440
	if not state.has("schedule_events"): state.schedule_events = []
	if not state.has("brewhouse_inspected"): state.brewhouse_inspected = str(state.stage) != "appointment" and str(state.stage) != "recommission"
	if not state.promise.has("plan_id"): state.promise.plan_id = str(state.active_week_plan)
	if not state.promise.has("quality_target"): state.promise.quality_target = 58
	if not state.promise.has("venue") and int(state.get("week_number", 1)) == 1: state.promise.venue = "village_inn"
	if state.inventory.has("malt") and not state.inventory.malt.has("source"): state.inventory.malt.source = "estate_bakehouse"
	if state.inventory.has("yeast") and not state.inventory.yeast.has("source"): state.inventory.yeast.source = "estate_bakehouse"
	if state.inventory.has("citrus_hops") and not state.inventory.citrus_hops.has("status"): state.inventory.citrus_hops.status = "requires_inspection" if float(state.inventory.citrus_hops.quantity) <= 0.0 else "usable"
	if bool(state.operations_active): _sync_active_batch_legacy()
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
	if state.pending_issue == "missing_hops": return "The millstream hops must be inspected before use. Choose the beer’s direction."
	if state.pending_issue == "amber_lauter_stall": return "The Stable Amber runoff has stalled. Choose how hard to push the old copper."
	match state.stage:
		"appointment": return "Accept the Count's mandate and take the stable key."
		"recommission": return "SELECT THE COPPER BREWHOUSE TO INSPECT ITS CONDITION." if not bool(state.get("brewhouse_inspected", false)) else "Review the copper’s condition, then assign its recommissioning work."
		"week_planning": return "Choose which Week %d commitment the Old Stables will accept." % int(state.week_number)
		"capacity_planning": return "Answer both overlapping opportunities within the estate's malt, keg, staff, and cash limits."
		"operations": return "Choose which batch, worker, and station receives the next block of capacity."
		"operations_council": return "Review every fulfilled, strained, and rejected commitment."
		"ready_to_mash": return "Commit %.1f kg of malt and begin %s." % [float(state.batch.get("malt_kg", 4.2)), str(state.batch.recipe)]
		"ready_to_boil": return "Boil the wort using the chosen ingredient plan."
		"ready_to_transfer": return "Transfer, pitch the house yeast, and seal the fermenter."
		"fermenting": return "Arrange the village inn delivery while fermentation works." if int(state.week_number) == 1 else "Prepare the estate while fermentation works."
		"ready_to_package": return "Package the finished beer into the first 20 L keg."
		"ready_to_serve": return "Deliver the first keg through the village inn." if int(state.week_number) == 1 else "Keep the promise: open the courtyard and serve the batch."
		"delivery_recovery": return "Choose how the Old Stables will recover the strained delivery."
		"council": return "Face Apolline and the Count at the weekly council."
		"complete": return "Choose any restoration investment, then begin the next brewing week."
	return "Restore the estate one batch at a time."

func _ok(message: String) -> Dictionary: return {"ok":true,"message":message}
func _fail(message: String) -> Dictionary: return {"ok":false,"message":message}
func _log(message: String) -> void: state.log.append("%s — %s" % [format_time(), message])
func _touch() -> void: revision += 1
