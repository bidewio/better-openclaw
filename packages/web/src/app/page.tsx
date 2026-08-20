import { BackgroundLayers } from "@/components/BackgroundLayers";
import { CommonSetups } from "@/components/common-setups";
import { DemoVideo } from "@/components/demo-video";
import { FeaturesGrid } from "@/components/features-grid";
import { Footer } from "@/components/footer";
import { Hero } from "@/components/hero";
import { NotificationTicker } from "@/components/NotificationTicker";
import { Navbar } from "@/components/navbar";
import { PresetsSection } from "@/components/presets-section";
import { SideNavigation } from "@/components/SideNavigation";
import { UseCaseCarousel } from "@/components/use-case-carousel";
import { docsStats } from "@/lib/docs-stats";

export default function HomePage() {
	return (
		<div className="relative min-h-screen bg-background text-foreground selection:bg-primary/20">
			<BackgroundLayers />
			<SideNavigation />
			<Navbar />
			<NotificationTicker serviceCount={docsStats.serviceCount} />

			{/* Main Content Area */}
			<main className="relative z-10 lg:pl-14">
				<section id="hero" className="min-h-screen pt-[calc(4rem+2rem)]">
					<Hero />
				</section>

				<section id="features" className="min-h-screen">
					<FeaturesGrid serviceCount={docsStats.serviceCount} />
				</section>

				<section id="presets" className="min-h-[80vh]">
					<PresetsSection />
				</section>

				<section id="flow" className="min-h-[80vh]">
					<CommonSetups />
				</section>

				<DemoVideo />

				<section id="use-cases" className="min-h-[80vh]">
					<UseCaseCarousel />
				</section>
			</main>

			<div className="relative z-10 lg:pl-14">
				<Footer />
			</div>
		</div>
	);
}
