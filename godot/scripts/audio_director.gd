extends Node

signal audio_unlocked
signal ambience_changed(environment_id: String)
signal settings_changed

const MANIFEST_PATH := "res://assets/audio/audio_manifest.json"
const SETTINGS_PATH := "user://old_stables_audio.cfg"
const REQUIRED_BUSES := ["Master", "Music", "Ambience", "SFX", "UI"]
const DEFAULT_VOLUMES := {
	"Master": 0.80,
	"Music": 0.62,
	"Ambience": 0.72,
	"SFX": 0.82,
	"UI": 0.72,
}
const POOL_SIZE := 10
# Continuous rain/fire room beds competed with reading and decision-making in
# phone playtests. Keep the scene map for sparse environmental one-shots and
# future opt-in mixing, but leave its looping layer silent by default.
const CONTINUOUS_AMBIENCE_ENABLED := false

var manifest: Dictionary = {}
var era := "1901"
var unlocked := false
var interface_sounds_enabled := true
var current_ambience := ""
var current_music := ""
var mobile_mode := false
var settings_path := SETTINGS_PATH

var _ambience_players: Array[AudioStreamPlayer] = []
var _music_players: Array[AudioStreamPlayer] = []
var _voice_players: Array[AudioStreamPlayer] = []
var _environment_cues: Array = []
var _voice_deadline_ms := {}
var _environment_due_ms := -1
var _pending_double_tails: Array = []
var _active_ambience_index := 0
var _active_music_index := 0
var _environment_generation := 0
var _last_variant := {}
var _last_played_ms := {}
var _voice_cue := {}
var _play_counts := {}
var _missing_assets := {}
var _suspended := false
var _rng := RandomNumberGenerator.new()

func _ready() -> void:
	_rng.randomize()
	_ensure_buses()
	_build_players()
	_load_manifest()
	load_settings()
	_detect_mobile_mode()
	set_process(true)

func _process(_delta: float) -> void:
	var now := Time.get_ticks_msec()
	for voice_id in _voice_deadline_ms.keys():
		if now >= int(_voice_deadline_ms[voice_id]):
			for player in _voice_players:
				if player.get_instance_id() == int(voice_id):
					player.stop()
					_voice_cue.erase(voice_id)
					break
			_voice_deadline_ms.erase(voice_id)
	if _environment_due_ms >= 0 and now >= _environment_due_ms:
		_environment_due_ms = -1
		_on_environment_timeout()
	for pending in _pending_double_tails.duplicate():
		if now >= int(pending.due_ms):
			_play_double_tail(str(pending.cue_id), pending.stream, str(pending.bus), float(pending.volume_db))
			_pending_double_tails.erase(pending)

func _notification(what: int) -> void:
	if what == NOTIFICATION_APPLICATION_FOCUS_OUT:
		# Web fullscreen can briefly report focus loss while the browser moves the
		# canvas. Pausing here leaves some mobile browsers silent after the move;
		# the browser already suspends background tabs itself.
		if not OS.has_feature("web"):
			suspend_audio()
	elif what == NOTIFICATION_APPLICATION_FOCUS_IN:
		resume_audio()

func _ensure_buses() -> void:
	for bus_name in REQUIRED_BUSES:
		if AudioServer.get_bus_index(bus_name) == -1:
			AudioServer.add_bus()
			AudioServer.set_bus_name(AudioServer.bus_count - 1, bus_name)
	var master_index := AudioServer.get_bus_index("Master")
	for bus_name in ["Music", "Ambience", "SFX", "UI"]:
		var index := AudioServer.get_bus_index(bus_name)
		if index >= 0:
			AudioServer.set_bus_send(index, "Master")
	if master_index >= 0:
		AudioServer.set_bus_send(master_index, "")

