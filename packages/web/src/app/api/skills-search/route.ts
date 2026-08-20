import { type NextRequest, NextResponse } from "next/server";

const SKILLSMP_BASE = "https://skillsmp.com/api/v1";

/**
 * GET /api/skills-search?q=...&page=1&limit=20
 *
 * Proxies search requests to the SkillsMP marketplace API, keeping the
 * API key server-side. Supports both keyword and AI-powered semantic search.
 */
export async function GET(request: NextRequest) {
	const { searchParams } = new URL(request.url);
	const query = searchParams.get("q") ?? "";
	const mode = searchParams.get("mode") ?? "keyword"; // "keyword" | "ai"

	if (!query.trim()) {
		return NextResponse.json(
			{
				success: false,
				error: { code: "MISSING_QUERY", message: "The 'q' parameter is required" },
			},
			{ status: 400 },
		);
	}

	// Validate and clamp page/limit to prevent abuse
	const page = Math.max(1, Math.min(100, Number(searchParams.get("page")) || 1));
	const limit = Math.max(1, Math.min(50, Number(searchParams.get("limit")) || 20));

	// Validate mode to prevent unexpected values
	if (mode !== "keyword" && mode !== "ai") {
		return NextResponse.json(
			{
				success: false,
				error: { code: "INVALID_MODE", message: "Mode must be 'keyword' or 'ai'" },
			},
			{ status: 400 },
		);
	}

	const apiKey = process.env.SKILLSMP_API_KEY;
	if (!apiKey) {
		return NextResponse.json(
			{
				success: false,
				error: { code: "NO_API_KEY", message: "SkillsMP API key is not configured" },
			},
			{ status: 500 },
		);
	}

	try {
		const endpoint =
			mode === "ai"
				? `${SKILLSMP_BASE}/skills/ai-search?q=${encodeURIComponent(query)}`
				: `${SKILLSMP_BASE}/skills/search?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`;

		const upstream = await fetch(endpoint, {
			headers: { Authorization: `Bearer ${apiKey}` },
			signal: AbortSignal.timeout(10_000),
		});

		if (!upstream.ok) {
			let detail: string | undefined;
			try {
				const body = await upstream.text();
				if (body.trim()) {
					detail = body.slice(0, 500);
				}
			} catch {
				// Ignore body parse failures; status + message are sufficient.
			}

			return NextResponse.json(
				{
					success: false,
					error: {
						code: "UPSTREAM_ERROR",
						message: `SkillsMP returned ${upstream.status}`,
						...(detail ? { detail } : {}),
					},
				},
				{ status: upstream.status },
			);
		}

		const data = await upstream.json();
		return NextResponse.json(data);
	} catch (err) {
		console.error("skills-search proxy error:", err);
		return NextResponse.json(
			{ success: false, error: { code: "FETCH_FAILED", message: "Failed to fetch from upstream" } },
			{ status: 502 },
		);
	}
}
