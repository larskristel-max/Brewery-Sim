class_name PrologueCinematic
extends Control

signal finished(skipped: bool)
signal beat(kind: String)

const CREAM := Color("#efe4d2")
const COPPER := Color("#d79a5b")
const MUTED := Color("#b8aa98")

const SHOTS := [
	{
		"duration": 8.0,
		"focus": Vector2(0.80, 0.25),
		"zoom": 1.28,
		"eyebrow": "CHÂTEAU DE VALENNE · THE LAST GOOD NIGHT",
		"speaker": "",
		"line": "At Valenne, the bells still rang. The creditors had simply learned to arrive before them.",
		"beat": "bell"
	},
	{
		"duration": 8.0,
		"focus": Vector2(0.28, 0.76),
		"zoom": 1.72,
		"eyebrow": "THE FINAL ACCOUNT",
		"speaker": "",
		"line": "They took the horses at dusk. At dawn, they would return for the land.",
		"beat": "ledger"
	},
	{
		"duration": 10.0,
		"focus": Vector2(0.30, 0.26),
		"zoom": 1.28,
		"eyebrow": "THE APPOINTMENT",
		"speaker": "COUNT ARMAND DE VALENNE",
		"line": "My family has survived wars, winters, and its own pride. I will not have us defeated by an empty cellar.",
		"beat": "appointment"
	},
	{
		"duration": 10.0,
		"focus": Vector2(0.79, 0.27),
		"zoom": 1.32,
		"eyebrow": "THE LEDGER",
		"speaker": "APOLLINE DE VALENNE",
		"line": "Pride will not pay the maltster. We have one season, little coin, and no beer worth returning for.",
		"beat": "ledger"
	},
	{
		"duration": 11.0,
		"focus": Vector2(0.30, 0.26),
		"zoom": 1.18,
		"eyebrow": "THE TERMS",
		"speaker": "COUNT ARMAND DE VALENNE",
		"line": "Then give them a reason to return. Wake the old brewhouse. Fill the courtyard. Make Valenne useful again.",
		"beat": "appointment"
	},
	{
		"duration": 8.0,
		"focus": Vector2(0.48, 0.64),
		"zoom": 1.84,
		"eyebrow": "THE OLD STABLES",
		"speaker": "",
		"line": "The Count set down the key. No one in the room called it hope.",
		"beat": "key"
	}
]

var world: Control
var shot_index := -1
var shot_elapsed := 0.0
var complete := false
var eyebrow: Label
var speaker: Label
var dialogue: Label
var progress: Label
var transition: ColorRect
var subtitle_panel: PanelContainer
var skip_button: Button
var chapter_label: Label

func start(target_world: Control) -> void:
	world = target_world
	set_process(true)
	_set_shot(0)

func _ready() -> void:
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	mouse_filter = Control.MOUSE_FILTER_STOP
	_build_interface()
	resized.connect(_apply_responsive_layout)
	_apply_responsive_layout()
	set_process(false)

func _process(delta: float) -> void:
	if complete or shot_index < 0:
		return
	shot_elapsed += delta
	var shot: Dictionary = SHOTS[shot_index]
	var reveal_duration: float = clampf(str(shot.line).length() * 0.026, 0.7, 2.6)
	dialogue.visible_ratio = clampf(shot_elapsed / reveal_duration, 0.0, 1.0)
	var controls_hint := "TAP ADVANCE  ·  SKIP ABOVE" if size.y > size.x * 1.28 else "SPACE ADVANCE  ·  ESC SKIP"
	progress.text = "%02d:%02d  ·  %s" % [int(_remaining_time()) / 60, int(_remaining_time()) % 60, controls_hint]
	if shot_elapsed >= float(shot.duration):
		advance()

func _unhandled_input(event: InputEvent) -> void:
	if complete or not visible:
		return
	if event is InputEventKey and event.pressed and not event.echo:
		if event.keycode == KEY_ESCAPE:
			finish(true)
			get_viewport().set_input_as_handled()
		elif event.keycode in [KEY_SPACE, KEY_ENTER]:
			advance()
			get_viewport().set_input_as_handled()

func advance() -> void:
	if complete:
		return
	if shot_index + 1 >= SHOTS.size():
		finish(false)
	else:
		_set_shot(shot_index + 1)

func finish(was_skipped: bool) -> void:
	if complete:
		return
	complete = true
	set_process(false)
	finished.emit(was_skipped)

func _set_shot(index: int) -> void:
	shot_index = index
	shot_elapsed = 0.0
	var shot: Dictionary = SHOTS[index]
	eyebrow.text = str(shot.eyebrow)
	speaker.text = str(shot.speaker)
	speaker.visible = not speaker.text.is_empty()
	dialogue.text = str(shot.line)
	dialogue.visible_ratio = 0.0
	if is_instance_valid(world) and world.has_method("set_cinematic_camera"):
		world.set_cinematic_camera("appointment", shot.focus, float(shot.zoom))
	transition.color.a = 0.72 if index == 0 else 0.46
	var fade := create_tween()
	fade.tween_property(transition, "color:a", 0.0, 1.0).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	beat.emit(str(shot.beat))

func _remaining_time() -> float:
	var remaining := maxf(0.0, float(SHOTS[shot_index].duration) - shot_elapsed)
	for index in range(shot_index + 1, SHOTS.size()):
		remaining += float(SHOTS[index].duration)
	return remaining