func _build_players() -> void:
	for index in range(2):
		var ambience := AudioStreamPlayer.new()
		ambience.name = "Ambience%d" % index
		ambience.bus = "Ambience"
		ambience.volume_db = -80.0
		add_child(ambience)
		_ambience_players.append(ambience)
		var music := AudioStreamPlayer.new()
		music.name = "Music%d" % index
		music.bus = "Music"
		music.volume_db = -80.0
		add_child(music)
		_music_players.append(music)
	for index in range(POOL_SIZE):
		var voice := AudioStreamPlayer.new()
		voice.name = "Voice%d" % index
		voice.bus = "SFX"
		voice.finished.connect(_on_voice_finished.bind(voice))
		add_child(voice)
		_voice_players.append(voice)

func _load_manifest() -> void:
	manifest = {}
	if not FileAccess.file_exists(MANIFEST_PATH):
		push_warning("Audio manifest is missing; Old Stables will remain safely silent.")
		return
	var file := FileAccess.open(MANIFEST_PATH, FileAccess.READ)
	var parsed = JSON.parse_string(file.get_as_text())
	if parsed is Dictionary:
		manifest = parsed
	else:
		push_warning("Audio manifest is invalid; Old Stables will remain safely silent.")

func unlock_audio() -> void:
	if unlocked:
		return
	_browser_audio_call("unlock")
	var pending_ambience := current_ambience
	var pending_music := current_music
	unlocked = true
	# Web audio begins suspended. Re-enter any state selected while the title was
	# visible so the first deliberate player gesture starts the actual soundscape.
	current_ambience = ""
	current_music = ""
	if not pending_ambience.is_empty():
		set_ambience(pending_ambience, 0.35)
	if not pending_music.is_empty():
		set_music(pending_music, 0.8)
	audio_unlocked.emit()

func set_mobile_mode(value: bool) -> void:
	mobile_mode = value

func _detect_mobile_mode() -> void:
	if OS.has_feature("web"):
		mobile_mode = DisplayServer.screen_get_size().x <= 1100
	else:
		mobile_mode = OS.has_feature("mobile")

func play_cue(cue_id: String, force := false) -> bool:
	if not unlocked and not force:
		return false
	var cue := get_cue_definition(cue_id)
	if cue.is_empty():
		_missing_assets[cue_id] = "undefined cue"
		return false
	var bus_name := str(cue.get("bus", "SFX"))
	if bus_name == "UI" and not interface_sounds_enabled:
		return false
	if cue_id == "ui_focus" and mobile_mode:
		return false
	var now := Time.get_ticks_msec()
	var cooldown := int(cue.get("cooldown_ms", 0))
	if not force and now - int(_last_played_ms.get(cue_id, -cooldown - 1)) < cooldown:
		return false
	var variants: Array = cue.get("streams", [])
	if variants.is_empty():
		_missing_assets[cue_id] = "no streams"
		return false
	var variant_index := _choose_variant(cue_id, variants.size())
	var variant: Dictionary = variants[variant_index]
	var stream_path := str(variant.get("path", ""))
	if stream_path.is_empty() or not ResourceLoader.exists(stream_path):
		_missing_assets[cue_id] = stream_path if not stream_path.is_empty() else "missing path"
		return false
	var pitch := _rng.randf_range(0.975, 1.025)
	if _use_browser_audio():
		var browser_played := _browser_audio_call("playCue", {
			"cue_id": cue_id,
			"stream": stream_path,
			"offset": float(variant.get("offset", 0.0)),
			"duration": float(variant.get("duration", 0.0)),
			"volume_db": float(cue.get("volume_db", -18.0)) + _rng.randf_range(-0.6, 0.6),
			"pitch": pitch,
			"bus": bus_name,
			"double": bool(cue.get("double", false)),
		})
		if browser_played:
			_last_played_ms[cue_id] = now
			_last_variant[cue_id] = variant_index
			_play_counts[cue_id] = int(_play_counts.get(cue_id, 0)) + 1
		return browser_played
	var stream := _load_stream(stream_path, false)
	if stream == null:
		_missing_assets[cue_id] = stream_path
		return false
	var player := _claim_voice(cue_id)
	if player == null:
		return false
	player.bus = bus_name
	player.stream = stream
	player.volume_db = float(cue.get("volume_db", -18.0)) + _rng.randf_range(-0.6, 0.6)
	player.pitch_scale = pitch
	_voice_cue[player.get_instance_id()] = cue_id
	_last_played_ms[cue_id] = now
	_last_variant[cue_id] = variant_index
	_play_counts[cue_id] = int(_play_counts.get(cue_id, 0)) + 1
	player.play(float(variant.get("offset", 0.0)))
	var duration := float(variant.get("duration", 0.0))
	if duration > 0.0:
		_voice_deadline_ms[player.get_instance_id()] = now + int(duration * 1000.0)
	if bool(cue.get("double", false)):
		_pending_double_tails.append({
			"due_ms": now + 100,
			"cue_id": cue_id,
			"stream": stream,
			"bus": bus_name,
			"volume_db": float(cue.get("volume_db", -18.0)) - 2.0,
		})
	return true

