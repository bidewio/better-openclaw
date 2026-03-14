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

export {
	getAllFrameworks,
	getCompanionFrameworks,
	getFrameworkById,
	getPrimaryFrameworks,
	registerFramework,
} from "./registry.js";

export { openclawFramework } from "./openclaw.js";
export { copawFramework } from "./copaw.js";
export { nanoclawFramework } from "./nanoclaw.js";
export { nanobotFramework } from "./nanobot.js";
export { zeroclawFramework } from "./zeroclaw.js";
export { memuFramework } from "./memu.js";
export { claudeCodeFramework } from "./claude-code-fw.js";
export { codexFramework } from "./codex-fw.js";

// ── Auto-register built-in frameworks ───────────────────────────────────────

import { registerFramework } from "./registry.js";
import { openclawFramework } from "./openclaw.js";
import { copawFramework } from "./copaw.js";
import { nanoclawFramework } from "./nanoclaw.js";
import { nanobotFramework } from "./nanobot.js";
import { zeroclawFramework } from "./zeroclaw.js";
import { memuFramework } from "./memu.js";
import { claudeCodeFramework } from "./claude-code-fw.js";
import { codexFramework } from "./codex-fw.js";

registerFramework(openclawFramework);
registerFramework(copawFramework);
registerFramework(nanoclawFramework);
registerFramework(nanobotFramework);
registerFramework(zeroclawFramework);
registerFramework(memuFramework);
registerFramework(claudeCodeFramework);
registerFramework(codexFramework);
