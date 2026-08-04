extends SceneTree

const WORLD_SCRIPT := preload("res://scripts/concept_world.gd")
const PROLOGUE_SCRIPT := preload("res://scripts/prologue_cinematic.gd")
const FACE_POINTS := {
	"appointment_council": {
		"count": Vector2(0.27, 0.20),
		"apolline": Vector2(0.72, 0.27),
		"cecile": Vector2(0.90, 0.27)
	},
	"appointment": {
		"count": Vector2(0.29, 0.19),
		"apolline": Vector2(0.78, 0.25),
		"cecile": Vector2(0.92, 0.27)
	}
}
const SPEAKER_SHOTS := {
	1: "cecile",
	2: "apolline",
	3: "count",
	4: "apolline",
	5: "cecile",
	6: "count",
	7: "apolline",
	8: "count",
	9: "count",
	10: "apolline"
}
const VIEWPORT_CASES := [
	Vector2(1280, 720),
	Vector2(1280, 592),
	Vector2(540, 1168)
]

var failures: Array[String] = []

func _init() -> void:
	call_deferred("_run")

func _run() -> void:
	var world := Control.new()
	world.set_script(WORLD_SCRIPT)
	root.add_child(world)
	await process_frame
	for viewport_size in VIEWPORT_CASES:
		world.size = viewport_size
		for shot_index in SPEAKER_SHOTS:
			var shot: Dictionary = PROLOGUE_SCRIPT.SHOTS[shot_index]
			var scene_id: String = "appointment_council" if shot_index < PROLOGUE_SCRIPT.BREWER_ENTRANCE_SHOT else "appointment"
			world.current_scene = scene_id
			world.camera_focus = shot.focus
			world.camera_zoom = float(shot.zoom)
			var texture: Texture2D = world.SCENES[scene_id]
			var texture_size := Vector2(texture.get_width(), texture.get_height())
			var source: Rect2 = world._source_rect(texture)
			var face_name: String = SPEAKER_SHOTS[shot_index]
			var face_in_texture: Vector2 = FACE_POINTS[scene_id][face_name] * texture_size
			var face_on_screen := (face_in_texture - source.position) / source.size
			_expect(
				face_on_screen.x >= 0.06 and face_on_screen.x <= 0.94,
				"Shot %d cropped %s horizontally at %s: %s" % [shot_index, face_name, viewport_size, face_on_screen]
			)
			_expect(
				face_on_screen.y >= 0.11 and face_on_screen.y <= 0.58,
				"Shot %d placed %s behind a letterbox or subtitle at %s: %s" % [shot_index, face_name, viewport_size, face_on_screen]
			)
	_expect(PROLOGUE_SCRIPT.BREWER_ENTRANCE_SHOT == 8, "The brewer should first appear when Armand addresses them in shot nine")
	world.queue_free()
	await process_frame
	if failures.is_empty():
		print("Old Stables prologue framing test: PASS (speaker faces remain inside the cinematic safe area)")
		quit(0)
	else:
		for failure in failures: push_error(failure)
		quit(1)

func _expect(condition: bool, message: String) -> void:
	if not condition: failures.append(message)
