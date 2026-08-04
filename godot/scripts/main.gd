extends Control

const BrewSimulationModel = preload("res://scripts/brew_simulation.gd")
const PrologueCinematicScene = preload("res://scripts/prologue_cinematic.gd")
const AwakeningCinematicScene = preload("res://scripts/awakening_cinematic.gd")

const INK := Color("#171310")
const CREAM := Color("#efe4d2")
const COPPER := Color("#c7864c")
const COPPER_BRIGHT := Color("#e3a35f")
const MUTED := Color("#a99a86")
const SAGE := Color("#91aa9d")
const OXBLOOD := Color("#743e3e")

var simulation: BrewSimulation
var ui := {}
var started := false
var speed := 0
var minute_accumulator := 0.0
var last_revision := -1
var last_structure_signature := ""
var last_stage := ""
var last_issue := ""
var selected_staff_id := "player"
var selected_station := ""
var prologue_active := false
var awakening_active := false
var portrait_layout := false
var compact_layout := false
var mobile_landscape_layout := false
var opening_launching := false

func _ready() -> void:
	simulation = BrewSimulationModel.new()
	simulation.new_campaign()
	theme = _build_theme()
	_build_interface()
	resized.connect(_apply_responsive_layout)
	$World.station_selected.connect(_on_world_station_selected)
	$World.station_hovered.connect(_on_world_station_hovered)
	_refresh(true)
	_show_title_screen()
	_apply_responsive_layout()

func _process(delta: float) -> void:
	if started and speed > 0 and not simulation.state.campaign_lost:
		var issue_before := str(simulation.state.pending_issue)
		var stage_before := str(simulation.state.stage)
		minute_accumulator += delta * 6.0 * speed
		if minute_accumulator >= 1.0:
			var whole_minutes := int(minute_accumulator)
			minute_accumulator -= whole_minutes
			simulation.advance(whole_minutes)
			if (issue_before == "" and simulation.state.pending_issue != "") or (stage_before != str(simulation.state.stage) and str(simulation.state.stage) in ["delivery_recovery", "capacity_planning", "council", "operations_council"]):
				speed = 0
				_set_status("Time paused — your judgment is required.", true)
	if simulation.revision != last_revision:
		_refresh()

func _unhandled_input(event: InputEvent) -> void:
	if prologue_active or awakening_active:
		return
	if event.is_action_pressed("toggle_pause"): _set_speed(0)
	elif event.is_action_pressed("speed_one"): _set_speed(1)
	elif event.is_action_pressed("speed_two"): _set_speed(2)
	elif event.is_action_pressed("speed_four"): _set_speed(4)
	elif event.is_action_pressed("ui_cancel"):
		selected_station = ""
		$World.clear_focus()
		_refresh(true)

func _build_theme() -> Theme:
	var result := Theme.new()
	result.default_font_size = 15
	result.set_color("font_color", "Label", CREAM)
	result.set_color("font_color", "Button", CREAM)
	result.set_color("font_hover_color", "Button", Color.WHITE)
	result.set_color("font_pressed_color", "Button", Color.WHITE)
	result.set_color("font_disabled_color", "Button", Color("#766c60"))
	result.set_color("font_color", "OptionButton", CREAM)
	result.set_color("font_disabled_color", "OptionButton", Color("#766c60"))
	result.set_color("font_color", "LineEdit", CREAM)
	result.set_color("caret_color", "LineEdit", COPPER_BRIGHT)
	result.set_stylebox("normal", "Button", _button_style(Color(0.075,0.066,0.058,0.92), Color(0.55,0.39,0.25,0.55)))
	result.set_stylebox("hover", "Button", _button_style(Color(0.17,0.115,0.073,0.97), COPPER))
	result.set_stylebox("pressed", "Button", _button_style(Color(0.25,0.13,0.07,1.0), COPPER_BRIGHT))
	result.set_stylebox("focus", "Button", _button_style(Color(0,0,0,0), COPPER_BRIGHT, 2))
	result.set_stylebox("disabled", "Button", _button_style(Color(0.05,0.045,0.04,0.65), Color(0.2,0.18,0.16,0.5)))
	result.set_stylebox("normal", "OptionButton", _button_style(Color(0.055,0.05,0.046,0.96), Color(0.40,0.31,0.23,0.8)))
	result.set_stylebox("hover", "OptionButton", _button_style(Color(0.13,0.09,0.06,0.98), COPPER))
	result.set_stylebox("normal", "LineEdit", _button_style(Color(0.035,0.032,0.03,0.98), Color(0.56,0.46,0.35,0.9)))
	result.set_stylebox("focus", "LineEdit", _button_style(Color(0.035,0.032,0.03,1.0), COPPER_BRIGHT, 2))
	result.set_stylebox("panel", "PopupMenu", _panel_style(0.99, 8, 12))
	result.set_color("font_color", "PopupMenu", CREAM)
	result.set_color("font_hover_color", "PopupMenu", Color.WHITE)
	result.set_stylebox("hover", "PopupMenu", _button_style(Color(0.20,0.12,0.07,1.0), Color(0,0,0,0)))
	return result

func _button_style(background: Color, border: Color, width := 1) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = background
	style.border_color = border
	style.set_border_width_all(width)
	style.set_corner_radius_all(7)
	style.content_margin_left = 14
	style.content_margin_right = 14
	style.content_margin_top = 9
	style.content_margin_bottom = 9
	return style

func _panel_style(alpha := 0.92, radius := 10, margin := 18) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = Color(0.040, 0.034, 0.030, alpha)
	style.border_color = Color(0.52, 0.35, 0.20, 0.82)
	style.set_border_width_all(1)
	style.set_corner_radius_all(radius)
	style.content_margin_left = margin
	style.content_margin_right = margin
	style.content_margin_top = margin
	style.content_margin_bottom = margin
	return style

func _build_interface() -> void:
	_build_top_bar()
	_build_guidance()
	_build_command_dock()
	_build_decision_panel()
	_build_rotation_gate()
	_build_audio_settings()

func _build_top_bar() -> void:
	var panel := PanelContainer.new()
	panel.name = "EstateHud"
	panel.set_anchors_preset(Control.PRESET_TOP_WIDE)
	panel.offset_left = 24
	panel.offset_top = 18
	panel.offset_right = -24
	panel.offset_bottom = 92
	panel.add_theme_stylebox_override("panel", _panel_style(0.84, 10, 14))
	add_child(panel)
	ui.top_bar = panel
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 12)
	panel.add_child(row)
	ui.top_row = row
	var brand := VBoxContainer.new()
	brand.custom_minimum_size = Vector2(200, 0)
	brand.add_theme_constant_override("separation", 0)
	row.add_child(brand)
	var title := Label.new()
	title.text = "OLD STABLES"
	title.add_theme_font_size_override("font_size", 18)
	title.add_theme_color_override("font_color", CREAM)
	brand.add_child(title)
	var subtitle := Label.new()
	subtitle.text = "CHÂTEAU DE VALENNE"
	subtitle.add_theme_font_size_override("font_size", 10)
	subtitle.add_theme_color_override("font_color", COPPER)
	brand.add_child(subtitle)
	ui.brand = brand
	var brand_separator := VSeparator.new()
	row.add_child(brand_separator)
	ui.brand_separator = brand_separator
	ui.metric_boxes = []
	for metric in [
		{"id":"cash","label":"ESTATE CASH"},
		{"id":"confidence","label":"COUNT"},
		{"id":"community","label":"COMMUNITY"},
		{"id":"restoration","label":"RESTORATION"},
		{"id":"runway","label":"RUNWAY"}
	]:
		var box := VBoxContainer.new()
		box.custom_minimum_size = Vector2(220, 0) if metric.id == "runway" else Vector2(96, 0)
		box.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		box.add_theme_constant_override("separation", 1)
		var caption := Label.new()
		caption.text = metric.label
		caption.add_theme_font_size_override("font_size", 9)
		caption.add_theme_color_override("font_color", COPPER)
		box.add_child(caption)
		var value := Label.new()
		value.add_theme_font_size_override("font_size", 12 if metric.id == "runway" else 18)
		if metric.id == "runway":
			value.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
			value.max_lines_visible = 2
		value.add_theme_color_override("font_color", CREAM)
		box.add_child(value)
		ui[metric.id] = value
		ui.metric_boxes.append({"box": box, "caption": caption, "value": value})
		row.add_child(box)
	var rank := VBoxContainer.new()
	rank.custom_minimum_size = Vector2(180, 0)
	var rank_caption := Label.new()
	rank_caption.text = "YOUR OFFICE"
	rank_caption.add_theme_font_size_override("font_size", 9)
	rank_caption.add_theme_color_override("font_color", COPPER)
	rank.add_child(rank_caption)
	var rank_value := Label.new()
	rank_value.add_theme_font_size_override("font_size", 13)
	rank_value.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
	rank.add_child(rank_value)
	ui.rank = rank_value
	row.add_child(rank)
	ui.rank_box = rank

func _build_guidance() -> void:
	var panel := PanelContainer.new()
	panel.name = "Guidance"
	panel.set_anchors_preset(Control.PRESET_CENTER_TOP)
	panel.position = Vector2(-290, 106)
	panel.size = Vector2(580, 44)
	panel.add_theme_stylebox_override("panel", _panel_style(0.82, 22, 10))
	add_child(panel)
	var label := Label.new()
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	label.add_theme_font_size_override("font_size", 12)
	label.add_theme_color_override("font_color", Color("#dac5aa"))
	panel.add_child(label)
	ui.guidance_panel = panel
	ui.guidance = label

