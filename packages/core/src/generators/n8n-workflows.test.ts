import { describe, expect, it } from "vitest";
import type { ResolverOutput } from "../types.js";
import { generateN8nWorkflows } from "./n8n-workflows.js";

function parseWorkflow(files: Record<string, string>) {
	const content = files["n8n/workflows/openclaw-webhook-handler.json"];
	if (!content) {
		throw new Error("Missing n8n workflow file");
	}
	return JSON.parse(content);
}

function makeResolved(serviceIds: string[]): ResolverOutput {
	return {
		services: serviceIds.map((id) => ({
			definition: {
				id,
				name: id.charAt(0).toUpperCase() + id.slice(1),
				description: "",
				icon: "",
				category: "test",
				image: `${id}:latest`,
				ports: [],
				volumes: [],
				environment: [],
				dependencies: [],
				conflicts: [],
				skills: [],
				memoryMB: 256,
				docsUrl: "",
			},
			addedBy: "user" as const,
		})),
		addedDependencies: [],
		estimatedMemoryMB: 512,
	} as unknown as ResolverOutput;
}

describe("generateN8nWorkflows", () => {
	it("returns empty object when n8n is not in the stack", () => {
		const result = generateN8nWorkflows(makeResolved(["redis", "postgresql"]));
		expect(Object.keys(result)).toHaveLength(0);
	});

	it("generates workflow file when n8n is present", () => {
		const result = generateN8nWorkflows(makeResolved(["n8n", "redis"]));
		expect(result).toHaveProperty("n8n/workflows/openclaw-webhook-handler.json");
	});

	it("generates valid JSON workflow", () => {
		const result = generateN8nWorkflows(makeResolved(["n8n"]));
		const workflow = parseWorkflow(result);
		expect(workflow).toBeDefined();
		expect(workflow.name).toBe("OpenClaw Webhook Handler");
	});

	it("workflow has three nodes (webhook, process, respond)", () => {
		const result = generateN8nWorkflows(makeResolved(["n8n", "redis"]));
		const workflow = parseWorkflow(result);
		expect(workflow.nodes).toHaveLength(3);

		const types = workflow.nodes.map((n: { type: string }) => n.type);
		expect(types).toContain("n8n-nodes-base.webhook");
		expect(types).toContain("n8n-nodes-base.code");
		expect(types).toContain("n8n-nodes-base.respondToWebhook");
	});

	it("workflow has correct connections", () => {
		const result = generateN8nWorkflows(makeResolved(["n8n"]));
		const workflow = parseWorkflow(result);
		expect(workflow.connections).toHaveProperty("Webhook");
		expect(workflow.connections).toHaveProperty("Process Payload");
	});

	it("workflow is not active by default", () => {
		const result = generateN8nWorkflows(makeResolved(["n8n"]));
		const workflow = parseWorkflow(result);
		expect(workflow.active).toBe(false);
	});

	it("includes service names in the code node comment", () => {
		const result = generateN8nWorkflows(makeResolved(["n8n", "redis", "postgresql"]));
		const workflow = parseWorkflow(result);
		const codeNode = workflow.nodes.find((n: { type: string }) => n.type === "n8n-nodes-base.code");
		expect(codeNode.parameters.jsCode).toContain("Redis");
		expect(codeNode.parameters.jsCode).toContain("Postgresql");
	});
});
