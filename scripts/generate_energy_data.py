#!/usr/bin/env python3
"""Builds src/data/energyData.js from the raw SEDS + MER files."""

from __future__ import annotations

import csv
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path, PurePosixPath

ROOT = Path(__file__).resolve().parents[1]
SEDS_PATH = ROOT / "src" / "data" / "Complete_SEDS.csv"
MER_WORKBOOK = ROOT / "src" / "data" / "Table_1.1_Primary_Energy_Overview.xlsx"
OUTPUT_PATH = ROOT / "src" / "data" / "energyData.js"
NS = {"main": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
REL_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
PKG_REL_NS = "http://schemas.openxmlformats.org/package/2006/relationships"

# Manually curated long-range values that are not present in the MER workbook yet.
NATIONAL_OVERRIDES = {
    2025: 56.270816
}


def load_state_series() -> list[dict[str, object]]:
    """Extract state-level totals (TETCB) from the raw SEDS CSV."""
    rows: list[dict[str, object]] = []
    with SEDS_PATH.open(newline="") as handle:
        reader = csv.DictReader(handle)
        for entry in reader:
            if entry.get("MSN") != "TETCB":
                continue
            state = entry.get("StateCode")
            if not state or state == "US":
                continue
            year = int(entry["Year"])
            if year < 1990:
                continue
            consumption = float(entry["Data"])
            rows.append(
                {
                    "year": year,
                    "state": state,
                    "sector": "All",
                    "consumption": consumption
                }
            )
    rows.sort(key=lambda item: (item["state"], item["year"]))
    return rows


def load_shared_strings(zfile: zipfile.ZipFile) -> list[str]:
    try:
        data = zfile.read("xl/sharedStrings.xml")
    except KeyError:
        return []
    root = ET.fromstring(data)
    strings: list[str] = []
    for si in root.findall("main:si", NS):
        text_parts = [node.text or "" for node in si.findall(".//main:t", NS)]
        strings.append("".join(text_parts))
    return strings


def resolve_sheet_bytes(zfile: zipfile.ZipFile, sheet_name: str) -> bytes:
    workbook = ET.fromstring(zfile.read("xl/workbook.xml"))
    rels_root = ET.fromstring(zfile.read("xl/_rels/workbook.xml.rels"))
    rels = {
        rel.get("Id"): rel.get("Target")
        for rel in rels_root.findall(".//{" + PKG_REL_NS + "}Relationship")
    }
    sheets = workbook.find("main:sheets", NS)
    if sheets is None:
        raise RuntimeError("Workbook does not contain a <sheets> node")
    for sheet in sheets.findall("main:sheet", NS):
        if sheet.get("name") != sheet_name:
            continue
        rel_id = sheet.get("{" + REL_NS + "}id")
        if rel_id not in rels:
            continue
        target = PurePosixPath(rels[rel_id])
        if not target.as_posix().startswith("xl/"):
            target = PurePosixPath("xl") / target
        return zfile.read(target.as_posix())
    raise RuntimeError(f"Sheet '{sheet_name}' not found in workbook")


def iter_sheet_rows(sheet_bytes: bytes, shared_strings: list[str]):
    root = ET.fromstring(sheet_bytes)
    for row in root.findall(".//main:row", NS):
        values: list[str] = []
        for cell in row.findall("main:c", NS):
            value_node = cell.find("main:v", NS)
            if value_node is None:
                values.append("")
                continue
            text = value_node.text or ""
            if cell.get("t") == "s":
                try:
                    text = shared_strings[int(text)]
                except (ValueError, IndexError):
                    text = ""
            values.append(text)
        yield values


def load_national_series() -> list[tuple[int, float]]:
    """Pull annual total primary energy consumption from the MER workbook."""
    with zipfile.ZipFile(MER_WORKBOOK) as archive:
        shared = load_shared_strings(archive)
        sheet_bytes = resolve_sheet_bytes(archive, "Annual Data")
        series: dict[int, float] = {}
        for row in iter_sheet_rows(sheet_bytes, shared):
            if not row:
                continue
            first = row[0].strip()
            if not first.isdigit() or len(first) != 4:
                continue
            try:
                year = int(first)
                consumption = float(row[12])
            except (ValueError, IndexError):
                continue
            if year < 1973:
                continue
            series[year] = consumption
        for year, value in NATIONAL_OVERRIDES.items():
            series[year] = value
        return sorted(series.items())


def format_state_entry(entry: dict[str, object], is_last: bool) -> str:
    suffix = "" if is_last else ","
    return (
        f'  {{ year: {entry["year"]}, state: "{entry["state"]}", '
        f'sector: "All", consumption: {entry["consumption"]:.3f} }}{suffix}'
    )


def format_national_entry(entry: tuple[int, float], is_last: bool) -> str:
    year, consumption = entry
    suffix = "" if is_last else ","
    return f"  {{ year: {year}, consumption: {consumption:.6f} }}{suffix}"


def write_energy_data(states, national):
    lines: list[str] = ["export const ENERGY_DATA_SEDS = ["]
    for idx, entry in enumerate(states):
        lines.append(format_state_entry(entry, idx == len(states) - 1))
    lines.append("];")
    lines.append("export const NATIONAL_ENERGY_DATA = [")
    for idx, entry in enumerate(national):
        lines.append(format_national_entry(entry, idx == len(national) - 1))
    lines.append("];")
    OUTPUT_PATH.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main():
    states = load_state_series()
    national = load_national_series()
    write_energy_data(states, national)
    print(f"Wrote {len(states)} state rows and {len(national)} national rows to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
