import type { ResolverOutput } from "../types.js";

/**
 * Generates clone scripts for git-based services (SaaS boilerplates).
 * Returns empty object if no git-based services exist in the resolved stack.
 */
export function generateCloneScripts(resolved: ResolverOutput): Record<string, string> {
	const gitServices = resolved.services.filter(
		(s) => s.definition.gitSource && s.definition.buildContext,
	);

	if (gitServices.length === 0) return {};

	const files: Record<string, string> = {};

	// ── scripts/clone-repos.sh ─────────────────────────────────────────────

	const bashEntries = gitServices
		.map((s) => {
			const gs = s.definition.gitSource!;
			const branchArg = gs.branch ? `"${gs.branch}"` : '""';
			let block = `clone_or_update "${s.definition.id}" "${gs.repoUrl}" ${branchArg}`;
			if (gs.postCloneCommands && gs.postCloneCommands.length > 0) {
				const cmds = gs.postCloneCommands
					.map(
						(cmd) =>
							`  (cd "$REPOS_DIR/${s.definition.id}${gs.subdirectory ? `/${gs.subdirectory}` : ""}" && ${cmd})`,
					)
					.join("\n");
				block += `\n${cmds}`;
			}
			return block;
		})
		.join("\n\n");

	files["scripts/clone-repos.sh"] = `#!/usr/bin/env bash
set -euo pipefail

# ─── Clone/Update Git-Based Service Repositories ────────────────────────────
# Idempotent: clones if missing, pulls if already present.

SCRIPT_DIR="$(cd "$(dirname "\${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
REPOS_DIR="$PROJECT_DIR/repos"

# ── Colour helpers ──────────────────────────────────────────────────────────
if [ -t 1 ]; then
  GREEN='\\033[0;32m'; YELLOW='\\033[1;33m'; CYAN='\\033[0;36m'; RED='\\033[0;31m'; NC='\\033[0m'
else
  GREEN=''; YELLOW=''; CYAN=''; RED=''; NC=''
fi
info()  { echo -e "\${CYAN}i  $*\${NC}"; }
ok()    { echo -e "\${GREEN}✓  $*\${NC}"; }
warn()  { echo -e "\${YELLOW}⚠  $*\${NC}"; }
err()   { echo -e "\${RED}✗  $*\${NC}" >&2; }

# ── Check git ───────────────────────────────────────────────────────────────
if ! command -v git &> /dev/null; then
  err "git is not installed. Please install git first."
  exit 1
fi

mkdir -p "$REPOS_DIR"

clone_or_update() {
  local name="$1" url="$2" branch="\${3:-}"
  local dir="$REPOS_DIR/$name"

  if [ -d "$dir/.git" ]; then
    info "Updating $name..."
    git -C "$dir" pull --ff-only 2>/dev/null || warn "Could not fast-forward $name (you may have local changes)"
  else
    info "Cloning $name..."
    if [ -n "$branch" ]; then
      git clone --depth 1 --branch "$branch" "$url" "$dir"
    else
      git clone --depth 1 "$url" "$dir"
    fi
  fi
}

echo ""
info "Cloning/updating SaaS boilerplate repositories..."
echo ""

${bashEntries}

echo ""
ok "All repositories ready."
`;

	// ── scripts/clone-repos.ps1 ────────────────────────────────────────────

	const psEntries = gitServices
		.map((s) => {
			const gs = s.definition.gitSource!;
			const branchArg = gs.branch ? ` -Branch "${gs.branch}"` : "";
			let block = `Clone-OrUpdate -Name "${s.definition.id}" -Url "${gs.repoUrl}"${branchArg}`;
			if (gs.postCloneCommands && gs.postCloneCommands.length > 0) {
				const subdir = gs.subdirectory ? `/${gs.subdirectory}` : "";
				const cmds = gs.postCloneCommands
					.map(
						(cmd) => `Push-Location "$ReposDir/${s.definition.id}${subdir}"; ${cmd}; Pop-Location`,
					)
					.join("\n");
				block += `\n${cmds}`;
			}
			return block;
		})
		.join("\n\n");

	files["scripts/clone-repos.ps1"] = `#Requires -Version 5.1
<#
.SYNOPSIS
  Clone/update git-based service repositories.
  Idempotent: clones if missing, pulls if already present.
#>
$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectDir = Split-Path -Parent $ScriptDir
$ReposDir = Join-Path $ProjectDir "repos"

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Error "git is not installed. Please install git first."
    exit 1
}

if (-not (Test-Path $ReposDir)) { New-Item -ItemType Directory -Path $ReposDir -Force | Out-Null }

function Clone-OrUpdate {
    param(
        [string]$Name,
        [string]$Url,
        [string]$Branch = ""
    )
    $dir = Join-Path $ReposDir $Name

    if (Test-Path (Join-Path $dir ".git")) {
        Write-Host "  Updating $Name..." -ForegroundColor Cyan
        git -C $dir pull --ff-only 2>$null
        if ($LASTEXITCODE -ne 0) { Write-Warning "Could not fast-forward $Name" }
    } else {
        Write-Host "  Cloning $Name..." -ForegroundColor Cyan
        if ($Branch) {
            git clone --depth 1 --branch $Branch $Url $dir
        } else {
            git clone --depth 1 $Url $dir
        }
    }
}

Write-Host ""
Write-Host "Cloning/updating SaaS boilerplate repositories..." -ForegroundColor Cyan
Write-Host ""

${psEntries}

Write-Host ""
Write-Host "All repositories ready." -ForegroundColor Green
`;

	return files;
}
