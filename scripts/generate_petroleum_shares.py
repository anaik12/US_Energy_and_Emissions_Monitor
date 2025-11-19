#!/usr/bin/env python3
"""Transforms the curated petroleum share CSV into petroleumShares.js."""

from __future__ import annotations

import csv
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RAW_PATH = ROOT / "src" / "data" / "petroleum_shares_raw.csv"
OUTPUT_PATH = ROOT / "src" / "data" / "petroleumShares.js"


def normalize_share(raw: str) -> tuple[float, str]:
    value = float(raw)
    text = raw.strip()
    if "." in text:
        text = text.rstrip("0").rstrip(".")
    if not text:
        text = str(value)
    return value, text


def load_shares():
    states: list[tuple[str, str]] = []
    default_value = 0.3
    default_text = "0.3"
    with RAW_PATH.open(newline="") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            state = row.get("state", "").strip()
            if not state:
                continue
            share_raw = row.get("share", "0")
            share_value, share_text = normalize_share(share_raw)
            if state.upper() == "DEFAULT":
                default_value = share_value
                default_text = share_text
                continue
            states.append((state, share_text))
    return states, default_value, default_text


def write_module(
    states: list[tuple[str, str]], default_value: float, default_text: str
) -> None:
    lines = ["export const PETROLEUM_SHARE_BY_STATE = {"]
    for idx, (state, share_text) in enumerate(states):
        suffix = "," if idx < len(states) - 1 else ""
        lines.append(f"  {state}: {share_text}{suffix}")
    lines.append("};")
    lines.append("")
    lines.append(f"export const DEFAULT_PETROLEUM_SHARE = {default_text};")
    OUTPUT_PATH.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main():
    states, default_value, default_text = load_shares()
    write_module(states, default_value, default_text)
    print(
        f"Wrote {len(states)} petroleum share entries "
        f"and default={default_value:.2f} to {OUTPUT_PATH}"
    )


if __name__ == "__main__":
    main()
