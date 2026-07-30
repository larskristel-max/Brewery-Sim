from __future__ import annotations

import json
import sys
from pathlib import Path


def main(folder: Path) -> int:
    required = ["manifest.json", "starting_state.json", "events.json", "demand_patterns.json", "calibration.json"]
    failures = []
    data = {}
    for filename in required:
        path = folder / filename
        if not path.exists():
            failures.append(f"missing {filename}")
            continue
        try:
            data[filename] = json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            failures.append(f"invalid {filename}: {exc}")
    manifest = data.get("manifest.json", {})
    privacy = manifest.get("privacy", {})
    for key, value in privacy.items():
        if key.startswith("contains_") and value is not False:
            failures.append(f"privacy flag {key} is not false")
    ids = [row["event_id"] for row in data.get("events.json", [])]
    if len(ids) != len(set(ids)):
        failures.append("event ids are not unique")
    if failures:
        print("Scenario validation: FAIL")
        for failure in failures:
            print(" -", failure)
        return 1
    print(f"Scenario validation: PASS ({len(ids)} events)")
    return 0
if __name__ == "__main__":
    raise SystemExit(main(Path(sys.argv[1] if len(sys.argv) > 1 else "godot/data/imported_scenario")))
