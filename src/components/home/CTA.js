import Link from 'next/link';
import { FaArrowRight } from 'react-icons/fa';

export default function CTA() {
	return (
		<section className="py-32 px-6 md:px-20 bg-red-700/90 text-center relative overflow-hidden">
			<div className="absolute inset-0 bg-[radial-linear(circle_at_50%_50%,rgba(255,0,0,0.2),transparent)]" />
			<h2 className="text-5xl md:text-7xl font-extrabold uppercase mb-10 tracking-widest relative z-10">
				Elevate Your F1 Game
			</h2>
			<p className="max-w-3xl mx-auto text-2xl text-white/80 mb-12 relative z-10 font-light">
				Join the elite circle of F1 analysts and enthusiasts who trust our
				platform for unparalleled insights.
			</p>
			<Link
				href="/signup"
				className="inline-flex items-center gap-3 bg-black hover:bg-gray-900 transition-all px-12 py-6 rounded-full font-bold text-xl uppercase shadow-2xl shadow-black/50 relative z-10"
			>
				Sign Up Today <FaArrowRight size={24} />
			</Link>
		</section>
	);
}
