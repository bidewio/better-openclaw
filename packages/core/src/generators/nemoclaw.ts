import type { GeneratedFiles } from "../types.js";

export interface NemoClawOptions {
	projectName: string;
	gatewayPort?: number;
	model?: string;
	contextWindow?: number;
}

/**
 * Generate NemoClaw deploy-target files:
 * - Sandbox isolation policy (OpenShell runtime)
 * - Inference routing profile (NVIDIA Nemotron)
 * - Automated setup script
 */
export function generateNemoClaw(options: NemoClawOptions): GeneratedFiles {
	const {
		projectName,
		gatewayPort = 18789,
		model = "nvidia/nemotron-3-super-120b-a12b",
		contextWindow = 131072,
	} = options;

	const files: GeneratedFiles = {};

	files["nemoclaw-blueprint/policies/openclaw-sandbox.yaml"] = generateSandboxPolicy();
	files["nemoclaw-blueprint/inference.yaml"] = generateInferenceProfile(model, contextWindow);
	files["scripts/nemoclaw-setup.sh"] = generateSetupScript(projectName, gatewayPort);

	return files;
}

function generateSandboxPolicy(): string {
	return `# NemoClaw Sandbox Isolation Policy
# OpenShell runtime with Landlock + seccomp + network namespace isolation
# Docs: https://github.com/NVIDIA/NemoClaw

apiVersion: nemoclaw/v1alpha1
kind: SandboxPolicy
metadata:
  name: openclaw-sandbox
  description: Security-hardened OpenClaw agent sandbox

spec:
  runtime: openshell

  # ── Kernel-level isolation ────────────────────────────────────────────────
  isolation:
    landlock:
      enabled: true
      ruleset: strict
    seccomp:
      profile: strict
      # Allow only essential syscalls for Node.js runtime
      allowedSyscalls:
        - read
        - write
        - open
        - close
        - stat
        - fstat
        - mmap
        - mprotect
        - munmap
        - brk
        - ioctl
        - access
        - pipe
        - clone
        - execve
        - wait4
        - fcntl
        - getdents64
        - socket
        - connect
        - sendto
        - recvfrom
        - epoll_create1
        - epoll_ctl
        - epoll_wait
        - eventfd2
        - futex
    networkNamespace:
      enabled: true

  # ── Filesystem confinement ────────────────────────────────────────────────
  filesystem:
    readOnly: true
    writablePaths:
      - /sandbox
      - /tmp
    deniedPaths:
      - /etc/shadow
      - /etc/passwd
      - /root
      - /home

  # ── Network egress filtering ──────────────────────────────────────────────
  network:
    egress:
      defaultPolicy: deny
      allowlist:
        - host: integrate.api.nvidia.com
          port: 443
          protocol: tcp
          description: NVIDIA Inference API
        - host: build.nvidia.com
          port: 443
          protocol: tcp
          description: NVIDIA Build API
        - host: registry.npmjs.org
          port: 443
          protocol: tcp
          description: npm registry (skill installation)

  # ── Resource limits ───────────────────────────────────────────────────────
  resources:
    memory: 512m
    pids: 256
    cpuShares: 512
    capabilities:
      drop:
        - ALL
`;
}

function generateInferenceProfile(model: string, contextWindow: number): string {
	return `# NemoClaw Inference Routing Profile
# Routes LLM requests through NVIDIA Endpoint API
# Docs: https://github.com/NVIDIA/NemoClaw

apiVersion: nemoclaw/v1alpha1
kind: InferenceProfile
metadata:
  name: nvidia-nemotron
  description: NVIDIA Nemotron inference routing for OpenClaw

spec:
  # ── Primary provider ──────────────────────────────────────────────────────
  provider:
    name: nvidia
    endpoint: https://integrate.api.nvidia.com/v1
    auth:
      type: api-key
      envVar: NVIDIA_API_KEY

  # ── Default model ─────────────────────────────────────────────────────────
  model:
    id: "${model}"
    contextWindow: ${contextWindow}
    maxOutputTokens: 8192

  # ── Request configuration ─────────────────────────────────────────────────
  request:
    timeout: 120s
    retries: 3
    retryBackoff: exponential

  # ── Fallback (disabled by default) ────────────────────────────────────────
  fallback:
    enabled: false
    provider:
      name: ollama
      endpoint: http://localhost:11434/v1
    model:
      id: llama3.1:8b
      contextWindow: 8192
`;
}

