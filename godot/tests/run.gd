extends SceneTree

func _init() -> void:
	var failures:Array[String]=[]
	for path in ["manifest.json","catalog.json","recipes.json","starting_state.json","campaign.json"]:
		var full="res://data/scenario/"+path
		if not FileAccess.file_exists(full): failures.append("Missing "+full); continue
		var parsed=JSON.parse_string(FileAccess.get_file_as_string(full))
		if parsed==null: failures.append("Invalid JSON "+full)
	var scenario=JSON.parse_string(FileAccess.get_file_as_string("res://data/scenario/starting_state.json"))
	if scenario and scenario.cash_credits<=0: failures.append("Starting cash must be positive")
	var recipes=JSON.parse_string(FileAccess.get_file_as_string("res://data/scenario/recipes.json"))
	if recipes and recipes.recipes[0].batch_l>25: failures.append("Recipe exceeds fermenter capacity")
	var simulation_suite: RefCounted = load("res://tests/simulation_test.gd").new()
	failures.append_array(simulation_suite.run())
	if failures.is_empty():
		print("Old Stables validation: PASS (data + complete management routes + persistence)")
		quit(0)
	else:
		for failure in failures: push_error(failure)
		quit(1)
