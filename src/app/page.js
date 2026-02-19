import CTA from '@/components/home/CTA';
import Features from '@/components/home/Features';
import Hero from '@/components/home/Hero';
import Stats from '@/components/home/Stats';

export default function HomePage() {
	return (
		<div className="bg-linear-to-b from-gray-900 to-black text-white overflow-x-hidden font-sans">
			<Hero />
			<Features />
			<Stats />
			<CTA />
		</div>
	);
}