func _build_command_dock() -> void:
	var panel := PanelContainer.new()
	panel.name = "CommandDock"
	panel.set_anchors_preset(Control.PRESET_BOTTOM_WIDE)
	panel.offset_left = 24
	panel.offset_top = -206
	panel.offset_right = -24
	panel.offset_bottom = -18
	panel.add_theme_stylebox_override("panel", _panel_style(0.93, 12, 14))
	add_child(panel)
	ui.command_dock = panel
	var content := VBoxContainer.new()
	content.add_theme_constant_override("separation", 8)
	panel.add_child(content)
	var header := HBoxContainer.new()
	header.name = "CommandHeader"
	header.add_theme_constant_override("separation", 8)
	content.add_child(header)
	ui.command_header = header
	var stage := Label.new()
	stage.add_theme_font_size_override("font_size", 11)
	stage.add_theme_color_override("font_color", COPPER_BRIGHT)
	stage.custom_minimum_size = Vector2(165, 0)
	stage.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
	header.add_child(stage)
	ui.stage = stage
	var time := Label.new()
	time.add_theme_font_size_override("font_size", 11)
	time.add_theme_color_override("font_color", SAGE)
	time.custom_minimum_size = Vector2(122, 0)
	time.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
	header.add_child(time)
	ui.time = time
	var status := Label.new()
	status.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
	status.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	status.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	status.custom_minimum_size = Vector2(120, 0)
	status.add_theme_font_size_override("font_size", 11)
	status.add_theme_color_override("font_color", MUTED)
	header.add_child(status)
	ui.status = status
	var mobile_close := Button.new()
	mobile_close.text = "CLOSE"
	mobile_close.custom_minimum_size = Vector2(66, 40)
	mobile_close.tooltip_text = "Close the selected work zone"
	mobile_close.visible = false
	mobile_close.pressed.connect(_close_mobile_context)
	header.add_child(mobile_close)
	ui.mobile_close = mobile_close
	var clock_group := HBoxContainer.new()
	clock_group.name = "ClockAndSaveControls"
	clock_group.add_theme_constant_override("separation", 4)
	header.add_child(clock_group)
	ui.clock_group = clock_group
	ui.clock_buttons = []
	for value in [0, 1, 2, 4, 12]:
		var button := Button.new()
		button.text = "||" if value == 0 else "%dx" % value
		button.custom_minimum_size = Vector2(36, 32)
		button.tooltip_text = "Pause the estate clock" if value == 0 else "Set estate clock to %dx" % value
		button.pressed.connect(_set_speed.bind(value))
		clock_group.add_child(button)
		ui.clock_buttons.append({"button": button, "speed": value})
	var save := Button.new()
	save.text = "SAVE"
	save.custom_minimum_size = Vector2(52, 32)
	save.tooltip_text = "Save the current campaign"
	save.pressed.connect(_save_game)
	clock_group.add_child(save)
	ui.save_button = save
	var load := Button.new()
	load.text = "LOAD"
	load.custom_minimum_size = Vector2(52, 32)
	load.tooltip_text = "Load the latest campaign save"
	load.pressed.connect(_load_game)
	clock_group.add_child(load)
	ui.load_button = load
	var audio := Button.new()
	audio.text = "AUDIO"
	audio.custom_minimum_size = Vector2(58, 32)
	audio.tooltip_text = "Open audio settings"
	audio.pressed.connect(_show_audio_settings)
	clock_group.add_child(audio)
	ui.audio_button = audio
	var batch_rail_panel := PanelContainer.new()
	batch_rail_panel.name = "BatchRail"
	batch_rail_panel.custom_minimum_size = Vector2(0, 76)
	batch_rail_panel.add_theme_stylebox_override("panel", _panel_style(0.72, 8, 8))
	batch_rail_panel.visible = false
	content.add_child(batch_rail_panel)
	ui.batch_rail_panel = batch_rail_panel
	var batch_rail_row := HBoxContainer.new()
	batch_rail_row.add_theme_constant_override("separation", 10)
	batch_rail_panel.add_child(batch_rail_row)
	var operations_forecast := Label.new()
	operations_forecast.custom_minimum_size = Vector2(320, 0)
	operations_forecast.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	operations_forecast.add_theme_font_size_override("font_size", 15)
	operations_forecast.add_theme_color_override("font_color", SAGE)
	batch_rail_row.add_child(operations_forecast)
	ui.operations_forecast = operations_forecast
	batch_rail_row.add_child(VSeparator.new())
	var batch_scroll := ScrollContainer.new()
	batch_scroll.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	batch_scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_AUTO
	batch_scroll.vertical_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	batch_rail_row.add_child(batch_scroll)
	var batch_rail := HBoxContainer.new()
	batch_rail.add_theme_constant_override("separation", 8)
	batch_scroll.add_child(batch_rail)
	ui.batch_rail = batch_rail
	var command_separator := HSeparator.new()
	content.add_child(command_separator)
	ui.command_separator = command_separator
	var command_row := HBoxContainer.new()
	command_row.size_flags_vertical = Control.SIZE_EXPAND_FILL
	command_row.add_theme_constant_override("separation", 10)
	content.add_child(command_row)
	ui.command_content = content
	ui.command_row = command_row
	var objective_box := VBoxContainer.new()
	objective_box.custom_minimum_size = Vector2(260, 0)
	objective_box.add_theme_constant_override("separation", 4)
	command_row.add_child(objective_box)
	ui.objective_box = objective_box
	var context := Label.new()
	context.add_theme_font_size_override("font_size", 9)
	context.add_theme_color_override("font_color", COPPER)
	objective_box.add_child(context)
	ui.context = context
	var title := Label.new()
	title.add_theme_font_size_override("font_size", 21)
	title.add_theme_color_override("font_color", CREAM)
	title.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
	objective_box.add_child(title)
	ui.title = title
	var objective := Label.new()
	objective.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	objective.add_theme_font_size_override("font_size", 12)
	objective.add_theme_color_override("font_color", Color("#d4c6b3"))
	objective.size_flags_vertical = Control.SIZE_EXPAND_FILL
	objective_box.add_child(objective)
	ui.objective = objective
	var batch := Label.new()
	batch.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
	batch.add_theme_font_size_override("font_size", 10)
	batch.add_theme_color_override("font_color", SAGE)
	objective_box.add_child(batch)
	ui.batch = batch
	var inventory := Label.new()
	inventory.visible = false
	objective_box.add_child(inventory)
	ui.inventory = inventory
	var objective_separator := VSeparator.new()
	command_row.add_child(objective_separator)
	ui.objective_separator = objective_separator
	var staff_box := VBoxContainer.new()
	staff_box.custom_minimum_size = Vector2(195, 0)
	staff_box.add_theme_constant_override("separation", 5)
	command_row.add_child(staff_box)
	ui.staff_box = staff_box
	var assign_label := Label.new()
	assign_label.text = "WHO TAKES THE WORK?"
	assign_label.add_theme_font_size_override("font_size", 9)
	assign_label.add_theme_color_override("font_color", COPPER)
	staff_box.add_child(assign_label)
	ui.assign_label = assign_label
	var staff_picker := OptionButton.new()
	staff_picker.custom_minimum_size = Vector2(0, 38)
	staff_picker.item_selected.connect(_on_staff_selected)
	staff_box.add_child(staff_picker)
	ui.staff_picker = staff_picker
	var staff_summary := Label.new()
	staff_summary.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	staff_summary.add_theme_font_size_override("font_size", 10)
	staff_summary.add_theme_color_override("font_color", MUTED)
	staff_summary.size_flags_vertical = Control.SIZE_EXPAND_FILL
	staff_box.add_child(staff_summary)
	ui.staff_summary = staff_summary
	var jobs := Label.new()
	jobs.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
	jobs.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	jobs.custom_minimum_size = Vector2(0, 28)
	jobs.add_theme_font_size_override("font_size", 10)
	jobs.add_theme_color_override("font_color", COPPER_BRIGHT)
	staff_box.add_child(jobs)
	ui.jobs = jobs
	var staff_separator := VSeparator.new()
	command_row.add_child(staff_separator)
	ui.staff_separator = staff_separator
	var action_scroll := ScrollContainer.new()
	action_scroll.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	action_scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	action_scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_AUTO
	action_scroll.vertical_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	command_row.add_child(action_scroll)
	ui.action_scroll = action_scroll
	var actions := HBoxContainer.new()
	actions.size_flags_vertical = Control.SIZE_EXPAND_FILL
	actions.add_theme_constant_override("separation", 8)
	action_scroll.add_child(actions)
	ui.actions = actions
	var wait_button := Button.new()
	wait_button.text = "NEXT\nMILESTONE  »"
	wait_button.custom_minimum_size = Vector2(116, 84)
	wait_button.add_theme_color_override("font_color", Color("#f4d09c"))
	wait_button.pressed.connect(_advance_to_milestone)
	command_row.add_child(wait_button)
	ui.wait_button = wait_button
	var mobile_stack := VBoxContainer.new()
	mobile_stack.name = "MobileCommandStack"
	mobile_stack.visible = false
	mobile_stack.size_flags_vertical = Control.SIZE_EXPAND_FILL
	mobile_stack.add_theme_constant_override("separation", 7)
	content.add_child(mobile_stack)
	ui.mobile_command_stack = mobile_stack

func _build_decision_panel() -> void:
	var panel := PanelContainer.new()
	panel.name = "DecisionPanel"
	panel.set_anchors_preset(Control.PRESET_RIGHT_WIDE)
	panel.offset_left = -500
	panel.offset_top = 116
	panel.offset_right = -24
	panel.offset_bottom = -224
	panel.add_theme_stylebox_override("panel", _panel_style(0.96, 12, 20))
	panel.visible = false
	add_child(panel)
	ui.decision_panel = panel
	var scroll := ScrollContainer.new()
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	scroll.vertical_scroll_mode = ScrollContainer.SCROLL_MODE_AUTO
	panel.add_child(scroll)
	var content := VBoxContainer.new()
	content.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	content.add_theme_constant_override("separation", 12)
	scroll.add_child(content)
	var role := Label.new()
	role.add_theme_font_size_override("font_size", 10)
	role.add_theme_color_override("font_color", COPPER)
	content.add_child(role)
	ui.role = role
	var decision_title := Label.new()
	decision_title.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	decision_title.add_theme_font_size_override("font_size", 27)
	decision_title.add_theme_color_override("font_color", CREAM)
	content.add_child(decision_title)
	ui.decision_title = decision_title
	content.add_child(HSeparator.new())
	var decision_objective := Label.new()
	decision_objective.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	decision_objective.add_theme_font_size_override("font_size", 15)
	decision_objective.add_theme_color_override("font_color", Color("#ddd0be"))
	content.add_child(decision_objective)
	ui.decision_objective = decision_objective
	var consequence := Label.new()
	consequence.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	consequence.add_theme_font_size_override("font_size", 11)
	consequence.add_theme_color_override("font_color", SAGE)
	content.add_child(consequence)
	ui.consequence = consequence
	var choices := VBoxContainer.new()
	choices.add_theme_constant_override("separation", 8)
	content.add_child(choices)
	ui.choices = choices

func _build_rotation_gate() -> void:
	var gate := ColorRect.new()
	gate.name = "LandscapeRequired"
	gate.color = Color("#071018")
	gate.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	gate.mouse_filter = Control.MOUSE_FILTER_STOP
	gate.z_index = 1000
	gate.visible = false
	add_child(gate)
	ui.rotation_gate = gate
	var center := CenterContainer.new()
	center.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	center.mouse_filter = Control.MOUSE_FILTER_IGNORE
	gate.add_child(center)
	var panel := PanelContainer.new()
	panel.custom_minimum_size = Vector2(420, 250)
	panel.add_theme_stylebox_override("panel", _panel_style(0.97, 14, 28))
	panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
	center.add_child(panel)
	var copy := VBoxContainer.new()
	copy.alignment = BoxContainer.ALIGNMENT_CENTER
	copy.add_theme_constant_override("separation", 14)
	copy.mouse_filter = Control.MOUSE_FILTER_IGNORE
	panel.add_child(copy)
	var mark := Label.new()
	mark.text = "OLD STABLES"
	mark.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	mark.add_theme_font_size_override("font_size", 13)
	mark.add_theme_color_override("font_color", COPPER)
	mark.mouse_filter = Control.MOUSE_FILTER_IGNORE
	copy.add_child(mark)
	var title := Label.new()
	title.text = "Turn your phone sideways"
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	title.add_theme_font_size_override("font_size", 30)
	title.add_theme_color_override("font_color", CREAM)
	title.mouse_filter = Control.MOUSE_FILTER_IGNORE
	copy.add_child(title)
	var instruction := Label.new()
	instruction.text = "The opening begins once your phone is in landscape."
	instruction.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	instruction.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	instruction.add_theme_font_size_override("font_size", 15)
	instruction.add_theme_color_override("font_color", MUTED)
	instruction.mouse_filter = Control.MOUSE_FILTER_IGNORE
	copy.add_child(instruction)

func _build_audio_settings() -> void:
	var shade := ColorRect.new()
	shade.name = "AudioSettings"
	shade.color = Color(0.005, 0.008, 0.012, 0.82)
	shade.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	shade.mouse_filter = Control.MOUSE_FILTER_STOP
	shade.visible = false
	shade.z_index = 90
	add_child(shade)
	ui.audio_settings = shade
	var center := CenterContainer.new()
	center.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	shade.add_child(center)
	var panel := PanelContainer.new()
	panel.custom_minimum_size = Vector2(440, 0)
	panel.add_theme_stylebox_override("panel", _panel_style(0.99, 12, 24))
	center.add_child(panel)
	var content := VBoxContainer.new()
	content.add_theme_constant_override("separation", 11)
	panel.add_child(content)
	var title := Label.new()
	title.text = "AUDIO"
	title.add_theme_font_size_override("font_size", 24)
	title.add_theme_color_override("font_color", CREAM)
	content.add_child(title)
	var note := Label.new()
	note.text = "The brewery mix is dry and restrained for reliable browser play."
	note.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	note.add_theme_font_size_override("font_size", 11)
	note.add_theme_color_override("font_color", MUTED)
	content.add_child(note)
	ui.audio_sliders = {}
	for definition in [
		{"bus":"Master", "label":"MASTER"},
		{"bus":"Music", "label":"MUSIC"},
		{"bus":"Ambience", "label":"AMBIENCE"},
		{"bus":"SFX", "label":"EFFECTS"},
	]:
		var row := HBoxContainer.new()
		row.add_theme_constant_override("separation", 12)
		content.add_child(row)
		var label := Label.new()
		label.text = str(definition.label)
		label.custom_minimum_size = Vector2(100, 0)
		label.add_theme_font_size_override("font_size", 10)
		label.add_theme_color_override("font_color", COPPER)
		row.add_child(label)
		var slider := HSlider.new()
		slider.min_value = 0
		slider.max_value = 100
		slider.step = 1
		slider.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		slider.custom_minimum_size = Vector2(240, 36)
		slider.value_changed.connect(_on_audio_volume_changed.bind(str(definition.bus)))
		row.add_child(slider)
		ui.audio_sliders[str(definition.bus)] = slider
	var interface_toggle := CheckButton.new()
	interface_toggle.text = "INTERFACE SOUNDS"
	interface_toggle.tooltip_text = "Navigation feedback only; physical brewery actions remain audible."
	interface_toggle.toggled.connect(_on_interface_sounds_toggled)
	content.add_child(interface_toggle)
	ui.interface_sounds_toggle = interface_toggle
	var close := Button.new()
	close.text = "CLOSE"
	close.custom_minimum_size = Vector2(0, 48)
	close.pressed.connect(_hide_audio_settings)
	content.add_child(close)
	_sync_audio_settings_controls()

