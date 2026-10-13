$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$pythonPath = Join-Path $PSScriptRoot '.venv/Scripts/python.exe'
if (-not (Test-Path -LiteralPath $pythonPath)) {
    Write-Host 'Creating the Python environment...'
    python -m venv .venv
    if ($LASTEXITCODE -ne 0) { throw 'Python 3.13 is required. Install it and rerun start.ps1.' }
}
& $pythonPath scripts/check_environment.py
if ($LASTEXITCODE -ne 0) {
    & $pythonPath -m pip install -r requirements.txt
    if ($LASTEXITCODE -ne 0) { throw 'Python dependencies could not be installed.' }
    & $pythonPath scripts/check_environment.py
    if ($LASTEXITCODE -ne 0) { throw 'Installed dependencies do not match the model environment.' }
}
if (-not (Test-Path -LiteralPath 'artifacts/ridge_model.joblib')) {
    & $pythonPath scripts/prepare_model.py
    if ($LASTEXITCODE -ne 0) { throw 'Model preparation failed.' }
}
if (-not (Test-Path -LiteralPath 'frontend/dist/index.html')) {
    Push-Location -LiteralPath 'frontend'
    try {
        npm.cmd ci
        if ($LASTEXITCODE -ne 0) { throw 'Frontend dependencies could not be installed.' }
        npm.cmd run build
        if ($LASTEXITCODE -ne 0) { throw 'Frontend build failed.' }
    } finally { Pop-Location }
}
Write-Host ''
Write-Host 'Spoke is starting at http://127.0.0.1:8000'
Write-Host 'Keep this terminal open. Press Ctrl+C to stop.'
& $pythonPath -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
