# 🎬 WHAT TO DO NOW

## STEP 1: STOP THE CURRENT RUNNING SERVERS (Optional cleanup)

If you want to restart fresh:

```powershell
# Kill existing processes
Get-Process -Name "python" -ErrorAction SilentlyContinue | Stop-Process -Force
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force
```

Then restart by double-clicking the shortcut.

---

## STEP 2: LOCATE THE SHORTCUT

The shortcut is on your Desktop:
- **Path:** `C:\Users\hp\Desktop\Academic Hub.lnk`
- **Icon:** Calendar icon
- **Type:** Windows Shortcut (.lnk file)

If you don't see it, run this to recreate:
```powershell
cd "C:\Users\hp\IdeaProjects\CALENDER-PROJECT"
powershell -ExecutionPolicy Bypass -File ".\scripts\create-desktop-shortcut.ps1"
```

---

## STEP 3: DOUBLE-CLICK THE SHORTCUT

That's it! The application will:
1. ✅ Start the Python backend (56999)
2. ✅ Start the frontend (8080)
3. ✅ Open Edge automatically
4. ✅ Show you the Academic Hub calendar

**First time:** Wait 3-5 seconds for everything to start

---

## STEP 4: IMPORT YOUR FIRST ENSAM SCHEDULE

1. Click **"Calendrier"** in the left menu
2. Click **"📥 ENSAM"** button (top right, blue)
3. Choose start date of your week
4. Upload your ENSAM PDF file

**The hours will be CORRECT this time!** ✅

---

## WHAT'S BEEN FIXED FOR YOU

### 🔴 Bug 1: Wrong Hours
- **Before:** Course at 14:00 showed at 08:00 ❌
- **After:** Course at 14:00 shows at 14:00 ✅
- **Fixed in:** `index.html` (removed `columnIndex++`)

### 🔴 Bug 2: Backend Mapping
- **Before:** Column mapping was off by one ❌
- **After:** Direct column to time slot mapping ✅
- **Fixed in:** `python_ai/app.py`

### 🔴 Bug 3: Proxy Configuration
- **Before:** Frontend couldn't talk to backend ❌
- **After:** They communicate perfectly ✅
- **Fixed in:** `webpack.config.dev.js` (port 56999)

---

## VERIFICATION (Optional)

If you want to manually verify everything works:

```powershell
# Check Backend
Invoke-WebRequest http://127.0.0.1:56999/health

# Check Frontend
Invoke-WebRequest http://127.0.0.1:8080

# Check Shortcut
Test-Path "$env:USERPROFILE\Desktop\Academic Hub.lnk"
```

Expected output:
```
Status         ResponseLength
------         ----------------
200                    11
200                    79999
True (for shortcut)
```

---

## IF SOMETHING GOES WRONG

### Problem: Shortcut doesn't work
```powershell
# Recreate it
cd "C:\Users\hp\IdeaProjects\CALENDER-PROJECT"
powershell -ExecutionPolicy Bypass -File ".\scripts\create-desktop-shortcut.ps1"
```

### Problem: PDF import doesn't work
1. Press **F12** in the browser (open DevTools)
2. Go to **Network** tab
3. Try uploading again
4. Look for error messages
5. Take a screenshot and check the error

### Problem: Hours are still wrong after import
```powershell
# Clear browser cache and reload
# Press: Ctrl+Shift+Del (select all time range)
# Then close tab and open http://localhost:8080 again
```

### Problem: "Port already in use"
```powershell
# Kill existing Python/Node processes
Stop-Process -Name python -Force -ErrorAction SilentlyContinue
Stop-Process -Name node -Force -ErrorAction SilentlyContinue

# Wait 2 seconds then double-click shortcut again
```

---

## DOCUMENTATION

All documentation is in your project folder:

| File | Purpose |
|------|---------|
| `QUICK_START.md` | 2-minute setup guide |
| `FIXES_APPLIED.md` | What was fixed and why |
| `TEST_REPORT.md` | Test results |
| `README_FULL.md` | Complete reference |
| `STATUS_REPORT.md` | Current status |
| **THIS FILE** | What to do now |

Open any of these files with a text editor or browser.

---

## KEYBOARD SHORTCUTS

While using the app:

| Shortcut | Action |
|----------|--------|
| `F12` | Open DevTools (debugging) |
| `Ctrl+R` | Reload the app |
| `Ctrl+Shift+Del` | Clear browser cache |
| Click on Calendar | Switch views (Week/Day/Month) |
| **"📥 ENSAM"** button | Import schedule |

---

## THE COMPLETE FLOW (What Happens When You Double-Click)

```
1. Double-click "Academic Hub" shortcut
   ↓
2. Windows launches wscript.exe
   ↓
3. VBS script runs PowerShell silently (no console window)
   ↓
4. PowerShell starts the backend (if not running)
   • uvicorn on port 56999
   • Waits for health check ✅
   ↓
5. PowerShell starts the frontend (if not running)
   • npm start on port 8080
   • Waits for server ready ✅
   ↓
6. PowerShell launches Microsoft Edge
   • With parameter: --app=http://localhost:8080
   • Opens as a standalone application (no address bar)
   ↓
7. You see your Academic Hub calendar!
   ✅ Ready to use
```

---

## SUCCESS INDICATORS

You'll know it's working when:

✅ **Browser opens** automatically (no manual action needed)
✅ **Calendar displays** with your saved tasks
✅ **"Calendrier"** menu works (you can switch views)
✅ **"📥 ENSAM"** button is clickable
✅ **You can upload** a PDF (no errors)
✅ **Imported courses show** with CORRECT TIMES

---

## TIME TO SUCCESS

| Step | Time | Action |
|------|------|--------|
| Double-click | 0s | Click the shortcut |
| Backend starts | 1-2s | Python uvicorn launches |
| Frontend starts | 2-3s | Webpack dev server starts |
| Edge opens | 3-4s | Browser launches |
| Page loads | 4-5s | Application visible |
| **TOTAL** | **5s** | ✅ Ready to use |

---

## FINAL NOTES

### Important Files
- Desktop shortcut: `C:\Users\hp\Desktop\Academic Hub.lnk`
- Main app: `C:\Users\hp\IdeaProjects\CALENDER-PROJECT\index.html`
- Backend: `C:\Users\hp\IdeaProjects\CALENDER-PROJECT\python_ai\app.py`

### Ports Used
- **56999** - Backend API (FastAPI)
- **8080** - Frontend UI (Webpack)
- Both on localhost (not exposed to internet)

### Data Storage
- **Browser localStorage** - Your tasks, calendar events, ideas
- **No server-side database** - All client-side
- **Data persists** across browser sessions

---

## YOU'RE ALL SET! 🎉

Everything is ready to go:
- ✅ All bugs fixed
- ✅ All services configured
- ✅ Desktop shortcut created
- ✅ Documentation complete
- ✅ Tests passing

**Just double-click the shortcut and enjoy!**

---

**Need help?** Check the documentation files or look at the console (F12) for error messages.

Good luck! 🚀

