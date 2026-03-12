import type { Metadata } from "next";
import { docsStats } from "@/lib/docs-stats";

const visualBuilderDescription = `Build your OpenClaw stack visually. Select from ${docsStats.serviceCount} services, add skill packs, and generate a complete Docker Compose stack.`;

export const metadata: Metadata = {
	title: "Visual Stack Builder",
	description:
		"Build your OpenClaw stack visually. Select services, add skill packs, configure proxy and monitoring — get a complete Docker Compose stack in one click.",
	openGraph: {
		title: "Visual Stack Builder | better-openclaw",
		description: visualBuilderDescription,
		url: "https://better-openclaw.dev/new",
		type: "website",
	},
	alternates: { canonical: "https://better-openclaw.dev/new" },
};

export default function NewStackLayout({ children }: { children: React.ReactNode }) {
	return children;
}
