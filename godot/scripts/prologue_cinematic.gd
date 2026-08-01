class_name PrologueCinematic
extends Control

signal finished(skipped: bool)
signal beat(kind: String)

const CREAM := Color("#efe4d2")
const COPPER := Color("#d79a5b")
const MUTED := Color("#b8aa98")
const MIN_ADVANCE_DELAY := 0.28

const SHOTS := [
	{
		"focus": Vector2(0.50, 0.48),
		"zoom": 1.12,
		"eyebrow": "THE LAST CARRIAGE HORSE",
		"speaker": "NARRATION",
		"role": "",
		"line": "The bailiff’s men lead away Valenne’s last carriage horse. Its empty stall still bears the family crest.",
		"beat": "bell"
	},
	{
		"focus": Vector2(0.90, 0.42),
		"zoom": 1.38,
		"eyebrow": "WHAT THE BAILIFF LEFT",
		"speaker": "COUNTESS CÉCILE DE VALENNE",
		"role": "COUNTESS OF VALENNE",
		"line": "He left the harness. It bears our crest; no buyer wants another family’s pride.",
		"beat": "ledger"
	},
	{
		"focus": Vector2(0.79, 0.27),
		"zoom": 1.30,
		"eyebrow": "THE ESTATE LEDGER",
		"speaker": "APOLLINE DE VALENNE",
		"role": "ACTING ADMINISTRATOR",
		"line": "The treasury can support the estate for forty-two more days. After that, we are destitute.",
		"beat": "ledger"
	},
	{
		"focus": Vector2(0.30, 0.26),
		"zoom": 1.28,
		"eyebrow": "ONE ASSET REMAINS",
		"speaker": "COUNT ARMAND DE VALENNE",
		"role": "",
		"line": "There is still the brewhouse in the Old Stables. It has stood cold for years, but the copper may yet be sound.",
		"beat": "appointment"
	},
	{
		"focus": Vector2(0.79, 0.27),
		"zoom": 1.32,
		"eyebrow": "THE OLD BREWERY",
		"speaker": "APOLLINE DE VALENNE",
		"role": "",
		"line": "The brewery? It needs repairs, fuel, ingredients, labour, and a brewmaster. None of those comes cheaply.",
		"beat": "ledger"
	},
	{
		"focus": Vector2(0.90, 0.42),
		"zoom": 1.18,
		"eyebrow": "THE COUNTESS’S RELATIONS",
		"speaker": "COUNTESS CÉCILE DE VALENNE",
		"role": "COUNTESS OF VALENNE",
		"line": "The Three Lanterns will take one trial cask. Saint-Odile will spare us a fresh yeast pitch. I can open those doors. I cannot make the beer.",
		"beat": "ledger"
	},
	{
		"focus": Vector2(0.30, 0.26),
		"zoom": 1.18,
		"eyebrow": "THE COUNT’S PROPOSAL",
		"speaker": "COUNT ARMAND DE VALENNE",
		"role": "",
		"line": "Put the copper back to work. Beer sold through the village inn could give Valenne an income again.",
		"beat": "appointment"
	},
	{
		"focus": Vector2(0.79, 0.27),
		"zoom": 1.30,
		"eyebrow": "APOLLINE’S WARNING",
		"speaker": "APOLLINE DE VALENNE",
		"role": "",
		"line": "If the first batch fails, we lose money we cannot replace. I will not approve the expense on optimism alone.",
		"beat": "ledger"
	},
	{
		"focus": Vector2(0.30, 0.26),
		"zoom": 1.24,
		"eyebrow": "WHY YOU WERE SUMMONED",
		"speaker": "COUNT ARMAND DE VALENNE",
		"role": "",
		"line": "You trained as a brewer. Inspect the place and tell us plainly whether it can earn more than it costs.",
		"beat": "appointment"
	},
	{
		"focus": Vector2(0.30, 0.26),
		"zoom": 1.18,
		"eyebrow": "CASTLE BREWMASTER",
		"speaker": "COUNT ARMAND DE VALENNE",
		"role": "",
		"line": "The brewery is yours to run. In brewery work, its staff answer to you. The estate does not—not yet.",
		"beat": "appointment"
	},
	{
		"focus": Vector2(0.79, 0.27),
		"zoom": 1.30,
		"eyebrow": "THE ACCOUNTS",
		"speaker": "APOLLINE DE VALENNE",
		"role": "ACTING ADMINISTRATOR",
		"line": "Bring me the cost of the first batch before you spend a franc. Name the risk and I may defend it. Hide it and I will stop you.",
		"beat": "ledger"
	},
	{
		"focus": Vector2(0.48, 0.64),
		"zoom": 1.84,
		"eyebrow": "THE APPOINTMENT",
		"speaker": "NARRATION",
		"role": "",
		"line": "The Count pushes an iron key across the ledger. Beside it lies your appointment, waiting for a signature.",
		"beat": "key"
	}
]

