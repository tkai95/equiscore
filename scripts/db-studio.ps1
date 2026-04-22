# Opens Prisma Studio — a visual browser for your database
# Run from the repo root: .\scripts\db-studio.ps1

$root = Split-Path $PSScriptRoot -Parent
Set-Location "$root\packages\database"

Write-Host "Opening Prisma Studio at http://localhost:5555" -ForegroundColor Cyan
npx prisma studio