func _show_audio_settings() -> void:
	_sync_audio_settings_controls()
	ui.audio_settings.visible = true
	AudioDirector.play_cue("ui_panel_open")

func _hide_audio_settings() -> void:
	AudioDirector.play_cue("ui_panel_close")
	ui.audio_settings.visible = false

func _sync_audio_settings_controls() -> void:
	if not ui.has("audio_sliders"):
		return
	for bus_name in ui.audio_sliders:
		var slider: HSlider = ui.audio_sliders[bus_name]
		slider.set_value_no_signal(AudioDirector.get_bus_volume_linear(bus_name) * 100.0)
	ui.interface_sounds_toggle.set_pressed_no_signal(AudioDirector.interface_sounds_enabled)

func _on_audio_volume_changed(value: float, bus_name: String) -> void:
	AudioDirector.set_bus_volume_linear(bus_name, value / 100.0)

func _on_interface_sounds_toggled(enabled: bool) -> void:
	AudioDirector.set_interface_sounds_enabled(enabled)
	if enabled:
		AudioDirector.play_cue("ui_confirm", true)

func _apply_responsive_layout() -> void:
	if not is_inside_tree() or size.x < 2.0 or size.y < 2.0 or not ui.has("command_dock"):
		return
	var physical_size := Vector2(get_tree().root.size)
	var aspect := size.x / size.y
	var target_scale := Vector2i(540, 960) if aspect < 0.78 else (Vector2i(960, 540) if aspect > 2.0 else Vector2i(1280, 720))
	if get_tree().root.content_scale_size != target_scale:
		get_tree().root.content_scale_size = target_scale
		call_deferred("_apply_responsive_layout")
		return

	portrait_layout = aspect < 0.78
	compact_layout = portrait_layout or size.x < 960.0 or size.y < 650.0
	mobile_landscape_layout = not portrait_layout and physical_size.x <= 1000.0 and physical_size.y <= 600.0 and physical_size.x > physical_size.y
	AudioDirector.set_mobile_mode(portrait_layout or mobile_landscape_layout)
	ui.rotation_gate.visible = portrait_layout
	_layout_top_bar()
	_layout_guidance()
	_layout_command_dock()
	_layout_decision_panel()
	_layout_story_overlays()

func _layout_top_bar() -> void:
	if portrait_layout:
		ui.top_bar.offset_left = 8
		ui.top_bar.offset_top = 8
		ui.top_bar.offset_right = -8
		ui.top_bar.offset_bottom = 74
		ui.top_row.add_theme_constant_override("separation", 5)
		ui.brand.visible = false
		ui.brand_separator.visible = false
		ui.rank_box.visible = false
		for index in range(ui.metric_boxes.size()):
			var metric: Dictionary = ui.metric_boxes[index]
			metric.box.visible = index < 3
			metric.box.custom_minimum_size = Vector2.ZERO
			metric.caption.add_theme_font_size_override("font_size", 8)
			metric.value.add_theme_font_size_override("font_size", 16)
	elif mobile_landscape_layout:
		ui.top_bar.offset_left = 6
		ui.top_bar.offset_top = 6
		ui.top_bar.offset_right = -6
		ui.top_bar.offset_bottom = 52
		ui.top_row.add_theme_constant_override("separation", 4)
		ui.brand.visible = false
		ui.brand_separator.visible = false
		ui.rank_box.visible = false
		for index in range(ui.metric_boxes.size()):
			var metric: Dictionary = ui.metric_boxes[index]
			metric.box.visible = index < 3
			metric.box.custom_minimum_size = Vector2.ZERO
			metric.caption.add_theme_font_size_override("font_size", 7)
			metric.value.add_theme_font_size_override("font_size", 13)
	else:
		ui.top_bar.offset_left = 24
		ui.top_bar.offset_top = 18
		ui.top_bar.offset_right = -24
		ui.top_bar.offset_bottom = 92
		ui.top_row.add_theme_constant_override("separation", 12)
		ui.brand.visible = true
		ui.brand_separator.visible = true
		ui.rank_box.visible = true
		for metric in ui.metric_boxes:
			metric.box.visible = true
			metric.box.custom_minimum_size = Vector2(220, 0) if str(metric.caption.text) == "RUNWAY" else Vector2(96, 0)
			metric.caption.add_theme_font_size_override("font_size", 9)
			metric.value.add_theme_font_size_override("font_size", 12 if str(metric.caption.text) == "RUNWAY" else 18)

func _layout_guidance() -> void:
	if portrait_layout:
		ui.guidance_panel.anchor_left = 0.0
		ui.guidance_panel.anchor_right = 1.0
		ui.guidance_panel.offset_left = 8
		ui.guidance_panel.offset_top = 82
		ui.guidance_panel.offset_right = -8
		ui.guidance_panel.offset_bottom = 132
	elif mobile_landscape_layout:
		ui.guidance_panel.anchor_left = 0.5
		ui.guidance_panel.anchor_right = 0.5
		ui.guidance_panel.offset_left = -260
		ui.guidance_panel.offset_top = 58
		ui.guidance_panel.offset_right = 260
		ui.guidance_panel.offset_bottom = 96
	else:
		ui.guidance_panel.anchor_left = 0.5
		ui.guidance_panel.anchor_right = 0.5
		ui.guidance_panel.offset_left = -290
		ui.guidance_panel.offset_top = 106
		ui.guidance_panel.offset_right = 290
		ui.guidance_panel.offset_bottom = 150

func _layout_command_dock() -> void:
	var operations_mode := bool(simulation.state.get("operations_active", false)) or str(simulation.state.stage) == "operations_council"
	if portrait_layout:
		ui.command_dock.add_theme_stylebox_override("panel", _panel_style(0.93, 10, 10))
		_move_control(ui.objective_box, ui.mobile_command_stack, 0)
		_move_control(ui.staff_box, ui.mobile_command_stack, 1)
		_move_control(ui.action_scroll, ui.mobile_command_stack, 2)
		_move_control(ui.wait_button, ui.mobile_command_stack, 3)
		ui.command_row.visible = false
		ui.mobile_command_stack.visible = true
		ui.objective_separator.visible = false
		ui.staff_separator.visible = false
		ui.command_dock.offset_left = 8
		ui.command_dock.offset_right = -8
		ui.command_dock.offset_bottom = -8
		ui.command_dock.offset_top = -minf(size.y * 0.62, 610.0 if operations_mode else 500.0)
		ui.command_header.add_theme_constant_override("separation", 5)
		ui.stage.custom_minimum_size = Vector2.ZERO
		ui.stage.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		ui.time.visible = false
		ui.status.visible = false
		ui.save_button.visible = false
		ui.load_button.visible = false
		ui.audio_button.visible = true
		ui.audio_button.custom_minimum_size = Vector2(58, 42)
		for clock_control in ui.clock_buttons:
			var clock_speed := int(clock_control.speed)
			clock_control.button.visible = clock_speed in [0, 1]
			clock_control.button.custom_minimum_size = Vector2(48, 42)
		ui.objective_box.custom_minimum_size = Vector2(0, 94)
		ui.staff_box.custom_minimum_size = Vector2(0, 74)
		ui.staff_summary.visible = false
		ui.action_scroll.custom_minimum_size = Vector2(0, 88)
		ui.wait_button.custom_minimum_size = Vector2(0, 58)
		ui.operations_forecast.visible = false
		ui.batch_rail_panel.custom_minimum_size = Vector2(0, 104)
		ui.objective_box.visible = true
		ui.staff_box.visible = true
		ui.action_scroll.visible = true
		ui.command_separator.visible = true
		ui.assign_label.visible = true
		ui.jobs.visible = true
		ui.mobile_close.visible = false
	elif mobile_landscape_layout:
		ui.command_dock.add_theme_stylebox_override("panel", _panel_style(0.93, 8, 4))
		_move_control(ui.objective_box, ui.command_row, 0)
		_move_control(ui.objective_separator, ui.command_row, 1)
		_move_control(ui.staff_box, ui.command_row, 2)
		_move_control(ui.staff_separator, ui.command_row, 3)
		_move_control(ui.action_scroll, ui.command_row, 4)
		_move_control(ui.wait_button, ui.command_row, 5)
		var context_open := not selected_station.is_empty() or operations_mode or not simulation.get_active_jobs().is_empty()
		ui.command_row.visible = context_open
		ui.mobile_command_stack.visible = false
		ui.command_separator.visible = context_open
		ui.objective_box.visible = false
		ui.objective_separator.visible = false
		ui.staff_box.visible = context_open
		ui.staff_separator.visible = false
		ui.action_scroll.visible = context_open
		ui.command_dock.offset_left = 6
		ui.command_dock.offset_right = -6
		ui.command_dock.offset_bottom = -6
		ui.command_dock.offset_top = -(216.0 if operations_mode else (152.0 if context_open else 72.0))
		ui.command_content.add_theme_constant_override("separation", 5)
		ui.command_row.add_theme_constant_override("separation", 6)
		ui.command_header.add_theme_constant_override("separation", 4)
		ui.stage.custom_minimum_size = Vector2(146, 0)
		ui.stage.size_flags_horizontal = Control.SIZE_SHRINK_BEGIN
		ui.stage.add_theme_font_size_override("font_size", 10)
		ui.time.visible = false
		ui.status.visible = true
		ui.status.add_theme_font_size_override("font_size", 10)
		ui.save_button.visible = false
		ui.load_button.visible = false
		ui.audio_button.visible = true
		ui.audio_button.custom_minimum_size = Vector2(58, 40)
		ui.mobile_close.visible = not selected_station.is_empty()
		for clock_control in ui.clock_buttons:
			var clock_speed := int(clock_control.speed)
			clock_control.button.visible = clock_speed in [0, 1]
			clock_control.button.custom_minimum_size = Vector2(44, 40)
		ui.staff_box.custom_minimum_size = Vector2(150, 0)
		ui.staff_summary.visible = false
		ui.assign_label.visible = true
		ui.jobs.visible = false
		ui.action_scroll.custom_minimum_size = Vector2.ZERO
		ui.wait_button.custom_minimum_size = Vector2(92, 64)
		ui.operations_forecast.visible = false
		ui.batch_rail_panel.custom_minimum_size = Vector2(0, 58)
	else:
		ui.command_dock.add_theme_stylebox_override("panel", _panel_style(0.93, 12, 14))
		_move_control(ui.objective_box, ui.command_row, 0)
		_move_control(ui.objective_separator, ui.command_row, 1)
		_move_control(ui.staff_box, ui.command_row, 2)
		_move_control(ui.staff_separator, ui.command_row, 3)
		_move_control(ui.action_scroll, ui.command_row, 4)
		_move_control(ui.wait_button, ui.command_row, 5)
		ui.command_row.visible = true
		ui.mobile_command_stack.visible = false
		ui.objective_separator.visible = true
		ui.staff_separator.visible = true
		ui.command_dock.offset_left = 24
		ui.command_dock.offset_right = -24
		ui.command_dock.offset_bottom = -18
		ui.command_dock.offset_top = -446 if operations_mode else -206
		ui.command_header.add_theme_constant_override("separation", 8)
		ui.stage.custom_minimum_size = Vector2(165, 0)
		ui.stage.size_flags_horizontal = Control.SIZE_SHRINK_BEGIN
		ui.time.visible = true
		ui.status.visible = true
		ui.save_button.visible = true
		ui.load_button.visible = true
		ui.audio_button.visible = true
		ui.audio_button.custom_minimum_size = Vector2(58, 32)
		for clock_control in ui.clock_buttons:
			clock_control.button.visible = true
			clock_control.button.custom_minimum_size = Vector2(36, 32)
		ui.objective_box.custom_minimum_size = Vector2(260, 0)
		ui.staff_box.custom_minimum_size = Vector2(195, 0)
		ui.staff_summary.visible = true
		ui.action_scroll.custom_minimum_size = Vector2.ZERO
		ui.wait_button.custom_minimum_size = Vector2(116, 84)
		ui.operations_forecast.visible = true
		ui.batch_rail_panel.custom_minimum_size = Vector2(0, 76)
		ui.objective_box.visible = true
		ui.staff_box.visible = true
		ui.action_scroll.visible = true
		ui.command_separator.visible = true
		ui.assign_label.visible = true
		ui.jobs.visible = true
		ui.mobile_close.visible = false

