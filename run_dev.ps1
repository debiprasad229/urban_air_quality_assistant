# Urban Air Quality Assistant - Single Command Local Launcher (PowerShell)
# Starts FastAPI backend (port 8000) and Vite frontend (port 3000)

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Starting Urban Air Quality Assistant (Local Dev Server) " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$RootPath = $PSScriptRoot
$BackendPath = Join-Path $RootPath "backend"
$FrontendPath = Join-Path $RootPath "frontend"

# 1. Check Python Venv
$VenvPython = Join-Path $BackendPath ".venv\Scripts\python.exe"
if (-not (Test-Path $VenvPython)) {
    Write-Host "[!] Python virtual environment not found in backend/.venv" -ForegroundColor Yellow
    Write-Host "    Setting up venv..." -ForegroundColor Yellow
    cd $BackendPath
    python -m venv .venv
    & $VenvPython -m pip install -r requirements.txt
    cd $RootPath
}

# 2. Check Frontend Node Modules
$NodeModules = Join-Path $FrontendPath "node_modules"
if (-not (Test-Path $NodeModules)) {
    Write-Host "[!] Frontend dependencies not found. Installing..." -ForegroundColor Yellow
    cd $FrontendPath
    npm install
    cd $RootPath
}

Write-Host "[*] Starting FastAPI Backend on http://127.0.0.1:8000..." -ForegroundColor Green
$BackendJob = Start-Process -FilePath $VenvPython -ArgumentList "-m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload" -WorkingDirectory $BackendPath -PassThru

Write-Host "[*] Starting Vite Frontend on http://localhost:3000..." -ForegroundColor Green
$FrontendJob = Start-Process -FilePath "cmd.exe" -ArgumentList "/c npm run dev" -WorkingDirectory $FrontendPath -PassThru

Write-Host ""
Write-Host "[SUCCESS] Both services launched successfully!" -ForegroundColor Green
Write-Host "  - Frontend UI: http://localhost:3000" -ForegroundColor White
Write-Host "  - Backend API: http://127.0.0.1:8000" -ForegroundColor White
Write-Host "  - API Swagger: http://127.0.0.1:8000/docs" -ForegroundColor White
Write-Host ""
Write-Host "Press Ctrl+C to terminate both servers." -ForegroundColor DarkGray

try {
    while (-not $BackendJob.HasExited -and -not $FrontendJob.HasExited) {
        Start-Sleep -Milliseconds 500
    }
} finally {
    Write-Host "`n[*] Stopping services..." -ForegroundColor Yellow
    if ($BackendJob -and -not $BackendJob.HasExited) {
        Stop-Process -Id $BackendJob.Id -Force -ErrorAction SilentlyContinue
    }
    if ($FrontendJob -and -not $FrontendJob.HasExited) {
        Stop-Process -Id $FrontendJob.Id -Force -ErrorAction SilentlyContinue
    }
    Write-Host "[*] Services stopped." -ForegroundColor Green
}
