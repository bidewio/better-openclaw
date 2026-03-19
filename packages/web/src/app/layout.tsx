import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import Script from "next/script";
import { ErrorBoundary } from "@/components/error-boundary";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const fontInter = Inter({
	subsets: ["latin"],
	display: "swap",
	variable: "--font-inter",
});

const fontMono = JetBrains_Mono({
	subsets: ["latin"],
	display: "swap",
	variable: "--font-mono",
});

export const metadata: Metadata = {
	metadataBase: new URL("https://better-openclaw.dev"),
	title: {
		default: "better-openclaw — Build your AI agent superstack",
		template: "%s | better-openclaw",
	},
	description:
		"CLI tool, REST API, and web UI for scaffolding production-ready AI agent stacks with Docker Compose. 94+ services, 8 agent frameworks, 10 skill packs, one command. Or deploy instantly with Clawexa Cloud.",
	keywords: [
		"OpenClaw",
		"docker-compose",
		"self-hosted",
		"AI stack",
		"automation",
		"homelab",
		"Clawexa",
		"Clawexa cloud",
		"hosted OpenClaw",
		"multi-agent",
		"agent framework",
		"CoPaw",
		"NanoClaw",
		"ZeroClaw",
		"n8n",
		"qdrant",
		"ollama",
	],
	openGraph: {
		title: "better-openclaw — Build your AI agent superstack",
		description:
			"Generate Docker Compose stacks with 94+ services, 8 agent frameworks, pre-wired with AI agent skills",
		type: "website",
		siteName: "better-openclaw",
		images: [{ url: "/og/og-image.svg", width: 1200, height: 630 }],
	},
	twitter: {
		card: "summary_large_image",
		title: "better-openclaw — Build your AI agent superstack",
		description:
			"Generate Docker Compose stacks with 94+ services, 8 agent frameworks, pre-wired with AI agent skills",
		images: ["/og/og-image.svg"],
	},
	alternates: {
		canonical: "/",
	},
	robots: {
		index: true,
		follow: true,
		googleBot: {
			index: true,
			follow: true,
			"max-video-preview": -1,
			"max-image-preview": "large",
			"max-snippet": -1,
		},
	},
};

export const viewport = {
	width: "device-width",
	initialScale: 1,
	maximumScale: 5,
	themeColor: [
		{ media: "(prefers-color-scheme: light)", color: "#ffffff" },
		{ media: "(prefers-color-scheme: dark)", color: "#0A0A0A" },
	],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
	const umamiUrl = process.env.NEXT_PUBLIC_UMAMI_URL;
	const umamiId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;

	const webSiteJsonLd = {
		"@context": "https://schema.org",
		"@type": "WebSite",
		name: "better-openclaw",
		description:
			"CLI tool, REST API, and web UI for scaffolding production-ready OpenClaw stacks with Docker Compose. 58+ services, 10 skill packs, one command.",
		url: "https://better-openclaw.dev",
		potentialAction: {
			"@type": "SearchAction",
			target: {
				"@type": "EntryPoint",
				urlTemplate: "https://better-openclaw.dev/new?q={search_term_string}",
			},
			"query-input": "required name=search_term_string",
		},
	};

	const softwareJsonLd = {
		"@context": "https://schema.org",
		"@type": "SoftwareApplication",
		name: "better-openclaw",
		applicationCategory: "DeveloperApplication",
		operatingSystem: "Linux, macOS, Windows",
		description:
			"Generate Docker Compose stacks with 58+ companion services pre-wired with OpenClaw skills",
		url: "https://better-openclaw.dev",
		offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
		isRelatedTo: {
			"@type": "WebApplication",
			name: "Clawexa",
			url: "https://clawexa.net",
		},
	};

	const clawexaJsonLd = {
		"@context": "https://schema.org",
		"@type": "WebApplication",
		name: "Clawexa",
		url: "https://clawexa.net",
		applicationCategory: "DeveloperApplication",
		description:
			"Cloud-hosted OpenClaw platform — deploy AI agent stacks without managing infrastructure",
		offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
		isRelatedTo: {
			"@type": "SoftwareApplication",
			name: "better-openclaw",
			url: "https://better-openclaw.dev",
		},
	};

	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<script
					type="application/ld+json"
					dangerouslySetInnerHTML={{
						__html: JSON.stringify(webSiteJsonLd),
					}}
				/>
				<script
					type="application/ld+json"
					dangerouslySetInnerHTML={{
						__html: JSON.stringify(softwareJsonLd),
					}}
				/>
				<script
					type="application/ld+json"
					dangerouslySetInnerHTML={{
						__html: JSON.stringify(clawexaJsonLd),
					}}
				/>
			</head>
			<body
				className={`${fontInter.variable} ${fontMono.variable} bg-background text-foreground font-sans antialiased min-h-screen`}
			>
				<ErrorBoundary>
					<ThemeProvider>{children}</ThemeProvider>
				</ErrorBoundary>

				{/* Umami Analytics (only in production) */}
				{umamiUrl && umamiId && process.env.NODE_ENV === "production" && (
					<Script defer src={umamiUrl} data-website-id={umamiId} strategy="afterInteractive" />
				)}

				{/* Google Analytics */}
				<Script
					src="https://www.googletagmanager.com/gtag/js?id=G-2HSW5YY209"
					strategy="afterInteractive"
				/>
				<Script id="google-analytics" strategy="afterInteractive">
					{`
						window.dataLayer = window.dataLayer || [];
						function gtag(){dataLayer.push(arguments);}
						gtag('js', new Date());

						gtag('config', 'G-2HSW5YY209');
					`}
				</Script>
			</body>
		</html>
	);
}
