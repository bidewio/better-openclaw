import type { ServiceDefinition } from "../../types.js";

export const desktopEnvironmentDefinition: ServiceDefinition = {
	id: "desktop-environment",
	name: "Desktop Environment",
	description:
		"Isolated KasmVNC-based Linux desktop that gives AI agents full computer-use capabilities — screen vision, mouse/keyboard control, file management, and application launching (VS Code, Chrome, Firefox). OBS Studio is pre-installed for optional recording or live-streaming.",
	category: "desktop",
	icon: "🖥️",

	image: "kasmweb/core-ubuntu-jammy",
	imageTag: "1.18.0",
	ports: [
		{
			host: 6901,
			container: 6901,
			description: "KasmVNC web interface (browser-based desktop access)",
			exposed: true,
			websocket: true,
		},
		{
			host: 5900,
			container: 5900,
			description: "VNC protocol port (native VNC clients)",
			exposed: false,
		},
		{
			host: 4455,
			container: 4455,
			description: "OBS WebSocket control port (when OBS is running)",
			exposed: false,
		},
	],
	volumes: [
		{
			name: "desktop-config",
			containerPath: "/home/kasm-user",
			description: "Desktop user home with config persistence",
		},
		{
			name: "desktop-workspace",
			containerPath: "/home/kasm-user/workspace",
			description: "Shared workspace directory for files and projects",
		},
	],
	environment: [
		{
			key: "VNC_PW",
			defaultValue: "changeme",
			secret: true,
			description: "Password for VNC / KasmVNC web access",
			required: true,
		},
		{
			key: "VNC_RESOLUTION",
			defaultValue: "1920x1080",
			secret: false,
			description: "Desktop screen resolution (WidthxHeight)",
			required: false,
		},
		{
			key: "SSL_VNC_ONLY",
			defaultValue: "false",
			secret: false,
			description:
				"When false, allows HTTP/WS connections without SSL (useful for local/Docker networking)",
			required: false,
		},
		{
			key: "OBS_WS_PORT",
			defaultValue: "4455",
			secret: false,
			description: "OBS WebSocket port (used when OBS is launched manually)",
			required: false,
		},
		{
			key: "OBS_PASSWORD",
			defaultValue: "changeme",
			secret: true,
			description: "OBS WebSocket password (used when OBS is launched manually)",
			required: false,
		},
	],
	healthcheck: {
		test: "curl -sfk https://localhost:6901/ > /dev/null || curl -sf http://localhost:6901/ > /dev/null || exit 1",
		interval: "10s",
		timeout: "10s",
		retries: 6,
		startPeriod: "60s",
	},
	dependsOn: [],
	restartPolicy: "unless-stopped",
	networks: ["openclaw-network"],

	deploy: {
		resources: {
			limits: { cpus: "4.0", memory: "8G" },
			reservations: { cpus: "2.0", memory: "4G" },
		},
	},

	skills: [{ skillId: "desktop-use", autoInstall: true }],
	openclawEnvVars: [
		{
			key: "DESKTOP_HOST",
			defaultValue: "desktop-environment",
			secret: false,
			description: "Hostname of the desktop-environment container",
			required: true,
		},
		{
			key: "DESKTOP_VNC_PORT",
			defaultValue: "6901",
			secret: false,
			description: "KasmVNC web port",
			required: true,
		},
		{
			key: "DESKTOP_VNC_PASSWORD",
			defaultValue: "${VNC_PW}",
			secret: true,
			description: "VNC password (references service password)",
			required: true,
		},
	],

	docsUrl: "https://www.kasmweb.com/docs/latest/index.html",
	tags: ["computer-use", "vnc", "desktop", "screen-capture", "automation", "obs", "kasm"],
	maturity: "experimental",

	requires: [],
	recommends: ["stream-gateway"],
	conflictsWith: [],

	removalWarning:
		"⚠️ HEAVY RESOURCE USAGE: The desktop environment requires at least 4 GB RAM (8 GB recommended) and 2+ CPU cores. It runs a full Linux desktop with XFCE inside KasmVNC. OBS Studio is pre-installed but NOT auto-started — launch it manually or via agent tools when needed. Ensure your deployment target can handle these resources alongside other services.",
	minMemoryMB: 4096,
	gpuRequired: false,

	nativeSupported: true,
	nativeRecipes: [
		{
			platform: "linux",
			installSteps: [
				"command -v Xvfb >/dev/null 2>&1 || (command -v apt-get >/dev/null 2>&1 && sudo apt-get update -qq && sudo apt-get install -y -qq xvfb xfce4 xfce4-terminal tigervnc-standalone-server scrot xdotool xclip)",
				"command -v obs >/dev/null 2>&1 || (sudo add-apt-repository -y ppa:obsproject/obs-studio && sudo apt-get update -qq && sudo apt-get install -y -qq obs-studio)",
			],
			startCommand:
				"vncserver :1 -geometry 1920x1080 -depth 24 -localhost no 2>/dev/null || Xvfb :1 -screen 0 1920x1080x24 &",
			stopCommand: "vncserver -kill :1 2>/dev/null; killall Xvfb 2>/dev/null",
			configPath: "/etc/vnc/xstartup",
			configTemplate:
				"#!/bin/sh\n# Generated for OpenClaw bare-metal desktop\nexport DISPLAY=:1\nstartxfce4 &\n",
		},
	],
};
