/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as agents from "../agents.js";
import type * as auth from "../auth.js";
import type * as chat from "../chat.js";
import type * as claudeSessions from "../claudeSessions.js";
import type * as compliance from "../compliance.js";
import type * as documents from "../documents.js";
import type * as fleet from "../fleet.js";
import type * as http from "../http.js";
import type * as lib_tenant from "../lib/tenant.js";
import type * as messages from "../messages.js";
import type * as observability from "../observability.js";
import type * as openclaw from "../openclaw.js";
import type * as queries from "../queries.js";
import type * as sandboxes from "../sandboxes.js";
import type * as search from "../search.js";
import type * as seed from "../seed.js";
import type * as stacks from "../stacks.js";
import type * as standup from "../standup.js";
import type * as tasks from "../tasks.js";

import type { ApiFromModules, FilterApi, FunctionReference } from "convex/server";

declare const fullApi: ApiFromModules<{
	agents: typeof agents;
	auth: typeof auth;
	chat: typeof chat;
	claudeSessions: typeof claudeSessions;
	compliance: typeof compliance;
	documents: typeof documents;
	fleet: typeof fleet;
	http: typeof http;
	"lib/tenant": typeof lib_tenant;
	messages: typeof messages;
	observability: typeof observability;
	openclaw: typeof openclaw;
	queries: typeof queries;
	sandboxes: typeof sandboxes;
	search: typeof search;
	seed: typeof seed;
	stacks: typeof stacks;
	standup: typeof standup;
	tasks: typeof tasks;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<typeof fullApi, FunctionReference<any, "public">>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<typeof fullApi, FunctionReference<any, "internal">>;

export declare const components: {};
