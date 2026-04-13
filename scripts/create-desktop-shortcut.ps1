$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$launcher = Join-Path $projectRoot "scripts\launch-academic-hub-hidden.vbs"
$desktop = [Environment]::GetFolderPath("Desktop")
$shortcutPath = Join-Path $desktop "Academic Hub.lnk"

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = "wscript.exe"
$shortcut.Arguments = "`"$launcher`""
$shortcut.WorkingDirectory = $projectRoot
$shortcut.IconLocation = (Join-Path $projectRoot "favicon.ico")
if (-not (Test-Path (Join-Path $projectRoot "favicon.ico"))) {
  $shortcut.IconLocation = "shell32.dll,220"
}
$shortcut.Description = "Lance Academic Hub (front + backend ENSAM)"
$shortcut.Save()

Write-Host "Raccourci cree: $shortcutPath"


