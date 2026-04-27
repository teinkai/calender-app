# Academic Hub Pro

> A personal academic productivity app — built for one student, shaped by daily use.

Academic Hub Pro is a fully client-side web application I built to manage my academic life: tasks, weekly goals, a calendar, a journal, daily accomplishments, ideas, and analytics — all in one place, all private, all offline-first.

No account. No server. No cloud sync. Your data lives in your browser.

---

## Why I built this

I'm a student at ENSAM and I couldn't find a tool that combined everything I needed in the way I wanted it. Most apps are either too simple (just a to-do list) or too heavy (Notion, ClickUp). I wanted something that felt like a native app — fast, clean, distraction-free — and that actually matched how I think about my week.

So I built it myself, iterating on it every day until it felt right.

---

## Features

### Ma journée — My Day
The home screen. Shows only tasks due today or manually flagged for today. Designed to start each morning with focus and clarity. Completed tasks are automatically moved to the Réalisations (Accomplishments) view.

### Toutes les tâches — All Tasks
Full task list with global search, priority levels, subject/matière tags, subtasks, notes, and due dates. Tasks are color-coded by subject and automatically synced to the calendar when a due date is set.

### Important
A filtered view of starred tasks — for the things that actually can't wait.

### Weekly Goals
Two-week planning system (current week + next week). Goals are separate from tasks — higher-level intentions rather than granular actionable items. Completed goals auto-appear in Réalisations at the end of the day.

### Calendrier — Calendar
Full-featured calendar with four views:
- **Week grid** — time-blocked view of the entire week
- **Day view** — hour-by-hour breakdown of a single day
- **Month view** — overview grid for long-term planning
- **Agenda** — chronological list of all upcoming events

Events support: type (course, sport, reminder, task…), color, location, professor, and notes. Tasks with due dates are automatically mirrored as calendar events.

### ENSAM Import
A dedicated tool for importing a school schedule from ENSAM. Supports:
- PDF upload (text-based or scanned)
- Image upload with in-browser OCR (via Tesseract.js)
- Manual text paste
- Optional Python backend (FastAPI + pdfplumber) for higher-accuracy parsing

The importer extracts day / time / subject / professor / room and creates calendar events automatically, with a preview step before confirming.

### Idées & Notes — Ideas & Notes
A freeform note space organized with custom labels. For ideas, references, quick thoughts — anything that doesn't fit in a task.

### Réalisations — Accomplishments
A daily log of what got done. Completed tasks and goals are automatically added here. A more useful view to end the day with than a list of what's still pending.

### Journal
A private daily journal. One entry per day, navigated through a monthly grid. Entries are stored locally and never leave the browser.

### Analytics
Statistics on task completion rates, weekly goal achievement, streaks, and productivity patterns over time.

### Réglages — Settings
- Light / Dark / System-aware theme
- Custom accent color picker
- Subject-to-color mapping (e.g. WAF → blue, Sécurité → purple, Management → red)
- Notification preferences

---

## How it works

### Architecture

```
index.html              ← entire app (HTML + embedded CSS + core JS logic)
js/
  apple-ui.js           ← extended UI: goals, journal, analytics, settings, accomplishments, my day
  app.js                ← webpack entry point (delegates to index.html at runtime)
css/
  style.css             ← legacy stylesheet (mostly superseded by embedded styles)
design-system/
  tokens.css            ← CSS custom property tokens (colors, spacing, radius…)
  components.css        ← reusable component classes
python_ai/
  app.py                ← optional FastAPI backend for higher-accuracy PDF parsing
  requirements.txt      ← Python dependencies
```

### Data storage

All data is stored in the browser's `localStorage` under a single JSON key. There is no backend, no account, no network request for user data. Everything is local to the browser.

```js
// Single state object — all data lives here in memory and is persisted to localStorage
var S = {
  tasks:      [],   // task list
  weekGoals:  [],   // current week goals
  calEvents:  [],   // calendar events
  ideas:      [],   // notes and ideas
  journal:    {},   // daily journal entries, keyed by date
  settings:   {},   // theme, accent, subject colors
  userName:   '',
};

function save() { localStorage.setItem('academic-hub', JSON.stringify(S)); }
function load() { const d = JSON.parse(localStorage.getItem('academic-hub')); if (d) S = Object.assign(S, d); }
```

