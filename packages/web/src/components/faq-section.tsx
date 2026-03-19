"use client";

import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
	{
		question: "Do I need Docker installed?",
		answer:
			"Yes. Better OpenClaw generates standard `docker-compose.yml` files. You need Docker and Docker Compose (or a compatible runtime like Podman) installed on your machine or server.",
	},
	{
		question: "Can I run this on a VPS?",
		answer:
			"Absolutely. The generated stacks are designed to be production-ready. You can deploy them to any Linux VPS (Hetzner, DigitalOcean, AWS, etc.) simply by copying the files and running `docker compose up -d`.",
	},
	{
		question: "What AI models are supported?",
		answer:
			"We support locally hosted models via Ollama and vLLM integration, as well as cloud providers like OpenAI, Anthropic, and Google Gemini. You choose your model provider in the setup wizard.",
	},
	{
		question: "Is it really free?",
		answer:
			"Better OpenClaw itself is free and open-source (MIT). You only pay for your own infrastructure (VPS, API keys) if you use them.",
	},
	{
		question: "How do I update my stack?",
		answer:
			"Since you own the `docker-compose.yml` file, you can update service images manually or use the `better-openclaw update` command to regenerate your stack with the latest best practices.",
	},
];

export function FaqSection() {
	return (
		<section className="py-24">
			<div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
				<div className="mb-16 text-center">
					<h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
						Frequently Asked Questions
					</h2>
				</div>

				<Accordion type="single" collapsible className="w-full">
					{faqs.map((faq) => (
						<AccordionItem key={faq.question} value={faq.question}>
							<AccordionTrigger className="text-left text-lg font-medium">
								{faq.question}
							</AccordionTrigger>
							<AccordionContent className="text-base text-muted-foreground leading-relaxed">
								{faq.answer}
							</AccordionContent>
						</AccordionItem>
					))}
				</Accordion>
			</div>
		</section>
	);
}