func play_control_cue(control: BaseButton, cue_id: String) -> bool:
	if control == null or control.disabled:
		return false
	return play_cue(cue_id)

func _play_double_tail(cue_id: String, stream: AudioStream, bus_name: String, volume_db: float) -> void:
	if not interface_sounds_enabled or not unlocked:
		return
	var player := _claim_voice(cue_id)
	if player == null:
		return
	player.bus = bus_name
	player.stream = stream
	player.volume_db = volume_db
	player.pitch_scale = 0.985
	_voice_cue[player.get_instance_id()] = cue_id
	player.play()

func _choose_variant(cue_id: String, count: int) -> int:
	if count <= 1:
		return 0
	var previous := int(_last_variant.get(cue_id, -1))
	var choice := _rng.randi_range(0, count - 1)
	if choice == previous:
		choice = (choice + 1 + _rng.randi_range(0, count - 2)) % count
	return choice

func _claim_voice(cue_id: String) -> AudioStreamPlayer:
	for player in _voice_players:
		if not player.playing:
			return player
	# Rapid tapping should replace the oldest matching voice, not build a wall.
	for player in _voice_players:
		if str(_voice_cue.get(player.get_instance_id(), "")) == cue_id:
			player.stop()
			return player
	return null

func _on_voice_finished(player: AudioStreamPlayer) -> void:
	_voice_deadline_ms.erase(player.get_instance_id())
	_voice_cue.erase(player.get_instance_id())

func set_ambience(environment_id: String, fade_seconds := 2.0) -> bool:
	if environment_id == current_ambience and (not CONTINUOUS_AMBIENCE_ENABLED or _use_browser_audio() or _ambience_players[_active_ambience_index].playing):
		return false
	var definition := get_ambience_definition(environment_id)
	if definition.is_empty():
		_missing_assets[environment_id] = "undefined ambience"
		return false
	current_ambience = environment_id
	_environment_generation += 1
	var generation := _environment_generation
	if not unlocked:
		return true
	if not CONTINUOUS_AMBIENCE_ENABLED:
		_browser_audio_call("stopAmbience", {"fade_seconds": minf(fade_seconds, 0.25)})
		for player in _ambience_players:
			player.stop()
			player.stream = null
		_schedule_environment_one_shot(generation)
		ambience_changed.emit(environment_id)
		return true
	var stream_path := str(definition.get("stream", ""))
	if stream_path.is_empty() or not ResourceLoader.exists(stream_path):
		_missing_assets[environment_id] = stream_path if not stream_path.is_empty() else "missing path"
		return false
	if _use_browser_audio():
		var browser_started := _browser_audio_call("setAmbience", {
			"environment_id": environment_id,
			"stream": stream_path,
			"volume_db": float(definition.get("volume_db", -20.0)),
			"fade_seconds": fade_seconds,
		})
		if browser_started:
			_schedule_environment_one_shot(generation)
			ambience_changed.emit(environment_id)
		return browser_started
	var stream := _load_stream(stream_path, true)
	if stream == null:
		_missing_assets[environment_id] = stream_path
		return false
	var old_player := _ambience_players[_active_ambience_index]
	_active_ambience_index = 1 - _active_ambience_index
	var new_player := _ambience_players[_active_ambience_index]
	new_player.stop()
	new_player.stream = stream
	new_player.volume_db = -80.0
	new_player.play()
	var target_db := float(definition.get("volume_db", -20.0))
	var fade := clampf(fade_seconds, 0.05, 8.0)
	var tween := create_tween().set_parallel(true)
	tween.tween_property(new_player, "volume_db", target_db, fade)
	if old_player.playing:
		tween.tween_property(old_player, "volume_db", -80.0, fade)
		tween.chain().tween_callback(old_player.stop)
	_schedule_environment_one_shot(generation)
	ambience_changed.emit(environment_id)
	return true

