import CTA from '@/components/home/CTA';
import Features from '@/components/home/Features';
import Hero from '@/components/home/Hero';
import Stats from '@/components/home/Stats';

export default function HomePage() {
	return (
		<div className="relative overflow-x-hidden bg-[#050507] text-white">
			<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(220,38,38,0.18),transparent_36%),radial-gradient(circle_at_85%_20%,rgba(185,28,28,0.16),transparent_34%),radial-gradient(circle_at_50%_100%,rgba(127,29,29,0.2),transparent_42%)]" />
			<Hero />
			<Features />
			<Stats />
			<CTA />
		</div>
	);
}
