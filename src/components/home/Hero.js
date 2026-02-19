import Link from 'next/link';
import { FaArrowRight } from 'react-icons/fa';

export default function Hero() {
	return (
		<section
			className="relative flex flex-col items-center justify-center text-center h-screen px-6 bg-cover bg-center bg-no-repeat pt-20"
			style={{
				backgroundImage:
					"url('https://source.unsplash.com/random/1920x1080/?formula1,driver,racing,car,speed')",
				backgroundBlendMode: 'overlay',
				backgroundColor: 'rgba(0, 0, 0, 0.6)',
			}}
		>
			<div className="absolute inset-0 bg-linear-to-b from-transparent to-black/90" />
			<h1 className="relative text-6xl md:text-9xl font-extrabold tracking-wide uppercase z-10 leading-tight animate-fade-in">
				Elite F1 Analytics
			</h1>

			<p className="relative mt-8 max-w-4xl text-xl md:text-3xl text-gray-300 z-10 font-light italic animate-fade-in [animation-delay:200ms]">
				Unlock the pinnacle of motorsport intelligence: Real-time telemetry,
				AI-driven strategies, and immersive visualizations for the ultimate
				Formula 1 experience.
			</p>

			<div className="relative mt-12 flex flex-col md:flex-row gap-6 z-10 animate-fade-in [animation-delay:400ms]">
				<Link
					href="/dashboard"
					className="flex items-center gap-3 bg-red-600 hover:bg-red-700 transition-all px-10 py-5 rounded-full font-bold text-xl uppercase shadow-2xl shadow-red-600/50 hover:shadow-red-600/70"
				>
					Access Dashboard <FaArrowRight size={24} />
				</Link>

				<Link
					href="/demo"
					className="border-2 border-red-500 hover:border-red-600 hover:bg-red-600/10 transition-all px-10 py-5 rounded-full font-bold text-xl uppercase"
				>
					Watch Demo
				</Link>
			</div>

			{/* Animated Checkered Flag */}
			<div className="absolute bottom-0 h-16 w-full bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+PHBhdGggZD0iTTAgMGgyMHYyMEgweiIgZmlsbD0iI2ZmZiIvPjxwYXRoIGQ9Ik0wIDBoMjB2MjBIMHoiIGZpbGw9IiMwMDAiLz48L3N2Zz4=')] opacity-50 animate-slide-across" />
		</section>
	);
}
