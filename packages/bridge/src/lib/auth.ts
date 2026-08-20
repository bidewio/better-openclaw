import { timingSafeEqual } from "node:crypto";

/**
 * Timing-safe comparison of bridge tokens.
 * Returns true if both tokens are non-empty and equal.
 */
export function verifyBridgeToken(
	provided: string | undefined,
	expected: string | undefined,
): boolean {
	if (!provided || !expected) return false;
	if (provided.length !== expected.length) return false;

	const a = Buffer.from(provided, "utf-8");
	const b = Buffer.from(expected, "utf-8");
	return timingSafeEqual(a, b);
}
