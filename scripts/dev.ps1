# Equiscore — daily dev start script
# Run from the repo root: .\scripts\dev.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root

Write-Host ""
Write-Host "=== Starting Equiscore Dev ===" -ForegroundColor Cyan
Write-Host ""

# ── Check env files exist ─────────────────────────────────────────────────────

$missingEnv = $false

if (-not (Test-Path "apps\web\.env.local")) {
    Write-Host "MISSING: apps\web\.env.local — run .\scripts\setup.ps1 first" -ForegroundColor Red
    $missingEnv = $true
}
if (-not (Test-Path "apps\api\.env")) {
    Write-Host "MISSING: apps\api\.env — run .\scripts\setup.ps1 first" -ForegroundColor Red
    $missingEnv = $true
}
if ($missingEnv) { exit 1 }

# ── Ensure Docker services are running ───────────────────────────────────────

Write-Host "Ensuring PostgreSQL and Redis are running..." -ForegroundColor Yellow
docker compose up -d

# Wait briefly for postgres
$retries = 10
for ($i = 0; $i -lt $retries; $i++) {
    docker compose exec postgres pg_isready -U postgres 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) { break }
    Start-Sleep -Seconds 2
}
Write-Host "  Docker services ready" -ForegroundColor Green

# ── Start dev servers ─────────────────────────────────────────────────────────

Write-Host ""
Write-Host "Starting dev servers..." -ForegroundColor Yellow
Write-Host "  Web  ->  http://localhost:3000" -ForegroundColor Cyan
Write-Host "  API  ->  http://localhost:4000" -ForegroundColor Cyan
Write-Host "  Docs ->  http://localhost:4000/api/docs" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop all servers." -ForegroundColor Gray
Write-Host ""

npm run dev
