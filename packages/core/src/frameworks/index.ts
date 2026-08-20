export { claudeCodeFramework } from "./claude-code-fw.js";
export { codexFramework } from "./codex-fw.js";
export { copawFramework } from "./copaw.js";
export { hermesFramework } from "./hermes.js";
export { memuFramework } from "./memu.js";
export { nanobotFramework } from "./nanobot.js";
export { nanoclawFramework } from "./nanoclaw.js";
export { openclawFramework } from "./openclaw.js";
export {
	getAllFrameworks,
	getCompanionFrameworks,
	getFrameworkById,
	getPrimaryFrameworks,
	registerFramework,
} from "./registry.js";
export type {
	AgentFrameworkDefinition,
	AgentFrameworkId,
	EnvLine,
	FrameworkComposeOptions,
	FrameworkConfigOptions,
	FrameworkConfigResult,
	FrameworkEnvOptions,
	GatewayBuildResult,
} from "./types.js";
export { zeroclawFramework } from "./zeroclaw.js";

// ── Auto-register built-in frameworks ───────────────────────────────────────

import { claudeCodeFramework } from "./claude-code-fw.js";
import { codexFramework } from "./codex-fw.js";
import { copawFramework } from "./copaw.js";
import { hermesFramework } from "./hermes.js";
import { memuFramework } from "./memu.js";
import { nanobotFramework } from "./nanobot.js";
import { nanoclawFramework } from "./nanoclaw.js";
import { openclawFramework } from "./openclaw.js";
import { registerFramework } from "./registry.js";
import { zeroclawFramework } from "./zeroclaw.js";

registerFramework(openclawFramework);
registerFramework(copawFramework);
registerFramework(nanoclawFramework);
registerFramework(nanobotFramework);
registerFramework(zeroclawFramework);
registerFramework(memuFramework);
registerFramework(claudeCodeFramework);
registerFramework(codexFramework);
registerFramework(hermesFramework);
