"""Create a privacy-safe, gameplay-oriented scenario pack from the brewery workbook.

Only explicitly allowlisted sheets and columns are read. The exporter deliberately
does not emit names, addresses, VAT numbers, invoice numbers, bank data, payroll,
supplier prices, exact recipes, margins, or source file paths.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from collections import Counter
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any, Iterable

from openpyxl import load_workbook

EXPORT_VERSION = 1
DATE_SHIFT_DAYS = 173
SALT = "old-stables-fictional-estate-v1"

BEER_ALIASES = {
    "blonde": "Lantern Blonde",
    "pilsner": "Courtyard Pils",
    "ipa": "Orchard Pale",
    "sorachi": "Orchard Pale",
    "marckloff": "Stable Amber",
    "amber": "Stable Amber",
}


def stable_id(prefix: str, value: Any) -> str:
    digest = hashlib.sha256(f"{SALT}|{value}".encode("utf-8")).hexdigest()[:10]
    return f"{prefix}-{digest}"


def fictional_beer(value: Any) -> str:
    lowered = str(value or "").strip().lower()
    for token, alias in BEER_ALIASES.items():
        if token in lowered:
            return alias
    return "Estate Seasonal"


def safe_date(value: Any) -> str | None:
    if value in (None, ""):
        return None
    parsed: datetime | None = None
    if isinstance(value, datetime):
        parsed = value
    else:
        raw = str(value).strip().split(" ")[0]
        for pattern in ("%d/%m/%Y", "%d-%m-%Y", "%Y-%m-%d"):
            try:
                parsed = datetime.strptime(raw, pattern)
                break
            except ValueError:
                pass
    if not parsed:
        return None
    shifted = parsed + timedelta(days=DATE_SHIFT_DAYS)
    return f"1901-{shifted.month:02d}-{shifted.day:02d}"


def rows_as_dicts(sheet) -> Iterable[dict[str, Any]]:
    rows = sheet.iter_rows(values_only=True)
    headers = [str(v).strip() if v is not None else "" for v in next(rows)]
    for row in rows:
        yield {headers[i]: row[i] for i in range(min(len(headers), len(row)))}


def quantity_band(value: Any) -> str:
    try:
        quantity = abs(float(value or 0))
    except (TypeError, ValueError):
        return "unknown"
    if quantity <= 12:
        return "small"
    if quantity <= 72:
        return "medium"
    if quantity <= 400:
        return "large"
    return "cellar"


def customer_archetype(qty: Any, fmt: Any) -> str:
    try:
        amount = abs(float(qty or 0))
    except (TypeError, ValueError):
        amount = 0
    fmt_text = str(fmt or "").lower()
    if "fût" in fmt_text or "keg" in fmt_text:
        return "village_inn"
    if amount >= 100:
        return "estate_event"
    if amount >= 36:
        return "regional_shop"
    return "courtyard_guest"


def export_pack(source: Path, output: Path) -> dict[str, Any]:
    workbook = load_workbook(source, read_only=True, data_only=True)
    required = {"FG_Lots_Stock", "FG_Movements", "FG_Sales_Link"}
    missing = sorted(required - set(workbook.sheetnames))
    if missing:
        raise ValueError(f"Missing allowlisted sheets: {', '.join(missing)}")

    lots = []
    for row in rows_as_dicts(workbook["FG_Lots_Stock"]):
        opening = float(row.get("Opening_Qty") or 0)
        incoming = float(row.get("In_Qty") or 0)
        outgoing = float(row.get("Out_Qty") or 0)
        adjustment = float(row.get("Adjust_Qty") or 0)
        current = max(0.0, opening + incoming - outgoing + adjustment)
        if current <= 0:
            continue
        lots.append({
            "lot_id": stable_id("FG", row.get("Lot")),
            "beer": fictional_beer(row.get("Beer")),
            "package": "keg" if "fût" in str(row.get("Format") or "").lower() else "bottle",
            "stock_band": quantity_band(current),
            "condition": "available",
            "provenance": {"evidence_class": "reconciled", "transform": "id_hash+quantity_band"},
        })

    events = []
    event_types = Counter()
    for event_index, row in enumerate(rows_as_dicts(workbook["FG_Movements"]), start=1):
        event_type = str(row.get("Type") or "movement").strip().lower()
        event_types[event_type] += 1
        events.append({
            "event_id": stable_id("EVT", f"{event_index}|{row.get('Document_Ref')}|{row.get('Lot')}|{row.get('Qty')}"),
            "date": safe_date(row.get("Date")),
            "type": "production" if "production" in event_type else "stock_movement",
            "beer": fictional_beer(row.get("Beer")),
            "quantity_band": quantity_band(row.get("Qty")),
            "provenance": {"evidence_class": "direct", "transform": "date_shift+id_hash+quantity_band"},
        })

    demand = []
    for row in rows_as_dicts(workbook["FG_Sales_Link"]):
        demand.append({
            "demand_id": stable_id("DEM", f"{row.get('Invoice/Doc')}|{row.get('Beer')}|{row.get('Qty_Units')}"),
            "date": safe_date(row.get("Date")),
            "customer_archetype": customer_archetype(row.get("Qty_Units"), row.get("Format")),
            "beer": fictional_beer(row.get("Beer")),
            "package": "keg" if "fût" in str(row.get("Format") or "").lower() else "bottle",
            "quantity_band": quantity_band(row.get("Qty_Units")),
            "payment_signal": "delayed" if str(row.get("Payment_Status") or "").upper() == "OPEN" else "settled",
            "provenance": {"evidence_class": "direct", "transform": "party_archetype+date_shift+id_hash+quantity_band"},
        })

    scenario = {
        "manifest": {
            "scenario_id": "sanitized_brewery_pattern_pack_v1",
            "export_version": EXPORT_VERSION,
            "source_snapshot_utc": datetime.fromtimestamp(source.stat().st_mtime, UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
            "source": "allowlisted brewery workbook",
            "privacy": {
                "contains_personal_data": False,
                "contains_exact_financials": False,
                "contains_exact_recipes": False,
                "contains_raw_party_names": False,
                "contains_raw_invoice_ids": False,
            },
            "transforms": ["fictional aliases", "stable hashing", "date shifting", "quantity banding", "party archetyping"],
        },
        "starting_state": {"finished_lots": lots},
        "events": events,
        "demand_patterns": demand,
        "calibration": {
            "movement_mix": dict(sorted(event_types.items())),
            "event_count": len(events),
            "demand_count": len(demand),
            "finished_lot_count": len(lots),
        },
    }

    serialized = json.dumps(scenario, ensure_ascii=False, sort_keys=True)
    # Structural privacy check: values in the export must not echo raw customer names.
    raw_customers = {str(r.get("Customer") or "").strip().lower() for r in rows_as_dicts(workbook["FG_Sales_Link"])}
    leaked = [name for name in raw_customers if name and len(name) > 3 and name in serialized.lower()]
    if leaked:
        raise ValueError("Privacy validation failed: raw party name detected")

    output.mkdir(parents=True, exist_ok=True)
    for key in ("manifest", "starting_state", "events", "demand_patterns", "calibration"):
        (output / f"{key}.json").write_text(
            json.dumps(scenario[key], ensure_ascii=False, indent=2, sort_keys=True) + "\n",
            encoding="utf-8",
        )
    return scenario["calibration"]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path, help="Canonical brewery .xlsx workbook")
    parser.add_argument("--output", type=Path, default=Path("godot/data/imported_scenario"))
    args = parser.parse_args()
    calibration = export_pack(args.source.resolve(), args.output.resolve())
    print(json.dumps({"status": "ok", "output": str(args.output), **calibration}, indent=2))


if __name__ == "__main__":
    main()
