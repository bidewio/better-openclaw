import { generate } from "@better-openclaw/core/generate";
import { GenerationInputSchema } from "@better-openclaw/core/schema";
import JSZip from "jszip";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
	try {
		const body = await request.json();
		const parsed = GenerationInputSchema.safeParse(body);

		if (!parsed.success) {
			return NextResponse.json(
				{
					error: {
						code: "VALIDATION_ERROR",
						message: "Invalid request body",
						details: parsed.error.issues,
					},
				},
				{ status: 400 },
			);
		}

		const result = generate(parsed.data);
		const url = new URL(request.url);
		const format = url.searchParams.get("format")?.toLowerCase();
		const accept = request.headers.get("Accept") ?? "";

		const wantsZip = accept.includes("application/zip") || format === "zip";
		if (wantsZip) {
			const projectName = parsed.data.projectName ?? "project";
			const zip = new JSZip();
			const folder = zip.folder(projectName);
			if (folder) {
				for (const [path, content] of Object.entries(result.files)) {
					folder.file(path, content);
				}
			}
			const buf = await zip.generateAsync({ type: "uint8array" });
			return new NextResponse(
				buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer,
				{
					status: 200,
					headers: {
						"Content-Type": "application/zip",
						"Content-Disposition": `attachment; filename="${projectName}.zip"`,
					},
				},
			);
		}

		const wantsComplete =
			format === "complete" || accept.includes("application/vnd.openclaw.complete+json");
		if (wantsComplete) {
			return NextResponse.json({
				formatVersion: "1",
				input: parsed.data,
				files: result.files,
				metadata: result.metadata,
			});
		}

		return NextResponse.json(result);
	} catch (err) {
		return NextResponse.json(
			{
				error: {
					code: "GENERATION_ERROR",
					message: err instanceof Error ? err.message : "Generation failed",
				},
			},
			{ status: 500 },
		);
	}
}
