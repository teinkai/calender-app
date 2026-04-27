param(
  [switch]$NoBackend
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$frontendPath = $projectRoot
$backendPath = Join-Path $projectRoot "python_ai"
$backendPort = 56999
$frontendPort = 57901

function Test-PortListening {
  param([int]$Port)
  return [bool](Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $_.LocalPort -eq $Port })
}

function Wait-Port {
  param(
    [int]$Port,
    [int]$TimeoutMs = 12000
  )
  $sw=[System.Diagnostics.Stopwatch]::StartNew()
  while($sw.ElapsedMilliseconds -lt $TimeoutMs){
    if(Test-PortListening -Port $Port){ return $true }
    Start-Sleep -Milliseconds 250
  }
  return $false
}

function Start-HiddenPowerShell {
  param([string]$Command)
  Start-Process powershell -WindowStyle Hidden -ArgumentList "-ExecutionPolicy", "Bypass", "-Command", $Command | Out-Null
}

if (-not $NoBackend) {
  $backendRunning = Test-PortListening -Port $backendPort
  if (-not $backendRunning) {
    $venvActivate = Join-Path $backendPath ".venv\Scripts\Activate.ps1"
    if (Test-Path $venvActivate) {
      $backendCommand = "Set-Location '$backendPath'; . '$venvActivate'; uvicorn app:app --host 127.0.0.1 --port $backendPort"
      Start-HiddenPowerShell -Command $backendCommand
    } else {
      $backendCommand = "Set-Location '$backendPath'; python -m uvicorn app:app --host 127.0.0.1 --port $backendPort"
      Start-HiddenPowerShell -Command $backendCommand
    }
    [void](Wait-Port -Port $backendPort -TimeoutMs 6000)
  }
}

$frontRunning = [bool](Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" | Where-Object {
  $_.CommandLine -like "*webpack*serve*webpack.config.dev.js*"
})
if (-not $frontRunning) {
  $frontCommand = "Set-Location '$frontendPath'; npm start"
  Start-HiddenPowerShell -Command $frontCommand
}

[void](Wait-Port -Port $frontendPort -TimeoutMs 10000)

$edge = "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
if (-not (Test-Path $edge)) {
  $edge = "${env:ProgramFiles}\Microsoft\Edge\Application\msedge.exe"
}

if (Test-Path $edge) {
  Start-Process $edge "--app=http://localhost:$frontendPort"
} else {
  Start-Process "http://localhost:$frontendPort"
}

