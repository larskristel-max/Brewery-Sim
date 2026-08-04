extends SceneTree

const REQUIRED_BUSES := ["Master", "Music", "Ambience", "SFX", "UI"]
const REQUIRED_CUES := [
	"ui_focus", "ui_press", "ui_confirm", "ui_cancel", "ui_invalid", "ui_warning",
	"ui_panel_open", "ui_panel_close", "ui_page_turn", "cinematic_advance", "cinematic_skip", "sound_check",
	"contract_accept", "contract_complete", "contract_fail", "resource_gain", "resource_spend",
	"day_advance", "council_result_positive", "council_result_mixed", "council_result_negative",
	"brewery_doors", "light_furnace", "add_malt", "stir_mash", "adjust_heat", "valve",
	"transfer_wort", "pitch_yeast", "inspect_fermentation", "clean_workstation", "prepare_cask",
	"roll_cask", "drive_bung", "fill_cask", "load_delivery", "repair_equipment", "receive_ingredients",
]

var failures: Array[String] = []

func _init() -> void:
	call_deferred("_run")

func _run() -> void:
	var director = root.get_node_or_null("AudioDirector")
	_expect(director != null, "AudioDirector autoload is missing")
	if director == null:
		quit(1)
		return
	for bus_name in REQUIRED_BUSES:
		_expect(AudioServer.get_bus_index(bus_name) >= 0, "Required audio bus is missing: %s" % bus_name)
	for cue_id in REQUIRED_CUES:
		var cue: Dictionary = director.get_cue_definition(cue_id)
		_expect(not cue.is_empty(), "Required cue is not declared: %s" % cue_id)
		for variant in cue.get("streams", []):
			var path := str(variant.get("path", ""))
			_expect(not path.is_empty() and ResourceLoader.exists(path), "Cue %s has a missing stream: %s" % [cue_id, path])
			_expect(path.ends_with(".mp3"), "Cue %s is not using the cross-browser MP3 palette: %s" % [cue_id, path])
	for environment_id in ["title", "appointment", "awakening_dormant", "awakening_inhabited", "brewhouse_idle", "mash_boil", "fermentation", "packaging", "courtyard", "council"]:
		var ambience: Dictionary = director.get_ambience_definition(environment_id)
		var ambience_path := str(ambience.get("stream", ""))
		_expect(not ambience_path.is_empty() and ResourceLoader.exists(ambience_path), "Ambience %s has a missing stream: %s" % [environment_id, ambience_path])
		_expect(ambience_path.ends_with(".mp3"), "Ambience %s is not using the cross-browser MP3 palette: %s" % [environment_id, ambience_path])

	_expect(not director.play_cue("ui_press"), "Audio played before browser/player unlock")
	_expect(director.set_ambience("appointment", 0.05), "Locked audio did not retain its requested story ambience")
	_expect(director.active_ambience_player_count() == 0, "Ambience played before browser/player unlock")
	director.unlock_audio()
	await create_timer(0.08).timeout
	_expect(director.current_ambience == "appointment", "Browser unlock lost the queued story ambience")
	var unlocked_deck = director._ambience_players[director._active_ambience_index]
	_expect(unlocked_deck.stream == null, "Continuous background ambience should remain silent after unlock")
	_expect(director.active_ambience_player_count() == 0, "Continuous background ambience started after unlock")
	_expect(director.play_cue("ui_press"), "Unlocked UI cue did not play")
	_expect(director.play_cue("sound_check", true), "Opening sound-check cue did not resolve")
	_expect(not director.play_cue("ui_press"), "Rapid-click cooldown did not limit an identical UI cue")

	director.set_interface_sounds_enabled(false, false)
	_expect(not director.play_cue("ui_confirm", true), "Interface preference did not suppress UI feedback")
	_expect(director.play_cue("add_malt", true), "Interface preference incorrectly suppressed physical SFX")
	director.set_interface_sounds_enabled(true, false)

	director.set_mobile_mode(true)
	_expect(not director.play_cue("ui_focus", true), "Mobile mode emitted a hover/focus sound")
	director.set_mobile_mode(false)
	_expect(director.play_cue("ui_focus", true), "Desktop focus cue did not resolve")

	var disabled := Button.new()
	disabled.disabled = true
	_expect(not director.play_control_cue(disabled, "ui_press"), "Disabled control emitted audio")
	disabled.queue_free()
	_expect(not director.play_cue("cue_that_does_not_exist", true), "Missing cue did not fail safely")

	_expect(not director.set_ambience("appointment", 0.05), "Repeated appointment state duplicated ambience after unlock")
	await process_frame
	_expect(not director.set_ambience("appointment", 0.05), "Repeated state entry duplicated ambience")
	var before_resume: int = director.active_ambience_player_count()
	director.suspend_audio()
	director.resume_audio()
	_expect(director.active_ambience_player_count() == before_resume, "Focus resume duplicated ambience loops")
	director.sync_to_simulation({"stage":"fermenting"}, true)
	_expect(director.current_ambience == "fermentation", "Simulation state did not select fermentation ambience")
	await create_timer(0.30).timeout
	_expect(director.active_ambience_player_count() <= 1, "Ambience transition left duplicate active loops")
	director.sync_to_simulation({"stage":"fermenting"}, true)
	_expect(director.current_ambience == "fermentation", "Save/load-style state restoration changed ambience incorrectly")

	await create_timer(0.3).timeout
	var action_count: int = director.playback_count("add_malt")
	_expect(director.play_action("mash"), "Physical mash action did not map to grain audio")
	_expect(not director.play_action("mash"), "One physical action triggered more than once inside its cooldown")
	_expect(director.playback_count("add_malt") == action_count + 1, "Physical action playback accounting is incorrect")
	_expect(not director.get_cue_definition("ui_invalid").is_empty(), "Invalid-action mapping is missing")

	var original_path: String = director.settings_path
	var test_path := "user://old_stables_audio_test.cfg"
	director.settings_path = test_path
	director.set_bus_volume_linear("Music", 0.31, false)
	director.set_bus_volume_linear("Ambience", 0.0, false)
	director.set_interface_sounds_enabled(false, false)
	director.save_settings()
	director.set_bus_volume_linear("Music", 0.9, false)
	director.set_bus_volume_linear("Ambience", 0.9, false)
	director.set_interface_sounds_enabled(true, false)
	director.load_settings()
	_expect(absf(director.get_bus_volume_linear("Music") - 0.31) < 0.02, "Music volume did not persist")
	_expect(director.get_bus_volume_linear("Ambience") == 0.0, "Mute state did not persist")
	_expect(not director.interface_sounds_enabled, "Interface-sound preference did not persist")
	director.settings_path = original_path
	if FileAccess.file_exists(test_path):
		DirAccess.remove_absolute(ProjectSettings.globalize_path(test_path))

	var exit_code := 0
	if failures.is_empty():
		print("Old Stables audio director test: PASS (buses, cues, state, persistence, limiting, mobile and safe fallback)")
	else:
		for failure in failures:
			push_error(failure)
		exit_code = 1
	director.stop_all_audio()
	root.remove_child(director)
	director.free()
	quit(exit_code)

func _expect(condition: bool, message: String) -> void:
	if not condition:
		failures.append(message)
