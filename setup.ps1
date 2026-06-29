# Dexo Platform Setup Script for Windows PowerShell
# Run this script after starting Docker Desktop

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Dexo Platform Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Docker is running
Write-Host "Checking Docker status..." -ForegroundColor Yellow
try {
    docker ps > $null 2>&1
    Write-Host "[OK] Docker is running" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Docker is not running!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please start Docker Desktop and run this script again." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Press any key to exit..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit
}

Write-Host ""

# Start Docker services
Write-Host "Starting Docker services..." -ForegroundColor Yellow
docker-compose up -d

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to start Docker services" -ForegroundColor Red
    Write-Host "Press any key to exit..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit
}

Write-Host "[OK] Docker services started" -ForegroundColor Green
Write-Host ""

# Wait for PostgreSQL to be fully ready
Write-Host "Waiting for PostgreSQL to be ready..." -ForegroundColor Yellow
$maxAttempts = 30
$attempt = 0
while ($attempt -lt $maxAttempts) {
    try {
        docker exec dexo_postgres pg_isready -U postgres 2>&1 | Select-String -Pattern "accepting connections" -Quiet
        if ($?) {
            Write-Host "[OK] PostgreSQL is ready" -ForegroundColor Green
            break
        }
    } catch {
        # Continue waiting
    }
    $attempt++
    Write-Host "." -NoNewline
    Start-Sleep -Seconds 1
}

if ($attempt -eq $maxAttempts) {
    Write-Host ""
    Write-Host "[WARN] PostgreSQL may not be fully ready, continuing..." -ForegroundColor Yellow
}
Write-Host ""

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing npm dependencies..." -ForegroundColor Yellow
    npm install
    Write-Host "[OK] Dependencies installed" -ForegroundColor Green
    Write-Host ""
}

# Generate Prisma client
Write-Host "Generating Prisma client..." -ForegroundColor Yellow
npm run db:generate
if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Prisma client generated" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Failed to generate Prisma client" -ForegroundColor Red
    Write-Host "Press any key to exit..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit
}
Write-Host ""

# Push database schema
Write-Host "Setting up database schema..." -ForegroundColor Yellow
npm run db:push
if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Database schema created" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Failed to create database schema" -ForegroundColor Red
    Write-Host ""
    Write-Host "Troubleshooting:" -ForegroundColor Yellow
    Write-Host "1. Check Docker Desktop is running" -ForegroundColor White
    Write-Host "2. Check PostgreSQL container is healthy: docker ps" -ForegroundColor White
    Write-Host "3. View PostgreSQL logs: docker logs dexo_postgres" -ForegroundColor White
    Write-Host "4. Try manually: npm run db:push" -ForegroundColor White
    Write-Host ""
    Write-Host "Press any key to exit..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit
}
Write-Host ""

# Seed database
Write-Host "Seeding database with demo data..." -ForegroundColor Yellow
npm run db:seed
if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Database seeded successfully" -ForegroundColor Green
} else {
    Write-Host "[WARN] Failed to seed database (may already have data)" -ForegroundColor Yellow
}
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Demo Credentials:" -ForegroundColor White
Write-Host "  Admin:    admin@demo.com / Demo123!" -ForegroundColor Cyan
Write-Host "  Manager:  manager@demo.com / Demo123!" -ForegroundColor Cyan
Write-Host "  User:     user@demo.com / Demo123!" -ForegroundColor Cyan
Write-Host ""
Write-Host "Available Services:" -ForegroundColor White
Write-Host "  API:           http://localhost:3000" -ForegroundColor Cyan
Write-Host "  Swagger Docs:  http://localhost:3000/api/docs" -ForegroundColor Cyan
Write-Host "  MinIO Console: http://localhost:9001" -ForegroundColor Cyan
Write-Host "  MailHog:       http://localhost:8025" -ForegroundColor Cyan
Write-Host "  PgAdmin:       http://localhost:5050" -ForegroundColor Cyan
Write-Host ""
Write-Host "To start the API server, run:" -ForegroundColor Yellow
Write-Host "  npm run dev:api" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
