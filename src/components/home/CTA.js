import Link from 'next/link';
import { FaArrowRight } from 'react-icons/fa';

export default function CTA() {
	return (
		<section className="px-6 pb-20 md:px-10 lg:px-16">
			<div className="relative mx-auto max-w-7xl overflow-hidden rounded-3xl border border-white/15 bg-linear-to-r from-zinc-900 via-black to-zinc-950 p-8 md:p-12">
				<div className="pointer-events-none absolute -right-24 -top-20 h-60 w-60 rounded-full bg-red-600/20 blur-3xl" />
				<div className="pointer-events-none absolute -bottom-20 left-1/3 h-44 w-44 rounded-full bg-white/10 blur-3xl" />

				<div className="relative z-10">
					<h2 className="max-w-3xl text-3xl font-extrabold tracking-tight text-white sm:text-4xl md:text-5xl">
						Ready To Build Your Race Plan?
					</h2>
					<p className="mt-4 max-w-2xl text-sm leading-relaxed text-zinc-200 sm:text-base">
						Start with your dashboard, run predictions, and iterate strategy
						with confidence. FormulaHub is set up to get you from raw data to
						race decisions quickly.
					</p>

					<div className="mt-8 flex flex-wrap gap-3">
						<Link
							href="/register"
							prefetch={true}
							className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-red-600 px-6 py-3 text-sm font-bold/80 tracking-wide text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-red-500 hover:shadow-[0_0_20px_rgba(220,38,38,0.4)]"
						>
							Create Free Account <FaArrowRight size={13} />
						</Link>
						<Link
							href="/predict"
							prefetch={true}
							className="inline-flex cursor-pointer items-center rounded-full border border-white/35 bg-white/10 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/20"
						>
							Try Lap Predictor
						</Link>
					</div>
				</div>
			</div>
		</section>
	);
}