func _layout_decision_panel() -> void:
	if portrait_layout:
		ui.decision_panel.anchor_left = 0.0
		ui.decision_panel.anchor_top = 0.0
		ui.decision_panel.anchor_right = 1.0
		ui.decision_panel.anchor_bottom = 1.0
		ui.decision_panel.offset_left = 8
		ui.decision_panel.offset_top = 82
		ui.decision_panel.offset_right = -8
		ui.decision_panel.offset_bottom = -8
	elif mobile_landscape_layout:
		ui.decision_panel.anchor_left = 0.42
		ui.decision_panel.anchor_top = 0.0
		ui.decision_panel.anchor_right = 1.0
		ui.decision_panel.anchor_bottom = 1.0
		ui.decision_panel.offset_left = 0
		ui.decision_panel.offset_top = 58
		ui.decision_panel.offset_right = -6
		ui.decision_panel.offset_bottom = -6
	else:
		ui.decision_panel.anchor_left = 1.0
		ui.decision_panel.anchor_top = 0.0
		ui.decision_panel.anchor_right = 1.0
		ui.decision_panel.anchor_bottom = 1.0
		ui.decision_panel.offset_left = -500
		ui.decision_panel.offset_top = 8 if compact_layout else 116
		ui.decision_panel.offset_right = -24
		ui.decision_panel.offset_bottom = -446 if str(simulation.state.stage) == "operations_council" else -224

func _layout_story_overlays() -> void:
	if ui.has("title_card") and is_instance_valid(ui.title_card):
		if portrait_layout:
			_set_anchor_rect(ui.title_card, 0.06, 0.26, 0.94, 0.74)
		elif compact_layout:
			_set_anchor_rect(ui.title_card, 0.25, 0.10, 0.75, 0.90)
		else:
			_set_anchor_rect(ui.title_card, 0.31, 0.23, 0.69, 0.77)
	if ui.has("customization_card") and is_instance_valid(ui.customization_card):
		if portrait_layout:
			_set_anchor_rect(ui.customization_card, 0.035, 0.14, 0.965, 0.70)
		elif compact_layout:
			_set_anchor_rect(ui.customization_card, 0.56, 0.05, 0.96, 0.95)
		else:
			_set_anchor_rect(ui.customization_card, 0.58, 0.18, 0.95, 0.78)

func _move_control(control: Control, target: Container, index: int) -> void:
	if control.get_parent() != target:
		control.reparent(target)
	target.move_child(control, mini(index, target.get_child_count() - 1))

func _set_anchor_rect(control: Control, left: float, top: float, right: float, bottom: float) -> void:
	control.anchor_left = left
	control.anchor_top = top
	control.anchor_right = right
	control.anchor_bottom = bottom
	control.offset_left = 0
	control.offset_top = 0
	control.offset_right = 0
	control.offset_bottom = 0

func _show_title_screen() -> void:
	var shade := ColorRect.new()
	shade.name = "OpeningTitle"
	shade.color = Color("#071018")
	shade.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(shade)
	ui.title_screen = shade
	var card := PanelContainer.new()
	card.add_theme_stylebox_override("panel", _panel_style(0.98, 12, 28))
	shade.add_child(card)
	ui.title_card = card
	var copy := VBoxContainer.new()
	copy.alignment = BoxContainer.ALIGNMENT_CENTER
	copy.add_theme_constant_override("separation", 14)
	card.add_child(copy)
	var estate := Label.new()
	estate.text = "CHÂTEAU DE VALENNE, 1901"
	estate.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	estate.add_theme_font_size_override("font_size", 11)
	estate.add_theme_color_override("font_color", COPPER)
	copy.add_child(estate)
	var title := Label.new()
	title.text = "OLD STABLES"
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.add_theme_font_size_override("font_size", 38)
	title.add_theme_color_override("font_color", CREAM)
	copy.add_child(title)
	var subtitle := Label.new()
	subtitle.text = "A Brewer’s Story"
	subtitle.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	subtitle.add_theme_font_size_override("font_size", 16)
	subtitle.add_theme_color_override("font_color", SAGE)
	copy.add_child(subtitle)
	var sound_test := Button.new()
	sound_test.text = "TEST SOUND"
	sound_test.custom_minimum_size = Vector2(0, 44)
	sound_test.add_theme_font_size_override("font_size", 13)
	sound_test.pressed.connect(_test_opening_sound)
	copy.add_child(sound_test)
	var begin := Button.new()
	begin.text = "BEGIN"
	begin.custom_minimum_size = Vector2(0, 58)
	begin.add_theme_font_size_override("font_size", 16)
	begin.add_theme_stylebox_override("normal", _button_style(Color(0.37,0.19,0.09,0.98), COPPER_BRIGHT, 1))
	begin.pressed.connect(_start_opening_story)
	copy.add_child(begin)
	var note := Label.new()
	note.text = "Tap TEST SOUND once. You should hear a clear bell."
	note.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	note.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	note.add_theme_font_size_override("font_size", 10)
	note.add_theme_color_override("font_color", MUTED)
	copy.add_child(note)
	ui.title_sound_status = note
	ui.top_bar.visible = false
	ui.command_dock.visible = false
	ui.guidance_panel.visible = false
	begin.grab_focus()
	_apply_responsive_layout()
	call_deferred("_update_opening_audio_availability")

func _update_opening_audio_availability() -> void:
	if not ui.has("title_sound_status") or not is_instance_valid(ui.title_sound_status):
		return
	if _web_audio_state() == "missing":
		ui.title_sound_status.text = "This browser cannot provide game audio. Open this link in Chrome or Safari."

func _test_opening_sound() -> void:
	_prepare_web_audio_session()
	AudioDirector.begin_story_context("appointment")
	AudioDirector.unlock_audio()
	await get_tree().process_frame
	var played := AudioDirector.play_cue("sound_check", true)
	var state := _web_audio_state()
	if state == "running" and played:
		ui.title_sound_status.text = "Sound enabled â€” you should hear one bell."
	elif state == "suspended":
		ui.title_sound_status.text = "Sound is blocked. Tap TEST SOUND once more."
	elif state == "missing":
		ui.title_sound_status.text = "This browser cannot provide game audio. Open this link in Chrome or Safari."
	elif played:
		ui.title_sound_status.text = "Sound check played. Raise your phoneâ€™s media volume if silent."
	else:
		ui.title_sound_status.text = "Sound check could not start."

func _web_audio_state() -> String:
	if not OS.has_feature("web"):
		return "native"
	var state = JavaScriptBridge.eval("window.__oldStablesGodotAudioContext ? window.__oldStablesGodotAudioContext.state : 'missing'", true)
	return str(state)

func _prepare_web_audio_session() -> void:
	if OS.has_feature("web"):
		JavaScriptBridge.eval("window.__oldStablesUnlockAudio ? window.__oldStablesUnlockAudio() : ''", true)

func _start_opening_story() -> void:
	_prepare_web_audio_session()
	if portrait_layout:
		ui.rotation_gate.visible = true
		return
	if opening_launching:
		return
	opening_launching = true
	AudioDirector.begin_story_context("appointment")
	AudioDirector.unlock_audio()
	AudioDirector.play_cue("ui_confirm")
	# Browser fullscreen and Web Audio both require a direct player gesture.
	# Request fullscreen before yielding, while this button press still owns it.
	if OS.has_feature("web") and mobile_landscape_layout:
		DisplayServer.window_set_mode(DisplayServer.WINDOW_MODE_FULLSCREEN)
	# Give a suspended mobile AudioContext one frame to resume before the first
	# audible confirmation and cinematic ambience are expected to be heard.
	await get_tree().process_frame
	if ui.has("title_screen") and is_instance_valid(ui.title_screen):
		ui.title_screen.queue_free()
	_start_prologue()

func _show_customization() -> void:
	$World.reset_story_camera("appointment")
	var shade := ColorRect.new()
	shade.name = "Customization"
	shade.color = Color(0.01, 0.012, 0.018, 0.32)
	shade.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(shade)
	ui.customization = shade
	var card := PanelContainer.new()
	card.anchor_left = 0.58
	card.anchor_top = 0.18
	card.anchor_right = 0.95
	card.anchor_bottom = 0.78
	card.add_theme_stylebox_override("panel", _panel_style(0.97, 12, 22))
	shade.add_child(card)
	ui.customization_card = card
	var form_scroll := ScrollContainer.new()
	form_scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	form_scroll.vertical_scroll_mode = ScrollContainer.SCROLL_MODE_AUTO
	card.add_child(form_scroll)
	var form := VBoxContainer.new()
	form.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	form.add_theme_constant_override("separation", 13)
	form_scroll.add_child(form)
	var eyebrow := Label.new()
	eyebrow.text = "APPOINTMENT LEDGER"
	eyebrow.add_theme_font_size_override("font_size", 10)
	eyebrow.add_theme_color_override("font_color", COPPER)
	form.add_child(eyebrow)
	var title := Label.new()
	title.text = "Castle Brewmaster"
	title.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	title.add_theme_font_size_override("font_size", 29)
	title.add_theme_color_override("font_color", CREAM)
	form.add_child(title)
	var copy := Label.new()
	copy.text = "Sign your name and accept responsibility for the Old Stables brewery."
	copy.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	copy.add_theme_font_size_override("font_size", 13)
	copy.add_theme_color_override("font_color", Color("#d2c4b0"))
	form.add_child(copy)
	var name_label := Label.new()
	name_label.text = "YOUR NAME"
	name_label.add_theme_font_size_override("font_size", 9)
	name_label.add_theme_color_override("font_color", COPPER)
	form.add_child(name_label)
	var name_input := LineEdit.new()
	name_input.text = "Henri"
	name_input.max_length = 14
	name_input.custom_minimum_size = Vector2(0, 44)
	form.add_child(name_input)
	var begin := Button.new()
	begin.text = "ACCEPT THE KEY"
	begin.custom_minimum_size = Vector2(0, 54)
	begin.add_theme_font_size_override("font_size", 15)
	begin.add_theme_stylebox_override("normal", _button_style(Color(0.37,0.19,0.09,0.98), COPPER_BRIGHT, 1))
	begin.pressed.connect(begin_campaign_with.bind(name_input))
	form.add_child(begin)
	ui.top_bar.visible = false
	ui.command_dock.visible = false
	ui.guidance_panel.visible = false
	name_input.grab_focus()
	_apply_responsive_layout()

