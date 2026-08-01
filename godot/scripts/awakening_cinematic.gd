class_name AwakeningCinematic
extends Control

signal finished(skipped: bool)
signal beat(kind: String)

const CREAM := Color("#efe4d2")
const COPPER := Color("#d79a5b")
const MUTED := Color("#b8aa98")
const MIN_ADVANCE_DELAY := 0.28

const CLOSED_DOORS := preload("res://assets/cinematics/awakening-00-doors-closed.png")
const OPEN_DOORS := preload("res://assets/cinematics/awakening-01-doors.png")
const FIRE := preload("res://assets/cinematics/awakening-02-fire.png")
const STAFF := preload("res://assets/cinematics/awakening-03-staff.png")
const WORK := preload("res://assets/cinematics/awakening-04-work.png")

const SHOTS := [
	{
		"texture": CLOSED_DOORS,
		"eyebrow": "FIRST LIGHT",
		"speaker": "NARRATION",
		"role": "",
		"line": "At dawn, the Old Stables stand locked behind rain-swollen oak and rusted iron.",
		"interactive": "doors",
		"beat": "door"
	},
	{
		"texture": OPEN_DOORS,
		"eyebrow": "THE BREWHOUSE",
		"speaker": "NARRATION",
		"role": "",
		"line": "Dust covers the copper. Soot cakes the hearth. Beneath the grime, an old hammered repair still holds.",
		"beat": "lamp"
	},
	{
		"texture": STAFF,
		"eyebrow": "THE ESTATE STAFF",
		"speaker": "NARRATION",
		"role": "",
		"line": "Four lanterns cross the yard. On Apolline’s orders, four members of the estate staff report to the Old Stables.",
		"beat": "arrival"
	},
	{
		"texture": STAFF,
		"eyebrow": "JULES LAMBERT",
		"speaker": "JULES",
		"role": "CELLAR HAND AND MAINTENANCE",
		"line": "I’m Jules. I’ll clear the chimney and make the hearth safe. The copper itself is yours to inspect, Brewmaster.",
		"beat": "arrival"
	},
	{
		"texture": STAFF,
		"eyebrow": "MAËLLE RENARD",
		"speaker": "MAËLLE",
		"role": "PACKAGING AND SALES",
		"line": "The Three Lanterns will take one trial cask. Make it worth serving, and I’ll see it filled and delivered.",
		"beat": "arrival"
	},
	{
		"texture": STAFF,
		"eyebrow": "NOOR BENALI",
		"speaker": "NOOR",
		"role": "HOSPITALITY COOK",
		"line": "I’ll keep the work crew fed. A cold brewhouse is hard enough without an empty stomach.",
		"beat": "arrival"
	},
	{
		"texture": STAFF,
		"eyebrow": "INEZ DE WILDE",
		"speaker": "INEZ",
		"role": "ESTATE QUARTERMASTER",
		"line": "Brewmaster [PLAYER NAME], the estate granary holds eighteen kilos of sound pale malt. Saint-Odile’s morning cart will bring one fresh yeast pitch.",
		"beat": "ledger"
	},
	{
		"texture": FIRE,
		"eyebrow": "THE MISSING HOPS",
		"speaker": "INEZ",
		"role": "ESTATE QUARTERMASTER",
		"line": "There are no hops in store. Old vines grow beside the millstream, but every usable cone must be inspected.",
		"beat": "ledger"
	},
	{
		"texture": WORK,
		"eyebrow": "WORK BEGINS",
		"speaker": "NARRATION",
		"role": "",
		"line": "Jules sets his ladder beneath the chimney. Inez checks the tools while Maëlle and Noor carry out spoiled sacks and broken timber.",
		"beat": "work"
	},
	{
		"texture": WORK,
		"eyebrow": "THE COPPER BREWHOUSE",
		"speaker": "JULES",
		"role": "CELLAR HAND AND MAINTENANCE",
		"line": "I’ll see to the chimney. The old copper patch is ugly, but it held before. Inspect it, Brewmaster, then decide what we can trust.",
		"beat": "work"
	}
]

var shot_index := -1
var shot_elapsed := 0.0
var complete := false
var player_name := "Henri"
var doors_opened := false
var backdrop: TextureRect
var eyebrow: Label
var speaker: Label
var speaker_role: Label
var dialogue: Label
var progress: Label
var transition: ColorRect
var subtitle_panel: PanelContainer
var skip_button: Button
var chapter_label: Label
var advance_button: Button
var door_button: Button

func start(chosen_player_name := "Henri") -> void:
	player_name = str(chosen_player_name).strip_edges().left(14)
	if player_name.is_empty():
		player_name = "Henri"
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
	if shot_index == 0 and not doors_opened:
		progress.text = "TAP THE STABLE DOORS TO OPEN THEM"
	else:
		progress.text = "TAP TO CONTINUE · SKIP ABOVE" if size.y > size.x * 1.28 else "TAP TO CONTINUE · SPACE / ENTER · ESC TO SKIP"

