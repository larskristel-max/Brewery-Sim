extends SceneTree

const WORLD_SCRIPT := preload("res://scripts/concept_world.gd")
const PROLOGUE_SCRIPT := preload("res://scripts/prologue_cinematic.gd")
const FACE_POINTS := {
	"count": Vector2(0.29, 0.19),
	"apolline": Vector2(0.80, 0.25)
}
const SPEAKER_SHOTS := {
	1: "apolline",
	2: "count",
	3: "apolline",
	4: "count",
	5: "apolline",
	6: "count",
	7: "count",
	8: "apolline"
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
	world.current_scene = "appointment"
	var texture: Texture2D = world.SCENES.appointment
	var texture_size := Vector2(texture.get_width(), texture.get_height())
	for viewport_size in VIEWPORT_CASES:
		world.size = viewport_size
		for shot_index in SPEAKER_SHOTS:
			var shot: Dictionary = PROLOGUE_SCRIPT.SHOTS[shot_index]
			world.camera_focus = shot.focus
			world.camera_zoom = float(shot.zoom)
			var source: Rect2 = world._source_rect(texture)
			var face_name: String = SPEAKER_SHOTS[shot_index]
			var face_in_texture: Vector2 = FACE_POINTS[face_name] * texture_size
			var face_on_screen := (face_in_texture - source.position) / source.size
			_expect(
				face_on_screen.x >= 0.06 and face_on_screen.x <= 0.94,
				"Shot %d cropped %s horizontally at %s: %s" % [shot_index, face_name, viewport_size, face_on_screen]
			)
			_expect(
				face_on_screen.y >= 0.11 and face_on_screen.y <= 0.58,
				"Shot %d placed %s behind a letterbox or subtitle at %s: %s" % [shot_index, face_name, viewport_size, face_on_screen]
			)
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
