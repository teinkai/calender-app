# Academic Hub Pro

A student productivity app with an Apple-inspired interface (iOS 17 / macOS Sonoma aesthetic). Manages tasks, calendar events, weekly goals, ideas, and daily journal — with ENSAM schedule import support.

## Features

- **Daily view** — tasks for today with a live clock and progress ring
- **Calendar** — week / day / month / agenda views with drag-free event creation
- **ENSAM import** — paste or upload a PDF schedule and it auto-populates your calendar
- **Weekly goals** — set objectives per week and track completion
- **Ideas & Notes** — capture and categorize ideas with labels
- **Journal** — daily reflection and accomplishment tracking
- **Analytics** — task completion stats
- **Dark mode** — full light/dark theme support
- **Offline-first** — all data stored in `localStorage`, no account needed

## Getting Started

### Option 1 — Open directly (no install)

Just open `index.html` in your browser. Everything works out of the box for basic use.

### Option 2 — Dev server (recommended for ENSAM PDF import)

The PDF extraction backend requires Python (FastAPI).

```bash
# Install frontend dependencies
npm install

# Start frontend dev server
npm start
```

```bash
# In a second terminal — start the Python backend
cd python_ai
python -m venv .venv
.venv\Scripts\activate      # Windows
pip install -r requirements.txt
uvicorn app:app --host 127.0.0.1 --port 56999
```

Then open `http://localhost:57901` in your browser.

### Option 3 — Windows launcher script

Run `scripts/launch-academic-hub.ps1` in PowerShell — it starts both the frontend and backend automatically.

## Project Structure

```
index.html          — Main app (single-page, all views)
css/style.css       — Apple-inspired design system
js/apple-ui.js      — Today view, analytics, journal, accomplishments
js/app.js           — Entry point
design-system/      — Design tokens and component styles
python_ai/app.py    — FastAPI backend for PDF schedule extraction
scripts/            — Launch scripts (Windows)
```

## Tech Stack

- Vanilla HTML / CSS / JavaScript (no framework)
- PDF.js + Tesseract.js for schedule parsing
- Python / FastAPI for advanced PDF extraction (optional)
- Webpack (dev server + prod build)

## Data & Privacy

All your data (tasks, events, notes) is stored locally in your browser's `localStorage`. Nothing is sent to any server. The Python backend only processes PDF files you upload — no data is retained.

## License

MIT — see `LICENSE.txt`