func stop_ambience(fade_seconds := 1.5) -> void:
	current_ambience = ""
	_environment_generation += 1
	_browser_audio_call("stopAmbience", {"fade_seconds": fade_seconds})
	for player in _ambience_players:
		if player.playing:
			var tween := create_tween()
			tween.tween_property(player, "volume_db", -80.0, fade_seconds)
			tween.tween_callback(player.stop)

func set_music(music_id: String, fade_seconds := 4.0) -> bool:
	if music_id == current_music and (_use_browser_audio() or _music_players[_active_music_index].playing):
		return false
	var definition := get_music_definition(music_id)
	current_music = music_id
	if definition.is_empty() or bool(definition.get("placeholder", false)):
		stop_music(fade_seconds)
		return false
	if not unlocked:
		return true
	var stream_path := str(definition.get("stream", ""))
	if stream_path.is_empty() or not ResourceLoader.exists(stream_path):
		_missing_assets[music_id] = stream_path if not stream_path.is_empty() else "missing path"
		return false
	if _use_browser_audio():
		return _browser_audio_call("setMusic", {
			"music_id": music_id,
			"stream": stream_path,
			"volume_db": float(definition.get("volume_db", -24.0)),
			"fade_seconds": fade_seconds,
		})
	var stream := _load_stream(stream_path, false)
	if stream == null:
		_missing_assets[music_id] = stream_path
		return false
	var old_player := _music_players[_active_music_index]
	_active_music_index = 1 - _active_music_index
	var new_player := _music_players[_active_music_index]
	new_player.stop()
	new_player.stream = stream
	new_player.volume_db = -80.0
	new_player.play()
	var tween := create_tween().set_parallel(true)
	tween.tween_property(new_player, "volume_db", float(definition.get("volume_db", -24.0)), fade_seconds)
	if old_player.playing:
		tween.tween_property(old_player, "volume_db", -80.0, fade_seconds)
		tween.chain().tween_callback(old_player.stop)
	return true

func stop_music(fade_seconds := 2.0) -> void:
	current_music = ""
	_browser_audio_call("stopMusic", {"fade_seconds": fade_seconds})
	for player in _music_players:
		if player.playing:
			var tween := create_tween()
			tween.tween_property(player, "volume_db", -80.0, fade_seconds)
			tween.tween_callback(player.stop)

func _schedule_environment_one_shot(generation: int) -> void:
	var definition := get_ambience_definition(current_ambience)
	_environment_cues = definition.get("one_shots", [])
	if _environment_cues.is_empty() or not unlocked:
		_environment_due_ms = -1
		return
	if generation == _environment_generation:
		_environment_due_ms = Time.get_ticks_msec() + int(_rng.randf_range(9000.0, 21000.0))

func _on_environment_timeout() -> void:
	if _suspended or not unlocked or _environment_cues.is_empty():
		return
	play_cue(str(_environment_cues[_rng.randi_range(0, _environment_cues.size() - 1)]))
	_schedule_environment_one_shot(_environment_generation)