Every state change triggers `save()` immediately. If you clear browser storage, data is gone — the Settings view includes a JSON export for backups.

### Rendering

No framework. The entire UI is re-rendered on every state change by a central `renderView()` function that reads `S` and writes HTML strings into the DOM. It stays fast because the dataset is always small (one user's personal data).

```
User action → update S → save() → renderView() → DOM updated
```

### Calendar ↔ Task sync

When a task has a due date set, it is automatically mirrored as a calendar event. Completing, editing, or deleting the task keeps the calendar event in sync.

### ENSAM Import flow

```
User uploads PDF / image / pastes text
         ↓
1. Try Python backend (FastAPI + pdfplumber)  — highest accuracy
2. Try PDF.js text extraction                 — works for text-based PDFs
3. Try Tesseract.js OCR                       — works for scanned PDFs / images
         ↓
Parse: day · time range · subject · professor · room
         ↓
Preview parsed events → user confirms → import to calendar
```

The Python backend is entirely optional. Without it, the app falls back gracefully to browser-based parsing.

### Design system

The UI follows Apple's design language (iOS 17 / macOS Sonoma):
- SF Pro typeface stack (system font)
- Frosted glass sidebars and toolbars via `backdrop-filter: blur`
- iOS-style list items, cards, and sheet modals
- Full dark mode (system-aware or manually toggled)
- Responsive layout — sidebar on desktop, bottom tab bar on mobile

---

## Running locally

### Option 1 — No setup (browser only)

Open `index.html` directly in any modern browser. All features except the enhanced PDF parser work immediately.

```bash
# Or use any static file server:
npx serve .
# → http://localhost:3000
```

### Option 2 — Webpack dev server

```bash
npm install
npm start
# → http://localhost:57901
```

### Option 3 — With the Python PDF backend (optional)

Adds higher-accuracy PDF schedule parsing. The app works without it, falling back to in-browser parsing automatically.

```bash
cd python_ai

# Create and activate virtual environment
python -m venv .venv
.venv\Scripts\activate         # Windows
# source .venv/bin/activate    # macOS / Linux

pip install -r requirements.txt
uvicorn app:app --host 127.0.0.1 --port 8000
```

Start the frontend separately (`npm start` or open `index.html`), then use the ENSAM Import feature — the app detects the backend automatically.

---

## Tech stack

| Layer | Technology |
|---|---|
| UI | Vanilla HTML5, CSS3, JavaScript (ES6+) |
| Storage | `localStorage` (browser-native, no server) |
| PDF parsing — browser | [PDF.js](https://mozilla.github.io/pdf.js/) |
| OCR — browser | [Tesseract.js](https://tesseract.projectnaptha.com/) |
| PDF parsing — backend | Python 3, FastAPI, pdfplumber, PyMuPDF, Tesseract |
| Build tooling | Webpack 5 |
| Design language | Apple (iOS 17 / macOS Sonoma) |

---

## Data & privacy

All data (tasks, events, goals, journal, notes) stays in your browser's `localStorage`. Nothing is sent to any server. The optional Python backend only processes files you explicitly upload for schedule parsing — it retains nothing.

Clearing your browser's site data will erase everything. Use **Settings → Export** to back up your data as JSON.

---

## Built with Claude

This project was developed in collaboration with [Claude](https://claude.ai) by Anthropic. Claude helped design the architecture, implement the calendar and task sync logic, build the Apple-inspired CSS design system, write the ENSAM PDF parser, and iterate on every feature based on real daily use.

The development process was conversational and hands-on: describe what I wanted, Claude implemented it, I tested it in the browser, we refined together. Every feature in this app came from actual daily frustration or a genuine need — nothing was added for the sake of it.

---

## Personal project

This app is built for my personal use. I'm sharing it publicly because the approach — a zero-dependency, single-file academic productivity tool that runs entirely in the browser — might be useful to someone else.

Feel free to fork it, strip out the ENSAM-specific parts, adapt it to your own school or workflow.

---

*Built by Noussair Fenani — ENSAM student, 2026*  
*Developed with [Claude](https://claude.ai) (Anthropic)*
