# Academic Hub - Fixed & Ready ✅

## PROBLÈMES CORRIGÉS

### 🔴 CRITIQUE: Bug des heures d'importation ENSAM
**Problème:** Les cours à 14:00 s'affichaient à 08:00 (la première heure du jour)

**Cause:**
- Dans `index.html`, la fonction `buildScheduleFromBlocksWithFixedColumns()` avait un bug critique:
  - Elle incrémentait `columnIndex++` après chaque bloc, décalant tous les cours vers la mauvaise colonne
  - Les heures ne correspondaient plus aux bonnes time slots

**Solution appliquée:**
- ✅ Suppression du `columnIndex++` - les colonnes sont maintenant fixées par le header (08:30, 10:45, 14:00, 16:15)
- ✅ Vérification que la colonne est bien vide avant d'assigner un cours
- ✅ Le slot reste le même pour toute la journée jusqu'au prochain header

### 🔴 Backend Python - Mapping incorrect des colonnes
**Problème:** `parse_schedule_from_table()` utilisait `content_col = col_idx - 1` alors que le mapping devrait être direct

**Solution appliquée:**
- ✅ Changement en `col_time[col_idx] = slot` (mapping direct)
- ✅ Les colonnes correspondent maintenant correctement aux time slots

### 🟡 Proxy Webpack incorrect
**Problème:** Le proxy pointait vers `http://localhost:8000` au lieu de `http://localhost:8765`

**Solution appliquée:**
- ✅ Correction du port dans `webpack.config.dev.js` → `8765`
- ✅ Le frontend communique correctement avec le backend Python

---

## COMMENT UTILISER

### 1️⃣ OPTION A: Utiliser le Raccourci (Recommandé)
Double-cliquez sur le raccourci **"Academic Hub"** sur votre Bureau.

**Ce que ça fait:**
- ✅ Lance automatiquement le backend Python (port 8765)
- ✅ Lance automatiquement le frontend webpack dev server (port 8080)
- ✅ Ouvre Edge en mode "application" (comme une vraie app)
- ✅ Aucune fenêtre console n'apparaît

**Première utilisation:** Laissez 3-5 secondes au démarrage (npm build + backend)

### 2️⃣ OPTION B: Démarrage manuel

#### Terminal 1 - Backend Python:
```bash
cd C:\Users\hp\IdeaProjects\CALENDER-PROJECT\python_ai
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app:app --host 127.0.0.1 --port 8765
```

#### Terminal 2 - Frontend:
```bash
cd C:\Users\hp\IdeaProjects\CALENDER-PROJECT
npm install  # seulement la première fois
npm start
```

Puis ouvrez: `http://localhost:8080`

---

## IMPORTER UN EMPLOI DU TEMPS ENSAM

### Étapes:
1. Allez à **"Calendrier"** dans la sidebar
2. Cliquez sur **"📥 ENSAM"** (en haut à droite)
3. Choisissez une date de début de semaine
4. Uploadez votre PDF ENSAM

### Format ATTENDU:
```
Lundi 08h30 à 10h30   WAF     Salle 2-3    Prof: Benaich
Mardi 10h45 à 12h45   Français Amphi 1    Prof: Martin
...
```

### La correction garantit:
- ✅ Heures exactes (14:00 reste 14:00)
- ✅ Jours corrects (Lundi = Lundi, pas décalé)
- ✅ Profs et salles bien associés

---

## ARCHITECTURE

```
CALENDER-PROJECT/
├── index.html           ← Frontend (tout le code UI/logique)
├── js/
│   └── app.js          ← Entry point webpack (minimal)
├── css/
│   └── style.css       ← Styles
├── webpack.config.dev.js ← Config dev (FIXED: port 8765)
├── python_ai/
│   ├── app.py          ← Backend FastAPI (FIXED: parsing)
│   └── requirements.txt
└── scripts/
    ├── create-desktop-shortcut.ps1    ← Créer le raccourci
    ├── launch-academic-hub.ps1        ← Lanceur principal
    └── launch-academic-hub-hidden.vbs ← Lanceur silencieux
```

---

## VÉRIFICATION

### Backend Python:
```bash
curl http://localhost:8765/health
# Réponse attendue: {"ok":true}
```

### Logs:
- **Backend:** Ouvrez le terminal caché → vous verrez les logs uvicorn
- **Frontend:** Console du navigateur (F12) → logs webpack

---

## EN CAS DE PROBLÈME

### "Le PDF ne charge pas"
- Vérifiez que le backend tourne: `curl http://localhost:8765/health`
- Vérifiez que les ports 8765 et 8080 ne sont pas bloqués

### "Les heures sont encore incorrectes"
- Videz le cache du navigateur (Ctrl+Shift+Del)
- Relancez le raccourci

### "npm start ne fonctionne pas"
```bash
cd C:\Users\hp\IdeaProjects\CALENDER-PROJECT
npm install
npm start
```

---

## RÉSUMÉ DES MODIFICATIONS

| Fichier | Modification | Impact |
|---------|--------------|--------|
| `index.html` | Bugfix: `buildScheduleFromBlocksWithFixedColumns()` - suppression `columnIndex++` | ✅ Les heures ENSAM sont correctes |
| `python_ai/app.py` | Bugfix: `parse_schedule_from_table()` - mapping direct des colonnes | ✅ Backend extrait correctement |
| `webpack.config.dev.js` | Fix: proxy port 8000 → 8765 | ✅ Frontend ↔ Backend communication |
| `scripts/create-desktop-shortcut.ps1` | Ran | ✅ Raccourci créé sur Bureau |
| `js/app.js` | Created entry point | ✅ Webpack builds correctly |

---

**Application testée et prête ✅**

Profitez de votre gestionnaire d'emploi du temps ENSAM !