func _build_interface() -> void:
	var wash := ColorRect.new()
	wash.color = Color(0.015, 0.025, 0.045, 0.14)
	wash.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	wash.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(wash)

	for top in [true, false]:
		var bar := ColorRect.new()
		bar.color = Color(0.012, 0.012, 0.014, 0.98)
		bar.mouse_filter = Control.MOUSE_FILTER_IGNORE
		bar.anchor_right = 1.0
		if top:
			bar.anchor_bottom = 0.095
		else:
			bar.anchor_top = 0.895
			bar.anchor_bottom = 1.0
		add_child(bar)

	var advance_button := Button.new()
	advance_button.name = "AdvancePrologue"
	advance_button.flat = true
	advance_button.focus_mode = Control.FOCUS_NONE
	advance_button.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	advance_button.pressed.connect(advance)
	add_child(advance_button)

	var skip := Button.new()
	skip.name = "SkipPrologue"
	skip.text = "SKIP  »"
	skip.anchor_left = 1.0
	skip.anchor_right = 1.0
	skip.offset_left = -142
	skip.offset_top = 24
	skip.offset_right = -30
	skip.offset_bottom = 64
	skip.focus_mode = Control.FOCUS_ALL
	skip.pressed.connect(finish.bind(true))
	add_child(skip)
	skip_button = skip

	var chapter := Label.new()
	chapter.text = "PROLOGUE"
	chapter.offset_left = 34
	chapter.offset_top = 29
	chapter.offset_right = 250
	chapter.offset_bottom = 60
	chapter.add_theme_font_size_override("font_size", 11)
	chapter.add_theme_color_override("font_color", COPPER)
	add_child(chapter)
	chapter_label = chapter

	subtitle_panel = PanelContainer.new()
	subtitle_panel.anchor_left = 0.13
	subtitle_panel.anchor_top = 0.665
	subtitle_panel.anchor_right = 0.87
	subtitle_panel.anchor_bottom = 0.88
	var panel_style := StyleBoxFlat.new()
	panel_style.bg_color = Color(0.018, 0.017, 0.019, 0.91)
	panel_style.border_color = Color(0.63, 0.42, 0.24, 0.82)
	panel_style.border_width_top = 1
	panel_style.set_corner_radius_all(7)
	panel_style.content_margin_left = 30
	panel_style.content_margin_right = 30
	panel_style.content_margin_top = 17
	panel_style.content_margin_bottom = 16
	subtitle_panel.add_theme_stylebox_override("panel", panel_style)
	add_child(subtitle_panel)

	var copy := VBoxContainer.new()
	copy.add_theme_constant_override("separation", 5)
	subtitle_panel.add_child(copy)
	eyebrow = Label.new()
	eyebrow.add_theme_font_size_override("font_size", 10)
	eyebrow.add_theme_color_override("font_color", COPPER)
	copy.add_child(eyebrow)
	speaker = Label.new()
	speaker.add_theme_font_size_override("font_size", 12)
	speaker.add_theme_color_override("font_color", Color("#e5bd8a"))
	copy.add_child(speaker)
	dialogue = Label.new()
	dialogue.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	dialogue.size_flags_vertical = Control.SIZE_EXPAND_FILL
	dialogue.add_theme_font_size_override("font_size", 23)
	dialogue.add_theme_color_override("font_color", CREAM)
	copy.add_child(dialogue)

	progress = Label.new()
	progress.anchor_left = 0.5
	progress.anchor_top = 1.0
	progress.anchor_right = 0.5
	progress.anchor_bottom = 1.0
	progress.offset_left = -240
	progress.offset_top = -67
	progress.offset_right = 240
	progress.offset_bottom = -36
	progress.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	progress.add_theme_font_size_override("font_size", 9)
	progress.add_theme_color_override("font_color", MUTED)
	add_child(progress)

	transition = ColorRect.new()
	transition.color = Color(0.005, 0.008, 0.015, 1.0)
	transition.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	transition.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(transition)
	_apply_responsive_layout()

func _apply_responsive_layout() -> void:
	if size.x < 2.0 or size.y < 2.0 or not is_instance_valid(subtitle_panel):
		return
	var portrait := size.y > size.x * 1.28
	if portrait:
		subtitle_panel.anchor_left = 0.05
		subtitle_panel.anchor_top = 0.61
		subtitle_panel.anchor_right = 0.95
		subtitle_panel.anchor_bottom = 0.88
		progress.offset_left = -210
		progress.offset_right = 210
		progress.text = "TAP TO ADVANCE  ·  SKIP AT TOP RIGHT"
		skip_button.offset_left = -126
		skip_button.offset_top = 18
		skip_button.offset_right = -18
		skip_button.offset_bottom = 62
		chapter_label.offset_left = 20
		chapter_label.offset_top = 27
	else:
		subtitle_panel.anchor_left = 0.13
		subtitle_panel.anchor_top = 0.665
		subtitle_panel.anchor_right = 0.87
		subtitle_panel.anchor_bottom = 0.88
		progress.offset_left = -240
		progress.offset_right = 240
		skip_button.offset_left = -142
		skip_button.offset_top = 24
		skip_button.offset_right = -30
		skip_button.offset_bottom = 64
		chapter_label.offset_left = 34
		chapter_label.offset_top = 29
