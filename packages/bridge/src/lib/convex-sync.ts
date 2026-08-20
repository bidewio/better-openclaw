import type { HeartbeatPayload } from "../heartbeat/heartbeat.js";

/**
 * Convex sync client for the bridge.
 *
 * Uses HTTP calls to the Convex backend to update fleet instance status
 * and relay task commands. This avoids importing the full Convex client
 * and its generated API types — the bridge calls Convex HTTP actions directly.
 */
export class ConvexSyncClient {
	private convexUrl: string;
	private fleetInstanceId: string | undefined;
	private bridgeToken: string | undefined;

	constructor(options: {
		convexUrl: string;
		fleetInstanceId?: string;
		bridgeToken?: string;
	}) {
		this.convexUrl = options.convexUrl.replace(/\/$/, "");
		this.fleetInstanceId = options.fleetInstanceId;
		this.bridgeToken = options.bridgeToken;
	}

	get configured(): boolean {
		return Boolean(this.convexUrl && this.fleetInstanceId);
	}

	private authHeaders(): Record<string, string> {
		const headers: Record<string, string> = {
			"Content-Type": "application/json",
		};
		if (this.bridgeToken) {
			headers.Authorization = `Bearer ${this.bridgeToken}`;
		}
		return headers;
	}

	/**
	 * Push heartbeat status to Convex via the HTTP action endpoint.
	 * Calls the fleet.updateInstanceStatus mutation through an HTTP action.
	 */
	async pushHeartbeat(payload: HeartbeatPayload): Promise<void> {
		if (!this.fleetInstanceId) return;

		await fetch(`${this.convexUrl}/bridge/heartbeat`, {
			method: "POST",
			headers: this.authHeaders(),
			body: JSON.stringify({
				instanceId: this.fleetInstanceId,
				...payload,
			}),
		});
	}

	/** Approve a task by relaying to Convex. */
	async approveTask(taskId: string): Promise<void> {
		await fetch(`${this.convexUrl}/bridge/task-approve`, {
			method: "POST",
			headers: this.authHeaders(),
			body: JSON.stringify({ taskId }),
		});
	}

	/** Dispatch a new task by relaying to Convex. */
	async dispatchTask(title: string, description?: string): Promise<string> {
		const resp = await fetch(`${this.convexUrl}/bridge/task-dispatch`, {
			method: "POST",
			headers: this.authHeaders(),
			body: JSON.stringify({
				instanceId: this.fleetInstanceId,
				title,
				description,
			}),
		});
		const data = (await resp.json()) as { taskId: string };
		return data.taskId;
	}
}
