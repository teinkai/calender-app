# Raccourci Bureau - Academic Hub

Ces scripts permettent de lancer l'application comme une app locale Windows.

## Scripts

- `scripts/launch-academic-hub.ps1`
  - Lance le backend Python ENSAM (si dispo)
  - Lance le frontend webpack dev server
  - Ouvre l'app dans Edge en mode application (`--app`)

- `scripts/launch-academic-hub-hidden.vbs`
  - Lance `launch-academic-hub.ps1` en mode silencieux (sans fenetre cmd)

- `scripts/create-desktop-shortcut.ps1`
  - Cree un raccourci `Academic Hub.lnk` sur le Bureau
  - Le raccourci pointe vers le lanceur silencieux VBS

## Utilisation

```powershell
Set-Location "C:\Users\hp\IdeaProjects\CALENDER-PROJECT"
powershell -ExecutionPolicy Bypass -File ".\scripts\create-desktop-shortcut.ps1"
```

Ensuite, double-cliquez le raccourci `Academic Hub` sur le Bureau.

## Notes

- Pour l'import ENSAM PDF robuste, lancer le backend Python au moins une fois avec son venv installe.
- Si le backend Python n'est pas dispo, le front continue avec son fallback navigateur.

