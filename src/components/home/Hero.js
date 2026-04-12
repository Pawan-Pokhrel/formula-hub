import Image from 'next/image';
import Link from 'next/link';
import { FaArrowRight } from 'react-icons/fa';

export default function Hero() {
	return (
		<section className="relative flex min-h-[90vh] w-full items-center justify-center overflow-hidden">
			{/* Massive Background Image Placeholder */}
			<div className="absolute inset-0 z-0">
				{/* 
					TODO: User will provide the actual image asset.
					For now, using a highly aesthetic F1-themed placeholder overlay or a placeholder image URL.
				*/}
				<Image
					src="/images/FormulaHub-BG.png"
					alt="F1 Background Pattern"
					fill
					sizes="100vw"
					priority
					className="h-full w-full object-cover object-center opacity-60 brightness-[1.2] mix-blend-screen"
				/>
				{/* Gradient Overlays for Readability and Blending */}
				<div className="absolute inset-0 bg-linear-to-b from-[#050507]/40 via-[#050507]/50 to-[#050507]" />
				<div className="absolute inset-0 bg-linear-to-r from-[#050507]/80 via-[#050507]/30 to-transparent" />
			</div>

			<div className="relative z-10 mx-auto w-full max-w-7xl px-6 md:px-10 lg:px-16 pt-24">
				<div className="max-w-3xl">
					<div className="mb-7 inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-600/10 px-4 py-1.5 text-xs font-bold tracking-[0.2em] text-red-400 uppercase animate-fade-in backdrop-blur-md">
						Race Intelligence Platform
					</div>

					<h1 className="text-balance text-5xl font-black leading-[1.05] tracking-tight text-white md:text-7xl lg:text-8xl animate-fade-in [animation-delay:120ms] uppercase filter drop-shadow-xl">
						Predict Smarter Races With
						<span className="block mt-4 mb-2 font-black tracking-[-0.03em] uppercase bg-linear-to-r from-white to-[#a90000] bg-clip-text text-transparent">
							FormulaHub
						</span>
					</h1>

					<p className="mt-8 text-pretty text-lg leading-relaxed text-zinc-300 md:text-xl font-medium animate-fade-in [animation-delay:220ms] drop-shadow-md">
						Analyze race pace, compare driver outcomes, and simulate strategy
						scenarios in one focused workspace built for students, fans, and
						analytics teams.
					</p>

					<div className="mt-12 flex flex-wrap items-center gap-4 animate-fade-in [animation-delay:320ms]">
						<Link
							href="/dashboard"
							prefetch={true}
							className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-linear-to-r from-red-600 to-red-700 px-8 py-4 text-sm font-bold uppercase tracking-widest text-white shadow-[0_0_40px_rgba(220,38,38,0.4)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_60px_rgba(220,38,38,0.6)]"
						>
							Open Dashboard <FaArrowRight size={14} />
						</Link>

						<Link
							href="/register"
							prefetch={true}
							className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/20 bg-white/5 backdrop-blur-md px-8 py-4 text-sm font-bold uppercase tracking-widest text-zinc-100 transition-all duration-300 hover:-translate-y-1 hover:border-red-500/50 hover:bg-red-600/20"
						>
							Create Account
						</Link>

						<Link
							href="/schedule"
							prefetch={true}
							className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-red-500/35 bg-red-600/10 px-6 py-4 text-sm font-bold uppercase tracking-widest text-red-100 transition-all duration-300 hover:-translate-y-1 hover:bg-red-600/20"
						>
							Race Schedule
						</Link>

						<Link
							href="/standings"
							prefetch={true}
							className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-red-500/35 bg-red-600/10 px-6 py-4 text-sm font-bold uppercase tracking-widest text-red-100 transition-all duration-300 hover:-translate-y-1 hover:bg-red-600/20"
						>
							Standings
						</Link>
					</div>

					<div className="mt-16 grid grid-cols-1 gap-3 text-xs font-bold uppercase tracking-wider text-zinc-300 sm:grid-cols-3 animate-fade-in [animation-delay:420ms]">
						<div className="rounded-xl border border-white/10 bg-black/40 backdrop-blur-xl px-4 py-4 flex items-center justify-center text-center">
							Multi-season race data
						</div>
						<div className="rounded-xl border border-white/10 bg-black/40 backdrop-blur-xl px-4 py-4 flex items-center justify-center text-center">
							Lap prediction + strategy simulation
						</div>
						<div className="rounded-xl border border-white/10 bg-black/40 backdrop-blur-xl px-4 py-4 flex items-center justify-center text-center">
							Track analytics and standings insights
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