var world: Control
var shot_index := -1
var shot_elapsed := 0.0
var complete := false
var eyebrow: Label
var speaker: Label
var speaker_role: Label
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
	progress.text = "TAP TO CONTINUE  ·  SKIP ABOVE" if size.y > size.x * 1.28 else "TAP TO CONTINUE  ·  SPACE / ENTER  ·  ESC TO SKIP"

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
	if shot_elapsed < MIN_ADVANCE_DELAY:
		return
	if dialogue.visible_ratio < 0.999:
		dialogue.visible_ratio = 1.0
		shot_elapsed = _reveal_duration()
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
	speaker_role.text = str(shot.get("role", ""))
	speaker_role.visible = not speaker_role.text.is_empty()
	dialogue.text = str(shot.line)
	dialogue.visible_ratio = 0.0
	if is_instance_valid(world) and world.has_method("set_cinematic_camera"):
		world.set_cinematic_camera("appointment", shot.focus, float(shot.zoom))
	transition.color.a = 0.72 if index == 0 else 0.46
	var fade := create_tween()
	fade.tween_property(transition, "color:a", 0.0, 1.0).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	beat.emit(str(shot.beat))

func _reveal_duration() -> float:
	return clampf(str(SHOTS[shot_index].line).length() * 0.026, 0.7, 2.6)

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
	chapter.mouse_filter = Control.MOUSE_FILTER_IGNORE
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
	subtitle_panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(subtitle_panel)

	var copy := VBoxContainer.new()
	copy.add_theme_constant_override("separation", 5)
	copy.mouse_filter = Control.MOUSE_FILTER_IGNORE
	subtitle_panel.add_child(copy)
	eyebrow = Label.new()
	eyebrow.add_theme_font_size_override("font_size", 10)
	eyebrow.add_theme_color_override("font_color", COPPER)
	eyebrow.mouse_filter = Control.MOUSE_FILTER_IGNORE
	copy.add_child(eyebrow)
	speaker = Label.new()
	speaker.add_theme_font_size_override("font_size", 12)
	speaker.add_theme_color_override("font_color", Color("#e5bd8a"))
	speaker.mouse_filter = Control.MOUSE_FILTER_IGNORE
	copy.add_child(speaker)
	speaker_role = Label.new()
	speaker_role.add_theme_font_size_override("font_size", 9)
	speaker_role.add_theme_color_override("font_color", MUTED)
	speaker_role.mouse_filter = Control.MOUSE_FILTER_IGNORE
	copy.add_child(speaker_role)
	dialogue = Label.new()
	dialogue.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	dialogue.size_flags_vertical = Control.SIZE_EXPAND_FILL
	dialogue.add_theme_font_size_override("font_size", 23)
	dialogue.add_theme_color_override("font_color", CREAM)
	dialogue.mouse_filter = Control.MOUSE_FILTER_IGNORE
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
	progress.mouse_filter = Control.MOUSE_FILTER_IGNORE
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
		progress.text = "TAP TO CONTINUE  ·  SKIP AT TOP RIGHT"
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
