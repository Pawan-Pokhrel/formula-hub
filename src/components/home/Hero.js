import Link from 'next/link';
import { FaArrowRight } from 'react-icons/fa';

export default function Hero() {
	return (
		<section className="relative isolate px-6 pb-20 pt-32 md:px-10 md:pt-36 lg:px-16">
			<div className="mx-auto max-w-6xl">
				<div className="mb-7 inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-amber-500/10 px-4 py-1.5 text-xs font-semibold tracking-[0.2em] text-amber-200 uppercase animate-fade-in">
					Race Intelligence Platform
				</div>

				<h1 className="max-w-5xl text-balance text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-5xl md:text-7xl lg:text-8xl animate-fade-in [animation-delay:120ms]">
					Predict Smarter Races With
					<span className="bg-linear-to-r from-amber-100 via-amber-300 to-yellow-500 bg-clip-text text-transparent">
						{' '}
						FormulaHub
					</span>
				</h1>

				<p className="mt-7 max-w-3xl text-pretty text-base leading-relaxed text-zinc-300 sm:text-lg md:text-xl animate-fade-in [animation-delay:220ms]">
					Analyze race pace, compare driver outcomes, and simulate strategy
					scenarios in one focused workspace built for students, fans, and
					analytics teams.
				</p>

				<div className="mt-10 flex flex-wrap items-center gap-4 animate-fade-in [animation-delay:320ms]">
					<Link
						href="/dashboard"
						prefetch={true}
						className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-linear-to-r from-amber-500 to-yellow-500 px-7 py-3.5 text-sm font-semibold tracking-wide text-black shadow-[0_14px_38px_rgba(245,158,11,0.35)] transition-all duration-300 hover:-translate-y-0.5 hover:from-amber-400 hover:to-yellow-400"
					>
						Open Dashboard <FaArrowRight size={14} />
					</Link>

					<Link
						href="/register"
						prefetch={true}
						className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/20 bg-white/4 px-7 py-3.5 text-sm font-semibold tracking-wide text-zinc-100 transition-all duration-300 hover:-translate-y-0.5 hover:border-amber-300/50 hover:bg-amber-500/10"
					>
						Create Account
					</Link>
				</div>

				<div className="mt-12 grid max-w-4xl grid-cols-1 gap-3 text-sm text-zinc-300 sm:grid-cols-3 animate-fade-in [animation-delay:420ms]">
					<div className="rounded-xl border border-white/10 bg-white/3 px-4 py-3">
						Multi-season race data
					</div>
					<div className="rounded-xl border border-white/10 bg-white/3 px-4 py-3">
						Lap prediction + strategy simulation
					</div>
					<div className="rounded-xl border border-white/10 bg-white/3 px-4 py-3">
						Track analytics and standings insights
					</div>
				</div>
			</div>
		</section>
	);
}
