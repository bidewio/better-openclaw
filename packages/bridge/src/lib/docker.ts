import Docker from "dockerode";

export interface ContainerInfo {
	id: string;
	serviceId: string;
	name: string;
	state: string;
	status: string;
	image: string;
	ports: Array<{ host?: number; container: number; protocol: string }>;
	health: "healthy" | "unhealthy" | "starting" | "none";
}

export interface ContainerDetail extends ContainerInfo {
	created: string;
	startedAt: string;
	env: string[];
	labels: Record<string, string>;
	mounts: Array<{ source: string; destination: string; mode: string }>;
	networkNames: string[];
}

export interface ContainerStats {
	cpuPercent: number;
	memoryUsageMB: number;
	memoryLimitMB: number;
	memoryPercent: number;
	networkRxMB: number;
	networkTxMB: number;
}

function parseHealth(status: string): ContainerInfo["health"] {
	if (status.includes("(healthy)")) return "healthy";
	if (status.includes("(unhealthy)")) return "unhealthy";
	if (status.includes("(health: starting)")) return "starting";
	return "none";
}

function mapPorts(ports: Docker.Port[]): ContainerInfo["ports"] {
	return ports.map((p) => ({
		host: p.PublicPort,
		container: p.PrivatePort,
		protocol: p.Type,
	}));
}

export class DockerClient {
	private docker: Docker;

	constructor(socketPath = "/var/run/docker.sock") {
		this.docker = new Docker({ socketPath });
	}

	/** Check Docker engine connectivity. */
	async ping(): Promise<boolean> {
		try {
			await this.docker.ping();
			return true;
		} catch {
			return false;
		}
	}

	/** Get Docker engine info (version, containers, images). */
	async info(): Promise<{
		version: string;
		containers: number;
		containersRunning: number;
		images: number;
	}> {
		const info = await this.docker.info();
		return {
			version: info.ServerVersion,
			containers: info.Containers,
			containersRunning: info.ContainersRunning,
			images: info.Images,
		};
	}

