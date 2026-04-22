# Python AI Extracteur ENSAM

Ce service local renforce l'import ENSAM pour les PDF/images difficiles.

## 1) Prerequis

- Python 3.10+
- Tesseract OCR installe sur la machine
  - Windows: installer Tesseract puis ajouter son dossier `tesseract.exe` au `PATH`

## 2) Installation

```powershell
Set-Location "C:\Users\hp\IdeaProjects\CALENDER-PROJECT\python_ai"
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

## 3) Lancer le service

```powershell
Set-Location "C:\Users\hp\IdeaProjects\CALENDER-PROJECT\python_ai"
.\.venv\Scripts\Activate.ps1
uvicorn app:app --host 127.0.0.1 --port 56999 --reload
```

## 4) Test rapide

```powershell
Invoke-WebRequest -UseBasicParsing "http://127.0.0.1:56999/health"
```

Le front (`index.html`) appelle automatiquement:
- `POST http://127.0.0.1:56999/extract-schedule`

Si le service Python est indisponible, l'app retombe sur l'extracteur navigateur (`pdf.js` + `tesseract.js`).

