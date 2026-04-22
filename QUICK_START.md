# 🚀 Academic Hub - Guide Rapide

## EN 2 MINUTES

### 1. Double-cliquez le raccourci "Academic Hub" sur le Bureau

**C'est tout!** L'application se lance automatiquement.

---

## ARCHITECTURE COMPLÈTE

```
┌─────────────────────────────────────────────────────────────────────┐
│                        YOUR COMPUTER                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    EDGE BROWSER (APP MODE)                 │   │
│  │  ┌─────────────────────────────────────────────────────┐   │   │
│  │  │                  http://localhost:8080              │   │   │
│  │  │                   Academic Hub UI                   │   │   │
│  │  │  ┌─────────────────────────────────────────────┐   │   │   │
│  │  │  │  Sidebar | Tasks | Calendar | Ideas        │   │   │   │
│  │  │  │  - Import ENSAM PDF                        │   │   │   │
│  │  │  │  - Schedule Management                     │   │   │   │
│  │  │  │  - Time-based Display                      │   │   │   │
│  │  │  └─────────────────────────────────────────────┘   │   │   │
│  │  │           (PORT 8080 - Frontend)                   │   │   │
│  │  └─────────────────────────────────────────────────────┘   │   │
│  │         ▲                                      ▼             │   │
│  │         │ JavaScript/AJAX                     │             │   │
│  │         │ fetch('/extract-schedule')          │ HTML/CSS    │   │
│  │         │                                      │ / JSON      │   │
│  └─────────┼──────────────────────────────────────┼─────────────┘   │
│            │                                      │                  │
│     NETWORK COMMUNICATION (localhost)             │                  │
│            │                                      │                  │
│  ┌─────────▼──────────────────────────────────────┼─────────────┐   │
│  │  ┌──────────────────────────────────────────┐  │             │   │
│  │  │   FASTAPI SERVER (Port 56999)            │  │             │   │
│  │  │   python_ai/app.py                       │  │             │   │
│  │  │                                          │  │             │   │
│  │  │  • /health                               │  │             │   │
│  │  │  • /extract-schedule  ◄────────────────┘  │             │   │
│  │  │    - PDF Upload                          │             │   │
│  │  │    - Table Extraction (pdfplumber)       │             │   │
│  │  │    - FIXED: Time Slot Mapping            │             │   │
│  │  │    - Returns: [ Events with correct hrs ]│             │   │
│  │  │                                          │             │   │
│  │  │  (PORT 56999 - Backend)                  │             │   │
│  │  └──────────────────────────────────────────┘             │   │
│  │                                                            │   │
│  └────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  WEBPACK DEV SERVER (Intermediate)                                 │
│  ├─ Serves http://localhost:8080                                   │
│  ├─ Proxies /extract-schedule → http://localhost:56999 ✅ FIXED  │
│  └─ Hot reload on file changes                                     │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘


                    LAUNCH FLOW (Double-click)

┌──────────────────────────────┐
│  Academic Hub.lnk (Desktop)  │  ← User Double-clicks
└──────────────────┬───────────┘
                   │
                   ▼
       ┌───────────────────────────┐
       │   wscript.exe             │
       │ (VBS Host Process)        │
       └───────────┬───────────────┘
                   │
                   ▼
  ┌────────────────────────────────┐
  │ launch-academic-hub-hidden.vbs │ ← No console window
  └────────────┬───────────────────┘
               │
               ▼
    ┌──────────────────────────┐
    │ PowerShell (Hidden)      │
    │ .ExecutionPolicy Bypass  │
    │ -WindowStyle Hidden      │
    └────────┬─────────────────┘
             │
             ▼
    ┌────────────────────────────────┐
    │ launch-academic-hub.ps1        │
    │                                │
    │ 1. Check port 56999 (backend)  │
    │    ├─ If free: Start uvicorn   │
    │    └─ If busy: Skip            │
    │                                │
    │ 2. Check port 8080 (frontend)  │
    │    ├─ If free: Start npm       │
    │    └─ If busy: Skip            │
    │                                │
    │ 3. Wait for both ready         │
    │    ├─ Test /health endpoint    │
    │    └─ Test port 8080           │
    │                                │
    │ 4. Open Edge --app mode        │
    │    └─ http://localhost:8080    │
    └────────────────────────────────┘
             │
             ▼
    ┌────────────────────────────────┐
    │  BACKEND RUNNING              │
    │  ✅ FastAPI on :56999         │
    │  ✅ CORS configured           │
    │  ✅ Ready to receive PDFs      │
    └────────────────────────────────┘
             │
             ▼
    ┌────────────────────────────────┐
    │  FRONTEND RUNNING             │
    │  ✅ Webpack on :8080          │
    │  ✅ Proxy configured → :56999 │
    │  ✅ App UI loaded             │
    └────────────────────────────────┘
             │
             ▼
    ┌────────────────────────────────┐
    │  EDGE BROWSER (App Mode)      │
    │  ✅ No address bar            │
    │  ✅ Full screen application   │
    │  ✅ Looks like a "real app"   │
    └────────────────────────────────┘
```

