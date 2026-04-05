/**
 * Generates helper shell scripts for managing the OpenClaw Docker Compose stack.
 *
 * Returns a map of file paths (relative to project root) to file contents.
 */
export function generateScripts(options?: { hasGitServices?: boolean }): Record<string, string> {
	const hasGit = options?.hasGitServices ?? false;
	const files: Record<string, string> = {};

	// ── scripts/start.sh ────────────────────────────────────────────────────

	files["scripts/start.sh"] = `#!/usr/bin/env bash
set -euo pipefail

# ─── OpenClaw Start Script ──────────────────────────────────────────────────
# Production-quality bootstrap: validates prerequisites, auto-generates secrets,
# creates required directories, and starts all services via Docker Compose.
# Modelled after the official docker-setup.sh patterns.

SCRIPT_DIR="$(cd "$(dirname "\${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

# ── Auto-detect host UID/GID for bind-mount ownership ────────────────────
if [ -f .env ] && ! grep -q "^PUID=" .env 2>/dev/null; then
  echo "PUID=$(id -u)" >> .env
  echo "PGID=$(id -g)" >> .env
fi

echo "🐾 OpenClaw — Starting services..."
echo ""

# ── Colour helpers (no-op when not a TTY) ────────────────────────────────────
if [ -t 1 ]; then
  RED='\\033[0;31m'; GREEN='\\033[0;32m'; YELLOW='\\033[1;33m'; CYAN='\\033[0;36m'; NC='\\033[0m'
else
  RED=''; GREEN=''; YELLOW=''; CYAN=''; NC=''
fi

info()  { echo -e "\${CYAN}ℹ  $*\${NC}"; }
ok()    { echo -e "\${GREEN}✅ $*\${NC}"; }
warn()  { echo -e "\${YELLOW}⚠️  $*\${NC}"; }
err()   { echo -e "\${RED}❌ $*\${NC}" >&2; }

# ── Prerequisite checks ─────────────────────────────────────────────────────

if ! command -v docker &> /dev/null; then
  err "Docker is not installed. Please install Docker first."
  echo "   https://docs.docker.com/get-docker/"
  exit 1
fi

if ! docker compose version &> /dev/null; then
  err "Docker Compose (v2) is not available."
  echo "   https://docs.docker.com/compose/install/"
  exit 1
fi

if ! docker info &> /dev/null 2>&1; then
  err "Docker daemon is not running. Please start Docker."
  exit 1
fi

# ── Source .env if it exists ─────────────────────────────────────────────────

if [ -f ".env" ]; then
  info "Loading existing .env file..."
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
else
  warn ".env file not found — will create one from .env.example if available."
  if [ -f ".env.example" ]; then
    cp .env.example .env
    info "Created .env from .env.example"
    set -a
    # shellcheck disable=SC1091
    source .env
    set +a
  fi
fi

# ── Auto-generate OPENCLAW_GATEWAY_TOKEN if missing ──────────────────────────

if [ -z "\${OPENCLAW_GATEWAY_TOKEN:-}" ]; then
  info "Generating OPENCLAW_GATEWAY_TOKEN..."
  if command -v openssl &> /dev/null; then
    OPENCLAW_GATEWAY_TOKEN="$(openssl rand -hex 32)"
  elif command -v python3 &> /dev/null; then
    OPENCLAW_GATEWAY_TOKEN="$(python3 -c 'import secrets; print(secrets.token_hex(32))')"
  elif command -v python &> /dev/null; then
    OPENCLAW_GATEWAY_TOKEN="$(python -c 'import secrets; print(secrets.token_hex(32))')"
  else
    err "Cannot generate token: neither openssl nor python3 found."
    exit 1
  fi
  export OPENCLAW_GATEWAY_TOKEN

  # Persist into .env
  if [ -f ".env" ]; then
    if grep -q "^OPENCLAW_GATEWAY_TOKEN=" .env 2>/dev/null; then
      sed -i.bak "s|^OPENCLAW_GATEWAY_TOKEN=.*|OPENCLAW_GATEWAY_TOKEN=\${OPENCLAW_GATEWAY_TOKEN}|" .env && rm -f .env.bak
    else
      echo "OPENCLAW_GATEWAY_TOKEN=\${OPENCLAW_GATEWAY_TOKEN}" >> .env
    fi
  fi
  ok "Gateway token generated and saved."
fi

# ── Apply defaults for optional variables ────────────────────────────────────

export OPENCLAW_VERSION="\${OPENCLAW_VERSION:-latest}"
export OPENCLAW_GATEWAY_PORT="\${OPENCLAW_GATEWAY_PORT:-18789}"
export OPENCLAW_BRIDGE_PORT="\${OPENCLAW_BRIDGE_PORT:-18790}"
export OPENCLAW_GATEWAY_BIND="\${OPENCLAW_GATEWAY_BIND:-lan}"
export OPENCLAW_CONFIG_DIR="\${OPENCLAW_CONFIG_DIR:-./openclaw/config}"
export OPENCLAW_WORKSPACE_DIR="\${OPENCLAW_WORKSPACE_DIR:-./openclaw/workspace}"

# ── Create required host directories ────────────────────────────────────────

info "Ensuring host directories exist..."
mkdir -p "\${OPENCLAW_CONFIG_DIR}"
mkdir -p "\${OPENCLAW_WORKSPACE_DIR}"
ok "Directories ready: \${OPENCLAW_CONFIG_DIR}, \${OPENCLAW_WORKSPACE_DIR}"

# ── Check for empty secret values ────────────────────────────────────────────

EMPTY_SECRETS=0
while IFS='=' read -r key value; do
  [[ "$key" =~ ^#.*$ ]] && continue
  [[ -z "$key" ]] && continue
  if [[ "$key" =~ (PASSWORD|TOKEN|SECRET|SESSION_KEY|COOKIE) ]] && [[ -z "\${value:-}" ]]; then
    warn "Warning: $key is empty in .env"
    EMPTY_SECRETS=$((EMPTY_SECRETS + 1))
  fi
done < .env 2>/dev/null || true

if [ "$EMPTY_SECRETS" -gt 0 ]; then
  echo ""
  warn "$EMPTY_SECRETS secret(s) are empty. Some services may not function until they are set."
  echo ""
fi

# ── Clone git-based repositories (if any) ────────────────────────────────────

if [ -f "$SCRIPT_DIR/clone-repos.sh" ]; then
  info "Cloning/updating SaaS boilerplate repositories..."
  bash "$SCRIPT_DIR/clone-repos.sh"
  ok "Repositories ready."
fi

# ── Pull and start ───────────────────────────────────────────────────────────

echo ""
info "Pulling latest images..."
docker compose pull --quiet 2>/dev/null || docker compose pull

echo ""
info "Starting services..."
docker compose up -d --remove-orphans${hasGit ? " --build" : ""}

# ── Health-check loop ────────────────────────────────────────────────────────

echo ""
info "Waiting for services to become healthy..."
sleep 5

RETRIES=0
MAX_RETRIES=30
while [ $RETRIES -lt $MAX_RETRIES ]; do
  UNHEALTHY=$(docker compose ps --format json 2>/dev/null | grep -c '"unhealthy"' || true)
  STARTING=$(docker compose ps --format json 2>/dev/null | grep -c '"starting"' || true)

  if [ "$UNHEALTHY" -eq 0 ] && [ "$STARTING" -eq 0 ]; then
    break
  fi

  RETRIES=$((RETRIES + 1))
  sleep 2
done

echo ""
docker compose ps
echo ""

if [ $RETRIES -ge $MAX_RETRIES ]; then
  warn "Some services may still be starting. Check: docker compose ps"
else
  ok "All services are running!"
fi

# ── First-boot onboarding ────────────────────────────────────────────────────

SENTINEL="$PROJECT_DIR/.openclaw-bootstrapped"
if [ ! -f "$SENTINEL" ]; then
  echo ""
  info "First boot detected — running OpenClaw onboarding..."
  docker compose exec -T openclaw-gateway node dist/index.js onboard \\
    --bind lan --auth token --no-install-daemon 2>/dev/null || {
    warn "Auto-onboarding skipped. Run manually:"
    echo "  docker compose run --rm openclaw-cli onboard --no-install-daemon"
  }
  touch "$SENTINEL"
  ok "Onboarding complete. Delete .openclaw-bootstrapped to re-run."
fi

# ── Print service URLs & token ───────────────────────────────────────────────

GATEWAY_HOST="localhost"
if [ "\${OPENCLAW_GATEWAY_BIND}" = "lan" ]; then
  GATEWAY_HOST="0.0.0.0"
fi

echo ""
echo "═══════════════════════════════════════════════════════════════════════════════"
echo " 🐾 OpenClaw is ready!"
echo "═══════════════════════════════════════════════════════════════════════════════"
echo ""
echo "  Gateway URL:        http://\${GATEWAY_HOST}:\${OPENCLAW_GATEWAY_PORT}"
echo "  Bridge (WebSocket): ws://\${GATEWAY_HOST}:\${OPENCLAW_BRIDGE_PORT}"
echo "  Config directory:   \${OPENCLAW_CONFIG_DIR}"
echo "  Workspace directory:\${OPENCLAW_WORKSPACE_DIR}"
echo ""
echo "  Gateway Token:      \${OPENCLAW_GATEWAY_TOKEN}"
echo ""
echo "  Manage:"
echo "    Stop:   ./scripts/stop.sh"
echo "    Status: ./scripts/status.sh"
echo "    Update: ./scripts/update.sh"
echo "    Logs:   docker compose logs -f"
echo ""
echo "═══════════════════════════════════════════════════════════════════════════════"
`;

	// ── scripts/stop.sh ─────────────────────────────────────────────────────

	files["scripts/stop.sh"] = `#!/usr/bin/env bash
set -euo pipefail

# ─── OpenClaw Stop Script ───────────────────────────────────────────────────
# Gracefully stops all services.

SCRIPT_DIR="$(cd "$(dirname "\${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

echo "🐾 OpenClaw — Stopping services..."
echo ""

# Graceful shutdown with timeout
docker compose down --timeout 30

echo ""
echo "✅ All services stopped."
`;

	// ── scripts/update.sh ───────────────────────────────────────────────────

	files["scripts/update.sh"] = `#!/usr/bin/env bash
set -euo pipefail

# ─── OpenClaw Update Script ─────────────────────────────────────────────────
# Pulls latest images and restarts services.

SCRIPT_DIR="$(cd "$(dirname "\${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

echo "🐾 OpenClaw — Updating services..."
echo ""

# Update git-based repositories (if any)
if [ -f "$SCRIPT_DIR/clone-repos.sh" ]; then
  echo "📂 Updating SaaS boilerplate repositories..."
  bash "$SCRIPT_DIR/clone-repos.sh"
fi

# Pull latest images
echo "📦 Pulling latest images..."
docker compose pull

echo ""
echo "🔄 Restarting services with new images..."
docker compose up -d --remove-orphans${hasGit ? " --build" : ""}

echo ""
echo "⏳ Waiting for services to stabilize..."
sleep 10

docker compose ps

echo ""
echo "✅ Update complete!"
`;

	// ── scripts/backup.sh ───────────────────────────────────────────────────

	files["scripts/backup.sh"] = `#!/usr/bin/env bash
set -euo pipefail

# ─── OpenClaw Backup Script ─────────────────────────────────────────────────
# Backs up all named Docker volumes to a timestamped directory.

SCRIPT_DIR="$(cd "$(dirname "\${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="$PROJECT_DIR/backups/$TIMESTAMP"
mkdir -p "$BACKUP_DIR"

echo "🐾 OpenClaw — Backing up volumes..."
echo "   Backup directory: $BACKUP_DIR"
echo ""

# Get project name from docker compose
PROJECT_NAME=$(docker compose config --format json 2>/dev/null | grep -o '"name":"[^"]*"' | head -1 | cut -d'"' -f4 || echo "openclaw")

# List all volumes for this project
VOLUMES=$(docker volume ls --filter "name=\${PROJECT_NAME}" --format "{{.Name}}" 2>/dev/null || true)

if [ -z "$VOLUMES" ]; then
  echo "⚠️  No volumes found for project: $PROJECT_NAME"
  echo "   Trying to list all openclaw volumes..."
  VOLUMES=$(docker volume ls --filter "name=openclaw" --format "{{.Name}}" 2>/dev/null || true)
fi

if [ -z "$VOLUMES" ]; then
  echo "❌ No volumes found to back up."
  exit 1
fi

BACKED_UP=0
for VOLUME in $VOLUMES; do
  echo "📦 Backing up: $VOLUME"
  docker run --rm \\
    -v "\${VOLUME}:/source:ro" \\
    -v "$BACKUP_DIR:/backup" \\
    alpine tar czf "/backup/\${VOLUME}.tar.gz" -C /source .

  SIZE=$(du -sh "$BACKUP_DIR/\${VOLUME}.tar.gz" | cut -f1)
  echo "   ✓ $VOLUME ($SIZE)"
  BACKED_UP=$((BACKED_UP + 1))
done

TOTAL_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)
echo ""
echo "✅ Backed up $BACKED_UP volume(s) ($TOTAL_SIZE total)"
echo "   Location: $BACKUP_DIR"
`;

	// ── scripts/status.sh ───────────────────────────────────────────────────

	files["scripts/status.sh"] = `#!/usr/bin/env bash
set -euo pipefail

# ─── OpenClaw Status Script ─────────────────────────────────────────────────
# Shows the current status of all services.

SCRIPT_DIR="$(cd "$(dirname "\${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

echo "🐾 OpenClaw — Service Status"
echo ""

# Show compose status
docker compose ps

echo ""
echo "── Resource Usage ──────────────────────────────────────────────────────"
echo ""

# Show resource usage
docker compose top 2>/dev/null || true

echo ""
echo "── Disk Usage ─────────────────────────────────────────────────────────"
echo ""

# Show volume sizes
docker system df -v 2>/dev/null | head -30 || docker system df 2>/dev/null || true

echo ""
echo "── Network ────────────────────────────────────────────────────────────"
echo ""

docker network ls --filter "name=openclaw" --format "table {{.Name}}\\t{{.Driver}}\\t{{.Scope}}" 2>/dev/null || true
`;

	// ═══════════════════════════════════════════════════════════════════════
	// PowerShell equivalents
	// ═══════════════════════════════════════════════════════════════════════

	// ── scripts/start.ps1 ───────────────────────────────────────────────────

	files["scripts/start.ps1"] = `#Requires -Version 5.1
<#
.SYNOPSIS
  OpenClaw Start Script — validates prerequisites, auto-generates secrets,
  creates required directories, and starts all services via Docker Compose.
#>

$ErrorActionPreference = 'Stop'
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectDir = Split-Path -Parent $ScriptDir
Set-Location $ProjectDir

function Info  { param($Msg) Write-Host "  i  $Msg" -ForegroundColor Cyan }
function Ok    { param($Msg) Write-Host "  +  $Msg" -ForegroundColor Green }
function Warn  { param($Msg) Write-Host "  !  $Msg" -ForegroundColor Yellow }
function Err   { param($Msg) Write-Host "  x  $Msg" -ForegroundColor Red }

Write-Host ""
Write-Host "OpenClaw - Starting services..." -ForegroundColor White
Write-Host ""

# ── Prerequisite checks ─────────────────────────────────────────────────
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Err "Docker is not installed. Please install Docker Desktop."
    Write-Host "   https://docs.docker.com/desktop/install/windows-install/"
    exit 1
}

$composeCheck = docker compose version 2>&1
if ($LASTEXITCODE -ne 0) {
    Err "Docker Compose (v2) is not available."
    Write-Host "   https://docs.docker.com/compose/install/"
    exit 1
}

$dockerInfo = docker info 2>&1
if ($LASTEXITCODE -ne 0) {
    Err "Docker daemon is not running. Please start Docker Desktop."
    exit 1
}

# ── Source .env if it exists ─────────────────────────────────────────────
if (Test-Path ".env") {
    Info "Loading existing .env file..."
    Get-Content ".env" | ForEach-Object {
        if ($_ -match '^([^#=]+)=(.*)$') {
            [Environment]::SetEnvironmentVariable($Matches[1].Trim(), $Matches[2].Trim(), 'Process')
        }
    }
} else {
    Warn ".env file not found - will create one from .env.example if available."
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env"
        Info "Created .env from .env.example"
        Get-Content ".env" | ForEach-Object {
            if ($_ -match '^([^#=]+)=(.*)$') {
                [Environment]::SetEnvironmentVariable($Matches[1].Trim(), $Matches[2].Trim(), 'Process')
            }
        }
    }
}

# ── Auto-generate OPENCLAW_GATEWAY_TOKEN if missing ──────────────────────
if (-not $env:OPENCLAW_GATEWAY_TOKEN) {
    Info "Generating OPENCLAW_GATEWAY_TOKEN..."
    $bytes = New-Object byte[] 32
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    $env:OPENCLAW_GATEWAY_TOKEN = ($bytes | ForEach-Object { $_.ToString("x2") }) -join ''

    if (Test-Path ".env") {
        $envContent = Get-Content ".env" -Raw
        if ($envContent -match '(?m)^OPENCLAW_GATEWAY_TOKEN=') {
            $envContent = $envContent -replace '(?m)^OPENCLAW_GATEWAY_TOKEN=.*', "OPENCLAW_GATEWAY_TOKEN=$($env:OPENCLAW_GATEWAY_TOKEN)"
            Set-Content ".env" $envContent -NoNewline
        } else {
            Add-Content ".env" "OPENCLAW_GATEWAY_TOKEN=$($env:OPENCLAW_GATEWAY_TOKEN)"
        }
    }
    Ok "Gateway token generated and saved."
}

# ── Apply defaults ───────────────────────────────────────────────────────
if (-not $env:OPENCLAW_VERSION)       { $env:OPENCLAW_VERSION       = "latest" }
if (-not $env:OPENCLAW_GATEWAY_PORT)  { $env:OPENCLAW_GATEWAY_PORT  = "18789" }
if (-not $env:OPENCLAW_BRIDGE_PORT)   { $env:OPENCLAW_BRIDGE_PORT   = "18790" }
if (-not $env:OPENCLAW_GATEWAY_BIND)  { $env:OPENCLAW_GATEWAY_BIND  = "lan" }
if (-not $env:OPENCLAW_CONFIG_DIR)    { $env:OPENCLAW_CONFIG_DIR    = "./openclaw/config" }
if (-not $env:OPENCLAW_WORKSPACE_DIR) { $env:OPENCLAW_WORKSPACE_DIR = "./openclaw/workspace" }

# ── Create required host directories ────────────────────────────────────
Info "Ensuring host directories exist..."
New-Item -ItemType Directory -Force -Path $env:OPENCLAW_CONFIG_DIR    | Out-Null
New-Item -ItemType Directory -Force -Path $env:OPENCLAW_WORKSPACE_DIR | Out-Null
Ok "Directories ready: $($env:OPENCLAW_CONFIG_DIR), $($env:OPENCLAW_WORKSPACE_DIR)"

# ── Clone git-based repositories (if any) ─────────────────────────────
$cloneScript = Join-Path $ScriptDir "clone-repos.ps1"
if (Test-Path $cloneScript) {
    Info "Cloning/updating SaaS boilerplate repositories..."
    & $cloneScript
    Ok "Repositories ready."
}

# ── Pull and start ───────────────────────────────────────────────────────
Write-Host ""
Info "Pulling latest images..."
docker compose pull 2>$null
if ($LASTEXITCODE -ne 0) { docker compose pull }

Write-Host ""
Info "Starting services..."
docker compose up -d --remove-orphans${hasGit ? " --build" : ""}

# ── Health-check loop ────────────────────────────────────────────────────
Write-Host ""
Info "Waiting for services to become healthy..."
Start-Sleep -Seconds 5

$retries = 0
$maxRetries = 30
while ($retries -lt $maxRetries) {
    $psOutput = docker compose ps --format json 2>$null
    $unhealthy = ($psOutput | Select-String -Pattern '"unhealthy"' -SimpleMatch).Count
    $starting  = ($psOutput | Select-String -Pattern '"starting"'  -SimpleMatch).Count
    if ($unhealthy -eq 0 -and $starting -eq 0) { break }
    $retries++
    Start-Sleep -Seconds 2
}

Write-Host ""
docker compose ps
Write-Host ""

if ($retries -ge $maxRetries) {
    Warn "Some services may still be starting. Check: docker compose ps"
} else {
    Ok "All services are running!"
}

# ── Print service URLs & token ───────────────────────────────────────────
$gatewayHost = if ($env:OPENCLAW_GATEWAY_BIND -eq "lan") { "0.0.0.0" } else { "localhost" }

Write-Host ""
Write-Host "==============================================================================="
Write-Host " OpenClaw is ready!"
Write-Host "==============================================================================="
Write-Host ""
Write-Host "  Gateway URL:         http://\${gatewayHost}:$($env:OPENCLAW_GATEWAY_PORT)"
Write-Host "  Bridge (WebSocket):  ws://\${gatewayHost}:$($env:OPENCLAW_BRIDGE_PORT)"
Write-Host "  Config directory:    $($env:OPENCLAW_CONFIG_DIR)"
Write-Host "  Workspace directory: $($env:OPENCLAW_WORKSPACE_DIR)"
Write-Host ""
Write-Host "  Gateway Token:       $($env:OPENCLAW_GATEWAY_TOKEN)"
Write-Host ""
Write-Host "  Manage:"
Write-Host "    Stop:   .\\scripts\\stop.ps1"
Write-Host "    Status: .\\scripts\\status.ps1"
Write-Host "    Update: .\\scripts\\update.ps1"
Write-Host "    Logs:   docker compose logs -f"
Write-Host ""
Write-Host "==============================================================================="
`;

	// ── scripts/stop.ps1 ────────────────────────────────────────────────────

	files["scripts/stop.ps1"] = `#Requires -Version 5.1
<#
.SYNOPSIS
  OpenClaw Stop Script — gracefully stops all services.
#>

$ErrorActionPreference = 'Stop'
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectDir = Split-Path -Parent $ScriptDir
Set-Location $ProjectDir

Write-Host ""
Write-Host "OpenClaw - Stopping services..." -ForegroundColor White
Write-Host ""

docker compose down --timeout 30

Write-Host ""
Write-Host "  +  All services stopped." -ForegroundColor Green
`;

	// ── scripts/update.ps1 ──────────────────────────────────────────────────

	files["scripts/update.ps1"] = `#Requires -Version 5.1
<#
.SYNOPSIS
  OpenClaw Update Script — pulls latest images and restarts services.
#>

$ErrorActionPreference = 'Stop'
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectDir = Split-Path -Parent $ScriptDir
Set-Location $ProjectDir

Write-Host ""
Write-Host "OpenClaw - Updating services..." -ForegroundColor White
Write-Host ""

# Update git-based repositories (if any)
$cloneScript = Join-Path $ScriptDir "clone-repos.ps1"
if (Test-Path $cloneScript) {
    Write-Host "  Updating SaaS boilerplate repositories..." -ForegroundColor Cyan
    & $cloneScript
}

Write-Host "  Pulling latest images..." -ForegroundColor Cyan
docker compose pull

Write-Host ""
Write-Host "  Restarting services with new images..." -ForegroundColor Cyan
docker compose up -d --remove-orphans${hasGit ? " --build" : ""}

Write-Host ""
Write-Host "  Waiting for services to stabilize..." -ForegroundColor Cyan
Start-Sleep -Seconds 10

docker compose ps

Write-Host ""
Write-Host "  +  Update complete!" -ForegroundColor Green
`;

	// ── scripts/backup.ps1 ──────────────────────────────────────────────────

	files["scripts/backup.ps1"] = `#Requires -Version 5.1
<#
.SYNOPSIS
  OpenClaw Backup Script — backs up all named Docker volumes to a timestamped directory.
#>

$ErrorActionPreference = 'Stop'
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectDir = Split-Path -Parent $ScriptDir
Set-Location $ProjectDir

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupDir = Join-Path $ProjectDir "backups\\$timestamp"
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null

Write-Host ""
Write-Host "OpenClaw - Backing up volumes..." -ForegroundColor White
Write-Host "   Backup directory: $backupDir"
Write-Host ""

# Get project name from docker compose
$projectName = "openclaw"
try {
    $configJson = docker compose config --format json 2>$null | ConvertFrom-Json
    if ($configJson.name) { $projectName = $configJson.name }
} catch {}

# List all volumes for this project
$volumes = docker volume ls --filter "name=$projectName" --format "{{.Name}}" 2>$null
if (-not $volumes) {
    Write-Host "  !  No volumes found for project: $projectName" -ForegroundColor Yellow
    Write-Host "     Trying to list all openclaw volumes..."
    $volumes = docker volume ls --filter "name=openclaw" --format "{{.Name}}" 2>$null
}

if (-not $volumes) {
    Write-Host "  x  No volumes found to back up." -ForegroundColor Red
    exit 1
}

$backedUp = 0
foreach ($volume in $volumes) {
    $vol = $volume.Trim()
    if (-not $vol) { continue }
    Write-Host "  Backing up: $vol" -ForegroundColor Cyan
    docker run --rm -v "\${vol}:/source:ro" -v "\${backupDir}:/backup" alpine tar czf "/backup/$vol.tar.gz" -C /source .
    $size = (Get-Item (Join-Path $backupDir "$vol.tar.gz")).Length / 1MB
    Write-Host "     + $vol ($([math]::Round($size, 1))MB)" -ForegroundColor Green
    $backedUp++
}

$totalSize = ((Get-ChildItem $backupDir -Recurse | Measure-Object -Property Length -Sum).Sum) / 1MB
Write-Host ""
Write-Host "  +  Backed up $backedUp volume(s) ($([math]::Round($totalSize, 1))MB total)" -ForegroundColor Green
Write-Host "     Location: $backupDir"
`;

	// ── scripts/status.ps1 ──────────────────────────────────────────────────

	files["scripts/status.ps1"] = `#Requires -Version 5.1
<#
.SYNOPSIS
  OpenClaw Status Script — shows the current status of all services.
#>

$ErrorActionPreference = 'Stop'
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectDir = Split-Path -Parent $ScriptDir
Set-Location $ProjectDir

Write-Host ""
Write-Host "OpenClaw - Service Status" -ForegroundColor White
Write-Host ""

# Show compose status
docker compose ps

Write-Host ""
Write-Host "-- Resource Usage ----------------------------------------------------------"
Write-Host ""

try { docker compose top 2>$null } catch {}

Write-Host ""
Write-Host "-- Disk Usage --------------------------------------------------------------"
Write-Host ""

try { docker system df 2>$null } catch {}

Write-Host ""
Write-Host "-- Network -----------------------------------------------------------------"
Write-Host ""

try {
    docker network ls --filter "name=openclaw" --format "table {{.Name}}\\t{{.Driver}}\\t{{.Scope}}" 2>$null
} catch {}
`;

	return files;
}
