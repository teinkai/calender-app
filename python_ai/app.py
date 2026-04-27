from __future__ import annotations

import io
import re
from datetime import date, datetime, timedelta
from typing import List, Optional

import pdfplumber
from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="ENSAM Schedule Extractor", version="2.1.0")

app.add_middleware(
  CORSMiddleware,
  allow_origins=[
    "http://localhost:57901",
    "http://127.0.0.1:57901",
    "http://localhost",
    "http://127.0.0.1",
  ],
  allow_credentials=True,
  allow_methods=["*"],
  allow_headers=["*"],
)

DAY_MAP = {
  "lundi": 0,
  "mardi": 1,
  "mercredi": 2,
  "jeudi": 3,
  "vendredi": 4,
  "samedi": 5,
  "dimanche": 6,
}

SUBJECT_COLORS = {
  "waf": "ev-blue",
  "securite": "ev-purple",
  "francais": "ev-green",
  "anglais": "ev-amber",
  "entrepre": "ev-pink",
  "management": "ev-red",
  "default": "ev-blue",
}

TIME_HEADER_RE = re.compile(
  r"(\d{1,2})[h:](\d{2})\s*(?:à|a|-|–|—|→)\s*(\d{1,2})[h:](\d{2})",
  re.IGNORECASE,
)


def parse_time_header(cell: str) -> Optional[tuple[str, str]]:
  if not cell:
    return None
  match = TIME_HEADER_RE.search(str(cell))
  if not match:
    return None
  sh, sm, eh, em = match.groups()
  return f"{int(sh):02d}:{int(sm):02d}", f"{int(eh):02d}:{int(em):02d}"


def parse_cell(cell: str) -> tuple[str, str, str]:
  if not cell or not cell.strip():
    return "", "", ""

  lines = [line.strip() for line in cell.strip().splitlines() if line.strip()]
  title = lines[0] if lines else ""
  location = ""
  prof = ""

  for line in lines[1:]:
    low = line.lower()
    if low.startswith("prof"):
      prof = re.sub(r"(?i)^prof\s*[:\-]?\s*", "", line).strip()
    elif any(keyword in low for keyword in ["amphi", "salle", "labo", "atelier"]):
      location = line

  return title, location, prof


def pick_color(title: str) -> str:
  low = title.lower()
  for key, color in SUBJECT_COLORS.items():
    if key in low:
      return color
  return SUBJECT_COLORS["default"]


def parse_week_start(raw: str) -> date:
  if raw:
    try:
      parsed = datetime.strptime(raw.strip(), "%Y-%m-%d").date()
      return parsed - timedelta(days=parsed.weekday())
    except ValueError:
      pass
  today = date.today()
  return today - timedelta(days=today.weekday())


def build_column_slot_map(table: list[list]) -> dict[int, tuple[str, str]]:
  header_rows = table[: min(3, len(table))]
  slot_columns: list[tuple[int, tuple[str, str]]] = []
  seen: set[tuple[int, tuple[str, str]]] = set()

  for header_row in header_rows:
    for col_idx, cell in enumerate(header_row):
      if cell is None:
        continue
      slot = parse_time_header(str(cell))
      marker = (col_idx, slot) if slot else None
      if slot and marker not in seen:
        slot_columns.append((col_idx, slot))
        seen.add(marker)

  slot_columns.sort(key=lambda item: item[0])
  if not slot_columns:
    return {}

  boundaries: list[tuple[float, float, tuple[str, str]]] = []
  for idx, (col_idx, slot) in enumerate(slot_columns):
    left = float("-inf") if idx == 0 else (slot_columns[idx - 1][0] + col_idx) / 2
    right = (
      float("inf")
      if idx == len(slot_columns) - 1
      else (col_idx + slot_columns[idx + 1][0]) / 2
    )
    boundaries.append((left, right, slot))

  col_map: dict[int, tuple[str, str]] = {}
  max_cols = max(len(row) for row in table if row)
  for col_idx in range(max_cols):
    for left, right, slot in boundaries:
      if left < col_idx <= right:
        col_map[col_idx] = slot
        break
  return col_map


def find_day_offset(row: list, search_cols: int = 3) -> Optional[int]:
  for cell in row[: min(search_cols, len(row))]:
    day_raw = str(cell or "").strip().lower()
    if day_raw in DAY_MAP:
      return DAY_MAP[day_raw]
  return None


def parse_schedule_from_table(table: list[list], week_start: date) -> List[dict]:
  if not table or len(table) < 2:
    return []

  col_time = build_column_slot_map(table)
  if not col_time:
    return []

  events: List[dict] = []
  current_day_offset: Optional[int] = None

  for row in table[1:]:
    if not row:
      continue

    row_day_offset = find_day_offset(row)
    if row_day_offset is not None:
      current_day_offset = row_day_offset

    if current_day_offset is None:
      continue

    event_date = week_start + timedelta(days=current_day_offset)
    seen_row_events: set[tuple[int, str, str, str]] = set()

    for col_idx, cell_val in enumerate(row):
      slot = col_time.get(col_idx)
      if slot is None:
        continue
      if not cell_val or not str(cell_val).strip():
        continue

      cell_text = str(cell_val).strip()
      if cell_text.lower() in DAY_MAP:
        continue
      if parse_time_header(cell_text):
        continue

      title, location, prof = parse_cell(cell_text)
      if not title:
        continue

      dedupe_key = (col_idx, title, location, prof)
      if dedupe_key in seen_row_events:
        continue
      seen_row_events.add(dedupe_key)

      start, end = slot
      events.append(
        {
          "title": title,
          "date": event_date.isoformat(),
          "start": start,
          "end": end,
          "location": location,
          "prof": prof,
          "color": pick_color(title),
          "important": False,
          "notes": "",
        }
      )

  events.sort(key=lambda event: (event["date"], event["start"], event["end"]))
  return events


def extract_events_from_pdf(data: bytes, week_start: date) -> tuple[List[dict], str]:
  all_events: List[dict] = []
  raw_lines: List[str] = []

  with pdfplumber.open(data) as pdf:
    for page in pdf.pages:
      raw_lines.append(page.extract_text() or "")

      table = page.extract_table()
      if not table:
        continue

      for row in table:
        raw_lines.append(str(row))

      all_events.extend(parse_schedule_from_table(table, week_start))

  all_events.sort(key=lambda event: (event["date"], event["start"], event["end"]))
  return all_events, "\n".join(raw_lines)


@app.get("/health")
def health() -> dict:
  return {"ok": True}


@app.post("/extract-schedule")
async def extract_schedule(
  file: UploadFile = File(...),
  week_start: str = Form(""),
) -> dict:
  content = await file.read()
  filename = (file.filename or "").lower()
  content_type = (file.content_type or "").lower()
  parsed_week_start = parse_week_start(week_start)

  try:
    if filename.endswith(".pdf") or "pdf" in content_type:
      events, raw_text = extract_events_from_pdf(io.BytesIO(content), parsed_week_start)
    else:
      return {
        "events": [],
        "raw_text": "",
        "error": "Only PDF files are supported in this version.",
      }
  except Exception as exc:
    return {"events": [], "raw_text": "", "error": str(exc)}

  return {
    "events": events,
    "raw_text": raw_text,
    "engine": "pdfplumber-table",
  }
