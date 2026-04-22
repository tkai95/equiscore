# Equiscore — one-time setup script (run this once before your first dev session)
# Run from the repo root: .\scripts\setup.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root

Write-Host ""
Write-Host "=== Equiscore Setup ===" -ForegroundColor Cyan
Write-Host ""

# ── 1. Check prerequisites ────────────────────────────────────────────────────

Write-Host "Checking prerequisites..." -ForegroundColor Yellow

$nodeVersion = node --version 2>$null
if (-not $nodeVersion) {
    Write-Host "ERROR: Node.js not found. Install from https://nodejs.org" -ForegroundColor Red
    exit 1
}
Write-Host "  Node.js $nodeVersion" -ForegroundColor Green

$dockerVersion = docker --version 2>$null
if (-not $dockerVersion) {
    Write-Host "ERROR: Docker not found. Install Docker Desktop from https://docker.com" -ForegroundColor Red
    exit 1
}
Write-Host "  $dockerVersion" -ForegroundColor Green

# ── 2. Copy env files ─────────────────────────────────────────────────────────

Write-Host ""
Write-Host "Setting up environment files..." -ForegroundColor Yellow

if (-not (Test-Path "apps\web\.env.local")) {
    Copy-Item "apps\web\.env.example" "apps\web\.env.local"
    Write-Host "  Created apps\web\.env.local" -ForegroundColor Green
    Write-Host "  ACTION NEEDED: Add your Clerk keys to apps\web\.env.local" -ForegroundColor Magenta
} else {
    Write-Host "  apps\web\.env.local already exists, skipping" -ForegroundColor Gray
}

if (-not (Test-Path "apps\api\.env")) {
    Copy-Item "apps\api\.env.example" "apps\api\.env"
    Write-Host "  Created apps\api\.env" -ForegroundColor Green
    Write-Host "  ACTION NEEDED: Add your Clerk keys to apps\api\.env" -ForegroundColor Magenta
} else {
    Write-Host "  apps\api\.env already exists, skipping" -ForegroundColor Gray
}

# ── 3. Install dependencies ───────────────────────────────────────────────────

Write-Host ""
Write-Host "Installing npm dependencies..." -ForegroundColor Yellow
npm install
Write-Host "  Done" -ForegroundColor Green

# ── 4. Start Docker services ──────────────────────────────────────────────────

Write-Host ""
Write-Host "Starting PostgreSQL and Redis via Docker..." -ForegroundColor Yellow
docker compose up -d

# Wait for postgres to be ready
Write-Host "  Waiting for PostgreSQL to be ready..." -ForegroundColor Gray
$retries = 20
$ready = $false
for ($i = 0; $i -lt $retries; $i++) {
    $result = docker compose exec postgres pg_isready -U postgres 2>$null
    if ($LASTEXITCODE -eq 0) { $ready = $true; break }
    Start-Sleep -Seconds 2
}
if (-not $ready) {
    Write-Host "  ERROR: PostgreSQL did not become ready in time. Check Docker." -ForegroundColor Red
    exit 1
}
Write-Host "  PostgreSQL is ready" -ForegroundColor Green

# ── 5. Push database schema ───────────────────────────────────────────────────

Write-Host ""
Write-Host "Pushing Prisma schema to database..." -ForegroundColor Yellow
Set-Location "packages\database"
npx prisma generate
npx prisma db push
Set-Location $root
Write-Host "  Database schema applied" -ForegroundColor Green

# ── 6. Done ───────────────────────────────────────────────────────────────────

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  Setup complete!" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Before starting, make sure you have added your Clerk keys to:" -ForegroundColor Yellow
Write-Host "  apps\web\.env.local"
Write-Host "  apps\api\.env"
Write-Host ""
Write-Host "Then start development with:" -ForegroundColor Yellow
Write-Host "  .\scripts\dev.ps1"
Write-Host ""
Write-Host "URLs once running:"
Write-Host "  Web app  ->  http://localhost:3000"
Write-Host "  API      ->  http://localhost:4000"
Write-Host "  API docs ->  http://localhost:4000/api/docs"
Write-Host ""