func sync_to_simulation(state: Dictionary, immediate := false) -> void:
	var stage := str(state.get("stage", ""))
	var environment_id := "brewhouse_idle"
	if stage == "appointment":
		environment_id = "appointment"
	elif stage in ["ready_to_mash", "ready_to_boil", "ready_to_transfer"]:
		environment_id = "mash_boil"
	elif stage in ["fermenting", "conditioning"]:
		environment_id = "fermentation"
	elif stage == "ready_to_package":
		environment_id = "packaging"
	elif stage in ["ready_to_serve", "delivery_recovery"]:
		environment_id = "courtyard"
	elif stage in ["council", "operations_council", "complete"]:
		environment_id = "council"
	set_ambience(environment_id, 0.08 if immediate else 2.2)

func begin_story_context(context: String) -> void:
	match context:
		"appointment":
			set_ambience("appointment", 2.0)
			set_music("appointment_theme", 5.0)
		"awakening":
			set_ambience("awakening_dormant", 2.0)
			stop_music(3.0)

func handle_cinematic_beat(context: String, beat_kind: String) -> void:
	if context == "awakening":
		match beat_kind:
			"lamp":
				play_cue("light_furnace")
				set_ambience("awakening_inhabited", 2.5)
				set_music("awakening_theme", 6.0)
			"ledger": play_cue("ui_page_turn")
			"work": play_cue("prepare_cask")
	elif context == "appointment":
		match beat_kind:
			"bell": play_cue("environment_distant_bell")
			"ledger": play_cue("ui_page_turn")
			"appointment": play_cue("ui_confirm")
			"key": play_cue("valve")

func play_action(action_id: String) -> bool:
	var base_id := action_id
	if action_id.begins_with("ops::"):
		base_id = action_id.get_slice("::", 2)
	var mapping := {
		"recommission": "repair_equipment",
		"clean_brewhouse": "clean_workstation",
		"clean_fermenter": "clean_workstation",
		"repair_brewhouse": "repair_equipment",
		"light_furnace": "light_furnace",
		"mash": "add_malt",
		"mash_in": "add_malt",
		"stir_mash": "stir_mash",
		"boil": "adjust_heat",
		"boil_wort": "adjust_heat",
		"transfer": "transfer_wort",
		"transfer_wort": "transfer_wort",
		"pitch_yeast": "pitch_yeast",
		"inspect_fermentation": "inspect_fermentation",
		"clean_packaging": "clean_workstation",
		"prepare": "receive_ingredients",
		"prepare_next_batch": "receive_ingredients",
		"prepare_courtyard": "roll_cask",
		"prepare_labels": "ui_page_turn",
		"prepare_packaging": "prepare_cask",
		"package": "fill_cask",
		"package_batch": "fill_cask",
		"load_delivery": "load_delivery",
		"load_first_keg": "load_delivery",
		"deliver": "load_delivery",
		"serve": "load_delivery",
		"receive_ingredients": "receive_ingredients",
		"repair": "repair_equipment",
	}
	return play_cue(str(mapping.get(base_id, "ui_confirm")))

func suspend_audio() -> void:
	if _suspended:
		return
	_suspended = true
	_browser_audio_call("suspend")
	for player in _ambience_players + _music_players + _voice_players:
		player.stream_paused = true

func resume_audio() -> void:
	if not _suspended:
		return
	_suspended = false
	_browser_audio_call("resume")
	for player in _ambience_players + _music_players + _voice_players:
		if is_instance_valid(player):
			player.stream_paused = false
	# Re-entry never starts another loop; it only resumes the existing decks.

func stop_all_audio() -> void:
	_environment_generation += 1
	current_ambience = ""
	current_music = ""
	_environment_due_ms = -1
	_environment_cues.clear()
	_voice_deadline_ms.clear()
	_pending_double_tails.clear()
	_browser_audio_call("stopAll")
	for player in _ambience_players + _music_players + _voice_players:
		player.stop()
		player.stream = null
	_voice_cue.clear()

func set_bus_volume_linear(bus_name: String, value: float, persist := true) -> void:
	var index := AudioServer.get_bus_index(bus_name)
	if index < 0:
		return
	var linear := clampf(value, 0.0, 1.0)
	AudioServer.set_bus_volume_db(index, -80.0 if linear <= 0.001 else linear_to_db(linear))
	AudioServer.set_bus_mute(index, linear <= 0.001)
	if persist:
		save_settings()
	_sync_browser_settings()
	settings_changed.emit()

