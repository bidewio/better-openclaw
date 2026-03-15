import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
	...authTables,
	agents: defineTable({
		name: v.string(),
		role: v.string(),
		status: v.union(v.literal("idle"), v.literal("active"), v.literal("blocked")),
		level: v.union(v.literal("LEAD"), v.literal("INT"), v.literal("SPC")),
		avatar: v.string(),
		currentTaskId: v.optional(v.id("tasks")),
		sessionKey: v.optional(v.string()),
		systemPrompt: v.optional(v.string()),
		character: v.optional(v.string()),
		lore: v.optional(v.string()),
		orgId: v.optional(v.string()),
		workspaceId: v.optional(v.string()),
		tenantId: v.optional(v.string()),
		updatedAt: v.optional(v.number()),
	}).index("by_tenant", ["tenantId"]),
	tasks: defineTable({
		title: v.string(),
		description: v.string(),
		status: v.union(
			v.literal("inbox"),
			v.literal("assigned"),
			v.literal("in_progress"),
			v.literal("review"),
			v.literal("done"),
			v.literal("archived"),
		),
		assigneeIds: v.array(v.id("agents")),
		tags: v.array(v.string()),
		borderColor: v.optional(v.string()),
		sessionKey: v.optional(v.string()),
		openclawRunId: v.optional(v.string()),
		startedAt: v.optional(v.number()),
		usedCodingTools: v.optional(v.boolean()),
		orgId: v.optional(v.string()),
		workspaceId: v.optional(v.string()),
		tenantId: v.optional(v.string()),
		updatedAt: v.optional(v.number()),
	}).index("by_tenant", ["tenantId"]),
	messages: defineTable({
		taskId: v.id("tasks"),
		fromAgentId: v.id("agents"),
		content: v.string(),
		attachments: v.array(v.id("documents")),
		orgId: v.optional(v.string()),
		workspaceId: v.optional(v.string()),
		tenantId: v.optional(v.string()),
		updatedAt: v.optional(v.number()),
	})
		.index("by_tenant", ["tenantId"])
		.index("by_tenant_task", ["tenantId", "taskId"]),
	activities: defineTable({
		type: v.string(),
		agentId: v.id("agents"),
		message: v.string(),
		targetId: v.optional(v.id("tasks")),
		orgId: v.optional(v.string()),
		workspaceId: v.optional(v.string()),
		tenantId: v.optional(v.string()),
	})
		.index("by_tenant", ["tenantId"])
		.index("by_tenant_target", ["tenantId", "targetId"]),
	documents: defineTable({
		title: v.string(),
		content: v.string(),
		type: v.string(),
		path: v.optional(v.string()),
		taskId: v.optional(v.id("tasks")),
		createdByAgentId: v.optional(v.id("agents")),
		messageId: v.optional(v.id("messages")),
		orgId: v.optional(v.string()),
		workspaceId: v.optional(v.string()),
		tenantId: v.optional(v.string()),
		updatedAt: v.optional(v.number()),
	})
		.index("by_tenant", ["tenantId"])
		.index("by_tenant_task", ["tenantId", "taskId"]),
	notifications: defineTable({
		mentionedAgentId: v.id("agents"),
		content: v.string(),
		delivered: v.boolean(),
		orgId: v.optional(v.string()),
		workspaceId: v.optional(v.string()),
		tenantId: v.optional(v.string()),
	}),
	apiTokens: defineTable({
		tokenHash: v.string(),
		tokenPrefix: v.string(),
		tenantId: v.optional(v.string()),
		orgId: v.optional(v.string()),
		name: v.optional(v.string()),
		createdAt: v.number(),
		lastUsedAt: v.optional(v.number()),
		revokedAt: v.optional(v.number()),
	})
		.index("by_tokenHash", ["tokenHash"])
		.index("by_tenant", ["tenantId"]),
	tenantSettings: defineTable({
		tenantId: v.string(),
		retentionDays: v.number(),
		onboardingCompletedAt: v.optional(v.number()),
		createdAt: v.number(),
		updatedAt: v.number(),
	}).index("by_tenant", ["tenantId"]),
	// ── Stack Management ────────────────────────────────────────────────────
	stacks: defineTable({
		projectName: v.string(),
		domain: v.optional(v.string()),
		deployment: v.optional(v.string()),
		deploymentType: v.optional(v.string()),
		platform: v.optional(v.string()),
		proxy: v.optional(v.string()),
		manifestVersion: v.string(),
		registeredAt: v.number(),
		tenantId: v.optional(v.string()),
	}).index("by_tenant", ["tenantId"]),
	stackServices: defineTable({
		stackId: v.id("stacks"),
		serviceId: v.string(),
		name: v.string(),
		category: v.string(),
		icon: v.string(),
		image: v.optional(v.string()),
		imageTag: v.optional(v.string()),
		gitRepoUrl: v.optional(v.string()),
		ports: v.array(
			v.object({
				container: v.number(),
				host: v.optional(v.number()),
				exposed: v.boolean(),
				description: v.string(),
			}),
		),
		docsUrl: v.optional(v.string()),
		addedBy: v.string(),
		dependencyOf: v.optional(v.string()),
		status: v.optional(v.string()),
		envOverrides: v.optional(v.string()),
		tenantId: v.optional(v.string()),
	})
		.index("by_tenant", ["tenantId"])
		.index("by_stack", ["stackId"]),
	stackSkills: defineTable({
		stackId: v.id("stacks"),
		skillId: v.string(),
		name: v.string(),
		path: v.string(),
		content: v.string(),
		serviceIds: v.array(v.string()),
		tenantId: v.optional(v.string()),
	})
		.index("by_tenant", ["tenantId"])
		.index("by_stack", ["stackId"]),
	rateLimits: defineTable({
		tenantId: v.optional(v.string()),
		orgId: v.optional(v.string()),
		windowStartMs: v.number(),
		count: v.number(),
	}).index("by_tenant", ["tenantId"]),
	// ── Agent Observability ─────────────────────────────────────────────────
	agentEvents: defineTable({
		agentId: v.id("agents"),
		taskId: v.optional(v.id("tasks")),
		eventType: v.string(), // "tool_call", "error", "completion", "token_usage"
		toolName: v.optional(v.string()),
		durationMs: v.optional(v.number()),
		inputTokens: v.optional(v.number()),
		outputTokens: v.optional(v.number()),
		costCents: v.optional(v.number()),
		errorMessage: v.optional(v.string()),
		metadata: v.optional(v.string()), // JSON blob
		tenantId: v.optional(v.string()),
	})
		.index("by_tenant", ["tenantId"])
		.index("by_agent", ["tenantId", "agentId"]),
	alertRules: defineTable({
		name: v.string(),
		condition: v.string(), // "error_rate > 10%", "cost > 500"
		threshold: v.number(),
		windowMinutes: v.number(),
		enabled: v.boolean(),
		lastTriggeredAt: v.optional(v.number()),
		tenantId: v.optional(v.string()),
	}).index("by_tenant", ["tenantId"]),
	// ── Fleet Management ────────────────────────────────────────────────────
	fleetInstances: defineTable({
		stackId: v.id("stacks"),
		label: v.string(),
		host: v.optional(v.string()), // IP or hostname
		status: v.string(), // "online", "offline", "degraded", "provisioning"
		lastHeartbeat: v.optional(v.number()),
		serviceStatuses: v.optional(v.string()), // JSON: Record<serviceId, status>
		configHash: v.optional(v.string()), // hash of current config for diff detection
		tenantId: v.optional(v.string()),
	})
		.index("by_tenant", ["tenantId"])
		.index("by_stack", ["tenantId", "stackId"]),
	// ── Compliance & Governance ─────────────────────────────────────────────
	auditLog: defineTable({
		action: v.string(), // "task.created", "agent.config_changed", "stack.deployed"
		actorType: v.string(), // "agent", "user", "system"
		actorId: v.string(),
		actorName: v.string(),
		resourceType: v.string(), // "task", "agent", "stack", "document"
		resourceId: v.optional(v.string()),
		details: v.optional(v.string()), // JSON blob with diff/context
		ipAddress: v.optional(v.string()),
		piiDetected: v.optional(v.boolean()),
		piiFields: v.optional(v.array(v.string())), // ["email", "phone", etc.]
		tenantId: v.optional(v.string()),
	})
		.index("by_tenant", ["tenantId"])
		.index("by_resource", ["tenantId", "resourceType"]),
	// ── Claude Code Sessions ──────────────────────────────────────────────
	claudeSessions: defineTable({
		sessionId: v.string(),
		projectSlug: v.string(),
		projectPath: v.optional(v.string()),
		model: v.optional(v.string()),
		gitBranch: v.optional(v.string()),
		userMessages: v.number(),
		assistantMessages: v.number(),
		toolUses: v.number(),
		inputTokens: v.number(),
		outputTokens: v.number(),
		estimatedCost: v.number(),
		firstMessageAt: v.optional(v.string()),
		lastMessageAt: v.optional(v.string()),
		lastUserPrompt: v.optional(v.string()),
		isActive: v.boolean(),
		scannedAt: v.number(),
		tenantId: v.optional(v.string()),
	})
		.index("by_tenant", ["tenantId"])
		.index("by_session", ["tenantId", "sessionId"]),
	// ── Sandbox Desktop Sessions ─────────────────────────────────────────
	sandboxSessions: defineTable({
		sandboxId: v.string(),
		novncUrl: v.string(),
		vncEndpoint: v.optional(v.string()),
		devtoolsUrl: v.optional(v.string()),
		image: v.string(),
		resolution: v.optional(v.string()),
		status: v.union(
			v.literal("creating"),
			v.literal("running"),
			v.literal("terminated"),
			v.literal("error"),
		),
		taskId: v.optional(v.id("tasks")),
		agentId: v.optional(v.id("agents")),
		errorMessage: v.optional(v.string()),
		tenantId: v.optional(v.string()),
		terminatedAt: v.optional(v.number()),
	})
		.index("by_tenant", ["tenantId"])
		.index("by_tenant_status", ["tenantId", "status"])
		.index("by_tenant_task", ["tenantId", "taskId"])
		.index("by_sandbox", ["tenantId", "sandboxId"]),
	// ── Chat System ───────────────────────────────────────────────────────
	chatMessages: defineTable({
		conversationId: v.string(),
		fromAgentId: v.optional(v.id("agents")),
		fromUser: v.optional(v.string()), // for human/system messages
		toAgentId: v.optional(v.id("agents")),
		content: v.string(),
		messageType: v.union(
			v.literal("text"),
			v.literal("system"),
			v.literal("handoff"),
			v.literal("command"),
		),
		readAt: v.optional(v.number()),
		metadata: v.optional(v.string()), // JSON blob
		tenantId: v.optional(v.string()),
	})
		.index("by_tenant", ["tenantId"])
		.index("by_conversation", ["tenantId", "conversationId"]),
	// ── Standup Reports ───────────────────────────────────────────────────
	standupReports: defineTable({
		date: v.string(), // YYYY-MM-DD
		generatedAt: v.number(),
		summary: v.string(), // JSON blob
		agentReports: v.string(), // JSON blob
		teamAccomplishments: v.string(), // JSON blob
		teamBlockers: v.string(), // JSON blob
		tenantId: v.optional(v.string()),
	})
		.index("by_tenant", ["tenantId"])
		.index("by_date", ["tenantId", "date"]),
	compliancePolicies: defineTable({
		name: v.string(),
		description: v.string(),
		type: v.string(), // "pii-detection", "access-control", "config-requirement", "retention"
		enabled: v.boolean(),
		config: v.string(), // JSON: policy-specific config
		lastEvaluatedAt: v.optional(v.number()),
		violationCount: v.optional(v.number()),
		tenantId: v.optional(v.string()),
	}).index("by_tenant", ["tenantId"]),
});