func begin_campaign_with(name_source, _coat_source = null) -> void:
	var display_name := str(name_source.text if name_source is LineEdit else name_source).strip_edges()
	var coat_index := 0
	if display_name.is_empty(): display_name = "Henri"
	simulation.new_campaign(display_name, coat_index)
	started = true
	speed = 0
	$World.customize_player(display_name, coat_index)
	$World.set_story_scene("appointment")
	if ui.has("title_screen") and is_instance_valid(ui.title_screen): ui.title_screen.queue_free()
	if ui.has("customization") and is_instance_valid(ui.customization): ui.customization.queue_free()
	var result := simulation.accept_stable_key()
	if not result.ok and str(simulation.state.stage) != "recommission":
		_show_result(result)
		return
	$World.set_story_scene("brewery")
	AudioDirector.play_cue("contract_accept")
	_refresh(true)
	_start_awakening_cinematic()

func _start_prologue() -> void:
	prologue_active = true
	var prologue: Control = PrologueCinematicScene.new()
	prologue.name = "PrologueCinematic"
	prologue.finished.connect(_on_prologue_finished)
	prologue.beat.connect(_on_prologue_beat)
	prologue.action.connect(_on_cinematic_action)
	add_child(prologue)
	ui.prologue = prologue
	prologue.start($World)

func _on_prologue_finished(_was_skipped: bool) -> void:
	if not prologue_active:
		return
	prologue_active = false
	if ui.has("prologue") and is_instance_valid(ui.prologue):
		ui.prologue.queue_free()
	_show_customization()

func _start_awakening_cinematic() -> void:
	awakening_active = true
	AudioDirector.begin_story_context("awakening")
	_apply_responsive_layout()
	ui.top_bar.visible = false
	ui.command_dock.visible = false
	ui.guidance_panel.visible = false
	ui.decision_panel.visible = false
	$World.visible = false
	var awakening: Control = AwakeningCinematicScene.new()
	awakening.name = "AwakeningCinematic"
	awakening.finished.connect(_on_awakening_finished)
	awakening.beat.connect(_on_awakening_beat)
	awakening.action.connect(_on_cinematic_action)
	add_child(awakening)
	ui.awakening = awakening
	awakening.start(str(simulation.state.player.name))

func _on_awakening_finished(_was_skipped: bool) -> void:
	if not awakening_active:
		return
	awakening_active = false
	if ui.has("awakening") and is_instance_valid(ui.awakening):
		ui.awakening.queue_free()
	$World.visible = true
	_complete_first_light_handoff()
	_apply_responsive_layout()

func _complete_first_light_handoff() -> void:
	ui.top_bar.visible = true
	ui.command_dock.visible = true
	ui.guidance_panel.visible = true
	speed = 0
	selected_station = ""
	$World.focus_station("brewhouse")
	_set_status("CASTLE BREWMASTER APPOINTED · Select the copper brewhouse to inspect its condition.", true)
	$World.show_feedback("DAY ONE · OPENING COMMISSION · Select the highlighted copper brewhouse.", true)
	simulation.save_game()
	AudioDirector.sync_to_simulation(simulation.state)
	_refresh(true)

func _on_prologue_beat(kind: String) -> void:
	AudioDirector.handle_cinematic_beat("appointment", kind)

func _on_awakening_beat(kind: String) -> void:
	AudioDirector.handle_cinematic_beat("awakening", kind)

func _on_cinematic_action(kind: String) -> void:
	match kind:
		"advance": AudioDirector.play_cue("cinematic_advance")
		"skip": AudioDirector.play_cue("cinematic_skip")
		"doors": AudioDirector.play_cue("brewery_doors")

func _refresh(force_structure := false) -> void:
	last_revision = simulation.revision
	var state := simulation.state
	if started and not prologue_active and not awakening_active:
		AudioDirector.sync_to_simulation(state)
	var operations_mode := bool(state.get("operations_active", false)) or str(state.stage) == "operations_council"
	ui.batch_rail_panel.visible = operations_mode
	if str(state.stage) in ["week_planning", "delivery_recovery", "capacity_planning", "ready_to_package", "ready_to_serve", "council", "operations_council", "complete"]: selected_station = ""
	ui.cash.text = "¤ %s" % _format_number(int(state.cash))
	ui.confidence.text = "%d / 100" % int(state.count_confidence)
	ui.community.text = "%d / 100" % int(state.community_trust)
	ui.restoration.text = "%d%%" % int(state.restoration)
	ui.runway.text = "ESTATE FUNDS · APPROXIMATELY %d DAYS REMAINING" % int(state.runway_days)
	ui.rank.text = str(state.authority_role).to_upper()
	ui.stage.text = _stage_label(state)
	ui.stage.tooltip_text = _stage_label(state)
	ui.time.text = simulation.format_time() + (" · PAUSED" if speed == 0 else " · %d×" % speed)
	var judgment_pending := str(state.pending_issue) != "" or str(state.stage) in ["week_planning", "delivery_recovery", "capacity_planning", "council", "operations_council", "complete"]
	for clock_control in ui.clock_buttons:
		clock_control.button.disabled = judgment_pending and int(clock_control.speed) > 0
	ui.context.text = _context_eyebrow(state)
	ui.title.text = _context_title()
	ui.objective.text = _decision_objective() if str(state.pending_issue) != "" else simulation.objective_text()
	ui.batch.text = "%s · %.1f L · QUALITY %d · SAFETY %d" % [state.batch.recipe, float(state.batch.volume_l), int(state.batch.quality), int(state.batch.safety)]
	ui.inventory.visible = operations_mode
	ui.inventory.text = "FREE STOCK · malt %.1f kg · hops %.0f g · yeast %.0f · casks %.0f" % [float(state.inventory.malt.quantity), float(state.inventory.citrus_hops.quantity) * 1000.0, float(state.inventory.yeast.quantity), float(state.inventory.empty_keg.quantity)]
	ui.jobs.text = _jobs_text()
	ui.jobs.tooltip_text = _jobs_tooltip()
	ui.wait_button.visible = not simulation.get_active_jobs().is_empty()
	ui.role.text = "%s · %s" % [str(state.player.name).to_upper(), str(state.authority_role).to_upper()]
	ui.decision_title.text = _decision_title()
	ui.decision_objective.text = _decision_objective()
	ui.consequence.text = _consequence_text()
	ui.guidance.text = _guidance_text()
	var opening_guidance := str(state.get("campaign_phase", "weekly_management")) == "opening_commission"
	ui.guidance_panel.visible = started and not portrait_layout and not mobile_landscape_layout and opening_guidance and str(state.stage) in ["appointment","recommission","awaiting_brew_day","ready_to_mash"] and str(state.pending_issue) == ""
	var signature := JSON.stringify([state.stage, state.pending_issue, state.courtyard_prepared, state.labels_prepared, state.jobs, state.staff, state.stations, state.campaign_lost, state.get("delivery_problem", {}), state.get("delivery_recovery", {}), state.get("capacity_board", {}), state.get("production_batches", []), state.get("active_batch_id", ""), state.get("demand", {}), selected_station])
	if force_structure or signature != last_structure_signature:
		last_structure_signature = signature
		_rebuild_batch_rail()
		_rebuild_staff()
		_rebuild_actions()
		_rebuild_choices()
	$World.set_management_state(state)
	$World.set_story_state(state)
	_handle_story_transition(state)
	last_stage = str(state.stage)
	last_issue = str(state.pending_issue)
	_apply_responsive_layout()

func _stage_label(state: Dictionary) -> String:
	if state.pending_issue == "mash_drift": return "BREWING ALERT · MASH"
	if state.pending_issue == "missing_hops": return "BREWING ALERT · INGREDIENTS"
	if state.pending_issue == "amber_lauter_stall": return "BREWING ALERT · AMBER RUNOFF"
	var jobs := simulation.get_active_jobs()
	var opening := str(state.get("campaign_phase", "weekly_management")) == "opening_commission"
	if jobs.size() == 1: return "%s · %s" % ["OPENING COMMISSION" if opening else "IN PROGRESS", str(jobs[0].label).to_upper()]
	if jobs.size() > 1: return "%s · %d WORK ORDERS" % ["OPENING COMMISSION" if opening else "IN PROGRESS", jobs.size()]
	if opening: return "DAY %d · OPENING COMMISSION" % (int(state.game_minute) / 1440 + 1)
	if state.stage == "week_planning": return "WEEK %d · PRODUCTION PLAN" % int(state.week_number)
	if state.stage == "delivery_recovery": return "DELIVERY ALERT · RECOVERY"
	if state.stage == "capacity_planning": return "WEEK %d · CAPACITY BOARD" % int(state.week_number)
	if state.stage == "operations": return "WEEK %d · BREWERY IN MOTION" % int(state.week_number)
	if state.stage == "operations_council": return "WEEK %d · PRODUCTION COUNCIL" % int(state.week_number)
	return str(state.stage).replace("_", " ").to_upper()

func _context_eyebrow(state: Dictionary) -> String:
	if state.pending_issue != "": return "YOUR JUDGMENT"
	if str(state.get("campaign_phase", "weekly_management")) == "opening_commission":
		if not selected_station.is_empty(): return "OPENING COMMISSION · %s" % selected_station.replace("_"," ").to_upper()
		return "OPENING COMMISSION"
	if state.stage == "operations_council": return "WEEK %d · PRODUCTION LEDGER" % int(state.week_number)
	if bool(state.get("operations_active", false)): return "WEEK %d · LIVE PRODUCTION BOARD" % int(state.week_number)
	if not selected_station.is_empty(): return "%s · SELECTED WORK ZONE" % selected_station.replace("_"," ").to_upper()
	if state.stage == "week_planning": return "WEEK %d · YOUR COMMITMENT" % int(state.week_number)
	if state.stage == "delivery_recovery": return "THE PROMISE IS AT RISK"
	if state.stage == "capacity_planning": return "TWO PROMISES · ONE BREWHOUSE"
	return "THE FIRST WEEKLY BREW" if int(state.get("week_number", 1)) == 1 else "THE NEXT BREWING WEEK"

func _rebuild_batch_rail() -> void:
	_clear_children(ui.batch_rail)
	var overview := simulation.get_operations_overview()
	var batches: Array = overview.get("batches", [])
	if batches.is_empty():
		ui.operations_forecast.text = "PRODUCTION LEDGER\nNo live batch commitments."
		return
	var resources: Dictionary = overview.get("resources", {})
	var demand: Dictionary = overview.get("demand", {})
	var busy_stations := 0
	var lowest_condition := 101
	var worn_station := ""
	for station in overview.get("stations", []):
		if bool(station.get("busy", false)): busy_stations += 1
		if int(station.get("condition", 100)) < lowest_condition:
			lowest_condition = int(station.get("condition", 100))
			worn_station = str(station.get("name", "station"))
	ui.operations_forecast.text = "FREE · malt %.1f kg · hops %.0f g\nPACK · yeast %d · casks %d\nDEMAND · local %d · premium %d · reliability %d\nCAPACITY · %d / 4 occupied" % [
		float(resources.get("malt_kg", 0.0)),
		float(resources.get("hops_kg", 0.0)) * 1000.0,
		int(resources.get("yeast", 0)),
		int(resources.get("kegs", 0)),
		int(demand.get("community", 0)),
		int(demand.get("premium", 0)),
		int(demand.get("reliability", 0)),
		busy_stations
	]
	if not worn_station.is_empty():
		ui.operations_forecast.text += " · wear %s %d%%" % [worn_station, lowest_condition]
	for batch in batches:
		var button := Button.new()
		var selected := bool(batch.get("selected", false))
		var conflict := str(batch.get("conflict", ""))
		var status_line := str(batch.get("risk", "ON TRACK"))
		if not conflict.is_empty(): status_line += " · " + conflict
		var active_job: Dictionary = batch.get("active_job", {})
		var next_step := str(batch.get("next_step", "Review"))
		if not active_job.is_empty():
			next_step = "%s · %s left" % [str(active_job.get("label", "Work active")), _duration_label(maxi(0, int(active_job.get("ends", 0)) - int(simulation.state.game_minute)))]
		button.text = "%s%s · %s\n%s · Q%d/%d · %s\nNEXT · %s · %s remaining" % [
			"▶ " if selected else "",
			str(batch.get("contract", "Batch")),
			str(batch.get("recipe", "")),
			str(batch.get("stage", "")).replace("_", " ").to_upper(),
			int(batch.get("quality", 0)),
			int(batch.get("quality_target", 0)),
			status_line,
			next_step,
			_duration_label(int(batch.get("minutes_left", 0)))
		]
		button.custom_minimum_size = Vector2(315, 70)
		button.alignment = HORIZONTAL_ALIGNMENT_LEFT
		button.toggle_mode = true
		button.button_pressed = selected
		button.disabled = str(simulation.state.stage) == "operations_council"
		button.tooltip_text = "%s. Select this batch to assign its next work order." % status_line
		button.add_theme_color_override("font_color", Color("#d9826b") if str(batch.get("risk", "")) in ["LATE", "AT RISK"] else CREAM)
		button.pressed.connect(_select_operations_batch.bind(str(batch.get("id", ""))))
		ui.batch_rail.add_child(button)

