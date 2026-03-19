/**
 * React hook for OpenClaw gateway WebSocket connection.
 *
 * Adapted from the external mission-control repo's websocket.ts.
 * Uses React refs/state only (no Zustand) to keep our frontend identity.
 *
 * Features:
 * - Gateway protocol v3 handshake with Ed25519 device signing
 * - Heartbeat via ping RPC (30s interval, 3 missed pongs triggers reconnect)
 * - Exponential backoff reconnect (base 1s, max 30s, up to 10 attempts)
 * - Non-retryable error detection with user-friendly help text
 * - Message routing via callback
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
	cacheDeviceToken,
	getCachedDeviceToken,
	getOrCreateDeviceIdentity,
	signPayload,
} from "./device-identity";

// Gateway protocol version (v3 required by OpenClaw 2026.x)
const PROTOCOL_VERSION = 3;
const DEFAULT_CLIENT_ID = "openclaw-control-ui";

// Heartbeat
const PING_INTERVAL_MS = 30_000;
const MAX_MISSED_PONGS = 3;

// Reconnection
const MAX_RECONNECT_ATTEMPTS = 10;
const BASE_RECONNECT_MS = 1000;
const MAX_RECONNECT_MS = 30_000;

export type ConnectionState = "disconnected" | "connecting" | "handshaking" | "connected";

export interface GatewayLogEntry {
	id: string;
	timestamp: number;
	level: "info" | "warn" | "error";
	message: string;
}

interface GatewayFrame {
	type: "event" | "req" | "res";
	event?: string;
	method?: string;
	id?: string;
	payload?: unknown;
	ok?: boolean;
	result?: unknown;
	error?: unknown;
	params?: unknown;
}

interface ConnectParams {
	version: number;
	client: { id: string; mode: "ui" };
	auth: { token: string };
	device?: {
		id: string;
		publicKey: string;
		token?: string;
	};
}

export interface UseGatewaySocketReturn {
	connectionState: ConnectionState;
	isConnected: boolean;
	latency: number | null;
	logs: GatewayLogEntry[];
	errorHelp: string | null;
	connect: (url: string, token?: string) => void;
	disconnect: () => void;
	sendMessage: (frame: Record<string, unknown>) => boolean;
}

function isNonRetryableError(message: string): boolean {
	const normalized = message.toLowerCase();
	return (
		normalized.includes("origin not allowed") ||
		normalized.includes("device identity required") ||
		normalized.includes("device_auth_signature_invalid") ||
		normalized.includes("invalid connect params") ||
		normalized.includes("/client/id") ||
		normalized.includes("auth rate limit") ||
		normalized.includes("rate limited")
	);
}

function getErrorHelp(message: string): string {
	const normalized = message.toLowerCase();
	if (normalized.includes("origin not allowed")) {
		const origin = typeof window !== "undefined" ? window.location.origin : "<control-ui-origin>";
		return `Gateway rejected browser origin. Add ${origin} to gateway.controlUi.allowedOrigins, then reconnect.`;
	}
	if (normalized.includes("device identity required")) {
		return "Gateway requires device identity. Open Mission Control via HTTPS (or localhost) so WebCrypto signing can run.";
	}
	if (normalized.includes("device_auth_signature_invalid")) {
		return "Gateway rejected device signature. Clear local device identity in the browser and reconnect.";
	}
	if (normalized.includes("invalid connect params") || normalized.includes("/client/id")) {
		return "Gateway rejected client identity params. Ensure the client ID matches your gateway config.";
	}
	if (normalized.includes("auth rate limit") || normalized.includes("rate limited")) {
		return "Gateway authentication is rate limited. Wait briefly, then reconnect.";
	}
	return "Gateway handshake failed. Check gateway origin and device identity settings.";
}

function getErrorMessage(error: unknown, fallback = "Unknown error"): string {
	if (typeof error === "string" && error.length > 0) {
		return error;
	}
	if (error instanceof Error && error.message) {
		return error.message;
	}
	if (error && typeof error === "object" && "message" in error) {
		const message = (error as { message?: unknown }).message;
		if (typeof message === "string" && message.length > 0) {
			return message;
		}
	}
	return fallback;
}

function asObject(value: unknown): Record<string, unknown> | null {
	return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

export function useGatewaySocket(): UseGatewaySocketReturn {
	const [connectionState, setConnectionState] = useState<ConnectionState>("disconnected");
	const [latency, setLatency] = useState<number | null>(null);
	const [logs, setLogs] = useState<GatewayLogEntry[]>([]);
	const [errorHelp, setErrorHelp] = useState<string | null>(null);

	const wsRef = useRef<WebSocket | null>(null);
	const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
	const pingIntervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
	const reconnectAttemptsRef = useRef(0);
	const manualDisconnectRef = useRef(false);
	const nonRetryableRef = useRef<string | null>(null);
	const handshakeCompleteRef = useRef(false);
	const missedPongsRef = useRef(0);
	const pingCounterRef = useRef(0);
	const pingSentTimestamps = useRef(new Map<string, number>());
	const gatewaySupportsPingRef = useRef(true);

	// Store connect params for reconnect
	const connectUrlRef = useRef("");
	const authTokenRef = useRef("");

	const addLog = useCallback((level: GatewayLogEntry["level"], message: string) => {
		setLogs((prev) => {
			const entry: GatewayLogEntry = {
				id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
				timestamp: Date.now(),
				level,
				message,
			};
			const next = [entry, ...prev];
			return next.length > 100 ? next.slice(0, 100) : next;
		});
	}, []);

	const stopHeartbeat = useCallback(() => {
		if (pingIntervalRef.current) {
			clearInterval(pingIntervalRef.current);
			pingIntervalRef.current = undefined;
		}
		missedPongsRef.current = 0;
		pingSentTimestamps.current.clear();
	}, []);

	const startHeartbeat = useCallback(() => {
		stopHeartbeat();
		pingIntervalRef.current = setInterval(() => {
			if (
				!wsRef.current ||
				wsRef.current.readyState !== WebSocket.OPEN ||
				!handshakeCompleteRef.current
			)
				return;
			if (!gatewaySupportsPingRef.current) return;

			if (missedPongsRef.current >= MAX_MISSED_PONGS) {
				addLog("warn", `No heartbeat response after ${MAX_MISSED_PONGS} attempts, reconnecting...`);
				wsRef.current?.close(4000, "Heartbeat timeout");
				return;
			}

			pingCounterRef.current += 1;
			const pingId = `ping-${pingCounterRef.current}`;
			pingSentTimestamps.current.set(pingId, Date.now());
			missedPongsRef.current += 1;

			try {
				wsRef.current.send(JSON.stringify({ type: "req", method: "ping", id: pingId }));
			} catch {
				// Send failed, reconnect will handle it
			}
		}, PING_INTERVAL_MS);
	}, [stopHeartbeat, addLog]);

	const handlePong = useCallback((frameId: string) => {
		const sentAt = pingSentTimestamps.current.get(frameId);
		if (sentAt) {
			const rtt = Date.now() - sentAt;
			pingSentTimestamps.current.delete(frameId);
			missedPongsRef.current = 0;
			setLatency(rtt);
		}
	}, []);

	const disconnect = useCallback(() => {
		manualDisconnectRef.current = true;
		nonRetryableRef.current = null;
		stopHeartbeat();
		if (reconnectTimeoutRef.current) {
			clearTimeout(reconnectTimeoutRef.current);
			reconnectTimeoutRef.current = undefined;
		}
		if (wsRef.current) {
			wsRef.current.close(1000, "Manual disconnect");
			wsRef.current = null;
		}
		setConnectionState("disconnected");
		setLatency(null);
		addLog("info", "Disconnected");
	}, [stopHeartbeat, addLog]);

	const connect = useCallback(
		(url: string, token?: string) => {
			// Clean up existing connection
			if (wsRef.current) {
				wsRef.current.close(1000, "Reconnecting");
				wsRef.current = null;
			}

			manualDisconnectRef.current = false;
			nonRetryableRef.current = null;
			setErrorHelp(null);
			handshakeCompleteRef.current = false;
			connectUrlRef.current = url;
			authTokenRef.current = token || "";
			reconnectAttemptsRef.current = 0;

			setConnectionState("connecting");
			addLog("info", `Connecting to ${url}...`);

			try {
				const ws = new WebSocket(url);
				wsRef.current = ws;

				ws.onopen = async () => {
					setConnectionState("handshaking");
					addLog("info", "WebSocket open, starting handshake...");

					// Build connect frame
					const connectParams: ConnectParams = {
						version: PROTOCOL_VERSION,
						client: { id: DEFAULT_CLIENT_ID, mode: "ui" },
						auth: { token: authTokenRef.current },
					};

					// Add device identity if available
					try {
						const identity = await getOrCreateDeviceIdentity();
						const cachedToken = getCachedDeviceToken();
						connectParams.device = {
							id: identity.deviceId,
							publicKey: identity.publicKeyBase64,
						};
						if (cachedToken) {
							connectParams.device.token = cachedToken;
						}
					} catch {
						addLog("info", "Ed25519 not available, connecting without device identity");
					}

					const frame = { type: "req", method: "connect", id: "connect-1", params: connectParams };
					ws.send(JSON.stringify(frame));
				};

				ws.onmessage = async (event) => {
					let frame: GatewayFrame;
					try {
						frame = JSON.parse(event.data);
					} catch {
						return;
					}

					// Handle connect responses (initial + signed challenge step)
					if (frame.type === "res" && (frame.id === "connect-1" || frame.id === "connect-2")) {
						const result = asObject(frame.result);
						const challenge = asObject(result?.challenge);

						if (challenge) {
							const nonce = challenge.nonce;
							if (typeof nonce !== "string" || nonce.length === 0) {
								addLog("error", "Gateway challenge payload is missing a valid nonce");
								ws.close(4002, "Invalid challenge");
								return;
							}

							try {
								const identity = await getOrCreateDeviceIdentity();
								const { signature, signedAt } = await signPayload(identity.privateKey, nonce);
								ws.send(
									JSON.stringify({
										type: "req",
										method: "connect",
										id: "connect-2",
										params: {
											device: {
												id: identity.deviceId,
												publicKey: identity.publicKeyBase64,
												signature,
												signedAt,
												nonce,
											},
										},
									}),
								);
							} catch (err: unknown) {
								addLog("error", `Challenge signing failed: ${getErrorMessage(err)}`);
								ws.close(4002, "Challenge failed");
							}
							return;
						}

						if (frame.ok) {
							handshakeCompleteRef.current = true;
							reconnectAttemptsRef.current = 0;
							setConnectionState("connected");
							addLog("info", "Connected to gateway");

							// Cache device token if provided
							const deviceToken = result?.device_token;
							if (typeof deviceToken === "string" && deviceToken.length > 0) {
								cacheDeviceToken(deviceToken);
							}

							startHeartbeat();
						} else {
							const errMsg = getErrorMessage(frame.error, "Handshake rejected");
							addLog("error", `Handshake failed: ${errMsg}`);

							if (isNonRetryableError(String(errMsg))) {
								nonRetryableRef.current = String(errMsg);
								setErrorHelp(getErrorHelp(String(errMsg)));
								ws.close(4001, "Non-retryable error");
								return;
							}
						}
						return;
					}

					// Handle pong
					if (frame.type === "res" && frame.id?.startsWith("ping-")) {
						if (frame.ok === false && frame.error) {
							// Gateway doesn't support ping RPC
							gatewaySupportsPingRef.current = false;
							addLog("info", "Gateway does not support ping RPC, heartbeat disabled");
						} else {
							handlePong(frame.id);
						}
						return;
					}

					// Handle events
					if (frame.type === "event" && frame.event) {
						addLog("info", `Event: ${frame.event}`);
					}
				};

				ws.onclose = (event) => {
					stopHeartbeat();
					handshakeCompleteRef.current = false;
					setConnectionState("disconnected");

					if (manualDisconnectRef.current) return;
					if (nonRetryableRef.current) {
						addLog("error", `Connection closed (non-retryable): ${nonRetryableRef.current}`);
						return;
					}

					if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
						const delay = Math.min(
							BASE_RECONNECT_MS * 2 ** reconnectAttemptsRef.current,
							MAX_RECONNECT_MS,
						);
						reconnectAttemptsRef.current += 1;
						addLog(
							"info",
							`Connection lost (code ${event.code}). Reconnecting in ${Math.round(delay / 1000)}s (attempt ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})...`,
						);

						reconnectTimeoutRef.current = setTimeout(() => {
							connect(connectUrlRef.current, authTokenRef.current);
						}, delay);
					} else {
						addLog("error", "Max reconnect attempts reached. Click Connect to try again.");
					}
				};

				ws.onerror = () => {
					addLog("error", "WebSocket error");
				};
			} catch (err: unknown) {
				addLog("error", `Failed to create WebSocket: ${getErrorMessage(err)}`);
				setConnectionState("disconnected");
			}
		},
		[addLog, startHeartbeat, stopHeartbeat, handlePong],
	);

	const sendMessage = useCallback(
		(frame: Record<string, unknown>): boolean => {
			if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
				addLog("warn", "Cannot send — not connected");
				return false;
			}
			try {
				wsRef.current.send(JSON.stringify(frame));
				return true;
			} catch {
				addLog("error", "Send failed");
				return false;
			}
		},
		[addLog],
	);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			manualDisconnectRef.current = true;
			stopHeartbeat();
			if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
			if (wsRef.current) wsRef.current.close(1000, "Component unmounted");
		};
	}, [stopHeartbeat]);

	return {
		connectionState,
		isConnected: connectionState === "connected",
		latency,
		logs,
		errorHelp,
		connect,
		disconnect,
		sendMessage,
	};
}