func _unhandled_input(event: InputEvent) -> void:
	if complete or not visible:
		return
	if event is InputEventKey and event.pressed and not event.echo:
		if event.keycode == KEY_ESCAPE:
			finish(true)
			get_viewport().set_input_as_handled()
		elif event.keycode in [KEY_SPACE, KEY_ENTER]:
			if shot_index == 0 and not doors_opened:
				_open_doors()
			else:
				advance()
			get_viewport().set_input_as_handled()

func advance() -> void:
	if complete:
		return
	if shot_index == 0 and not doors_opened:
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
	backdrop.texture = shot.texture
	eyebrow.text = str(shot.eyebrow)
	speaker.text = str(shot.speaker)
	speaker.visible = not speaker.text.is_empty()
	speaker_role.text = str(shot.get("role", ""))
	speaker_role.visible = not speaker_role.text.is_empty()
	dialogue.text = str(shot.line).replace("[PLAYER NAME]", player_name)
	dialogue.visible_ratio = 0.0
	var waiting_for_doors := str(shot.get("interactive", "")) == "doors" and not doors_opened
	advance_button.mouse_filter = Control.MOUSE_FILTER_IGNORE if waiting_for_doors else Control.MOUSE_FILTER_STOP
	door_button.visible = waiting_for_doors
	transition.color.a = 0.72 if index == 0 else 0.46
	var fade := create_tween()
	fade.tween_property(transition, "color:a", 0.0, 0.8).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
	beat.emit(str(shot.beat))

func _open_doors() -> void:
	if complete or shot_index != 0 or doors_opened:
		return
	doors_opened = true
	door_button.visible = false
	_play_door_transition()

func _play_door_transition() -> void:
	var fade := create_tween()
	fade.tween_property(transition, "color:a", 0.78, 0.18)
	fade.tween_callback(_set_shot.bind(1))

func _reveal_duration() -> float:
	return clampf(str(SHOTS[shot_index].line).length() * 0.026, 0.7, 2.6)

func _build_interface() -> void:
	backdrop = TextureRect.new()
	backdrop.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	backdrop.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_COVERED
	backdrop.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	backdrop.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(backdrop)

	var wash := ColorRect.new()
	wash.color = Color(0.012, 0.022, 0.04, 0.12)
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

	advance_button = Button.new()
	advance_button.name = "AdvanceAwakening"
	advance_button.flat = true
	advance_button.focus_mode = Control.FOCUS_NONE
	advance_button.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	advance_button.pressed.connect(advance)
	add_child(advance_button)

	door_button = Button.new()
	door_button.name = "OpenStableDoors"
	door_button.text = "OPEN THE STABLE DOORS"
	door_button.tooltip_text = "Open the Old Stables"
	door_button.focus_mode = Control.FOCUS_ALL
	door_button.add_theme_font_size_override("font_size", 11)
	door_button.add_theme_color_override("font_color", CREAM)
	var door_style := StyleBoxFlat.new()
	door_style.bg_color = Color(0.05, 0.035, 0.025, 0.54)
	door_style.border_color = Color(0.84, 0.55, 0.30, 0.88)
	door_style.set_border_width_all(2)
	door_style.set_corner_radius_all(7)
	door_button.add_theme_stylebox_override("normal", door_style)
	door_button.pressed.connect(_open_doors)
	add_child(door_button)

	skip_button = Button.new()
	skip_button.name = "SkipAwakening"
	skip_button.text = "SKIP  »"
	skip_button.anchor_left = 1.0
	skip_button.anchor_right = 1.0
	skip_button.focus_mode = Control.FOCUS_ALL
	skip_button.pressed.connect(finish.bind(true))
	add_child(skip_button)

	chapter_label = Label.new()
	chapter_label.text = "FIRST LIGHT"
	chapter_label.offset_right = 250
	chapter_label.offset_bottom = 60
	chapter_label.add_theme_font_size_override("font_size", 11)
	chapter_label.add_theme_color_override("font_color", COPPER)
	chapter_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(chapter_label)

	subtitle_panel = PanelContainer.new()
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
	progress.offset_top = -67
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
		backdrop.anchor_top = 0.095
		backdrop.anchor_bottom = 0.61
		backdrop.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
		subtitle_panel.anchor_left = 0.05
		subtitle_panel.anchor_top = 0.61
		subtitle_panel.anchor_right = 0.95
		subtitle_panel.anchor_bottom = 0.88
		progress.offset_left = -210
		progress.offset_right = 210
		skip_button.offset_left = -126
		skip_button.offset_top = 18
		skip_button.offset_right = -18
		skip_button.offset_bottom = 62
		chapter_label.offset_left = 20
		chapter_label.offset_top = 27
		door_button.anchor_left = 0.24
		door_button.anchor_top = 0.31
		door_button.anchor_right = 0.76
		door_button.anchor_bottom = 0.52
	else:
		backdrop.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
		backdrop.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_COVERED
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
		door_button.anchor_left = 0.41
		door_button.anchor_top = 0.19
		door_button.anchor_right = 0.73
		door_button.anchor_bottom = 0.58
	door_button.offset_left = 0
	door_button.offset_top = 0
	door_button.offset_right = 0
	door_button.offset_bottom = 0