func _duration_label(minutes: int) -> String:
	var absolute := absi(minutes)
	if minutes < 0: return "%s late" % _duration_label(absolute)
	var days := absolute / 1440
	var hours := (absolute % 1440) / 60
	var mins := absolute % 60
	if days > 0: return "%dd %dh" % [days, hours]
	if hours > 0: return "%dh %02dm" % [hours, mins]
	return "%dm" % mins

func _rebuild_staff() -> void:
	var picker: OptionButton = ui.staff_picker
	picker.clear()
	var selected_index := -1
	var first_available_index := -1
	var summaries := simulation.get_staff_summary()
	for index in range(summaries.size()):
		var member: Dictionary = summaries[index]
		var status := "ON TASK" if str(member.assignment) != "" else ("AVAILABLE" if member.available else "OFF SHIFT")
		picker.add_item("%s · %s" % [str(member.name).split(" ")[0], status])
		picker.set_item_metadata(index, member.id)
		picker.set_item_disabled(index, not member.available)
		if bool(member.available) and first_available_index < 0: first_available_index = index
		if member.id == selected_staff_id and bool(member.available): selected_index = index
	if picker.item_count == 0: return
	if selected_index < 0: selected_index = first_available_index if first_available_index >= 0 else 0
	picker.select(selected_index)
	selected_staff_id = str(picker.get_item_metadata(selected_index))
	picker.disabled = first_available_index < 0 or str(simulation.state.stage) in ["week_planning", "delivery_recovery", "capacity_planning", "council", "operations_council", "complete"] or str(simulation.state.pending_issue) != ""
	picker.tooltip_text = "No worker can be assigned during this decision." if picker.disabled else "Choose an available worker for the next work order."
	_update_selected_staff_summary(summaries)

func _update_selected_staff_summary(summaries: Array) -> void:
	for member in summaries:
		if str(member.id) != selected_staff_id: continue
		var skills: Dictionary = simulation.state.staff[selected_staff_id].skills
		var strongest := "service"
		var level := -1
		for skill in skills:
			if int(skills[skill]) > level:
				strongest = skill
				level = int(skills[skill])
		var energy := int(member.energy)
		var fatigue := "FRESH" if energy >= 70 else ("STEADY" if energy >= 50 else ("TIRED · +25% time" if energy >= 30 else "EXHAUSTED · +45% time"))
		ui.staff_summary.text = "%s · %s %d · energy %d · %s\nShift %02d:%02d–%02d:%02d" % [member.role, str(strongest).capitalize(), level, energy, fatigue, int(member.shift_start)/60, int(member.shift_start)%60, int(member.shift_end)/60, int(member.shift_end)%60]
		return

func _rebuild_actions() -> void:
	_clear_children(ui.actions)
	var available := simulation.get_available_actions()
	var shown := 0
	var operations_mode := bool(simulation.state.get("operations_active", false))
	var world_selection_required := not operations_mode and str(simulation.state.stage) in ["recommission", "ready_to_mash", "ready_to_boil", "ready_to_transfer", "fermenting"]
	for action in available:
		if world_selection_required and selected_station.is_empty(): continue
		if not operations_mode and not selected_station.is_empty() and str(action.station) != selected_station: continue
		var card := VBoxContainer.new()
		card.custom_minimum_size = Vector2(205, 72) if mobile_landscape_layout else Vector2(225, 126)
		card.add_theme_constant_override("separation", 3)
		var button := Button.new()
		var batch_prefix := ""
		if operations_mode and str(action.get("batch_id", "")) != "":
			batch_prefix = "%s · " % str(simulation.state.batch.get("recipe", "Batch")).to_upper()
		var preview := simulation.get_assignment_preview(action, selected_staff_id)
		var shown_duration := int(preview.duration)
		var cost_text := " · ¤%d" % int(action.get("cash_cost", 0)) if int(action.get("cash_cost", 0)) > 0 else ""
		var availability := _action_availability(action)
		button.disabled = not bool(availability.ok)
		var worker_name := str(simulation.state.staff.get(selected_staff_id, {}).get("name", "Choose worker")).to_upper()
		var skill_name := str(preview.required_skill).capitalize()
		if bool(preview.blocked):
			button.text = "%s%s\n%s · %s %d\nCANNOT PERFORM SAFETY-CRITICAL WORK" % [batch_prefix, action.label, worker_name, skill_name, int(preview.skill_level)]
		else:
			button.text = "%s%s\n%s · %s %d\n%d MIN · %d%% FAILURE RISK%s" % [batch_prefix, action.label, worker_name, skill_name, int(preview.skill_level), shown_duration, int(preview.failure_risk), cost_text]
		button.custom_minimum_size = Vector2(0, 48) if mobile_landscape_layout else Vector2(0, 92)
		if mobile_landscape_layout: button.add_theme_font_size_override("font_size", 10)
		var energy_text := ""
		if simulation.state.staff.has(selected_staff_id): energy_text = " · energy %d" % int(simulation.state.staff[selected_staff_id].energy)
		button.tooltip_text = str(availability.reason) if button.disabled else "Assign %s and begin this work order%s" % [simulation.state.staff[selected_staff_id].name, energy_text]
		button.pressed.connect(_start_action.bind(action.id))
		card.add_child(button)
		var consequence := Label.new()
		consequence.text = ("BLOCKED · %s" % str(availability.reason)) if bool(preview.blocked) else "IF IT FAILS · %s" % str(preview.failure_consequence)
		consequence.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		consequence.add_theme_font_size_override("font_size", 8 if mobile_landscape_layout else 9)
		consequence.max_lines_visible = 2
		consequence.add_theme_color_override("font_color", Color("#d57a68") if bool(preview.blocked) else MUTED)
		card.add_child(consequence)
		ui.actions.add_child(card)
		shown += 1
	if shown == 0:
		var empty := VBoxContainer.new()
		empty.custom_minimum_size = Vector2(210, 60) if mobile_landscape_layout else Vector2(250, 80)
		var heading := Label.new()
		if simulation.state.pending_issue != "": heading.text = "PRODUCTION PAUSED"
		elif simulation.state.stage == "week_planning": heading.text = "CHOOSE THIS WEEK'S COMMITMENT"
		elif simulation.state.stage == "delivery_recovery": heading.text = "CHOOSE HOW TO RECOVER"
		elif simulation.state.stage == "capacity_planning": heading.text = "COMMITMENTS REQUIRE JUDGMENT"
		elif simulation.state.stage == "council": heading.text = "THE LEDGER IS OPEN"
		elif simulation.state.stage == "operations_council": heading.text = "THE PRODUCTION LEDGER IS OPEN"
		elif operations_mode: heading.text = "SELECT ANOTHER BATCH OR WAIT"
		elif simulation.state.stage == "complete": heading.text = "THE NEXT INVESTMENT"
		else: heading.text = "ACTIVE WORK" if not simulation.get_active_jobs().is_empty() else ("NO COMMAND AT THIS STATION" if not selected_station.is_empty() else "CHOOSE A WORK ZONE")
		heading.add_theme_font_size_override("font_size", 11)
		heading.add_theme_color_override("font_color", COPPER)
		empty.add_child(heading)
		var copy := Label.new()
		if simulation.state.pending_issue != "": copy.text = "Read the equipment and choose a response in the decision panel."
		elif simulation.state.stage == "week_planning": copy.text = "Compare the two promises in the planning panel before assigning workers."
		elif simulation.state.stage == "delivery_recovery": copy.text = "The batch cannot be delivered unchanged. Choose who carries the cost."
		elif simulation.state.stage == "capacity_planning": copy.text = "Accept, renegotiate, or reject both opportunities, then lock the production plan."
		elif simulation.state.stage == "council": copy.text = "Choose how the estate answers in the council panel."
		elif simulation.state.stage == "operations_council": copy.text = "Review every commitment, then choose how the estate uses this week's result."
		elif operations_mode: copy.text = "A selected batch may be waiting on shared equipment, an active worker, or its fermentation clock."
		elif simulation.state.stage == "complete": copy.text = "Choose a restoration proposal or preserve the remaining cash."
		else: copy.text = "Watch the progress ring or jump to its completion." if not simulation.get_active_jobs().is_empty() else ("Select another equipment marker or press Esc to show all commands." if not selected_station.is_empty() else "Select a glowing equipment marker in the brewery.")
		copy.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		copy.add_theme_font_size_override("font_size", 11)
		copy.add_theme_color_override("font_color", MUTED)
		empty.add_child(copy)
		ui.actions.add_child(empty)

func _action_availability(action: Dictionary) -> Dictionary:
	if not simulation.state.staff.has(selected_staff_id):
		return {"ok": false, "reason": "Choose a worker before starting this work order."}
	if not simulation.is_staff_available(selected_staff_id):
		return {"ok": false, "reason": "%s is off shift or already assigned." % simulation.state.staff[selected_staff_id].name}
	var preview := simulation.get_assignment_preview(action, selected_staff_id)
	if bool(preview.blocked):
		return {"ok": false, "reason": str(preview.block_reason)}
	var station_id := str(action.get("station", ""))
	if simulation.state.stations.has(station_id) and bool(simulation.state.stations[station_id].busy):
		return {"ok": false, "reason": "%s is already occupied." % simulation.state.stations[station_id].name}
	if int(action.get("cash_cost", 0)) > int(simulation.state.cash):
		return {"ok": false, "reason": "This work order needs ¤%d working cash." % int(action.get("cash_cost", 0))}
	return {"ok": true, "reason": ""}

func _rebuild_choices() -> void:
	_clear_children(ui.choices)
	var choices: Array = []
	var planning: bool = simulation.state.stage == "week_planning"
	var recovery: bool = simulation.state.stage == "delivery_recovery"
	var capacity: bool = simulation.state.stage == "capacity_planning"
	var council: bool = simulation.state.stage in ["council", "operations_council"]
	var restoration: bool = simulation.state.stage == "complete"
	if simulation.state.pending_issue != "": choices = simulation.get_issue_options()
	elif planning: choices = simulation.get_week_plan_options()
	elif recovery: choices = simulation.get_delivery_recovery_options()
	elif capacity:
		_rebuild_capacity_choices()
		ui.decision_panel.visible = true
		_reveal(ui.decision_panel)
		return
	elif council: choices = simulation.get_council_options()
	elif restoration: choices = simulation.get_restoration_options()
	for choice in choices:
		var button := Button.new()
		button.text = "%s\n%s" % [choice.label, choice.effect]
		button.custom_minimum_size = Vector2(0, 60)
		button.alignment = HORIZONTAL_ALIGNMENT_LEFT
		button.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
		button.tooltip_text = "Commit the Old Stables to %s" % choice.label if planning else str(choice.effect)
		button.pressed.connect((_choose_week_plan if planning else _choose_delivery_recovery if recovery else _choose_council if council else _fund_restoration if restoration else _choose_issue).bind(choice.id))
		ui.choices.add_child(button)
	ui.decision_panel.visible = not choices.is_empty() or planning or recovery or council or restoration
	if ui.decision_panel.visible: _reveal(ui.decision_panel)

