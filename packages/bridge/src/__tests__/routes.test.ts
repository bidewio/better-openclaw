import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { healthRoutes } from "../../src/routes/health.js";
import { configRoutes } from "../../src/routes/config.js";
import { taskRoutes } from "../../src/routes/tasks.js";
import type { DockerClient } from "../../src/lib/docker.js";

// ─── Health Route Tests ─────────────────────────────────────────────────

function createMockDocker(overrides: Partial<DockerClient> = {}): DockerClient {
	return {
		ping: vi.fn().mockResolvedValue(true),
		info: vi.fn().mockResolvedValue({
			version: "27.0.0",
			containers: 5,
			containersRunning: 3,
			images: 10,
		}),
		listProjectContainers: vi.fn().mockResolvedValue([]),
		inspectContainer: vi.fn().mockResolvedValue({}),
		getContainerLogs: vi.fn().mockResolvedValue(""),
		getContainerStats: vi.fn().mockResolvedValue({}),
		restartContainer: vi.fn().mockResolvedValue(undefined),
		stopContainer: vi.fn().mockResolvedValue(undefined),
		startContainer: vi.fn().mockResolvedValue(undefined),
		prune: vi.fn().mockResolvedValue({ containersDeleted: 0, spaceReclaimedMB: 0 }),
		findContainerByService: vi.fn().mockResolvedValue(null),
		...overrides,
	} as unknown as DockerClient;
}

describe("GET /health", () => {
	it("returns ok when Docker is reachable", async () => {
		const docker = createMockDocker();
		const app = new Hono();
		app.route("/", healthRoutes(docker));

		const res = await app.request("/health");
		expect(res.status).toBe(200);

		const body = await res.json();
		expect(body.status).toBe("ok");
		expect(body.docker.connected).toBe(true);
		expect(body.docker.version).toBe("27.0.0");
	});

	it("returns degraded when Docker is unreachable", async () => {
		const docker = createMockDocker({ ping: vi.fn().mockResolvedValue(false) });
		const app = new Hono();
		app.route("/", healthRoutes(docker));

		const res = await app.request("/health");
		expect(res.status).toBe(503);

		const body = await res.json();
		expect(body.status).toBe("degraded");
		expect(body.docker).toBe("unreachable");
	});
});

// ─── Task Route Tests ───────────────────────────────────────────────────

describe("Task routes", () => {
	it("returns 501 when convex sync is not configured", async () => {
		const app = new Hono();
		app.route("/", taskRoutes(null));

		const res = await app.request("/tasks/approve", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ taskId: "abc123" }),
		});

		expect(res.status).toBe(501);
		const body = await res.json();
		expect(body.error.code).toBe("NOT_CONFIGURED");
	});

	it("approves a task when convex sync is configured", async () => {
		const mockApprove = vi.fn().mockResolvedValue(undefined);
		const app = new Hono();
		app.route(
			"/",
			taskRoutes({
				approveTask: mockApprove,
				dispatchTask: vi.fn().mockResolvedValue("task-id"),
			}),
		);

		const res = await app.request("/tasks/approve", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ taskId: "abc123" }),
		});

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.ok).toBe(true);
		expect(mockApprove).toHaveBeenCalledWith("abc123");
	});

	it("dispatches a task when convex sync is configured", async () => {
		const mockDispatch = vi.fn().mockResolvedValue("new-task-id");
		const app = new Hono();
		app.route(
			"/",
			taskRoutes({
				approveTask: vi.fn(),
				dispatchTask: mockDispatch,
			}),
		);

		const res = await app.request("/tasks/dispatch", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				title: "Review PR",
				description: "Check the latest PR",
			}),
		});

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.ok).toBe(true);
		expect(body.taskId).toBe("new-task-id");
		expect(mockDispatch).toHaveBeenCalledWith("Review PR", "Check the latest PR");
	});

	it("rejects invalid approve payload", async () => {
		const app = new Hono();
		app.route(
			"/",
			taskRoutes({
				approveTask: vi.fn(),
				dispatchTask: vi.fn().mockResolvedValue("id"),
			}),
		);

		const res = await app.request("/tasks/approve", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({}),
		});

		expect(res.status).toBe(400);
	});
});
