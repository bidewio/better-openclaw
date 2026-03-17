import { describe, expect, it } from "vitest";
import { generateOpenclawInstallScript } from "./openclaw-install-script.js";

describe("generateOpenclawInstallScript", () => {
	it("generates both sh and ps1 scripts", () => {
		const files = generateOpenclawInstallScript({ projectName: "test-project" });
		expect(files).toHaveProperty("scripts/install-openclaw.sh");
		expect(files).toHaveProperty("scripts/install-openclaw.ps1");
	});

	it("sh script starts with shebang", () => {
		const files = generateOpenclawInstallScript({ projectName: "test" });
		expect(files["scripts/install-openclaw.sh"]).toMatch(/^#!/);
	});

	it("sh script uses set -euo pipefail", () => {
		const files = generateOpenclawInstallScript({ projectName: "test" });
		expect(files["scripts/install-openclaw.sh"]).toContain("set -euo pipefail");
	});

	it("includes project name in scripts", () => {
		const files = generateOpenclawInstallScript({ projectName: "my-project" });
		expect(files["scripts/install-openclaw.sh"]).toContain("my-project");
		expect(files["scripts/install-openclaw.ps1"]).toContain("my-project");
	});

	it("uses official installer URL", () => {
		const files = generateOpenclawInstallScript({ projectName: "test" });
		expect(files["scripts/install-openclaw.sh"]).toContain("openclaw.ai/install.sh");
	});

	it("ps1 script checks for WSL", () => {
		const files = generateOpenclawInstallScript({ projectName: "test" });
		expect(files["scripts/install-openclaw.ps1"]).toContain("wsl");
	});

	it("includes next steps in output", () => {
		const files = generateOpenclawInstallScript({ projectName: "test" });
		expect(files["scripts/install-openclaw.sh"]).toContain("Next steps");
		expect(files["scripts/install-openclaw.ps1"]).toContain("Next steps");
	});
});