func _rebuild_capacity_choices() -> void:
	for opportunity in simulation.get_capacity_opportunities():
		var card := VBoxContainer.new()
		card.add_theme_constant_override("separation", 5)
		var heading := Label.new()
		heading.text = "%s · %s" % [str(opportunity.label).to_upper(), str(opportunity.recipe).to_upper()]
		heading.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		heading.add_theme_font_size_override("font_size", 15)
		heading.add_theme_color_override("font_color", CREAM)
		card.add_child(heading)
		var terms := Label.new()
		var resources: Dictionary = opportunity.get("resources", {})
		terms.text = "%s\nNEEDS · %.1f kg malt · %.0f g hops · %d yeast · %d cask · %d staff hours · ¤%d\nCURRENT RESPONSE · %s" % [
			str(opportunity.effect),
			float(resources.get("malt_kg", 0.0)),
			float(resources.get("hops_kg", 0.0)) * 1000.0,
			int(resources.get("yeast", 0)),
			int(resources.get("kegs", 0)),
			int(resources.get("staff_hours", 0)),
			int(resources.get("cash", 0)),
			str(opportunity.get("response", "pending")).replace("_", " ").to_upper()
		]
		terms.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		terms.add_theme_font_size_override("font_size", 15)
		terms.add_theme_color_override("font_color", SAGE)
		card.add_child(terms)
		var responses := HBoxContainer.new()
		responses.add_theme_constant_override("separation", 5)
		for decision in ["accept", "renegotiate", "reject"]:
			var button := Button.new()
			button.text = str(decision).capitalize()
			button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
			button.custom_minimum_size = Vector2(0, 38)
			var already_answered := str(opportunity.get("response", "pending")) != "pending"
			button.disabled = already_answered or (decision == "accept" and not bool(opportunity.get("can_accept", true))) or (decision == "renegotiate" and not bool(opportunity.get("can_renegotiate", true)))
			button.tooltip_text = "This opportunity already has a recorded response." if already_answered else ("The current resources cannot support this response." if button.disabled else "%s %s" % [str(decision).capitalize(), str(opportunity.label)])
			button.pressed.connect(_respond_to_capacity.bind(str(opportunity.id), decision))
			responses.add_child(button)
		card.add_child(responses)
		ui.choices.add_child(card)
		ui.choices.add_child(HSeparator.new())
	var finalize := Button.new()
	finalize.text = "Lock the production plan\nStart the first batch and queue any second commitment"
	finalize.custom_minimum_size = Vector2(0, 58)
	finalize.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
	finalize.add_theme_color_override("font_color", Color("#f4d09c"))
	finalize.pressed.connect(_finalize_capacity_plan)
	ui.choices.add_child(finalize)

func _start_action(action_id: String) -> void:
	var action := {}
	for candidate in simulation.get_available_actions():
		if str(candidate.id) == action_id: action = candidate; break
	var result := simulation.start_action(action_id, selected_staff_id)
	if result.ok and action_id != "accept_key" and speed == 0: speed = 1
	if result.ok and not action.is_empty():
		selected_station = str(action.station) if str(action.station) != "estate" else ""
		if selected_station != "": $World.focus_station(selected_station)
		AudioDirector.play_action(action_id)
	_show_result(result)
	if result.ok: simulation.save_game()

func _choose_issue(option_id: String) -> void:
	var result := simulation.choose_issue(option_id)
	_play_cue("decision" if result.ok else "error")
	_show_result(result)
	if result.ok: simulation.save_game()

func _choose_council(option_id: String) -> void:
	var result := simulation.resolve_operations_council(option_id) if simulation.state.stage == "operations_council" else simulation.resolve_council(option_id)
	if not result.ok: _play_cue("error")
	_show_result(result)
	if result.ok: simulation.save_game()

func _choose_week_plan(plan_id: String) -> void:
	var result := simulation.choose_week_plan(plan_id)
	_play_cue("decision" if result.ok else "error")
	if result.ok:
		speed = 1
		selected_station = ""
	_show_result(result)
	if result.ok: simulation.save_game()

func _choose_delivery_recovery(option_id: String) -> void:
	var result := simulation.choose_delivery_recovery(option_id)
	_play_cue("decision" if result.ok else "error")
	_show_result(result)
	if result.ok: simulation.save_game()

func _respond_to_capacity(opportunity_id: String, decision: String) -> void:
	var result := simulation.respond_to_capacity_opportunity(opportunity_id, decision)
	if result.ok:
		AudioDirector.play_cue("contract_accept" if decision == "accept" else ("ui_page_turn" if decision == "renegotiate" else "ui_cancel"))
	else:
		_play_cue("error")
	_show_result(result)
	if result.ok: simulation.save_game()

func _finalize_capacity_plan() -> void:
	var result := simulation.finalize_capacity_plan()
	_play_cue("work" if result.ok else "error")
	if result.ok:
		speed = 1
		selected_station = ""
	_show_result(result)
	if result.ok: simulation.save_game()

func _select_operations_batch(batch_id: String) -> void:
	var result := simulation.select_operations_batch(batch_id)
	_play_cue("select" if result.ok else "error")
	_show_result(result)
	if result.ok: simulation.save_game()

func _fund_restoration(project_id: String) -> void:
	var begins_next_week := project_id == "begin_next_week"
	var result := simulation.begin_next_week() if begins_next_week else simulation.fund_restoration(project_id)
	AudioDirector.play_cue("resource_spend" if result.ok and not begins_next_week else ("day_advance" if result.ok else "ui_invalid"))
	if result.ok and begins_next_week:
		selected_station = ""
		speed = 0
	_show_result(result)
	if result.ok: simulation.save_game()

func _advance_to_milestone() -> void:
	_show_result(simulation.advance_to_next_milestone())
	AudioDirector.play_cue("day_advance")

func _on_staff_selected(index: int) -> void:
	selected_staff_id = str(ui.staff_picker.get_item_metadata(index))
	_update_selected_staff_summary(simulation.get_staff_summary())
	_rebuild_actions()
	$World.show_feedback("%s is ready for assignment." % simulation.state.staff[selected_staff_id].name, true)
	_play_cue("select")

func _on_world_station_selected(id: String) -> void:
	selected_station = id
	last_structure_signature = ""
	if id == "brewhouse" and str(simulation.state.stage) == "recommission" and not bool(simulation.state.get("brewhouse_inspected", false)):
		var inspection := simulation.inspect_brewhouse()
		_set_status(str(inspection.message), bool(inspection.ok))
		simulation.save_game()
	_refresh(true)
	if id == "brewhouse" and str(simulation.state.stage) == "recommission":
		$World.show_feedback("COPPER BREWHOUSE · CONDITION %d · CLEANLINESS %d · Recommissioning work is now available." % [int(simulation.state.stations.brewhouse.condition), int(simulation.state.stations.brewhouse.cleanliness)], true)
	else:
		$World.show_feedback("%s selected — available commands are below." % id.replace("_"," ").capitalize(), true)
	_play_cue("select")

func _close_mobile_context() -> void:
	selected_station = ""
	last_structure_signature = ""
	$World.clear_focus()
	_refresh(true)

func _on_world_station_hovered(id: String, entered: bool) -> void:
	if entered:
		ui.context.text = "%s · CLICK TO FOCUS" % id.replace("_"," ").to_upper()
		AudioDirector.play_cue("ui_focus")
	else: ui.context.text = _context_eyebrow(simulation.state)

func _set_speed(value: int) -> void:
	if value > 0 and (str(simulation.state.pending_issue) != "" or str(simulation.state.stage) in ["week_planning", "delivery_recovery", "capacity_planning", "council", "operations_council", "complete"]):
		speed = 0
		_set_status("Resolve the current judgment before restarting the estate clock.", false)
		_refresh()
		return
	speed = value
	_set_status("Estate clock paused." if value == 0 else "Estate clock running at %d×." % value, true)
	_refresh()

func _save_game() -> void:
	var result := simulation.save_game()
	AudioDirector.play_cue("ui_page_turn" if result.ok else "ui_invalid")
	_show_result(result)

func _load_game() -> void:
	var result := simulation.load_game()
	if result.ok:
		started = true
		var player: Dictionary = simulation.state.player
		$World.customize_player(player.name, int(player.coat_index))
		AudioDirector.sync_to_simulation(simulation.state)
		AudioDirector.play_cue("ui_page_turn")
		_refresh(true)
	_show_result(result)

func _show_result(result: Dictionary) -> void:
	_set_status(str(result.message), bool(result.ok))
	$World.show_feedback(str(result.message), bool(result.ok))
	if not result.ok: _play_cue("error")
	_refresh()

func _set_status(message: String, positive: bool) -> void:
	ui.status.text = message
	ui.status.add_theme_color_override("font_color", SAGE if positive else Color("#d57a68"))

func _jobs_text() -> String:
	var lines := []
	for job in simulation.get_active_jobs():
		var batch_name := ""
		for batch in simulation.state.get("production_batches", []):
			if str(batch.id) == str(job.get("batch_id", "")): batch_name = "%s · " % str(batch.recipe).to_upper()
		var work_name := str(job.get("base_action", job.get("label", "work"))).replace("_", " ").to_upper()
		if work_name == "FERMENTATION": work_name = "FERMENTING"
		lines.append("%s%s · %s" % [batch_name, work_name, _duration_label(max(0, int(job.ends) - int(simulation.state.game_minute)))])
	return "\n".join(lines) if not lines.is_empty() else "No active work order"

func _jobs_tooltip() -> String:
	var lines := []
	for job in simulation.get_active_jobs():
		var staff_name := str(simulation.state.staff.get(str(job.staff_id), {}).get("name", "Unassigned"))
		lines.append("%s at %s · %s · %s remaining" % [job.label, str(job.station).replace("_", " ").capitalize(), staff_name, _duration_label(max(0, int(job.ends) - int(simulation.state.game_minute)))])
	return "\n".join(lines) if not lines.is_empty() else "No active work orders."

func _context_title() -> String:
	if simulation.state.pending_issue == "amber_lauter_stall": return "Amber runoff stalled"
	var issue_title := _issue_title()
	if not issue_title.is_empty(): return issue_title
	if simulation.state.stage == "week_planning": return "Choose a promise"
	if simulation.state.stage == "delivery_recovery": return "Delivery at risk"
	if simulation.state.stage == "capacity_planning": return "Capacity board"
	if simulation.state.stage == "operations": return "%s · live work order" % str(simulation.state.batch.recipe)
	if simulation.state.stage == "operations_council": return "The production ledger"
	if simulation.state.stage == "council": return "Opening Commission accounts" if str(simulation.state.get("campaign_phase", "")) == "opening_commission" else "Apolline opens the ledger"
	if simulation.state.stage == "complete": return "Week %d closes" % int(simulation.state.get("week_number", 1))
	if selected_station == "brewhouse": return "Copper brewhouse"
	if not selected_station.is_empty(): return selected_station.replace("_"," ").capitalize()
	if str(simulation.state.get("campaign_phase", "")) == "opening_commission": return "Opening Commission"
	return "The First Weekly Brew" if int(simulation.state.get("week_number", 1)) == 1 else str(simulation.state.batch.recipe)

func _decision_title() -> String:
	var issue_title := _issue_title()
	if not issue_title.is_empty(): return issue_title
	if simulation.state.stage == "week_planning": return "Two promises, one brewhouse"
	if simulation.state.stage == "delivery_recovery": return "Who carries the failed promise?"
	if simulation.state.stage == "capacity_planning": return "Two opportunities, finite capacity"
	if simulation.state.stage == "operations_council": return "The production council · Week %d" % int(simulation.state.get("week_number", 1))
	if simulation.state.stage == "council": return "The first financial review" if str(simulation.state.get("campaign_phase", "")) == "opening_commission" else "The weekly council · Week %d" % int(simulation.state.get("week_number", 1))
	if simulation.state.stage == "complete": return "The estate answers"
	return "A decision is waiting"