---

## PROCESSUS D'IMPORTATION ENSAM

```
Upload PDF
    │
    ▼
┌─────────────────────────────────┐
│ Python Backend (app.py)         │
│                                 │
│ 1. Reçoit le fichier            │
│ 2. Parse PDF avec pdfplumber    │
│ 3. Extrait la table             │
│ 4. Lit les headers:             │
│    [Lundi, 08h30-10h30, 10h45-12h45, 14h00-16h00]
│ 5. FIXED: Maps colonnes correctement
│    - Header row 0: ['Lundi', time1, time2, time3]
│    - Data row 1: ['Lundi', 'WAF', 'Français', 'Sécurité']
│    - Col mapping: {1:08h30, 2:10h45, 3:14h00}
│ 6. Retourne events avec heures exactes
│                                 │
│ ✅ FIXED: 14h00 = 14h00         │
│           (NOT 08h00)           │
└──────────────┬──────────────────┘
               │ JSON Response
               ▼
┌─────────────────────────────────┐
│ Frontend (index.html)           │
│                                 │
│ 1. Reçoit les events            │
│ 2. Ajoute à S.calEvents[]       │
│ 3. Sauvegarde en localStorage   │
│ 4. Affiche dans le calendrier   │
│                                 │
│ ✅ Les heures sont correctes    │
│ ✅ Les jours sont corrects      │
│ ✅ Profs/Salles associés ok     │
└─────────────────────────────────┘
```

---

## TROUBLESHOOTING RAPIDE

### ❌ "L'app ne démarre pas"
**Solution:**
```powershell
# Vérifiez les ports
netstat -ano | findstr :56999 # Backend
netstat -ano | findstr :8080  # Frontend

# Redémarrez manuellement:
cd C:\Users\hp\IdeaProjects\CALENDER-PROJECT\python_ai
.\.venv\Scripts\uvicorn app:app --host 127.0.0.1 --port 56999

# Terminal 2:
cd C:\Users\hp\IdeaProjects\CALENDER-PROJECT
npm start
```

### ❌ "Les heures ENSAM sont toujours fausses"
**Solution:**
1. Ouvrez le navigateur → F12 (Console)
2. Videz le cache: `Ctrl+Shift+Del`
3. Rechargez: `Ctrl+R`
4. Réessayez l'import

### ❌ "Le PDF ne s'importe pas"
**Solution:**
1. Vérifiez que le backend tourne:
   ```powershell
   Invoke-WebRequest http://127.0.0.1:56999/health
   ```
2. Vérifiez le format du PDF (doit être une table ENSAM standard)
3. Ouvrez F12 → Network pour voir l'erreur exacte

### ❌ "npm start échoue"
**Solution:**
```powershell
cd C:\Users\hp\IdeaProjects\CALENDER-PROJECT
rm -r node_modules
npm install
npm start
```

---

## FICHIERS MODIFIÉS

| Fichier | Modification | Résultat |
|---------|--------------|----------|
| `index.html` | Removed `columnIndex++` in `buildScheduleFromBlocksWithFixedColumns()` | ✅ Hours correct |
| `python_ai/app.py` | Changed `col_time[col_idx-1]` to `col_time[col_idx]` | ✅ Column mapping fixed |
| `webpack.config.dev.js` | Port 8000 → 56999 in proxy | ✅ API communication works |
| `js/app.js` | Created minimal entry point | ✅ Webpack builds |
| `scripts/create-desktop-shortcut.ps1` | Executed to create .lnk | ✅ Desktop shortcut created |

---

## VÉRIFICATION FINALE

Run this to verify everything:

```powershell
# Check backend
$b = Invoke-WebRequest -Uri "http://127.0.0.1:56999/health" -UseBasicParsing
Write-Host "Backend: $($b.StatusCode) - $($b.Content)"

# Check frontend
$f = Invoke-WebRequest -Uri "http://127.0.0.1:8080" -UseBasicParsing
Write-Host "Frontend: $($f.StatusCode)"

# Check shortcut
if(Test-Path "$env:USERPROFILE\Desktop\Academic Hub.lnk") {
  Write-Host "Shortcut: ✅ EXISTS"
} else {
  Write-Host "Shortcut: ❌ MISSING"
}
```

Expected output:
```
Backend: 200 - {"ok":true}
Frontend: 200
Shortcut: ✅ EXISTS
```

---

**✅ All systems GO! Double-click the shortcut and enjoy!**

