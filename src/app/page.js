import CTA from '@/components/home/CTA';
import Features from '@/components/home/Features';
import Hero from '@/components/home/Hero';
import LatestSessionTelemetry from '@/components/home/LatestSessionTelemetry';
import Stats from '@/components/home/Stats';

export default function HomePage() {
	return (
		<div className="relative overflow-x-hidden bg-[#050507] text-white">
			<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(245,158,11,0.12),transparent_36%),radial-gradient(circle_at_85%_20%,rgba(255,255,255,0.06),transparent_34%),radial-gradient(circle_at_50%_100%,rgba(120,113,108,0.14),transparent_42%)]" />
			<Hero />
			<LatestSessionTelemetry />
			<Features />
			<Stats />
			<CTA />
		</div>
	);
}