func _decision_objective() -> String:
	if simulation.state.pending_issue == "amber_lauter_stall":
		return "Stable Amber's toasted grain bed has compacted. Choose how to restore its runoff."
	if simulation.state.stage == "delivery_recovery":
		return "Choose how the estate responds before the result reaches the council ledger."
	if simulation.state.stage == "capacity_planning":
		return "Respond to both opportunities, balancing malt, casks, staff hours, cash, and fermenter overlap."
	if simulation.state.stage == "operations_council":
		return "Compare every delivery, rejected promise, demand shift, and resource cost before setting the estate's priority."
	return simulation.objective_text()

func _consequence_text() -> String:
	var state := simulation.state
	if state.stage == "week_planning":
		return "FESTIVAL · more cash, more guests, tighter deadline\nRESERVE · higher quality target, more preparation time"
	if state.stage == "delivery_recovery":
		var problem: Dictionary = state.get("delivery_problem", {})
		var reasons: Array = problem.get("reasons", [])
		var readable := []
		for reason in reasons:
			match str(reason):
				"missed_quality": readable.append("QUALITY %d / %d" % [int(problem.get("quality", state.batch.get("quality", 0))), int(problem.get("target", state.promise.get("quality_target", 0)))])
				"late_delivery": readable.append("DEADLINE MISSED")
				"damaged_equipment": readable.append("EQUIPMENT DAMAGE")
		return "%s\nRenegotiate, discount, repair first, or absorb the loss." % " · ".join(readable)
	if state.stage == "capacity_planning":
		var board: Dictionary = state.get("capacity_board", {})
		var constraints: Dictionary = board.get("constraints", {})
		var pressure: Dictionary = board.get("pressure", {})
		return "AVAILABLE · %.1f kg malt · %.0f g hops · %d yeast · %d casks · %d staff hours · ¤%d\nPRESSURE · %s · fermenter overlap %s" % [float(constraints.get("malt_kg", 0.0)), float(constraints.get("hops_kg", 0.0)) * 1000.0, int(constraints.get("yeast", 0)), int(constraints.get("kegs", 0)), int(constraints.get("staff_hours", pressure.get("staff_hours_available", 0))), int(constraints.get("cash", 0)), "simultaneous commitments" if bool(pressure.get("simultaneous", false)) else "single commitment", "yes" if bool(pressure.get("fermenter_overlap", false)) else "no"]
	if state.stage == "operations_council":
		var fulfilled := 0
		var strained := 0
		for result in state.get("operations_results", []):
			if str(result.status) == "fulfilled": fulfilled += 1
			else: strained += 1
		var demand: Dictionary = state.get("demand", {})
		return "DELIVERED · %d fulfilled · %d strained\nDEMAND · community %d · premium %d · reliability %d" % [fulfilled, strained, int(demand.get("community", 0)), int(demand.get("premium", 0)), int(demand.get("reliability", 0))]
	if bool(state.get("operations_active", false)):
		var overview := simulation.get_operations_overview()
		var selected_batch: Dictionary = {}
		for candidate in overview.get("batches", []):
			if bool(candidate.get("selected", false)): selected_batch = candidate
		if not selected_batch.is_empty():
			var conflict := str(selected_batch.get("conflict", ""))
			return "DEADLINE · %s · %s\nNEXT · %s%s" % [_duration_label(int(selected_batch.get("minutes_left", 0))), str(selected_batch.get("risk", "ON TRACK")), str(selected_batch.get("next_step", "Review")), (" · " + conflict) if not conflict.is_empty() else ""]
	if state.stage == "complete":
		return "SERVICE · %d guests · ¤%d revenue\nCOUNCIL · score %d · %s" % [int(state.service_result.get("guests_served", 0)), int(state.service_result.get("revenue", 0)), int(state.council_result.get("score", 0)), state.authority_role]
	if state.pending_issue == "mash_drift":
		return "LANTERN BLONDE · protect its crisp finish\nTrade time and confidence against volume and body."
	if state.pending_issue == "missing_hops":
		return "LANTERN BLONDE · no usable hops are in store\nInspect the millstream vines, buy hops, or brew a softer beer."
	if state.pending_issue == "amber_lauter_stall":
		return "STABLE AMBER · quality target %d\nProtect its toasted depth without forcing a harsh runoff." % int(state.promise.get("quality_target", 72))
	if state.pending_issue != "":
		return "%s · production judgment\nEvery response changes flavor, schedule, cash, or trust." % str(state.batch.get("recipe", "Batch")).to_upper()
	if state.stage == "recommission" and selected_station == "brewhouse":
		return "CONDITION · %d / 100 · CLEANLINESS · %d / 100\nWORK REQUIRED · clear the chimney, clean the copper, and inspect the hearth before lighting it." % [int(state.stations.brewhouse.condition), int(state.stations.brewhouse.cleanliness)]
	if state.stage == "council":
		var outcome := str(state.service_result.get("contract_outcome", "")).replace("_", " ").to_upper()
		if not outcome.is_empty():
			return "%s · QUALITY %d / %d · %s\nSETTLEMENT ¤%d · trust %+d · confidence %+d" % [outcome, int(state.service_result.get("quality", 0)), int(state.service_result.get("quality_target", 0)), "LATE" if bool(state.service_result.get("late", false)) else "ON TIME", int(state.service_result.get("revenue", 0)), int(state.service_result.get("trust_delta", 0)), int(state.service_result.get("confidence_delta", 0))]
		return "Apolline weighs the village-inn delivery, its cost, and the estate’s remaining runway. This closes the Opening Commission." if str(state.get("campaign_phase", "")) == "opening_commission" else "Apolline weighs delivery, cash, trust, and the Count’s confidence. Your answer defines the next week."
	var deadline := int(state.promise.get("deadline_minute", 0))
	var deadline_day := deadline / 1440 + 1
	var deadline_minute := deadline % 1440
	return "PROMISE · %d guests · quality %d\nDEADLINE · Day %d at %02d:%02d" % [int(state.promise.get("guests", 0)), int(state.promise.get("quality_target", state.batch.get("quality", 0))), deadline_day, deadline_minute / 60, deadline_minute % 60]

func _issue_title() -> String:
	match str(simulation.state.pending_issue):
		"mash_drift": return "The copper runs hot"
		"missing_hops": return "The hops need judgment"
		"amber_lauter_stall": return "The amber runoff has stalled"
		_: return ""

func _guidance_text() -> String:
	match str(simulation.state.stage):
		"appointment": return "1 · Accept the stable key below — your first authority is the brewery itself."
		"recommission": return "1 · Select the copper brewhouse to inspect its condition." if not bool(simulation.state.get("brewhouse_inspected", false)) else "Inspection complete · choose a worker and recommission the copper."
		"awaiting_brew_day": return "2 · The copper is safe. Advance to Day 2 for the first brew."
		"ready_to_mash": return "3 · Return to the brewhouse and begin the %s mash." % simulation.state.batch.recipe
		_: return ""

func _handle_story_transition(state: Dictionary) -> void:
	var stage := str(state.stage)
	var issue := str(state.pending_issue)
	if last_stage != stage:
		match stage:
			"week_planning":
				AudioDirector.play_cue("ui_page_turn")
				$World.show_feedback("Two promises compete for the Old Stables.", true)
				_set_status("Time is paused until you choose this week's production commitment.", true)
			"delivery_recovery":
				AudioDirector.play_cue("contract_fail")
				$World.show_feedback("The delivery is at risk. Decide who carries the cost.", false)
				_set_status("Time is paused until the failed promise has a recovery plan.", false)
			"capacity_planning":
				AudioDirector.play_cue("ui_page_turn")
				$World.show_feedback("Two opportunities now compete for the same people and equipment.", true)
				_set_status("Time is paused while you negotiate the first overlapping production plan.", true)
			"operations":
				$World.show_feedback("The production board is live. Choose which batch gets the next worker and station.", true)
				_set_status("Shared capacity is live; select a batch before assigning its next work order.", true)
			"operations_council":
				var all_fulfilled := true
				for outcome in state.get("operations_results", []):
					if str(outcome.get("status", "")) != "fulfilled": all_fulfilled = false
				AudioDirector.play_cue("contract_complete" if all_fulfilled else "contract_fail")
				$World.show_feedback("Every production commitment has reached the ledger.", true)
				_set_status("Time is paused for the Week %d production council." % int(state.get("week_number", 1)), true)
			"recommission":
				$World.show_feedback("The stable key is yours. Inspect the copper brewhouse.", true)
				_set_status("Select the highlighted copper brewhouse to inspect its condition.", true)
			"awaiting_brew_day":
				$World.show_feedback("The chimney and hearth are being made safe for tomorrow’s brew.", true)
				_set_status("Opening Commission · advance to Day 2 when the copper is ready.", true)
			"ready_to_mash":
				$World.show_feedback("The copper is ready. %s can begin." % state.batch.recipe, true)
				_set_status("The brewhouse is ready for the next mash.", true)
			"fermenting":
				$World.show_feedback("Yeast takes the seven-day watch. Arrange the village-inn delivery while it works.", true)
				_set_status("Opening Commission · fermentation is active; loading-court and packaging preparation can proceed.", true)
			"conditioning":
				$World.show_feedback("Seven days of fermentation are complete. The beer settles for packaging on Day 10.", true)
				_set_status("Opening Commission · the first cask can be packaged on Day 10.", true)
			"ready_to_package":
				$World.show_feedback("Fermentation is complete. The first cask can be filled.", true)
				_set_status("Assign Maëlle or another packager to fill the first cask.", true)
			"ready_to_serve":
				$World.show_feedback("The cask is ready for the loading court and the village inn.", true)
				_set_status("Opening Commission · load the cask, then deliver it on Day 11.", true)
			"council":
				AudioDirector.play_cue("contract_complete" if str(state.promise.get("status", "")) == "kept" else "contract_fail")
				$World.show_feedback("The village-inn account is settled. Apolline opens the ledger.", true)
				_set_status("Time is paused for the Opening Commission financial review." if str(state.get("campaign_phase", "")) == "opening_commission" else "Time is paused for the Week %d council." % int(state.get("week_number", 1)), true)
			"complete":
				var score := int(state.get("council_result", {}).get("score", 0))
				AudioDirector.play_cue("council_result_positive" if score >= 150 else ("council_result_mixed" if score >= 110 else "council_result_negative"))
				$World.show_feedback("The Count has made his judgment.", true)
				_set_status("Week %d is closed; choose the estate's next investment." % int(state.get("week_number", 1)), true)
	if last_issue == "" and issue != "":
		var alert_title := _issue_title()
		$World.show_feedback(("%s — choose a response." % alert_title) if not alert_title.is_empty() else "A brewing problem needs your judgment.", false)
		_set_status("Production paused — choose a response in the decision panel.", false)
		_play_cue("alert")

func _reveal(node: CanvasItem) -> void:
	node.modulate.a = 0.0
	var tween := create_tween()
	tween.tween_property(node, "modulate:a", 1.0, 0.24).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)

func _play_cue(kind: String) -> void:
	var mapping := {
		"select": "ui_press",
		"work": "ui_confirm",
		"decision": "ui_confirm",
		"alert": "ui_warning",
		"appointment": "council_result_mixed",
		"bell": "environment_distant_bell",
		"ledger": "ui_page_turn",
		"key": "contract_accept",
		"lamp": "light_furnace",
		"error": "ui_invalid",
	}
	AudioDirector.play_cue(str(mapping.get(kind, "ui_press")))

func _clear_children(node: Node) -> void:
	for child in node.get_children(): child.queue_free()

func _format_number(value: int) -> String:
	var raw := str(value)
	var output := ""
	var count := 0
	for index in range(raw.length() - 1, -1, -1):
		if count > 0 and count % 3 == 0: output = "," + output
		output = raw[index] + output
		count += 1
	return output
