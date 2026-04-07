import Link from 'next/link';
import {
	FaCarSide,
	FaChartLine,
	FaFlagCheckered,
	FaRoad,
	FaStopwatch,
	FaTrophy,
} from 'react-icons/fa';

const FEATURE_ITEMS = [
	{
		title: 'Race Calendar',
		description:
			'Explore upcoming races and completed events with season and round detail.',
		icon: FaFlagCheckered,
		href: '/schedule',
	},
	{
		title: 'Championship Standings',
		description:
			'Compare constructors and drivers through points progression and rank changes.',
		icon: FaTrophy,
		href: '/standings',
	},
	{
		title: 'Track Intelligence',
		description:
			'Inspect circuit characteristics, corners, and race context in one place.',
		icon: FaRoad,
		href: '/track',
	},
	{
		title: 'Lap Predictor',
		description:
			'Forecast lap performance with model-driven estimates using race conditions.',
		icon: FaStopwatch,
		href: '/predict',
	},
	{
		title: 'Strategy Simulator',
		description:
			'Test pit windows and tire plans against replay race data before race day.',
		icon: FaCarSide,
		href: '/strategy',
	},
	{
		title: 'Insights Dashboard',
		description:
			'Get a high-level command center view of your analytics workflow and outputs.',
		icon: FaChartLine,
		href: '/dashboard',
	},
];

export default function Features() {
	return (
		<section className="relative px-6 py-20 md:px-10 lg:px-16">
			<div className="mx-auto max-w-7xl">
				<div className="mb-12 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
					<div>
						<p className="text-xs font-bold uppercase tracking-[0.2em] text-red-500">
							Core Modules
						</p>
						<h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
							Everything You Need For Race Analysis
						</h2>
					</div>
					<Link
						href="/dashboard"
						prefetch={true}
						className="inline-flex cursor-pointer w-fit items-center rounded-full border border-white/15 bg-white/3 px-5 py-2 text-sm font-bold text-zinc-200 transition-colors hover:border-red-500/40 hover:bg-red-600/10"
					>
						Go to workspace
					</Link>
				</div>

				<div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
					{FEATURE_ITEMS.map((item) => {
						const Icon = item.icon;

						return (
							<Link
								key={item.title}
								href={item.href}
								prefetch={true}
								className="group relative cursor-pointer rounded-2xl border border-white/10 bg-linear-to-b from-white/5 to-white/2 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-red-500/35 hover:shadow-[0_18px_36px_rgba(220,38,38,0.15)] backdrop-blur-sm"
							>
								<div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-red-500/30 bg-red-600/10 text-red-500 transition-colors group-hover:bg-red-600/20 shadow-[0_0_10px_rgba(220,38,38,0.1)]">
									<Icon size={18} />
								</div>
								<h3 className="text-lg font-semibold text-white">
									{item.title}
								</h3>
								<p className="mt-2 text-sm leading-relaxed text-zinc-300">
									{item.description}
								</p>
								<div className="mt-4 text-sm font-bold text-red-400">
									Open module
								</div>
							</Link>
						);
					})}
				</div>
			</div>
		</section>
	);
}
