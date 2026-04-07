import CTA from '@/components/home/CTA';
import Features from '@/components/home/Features';
import Hero from '@/components/home/Hero';
import LatestSessionTelemetry from '@/components/home/LatestSessionTelemetry';
import Stats from '@/components/home/Stats';
import WindyBackground from '@/components/home/WindyBackground';

export default function HomePage() {
	return (
		<div className="relative min-h-screen overflow-x-hidden bg-[#050507] text-white">
			<WindyBackground />
			<div className="relative z-10 space-y-32 pb-32">
				<Hero />
				<LatestSessionTelemetry />
				<Features />
				<Stats />
				<CTA />
			</div>
		</div>
	);
}