function generateSetupScript(projectName: string, gatewayPort: number): string {
	return `#!/usr/bin/env bash
set -euo pipefail

# ═══════════════════════════════════════════════════════════════════════════════
# NemoClaw Setup Script — ${projectName}
# Automated setup for NVIDIA NemoClaw (security-hardened OpenClaw)
# ═══════════════════════════════════════════════════════════════════════════════

GATEWAY_PORT="${gatewayPort}"
HEALTH_TIMEOUT=120

# Colors
RED='\\033[0;31m'
GREEN='\\033[0;32m'
YELLOW='\\033[1;33m'
CYAN='\\033[0;36m'
NC='\\033[0m'

info()  { echo -e "\${CYAN}[INFO]\${NC}  $1"; }
ok()    { echo -e "\${GREEN}[OK]\${NC}    $1"; }
warn()  { echo -e "\${YELLOW}[WARN]\${NC}  $1"; }
error() { echo -e "\${RED}[ERROR]\${NC} $1"; exit 1; }

# ── Prerequisite checks ────────────────────────────────────────────────────

info "Checking prerequisites..."

# Node.js 20+
if ! command -v node &> /dev/null; then
  error "Node.js is required. Install from https://nodejs.org/"
fi
NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
  error "Node.js 20+ required (found v$(node -v))"
fi
ok "Node.js $(node -v)"

# Docker
if ! command -v docker &> /dev/null; then
  error "Docker is required. Install from https://docs.docker.com/get-docker/"
fi
if ! docker info &> /dev/null; then
  error "Docker daemon is not running"
fi
ok "Docker $(docker --version | awk '{print $3}' | tr -d ',')"

# RAM check (warn if < 8GB)
if command -v free &> /dev/null; then
  TOTAL_RAM_MB=$(free -m | awk '/Mem:/{print $2}')
  if [ "$TOTAL_RAM_MB" -lt 8000 ]; then
    warn "Less than 8GB RAM detected ($TOTAL_RAM_MB MB). NemoClaw may require more."
  else
    ok "RAM: \${TOTAL_RAM_MB}MB"
  fi
fi

# NVIDIA_API_KEY
if [ -z "\${NVIDIA_API_KEY:-}" ]; then
  error "NVIDIA_API_KEY is not set. Get one at https://build.nvidia.com/"
fi
ok "NVIDIA_API_KEY is set"

# ── Install NemoClaw CLI ────────────────────────────────────────────────────

info "Installing NemoClaw CLI..."
if command -v nemoclaw &> /dev/null; then
  ok "NemoClaw CLI already installed ($(nemoclaw --version 2>/dev/null || echo 'unknown'))"
else
  npm install -g @nvidia/nemoclaw
  ok "NemoClaw CLI installed"
fi

# ── Onboard ─────────────────────────────────────────────────────────────────

info "Running NemoClaw onboard..."
nemoclaw onboard --blueprint ./nemoclaw-blueprint
ok "NemoClaw onboarded"

# ── Start Docker Compose stack ──────────────────────────────────────────────

info "Starting Docker Compose stack..."
docker compose up -d
ok "Docker Compose stack started"

# ── Health check ────────────────────────────────────────────────────────────

info "Waiting for gateway to become healthy (timeout: \${HEALTH_TIMEOUT}s)..."
ELAPSED=0
while [ "$ELAPSED" -lt "$HEALTH_TIMEOUT" ]; do
  if curl -sf "http://127.0.0.1:\${GATEWAY_PORT}/healthz" > /dev/null 2>&1; then
    ok "Gateway is healthy at http://127.0.0.1:\${GATEWAY_PORT}"
    break
  fi
  sleep 2
  ELAPSED=$((ELAPSED + 2))
done

if [ "$ELAPSED" -ge "$HEALTH_TIMEOUT" ]; then
  warn "Gateway health check timed out after \${HEALTH_TIMEOUT}s"
  warn "Check logs: docker compose logs openclaw-gateway"
fi

# ── Status ──────────────────────────────────────────────────────────────────

echo ""
echo -e "\${GREEN}═══════════════════════════════════════════════════════════════\${NC}"
echo -e "\${GREEN}  NemoClaw setup complete — ${projectName}\${NC}"
echo -e "\${GREEN}═══════════════════════════════════════════════════════════════\${NC}"
echo ""
echo "  Gateway:  http://127.0.0.1:\${GATEWAY_PORT}"
echo "  Status:   nemoclaw status"
echo "  Logs:     docker compose logs -f openclaw-gateway"
echo "  Connect:  nemoclaw connect"
echo "  Destroy:  nemoclaw destroy"
echo ""
`;
}