func get_bus_volume_linear(bus_name: String) -> float:
	var index := AudioServer.get_bus_index(bus_name)
	if index < 0 or AudioServer.is_bus_mute(index):
		return 0.0
	return db_to_linear(AudioServer.get_bus_volume_db(index))

func set_interface_sounds_enabled(value: bool, persist := true) -> void:
	interface_sounds_enabled = value
	if persist:
		save_settings()
	_sync_browser_settings()
	settings_changed.emit()

func save_settings() -> void:
	var config := ConfigFile.new()
	for bus_name in REQUIRED_BUSES:
		config.set_value("audio", bus_name.to_lower(), get_bus_volume_linear(bus_name))
	config.set_value("audio", "interface_sounds", interface_sounds_enabled)
	var error := config.save(settings_path)
	if error != OK:
		push_warning("Could not save audio preferences: %s" % error_string(error))

func load_settings() -> void:
	var config := ConfigFile.new()
	var error := config.load(settings_path)
	for bus_name in REQUIRED_BUSES:
		var fallback := float(DEFAULT_VOLUMES.get(bus_name, 0.8))
		var value := fallback if error != OK else float(config.get_value("audio", bus_name.to_lower(), fallback))
		set_bus_volume_linear(bus_name, value, false)
	interface_sounds_enabled = true if error != OK else bool(config.get_value("audio", "interface_sounds", true))
	_sync_browser_settings()

func _use_browser_audio() -> bool:
	if not OS.has_feature("web"):
		return false
	return bool(JavaScriptBridge.eval("Boolean(window.__oldStablesBrowserAudio && window.__oldStablesBrowserAudio.isIOS)", true))

func _browser_audio_call(method: String, payload: Dictionary = {}) -> bool:
	if not _use_browser_audio():
		return false
	var method_json := JSON.stringify(method)
	var payload_json := JSON.stringify(payload)
	var result = JavaScriptBridge.eval(
		"window.__oldStablesBrowserAudio[%s](%s)" % [method_json, payload_json],
		true
	)
	return true if result == null else bool(result)

func _sync_browser_settings() -> void:
	if not _use_browser_audio():
		return
	_browser_audio_call("syncSettings", {
		"Master": get_bus_volume_linear("Master"),
		"Music": get_bus_volume_linear("Music"),
		"Ambience": get_bus_volume_linear("Ambience"),
		"SFX": get_bus_volume_linear("SFX"),
		"UI": get_bus_volume_linear("UI"),
		"interfaceSounds": interface_sounds_enabled,
	})

func get_cue_definition(cue_id: String) -> Dictionary:
	return manifest.get("cues", {}).get(cue_id, {})

func get_ambience_definition(environment_id: String) -> Dictionary:
	return manifest.get("eras", {}).get(era, {}).get("ambience", {}).get(environment_id, {})

func get_music_definition(music_id: String) -> Dictionary:
	return manifest.get("eras", {}).get(era, {}).get("music", {}).get(music_id, {})

func declared_cue_ids() -> Array:
	return manifest.get("cues", {}).keys()

func missing_assets() -> Dictionary:
	return _missing_assets.duplicate(true)

func playback_count(cue_id: String) -> int:
	return int(_play_counts.get(cue_id, 0))

func active_ambience_player_count() -> int:
	var count := 0
	for player in _ambience_players:
		if player.playing and player.volume_db > -79.0:
			count += 1
	return count

func _load_stream(path: String, loop: bool) -> AudioStream:
	if path.is_empty() or not ResourceLoader.exists(path):
		return null
	var stream = load(path)
	if stream is AudioStreamOggVorbis:
		stream = stream.duplicate()
		stream.loop = loop
	elif stream is AudioStreamMP3:
		stream = stream.duplicate()
		stream.loop = loop
	return stream as AudioStream