	/** List all containers belonging to a Docker Compose project. */
	async listProjectContainers(projectName: string): Promise<ContainerInfo[]> {
		const containers = await this.docker.listContainers({
			all: true,
			filters: {
				label: [`com.docker.compose.project=${projectName}`],
			},
		});

		return containers.map((c) => ({
			id: c.Id,
			serviceId: c.Labels["com.docker.compose.service"] ?? "unknown",
			name: c.Names[0]?.replace(/^\//, "") ?? c.Id.slice(0, 12),
			state: c.State,
			status: c.Status,
			image: c.Image,
			ports: mapPorts(c.Ports),
			health: parseHealth(c.Status),
		}));
	}

	/** Inspect a single container by ID or name. */
	async inspectContainer(idOrName: string): Promise<ContainerDetail> {
		const container = this.docker.getContainer(idOrName);
		const info = await container.inspect();

		return {
			id: info.Id,
			serviceId: info.Config.Labels["com.docker.compose.service"] ?? "unknown",
			name: info.Name.replace(/^\//, ""),
			state: info.State.Status,
			status: info.State.Running
				? `Up since ${info.State.StartedAt}`
				: `Exited (${info.State.ExitCode})`,
			image: info.Config.Image,
			ports: Object.entries(info.NetworkSettings.Ports ?? {}).flatMap(([key, bindings]) => {
				const [portStr, protocol] = key.split("/");
				return (bindings ?? []).map((b) => ({
					host: b.HostPort ? Number(b.HostPort) : undefined,
					container: Number(portStr),
					protocol: protocol ?? "tcp",
				}));
			}),
			health:
				info.State.Health?.Status === "healthy"
					? "healthy"
					: info.State.Health?.Status === "unhealthy"
						? "unhealthy"
						: info.State.Health?.Status === "starting"
							? "starting"
							: "none",
			created: info.Created,
			startedAt: info.State.StartedAt,
			env: info.Config.Env ?? [],
			labels: info.Config.Labels ?? {},
			mounts: (info.Mounts ?? []).map((m) => ({
				source: m.Source ?? "",
				destination: m.Destination,
				mode: m.Mode ?? "rw",
			})),
			networkNames: Object.keys(info.NetworkSettings.Networks ?? {}),
		};
	}

	/** Get container logs (tailed). */
	async getContainerLogs(
		idOrName: string,
		options?: { tail?: number; since?: number },
	): Promise<string> {
		const container = this.docker.getContainer(idOrName);
		const logs = await container.logs({
			stdout: true,
			stderr: true,
			tail: options?.tail ?? 100,
			since: options?.since,
			timestamps: true,
		});

		// Dockerode returns a Buffer; demux the stream header bytes
		return typeof logs === "string" ? logs : demuxDockerLogs(logs);
	}

	/** Get one-shot container stats. */
	async getContainerStats(idOrName: string): Promise<ContainerStats> {
		const container = this.docker.getContainer(idOrName);
		const stats = (await container.stats({ stream: false })) as Docker.ContainerStats;

		const cpuDelta =
			stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
		const systemDelta = stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
		const cpuCount = stats.cpu_stats.online_cpus ?? 1;
		const cpuPercent = systemDelta > 0 ? (cpuDelta / systemDelta) * cpuCount * 100 : 0;

		const memUsage = stats.memory_stats.usage ?? 0;
		const memLimit = stats.memory_stats.limit ?? 1;

		let networkRx = 0;
		let networkTx = 0;
		if (stats.networks) {
			for (const iface of Object.values(stats.networks)) {
				networkRx += iface.rx_bytes;
				networkTx += iface.tx_bytes;
			}
		}

		return {
			cpuPercent: Math.round(cpuPercent * 100) / 100,
			memoryUsageMB: Math.round((memUsage / 1024 / 1024) * 100) / 100,
			memoryLimitMB: Math.round((memLimit / 1024 / 1024) * 100) / 100,
			memoryPercent: Math.round((memUsage / memLimit) * 100 * 100) / 100,
			networkRxMB: Math.round((networkRx / 1024 / 1024) * 100) / 100,
			networkTxMB: Math.round((networkTx / 1024 / 1024) * 100) / 100,
		};
	}

	/** Restart a container. */
	async restartContainer(idOrName: string): Promise<void> {
		await this.docker.getContainer(idOrName).restart();
	}

	/** Stop a container. */
	async stopContainer(idOrName: string): Promise<void> {
		await this.docker.getContainer(idOrName).stop();
	}

	/** Start a container. */
	async startContainer(idOrName: string): Promise<void> {
		await this.docker.getContainer(idOrName).start();
	}

	/** Prune stopped containers and dangling images. */
	async prune(): Promise<{
		containersDeleted: number;
		spaceReclaimedMB: number;
	}> {
		const containerResult = await this.docker.pruneContainers();
		const imageResult = await this.docker.pruneImages();

		const containerSpace = containerResult.SpaceReclaimed ?? 0;
		const imageSpace = imageResult.SpaceReclaimed ?? 0;

		return {
			containersDeleted: containerResult.ContainersDeleted?.length ?? 0,
			spaceReclaimedMB: Math.round(((containerSpace + imageSpace) / 1024 / 1024) * 100) / 100,
		};
	}

	/** Find a container ID by compose service name within a project. */
	async findContainerByService(projectName: string, serviceId: string): Promise<string | null> {
		const containers = await this.docker.listContainers({
			all: true,
			filters: {
				label: [
					`com.docker.compose.project=${projectName}`,
					`com.docker.compose.service=${serviceId}`,
				],
			},
		});
		return containers[0]?.Id ?? null;
	}
}

/**
 * Demux Docker log stream output.
 * Docker multiplexes stdout/stderr with 8-byte headers.
 */
function demuxDockerLogs(buffer: Buffer): string {
	const lines: string[] = [];
	let offset = 0;

	while (offset < buffer.length) {
		if (offset + 8 > buffer.length) break;
		const size = buffer.readUInt32BE(offset + 4);
		offset += 8;
		if (offset + size > buffer.length) break;
		lines.push(buffer.subarray(offset, offset + size).toString("utf-8"));
		offset += size;
	}

	return lines.join("");
}
